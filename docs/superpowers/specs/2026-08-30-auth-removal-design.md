# 인증 제거 및 로컬 저장 전환 설계

- 작성일: 2026-08-30
- 대상: srp-web (Smart Raid Planner)
- 상태: 승인됨

## 배경

2026-04-10 이후 약 4개월 반 동안 방치되면서 Supabase 프로젝트(`statwdxwinrplfmfzknd`)가
비활성(INACTIVE) 상태로 전환됐다. 호스트 DNS까지 사라져 `NXDOMAIN`이 반환된다.

문제는 인증 실패가 특정 기능에 국한되지 않는다는 점이다. API 라우트 8개가 모두
핸들러 첫머리에서 `supabase.auth.getUser()`를 호출하고 사용자가 없으면 401을
반환하므로, Supabase가 죽은 지금은 앱의 모든 기능이 막혀 있다.

외부 API 자격증명은 멀쩡하다. 실제 호출로 확인한 결과 WCL OAuth, 블리자드 OAuth,
Minimax 모두 200을 반환한다. 죽은 것은 Supabase 하나뿐이다.

## 목표

로그인 개념을 앱에서 완전히 제거하고, 모든 기능을 비로그인 상태로 사용 가능하게 한다.
저장 데이터는 브라우저 로컬 저장소로 옮긴다. 함께 누적된 정리 항목도 이번에 처리한다.

## 비목표

- 기존 Supabase 데이터 마이그레이션. 프로젝트는 INACTIVE로 남겨두므로 데이터는
  삭제되지 않고, 나중에 restore하면 복구할 수 있다.
- 분산 rate limiting(KV / Durable Objects) 도입.
- 메이저 버전 의존성 업그레이드.
- 테스트 프레임워크 도입.

## 결정 사항

### 저장 위치: 브라우저 로컬 저장 + Supabase 완전 제거

대안으로 익명 로그인(`signInAnonymously`)과 저장 기능 자체 제거를 검토했다.

익명 로그인은 코드 변경이 가장 적지만 Supabase 프로젝트 복구가 전제이고,
무료 티어가 다시 정지되면 같은 장애가 재발한다. 익명 세션을 잃으면 데이터에
접근할 복구 수단도 없다.

저장 기능 제거는 가장 단순하지만 사용자가 실제로 쓰던 기능을 없앤다.

로컬 저장을 택한다. Supabase 패키지·환경변수·정지된 프로젝트 문제가 한꺼번에
사라지고 배포가 단순해진다. 기기 간 동기화 상실과 브라우저 데이터 삭제 시 소실이
비용이지만, 개인 도구 성격상 수용 가능하다.

### 저장 계층 구조: 단일 래퍼 + 기능별 훅

각 훅이 `localStorage`를 직접 호출하는 방식은 처리 방식이 갈라진다. 실제로
`useTour.ts:120`은 `JSON.parse` 실패를 처리하지 않아 저장값이 손상되면 앱이 깨진다.
IndexedDB는 이 데이터 규모에 과하다.

`app/lib/localStore.ts` 하나가 직렬화, 스키마 버전, SSR 가드, 파싱 실패 폴백을
전담하고 기능별 훅은 그 위에 얇게 얹는다.

### 죽은 코드 삭제

`app/components/clinic/` 하위 6개 컴포넌트와 `useClinicState.ts`는 어디서도
import되지 않는다. 그리고 이 죽은 코드가 AI 라우트의 유일한 호출자다.

로그인을 제거하면 401 방어막이 사라지는데, 유료 API인 Minimax를 호출하는 AI
라우트 3개가 무인증으로 공개된다. Workers의 in-memory rate limiter는 isolate 간
공유가 안 되는 best-effort라 실질 방어가 약하다. 해당 라우트가 전부 죽은 코드이므로
삭제하면 이 위험이 원천 차단된다.

호출자가 없는 라우트는 6개다: `/api/ai` 3개, `/api/wcl` 2개, `/api/logs`.

## 현재 API 표면

UI에서 실제로 호출되는 라우트는 5개다.

| 라우트 | 호출처 | 현재 인증 | 외부 의존 |
|---|---|---|---|
| `/api/character` | `app/page.tsx:117` | 없음 | Blizzard, WCL |
| `/api/item/batch` | `RaidMarketTab.tsx:105` | 없음 | WCL |
| `/api/spell` | `DefensiveSettingsModal.tsx:55` | 없음 | WCL |
| `/api/raid-analysis` | `RaidAnalysisTab.tsx:64,83` | 401 | WCL |
| `/api/discord` | `RaidMarketTab.tsx:244`, `RosterTab.tsx:186` | 401 | Discord Webhook |

rate limit은 이미 IP 기준(`checkRateLimit(getClientIp(request), ...)`)이라
로그인을 제거해도 그대로 동작한다.

## 아키텍처

`middleware.ts`가 없어 전역 인증 게이트를 손댈 필요가 없다. 인증은 라우트와
액션마다 개별로 박혀 있어 제거가 국소적이다.

```
[변경 전]
  Client -> Server Action -> supabase.auth.getUser() -> RLS -> Postgres
  Client -> API Route     -> 401 게이트 -> 외부 API

[변경 후]
  Client -> localStore.ts -> localStorage          (명단, 회차, 설정, 웹훅)
  Client -> API Route     -> IP rate limit -> 외부 API
```

Server Actions 5개는 모두 사라지고 저장은 클라이언트에서 완결된다.

## 변경 목록

### 제거

```
app/actions/{auth,profile,roster,discord,defensiveSettings}.ts
app/auth/callback/route.ts
app/components/auth/AuthClientUI.tsx        (250줄)
app/components/profile/ProfileModal.tsx     (458줄)
app/utils/supabase/{client,server}.ts
app/lib/passwordPolicy.ts
app/types/profile.ts
app/components/clinic/*                     (6개)
app/hooks/useClinicState.ts
app/types/clinic.ts
app/api/ai/{route,log-analysis/route,log-compare/route}.ts
app/api/wcl/{route,timeline/route}.ts
app/api/logs/route.ts
의존성: @supabase/ssr, @supabase/supabase-js
```

`app/api/logs/helpers.ts`는 삭제하지 않는다. `app/api/raid-analysis/route.ts:6`이
`fetchWclGraphQL`, `fetchPagedEvents`와 WCL 노드 타입들을 여기서 가져온다.
따라서 `app/api/logs/` 디렉터리는 남고 그 안의 `route.ts`만 사라진다.

### 신규

| 파일 | 책임 |
|---|---|
| `app/lib/localStore.ts` | 스키마 버전, SSR 가드, 파싱 실패 폴백, 쓰기 실패 신호 |
| `app/hooks/useLocalRosters.ts` | 명단 저장/불러오기/삭제 |
| `app/hooks/useDefensiveSettings.ts` | 방어 설정 읽기/쓰기/초기화 |
| `app/hooks/useDiscordWebhook.ts` | 웹훅 URL 읽기/쓰기 |
| `app/components/settings/SettingsModal.tsx` | Header에서 여는 설정 모달 |

### 개조

- `Header.tsx` — Supabase 호출 제거. `AuthClientUI` 자리에 설정 버튼.
- `DiscordWebhookSettings` — `ProfileModal:409`에서 떼어내 `SettingsModal`로 이설.
  ProfileModal은 로그인해야 열리므로 그대로 두면 웹훅을 설정할 방법이 사라진다.
- `RosterManager.tsx` — 로스터 Server Action 대신 `useLocalRosters` 사용.
- `useMarketStorage.ts` — Supabase 쿼리를 localStore로 교체. `isLoggedIn` 제거.
- `RosterTab.tsx` — `isLoggedIn` 분기(`:145`, `:182`)와 안내 문구 제거.
- `DefensiveSettingsModal.tsx` — Server Action 대신 `useDefensiveSettings` 사용.
- `useTutorialFirstVisit.ts` — `profiles.tutorial_completed` 조회 제거, localStorage 단독.
- `/api/discord` — 웹훅 URL을 DB가 아닌 요청 body로 받는다.
  `https://discord.com/api/webhooks/` 접두사 검증은 유지한다.
- 남는 라우트 — `getUser()`/401 블록만 삭제하고 `checkRateLimit`은 유지.

## 데이터 스키마

단일 네임스페이스에 버전 필드를 함께 저장한다.

```
srp:v1:rosters            RosterRecord[]      (id, name, content, createdAt)
srp:v1:raidSessions       RaidSession[]       (user_id 제거)
srp:v1:raidItems          RaidItemRecord[]    (user_id 제거)
srp:v1:defensiveSettings  Record<string, DefensiveEntry[]>
srp:v1:discordWebhookUrl  string
```

`id`는 DB가 주던 UUID 대신 `crypto.randomUUID()`로 생성한다.

`defensiveSettings.ts:9`의 `migrateSettings`가 하던 구형식 변환(`string[]` →
`DefensiveEntry[]`)은 localStore의 버전 처리로 옮겨 유지한다. 버전이 맞지 않으면
변환하거나 기본값으로 떨어뜨린다.

## 에러 처리

**SSR과 하이드레이션.** `localStorage`는 서버에 없다. 모든 읽기는 `useEffect`
이후에 수행하고 초기 상태는 빈 값으로 두어 하이드레이션 불일치를 피한다.

**파싱 실패와 용량 초과.** `localStore`가 `try/catch`로 감싸 기본값을 반환한다.
쓰기 실패(`QuotaExceededError`)는 호출자에게 결과로 알려 사용자에게 표시한다.
현재 `useTour.ts`처럼 조용히 throw하지 않는다.

**API 라우트.** 401이 사라진 자리에 rate limit 429가 유일한 방어선이다. 남는 5개는
모두 무료 API(WCL, Blizzard)를 호출하므로 비용 사고 위험은 낮다. Workers 다중
isolate에서 best-effort라는 한계는 그대로이며 문서에 남긴다.

## 함께 정리할 항목

1. `WelcomeModal.tsx:30` 이스케이프 에러 2건 수정.
2. `raid-analysis/` `<img>` 경고 7건. WoW 아이콘 CDN 이미지이고 Workers 배포라
   `next/image` 최적화 이득이 적다. 파일 단위 eslint-disable로 의도를 명시한다.
3. `tokenCache.ts` 미커밋 리팩터를 독립 커밋으로 분리. (완료: `bec68c2`)
4. `.env.local` 정리. `Mg886` 잔여 줄과 쓰지 않게 된 `MINIMAX_API_KEY`,
   `OPENAI_API_KEY`, `SUPABASE_*` 제거. 최종적으로 `BLIZZARD_*`와 `WCL_*` 4개만 남는다.
5. 의존성을 같은 메이저 안에서 갱신. `typescript` 7, `eslint` 10, `@types/node` 26
   메이저 점프는 보류한다. 이번 변경과 섞이면 원인 분리가 안 된다. Supabase 두
   패키지는 업그레이드 대신 삭제되므로 가장 큰 격차가 저절로 해소된다.
6. `CLAUDE.md`의 인증 방식, DB 스키마, 데이터 저장 패턴 섹션 갱신.

## 검증

테스트 프레임워크가 없으므로 새로 도입하지 않고 아래로 확인한다.

- `npx tsc --noEmit` 에러 0. 현재도 0이므로 회귀 감지에 유효하다.
- `npm run lint` 에러 0, 경고 0.
- `grep -rn "supabase\|getUser\|로그인" app/` 잔여 0.
- `npm run build` 성공.
- `npm run dev` 수동 확인: 명단 저장·불러오기·삭제, 공대거래 회차 저장 후 새로고침
  유지, 공대분석 WCL 조회, Discord 전송, 설정 모달에서 웹훅 저장.

## 리스크

`app/page.tsx`(265줄)와 `RaidMarketTab`이 여러 훅을 동시에 물고 있어 저장 계층을
교체할 때 상태 흐름이 얽힐 수 있다. 훅의 공개 인터페이스를 기존과 동일하게 유지해
(`sessions`, `saveSession`, `deleteSession`, `fetchAllItems`) 컴포넌트 수정 범위를
최소화한다. 반환값에서는 `isLoggedIn`만 빠진다.
