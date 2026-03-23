/**
 * OAuth 클라이언트 자격증명 토큰 캐시
 *
 * - client_credentials 방식 토큰은 보통 24시간 유효
 * - 만료 60초 전에 미리 재발급
 * - globalThis 기반 → 동일 isolate 내 모든 요청이 공유
 * - 다중 isolate(Cloudflare Workers 고트래픽) 환경에서는 각자 독립적으로 캐시
 */

interface TokenEntry {
  token: string;
  expiresAt: number; // Unix ms
}

declare global {
  var __wclToken: TokenEntry | undefined;  var __blizzardToken: TokenEntry | undefined;}

const REFRESH_BUFFER_MS = 60_000; // 만료 60초 전 갱신

function isValid(entry: TokenEntry | undefined): entry is TokenEntry {
  return !!entry && entry.expiresAt - REFRESH_BUFFER_MS > Date.now();
}

export async function getWclToken(): Promise<string> {
  if (isValid(globalThis.__wclToken)) return globalThis.__wclToken.token;

  const clientId = process.env.WCL_CLIENT_ID;
  const clientSecret = process.env.WCL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("WCL_CLIENT_ID / WCL_CLIENT_SECRET 환경변수를 설정해 주세요.");
  }

  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("WCL 토큰 발급 실패");

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 86400;
  globalThis.__wclToken = {
    token: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return globalThis.__wclToken.token;
}

export async function getBlizzardToken(): Promise<string> {
  if (isValid(globalThis.__blizzardToken)) return globalThis.__blizzardToken.token;

  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET 환경변수를 설정해 주세요.");
  }

  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://oauth.battle.net/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("블리자드 토큰 발급 실패");

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 86400;
  globalThis.__blizzardToken = {
    token: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return globalThis.__blizzardToken.token;
}
