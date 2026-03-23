interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Cloudflare Workers 주의사항:
 * - 동일 isolate 내에서는 이 Map이 요청 간 공유됨 (정상 동작)
 * - 트래픽이 많아 여러 isolate가 생성되면 각각 독립된 Map을 가짐
 * - 완전한 분산 rate limiting이 필요하면 Cloudflare KV / Durable Objects 도입 필요
 * - 현재는 "최선 노력(best-effort)" 방식으로 동작
 */
declare global {
  var __rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store: Map<string, RateLimitEntry> =
  globalThis.__rateLimitStore ??
  (globalThis.__rateLimitStore = new Map<string, RateLimitEntry>());

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}

export function checkRateLimit(
  ip: string,
  route: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  try {
    if (store.size > 10000) cleanup();

    const key = `${route}:${ip}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
  } catch {
    // 예외 발생 시 fail-open: 요청을 차단하지 않음
    return { allowed: true, remaining: 1, resetAt: Date.now() + windowMs };
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
