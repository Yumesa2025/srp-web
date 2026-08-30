"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readStore, StoreKeys, subscribeStore, writeStore } from "@/app/lib/localStore";
import { useStoreHydrated } from "@/app/hooks/useStoreHydrated";

/** Discord가 발급하는 웹훅 URL의 유일한 형태 */
const WEBHOOK_PREFIX = "https://discord.com/api/webhooks/";

const EMPTY = "";

function isValidWebhookUrl(url: string): boolean {
  return url.startsWith(WEBHOOK_PREFIX);
}

/**
 * 컴포넌트 렌더링과 무관하게 현재 웹훅 URL이 필요할 때 쓴다.
 * (전송 버튼 클릭 시점처럼 이벤트 핸들러 안에서 읽는 경우)
 */
export function getStoredWebhookUrl(): string {
  const value = readStore<string>(StoreKeys.discordWebhookUrl, EMPTY);
  return typeof value === "string" ? value : EMPTY;
}

/**
 * Discord 웹훅 URL 저장소
 *
 * 저장된 URL은 전송 시 /api/discord 요청 body에 실려 서버로 간다. 서버도 같은
 * 접두사 검증을 다시 수행하므로, 여기 검증은 사용자 입력을 즉시 걸러내기 위한 것이다.
 */
export function useDiscordWebhook() {
  const url = useSyncExternalStore(subscribeStore, getStoredWebhookUrl, () => EMPTY);
  const isHydrated = useStoreHydrated();

  const saveUrl = useCallback((next: string): { error?: string } => {
    const trimmed = next.trim();
    if (trimmed && !isValidWebhookUrl(trimmed)) {
      return { error: "올바른 Discord Webhook URL이 아닙니다." };
    }
    return writeStore(StoreKeys.discordWebhookUrl, trimmed);
  }, []);

  return { url, isLoading: !isHydrated, saveUrl };
}
