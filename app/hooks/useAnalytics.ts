"use client";

import { usePostHog } from "posthog-js/react";

export function useAnalytics() {
  const posthog = usePostHog();

  const track = (event: string, props?: Record<string, unknown>) => {
    posthog?.capture(event, props);
  };

  return {
    trackCharacterFetch: (count: number) =>
      track("character_fetch", { character_count: count }),

    trackTabChange: (tab: string) =>
      track("tab_change", { tab }),
  };
}
