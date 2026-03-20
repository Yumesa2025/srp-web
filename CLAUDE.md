# CLAUDE.md — srp-web

## 프로젝트 개요

World of Warcraft 레이드 관리 도구. 공대 구성, 전술 편집, 클리닉 분석, 시장 정보를 제공하는 Next.js 웹앱.

- **프레임워크**: Next.js 16 (App Router), React 19, TypeScript
- **스타일링**: Tailwind CSS v4
- **백엔드/인증**: Supabase (SSR)
- **배포**: Cloudflare Workers (OpenNext)
- **분석**: PostHog
- **차트**: Recharts

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
  page.tsx              # 메인 페이지 (공대 구성, 탭 전환)
  layout.tsx            # 루트 레이아웃 (Header, PostHog)
  components/
    Header.tsx          # 상단 헤더 (구글 로그인 포함)
    MainTabs.tsx        # 탭 네비게이션
    RaidZone.tsx        # 공대 구역 UI
    RosterManager.tsx   # 공대원 관리
    clinic/             # 클리닉 분석 탭
    tactics/            # 전술 편집 탭
    market/             # 레이드 마켓 탭
    analytics/          # PostHog 프로바이더
  api/
    ai/                 # AI 관련 API 라우트
    character/          # 캐릭터 조회
    item/               # 아이템 조회
    logs/               # 전투 로그
    spell/              # 스펠 조회
    wcl/                # Warcraft Logs 연동
  lib/
    itemLookup.ts       # 아이템 검색
    krRealmResolver.ts  # 한국 서버 이름 해석
    spellLookup.ts      # 스펠 검색
  hooks/
    useRaidPlanner.ts   # 공대 계획 훅
  types/
    index.ts            # 공통 타입 (PlayerData, RoleType, MainTab 등)
    clinic.ts           # 클리닉 관련 타입
    mrt.ts              # MRT(방어 쿨다운 타이머) 타입
  constants/
    defensiveSkills.ts  # 방어 스킬 상수
data/
  bossTimelines.ts      # 보스 타임라인 DB (BOSS_DATABASE, Difficulty)
```

## 주요 도메인 개념

- **WoW 클래스**: 전사, 성기사, 사냥꾼, 도적, 사제, 죽음의 기사, 주술사, 마법사, 흑마법사, 수도사, 드루이드, 악마사냥꾼, 기원사 (한국어명 사용)
- **역할(RoleType)**: 탱커, 힐러, 딜러
- **MRT**: 방어 쿨다운 타이머 노트 (WeakAura 연동)
- **WCL**: Warcraft Logs API 연동으로 전투 분석
- **Clinic**: 공대원 퍼포먼스 분석 (처치량, 소모품, 딥 분석)

## 코드 규칙

- 컴포넌트는 `"use client"` 명시 (App Router 사용)
- 경로 별칭: `@/app/...`
- WoW 클래스명, 역할명은 한국어로 처리
- Supabase 인증은 SSR 방식 (`@supabase/ssr`)
