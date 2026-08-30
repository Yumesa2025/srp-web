"use client";

import { useCallback, useSyncExternalStore } from "react";
import { newId, readStore, StoreKeys, subscribeStore, writeStore } from "@/app/lib/localStore";
import { useStoreHydrated } from "@/app/hooks/useStoreHydrated";

export interface RaidSession {
  id: string;
  label: string;
  raid_size: number;
  raid_expense: number;
  total_gold: number;
  per_person: number;
  raw_input: string;
  created_at: string;
}

export interface RaidItemRecord {
  id: string;
  session_id: string;
  item_id: string;
  item_name: string;
  icon_url: string;
  winner: string;
  gold: number;
  created_at: string;
}

export interface SaveSessionParams {
  label: string;
  raidSize: number;
  raidExpense: number;
  totalGold: number;
  perPerson: number;
  rawInput: string;
  items: {
    item_id: string;
    item_name: string;
    icon_url: string;
    winner: string;
    gold: number;
  }[];
}

/** 참조가 고정돼야 스냅샷이 안정적이다 */
const EMPTY_SESSIONS: RaidSession[] = [];
const EMPTY_ITEMS: RaidItemRecord[] = [];

function readSessions(): RaidSession[] {
  const data = readStore<RaidSession[]>(StoreKeys.raidSessions, EMPTY_SESSIONS);
  return Array.isArray(data) ? data : EMPTY_SESSIONS;
}

function readItems(): RaidItemRecord[] {
  const data = readStore<RaidItemRecord[]>(StoreKeys.raidItems, EMPTY_ITEMS);
  return Array.isArray(data) ? data : EMPTY_ITEMS;
}

/**
 * 공대거래 회차 저장소
 *
 * 회차와 아이템을 별도 키로 나눠 보관한다. 관계형 DB가 아니므로 다음 두 가지를
 * 직접 처리한다.
 * - id 생성: crypto.randomUUID()로 만든다.
 * - 연쇄 삭제: 회차를 지우면 그 회차에 속한 아이템도 함께 지운다.
 *
 * saveSession/fetchAllItems/deleteSession은 실제로는 동기 작업이지만, 저장 위치가
 * 바뀌어도 호출부가 흔들리지 않도록 Promise 인터페이스를 유지한다.
 */
export function useMarketStorage() {
  const sessions = useSyncExternalStore(subscribeStore, readSessions, () => EMPTY_SESSIONS);
  const isHydrated = useStoreHydrated();

  const saveSession = useCallback(async (params: SaveSessionParams): Promise<{ error?: string }> => {
    const now = new Date().toISOString();
    const session: RaidSession = {
      id: newId(),
      label: params.label,
      raid_size: params.raidSize,
      raid_expense: params.raidExpense,
      total_gold: params.totalGold,
      per_person: params.perPerson,
      raw_input: params.rawInput,
      created_at: now,
    };

    // 최신순 정렬을 유지하기 위해 앞에 붙인다
    const sessionResult = writeStore(StoreKeys.raidSessions, [session, ...readSessions()]);
    if (sessionResult.error) return sessionResult;

    if (params.items.length > 0) {
      const newItems: RaidItemRecord[] = params.items.map((item) => ({
        id: newId(),
        session_id: session.id,
        created_at: now,
        ...item,
      }));
      const itemsResult = writeStore(StoreKeys.raidItems, [...newItems, ...readItems()]);
      if (itemsResult.error) {
        // 아이템 저장에 실패하면 방금 넣은 회차를 되돌려 반쪽 상태를 남기지 않는다
        writeStore(StoreKeys.raidSessions, readSessions().filter((s) => s.id !== session.id));
        return itemsResult;
      }
    }

    return {};
  }, []);

  const fetchAllItems = useCallback(async (): Promise<RaidItemRecord[]> => {
    return readItems();
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    writeStore(StoreKeys.raidSessions, readSessions().filter((s) => s.id !== id));
    // 회차에 딸린 아이템도 함께 지운다 (DB의 연쇄 삭제를 대신한다)
    writeStore(StoreKeys.raidItems, readItems().filter((item) => item.session_id !== id));
  }, []);

  return {
    // 저장은 즉시 끝나므로 별도의 진행 상태가 없다. 호출부 인터페이스만 유지한다.
    isSaving: false,
    isLoading: !isHydrated,
    sessions, saveSession, fetchAllItems, deleteSession,
  };
}
