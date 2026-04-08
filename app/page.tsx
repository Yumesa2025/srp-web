"use client";

import { useState } from "react";
import { DEFENSIVE_SKILLS } from "@/app/constants/defensiveSkills";
import { MainTab, PlayerData, RoleType } from "@/app/types";

import dynamic from "next/dynamic";
import MainTabs from "@/app/components/MainTabs";
import ErrorBoundary from "@/app/components/ErrorBoundary";

const RosterTab = dynamic(() => import("@/app/components/roster/RosterTab"));
const RaidMarketTab = dynamic(() => import("@/app/components/market/RaidMarketTab"));
const RaidAnalysisTab = dynamic(() => import("@/app/components/raid-analysis/RaidAnalysisTab"));
const HelpTab = dynamic(() => import("@/app/components/help/HelpTab"));
const WelcomeModal = dynamic(() => import("@/app/components/tutorial/WelcomeModal"));

import { guessRole } from "@/app/lib/raidUtils";
import { useAnalytics } from "@/app/hooks/useAnalytics";
import { useTutorialFirstVisit } from "@/app/hooks/useTutorialFirstVisit";
import { useTour } from "@/app/hooks/useTour";

const CHAR_FETCH_TIMEOUT_MS = 15_000;
const DUPLICATE_NOTICE_DURATION_MS = 5_000;

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>("ROSTER");
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [skippedDuplicates, setSkippedDuplicates] = useState<string[]>([]);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [mountedTabs, setMountedTabs] = useState<Set<MainTab>>(new Set(["ROSTER"]));

  const analytics = useAnalytics();
  const { shouldShow, markSeen } = useTutorialFirstVisit();
  const { startTour, hasSeenTab, resetAllTours } = useTour();

  // 첫 방문 시 웰컴 팝업 오픈
  if (shouldShow && !welcomeOpen) {
    setWelcomeOpen(true);
    markSeen();
  }

  const handleWelcomeStart = () => {
    setWelcomeOpen(false);
    // 웰컴 팝업에서 시작 → ROSTER 탭 투어 시작
    setTimeout(() => startTour("ROSTER"), 300);
  };

  const handleTabChange = (tab: MainTab) => {
    setMountedTabs(prev => new Set(prev).add(tab));
    setActiveTab(tab);
    analytics.trackTabChange(tab);
    // 해당 탭을 처음 방문하는 경우 투어 자동 시작
    if (!hasSeenTab(tab)) {
      setTimeout(() => startTour(tab), 300);
    }
  };

  const fetchRaidData = async () => {
    setIsLoading(true);
    setSkippedDuplicates([]);
    try {
      const lines = inputText.trim().split("\n").map((l) => l.trim()).filter(Boolean);
      const existingIds = new Set(players.map((p) => p.id.trim().toLowerCase()));
      const skipped: string[] = [];

      // 1단계: 파싱 — 형식 오류와 fetch 대상을 분리
      type FetchEntry = { name: string; realm: string; inputId: string };
      type CharacterApiData = {
        error?: string;
        name?: string;
        realm?: string;
        realmName?: string;
        health?: number;
        armor?: number;
        versatility?: number;
        activeSpec?: string;
        talents?: string[];
        itemLevel?: number;
        className?: string;
        bestPerfAvg?: number | null;
        bestPerfDetails?: PlayerData["bestPerfDetails"];
      };

      const fetchEntries: FetchEntry[] = [];
      const immediateErrors: PlayerData[] = [];
      const seenInBatch = new Set<string>();

      for (const line of lines) {
        const [namePart, ...realmParts] = line.split("-");
        const name = namePart?.trim();
        const realm = realmParts.join("-").trim();
        const inputId = `${name}-${realm}`.toLowerCase();

        if (existingIds.has(inputId) || seenInBatch.has(inputId)) {
          skipped.push(name || line);
          continue;
        }
        seenInBatch.add(inputId);

        if (!name || !realm) {
          immediateErrors.push({ id: `${name}-${realm}`, name: line, realm: "오류", role: "UNASSIGNED", error: "이름-서버명 형식 필요" });
          continue;
        }

        fetchEntries.push({ name, realm, inputId });
      }

      // 2단계: 모든 캐릭터 API 호출을 병렬로 실행
      const fetchOne = async ({ name, realm, inputId }: FetchEntry): Promise<PlayerData> => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CHAR_FETCH_TIMEOUT_MS);
        try {
          const params = new URLSearchParams({ realm, name });
          const res = await fetch(`/api/character?${params.toString()}`, {
            signal: controller.signal,
            cache: "no-store",
          });
          const data = (await res.json()) as CharacterApiData;

          if (!res.ok) {
            return { id: inputId, name, realm, role: "UNASSIGNED", error: data.error || "조회 실패" };
          }

          const resolvedName = typeof data.name === "string" && data.name.trim() ? data.name : name;
          const resolvedRealm = typeof data.realm === "string" && data.realm.trim() ? data.realm : realm;
          const myDefensives = data.talents?.filter((t: string) => DEFENSIVE_SKILLS.includes(t)) || [];

          return {
            id: `${resolvedName}-${resolvedRealm}`.toLowerCase(),
            name: resolvedName,
            realm: resolvedRealm,
            realmName: typeof data.realmName === "string" ? data.realmName : undefined,
            health: data.health, armor: data.armor, versatility: data.versatility,
            activeSpec: data.activeSpec, talents: data.talents,
            itemLevel: data.itemLevel,
            className: data.className,
            bestPerfAvg: data.bestPerfAvg,
            bestPerfDetails: data.bestPerfDetails ?? null,
            defensives: myDefensives.map((d: string) => ({ name: d, isActive: true })),
            role: guessRole(data.activeSpec),
          };
        } catch (err) {
          const message = err instanceof DOMException && err.name === "AbortError"
            ? "조회 시간 초과"
            : "통신 에러";
          return { id: inputId, name, realm, role: "UNASSIGNED", error: message };
        } finally {
          clearTimeout(timeout);
        }
      };

      const settled = await Promise.allSettled(fetchEntries.map(fetchOne));
      const fetchedPlayers = settled.map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : { id: fetchEntries[i].inputId, name: fetchEntries[i].name, realm: fetchEntries[i].realm, role: "UNASSIGNED" as const, error: "통신 에러" }
      );

      // 3단계: API 응답 후 resolvedId 기준 최종 중복 제거
      const resolvedIds = new Set(existingIds);
      const newPlayers: PlayerData[] = [...immediateErrors];
      for (const p of fetchedPlayers) {
        if (!p.error && resolvedIds.has(p.id)) {
          skipped.push(p.name);
          continue;
        }
        if (!p.error) resolvedIds.add(p.id);
        newPlayers.push(p);
      }

      if (newPlayers.length > 0) {
        setPlayers((prev) => [...prev, ...newPlayers]);
        analytics.trackCharacterFetch(newPlayers.length);
      }
      if (skipped.length > 0) {
        setSkippedDuplicates(skipped);
        setTimeout(() => setSkippedDuplicates([]), DUPLICATE_NOTICE_DURATION_MS);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedPlayerId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetRole: RoleType) => {
    e.preventDefault();
    if (!draggedPlayerId) return;
    setPlayers((prev) => prev.map((p) => (p.id === draggedPlayerId ? { ...p, role: targetRole } : p)));
    setDraggedPlayerId(null);
  };

  const removePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    if (draggedPlayerId === playerId) setDraggedPlayerId(null);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-900 text-white font-sans">
      <div className="max-w-[1400px] mx-auto">

        <MainTabs activeTab={activeTab} onChange={handleTabChange} />

        {mountedTabs.has("ROSTER") && (
          <div className={activeTab === "ROSTER" ? "" : "hidden"}>
            <ErrorBoundary>
              <RosterTab
                inputText={inputText}
                onInputTextChange={setInputText}
                players={players}
                isLoading={isLoading}
                skippedDuplicates={skippedDuplicates}
                onFetchRaidData={fetchRaidData}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onRemovePlayer={removePlayer}
              />
            </ErrorBoundary>
          </div>
        )}

        {mountedTabs.has("RAID_MARKET") && (
          <div className={activeTab === "RAID_MARKET" ? "" : "hidden"}>
            <ErrorBoundary>
              <RaidMarketTab />
            </ErrorBoundary>
          </div>
        )}

        {mountedTabs.has("RAID_AI_ANALYSIS") && (
          <div className={activeTab === "RAID_AI_ANALYSIS" ? "" : "hidden"}>
            <ErrorBoundary>
              <RaidAnalysisTab />
            </ErrorBoundary>
          </div>
        )}

        {mountedTabs.has("HELP") && (
          <div className={activeTab === "HELP" ? "" : "hidden"}>
            <ErrorBoundary>
              <HelpTab onOpenTutorial={() => {
                // 모든 탭 seen 초기화 → ROSTER로 이동 → 투어 시작
                // (이후 거래/분석 탭 첫 방문 시에도 투어 자동 재실행)
                resetAllTours();
                handleTabChange("ROSTER");
                setTimeout(() => startTour("ROSTER"), 300);
              }} />
            </ErrorBoundary>
          </div>
        )}

        {welcomeOpen && (
          <WelcomeModal onStart={handleWelcomeStart} />
        )}
      </div>
    </div>
  );
}
