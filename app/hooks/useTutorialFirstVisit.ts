'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { notifyStoreChange, subscribeStore } from '@/app/lib/localStore';

// localStore 네임스페이스 밖의 키라 쓰기 후 직접 변경을 알린다.
const STORAGE_KEY = 'srp_tutorial_seen';

function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    // 저장소 접근이 막힌 환경에서는 이미 본 것으로 취급해 튜토리얼을 띄우지 않는다
    return true;
  }
}

// 서버 렌더에는 저장소가 없다. 첫 렌더에서 튜토리얼이 깜빡이지 않도록 본 것으로 둔다.
const seenOnServer = () => true;

/** 첫 방문 여부 판별 */
export function useTutorialFirstVisit() {
  const seen = useSyncExternalStore(subscribeStore, hasSeenTutorial, seenOnServer);
  // 이번 세션에서 닫은 경우. 저장에 실패해도 다시 뜨지 않게 한다.
  const [dismissed, setDismissed] = useState(false);

  const markSeen = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
      notifyStoreChange();
    } catch {
      // 기록에 실패해도 이번 세션에서는 다시 뜨지 않는다
    }
  }, []);

  return { shouldShow: !seen && !dismissed, markSeen };
}
