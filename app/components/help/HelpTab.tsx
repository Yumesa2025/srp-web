'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

type HelpSection = 'roster' | 'market' | 'analysis' | 'account' | 'addon';

const TABS: { id: HelpSection; label: string }[] = [
  { id: 'roster',   label: '파티원 명단' },
  { id: 'market',   label: '공대 거래'   },
  { id: 'analysis', label: '공대 분석'   },
  { id: 'account',  label: '회원'        },
  { id: 'addon',    label: '애드온'      },
];

export default function HelpTab() {
  const [active, setActive] = useState<HelpSection>('roster');

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
        <h2 className="text-3xl font-bold text-white mb-1">도움말</h2>
        <p className="text-xl text-gray-500">SRP 사용 방법을 안내합니다.</p>
      </div>

      {/* 서브 탭 */}
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

      {/* 탭 내용 */}
      <div className="p-6 bg-gray-800/60 rounded-xl border border-gray-700 min-h-[400px]">
        {active === 'roster'   && <RosterHelp />}
        {active === 'market'   && <MarketHelp />}
        {active === 'analysis' && <AnalysisHelp />}
        {active === 'account'  && <AccountHelp />}
        {active === 'addon'    && <AddonHelp />}
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

function RosterHelp() {
  return (
    <div className="space-y-10">

      {/* 필수 애드온 */}
      <Section title="🧩 필수 애드온 — Smart Raid Plan">
        <p className="text-gray-400 text-xl leading-relaxed">
          이 웹사이트는 <span className="text-white font-semibold">Smart Raid Plan</span> 애드온과 함께 사용하도록 만들어졌습니다.
          CurseForge에서 무료로 설치할 수 있습니다.
        </p>
        <a
          href="https://www.curseforge.com/wow/addons/smart-raid-plan"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 bg-orange-700/30 hover:bg-orange-700/50 border border-orange-600/40 text-orange-300 text-xl font-bold rounded-xl transition-colors"
        >
          CurseForge에서 설치하기 ↗
        </a>
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

      {/* 명단 추출 */}
      <Section title="📋 공대 명단 추출">
        <p className="text-gray-400 text-xl">애드온의 <span className="text-white font-semibold">명단 추출 탭</span>에서 두 가지 방법으로 공대원 명단을 가져올 수 있습니다.</p>
        <div className="space-y-3">
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
        <div className="space-y-3">
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
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">명단 저장소</p>
            <p className="text-gray-400 text-xl">원하는 이름으로 현재 파티원 명단을 저장하고, 언제든 다시 불러올 수 있습니다.</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">구성 복사</p>
            <p className="text-gray-400 text-xl">현재 파티원의 모든 닉네임과 직업을 정리된 형태로 클립보드에 복사합니다.</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">Discord 전송</p>
            <p className="text-gray-400 text-xl mb-3">
              우상단 프로필 → <span className="text-white">⚙️ 설정</span> → Discord Webhook URL 입력 후, 전송 버튼을 누르면 연결된 디스코드 채널로 자동 전송됩니다.
            </p>
            <div className="p-3 bg-gray-900 rounded-lg border border-gray-700/50 space-y-1">
              <p className="text-gray-500 text-lg font-semibold">Discord 웹훅 만드는 법</p>
              <p className="text-gray-400 text-lg leading-relaxed">
                Discord 서버 → 전송할 채널 우클릭 → <span className="text-white">채널 편집</span> → <span className="text-white">연동</span> 탭 → <span className="text-white">웹후크 만들기</span> → <span className="text-white">웹후크 URL 복사</span> 후 설정에 붙여넣기 하시면 됩니다.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 직업 상태 */}
      <Section title="🎨 직업 상태 표시">
        <p className="text-gray-400 text-xl leading-relaxed">
          페이지 하단의 <span className="text-white font-semibold">직업 상태</span> 영역에서 현재 명단에 있는 직업들이 각 직업 고유 색상으로 표시됩니다.
        </p>
      </Section>

    </div>
  );
}

function MarketHelp() {
  return (
    <div className="text-gray-400 text-xl">
      <p>준비 중입니다.</p>
    </div>
  );
}

function AnalysisHelp() {
  return (
    <div className="text-gray-400 text-xl">
      <p>준비 중입니다.</p>
    </div>
  );
}

function AccountHelp() {
  return (
    <div className="text-gray-400 text-xl">
      <p>준비 중입니다.</p>
    </div>
  );
}

function AddonHelp() {
  return (
    <div className="space-y-10">

      {/* 소개 */}
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

      {/* 탭 1 — 명단 추출 */}
      <Section title="탭 1 — 명단 추출">
        <p className="text-gray-400 text-xl leading-relaxed">
          공격대 또는 파티에 있는 모든 공대원의 <span className="text-white font-semibold">캐릭터명-서버명</span>을 한 번에 추출해서 복사할 수 있습니다.
        </p>
        <div className="space-y-3">
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">공대 명단 추출</p>
            <p className="text-gray-400 text-xl">현재 그룹의 인원을 실시간으로 가져옵니다.</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">달력에서 추출</p>
            <p className="text-gray-400 text-xl">
              WoW 달력 일정을 스캔해서 초대된 인원 목록 중 원하는 일정을 선택해 가져옵니다.
              서버명이 없는 캐릭터는 현재 서버로 자동 보완됩니다.
            </p>
          </div>
        </div>
      </Section>

      {/* 탭 2 — 거래 장부 */}
      <Section title="탭 2 — 거래 장부">
        <p className="text-gray-400 text-xl leading-relaxed">
          레이드에서 떨어진 아이템의 낙찰자와 골드를 보스별로 기록하는 장부입니다.
        </p>

        <div className="space-y-3">
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-2">세션 시스템</p>
            <ul className="space-y-1.5 text-gray-400 text-xl list-disc list-inside">
              <li><span className="text-white font-semibold">새 세션 시작</span> 버튼으로 날짜+시간 기준 새 세션 생성</li>
              <li>같은 날 두 번 레이드해도 별개 세션으로 분리됨</li>
              <li>드롭다운으로 과거 세션 조회 및 삭제 가능</li>
            </ul>
          </div>

          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-2">레이드 / 보스 탭</p>
            <ul className="space-y-1.5 text-gray-400 text-xl list-disc list-inside">
              <li>공허첨탑 (6보스)</li>
              <li>꿈의 균열 (1보스)</li>
              <li>쿠엘다나스 진격로 (2보스)</li>
              <li>낭만기타 (6슬롯)</li>
            </ul>
            <p className="text-gray-500 text-lg mt-2">보스 탭에 마우스를 올리면 툴팁으로 보스 이름이 표시됩니다.</p>
          </div>

          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-2">아이템 관리</p>
            <ul className="space-y-1.5 text-gray-400 text-xl list-disc list-inside">
              <li>가방에서 드래그 → 드롭존에 놓으면 현재 탭에 추가</li>
              <li><span className="text-white font-semibold">자동 루팅</span> 체크 시, 보스 처치 후 주사위 아이템 자동 기록</li>
              <li>각 아이템에 낙찰자(공대원 드롭다운) + 골드 입력</li>
              <li>X 버튼으로 개별 아이템 삭제 (확인 팝업)</li>
            </ul>
          </div>

          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-2">내보내기</p>
            <p className="text-gray-400 text-xl">
              현재 보스 또는 현재 레이드 전체를 <Code>아이템ID;낙찰자;골드</Code> 형식으로 복사합니다.
            </p>
          </div>
        </div>
      </Section>

      {/* 명령어 */}
      <Section title="⌨️ 명령어">
        <div className="overflow-hidden rounded-xl border border-gray-700">
          <table className="w-full text-xl">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="px-5 py-3 text-left text-gray-400 font-semibold">명령어</th>
                <th className="px-5 py-3 text-left text-gray-400 font-semibold">동작</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cmd: '/srp 또는 /공대', desc: '명단 탭으로 열기' },
                { cmd: '/거래',           desc: '거래 장부 탭으로 열기' },
              ].map(({ cmd, desc }) => (
                <tr key={cmd} className="border-b border-gray-700/40 last:border-0">
                  <td className="px-5 py-3"><Code>{cmd}</Code></td>
                  <td className="px-5 py-3 text-gray-300">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

    </div>
  );
}
