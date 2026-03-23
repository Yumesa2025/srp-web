"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { BOSS_DATABASE, Difficulty } from "@/data/bossTimelines";
import { MRT_DEFAULT_COOLDOWNS, MRT_FALLBACK_COOLDOWN } from "@/app/constants/defensiveSkills";
import { MRTNode } from "@/app/types/mrt";
import { PlayerData } from "@/app/types";
import { useTacticStorage, SavedTactic } from "./useTacticStorage";
import { useAnalytics } from "./useAnalytics";

const SPELL_BATCH_SIZE = 35;

export function useTacticEditor(players: PlayerData[]) {
  const analytics = useAnalytics();
  const {
    savedTactics, isLoggedIn, isSaving,
    isLoading: isTacticsLoading, saveTactic, deleteTactic,
  } = useTacticStorage();

  // 보스 / 난이도
  const [selectedBossId, setSelectedBossId] = useState<number>(BOSS_DATABASE[0].id);
  const [difficulty, setDifficulty] = useState<Difficulty>("Mythic");

  // AI 전술
  const [aiTactic, setAiTactic] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // MRT 노드
  const [mrtNodes, setMrtNodes] = useState<MRTNode[]>([]);
  const [newNodeTime, setNewNodeTime] = useState<string>("00:00");
  const [newNodePlayerId, setNewNodePlayerId] = useState<string>("");
  const [newNodeSpell, setNewNodeSpell] = useState<string>("");
  const [draggedMrtNodeId, setDraggedMrtNodeId] = useState<string | null>(null);
  const [dragHoverTime, setDragHoverTime] = useState<string | null>(null);
  const [showEmptyTicks, setShowEmptyTicks] = useState(true);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeTime, setEditingNodeTime] = useState<string>("");

  // 스킬 설정 / 상세
  const [spellConfig, setSpellConfig] = useState<Record<number, { type: string; danger: string; memo: string }>>({});
  const [spellDetails, setSpellDetails] = useState<Record<number, { name: string; iconUrl: string; description?: string }>>({});
  const spellFetchRequestedRef = useRef<Set<number>>(new Set());

  // 파생 값
  const currentBoss = BOSS_DATABASE.find((b) => b.id === selectedBossId) || BOSS_DATABASE[0];
  const currentTimeline = currentBoss.timelines[difficulty];

  const uniqueSpells = useMemo(
    () =>
      Array.from(new Set(currentTimeline.map((ev) => ev.spellId))).map(
        (id) => currentTimeline.find((ev) => ev.spellId === id)!
      ),
    [currentTimeline]
  );

  // 스킬 상세 배치 로드 (보스/난이도 변경 시)
  useEffect(() => {
    const missingSpellIds = uniqueSpells
      .map((spell) => spell.spellId)
      .filter((spellId) => !spellDetails[spellId] && !spellFetchRequestedRef.current.has(spellId));

    if (missingSpellIds.length === 0) return;
    missingSpellIds.forEach((id) => spellFetchRequestedRef.current.add(id));

    let canceled = false;
    const chunks: number[][] = [];
    for (let i = 0; i < missingSpellIds.length; i += SPELL_BATCH_SIZE) {
      chunks.push(missingSpellIds.slice(i, i + SPELL_BATCH_SIZE));
    }

    async function fetchSpellDetailsBatch() {
      try {
        const responses = await Promise.all(
          chunks.map(async (chunk) => {
            const res = await fetch(`/api/spell/batch?ids=${chunk.join(",")}`);
            const data = (await res.json()) as {
              error?: string;
              spells?: Record<string, { name: string; iconUrl: string; description?: string }>;
            };
            if (!res.ok) throw new Error(data.error || "스킬 배치 로드 실패");
            return data.spells || {};
          })
        );

        const merged: Record<number, { name: string; iconUrl: string; description?: string }> = {};
        responses.forEach((block) => {
          Object.entries(block || {}).forEach(([id, detail]) => {
            const numericId = Number(id);
            if (!Number.isFinite(numericId)) return;
            merged[numericId] = { name: detail.name, iconUrl: detail.iconUrl, description: detail.description || "" };
          });
        });

        if (!canceled && Object.keys(merged).length > 0) {
          setSpellDetails((prev) => ({ ...prev, ...merged }));
        }
      } catch {
        // 실패한 ID는 다음 effect에서 재시도할 수 있도록 요청 기록 제거
        missingSpellIds.forEach((id) => spellFetchRequestedRef.current.delete(id));
      }
    }

    fetchSpellDetailsBatch();
    return () => { canceled = true; };
  }, [uniqueSpells, spellDetails]);

  // 시간 유틸
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
    return sec === null ? null : secondsToTime(sec);
  };

  // 타임라인 계산
  const maxBossTime = currentTimeline.length > 0
    ? Math.max(...currentTimeline.map((t) => timeToSeconds(t.time)))
    : 0;
  const maxPlayerTime = mrtNodes.length > 0
    ? Math.max(...mrtNodes.map((t) => timeToSeconds(t.time)))
    : 0;
  const totalMaxTime = Math.max(maxBossTime, maxPlayerTime) + 30;
  const timelineSeconds = Array.from({ length: totalMaxTime + 1 }, (_, i) => i);
  const visibleTimelineSeconds = showEmptyTicks
    ? timelineSeconds
    : timelineSeconds.filter((sec) => {
        const timeStr = secondsToTime(sec);
        return (
          currentTimeline.some((ev) => ev.time === timeStr) ||
          mrtNodes.some((node) => node.time === timeStr)
        );
      });

  // 쿨다운 경고 계산
  const sortedNodes = [...mrtNodes].sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
  const cooldownWarnings = new Set<string>();
  const lastUsedMap: Record<string, { timeSec: number; cooldown: number }> = {};
  sortedNodes.forEach((node) => {
    const key = `${node.playerId}-${node.spellName}`;
    const currentSec = timeToSeconds(node.time);
    if (lastUsedMap[key] && currentSec - lastUsedMap[key].timeSec < lastUsedMap[key].cooldown) {
      cooldownWarnings.add(node.id);
    }
    lastUsedMap[key] = { timeSec: currentSec, cooldown: node.cooldown };
  });

  // 스킬 설정 변경
  const handleSpellConfigChange = (spellId: number, field: "type" | "danger" | "memo", value: string) => {
    setSpellConfig((prev) => ({
      ...prev,
      [spellId]: {
        ...{ type: "광역", danger: "보통", memo: "" },
        ...prev[spellId],
        [field]: value,
      },
    }));
  };

  // MRT 노드 조작
  const addMrtNode = () => {
    if (!newNodeTime || !newNodePlayerId || !newNodeSpell) return;
    const player = players.find((p) => p.id === newNodePlayerId);
    if (!player) return;
    setMrtNodes((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        time: newNodeTime,
        playerId: player.id,
        playerName: player.name,
        spellName: newNodeSpell,
        cooldown: MRT_DEFAULT_COOLDOWNS[newNodeSpell] ?? MRT_FALLBACK_COOLDOWN,
      },
    ]);
    setNewNodeSpell("");
  };

  const removeMrtNode = (id: string) =>
    setMrtNodes((prev) => prev.filter((node) => node.id !== id));

  const updateNodeCooldown = (id: string, newCooldown: number) => {
    setMrtNodes((prev) =>
      prev.map((node) =>
        node.id !== id
          ? node
          : { ...node, cooldown: Number.isFinite(newCooldown) && newCooldown >= 0 ? newCooldown : 0 }
      )
    );
  };

  const updateNodeTime = (nodeId: string, newTime: string) => {
    setMrtNodes((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, time: newTime } : node))
    );
  };

  // 노드 시간 편집
  const startEditingNodeTime = (node: MRTNode) => {
    setEditingNodeId(node.id);
    setEditingNodeTime(node.time);
  };

  const saveEditingNodeTime = (node: MRTNode) => {
    const normalized = normalizeTimeInput(editingNodeTime);
    if (normalized) updateNodeTime(node.id, normalized);
    else setEditingNodeTime(node.time);
    setEditingNodeId(null);
  };

  const cancelEditingNodeTime = (node: MRTNode) => {
    setEditingNodeId(null);
    setEditingNodeTime(node.time);
  };

  // MRT 노트 복사
  const copyMrtNote = async () => {
    const sorted = [...mrtNodes].sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
    const noteLines = sorted.map((node) => {
      const spellEntry = Object.entries(spellDetails).find(([, d]) => d.name === node.spellName);
      const spellTag = spellEntry ? `{spell:${spellEntry[0]}}` : node.spellName;
      return `${node.time}  ${spellTag} ${node.playerName}`;
    });
    try {
      await navigator.clipboard.writeText(noteLines.join("\n"));
      analytics.trackMrtCopy(mrtNodes.length);
      alert("MRT 노드가 클립보드에 복사되었습니다!\n인게임 MRT 'Note' 탭에 붙여넣으세요.");
    } catch {
      alert("클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
    }
  };

  // AI 전술 생성
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
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bossName: currentBoss.name,
          timeline: currentTimeline,
          healers: healers.map((h) => ({
            name: h.name,
            spec: h.activeSpec,
            availableSkills: h.defensives?.filter((d) => d.isActive).map((d) => d.name) || [],
          })),
          spellDictionary: uniqueSpells.map((spell) => ({
            id: spell.spellId,
            name: spell.spellName,
            type: spellConfig[spell.spellId]?.type || "광역",
            danger: spellConfig[spell.spellId]?.danger || "보통",
            memo: spellConfig[spell.spellId]?.memo || "",
          })),
        }),
      });
      const data = (await res.json()) as { error?: string; tactic?: string };
      setAiTactic(data.error ? `에러 발생: ${data.error}` : data.tactic || "AI가 전술을 반환하지 않았습니다.");
    } catch {
      setAiTactic("AI 통신 중 에러가 발생했습니다.");
    }
    setIsAiLoading(false);
  };

  // 전술 저장/불러오기
  const saveTacticWithCurrentState = (name: string) =>
    saveTactic({ name, bossId: selectedBossId, bossName: currentBoss.name, difficulty, mrtNodes, spellConfig });

  const loadTactic = (tactic: SavedTactic) => {
    setSelectedBossId(tactic.boss_id);
    setDifficulty(tactic.difficulty);
    setMrtNodes(tactic.mrt_nodes);
    setSpellConfig(tactic.spell_config);
  };

  // 공대원 제거 시 관련 MRT 상태 정리 (page.tsx의 removePlayer에서 호출)
  const onPlayerRemoved = (playerId: string) => {
    setMrtNodes((prev) => prev.filter((node) => node.playerId !== playerId));
    if (newNodePlayerId === playerId) {
      setNewNodePlayerId("");
      setNewNodeSpell("");
    }
  };

  return {
    // 보스 / 난이도
    selectedBossId, setSelectedBossId,
    difficulty, setDifficulty,
    currentBoss,
    currentTimeline,
    uniqueSpells,

    // 스킬
    spellConfig,
    spellDetails,
    handleSpellConfigChange,

    // MRT 노드
    mrtNodes,
    newNodeTime, setNewNodeTime,
    newNodePlayerId, setNewNodePlayerId,
    newNodeSpell, setNewNodeSpell,
    draggedMrtNodeId, setDraggedMrtNodeId,
    dragHoverTime, setDragHoverTime,
    showEmptyTicks, setShowEmptyTicks,
    editingNodeId,
    editingNodeTime, setEditingNodeTime,
    visibleTimelineSeconds,
    secondsToTime,
    cooldownWarnings,
    addMrtNode,
    removeMrtNode,
    updateNodeCooldown,
    updateNodeTime,
    startEditingNodeTime,
    saveEditingNodeTime,
    cancelEditingNodeTime,
    copyMrtNote,

    // AI
    aiTactic,
    isAiLoading,
    generateAiTactic,

    // 저장소
    savedTactics,
    isLoggedIn,
    isSaving,
    isTacticsLoading,
    saveTactic: saveTacticWithCurrentState,
    deleteTactic,
    loadTactic,

    // 공대원 제거 연동
    onPlayerRemoved,
  };
}
