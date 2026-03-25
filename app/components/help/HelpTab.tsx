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
    <div className="space-y-10">

      {/* 개요 */}
      <Section title="💰 공대 거래란?">
        <p className="text-gray-400 text-xl leading-relaxed">
          애드온의 거래 장부에서 내보낸 데이터를 웹에 붙여넣으면 자동으로 파싱하고,
          1인당 분배금 계산 · 회차 저장 · 누적 통계까지 한 번에 처리할 수 있습니다.
        </p>
      </Section>

      {/* 장부 불러오기 */}
      <Section title="📥 장부 불러오기 & 정산 요약 복사">
        <div className="space-y-3">
          <Step num={1}>
            애드온 거래 장부에서 <span className="text-white font-semibold">내보내기</span>로 복사한 데이터를 상단 입력란에 붙여넣기 합니다.
            <br/>
            <span className="text-gray-500 text-lg">형식: <Code>아이템ID;낙찰자;골드|아이템ID;낙찰자;골드|...</Code></span>
          </Step>
          <Step num={2}>
            <span className="text-white font-semibold">장부 불러오기 📥</span> 버튼을 누르면 아이템 목록과 분배 계산기가 자동으로 채워집니다.
            아이템 아이콘과 이름도 자동으로 조회됩니다.
          </Step>
          <Step num={3}>
            <span className="text-white font-semibold">정산 요약 복사 📋</span> 버튼을 누르면 총 모금액 · 공대비 · 1인당 분배금 요약을 클립보드에 복사합니다.
            공대원에게 바로 붙여넣어 공유할 수 있습니다.
          </Step>
        </div>
      </Section>

      {/* 거래 내역 */}
      <Section title="📦 거래 내역">
        <p className="text-gray-400 text-xl leading-relaxed">
          장부를 불러오면 아이템 목록이 표시됩니다.
        </p>
        <div className="space-y-2">
          {[
            { label: "아이템 아이콘 · 이름", desc: "Wowhead에서 자동 조회되며, 이름 클릭 시 Wowhead 아이템 페이지로 이동합니다." },
            { label: "낙찰자", desc: "애드온에서 입력한 낙찰자 이름이 표시됩니다." },
            { label: "낙찰 골드", desc: "거래된 골드 금액이 표시됩니다." },
          ].map(({ label, desc }) => (
            <div key={label} className="flex gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700/60">
              <span className="text-white font-semibold text-xl shrink-0">{label}</span>
              <span className="text-gray-400 text-xl">— {desc}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 분배 계산기 */}
      <Section title="🧮 분배 계산기">
        <p className="text-gray-400 text-xl leading-relaxed">
          세 가지 값을 입력하면 1인당 분배금이 자동으로 계산됩니다.
        </p>
        <div className="overflow-hidden rounded-xl border border-gray-700">
          <table className="w-full text-xl">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="px-5 py-3 text-left text-gray-400 font-semibold">항목</th>
                <th className="px-5 py-3 text-left text-gray-400 font-semibold">설명</th>
              </tr>
            </thead>
            <tbody>
              {[
                { item: "공대원 수", desc: "이번 레이드의 분배 대상 인원 수 (기본값 20)" },
                { item: "공대비(G)", desc: "레이드 운영비용으로 차감할 골드 (수리비 등)" },
                { item: "공대 추가금(G)", desc: "공대장이 추가로 넣은 골드 (총 모금액에 합산)" },
                { item: "총 모금액", desc: "모든 낙찰 골드의 합계" },
                { item: "분배 대상", desc: "총 모금액 + 추가금 − 공대비" },
                { item: "1인당 분배금", desc: "분배 대상을 공대원 수로 나눈 최종 금액" },
                { item: "분배 잔액", desc: "나누고 남은 나머지 골드" },
              ].map(({ item, desc }) => (
                <tr key={item} className="border-b border-gray-700/40 last:border-0">
                  <td className="px-5 py-3 text-white font-semibold whitespace-nowrap">{item}</td>
                  <td className="px-5 py-3 text-gray-400">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 이 회차 저장하기 */}
      <Section title="💾 이 회차 저장하기">
        <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl mb-3">
          <p className="text-yellow-400 text-lg font-semibold">🔒 로그인 후 이용 가능</p>
        </div>
        <p className="text-gray-400 text-xl leading-relaxed">
          장부를 불러온 뒤 하단의 <span className="text-white font-semibold">이 회차 저장하기</span> 패널에서 원하는 이름으로 저장할 수 있습니다.
          저장하면 누적 기록에 자동으로 추가됩니다.
        </p>
      </Section>

      {/* Discord 전송 */}
      <Section title="💬 Discord 전송">
        <p className="text-gray-400 text-xl leading-relaxed mb-3">
          장부를 불러오면 <span className="text-white font-semibold">Discord 전송</span> 버튼이 나타납니다.
          클릭하면 정산 요약(총 모금액 · 공대비 · 1인당 분배금 · 아이템 목록)을 연결된 디스코드 채널로 전송합니다.
        </p>
        <div className="p-3 bg-gray-900 rounded-lg border border-gray-700/50">
          <p className="text-gray-500 text-lg font-semibold mb-1">Discord 웹훅 연결 방법</p>
          <p className="text-gray-400 text-lg leading-relaxed">
            우상단 프로필 → <span className="text-white">⚙️ 설정</span> → Discord Webhook URL 입력.
            웹훅 URL은 Discord 서버 → 채널 편집 → <span className="text-white">연동</span> 탭 → <span className="text-white">웹후크 만들기</span> → URL 복사로 얻을 수 있습니다.
          </p>
        </div>
      </Section>

      {/* 누적 기록 */}
      <Section title="📊 누적 기록">
        <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl mb-3">
          <p className="text-yellow-400 text-lg font-semibold">🔒 로그인 후 이용 가능</p>
        </div>
        <p className="text-gray-400 text-xl leading-relaxed mb-4">
          저장한 회차들을 모아 세 가지 탭으로 확인할 수 있습니다.
        </p>
        <div className="space-y-3">
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">📋 회차 목록</p>
            <p className="text-gray-400 text-xl">
              저장된 모든 회차를 카드 형식으로 표시합니다.
              각 회차의 총 모금액 · 1인당 분배금 · 인원 · 공대비를 한눈에 볼 수 있습니다.
              <span className="text-white font-semibold"> 불러오기</span> 버튼으로 해당 회차 데이터를 상단 입력란에 다시 불러올 수 있고,
              필요 없는 회차는 삭제할 수 있습니다.
            </p>
          </div>
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">📦 아이템 통계</p>
            <p className="text-gray-400 text-xl">
              모든 회차의 아이템 기록을 집계해 등장 횟수 · 평균 낙찰금 · 최고 낙찰금 · 총 낙찰금을 표시합니다.
              등장 횟수 / 평균 낙찰금 / 총 낙찰금 기준으로 정렬할 수 있습니다.
            </p>
          </div>
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">📈 골드 추이</p>
            <p className="text-gray-400 text-xl">
              회차별 1인당 분배금을 바 차트로 비교합니다.
              가장 높은 회차는 금색으로 강조 표시됩니다.
            </p>
          </div>
        </div>
      </Section>

    </div>
  );
}

function AnalysisHelp() {
  return (
    <div className="space-y-10">

      <Section title="🔍 공대 분석이란?">
        <p className="text-gray-400 text-xl leading-relaxed">
          <span className="text-white font-semibold">WarcraftLogs(WCL)</span> 리포트를 연동해 전투를 자동으로 분석합니다.
          사망 원인, 소모품 사용 여부, 딜/힐 그래프, 생존기 타이밍을 한눈에 확인할 수 있습니다.
        </p>
        <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-xl">
          <p className="text-yellow-400 text-lg font-semibold">🔒 로그인 후 이용 가능</p>
        </div>
      </Section>

      <Section title="📥 리포트 불러오기">
        <div className="space-y-3">
          <Step num={1}>
            <a href="https://www.warcraftlogs.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">warcraftlogs.com</a>에서 공대 로그를 기록한 후, 리포트 URL을 복사합니다.
          </Step>
          <Step num={2}>
            상단 입력란에 <span className="text-white font-semibold">URL 또는 리포트 코드</span>를 붙여넣고 <span className="text-white font-semibold">불러오기</span> 버튼을 누릅니다.
          </Step>
          <Step num={3}>
            전투 목록이 표시되면 분석할 전투를 클릭합니다. 각 카드에는 <span className="text-white font-semibold">난이도</span>(일반/영웅/신화), <span className="text-white font-semibold">전투 시간</span>, <span className="text-white font-semibold">시작 시각</span>이 표시됩니다.
          </Step>
        </div>
      </Section>

      <Section title="💀 최초 사망 분석">
        <p className="text-gray-400 text-xl leading-relaxed mb-3">
          전투에서 가장 먼저 사망한 <span className="text-white font-semibold">상위 3명</span>을 분석합니다.
        </p>
        <div className="space-y-2">
          {[
            { label: '사망 시각',         desc: '전투 시작 기준 몇 분 몇 초에 사망했는지 표시됩니다.' },
            { label: '사망 원인',         desc: 'Wowhead 한국어 데이터 기준으로 사망 원인 스킬명과 아이콘이 표시됩니다.' },
            { label: '직전 5초 받은 피해', desc: '사망 직전 5초간 받은 총 피해량과 원인별 상위 피해를 확인할 수 있습니다.' },
            { label: '생존기 사용',       desc: '사망 전에 사용한 생존기 목록이 표시됩니다. 아무것도 없으면 "사용 없음"으로 표시됩니다.' },
            { label: 'HP',               desc: '사망 직전 남아있던 HP 비율이 표시됩니다.' },
          ].map(({ label, desc }) => (
            <div key={label} className="flex gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700/60">
              <span className="text-white font-semibold text-xl shrink-0">{label}</span>
              <span className="text-gray-400 text-xl">— {desc}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="💊 소모품 체크">
        <p className="text-gray-400 text-xl leading-relaxed mb-3">
          공대원 전원의 소모품 사용 여부를 한 번에 확인합니다.
          사용하지 않은 항목은 빨간 ❌로 강조됩니다.
        </p>
        <div className="flex flex-wrap gap-3">
          {['공격물약', '생명석', '치유물약', '증강의 룬'].map(item => (
            <span key={item} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-xl">{item}</span>
          ))}
        </div>
        <p className="text-gray-500 text-lg mt-2">헤더의 ❌ 숫자로 미사용 인원 수를 빠르게 파악할 수 있습니다.</p>
      </Section>

      <Section title="📊 딜/힐 그래프">
        <p className="text-gray-400 text-xl leading-relaxed mb-3">
          공대원 각각의 <span className="text-white font-semibold">DPS / HPS 시간대별 그래프</span>를 확인할 수 있습니다.
        </p>
        <div className="space-y-2">
          {[
            { label: 'DPS / HPS 탭',    desc: '플레이어 카드 상단 탭으로 딜 그래프와 힐 그래프를 전환할 수 있습니다.' },
            { label: '블러드러스트 구간', desc: '영웅의 외침 등 블러드러스트가 발동된 시간대가 주황색 음영으로 표시됩니다.' },
            { label: '파워 인퓨전',      desc: '사제의 파워 인퓨전을 받은 시간대가 별도 표시됩니다.' },
            { label: '평균 / 최고 DPS',  desc: '전체 평균과 블러드러스트 구간 평균을 각각 확인할 수 있습니다.' },
          ].map(({ label, desc }) => (
            <div key={label} className="flex gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700/60">
              <span className="text-white font-semibold text-xl shrink-0">{label}</span>
              <span className="text-gray-400 text-xl">— {desc}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="🛡️ 생존기 사용 현황">
        <p className="text-gray-400 text-xl leading-relaxed">
          공대원별로 전투 중 생존기를 <span className="text-white font-semibold">몇 회, 몇 분 몇 초에</span> 사용했는지 확인할 수 있습니다.
          스킬 아이콘과 사용 시각이 함께 표시됩니다.
          감지 대상 생존기는 탱커 · 힐러 · 딜러의 주요 방어 스킬 수십 종이 자동 포함됩니다.
        </p>
      </Section>

    </div>
  );
}

function AccountHelp() {
  return (
    <div className="space-y-10">

      <Section title="👤 회원이란?">
        <p className="text-gray-400 text-xl leading-relaxed">
          SRP는 Google 계정 또는 이메일로 로그인할 수 있습니다.
          로그인하면 파티원 명단 저장, 공대 거래 기록, 분석 기능 이용이 가능합니다.
        </p>
      </Section>

      <Section title="🔑 로그인 / 회원가입">
        <div className="space-y-3">
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">Google로 계속하기</p>
            <p className="text-gray-400 text-xl">우상단 로그인 버튼 → Google로 계속하기를 누르면 구글 계정으로 즉시 로그인됩니다.</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">이메일 로그인</p>
            <p className="text-gray-400 text-xl">이메일과 비밀번호로 회원가입 후 로그인할 수 있습니다.</p>
          </div>
        </div>
      </Section>

      <Section title="👤 프로필">
        <p className="text-gray-400 text-xl leading-relaxed mb-3">
          우상단의 프로필 이름을 클릭하면 프로필 모달이 열립니다.
          모달 안에 3개의 탭이 있습니다.
        </p>
        <div className="space-y-3">
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">📋 파티원 명단</p>
            <p className="text-gray-400 text-xl">저장한 파티원 명단 목록을 확인하고 삭제할 수 있습니다.</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">💰 공대 거래</p>
            <p className="text-gray-400 text-xl">저장한 공대 거래 회차 목록과 1인당 분배금을 확인할 수 있습니다.</p>
          </div>
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700/60">
            <p className="text-white text-xl font-semibold mb-1">⚙️ 설정</p>
            <p className="text-gray-400 text-xl">Discord Webhook URL 등록, 닉네임 변경, 회원 탈퇴를 할 수 있습니다.</p>
          </div>
        </div>
      </Section>

      <Section title="✏️ 닉네임 변경">
        <div className="space-y-2">
          <Step num={1}>프로필 모달 상단 닉네임 옆 <span className="text-white font-semibold">닉네임 변경</span> 버튼 클릭</Step>
          <Step num={2}>원하는 닉네임 입력 후 <span className="text-white font-semibold">저장</span> 또는 Enter</Step>
          <Step num={3}>우상단 헤더에 즉시 반영됩니다</Step>
        </div>
      </Section>

      <Section title="🚪 회원 탈퇴">
        <p className="text-gray-400 text-xl leading-relaxed mb-3">
          프로필 모달 → <span className="text-white font-semibold">⚙️ 설정</span> 탭 맨 아래 <span className="text-white font-semibold">위험 구역</span>에서 탈퇴할 수 있습니다.
        </p>
        <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-xl">
          <p className="text-red-400 text-xl font-semibold">⚠️ 주의</p>
          <p className="text-gray-400 text-xl mt-1">
            탈퇴 시 파티원 명단, 공대 거래 기록 등 모든 데이터가 <span className="text-red-400 font-bold">영구 삭제</span>되며 복구할 수 없습니다.
            탈퇴 버튼 → 탈퇴 확인 버튼, 2번 눌러야 진행됩니다.
          </p>
        </div>
      </Section>

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
