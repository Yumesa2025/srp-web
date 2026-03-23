# CLAUDE.md — srp-web

## 프로젝트 개요

World of Warcraft 레이드 관리 도구. 공대 구성, 전술 편집, 클리닉 분석, 시장 정보를 제공하는 Next.js 웹앱.

- **프레임워크**: Next.js 16.1.6 (App Router), React 19, TypeScript
- **스타일링**: Tailwind CSS v4
- **백엔드/인증**: Supabase (SSR) — `@supabase/ssr` v0.9
- **배포**: Cloudflare Workers (OpenNext v1.7)
- **분석**: PostHog
- **차트**: Recharts
- **검증**: Zod v4

## 개발 명령어

```bash
npm run dev          # 로컬 개발 서버
npm run build        # Next.js 빌드
npm run lint         # ESLint 검사
npm run build:cf     # Cloudflare 빌드
npm run preview:cf   # Cloudflare 로컬 미리보기
npm run deploy:cf    # Cloudflare 배포
```

## 프로젝트 구조

```
app/
  page.tsx              # 메인 페이지 (공대 구성, 탭 전환) — 모든 탭 상태 통합 관리
  layout.tsx            # 루트 레이아웃 (Header, PostHog)
  components/
    Header.tsx          # 상단 헤더 (Server Component, Supabase 인증 확인)
    MainTabs.tsx        # 탭 네비게이션
    RaidZone.tsx        # 공대 구역 UI (드래그앤드롭 역할 배치)
    RosterManager.tsx   # 공대원 관리
    ControlPanel.tsx    # 공대원 입력 및 컨트롤 패널
    PlayerCard.tsx      # 개별 플레이어 카드
    PlayerCardSkeleton.tsx  # 로딩 스켈레톤
    ErrorBoundary.tsx   # 에러 바운더리 (각 탭을 감쌈)
    LazyImage.tsx       # 이미지 지연 로딩
    PlaceholderPanel.tsx  # 빈 패널 플레이스홀더
    auth/
      AuthClientUI.tsx  # 구글 로그인/로그아웃 버튼 (Client Component)
    analytics/
      PostHogProvider.tsx  # PostHog 프로바이더
    clinic/             # 클리닉 분석 탭
      ClinicAnalysisTab.tsx
      ClinicOverviewSection.tsx
      ClinicReportCard.tsx
      ClinicThroughputSection.tsx
      ClinicDeepAnalysisSection.tsx
      ClinicConsumablesSection.tsx
    tactics/            # 전술 편집 탭
      TacticEditorTab.tsx
      TacticSavePanel.tsx
    market/             # 레이드 마켓 탭
      RaidMarketTab.tsx
    roster/             # 로스터 탭 (분리된 컴포넌트)
      RosterTab.tsx
  actions/              # Server Actions
    auth.ts             # 인증 관련 서버 액션
    roster.ts           # 로스터 저장/불러오기/삭제 서버 액션
  api/
    ai/
      route.ts          # MRT 전술 AI 생성
      log-analysis/     # WCL 로그 AI 분석
      log-compare/      # 로그 비교 분석
    character/          # 캐릭터 조회 (Blizzard API)
    item/               # 아이템 조회
    logs/               # 전투 로그 (WCL API)
    spell/              # 스펠 조회 (배치 포함)
    wcl/                # Warcraft Logs 연동
  auth/
    callback/           # Supabase OAuth 콜백
    supabase/           # Supabase 인증 라우트
  lib/
    itemLookup.ts       # 아이템 검색
    krRealmResolver.ts  # 한국 서버 이름 해석
    spellLookup.ts      # 스펠 검색
    rateLimit.ts        # Rate limiting
  hooks/
    useRaidPlanner.ts   # guessRole, calcDamage 유틸 함수 (훅 자체는 미사용)
    useClinicState.ts   # 클리닉 분석 상태 관리
    useTacticStorage.ts # 전술 Supabase 저장/불러오기
    useAnalytics.ts     # PostHog 이벤트 추적
  types/
    index.ts            # 공통 타입 (PlayerData, RoleType, MainTab 등)
    clinic.ts           # 클리닉 관련 타입
    mrt.ts              # MRT(방어 쿨다운 타이머) 타입
  constants/
    defensiveSkills.ts  # 방어 스킬 상수
    sharedClasses.ts    # 공유 Tailwind 클래스 상수
  utils/
    supabase/
      client.ts         # Supabase 클라이언트 (브라우저)
      server.ts         # Supabase 클라이언트 (서버)
  styles/               # 추가 스타일
data/
  bossTimelines.ts      # 보스 타임라인 DB (BOSS_DATABASE, Difficulty)
```

## 주요 도메인 개념

- **WoW 클래스**: 전사, 성기사, 사냥꾼, 도적, 사제, 죽음의 기사, 주술사, 마법사, 흑마법사, 수도사, 드루이드, 악마사냥꾼, 기원사 (한국어명 사용)
- **역할(RoleType)**: TANK, HEALER, MELEE, RANGED, UNASSIGNED
- **MRT**: 방어 쿨다운 타이머 노트 (WeakAura 연동, MRTNode 타입)
- **WCL**: Warcraft Logs API 연동으로 전투 분석
- **Clinic**: 공대원 퍼포먼스 분석 (처치량, 소모품, 딥 분석)
- **Tactic Editor**: 보스 타임라인 기반 쿨다운 배치 + AI 전술 생성

## 코드 규칙

- Client Component는 `"use client"` 명시 (App Router 사용)
- Server Component는 기본 (Header 등)
- Server Actions는 `'use server'` 명시 (`app/actions/`)
- 경로 별칭: `@/app/...`
- WoW 클래스명, 역할명은 한국어로 처리 (guessRole에서 한국어 스펙명으로 역할 유추)
- Supabase 인증: SSR 방식 (`@supabase/ssr`) — Header는 서버에서 유저 확인, 클라이언트 훅은 `onAuthStateChange`
- 데이터 저장 패턴 (현재 불일치):
  - **로스터** → `app/actions/roster.ts` Server Actions 경유 (서버 검증 가능)
  - **전술** → `useTacticStorage.ts`에서 클라이언트가 Supabase 직접 호출 (RLS에 의존)
  - 통일 방향: 전술도 Server Actions로 옮기면 서버 검증 일관성 확보 가능 (현재는 대규모 리팩토링 필요하여 보류)

## 인프라 한계 및 개선 메모

- **Rate Limiter** (`app/lib/rateLimit.ts`): `globalThis` 기반 in-memory Map. 동일 isolate 내에서는 정상 동작하나, Cloudflare Workers 다중 isolate 환경에서 cross-isolate 공유 불가. 완전한 rate limiting이 필요하면 Cloudflare KV 또는 Durable Objects 도입 필요.
- **OAuth 토큰 캐시** (`app/lib/tokenCache.ts`): `globalThis` 기반으로 동일 isolate 내 요청 간 WCL/Blizzard 토큰 공유. 다중 isolate 시 각각 독립 캐시.
