'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { notifyStoreChange, subscribeStore } from '@/app/lib/localStore';

// 기존 사용자의 "이미 봤음" 상태를 보존하기 위해 예전 키를 그대로 쓴다.
// localStore 네임스페이스 밖이라 쓰기 후 직접 변경을 알린다.
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

/**
 * 첫 방문 여부 판별
 *
 * 예전에는 로그인 사용자의 profiles.tutorial_completed를 함께 봤지만, 로그인이
 * 사라지면서 브라우저 로컬 기록만 남았다.
 */
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
