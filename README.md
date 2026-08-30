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
- **인증**: 없음 — 로그인 없이 모든 기능 사용
- **저장소**: 브라우저 localStorage (서버 DB 없음)
- **Deployment**: Cloudflare Workers (OpenNext v1.20)
- **Analytics**: PostHog
- **External API**: Warcraft Logs v2 GraphQL · Blizzard Battle.net API

### 데이터는 어디에 저장되나

명단과 공대거래 기록은 **사용하는 브라우저에만** 저장되며 서버로 전송되지 않는다.
따라서 기기 간 동기화가 없고, 브라우저 데이터를 지우면 기록도 함께 사라진다.

### 로컬 실행

`.env.local`에 다음 4개만 있으면 된다. 예시는 `.dev.vars.example` 참고.

```
BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET   # 캐릭터 조회
WCL_CLIENT_ID / WCL_CLIENT_SECRET             # 공대분석
```

```bash
npm install
npm run dev
```

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
    settings/           # 설정 모달 (Discord 웹훅 등록)
  api/
    character/          # Blizzard 캐릭터 조회
    raid-analysis/      # 공대분석 통합 API (WCL)
    item/batch/         # 아이템 배치 조회
    discord/            # Discord 웹훅 전송
    spell/              # 스펠 조회
    logs/helpers.ts     # WCL GraphQL 헬퍼 (raid-analysis가 사용)
  hooks/
    useTour.ts          # Driver.js 스팟라이트 투어
    useLocalRosters.ts  # 명단 저장소
    useMarketStorage.ts # 공대거래 회차 저장
    useDiscordWebhook.ts
    useAnalytics.ts
  lib/
    localStore.ts       # 로컬 저장소 래퍼 (유일한 저장 진입점)
    defensiveStore.ts   # 방어 스킬 설정
    raidUtils.ts
    tokenCache.ts       # WCL/Blizzard OAuth 토큰 캐시
  types/
  constants/
docs/superpowers/specs/ # 설계 문서
```

---

건전한피드백 길드 제공
