'use client';

import { useCallback } from 'react';
import type { MainTab } from '@/app/types';

const STORAGE_KEY = 'srp_tour_seen_tabs';

type TourStep = {
  element: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
  };
};

const TAB_STEPS: Partial<Record<MainTab, TourStep[]>> = {
  ROSTER: [
    {
      element: '[data-tour="roster-input"]',
      popover: {
        title: '캐릭터 가져오기 및 자동배치',
        description: "Smart Raid Plan 건전한 피드백 애드온에서 추출한 '캐릭터명-서버명' 형식의 내용을 붙여넣으면 캐릭터 정보를 자동으로 불러오고 역할이 자동 배치됩니다.",
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="roster-manager"]',
      popover: {
        title: '명단 저장소',
        description: '로그인이 필요합니다. 현재 공대 구성을 저장하고 나중에 불러올 수 있습니다. 여러 명단을 저장해두면 매번 다시 입력할 필요가 없습니다.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="roster-unassigned"]',
      popover: {
        title: '대기소',
        description: '역할이 미배정된 플레이어는 여기 대기소에 모입니다. 드래그 앤 드롭으로 아래 역할 슬롯에 배치하거나 자동배치 버튼을 사용하세요.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="roster-actions"]',
      popover: {
        title: '구성 복사 및 Discord 전송',
        description: '완성된 공대 구성을 클립보드에 복사하거나, Discord 웹훅을 연동해 채널에 바로 전송할 수 있습니다. Discord 웹훅 사용은 로그인이 필요합니다.',
        side: 'bottom',
        align: 'end',
      },
    },
  ],
  RAID_MARKET: [
    {
      element: '[data-tour="market-input"]',
      popover: {
        title: '장부 입력',
        description: '애드온에서 내보낸 거래 장부를 붙여넣으세요. 아이템 아이콘과 이름이 자동으로 불러와집니다.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="market-load-btn"]',
      popover: {
        title: '장부 불러오기',
        description: '버튼을 누르면 입력한 장부를 불러와 거래 내역과 분배 계산기가 표시됩니다.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="market-calculator"]',
      popover: {
        title: '분배 계산기',
        description: '총 금액에서 공대비를 제하거나 추가하고, 인원수로 나눠 1인당 분배금을 자동 계산합니다.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="market-save"]',
      popover: {
        title: '회차 저장',
        description: '거래 내역을 회차별로 저장하면 누적 금액과 지금까지 획득한 아이템들을 기록으로 남길 수 있습니다.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="market-history"]',
      popover: {
        title: '누적 기록',
        description: '저장된 공대 거래 회차 목록을 확인하고 불러올 수 있습니다. 프로필에서도 확인 가능합니다.',
        side: 'top',
        align: 'start',
      },
    },
  ],
  RAID_AI_ANALYSIS: [
    {
      element: '[data-tour="analysis-input"]',
      popover: {
        title: '공대 분석',
        description: 'WarcraftLogs URL을 붙여넣으면 DPS 그래프, 사망 분석, 방어 스킬 사용 현황, 소모품 사용 여부를 자동으로 분석합니다.',
        side: 'bottom',
        align: 'start',
      },
    },
  ],
};

function getSeenTabs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function useTour() {
  const markTabSeen = useCallback((tab: MainTab) => {
    const seen = getSeenTabs();
    if (!seen.includes(tab)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, tab]));
    }
  }, []);

  const hasSeenTab = useCallback((tab: MainTab): boolean => {
    return getSeenTabs().includes(tab);
  }, []);

  const resetAllTours = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const startTour = useCallback(async (tab: MainTab) => {
    const steps = TAB_STEPS[tab];
    if (!steps?.length) return;

    // 현재 DOM에 존재하는 스텝만 사용 (동적 요소 필터링)
    const validSteps = steps.filter((step) => !!document.querySelector(step.element));
    if (!validSteps.length) return;

    const { driver } = await import('driver.js');

    const driverObj = driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: '다음',
      prevBtnText: '이전',
      doneBtnText: '완료',
      showButtons: ['next', 'previous', 'close'],
      overlayColor: '#000',
      overlayOpacity: 0.40,
      stagePadding: 6,
      stageRadius: 8,
      popoverClass: 'srp-tour-popover',
      steps: validSteps,
      onDestroyStarted: () => {
        markTabSeen(tab);
        driverObj.destroy();
      },
    });

    markTabSeen(tab);
    driverObj.drive();
  }, [markTabSeen]);

  return { startTour, hasSeenTab, markTabSeen, resetAllTours };
}
