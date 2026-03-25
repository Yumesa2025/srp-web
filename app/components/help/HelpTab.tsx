'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

type HelpSection = 'roster' | 'market' | 'analysis' | 'account' | 'addon';

const TABS: { id: HelpSection; label: string }[] = [
  { id: 'addon',    label: '애드온'      },
  { id: 'roster',   label: '파티원 명단' },
  { id: 'market',   label: '공대 거래'   },
  { id: 'analysis', label: '공대 분석'   },
  { id: 'account',  label: '회원'        },
];

export default function HelpTab() {
  const [active, setActive] = useState<HelpSection>('addon');

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
      <Section title="탭 2 — 거래 장부 (Loot Ledger)">
        <p className="text-gray-400 text-xl leading-relaxed">
          공대 레이드에서 획득한 아이템의 낙찰자와 거래 골드를 기록하고 관리하는 기능입니다.
          공대장은 물론 일반 공대원도 쉽게 확인할 수 있도록 직관적인 UI로 구성되어 있습니다.
        </p>

        <div className="space-y-3">
          {/* 세션 관리 */}
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-2">세션 관리</p>
            <p className="text-gray-400 text-xl mb-2">레이드를 진행할 때마다 새 세션을 만들어 기록을 분리할 수 있습니다.</p>
            <ul className="space-y-1.5 text-gray-400 text-xl list-disc list-inside">
              <li>세션은 생성 시각(예: <Code>2026-03-25 15:40</Code>)을 기준으로 자동으로 이름이 붙습니다</li>
              <li>상단의 세션 버튼을 클릭하면 과거 세션 목록을 드롭다운으로 확인하고 전환할 수 있습니다</li>
              <li>필요 없는 세션은 삭제할 수 있으며, 삭제 전 확인 팝업이 표시됩니다</li>
              <li>같은 날 레이드를 여러 번 진행해도 세션을 분리해서 기록할 수 있습니다</li>
            </ul>
          </div>

          {/* 레이드 / 보스 선택 */}
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-2">레이드 / 보스 선택</p>
            <p className="text-gray-400 text-xl mb-2">현재 지원하는 레이드:</p>
            <ul className="space-y-1.5 text-gray-400 text-xl list-disc list-inside mb-2">
              <li>공허첨탑 (6보스)</li>
              <li>꿈의 균열 (1보스)</li>
              <li>쿠엘다나스 진격로 (2보스)</li>
              <li>낭만(기타) — 자유 슬롯 6개</li>
            </ul>
            <p className="text-gray-500 text-lg">레이드 탭 선택 후 보스 탭을 클릭해 아이템을 관리합니다. 보스 이름은 버튼에 마우스를 올리면 툴팁으로 확인할 수 있습니다.</p>
          </div>

          {/* 아이템 등록 */}
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-2">아이템 등록</p>
            <div className="space-y-2">
              <div>
                <p className="text-gray-300 text-xl font-semibold">방법 1 — 직접 드래그</p>
                <p className="text-gray-400 text-xl">가방에서 아이템을 꺼내 드롭존에 드래그하면 현재 선택된 보스 슬롯에 즉시 등록됩니다.</p>
              </div>
              <div>
                <p className="text-gray-300 text-xl font-semibold">방법 2 — 자동 루팅</p>
                <p className="text-gray-400 text-xl">보스를 처치하면 애드온이 자동으로 감지하고, 이후 룻 주사위 창이 열릴 때 해당 아이템을 자동으로 해당 보스 슬롯에 추가합니다. 자동 루팅은 체크박스로 켜고 끌 수 있습니다.</p>
              </div>
            </div>
          </div>

          {/* 낙찰자 · 골드 기록 */}
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-2">낙찰자 · 골드 기록</p>
            <p className="text-gray-400 text-xl mb-2">아이템이 등록되면 각 행에 두 가지를 입력할 수 있습니다:</p>
            <ul className="space-y-1.5 text-gray-400 text-xl list-disc list-inside">
              <li><span className="text-white font-semibold">낙찰자</span> — 버튼을 클릭하면 현재 공대 명단(명단 추출 탭 기준)이 드롭다운으로 표시되어 선택할 수 있습니다</li>
              <li><span className="text-white font-semibold">골드</span> — 거래 금액을 직접 숫자로 입력합니다</li>
            </ul>
          </div>

          {/* 내보내기 & 초기화 */}
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-2">내보내기</p>
            <ul className="space-y-1.5 text-gray-400 text-xl list-disc list-inside mb-2">
              <li><span className="text-white font-semibold">현재 넴 복사</span> — 현재 선택된 보스의 아이템만 복사</li>
              <li><span className="text-white font-semibold">현재 레이드 전체 복사</span> — 선택된 레이드의 모든 보스 아이템 복사</li>
            </ul>
            <p className="text-gray-500 text-lg">복사 형식: <Code>아이템ID;낙찰자;골드|아이템ID;낙찰자;골드|...</Code></p>
          </div>

          {/* 초기화 */}
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-2">초기화</p>
            <ul className="space-y-1.5 text-gray-400 text-xl list-disc list-inside">
              <li><span className="text-white font-semibold">현재 넴 초기화</span> — 현재 보스 슬롯의 아이템 목록만 삭제</li>
              <li><span className="text-white font-semibold">전체 초기화</span> — 현재 세션의 모든 레이드·보스 기록 삭제 (확인 팝업 표시)</li>
            </ul>
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
