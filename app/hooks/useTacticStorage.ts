"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { MRTNode } from "@/app/types/mrt";
import { Difficulty } from "@/data/bossTimelines";

export interface SavedTactic {
  id: string;
  name: string;
  boss_id: number;
  boss_name: string;
  difficulty: Difficulty;
  mrt_nodes: MRTNode[];
  spell_config: Record<number, { type: string; danger: string; memo: string }>;
  created_at: string;
  updated_at: string;
}

export function useTacticStorage() {
  const supabase = useMemo(() => createClient(), []);
  const [savedTactics, setSavedTactics] = useState<SavedTactic[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const fetchTactics = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("tactics")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setSavedTactics(data as SavedTactic[]);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (isLoggedIn) fetchTactics();
    else setSavedTactics([]);
  }, [isLoggedIn, fetchTactics]);

  const saveTactic = useCallback(async (params: {
    name: string;
    bossId: number;
    bossName: string;
    difficulty: Difficulty;
    mrtNodes: MRTNode[];
    spellConfig: Record<number, { type: string; danger: string; memo: string }>;
    existingId?: string;
  }) => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSaving(false); return { error: "로그인이 필요합니다." }; }

    const payload = {
      user_id: user.id,
      name: params.name,
      boss_id: params.bossId,
      boss_name: params.bossName,
      difficulty: params.difficulty,
      mrt_nodes: params.mrtNodes,
      spell_config: params.spellConfig,
    };

    let error;
    if (params.existingId) {
      ({ error } = await supabase.from("tactics").update(payload).eq("id", params.existingId));
    } else {
      ({ error } = await supabase.from("tactics").insert(payload));
    }

    if (!error) await fetchTactics();
    setIsSaving(false);
    return { error: error?.message };
  }, [supabase, fetchTactics]);

  const deleteTactic = useCallback(async (id: string) => {
    await supabase.from("tactics").delete().eq("id", id);
    setSavedTactics((prev) => prev.filter((t) => t.id !== id));
  }, [supabase]);

  return { savedTactics, isLoggedIn, isSaving, isLoading, saveTactic, deleteTactic, fetchTactics };
}
