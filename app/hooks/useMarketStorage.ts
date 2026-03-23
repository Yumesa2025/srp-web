"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/app/utils/supabase/client";

export interface RaidSession {
  id: string;
  user_id: string;
  label: string;
  raid_size: number;
  raid_expense: number;
  total_gold: number;
  per_person: number;
  raw_input: string;
  created_at: string;
  updated_at: string;
}

export interface RaidItemRecord {
  id: string;
  session_id: string;
  user_id: string;
  item_id: string;
  item_name: string;
  icon_url: string;
  winner: string;
  gold: number;
  created_at: string;
}

export interface SaveSessionParams {
  label: string;
  raidSize: number;
  raidExpense: number;
  totalGold: number;
  perPerson: number;
  rawInput: string;
  items: {
    item_id: string;
    item_name: string;
    icon_url: string;
    winner: string;
    gold: number;
  }[];
}

export function useMarketStorage() {
  const supabase = useMemo(() => createClient(), []);
  const [sessions, setSessions] = useState<RaidSession[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session?.user);
      if (!session?.user) setSessions([]);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const fetchSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from("raid_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setSessions(data as RaidSession[]);
  }, [supabase]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let canceled = false;
    async function load() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("raid_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (canceled) return;
      if (!error && data) setSessions(data as RaidSession[]);
      setIsLoading(false);
    }
    load();
    return () => { canceled = true; };
  }, [isLoggedIn, supabase]);

  const saveSession = useCallback(async (params: SaveSessionParams): Promise<{ error?: string }> => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSaving(false); return { error: "로그인이 필요합니다." }; }

    const { data: sessionData, error: sessionError } = await supabase
      .from("raid_sessions")
      .insert({
        user_id: user.id,
        label: params.label,
        raid_size: params.raidSize,
        raid_expense: params.raidExpense,
        total_gold: params.totalGold,
        per_person: params.perPerson,
        raw_input: params.rawInput,
      })
      .select()
      .single();

    if (sessionError || !sessionData) {
      setIsSaving(false);
      return { error: sessionError?.message || "세션 저장에 실패했습니다." };
    }

    if (params.items.length > 0) {
      const { error: itemsError } = await supabase.from("raid_items").insert(
        params.items.map((item) => ({
          session_id: sessionData.id,
          user_id: user.id,
          ...item,
        }))
      );
      if (itemsError) {
        setIsSaving(false);
        return { error: itemsError.message };
      }
    }

    await fetchSessions();
    setIsSaving(false);
    return {};
  }, [supabase, fetchSessions]);

  const fetchAllItems = useCallback(async (): Promise<RaidItemRecord[]> => {
    const { data, error } = await supabase
      .from("raid_items")
      .select("*")
      .order("created_at", { ascending: false });
    return error || !data ? [] : (data as RaidItemRecord[]);
  }, [supabase]);

  const deleteSession = useCallback(async (id: string) => {
    await supabase.from("raid_sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, [supabase]);

  return {
    isLoggedIn, isSaving, isLoading,
    sessions, saveSession, fetchAllItems, deleteSession,
  };
}
