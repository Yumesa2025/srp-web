'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

type HelpSection = 'addon' | 'usage';

const TABS: { id: HelpSection; label: string }[] = [
  { id: 'addon',   label: '애드온' },
  { id: 'usage',   label: '이용 안내' },
];

interface Props {
  onOpenTutorial: () => void;
}

export default function HelpTab({ onOpenTutorial }: Props) {
  const [active, setActive] = useState<HelpSection>('addon');

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
        <h2 className="text-3xl font-bold text-white mb-1">도움말</h2>
        <p className="text-xl text-gray-500">SRP 사용 방법을 안내합니다.</p>
      </div>

      <div className="flex gap-1 p-1 bg-gray-800/60 rounded-xl border border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex-1 py-3 text-lg font-bold rounded-lg transition-colors ${
              active === tab.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6 bg-gray-800/60 rounded-xl border border-gray-700 min-h-[400px]">
        {active === 'addon'   && <AddonHelp />}
        {active === 'usage'   && <UsageHelp onOpenTutorial={onOpenTutorial} />}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-bold text-2xl border-b border-gray-700 pb-2">{title}</h3>
      {children}
    </div>
  );
}

function Step({ num, children }: { num: number; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-8 h-8 rounded-full bg-cyan-700 text-white text-base font-black flex items-center justify-center shrink-0 mt-0.5">{num}</span>
      <p className="text-gray-300 text-xl leading-relaxed">{children}</p>
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="px-2 py-0.5 bg-gray-700 text-cyan-300 text-lg rounded font-mono">{children}</code>;
}

function AddonHelp() {
  return (
    <div className="space-y-10">

      <Section title="🧩 Smart Raid Planner (SRP)">
        <p className="text-gray-400 text-xl leading-relaxed">
          <span className="text-white font-semibold">Smart Raid Planner (SRP)</span>는 한국 WoW 공대장을 위한 두 가지 핵심 도구를 제공하는 애드온입니다.
        </p>
        <a
          href="https://www.curseforge.com/wow/addons/smart-raid-plan"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 bg-orange-700/30 hover:bg-orange-700/50 border border-orange-600/40 text-orange-300 text-xl font-bold rounded-xl transition-colors"
        >
          CurseForge에서 무료 설치 ↗
        </a>
      </Section>

      <Section title="탭 1 — 명단 추출">
        <p className="text-gray-400 text-xl leading-relaxed">
          현재 파티 또는 공대 명단을 자동으로 추출합니다.
        </p>
        <div className="space-y-3">
          <Step num={1}>
            <span className="text-white font-semibold">공대 명단 추출</span> 버튼을 누르면 현재 파티 또는 공대의 모든 유저 닉네임이 자동으로 복사됩니다.
          </Step>
          <Step num={2}>
            또는 <span className="text-white font-semibold">달력</span>을 열고 → <span className="text-white font-semibold">추출</span> 버튼 클릭 → 원하는 일정 선택 순서로 진행하면 해당 일정의 모든 유저 닉네임을 가져올 수 있습니다.
          </Step>
        </div>
        <div className="mt-2 space-y-2">
          <p className="text-gray-500 text-lg font-semibold uppercase tracking-wider">주요 명령어</p>
          <div className="flex flex-wrap gap-3">
            {[
              { cmd: '/srp',  desc: '애드온 창 열기 (명단 탭)' },
              { cmd: '/공대', desc: '애드온 창 열기 (명단 탭)' },
              { cmd: '/거래', desc: '애드온 창 열기 (거래 장부 탭)' },
            ].map(({ cmd, desc }) => (
              <div key={cmd} className="flex items-center gap-3 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg">
                <Code>{cmd}</Code>
                <span className="text-gray-400 text-lg">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="탭 2 — 거래 장부">
        <p className="text-gray-400 text-xl leading-relaxed">
          레이드 전리품 거래 내역을 기록하는 장부입니다. 아이템 ID, 낙찰자, 골드를 입력하면 자동으로 정리됩니다.
          내보내기 버튼으로 데이터를 복사해 공대 거래 탭에 붙여넣을 수 있습니다.
        </p>
      </Section>

    </div>
  );
}

function UsageHelp({ onOpenTutorial }: { onOpenTutorial: () => void }) {
  return (
    <div className="space-y-10">

      <div className="p-5 bg-cyan-900/20 border border-cyan-700/40 rounded-xl flex items-center justify-between gap-4">
        <div>
          <p className="text-white font-bold text-lg">SRP 튜토리얼</p>
          <p className="text-gray-400 text-sm mt-0.5">파티원 명단, 공대 거래, 공대 분석 기본 사용법을 안내합니다.</p>
        </div>
        <button
          onClick={onOpenTutorial}
          className="shrink-0 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors text-sm"
        >
          튜토리얼 보기
        </button>
      </div>

      <Section title="🔓 계정이 필요 없습니다">
        <p className="text-gray-400 text-xl leading-relaxed">
          SRP는 로그인이 없습니다. 모든 기능을 바로 사용할 수 있습니다.
        </p>
      </Section>

      <Section title="💾 저장은 어디에 되나요?">
        <p className="text-gray-400 text-xl leading-relaxed mb-3">
          저장한 파티원 명단과 공대 거래 회차는 <span className="text-white font-semibold">지금 쓰는 브라우저에만</span> 보관됩니다.
          서버로 올라가지 않습니다.
        </p>
        <div className="p-4 bg-amber-900/20 border border-amber-700/30 rounded-xl">
          <p className="text-amber-400 text-xl font-semibold">⚠️ 알아두세요</p>
          <ul className="text-gray-400 text-xl mt-1 space-y-1 list-disc list-inside">
            <li>다른 기기나 다른 브라우저에서는 저장한 기록이 보이지 않습니다</li>
            <li>브라우저 데이터(쿠키·사이트 데이터)를 지우면 기록도 함께 사라집니다</li>
            <li>시크릿 창에서는 창을 닫는 순간 사라집니다</li>
          </ul>
        </div>
      </Section>

      <Section title="⚙️ 설정">
        <p className="text-gray-400 text-xl leading-relaxed mb-3">
          우상단 <span className="text-white font-semibold">⚙️ 설정</span> 버튼을 누르면 Discord Webhook URL을 등록할 수 있습니다.
          등록해두면 파티원 구성과 공대 거래 내역을 Discord 채널로 바로 전송할 수 있습니다.
        </p>
        <div className="space-y-2">
          <Step num={1}>Discord 채널 설정 → 연동 → 웹후크에서 URL 복사</Step>
          <Step num={2}>우상단 <span className="text-white font-semibold">⚙️ 설정</span> → 입력창에 붙여넣기 → <span className="text-white font-semibold">저장</span></Step>
          <Step num={3}>각 탭의 <span className="text-white font-semibold">Discord 전송</span> 버튼으로 전송</Step>
        </div>
      </Section>

    </div>
  );
}
