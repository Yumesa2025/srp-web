/**
 * 브라우저 로컬 저장소 래퍼
 *
 * 저장 데이터를 Supabase에서 localStorage로 옮기면서, 각 훅이 제각각
 * localStorage를 직접 다루지 않도록 여기로 모았다. 담당하는 일은 다음과 같다.
 *
 * - SSR 가드: 서버에는 localStorage가 없다. 서버에서 호출되면 기본값을 준다.
 * - 스키마 버전: 저장값에 버전을 함께 적어두고, 버전이 다르면 마이그레이터에
 *   넘긴다. 마이그레이터가 없거나 실패하면 기본값으로 떨어뜨린다.
 * - 파싱 실패 폴백: 손상된 값 때문에 앱이 통째로 깨지지 않게 한다.
 * - 쓰기 실패 신호: 용량 초과(QuotaExceededError) 등을 조용히 삼키지 않고
 *   호출자에게 돌려줘 사용자에게 알릴 수 있게 한다.
 * - 구독: React가 useSyncExternalStore로 붙을 수 있게 변경을 알린다.
 *
 * localStorage는 React 바깥의 가변 상태다. useEffect에서 읽어 setState하면
 * 하이드레이션 직후 불필요한 렌더가 한 번 더 돌고 react-hooks 규칙에도 걸린다.
 * 그래서 스냅샷 + 구독 형태로 노출하고, 훅들은 useSyncExternalStore로 읽는다.
 * 다른 탭에서 값이 바뀌는 경우(storage 이벤트)도 이 경로로 함께 반영된다.
 */

const NAMESPACE = "srp";
const VERSION = 1;

/** 저장 키 — 값 하나당 하나씩 대응한다 */
export const StoreKeys = {
  rosters: "rosters",
  raidSessions: "raidSessions",
  raidItems: "raidItems",
  defensiveSettings: "defensiveSettings",
  discordWebhookUrl: "discordWebhookUrl",
} as const;

export type StoreKey = (typeof StoreKeys)[keyof typeof StoreKeys];

/** 실제 localStorage 키. 예: srp:v1:rosters */
function fullKey(key: StoreKey): string {
  return `${NAMESPACE}:v${VERSION}:${key}`;
}

/** 저장 시 감싸는 봉투 — 버전을 값과 함께 남긴다 */
interface Envelope<T> {
  v: number;
  data: T;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * 구버전 저장값을 현재 버전으로 올리는 변환기.
 * 변환할 수 없으면 null을 반환해 기본값으로 떨어지게 한다.
 */
export type Migrator<T> = (data: unknown, fromVersion: number) => T | null;

// ── 구독 ────────────────────────────────────────────────

const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) listener();
}

/**
 * 저장소 변경 구독. useSyncExternalStore의 첫 인자로 그대로 넘길 수 있도록
 * 모듈 수준에서 안정적인 참조를 유지한다.
 */
export function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);

  // 다른 탭/창에서의 변경도 반영한다
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && !event.key.startsWith(`${NAMESPACE}:`)) return;
    snapshotCache.clear();
    listener();
  };
  if (isBrowser()) window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    if (isBrowser()) window.removeEventListener("storage", handleStorage);
  };
}

/** 네임스페이스 밖의 키를 직접 쓴 뒤 구독자에게 알릴 때 사용한다 */
export function notifyStoreChange(): void {
  snapshotCache.clear();
  emitChange();
}

// ── 스냅샷 ──────────────────────────────────────────────

interface CacheEntry {
  /** 이 값을 만들어낸 원본 문자열. 같으면 파싱 결과를 재사용한다. */
  raw: string | null;
  value: unknown;
}

/**
 * useSyncExternalStore는 값이 바뀌지 않았다면 매번 같은 참조를 받아야 한다.
 * 그렇지 않으면 렌더가 무한히 반복된다. 그래서 원본 문자열을 키로 파싱 결과를 캐싱한다.
 */
const snapshotCache = new Map<StoreKey, CacheEntry>();

function parseRaw<T>(raw: string | null, fallback: T, migrate?: Migrator<T>): T {
  if (raw === null) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }

  // 봉투 형태가 아니면 신뢰하지 않는다
  if (!parsed || typeof parsed !== "object" || !("v" in parsed) || !("data" in parsed)) {
    return fallback;
  }

  const envelope = parsed as Envelope<unknown>;
  if (envelope.v === VERSION) return envelope.data as T;

  // 버전 불일치 — 변환을 시도하고, 안 되면 기본값
  if (!migrate) return fallback;
  try {
    return migrate(envelope.data, envelope.v) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * 저장값을 읽는다. 값이 없거나, 손상됐거나, 버전을 맞출 수 없으면 fallback을 반환한다.
 *
 * fallback은 참조가 안정적인 값(모듈 상수 등)이어야 한다. 매 호출마다 새 배열이나
 * 새 객체를 넘기면 useSyncExternalStore가 값이 계속 바뀐다고 판단한다.
 * 키 하나당 소유자가 하나라고 보고 캐시를 키 단위로 잡는다.
 */
export function readStore<T>(key: StoreKey, fallback: T, migrate?: Migrator<T>): T {
  if (!isBrowser()) return fallback;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(fullKey(key));
  } catch {
    // 사생활 보호 모드 등에서 접근 자체가 막힐 수 있다
    return fallback;
  }

  const cached = snapshotCache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  const value = parseRaw(raw, fallback, migrate);
  snapshotCache.set(key, { raw, value });
  return value;
}

export interface WriteResult {
  /** 실패 시에만 채워지는 한국어 사용자 메시지 */
  error?: string;
}

/** 저장값을 쓴다. 실패해도 throw하지 않고 결과로 알린다. */
export function writeStore<T>(key: StoreKey, data: T): WriteResult {
  if (!isBrowser()) return { error: "브라우저에서만 저장할 수 있습니다." };

  const envelope: Envelope<T> = { v: VERSION, data };
  try {
    window.localStorage.setItem(fullKey(key), JSON.stringify(envelope));
  } catch (error) {
    // 용량 초과가 가장 흔하다. 그 외 직렬화 실패 등도 여기로 온다.
    const isQuota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.code === 22);
    return {
      error: isQuota
        ? "브라우저 저장 공간이 가득 찼습니다. 오래된 기록을 삭제해 주세요."
        : "저장에 실패했습니다.",
    };
  }

  snapshotCache.delete(key);
  emitChange();
  return {};
}

/** 저장값을 지운다. */
export function removeStore(key: StoreKey): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(fullKey(key));
  } catch {
    // 지우기 실패는 무시해도 무방하다
    return;
  }
  snapshotCache.delete(key);
  emitChange();
}

/** 로컬 저장 레코드의 id 생성기 — DB가 주던 UUID를 대신한다 */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // randomUUID가 없는 오래된 환경용 폴백
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

