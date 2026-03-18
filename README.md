# SRP Web (WOW Raid Planner & Log Analyzer)

SRP Web은 월드 오브 워크래프트(World of Warcraft) 공격대(Raid) 운영 및 분석을 돕기 위해 개발된 Next.js 기반의 웹 애플리케이션입니다. 

주요 기능으로 WCL(Warcraft Logs) 데이터를 불러와 공대 힐러 생존기 택틱을 AI로 짜주고, 실패한 전투 로그를 분석하며, 인게임 애드온 데이터를 통한 전리품/골드 정산 기능을 제공합니다.

## 🚀 주요 기능 (Features)

1. **AI 기반 택틱 자동 생성**: WCL 로그 및 타임라인을 기반으로 보스 스킬 스케줄을 분석하고 힐러의 생존기(쿨기)를 자동으로 최적 배분합니다.
2. **트라이 로그 AI 분석**: 실패한 트라이의 문제점을 요약하고, 주요 사망 원인, 쿨기 누락, 소모품 사용 패턴, 딜/힐 추이 등을 분석합니다.
3. **시장 정산 (Raid Market)**: 인게임 애드온 장부 데이터를 붙여넣기 하여 파티원별 분배금과 수수료를 자동으로 계산합니다.
4. **유저 인증 (Supabase)**: 이메일 기반 로그인 및 회원가입 기능이 탑재되어 있습니다.

---

## 🛠 기술 스택 (Tech Stack)

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase SSR
- **AI Integration**: OpenAI API
- **External API**: Warcraft Logs v2 API, Blizzard Battle.net API
- **Deployment**: Cloudflare Workers (OpenNext)

---

## 📂 폴더 구조 (Directory Structure)

프로젝트의 핵심 비즈니스 로직과 UI 컴포넌트는 모두 `app/` 디렉토리에 위치해 있습니다.

```text
📦 srp-web
 ┣ 📂 app
 ┃ ┣ 📂 actions       # Supabase 로그인을 위한 서버 액션 (auth.ts)
 ┃ ┣ 📂 api           # 외부 API 통신을 위한 Next.js Route Handlers
 ┃ ┃ ┣ 📂 ai          # OpenAI 연동 (택틱 생성, 로그 분석)
 ┃ ┃ ┣ 📂 character   # Blizzard API 연동 (토큰 발급 등)
 ┃ ┃ ┣ 📂 item        # 아이템 정보 조회 API
 ┃ ┃ ┣ 📂 logs        # WCL(Warcraft Logs) GraphQL API 쿼리 및 파싱
 ┃ ┃ ┣ 📂 spell       # 보스 스킬(Spell) 조회 API
 ┃ ┃ ┗ 📂 wcl         # WCL OAuth 인증 관련
 ┃ ┣ 📂 components    # 재사용 가능한 UI 컴포넌트
 ┃ ┃ ┣ 📂 auth        # 로그인/회원가입 모달 (AuthClientUI.tsx)
 ┃ ┃ ┣ 📂 clinic      # AI 로그 분석 & 피드백 탭 화면
 ┃ ┃ ┣ 📂 market      # 골드/아이템 정산 탭 화면
 ┃ ┃ ┣ 📂 tactics     # 생존기 택틱 에디터 탭 화면
 ┃ ┃ ┣ Header.tsx     # 우측 상단 글로벌 로그인 상태 헤더
 ┃ ┃ ┗ LazyImage.tsx  # Intersection Observer + Skeleton 이미지 최적화
 ┃ ┣ 📂 constants     # 앱 전반에서 사용되는 상수 (직업 색상, 스킬 ID 등)
 ┃ ┣ 📂 hooks         # Custom React Hooks (useRaidPlanner 등 상태 관리)
 ┃ ┣ 📂 lib           # 공통 유틸리티 (AI 텍스트 파싱 등)
 ┃ ┣ 📂 styles        # Tailwind/CSS 글로벌 스타일 및 공유 클래스
 ┃ ┣ 📂 types         # TypeScript 타입 정의 (API 응답 모델 등)
 ┃ ┣ 📂 utils         # 구조적 유틸리티 (Supabase SSR 클라이언트/서버 생성)
 ┃ ┣ globals.css      # 전역 CSS
 ┃ ┣ layout.tsx       # Root Layout (폰트 설정, 전역 헤더 포함)
 ┃ ┗ page.tsx         # 메인 페이지 (탭 네비게이션 및 컨트롤 패널)
```

### 특이 사항
- **AI 모듈**: `app/api/ai/` 하위 라우트에서 OpenAI 기반 택틱/분석 로직을 처리합니다.
- **이미지 최적화**: 썸네일과 아이콘은 `LazyImage.tsx`를 통해 스켈레톤 UI와 레이지 로딩이 적용되어 있습니다.

---

## ⚙️ 로컬 환경 설정 (Getting Started)

### 1. 레포지토리 클론
```bash
git clone https://github.com/사용자명/srp-web.git
cd srp-web
```

### 2. 패키지 설치
```bash
npm install
# 패키지 중지 시 npm install --legacy-peer-deps 를 사용하세요.
```

### 3. 환경 변수 설정
루트 디렉토리에 `.env.local` 파일을 생성하고 아래 변수들을 채워 넣습니다.
```env
# Blizzard API (아이템 및 스킬 정보용)
BLIZZARD_CLIENT_ID=your_blizzard_client_id
BLIZZARD_CLIENT_SECRET=your_blizzard_client_secret

# Warcraft Logs API (로그 분석용)
WCL_CLIENT_ID=your_wcl_client_id
WCL_CLIENT_SECRET=your_wcl_client_secret

# OpenAI API (AI 분석 엔진용)
OPENAI_API_KEY=your_openai_api_key

# Supabase (유저 인증용)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 로컬 서버 실행
```bash
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000) 로 접속하여 확인합니다.

### 5. Cloudflare Workers 배포 준비
OpenNext 기반으로 Cloudflare Workers에 배포할 수 있도록 설정되어 있습니다.

1. 의존성 설치
```bash
npm install
```

2. 로컬 Cloudflare 개발용 환경 파일 준비
```bash
cp .dev.vars.example .dev.vars
```

3. 타입 생성
```bash
npm run cf-typegen
```

4. Cloudflare 빌드 확인
```bash
npm run build:cf
```

5. 로컬 프리뷰
```bash
npm run preview:cf
```

6. 실제 배포
```bash
npm run deploy:cf
```

`wrangler.jsonc`에는 Worker 엔트리와 asset binding만 포함되어 있습니다. 민감한 값은 Cloudflare dashboard 또는 `wrangler secret put`으로 등록하세요.

---

## 🤝 기여하기 (Contributing)
이 리포지토리는 개인/소규모 프로젝트 목적으로 구축되었습니다. 기여 관련 문의는 Issue를 통해 남겨주세요.
