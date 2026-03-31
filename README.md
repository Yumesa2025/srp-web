# Smart Raid Planner (SRP)

World of Warcraft 레이드 공대장을 위한 올인원 관리 도구.
공대 명단 구성, 골드 정산, 전투 분석을 한 곳에서.

> **베타 서비스** · [healthy-feedback.com](https://healthy-feedback.com)

---

## 주요 기능

| 탭 | 설명 |
|----|------|
| **파티원 명단** | 애드온 데이터 붙여넣기 → 캐릭터 자동 조회 → 역할 드래그앤드롭 배치 → Discord 전송 |
| **공대거래** | 아이템/골드 장부 입력 → 거래 내역 파싱 → 1인당 분배금 자동 계산 → 회차별 저장 |
| **공대분석** | WarcraftLogs URL 입력 → DPS 그래프, 사망 분석, 방어 스킬 사용 현황, 소모품 분석 |
| **도움말** | 기능 안내 및 투어 튜토리얼 |

**애드온 필요**: [Smart Raid Plan 건전한 피드백](https://www.curseforge.com/wow/addons/smart-raid-plan)

---

## 기술 스택

- **Framework**: Next.js 16 (App Router) · TypeScript
- **Styling**: Tailwind CSS v4
- **Auth / DB**: Supabase SSR (`@supabase/ssr`)
- **Deployment**: Cloudflare Workers (OpenNext v1.7)
- **Analytics**: PostHog
- **AI**: Minimax API (공대분석 AI 요약)
- **External API**: Warcraft Logs v2 GraphQL · Blizzard Battle.net API

---

## 프로젝트 구조

```
app/
  page.tsx              # 메인 (탭 상태 통합)
  layout.tsx            # 루트 레이아웃
  components/
    MainTabs.tsx
    Header.tsx
    roster/             # 파티원 명단 탭
    market/             # 공대거래 탭
    raid-analysis/      # 공대분석 탭
    help/               # 도움말 탭
    tutorial/           # 웰컴 모달, 투어
    discord/            # Discord 웹훅 전송
    profile/            # 프로필 모달
    auth/               # 로그인 UI
  actions/              # Server Actions (auth, roster, profile 등)
  api/
    character/          # Blizzard 캐릭터 조회
    raid-analysis/      # 공대분석 통합 API
    ai/                 # Minimax AI (로그 분석)
    item/batch/         # 아이템 배치 조회
    logs/               # WCL 로그 조회
    wcl/                # WCL 타임라인
    discord/            # Discord 웹훅
    spell/              # 스펠 조회
  hooks/
    useTour.ts          # Driver.js 스팟라이트 투어
    useMarketStorage.ts # 공대거래 Supabase 저장
    useAnalytics.ts
  lib/
    raidUtils.ts
    tokenCache.ts       # WCL/Blizzard OAuth 토큰 캐시
  types/
  constants/
```

---

건전한피드백 길드 제공
