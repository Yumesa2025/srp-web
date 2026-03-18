"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PostHogReactProvider } from "posthog-js/react";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const posthogUiHost = posthogHost.includes("eu.i.posthog.com")
  ? "https://eu.posthog.com"
  : "https://us.posthog.com";

let isInitialized = false;

function PostHogPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useLayoutEffect(() => {
    if (!posthogKey || !pathname) return;
    console.log(posthog);
    const search = searchParams?.toString();
    const url = `${window.location.origin}${pathname}${search ? `?${search}` : ""}`;

    posthog.capture("$pageview", {
      $current_url: url,
    });
  }, [pathname, searchParams, posthog]);

  return null;
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!posthogKey || isInitialized) return;

    posthog.init(posthogKey, {
      api_host: posthogHost,
      ui_host: posthogUiHost,
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      persistence: "localStorage+cookie",
    });

    isInitialized = true;
  }, []);

  if (!posthogKey) {
    return <>{children}</>;
  }

  return (
    <PostHogReactProvider client={posthog}>
      <PostHogPageviewTracker />
      {children}
    </PostHogReactProvider>
  );
}
