type RealmInfo = {
  slug: string;
  name: string | null;
};

type RealmCacheEntry = {
  expiresAt: number;
  realms: Map<string, RealmInfo>;
};

const REALM_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
let realmCache: RealmCacheEntry | null = null;

function normalizeRealmToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function fallbackRealmSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

async function fetchKrRealmMap(accessToken: string): Promise<Map<string, RealmInfo>> {
  const now = Date.now();
  if (realmCache && realmCache.expiresAt > now) {
    return realmCache.realms;
  }

  const response = await fetch(
    "https://kr.api.blizzard.com/data/wow/realm/index?namespace=dynamic-kr&locale=ko_KR",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("서버 목록을 불러오지 못했습니다.");
  }

  const data = (await response.json()) as {
    realms?: Array<{ slug?: string; name?: string }>;
  };
  const realms = new Map<string, RealmInfo>();
  const realmList = Array.isArray(data?.realms) ? data.realms : [];

  realmList.forEach((realm) => {
    const slug = typeof realm?.slug === "string" ? realm.slug : null;
    const name = typeof realm?.name === "string" ? realm.name : null;
    if (!slug) return;

    const info: RealmInfo = { slug, name };
    realms.set(normalizeRealmToken(slug), info);
    if (name) {
      realms.set(normalizeRealmToken(name), info);
    }
  });

  realmCache = {
    expiresAt: now + REALM_CACHE_TTL_MS,
    realms,
  };

  return realms;
}

export async function resolveKrRealm(accessToken: string, realmInput: string): Promise<RealmInfo> {
  const raw = realmInput.trim();
  if (!raw) {
    throw new Error("서버 이름이 비어 있습니다.");
  }

  try {
    const normalized = normalizeRealmToken(raw);
    const realms = await fetchKrRealmMap(accessToken);
    const resolved = realms.get(normalized);
    if (resolved) {
      return resolved;
    }
  } catch {
    // Realm index lookup is a convenience layer; character fetch should still
    // work for already-correct slugs even if the index request fails.
  }

  return {
    slug: fallbackRealmSlug(raw),
    name: null,
  };
}
