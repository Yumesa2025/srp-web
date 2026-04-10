import { externalApi } from "@/app/lib/api";

const FALLBACK_ICON_URL = "https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const ERROR_TTL_MS = 1000 * 60 * 10; // 10m

export interface ItemLookupResult {
  id: string;
  name: string;
  iconUrl: string;
}

type CacheEntry = {
  expiresAt: number;
  data: ItemLookupResult;
};

const itemCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ItemLookupResult>>();

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getFallback(itemId: string): ItemLookupResult {
  return {
    id: itemId,
    name: `아이템 (ID: ${itemId})`,
    iconUrl: FALLBACK_ICON_URL,
  };
}

function extractItemName(html: string, itemId: string): string {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    return decodeHtmlEntities(titleMatch[1]).split(" - ")[0].trim();
  }

  const nameMatch = html.match(/"name_kokr":"([^"]+)"/i);
  if (nameMatch?.[1]) {
    return nameMatch[1];
  }

  return getFallback(itemId).name;
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

async function lookupFromWowhead(itemId: string): Promise<ItemLookupResult> {
  const urls = [`https://www.wowhead.com/ko/item=${itemId}`, `https://ko.wowhead.com/item=${itemId}`];

  for (const url of urls) {
    const res = await externalApi.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SmartRaidPlanner/1.0)",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      throwHttpErrors: false,
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) continue;

    const htmlText = await res.text();
    const name = extractItemName(htmlText, itemId);
    const iconUrl = extractIconUrl(htmlText);

    if (!name.startsWith("아이템 (ID:") || iconUrl !== FALLBACK_ICON_URL) {
      return { id: itemId, name, iconUrl };
    }
  }

  return getFallback(itemId);
}

export async function getItemLookup(itemIdRaw: string): Promise<ItemLookupResult> {
  const itemId = String(itemIdRaw || "").trim();
  if (!itemId || !/^\d+$/.test(itemId)) {
    return getFallback("unknown");
  }

  const now = Date.now();
  const cached = itemCache.get(itemId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const pending = inflight.get(itemId);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    try {
      const result = await lookupFromWowhead(itemId);
      const ttl = result.name.startsWith("아이템 (ID:") ? ERROR_TTL_MS : CACHE_TTL_MS;
      itemCache.set(itemId, {
        expiresAt: Date.now() + ttl,
        data: result,
      });
      return result;
    } catch {
      const fallback = getFallback(itemId);
      itemCache.set(itemId, {
        expiresAt: Date.now() + ERROR_TTL_MS,
        data: fallback,
      });
      return fallback;
    } finally {
      inflight.delete(itemId);
    }
  })();

  inflight.set(itemId, promise);
  return promise;
}
