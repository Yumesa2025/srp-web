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

    trackTacticSave: (bossName: string, difficulty: string) =>
      track("tactic_save", { boss_name: bossName, difficulty }),

    trackTacticLoad: (bossName: string, difficulty: string) =>
      track("tactic_load", { boss_name: bossName, difficulty }),

    trackAiTacticGenerate: (bossName: string, healerCount: number) =>
      track("ai_tactic_generate", { boss_name: bossName, healer_count: healerCount }),

    trackClinicAnalyze: (logCount: number) =>
      track("clinic_analyze", { log_count: logCount }),

    trackMrtCopy: (nodeCount: number) =>
      track("mrt_copy", { node_count: nodeCount }),
  };
}
