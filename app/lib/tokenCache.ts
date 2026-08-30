import { externalApi } from "@/app/lib/api";

/**
 * OAuth 클라이언트 자격증명(client_credentials) 토큰 캐시
 *
 * 동작:
 * - client_credentials 토큰은 보통 24시간 유효 → 유효기간 동안 메모리에 보관해 재사용
 * - 실제 만료 60초 전(REFRESH_BUFFER_MS)에 선제 갱신
 * - stale-while-revalidate: 갱신 윈도우에 진입하면 백그라운드로 재발급을 돌리되,
 *   아직 실제 만료 전 토큰이 있으면 호출자는 대기 없이 그 토큰을 즉시 받는다
 * - 동시 요청 합치기(in-flight coalescing): 캐시미스 시 동시에 들어온 요청들이
 *   하나의 발급 Promise에 합류 → 외부 인증 왕복을 단일 발급으로 수렴
 * - graceful fallback: 발급이 실패해도 아직 실제 만료 전인 기존 토큰이 있으면
 *   그 토큰을 반환해 공대분석 요청이 통째로 깨지지 않게 함
 *
 * 한계:
 * - globalThis 기반 → 동일 isolate 내 요청만 캐시/합치기를 공유
 * - 다중 isolate(Cloudflare Workers 고트래픽) 환경에서는 isolate마다 독립 캐시
 *   (cross-isolate 공유는 KV/Durable Objects 필요)
 */

interface TokenEntry {
  token: string;
  expiresAt: number; // Unix ms (실제 만료 시각)
}

interface TokenState {
  entry?: TokenEntry;
  inflight?: Promise<string>; // 진행 중인 발급 Promise (동시 요청 합치기용)
}

declare global {
  var __oauthTokenStates: Record<string, TokenState> | undefined;
}

const REFRESH_BUFFER_MS = 60_000; // 실제 만료 60초 전 선제 갱신
const DEFAULT_EXPIRES_IN = 86_400; // expires_in 누락 시 24시간 가정

function getStates(): Record<string, TokenState> {
  return (globalThis.__oauthTokenStates ??= {});
}

// 선제 갱신 버퍼 적용 — 이 시점을 지나면 미리 재발급 시도
function isFresh(entry: TokenEntry): boolean {
  return entry.expiresAt - REFRESH_BUFFER_MS > Date.now();
}

// 실제 만료 전이면 사용 가능 — 발급 실패 시 graceful fallback 판단 기준
function isUsable(entry: TokenEntry): boolean {
  return entry.expiresAt > Date.now();
}

interface TokenProviderConfig {
  key: string; // globalThis 캐시 식별자
  label: string; // 에러 메시지용 이름
  tokenUrl: string;
  getCredentials: () => { clientId?: string; clientSecret?: string };
}

function createTokenProvider(config: TokenProviderConfig): () => Promise<string> {
  const { key, label, tokenUrl, getCredentials } = config;

  // 실제 외부 발급 1회 — 성공 시 entry를 갱신한다.
  // 던지는 에러는 "사유"만 담는다(접두사 없음) — 라벨 접두사는 호출 측에서 한 번만 붙인다.
  async function fetchToken(state: TokenState): Promise<string> {
    const { clientId, clientSecret } = getCredentials();
    if (!clientId || !clientSecret) {
      throw new Error("client_id / client_secret 환경변수를 설정해 주세요.");
    }

    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const data = await externalApi
      .post(tokenUrl, {
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        cache: "no-store",
      })
      .json<{ access_token?: string; expires_in?: number }>();

    if (!data.access_token) throw new Error("응답에 access_token 없음");

    const expiresIn =
      typeof data.expires_in === "number" ? data.expires_in : DEFAULT_EXPIRES_IN;
    state.entry = {
      token: data.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    return data.access_token;
  }

  // 발급(또는 재발급)을 단 하나의 Promise로 수렴시킨다(in-flight 합치기).
  // graceful fallback과 in-flight 정리까지 이 Promise 안에서 처리한다.
  function ensureRefresh(state: TokenState): Promise<string> {
    if (state.inflight) return state.inflight;

    const inflight = (async (): Promise<string> => {
      try {
        return await fetchToken(state);
      } catch (error) {
        // graceful fallback: 발급 실패해도 실제 만료 전 토큰이 있으면 그대로 사용
        const cached = state.entry;
        if (cached && isUsable(cached)) return cached.token;
        // 라벨 접두사를 한 번만 붙여 ky가 넣어준 진단 메시지를 보존
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`${label} 토큰 발급 실패: ${reason}`);
      } finally {
        // 성공/실패 무관하게 in-flight 정리 → 다음 요청이 새로 시도 가능
        state.inflight = undefined;
      }
    })();

    state.inflight = inflight;
    // stale-while-revalidate 경로에서는 아무도 이 Promise를 await하지 않으므로
    // 백그라운드 reject가 unhandled가 되지 않도록 안전망을 단다(실제 에러는 await한 호출자에게 전파됨).
    inflight.catch(() => {});
    return inflight;
  }

  return async function getToken(): Promise<string> {
    const state = (getStates()[key] ??= {});
    const entry = state.entry; // 이 동기 흐름 동안 state.entry는 바뀌지 않음(갱신은 비동기)

    // 1) 신선한 캐시 → 외부 왕복 없이 즉시 반환
    if (entry && isFresh(entry)) return entry.token;

    // 2) 갱신 윈도우 진입 → 백그라운드 재발급을 보장(이미 진행 중이면 합류)
    const refresh = ensureRefresh(state);

    // 3) stale-while-revalidate: 아직 실제 만료 전 토큰이 있으면 대기 없이 즉시 반환
    if (entry && isUsable(entry)) return entry.token;

    // 4) 만료됐거나 토큰이 없음(cold start) → 새 발급을 기다린다
    return refresh;
  };
}

export const getWclToken = createTokenProvider({
  key: "wcl",
  label: "WCL",
  tokenUrl: "https://www.warcraftlogs.com/oauth/token",
  getCredentials: () => ({
    clientId: process.env.WCL_CLIENT_ID,
    clientSecret: process.env.WCL_CLIENT_SECRET,
  }),
});

export const getBlizzardToken = createTokenProvider({
  key: "blizzard",
  label: "블리자드",
  tokenUrl: "https://oauth.battle.net/token",
  getCredentials: () => ({
    clientId: process.env.BLIZZARD_CLIENT_ID,
    clientSecret: process.env.BLIZZARD_CLIENT_SECRET,
  }),
});
