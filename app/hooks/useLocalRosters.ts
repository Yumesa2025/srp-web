"use client";

import { useCallback, useSyncExternalStore } from "react";
import { newId, readStore, StoreKeys, subscribeStore, writeStore } from "@/app/lib/localStore";
import { useStoreHydrated } from "@/app/hooks/useStoreHydrated";

export interface RosterRecord {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

/** 참조가 고정돼야 스냅샷이 안정적이다 */
const EMPTY: RosterRecord[] = [];

function readRosters(): RosterRecord[] {
  const data = readStore<RosterRecord[]>(StoreKeys.rosters, EMPTY);
  return Array.isArray(data) ? data : EMPTY;
}

/**
 * 명단 저장소 — 기존 roster Server Action(saveRoster/loadRosters/deleteRoster)을 대체한다.
 *
 * 서버에는 저장값이 없으므로 첫 렌더에서는 빈 목록이 나오고, 하이드레이션이
 * 끝나면 실제 값으로 바뀐다. 그 사이를 isLoading으로 표시한다.
 */
export function useLocalRosters() {
  const rosters = useSyncExternalStore(subscribeStore, readRosters, () => EMPTY);
  const isHydrated = useStoreHydrated();

  const saveRoster = useCallback((name: string, content: string): { error?: string } => {
    const record: RosterRecord = {
      id: newId(),
      name,
      content,
      createdAt: new Date().toISOString(),
    };
    // 최신순 정렬을 유지하기 위해 앞에 붙인다
    return writeStore(StoreKeys.rosters, [record, ...readRosters()]);
  }, []);

  const deleteRoster = useCallback((id: string): { error?: string } => {
    return writeStore(StoreKeys.rosters, readRosters().filter((r) => r.id !== id));
  }, []);

  return { rosters, isLoading: !isHydrated, saveRoster, deleteRoster };
}
