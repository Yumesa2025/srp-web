"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PostHogReactProvider } from "posthog-js/react";

// [중요] 초기화 로직을 컴포넌트 외부로 이동 (브라우저 로드 즉시 실행)
if (typeof window !== "undefined") {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  if (key) {
    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: false, // 수동 캡처 사용
      capture_pageleave: true,
      autocapture: true,
    });
  }
}

// 별도 컴포넌트로 분리하여 페이지뷰 추적
function PostHogPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PostHogReactProvider client={posthog}>
      {/* useSearchParams를 사용하는 컴포넌트는 반드시 Suspense로 감싸야 합니다 (Next.js 규칙) */}
      <Suspense fallback={null}>
        <PostHogPageviewTracker />
      </Suspense>
      {children}
    </PostHogReactProvider>
  );
}