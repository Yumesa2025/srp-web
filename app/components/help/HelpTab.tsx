'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

type HelpSection = 'roster' | 'market' | 'analysis' | 'account';

const TABS: { id: HelpSection; label: string }[] = [
  { id: 'roster',   label: '파티원 명단' },
  { id: 'market',   label: '공대 거래'   },
  { id: 'analysis', label: '공대 분석'   },
  { id: 'account',  label: '회원'        },
];

export default function HelpTab() {
  const [active, setActive] = useState<HelpSection>('roster');

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-1">도움말</h2>
        <p className="text-gray-500 text-sm">SRP 사용 방법을 안내합니다.</p>
      </div>

      {/* 서브 탭 */}
      <div className="flex gap-1 p-1 bg-gray-800/60 rounded-xl border border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${
              active === tab.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="p-6 bg-gray-800/60 rounded-xl border border-gray-700 min-h-[400px]">
        {active === 'roster'   && <RosterHelp />}
        {active === 'market'   && <MarketHelp />}
        {active === 'analysis' && <AnalysisHelp />}
        {active === 'account'  && <AccountHelp />}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-white font-bold text-base border-b border-gray-700 pb-2">{title}</h3>
      {children}
    </div>
  );
}

function Step({ num, children }: { num: number; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-cyan-700 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{num}</span>
      <p className="text-gray-300 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="px-1.5 py-0.5 bg-gray-700 text-cyan-300 text-xs rounded font-mono">{children}</code>;
}

function RosterHelp() {
  return (
    <div className="space-y-8">

      {/* 필수 애드온 */}
      <Section title="🧩 필수 애드온 — Smart Raid Plan">
        <p className="text-gray-400 text-sm leading-relaxed">
          이 웹사이트는 <span className="text-white font-semibold">Smart Raid Plan</span> 애드온과 함께 사용하도록 만들어졌습니다.
          CurseForge에서 무료로 설치할 수 있습니다.
        </p>
        <a
          href="https://www.curseforge.com/wow/addons/smart-raid-plan"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-700/30 hover:bg-orange-700/50 border border-orange-600/40 text-orange-300 text-sm font-bold rounded-xl transition-colors"
        >
          CurseForge에서 설치하기 ↗
        </a>
        <div className="mt-2 space-y-1.5">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">주요 명령어</p>
          <div className="flex flex-wrap gap-2">
            {[
              { cmd: '/srp',  desc: '애드온 창 열기 (명단 탭)' },
              { cmd: '/공대', desc: '애드온 창 열기 (명단 탭)' },
              { cmd: '/거래', desc: '애드온 창 열기 (거래 장부 탭)' },
            ].map(({ cmd, desc }) => (
              <div key={cmd} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg">
                <Code>{cmd}</Code>
                <span className="text-gray-400 text-xs">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 명단 추출 */}
      <Section title="📋 공대 명단 추출">
        <p className="text-gray-400 text-sm">애드온의 <span className="text-white font-semibold">명단 추출 탭</span>에서 두 가지 방법으로 공대원 명단을 가져올 수 있습니다.</p>
        <div className="space-y-2.5">
          <Step num={1}>
            <span className="text-white font-semibold">공대 명단 추출</span> 버튼을 누르면 현재 파티 또는 공대의 모든 유저 닉네임이 자동으로 복사됩니다.
          </Step>
          <Step num={2}>
            또는 <span className="text-white font-semibold">달력</span>을 열고 → <span className="text-white font-semibold">추출</span> 버튼 클릭 → 원하는 일정 선택 순서로 진행하면 해당 일정의 모든 유저 닉네임을 가져올 수 있습니다.
          </Step>
        </div>
      </Section>

      {/* 웹 사용법 */}
      <Section title="🌐 웹에서 파티원 불러오기">
        <div className="space-y-2.5">
          <Step num={1}>
            상단 <span className="text-white font-semibold">파티원 명단 입력란</span>에 복사한 명단을 그대로 붙여넣기 합니다.
          </Step>
          <Step num={2}>
            <span className="text-white font-semibold">캐릭터 가져오기 및 자동 배치</span> 버튼을 누르면 현재 특성 기준으로 탱커, 근접, 원거리, 치유로 자동 분류됩니다.
          </Step>
          <Step num={3}>
            생성된 캐릭터 카드를 <span className="text-white font-semibold">드래그 앤 드롭</span>으로 원하는 포지션으로 자유롭게 이동할 수 있습니다.
          </Step>
        </div>
      </Section>

      {/* 명단 저장 / 구성 복사 / 디스코드 */}
      <Section title="💾 저장 · 복사 · Discord 전송">
        <div className="space-y-4">
          <div className="p-3 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-sm font-semibold mb-1">명단 저장소</p>
            <p className="text-gray-400 text-sm">원하는 이름으로 현재 파티원 명단을 저장하고, 언제든 다시 불러올 수 있습니다.</p>
          </div>
          <div className="p-3 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-sm font-semibold mb-1">구성 복사</p>
            <p className="text-gray-400 text-sm">현재 파티원의 모든 닉네임과 직업을 정리된 형태로 클립보드에 복사합니다.</p>
          </div>
          <div className="p-3 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-sm font-semibold mb-1">Discord 전송</p>
            <p className="text-gray-400 text-sm mb-2">
              우상단 프로필 → <span className="text-white">⚙️ 설정</span> → Discord Webhook URL 입력 후, 전송 버튼을 누르면 연결된 디스코드 채널로 자동 전송됩니다.
            </p>
            <div className="p-2.5 bg-gray-900 rounded-lg border border-gray-700/50 space-y-1">
              <p className="text-gray-500 text-xs font-semibold">Discord 웹훅 만드는 법</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Discord 서버 → 전송할 채널 우클릭 → <span className="text-white">채널 편집</span> → <span className="text-white">연동</span> 탭 → <span className="text-white">웹후크 만들기</span> → <span className="text-white">웹후크 URL 복사</span> 후 설정에 붙여넣기 하시면 됩니다.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 직업 상태 */}
      <Section title="🎨 직업 상태 표시">
        <p className="text-gray-400 text-sm leading-relaxed">
          페이지 하단의 <span className="text-white font-semibold">직업 상태</span> 영역에서 현재 명단에 있는 직업들이 각 직업 고유 색상으로 표시됩니다.
        </p>
      </Section>

    </div>
  );
}

function MarketHelp() {
  return (
    <div className="text-gray-400 text-sm">
      {/* 여기에 공대 거래 도움말 내용을 추가하세요 */}
      <p>준비 중입니다.</p>
    </div>
  );
}

function AnalysisHelp() {
  return (
    <div className="text-gray-400 text-sm">
      {/* 여기에 공대 분석 도움말 내용을 추가하세요 */}
      <p>준비 중입니다.</p>
    </div>
  );
}

function AccountHelp() {
  return (
    <div className="text-gray-400 text-sm">
      {/* 여기에 회원 도움말 내용을 추가하세요 */}
      <p>준비 중입니다.</p>
    </div>
  );
}
