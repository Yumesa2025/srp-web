"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { DEFENSIVE_SKILLS } from "@/app/constants/defensiveSkills";
import { MainTab, PlayerData, RoleType } from "@/app/types";
import { MRTNode } from "@/app/types/mrt";

import MainTabs from "@/app/components/MainTabs";
import ClinicAnalysisTab from "@/app/components/clinic/ClinicAnalysisTab";
import TacticEditorTab from "@/app/components/tactics/TacticEditorTab";
import RaidMarketTab from "@/app/components/market/RaidMarketTab";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import RosterTab from "@/app/components/roster/RosterTab";

import { BOSS_DATABASE, Difficulty } from "../data/bossTimelines";
import { useTacticStorage } from "@/app/hooks/useTacticStorage";
import { guessRole } from "@/app/lib/raidUtils";
import { useClinicState } from "@/app/hooks/useClinicState";
import { useAnalytics } from "@/app/hooks/useAnalytics";

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>("ROSTER");
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [skippedDuplicates, setSkippedDuplicates] = useState<string[]>([]);

  // 💡 [추가됨] 보스 및 난이도 선택 상태 관리
  const [selectedBossId, setSelectedBossId] = useState<number>(BOSS_DATABASE[0].id);
  const [difficulty, setDifficulty] = useState<Difficulty>("Mythic");

  // 💡 [추가됨] AI 택틱 상태 관리
  const [aiTactic, setAiTactic] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [mrtNodes, setMrtNodes] = useState<MRTNode[]>([]);
  const [newNodeTime, setNewNodeTime] = useState<string>("00:00");
  const [newNodePlayerId, setNewNodePlayerId] = useState<string>("");
  const [newNodeSpell, setNewNodeSpell] = useState<string>("");
  const [draggedMrtNodeId, setDraggedMrtNodeId] = useState<string | null>(null);
  const [dragHoverTime, setDragHoverTime] = useState<string | null>(null);
  const [showEmptyTicks, setShowEmptyTicks] = useState(true);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeTime, setEditingNodeTime] = useState<string>("");

  const { savedTactics, isLoggedIn, isSaving, isLoading: isTacticsLoading, saveTactic, deleteTactic } = useTacticStorage();
  const {
    failedLogsInput, setFailedLogsInput,
    clinicSampleStepSec, setClinicSampleStepSec,
    analysisError, isAnalysisLoading, clinicReports,
    analyzeLogs,
  } = useClinicState();
  const analytics = useAnalytics();

  // 현재 선택된 보스 찾기
  const currentBoss = BOSS_DATABASE.find(b => b.id === selectedBossId) || BOSS_DATABASE[0];
  // 현재 선택된 보스의 선택된 난이도 타임라인 가져오기
  const currentTimeline = currentBoss.timelines[difficulty];

  // 💡 [추가됨] 보스의 고유 스킬 목록을 추출하고 설정하는 상태
  const [spellConfig, setSpellConfig] = useState<Record<number, { type: string; danger: string; memo: string }>>({});

  // 💡 [추가됨] 와우헤드에서 가져온 진짜 스킬 이름/아이콘/설명을 저장할 창고
  const [spellDetails, setSpellDetails] = useState<Record<number, { name: string, iconUrl: string, description?: string }>>({});
  const spellFetchRequestedRef = useRef<Set<number>>(new Set());

  // 현재 타임라인에서 중복 없는 스킬 목록만 뽑아내기
  const uniqueSpells = useMemo(
    () =>
      Array.from(new Set(currentTimeline.map((ev) => ev.spellId))).map(
        (id) => currentTimeline.find((ev) => ev.spellId === id)!
      ),
    [currentTimeline]
  );

  // 보스가 바뀌거나 타임라인이 바뀔 때마다 필요한 스킬 상세를 배치로 로드
  useEffect(() => {
    const missingSpellIds = uniqueSpells
      .map((spell) => spell.spellId)
      .filter((spellId) => !spellDetails[spellId] && !spellFetchRequestedRef.current.has(spellId));

    if (missingSpellIds.length === 0) return;
    missingSpellIds.forEach((id) => spellFetchRequestedRef.current.add(id));

    let canceled = false;
    const CHUNK_SIZE = 35;
    const chunks: number[][] = [];
    for (let i = 0; i < missingSpellIds.length; i += CHUNK_SIZE) {
      chunks.push(missingSpellIds.slice(i, i + CHUNK_SIZE));
    }

  const fetchSpellDetailsBatch = async () => {
      try {
        const responses = await Promise.all(
          chunks.map(async (chunk) => {
            const query = chunk.join(",");
            const res = await fetch(`/api/spell/batch?ids=${query}`);
            const data = (await res.json()) as {
              error?: string;
              spells?: Record<string, { name: string; iconUrl: string; description?: string }>;
            };
            if (!res.ok) {
              throw new Error(data.error || "스킬 배치 로드 실패");
            }
            return data.spells || {};
          })
        );

        const merged: Record<number, { name: string; iconUrl: string; description?: string }> = {};
        responses.forEach((block) => {
          Object.entries(block || {}).forEach(([id, detail]) => {
            const numericId = Number(id);
            if (!Number.isFinite(numericId)) return;
            merged[numericId] = {
              name: detail.name,
              iconUrl: detail.iconUrl,
              description: detail.description || "",
            };
          });
        });

        if (!canceled && Object.keys(merged).length > 0) {
          setSpellDetails((prev) => ({
            ...prev,
            ...merged,
          }));
        }
      } catch {
        // 실패한 ID는 다음 effect에서 재시도 가능하도록 요청 기록 제거
        missingSpellIds.forEach((id) => spellFetchRequestedRef.current.delete(id));
      }
    };

    fetchSpellDetailsBatch();
    return () => {
      canceled = true;
    };
  }, [uniqueSpells, spellDetails]);

  // 스킬 속성 변경 핸들러
  const handleSpellConfigChange = (spellId: number, field: "type" | "danger" | "memo", value: string) => {
    setSpellConfig(prev => ({
      ...prev,
      [spellId]: {
        ...prev[spellId],
        type: prev[spellId]?.type || "광역", // 기본값
        danger: prev[spellId]?.danger || "보통", // 기본값
        memo: prev[spellId]?.memo || "",
        [field]: value
      }
    }));
  };



  const fetchRaidData = async () => {
    setIsLoading(true);
    setSkippedDuplicates([]);
    try {
      const lines = inputText.trim().split("\n");
      const newPlayers: PlayerData[] = [];
      const existingIds = new Set(players.map((p) => p.id.trim().toLowerCase()));
      const stagedIds = new Set(existingIds);
      const requestedIds = new Set<string>();
      const skipped: string[] = [];

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const [namePart, ...realmParts] = line.split("-");
        const name = namePart?.trim();
        const realm = realmParts.join("-").trim();
        const id = `${name}-${realm}`;
        const normalizedId = id.toLowerCase();

        if (stagedIds.has(normalizedId) || requestedIds.has(normalizedId)) {
          skipped.push(name || line);
          continue;
        }

        requestedIds.add(normalizedId);

        if (!name || !realm) {
          newPlayers.push({ id, name: line, realm: "오류", role: "UNASSIGNED", error: "이름-서버명 형식 필요" });
          continue;
        }

        try {
          const params = new URLSearchParams({
            realm,
            name,
          });
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);

          let res: Response;
          let data: {
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

          try {
            res = await fetch(`/api/character?${params.toString()}`, {
              signal: controller.signal,
              cache: "no-store",
            });
            data = (await res.json()) as typeof data;
          } finally {
            clearTimeout(timeout);
          }

          if (!res.ok) {
            newPlayers.push({ id, name, realm, role: "UNASSIGNED", error: data.error || "조회 실패" });
          } else {
            const resolvedName = typeof data.name === "string" && data.name.trim() ? data.name : name;
            const resolvedRealm = typeof data.realm === "string" && data.realm.trim() ? data.realm : realm;
            const resolvedId = `${resolvedName}-${resolvedRealm}`.toLowerCase();
            if (stagedIds.has(resolvedId)) {
              continue;
            }
            requestedIds.add(resolvedId);
            stagedIds.add(resolvedId);

            const myDefensives = data.talents?.filter((t: string) => DEFENSIVE_SKILLS.includes(t)) || [];
            const defensivesWithState = myDefensives.map((d: string) => ({ name: d, isActive: true }));

            newPlayers.push({
              id: resolvedId,
              name: resolvedName,
              realm: resolvedRealm,
              realmName: typeof data.realmName === "string" ? data.realmName : undefined,
              health: data.health, armor: data.armor, versatility: data.versatility,
              activeSpec: data.activeSpec, talents: data.talents,
              itemLevel: data.itemLevel,
              className: data.className,
              bestPerfAvg: data.bestPerfAvg,
              bestPerfDetails: data.bestPerfDetails ?? null,
              defensives: defensivesWithState,
              role: guessRole(data.activeSpec),
            });
          }
        } catch (error) {
          const message = error instanceof DOMException && error.name === "AbortError"
            ? "조회 시간 초과"
            : "통신 에러";
          newPlayers.push({ id, name, realm, role: "UNASSIGNED", error: message });
        }
      }

      if (newPlayers.length > 0) {
        setPlayers((prev) => [...prev, ...newPlayers]);
        analytics.trackCharacterFetch(newPlayers.length);
      }
      if (skipped.length > 0) {
        setSkippedDuplicates(skipped);
        setTimeout(() => setSkippedDuplicates([]), 5000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 💡 [추가됨] 생존기 클릭 시 ON/OFF 토글 함수
  const toggleDefensive = (playerId: string, skillName: string) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId && p.defensives) {
        return {
          ...p,
          defensives: p.defensives.map(d => 
            d.name === skillName ? { ...d, isActive: !d.isActive } : d
          )
        };
      }
      return p;
    }));
  };

  // 💡 [추가됨] AI 백엔드 호출 함수
  const generateAiTactic = async () => {
    setIsAiLoading(true);
    setAiTactic("");

    const healers = players.filter((p) => p.role === "HEALER");
    analytics.trackAiTacticGenerate(currentBoss.name, healers.length);
    
    if (healers.length === 0) {
      setAiTactic("⚠️ 에러: 하단 프레임에 '치유 전담 (Healer)'으로 분류된 파티원이 최소 1명 이상 있어야 합니다!");
      setIsAiLoading(false);
      return;
    }

    try {
      // 💡 [수정됨] 토글이 켜진(isActive: true) 생존기만 걸러서 AI에게 전송!
      const compactHealers = healers.map(h => ({
        name: h.name,
        spec: h.activeSpec,
        availableSkills: h.defensives?.filter(d => d.isActive).map(d => d.name) || []
      }));

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bossName: currentBoss.name,
          timeline: currentTimeline,
          healers: compactHealers,
          // 💡 [추가됨] 내가 UI에서 설정한 스킬 사전을 AI에게 같이 보냄!
          spellDictionary: uniqueSpells.map(spell => ({
            id: spell.spellId,
            name: spell.spellName,
            type: spellConfig[spell.spellId]?.type || "광역",
            danger: spellConfig[spell.spellId]?.danger || "보통",
            memo: spellConfig[spell.spellId]?.memo || ""
          }))
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        tactic?: string;
      };
      if (data.error) {
        setAiTactic(`에러 발생: ${data.error}`);
      } else {
        setAiTactic(data.tactic || "AI가 전술을 반환하지 않았습니다.");
      }
    } catch {
      setAiTactic("AI 통신 중 에러가 발생했습니다.");
    }
    setIsAiLoading(false);
  };

  const getDefaultCooldown = (spell: string) => {
    if (["고통 억제", "수호 영혼", "희생의 축복", "무쇠껍질", "미풍", "대마법 지대"].includes(spell)) return 120;
    return 180;
  };

  const addMrtNode = () => {
    if (!newNodeTime || !newNodePlayerId || !newNodeSpell) return;

    const player = players.find((p) => p.id === newNodePlayerId);
    if (!player) return;

    const newNode: MRTNode = {
      id: Date.now().toString(),
      time: newNodeTime,
      playerId: player.id,
      playerName: player.name,
      spellName: newNodeSpell,
      cooldown: getDefaultCooldown(newNodeSpell),
    };

    setMrtNodes((prev) => [...prev, newNode]);
    setNewNodeSpell("");
  };

  const removeMrtNode = (id: string) => {
    setMrtNodes((prev) => prev.filter((node) => node.id !== id));
  };

  const updateNodeCooldown = (id: string, newCooldown: number) => {
    setMrtNodes((prev) =>
      prev.map((node) => {
        if (node.id !== id) return node;
        return { ...node, cooldown: Number.isFinite(newCooldown) && newCooldown >= 0 ? newCooldown : 0 };
      })
    );
  };

  const updateNodeTime = (nodeId: string, newTime: string) => {
    setMrtNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, time: newTime } : node)));
  };

  const timeToSeconds = (timeStr: string) => {
    const [m, s] = timeStr.split(":").map(Number);
    return (m || 0) * 60 + (s || 0);
  };

  const secondsToTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const parseTimeInputToSeconds = (input: string): number | null => {
    const value = input.trim();
    if (!value) return null;

    if (value.includes(":")) {
      const parts = value.split(":");
      if (parts.length !== 2) return null;
      const m = Number(parts[0]);
      const s = Number(parts[1]);
      if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0 || s >= 60) return null;
      return m * 60 + s;
    }

    const totalSec = Number(value);
    if (!Number.isFinite(totalSec) || totalSec < 0) return null;
    return Math.floor(totalSec);
  };

  const normalizeTimeInput = (input: string): string | null => {
    const sec = parseTimeInputToSeconds(input);
    if (sec === null) return null;
    return secondsToTime(sec);
  };

  const maxBossTime = currentTimeline.length > 0 ? Math.max(...currentTimeline.map((t) => timeToSeconds(t.time))) : 0;
  const maxPlayerTime = mrtNodes.length > 0 ? Math.max(...mrtNodes.map((t) => timeToSeconds(t.time))) : 0;
  const totalMaxTime = Math.max(maxBossTime, maxPlayerTime) + 30;
  const timelineSeconds = Array.from({ length: totalMaxTime + 1 }, (_, i) => i);
  const visibleTimelineSeconds = showEmptyTicks
    ? timelineSeconds
    : timelineSeconds.filter((sec) => {
        const timeStr = secondsToTime(sec);
        return currentTimeline.some((ev) => ev.time === timeStr) || mrtNodes.some((node) => node.time === timeStr);
      });
  const sortedNodes = [...mrtNodes].sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
  const cooldownWarnings = new Set<string>();
  const lastUsedMap: Record<string, { timeSec: number; cooldown: number }> = {};

  sortedNodes.forEach((node) => {
    const key = `${node.playerId}-${node.spellName}`;
    const currentSec = timeToSeconds(node.time);

    if (lastUsedMap[key]) {
      const last = lastUsedMap[key];
      if (currentSec - last.timeSec < last.cooldown) {
        cooldownWarnings.add(node.id);
      }
    }

    lastUsedMap[key] = { timeSec: currentSec, cooldown: node.cooldown };
  });

  const startEditingNodeTime = (node: MRTNode) => {
    setEditingNodeId(node.id);
    setEditingNodeTime(node.time);
  };

  const saveEditingNodeTime = (node: MRTNode) => {
    const normalized = normalizeTimeInput(editingNodeTime);
    if (normalized) {
      updateNodeTime(node.id, normalized);
    } else {
      setEditingNodeTime(node.time);
    }
    setEditingNodeId(null);
  };

  const cancelEditingNodeTime = (node: MRTNode) => {
    setEditingNodeId(null);
    setEditingNodeTime(node.time);
  };

  const copyMrtNote = async () => {
    const sortedPlayerNodes = [...mrtNodes].sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));

    const noteLines = sortedPlayerNodes.map((node) => {
      const spellEntry = Object.entries(spellDetails).find(([, detail]) => detail.name === node.spellName);
      const spellTag = spellEntry ? `{spell:${spellEntry[0]}}` : node.spellName;
      return `${node.time}  ${spellTag} ${node.playerName}`;
    });

    const finalNote = noteLines.join("\n");

    try {
      await navigator.clipboard.writeText(finalNote);
      analytics.trackMrtCopy(mrtNodes.length);
      alert("MRT 노드가 클립보드에 복사되었습니다!\n인게임 MRT 'Note' 탭에 붙여넣으세요.");
    } catch {
      alert("클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
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
    setMrtNodes((prev) => prev.filter((node) => node.playerId !== playerId));

    if (newNodePlayerId === playerId) {
      setNewNodePlayerId("");
      setNewNodeSpell("");
    }

    if (draggedPlayerId === playerId) {
      setDraggedPlayerId(null);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-900 text-white font-sans">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-yellow-400">Smart Raid Planner (SRP)</h1>

        <MainTabs activeTab={activeTab} onChange={(tab) => { setActiveTab(tab); analytics.trackTabChange(tab); }} />

        {activeTab === "ROSTER" && (
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
              onToggleDefensive={toggleDefensive}
            />
          </ErrorBoundary>
        )}

        {activeTab === "TACTIC_EDITOR" && (
          <ErrorBoundary>
          <TacticEditorTab
            copyMrtNote={copyMrtNote}
            selectedBossId={selectedBossId}
            onSelectedBossIdChange={setSelectedBossId}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            newNodeTime={newNodeTime}
            onNewNodeTimeChange={setNewNodeTime}
            newNodePlayerId={newNodePlayerId}
            onNewNodePlayerIdChange={setNewNodePlayerId}
            newNodeSpell={newNodeSpell}
            onNewNodeSpellChange={setNewNodeSpell}
            players={players}
            addMrtNode={addMrtNode}
            showEmptyTicks={showEmptyTicks}
            onToggleShowEmptyTicks={() => setShowEmptyTicks((prev) => !prev)}
            visibleTimelineSeconds={visibleTimelineSeconds}
            secondsToTime={secondsToTime}
            currentTimeline={currentTimeline}
            mrtNodes={mrtNodes}
            dragHoverTime={dragHoverTime}
            onDragHoverTimeChange={setDragHoverTime}
            draggedMrtNodeId={draggedMrtNodeId}
            onDraggedMrtNodeIdChange={setDraggedMrtNodeId}
            updateNodeTime={updateNodeTime}
            spellDetails={spellDetails}
            cooldownWarnings={cooldownWarnings}
            editingNodeId={editingNodeId}
            editingNodeTime={editingNodeTime}
            onEditingNodeTimeChange={setEditingNodeTime}
            startEditingNodeTime={startEditingNodeTime}
            saveEditingNodeTime={saveEditingNodeTime}
            cancelEditingNodeTime={cancelEditingNodeTime}
            updateNodeCooldown={updateNodeCooldown}
            removeMrtNode={removeMrtNode}
            uniqueSpells={uniqueSpells}
            spellConfig={spellConfig}
            handleSpellConfigChange={handleSpellConfigChange}
            generateAiTactic={generateAiTactic}
            isAiLoading={isAiLoading}
            aiTactic={aiTactic}
            savedTactics={savedTactics}
            isLoggedIn={isLoggedIn}
            isSaving={isSaving}
            isTacticsLoading={isTacticsLoading}
            onSaveTactic={async (name) => {
              const boss = BOSS_DATABASE.find((b) => b.id === selectedBossId) || BOSS_DATABASE[0];
              return saveTactic({ name, bossId: selectedBossId, bossName: boss.name, difficulty, mrtNodes, spellConfig });
            }}
            onLoadTactic={(tactic) => {
              setSelectedBossId(tactic.boss_id);
              setDifficulty(tactic.difficulty);
              setMrtNodes(tactic.mrt_nodes);
              setSpellConfig(tactic.spell_config);
            }}
            onDeleteTactic={deleteTactic}
          />
          </ErrorBoundary>
        )}

        {activeTab === "RAID_AI_ANALYSIS" && (
          <ErrorBoundary>
          <ClinicAnalysisTab
            failedLogsInput={failedLogsInput}
            onFailedLogsInputChange={setFailedLogsInput}
            clinicSampleStepSec={clinicSampleStepSec}
            onClinicSampleStepSecChange={setClinicSampleStepSec}
            onAnalyze={() => analyzeLogs((count) => analytics.trackClinicAnalyze(count))}
            isAnalysisLoading={isAnalysisLoading}
            analysisError={analysisError}
            clinicReports={clinicReports}
          />
          </ErrorBoundary>
        )}

        {activeTab === "RAID_MARKET" && (
          <ErrorBoundary>
            <RaidMarketTab />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}


