import { externalApi } from "@/app/lib/api";

const FALLBACK_ICON_URL = "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const ERROR_TTL_MS = 1000 * 60 * 10; // 10m

export interface SpellLookupResult {
  id: string;
  name: string;
  iconUrl: string;
  description: string;
}

type CacheEntry = {
  expiresAt: number;
  data: SpellLookupResult;
};

const spellCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<SpellLookupResult>>();

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractSpellName(html: string, spellId: string): string {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    return decodeHtmlEntities(titleMatch[1]).split(" - ")[0].trim();
  }

  const nameKokrMatch = html.match(/"name_kokr":"([^"]+)"/i);
  if (nameKokrMatch?.[1]) {
    return nameKokrMatch[1];
  }

  return `알 수 없는 스킬 (${spellId})`;
}

function extractIconUrl(html: string): string {
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImageMatch?.[1]) {
    return ogImageMatch[1];
  }

  const iconFileMatch = html.match(/"icon":"([a-z0-9_]+)"/i);
  if (iconFileMatch?.[1]) {
    return `https://wow.zamimg.com/images/wow/icons/large/${iconFileMatch[1]}.jpg`;
  }

  return FALLBACK_ICON_URL;
}

function extractDescription(html: string): string {
  const metaDescriptionMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (metaDescriptionMatch?.[1]) {
    return decodeHtmlEntities(metaDescriptionMatch[1]).trim();
  }

  const descriptionKokrMatch = html.match(/"description_kokr":"([^"]+)"/i);
  if (descriptionKokrMatch?.[1]) {
    return descriptionKokrMatch[1]
      .replace(/\\"/g, '"')
      .replace(/\\\//g, "/")
      .replace(/<!--.*?-->/g, "")
      .trim();
  }

  return "";
}

function getFallback(spellId: string): SpellLookupResult {
  return {
    id: spellId,
    name: `알 수 없는 스킬 (${spellId})`,
    iconUrl: FALLBACK_ICON_URL,
    description: "",
  };
}

async function lookupFromWowhead(spellId: string): Promise<SpellLookupResult> {
  const urls = [`https://www.wowhead.com/ko/spell=${spellId}`, `https://ko.wowhead.com/spell=${spellId}`];

  for (const url of urls) {
    const res = await externalApi.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SmartRaidPlanner/1.0)",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      throwHttpErrors: false,
      // Let Next cache remote response as well.
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) continue;

    const htmlText = await res.text();
    const name = extractSpellName(htmlText, spellId);
    const iconUrl = extractIconUrl(htmlText);
    const description = extractDescription(htmlText);

    if (!name.startsWith("알 수 없는 스킬") || iconUrl !== FALLBACK_ICON_URL || description) {
      return { id: spellId, name, iconUrl, description };
    }
  }

  return getFallback(spellId);
}

export async function getSpellLookup(spellIdRaw: string): Promise<SpellLookupResult> {
  const spellId = String(spellIdRaw || "").trim();
  if (!spellId) {
    return getFallback("unknown");
  }

  const now = Date.now();
  const cached = spellCache.get(spellId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const pending = inflight.get(spellId);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    try {
      const result = await lookupFromWowhead(spellId);
      const ttl = result.name.startsWith("알 수 없는 스킬") ? ERROR_TTL_MS : CACHE_TTL_MS;
      spellCache.set(spellId, {
        expiresAt: Date.now() + ttl,
        data: result,
      });
      return result;
    } catch {
      const fallback = getFallback(spellId);
      spellCache.set(spellId, {
        expiresAt: Date.now() + ERROR_TTL_MS,
        data: fallback,
      });
      return fallback;
    } finally {
      inflight.delete(spellId);
    }
  })();

  inflight.set(spellId, promise);
  return promise;
}
