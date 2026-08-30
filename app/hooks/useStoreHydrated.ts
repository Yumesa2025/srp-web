"use client";

import { useSyncExternalStore } from "react";
import { subscribeStore } from "@/app/lib/localStore";

const getTrue = () => true;
const getFalse = () => false;

/**
 * 클라이언트에서 하이드레이션이 끝났는지 알려준다.
 *
 * 서버 렌더 결과에는 저장값이 없으므로 첫 렌더에서는 항상 false다. 저장값에
 * 의존하는 UI(스켈레톤 등)를 이 값으로 가르면 하이드레이션 불일치가 나지 않는다.
 */
export function useStoreHydrated(): boolean {
  return useSyncExternalStore(subscribeStore, getTrue, getFalse);
}
