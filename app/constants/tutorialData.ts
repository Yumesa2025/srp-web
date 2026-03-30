import type { MainTab } from '@/app/types';

export interface TutorialItem {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  tab: MainTab;
}

export interface TutorialGroup {
  id: string;
  label: string;
  items: TutorialItem[];
}

export const TUTORIAL_GROUPS: TutorialGroup[] = [
  {
    id: 'roster',
    label: '파티원 명단',
    items: [
      {
        id: 'roster-1',
        title: '캐릭터 가져오기 및 자동배치',
        description: '캐릭터 이름과 서버명을 "캐릭터명-서버명" 형식으로 입력하면 Blizzard API를 통해 정보를 자동으로 불러옵니다. 현재 특성을 기반으로 탱커, 힐러, 딜러 역할이 자동 배치됩니다.',
        actionLabel: '파티원 명단으로 이동',
        tab: 'ROSTER',
      },
      {
        id: 'roster-2',
        title: '대기소',
        description: '역할이 미배정된 플레이어는 대기소에 위치합니다. 드래그 앤 드롭으로 원하는 역할 슬롯에 배치하거나, 자동배치 버튼을 사용할 수 있습니다.',
        actionLabel: '파티원 명단으로 이동',
        tab: 'ROSTER',
      },
      {
        id: 'roster-3',
        title: '명단저장소',
        description: '현재 공대 구성을 저장하고 나중에 불러올 수 있습니다. 로그인 후 여러 명단을 저장해두면 매번 다시 입력할 필요가 없습니다.',
        actionLabel: '파티원 명단으로 이동',
        tab: 'ROSTER',
      },
      {
        id: 'roster-4',
        title: '구성복사 및 디스코드 전송',
        description: '완성된 공대 구성을 클립보드에 복사하거나, 디스코드 웹훅을 연동하면 채널에 바로 전송할 수 있습니다.',
        actionLabel: '파티원 명단으로 이동',
        tab: 'ROSTER',
      },
    ],
  },
  {
    id: 'market',
    label: '공대 거래',
    items: [
      {
        id: 'market-1',
        title: '전리품 및 골드 저장소',
        description: '공대에서 획득한 아이템과 골드 거래 내역을 기록합니다. 아이템 ID를 입력하면 아이콘과 이름이 자동으로 불러와집니다.',
        actionLabel: '공대 거래로 이동',
        tab: 'RAID_MARKET',
      },
      {
        id: 'market-2',
        title: '장부 불러오는 방법',
        description: '이전에 저장한 거래 장부를 불러와 과거 회차 내역을 확인할 수 있습니다. 프로필에서 저장된 회차 목록을 볼 수 있습니다.',
        actionLabel: '공대 거래로 이동',
        tab: 'RAID_MARKET',
      },
      {
        id: 'market-3',
        title: '거래내역 확인법',
        description: '아이템별 낙찰자와 거래 금액을 한눈에 확인할 수 있습니다. 수령인을 지정하고 골드를 입력하면 자동으로 집계됩니다.',
        actionLabel: '공대 거래로 이동',
        tab: 'RAID_MARKET',
      },
      {
        id: 'market-4',
        title: '분배계산기 확인법',
        description: '총 수입에서 공대비를 제외한 순수익을 인원수로 나눠 1인당 분배금을 자동 계산합니다.',
        actionLabel: '공대 거래로 이동',
        tab: 'RAID_MARKET',
      },
      {
        id: 'market-5',
        title: '회차 저장하기 및 누적기록 보기',
        description: '거래 내역을 회차별로 저장하면 프로필에서 누적 기록을 확인할 수 있습니다. 공대 수익 추이를 한눈에 파악해보세요.',
        actionLabel: '공대 거래로 이동',
        tab: 'RAID_MARKET',
      },
    ],
  },
  {
    id: 'analysis',
    label: '공대 분석',
    items: [
      {
        id: 'analysis-1',
        title: '공대 분석 사용법',
        description: 'Warcraft Logs 로그 링크를 붙여넣으면 공대원 퍼포먼스를 자동 분석합니다. 처치량, 소모품 사용 여부, 생존율 등 다양한 지표를 확인하고 개선점을 파악할 수 있습니다.',
        actionLabel: '공대 분석으로 이동',
        tab: 'RAID_AI_ANALYSIS',
      },
    ],
  },
];
