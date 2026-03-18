"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { DEFENSIVE_SKILLS } from "@/app/constants/defensiveSkills";
import { MainTab, PlayerData, RoleType } from "@/app/types";
import { ClinicLogSummary, ClinicLogTarget, ClinicReportItem } from "@/app/types/clinic";
import { MRTNode } from "@/app/types/mrt";
import RaidZone from "@/app/components/RaidZone";
import MainTabs from "@/app/components/MainTabs";
import ClinicAnalysisTab from "@/app/components/clinic/ClinicAnalysisTab";
import TacticEditorTab from "@/app/components/tactics/TacticEditorTab";
import RaidMarketTab from "@/app/components/market/RaidMarketTab";

import { BOSS_DATABASE, Difficulty } from "../data/bossTimelines";

const getClassColor = (className?: string) => {
  const colors: Record<string, string> = {
    "전사": "#C69B6D",
    "성기사": "#F48CBA",
    "사냥꾼": "#ABD473",
    "도적": "#FFF468",
    "사제": "#FFFFFF",
    "죽음의 기사": "#C41E3A",
    "주술사": "#0070DE",
    "마법사": "#3FC7EB",
    "흑마법사": "#8788EE",
    "수도사": "#00FF98",
    "드루이드": "#FF7C0A",
    "악마사냥꾼": "#A330C9",
    "기원사": "#33937F",
  };

  if (!className) return "#CCCCCC";
  return colors[className] || "#CCCCCC";
};

const getReadableTextColor = (hexColor: string) => {
  const normalized = hexColor.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? "#111827" : "#F9FAFB";
};

const WOW_CLASSES = [
  "전사",
  "성기사",
  "사냥꾼",
  "도적",
  "사제",
  "죽음의 기사",
  "주술사",
  "마법사",
  "흑마법사",
  "수도사",
  "드루이드",
  "악마사냥꾼",
  "기원사",
] as const;

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>("ROSTER");
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

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
  const [failedLogsInput, setFailedLogsInput] = useState("");
  const [clinicSampleStepSec, setClinicSampleStepSec] = useState<number>(2);
  const [analysisError, setAnalysisError] = useState("");
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [clinicReports, setClinicReports] = useState<ClinicReportItem[]>([]);

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
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data?.error || "스킬 배치 로드 실패");
            }
            return data.spells as Record<string, { name: string; iconUrl: string; description?: string }>;
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



  const guessRole = (spec?: string): RoleType => {
    if (!spec) return "UNASSIGNED";
    const tanks   = ["방어", "수호", "혈기", "양조", "복수", "보호"];
    const healers = ["신성", "복원", "운무", "수양", "보존"];
    const melee   = ["무기", "분노", "징벌", "암살", "무법", "잠행", "야성", "생존", "풍운", "파멸", "고양"];
    const ranged  = ["비전", "화염", "냉기", "고통", "악마", "파괴", "조화", "야수", "사격", "암흑", "정기", "황폐"];

    if (tanks.includes(spec))   return "TANK";
    if (healers.includes(spec)) return "HEALER";
    if (melee.includes(spec))   return "MELEE";
    if (ranged.includes(spec))  return "RANGED";
    return "UNASSIGNED";
  };

  const fetchRaidData = async () => {
    setIsLoading(true);
    const lines = inputText.trim().split("\n");
    const newPlayers: PlayerData[] = [];
    const existingIds = new Set(players.map((p) => p.id.trim().toLowerCase()));
    const requestedIds = new Set<string>();

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const [namePart, ...realmParts] = line.split("-");
      const name = namePart?.trim();
      const realm = realmParts.join("-").trim();
      const id = `${name}-${realm}`;
      const normalizedId = id.toLowerCase();

      if (existingIds.has(normalizedId) || requestedIds.has(normalizedId)) {
        continue;
      }

      requestedIds.add(normalizedId);

      if (!name || !realm) {
        newPlayers.push({ id, name: line, realm: "오류", role: "UNASSIGNED", error: "이름-서버명 형식 필요" });
        continue;
      }

      try {
        const res  = await fetch(`/api/character?realm=${realm}&name=${name}`);
        const data = await res.json();

        if (!res.ok) {
          newPlayers.push({ id, name, realm, role: "UNASSIGNED", error: data.error });
        } else {
          // 💡 [수정됨] 처음 불러올 때 모든 생존기를 '켜짐(true)' 상태로 저장
          const myDefensives = data.talents?.filter((t: string) => DEFENSIVE_SKILLS.includes(t)) || [];
          const defensivesWithState = myDefensives.map((d: string) => ({ name: d, isActive: true }));

          newPlayers.push({
            id, name: data.name, realm,
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
      } catch {
        newPlayers.push({ id, name, realm, role: "UNASSIGNED", error: "통신 에러" });
      }
    }

    if (newPlayers.length > 0) {
      setPlayers((prev) => [...prev, ...newPlayers]);
    }

    setIsLoading(false);
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

      const data = await res.json();
      if (data.error) {
        setAiTactic(`에러 발생: ${data.error}`);
      } else {
        setAiTactic(data.tactic);
      }
    } catch {
      setAiTactic("AI 통신 중 에러가 발생했습니다.");
    }
    setIsAiLoading(false);
  };

  const extractReportId = (raw: string): string => {
    const value = raw.trim();
    if (!value) return "";

    const urlMatch = value.match(/reports\/([A-Za-z0-9]+)/i);
    if (urlMatch?.[1]) return urlMatch[1];

    const token = value.split(/[/?#\s]/)[0] || "";
    return token.replace(/[^A-Za-z0-9]/g, "");
  };

  const parseFightId = (raw?: string): number | undefined => {
    if (!raw) return undefined;
    const n = Number(raw.trim());
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
  };

  const fetchClinicSummary = async (target: ClinicLogTarget): Promise<ClinicLogSummary> => {
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || "로그 요약을 가져오지 못했습니다.");
    }
    return data.summary as ClinicLogSummary;
  };

  const parseClinicTargets = (
    input: string,
    throughputStepSec: number
  ): Array<{ key: string; label: string; target: ClinicLogTarget }> => {
    const lines = input
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean);

    const unique = new Map<string, { key: string; label: string; target: ClinicLogTarget }>();
    lines.forEach((line) => {
      const isUrlInput = /reports\//i.test(line);
      const [reportRaw, fightRaw] = isUrlInput ? [line, undefined] : line.split(/[:#]/);
      const reportId = extractReportId(reportRaw || "");
      if (!reportId) return;

      const fightIdFromUrl = isUrlInput
        ? (() => {
            const match = line.match(/[?&#]fight=(\d+)/i);
            return match?.[1] ? parseFightId(match[1]) : undefined;
          })()
        : undefined;
      const fightId = fightIdFromUrl ?? parseFightId(fightRaw);
      const key = `${reportId}-${fightId ?? "auto"}`;

      unique.set(key, {
        key,
        label: fightId ? `${reportId}:${fightId}` : reportId,
        target: {
          reportId,
          ...(fightId ? { fightId } : {}),
          preferKill: false,
          throughputStepSec,
        },
      });
    });

    return Array.from(unique.values());
  };

  const fetchAiAnalysis = async (summary: ClinicLogSummary): Promise<string> => {
    const aiRes = await fetch("/api/ai/log-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        failedLog: summary,
      }),
    });
    const aiData = await aiRes.json();
    if (!aiRes.ok) {
      throw new Error(aiData?.error || "AI 분석에 실패했습니다.");
    }
    return aiData.analysis || "분석 결과가 비어 있습니다.";
  };

  const analyzeLogs = async () => {
    setIsAnalysisLoading(true);
    setAnalysisError("");
    setClinicReports([]);

    try {
      const targets = parseClinicTargets(failedLogsInput, clinicSampleStepSec);
      if (targets.length === 0) {
        throw new Error("실패 로그를 1개 이상 입력해 주세요. (reportId 또는 reportId:fightId)");
      }

      const nextReports: Array<{ key: string; label: string; summary: ClinicLogSummary; analysis: string }> = [];
      for (const entry of targets) {
        const summary = await fetchClinicSummary(entry.target);
        const analysis = await fetchAiAnalysis(summary);
        nextReports.push({
          key: entry.key,
          label: entry.label,
          summary,
          analysis,
        });
      }
      setClinicReports(nextReports);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "공대 AI 분석 중 오류가 발생했습니다.";
      setAnalysisError(message);
    } finally {
      setIsAnalysisLoading(false);
    }
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

  const totalPlayersCount = players.length;
  const assignedPlayersCount = players.filter((p) => p.role !== "UNASSIGNED").length;
  const presentClassNames = new Set(
    players.map((p) => p.className).filter((className): className is string => Boolean(className))
  );

  return (
    <div className="min-h-screen p-8 bg-gray-900 text-white font-sans">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-yellow-400">Smart Raid Planner (SRP)</h1>

        <MainTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "ROSTER" && (
          <>

        {/* 1. 파티원 명단 */}
        <div className="mb-8 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
          <label className="block mb-2 text-gray-300 font-semibold">1. 파티원 명단 입력</label>
          <textarea
            className="w-full p-4 bg-gray-900 text-white border border-gray-600 rounded-md focus:outline-none focus:border-blue-500 resize-none"
            rows={3} value={inputText} onChange={(e) => setInputText(e.target.value)}
            placeholder={"닉네임-azshara\n가로쉬-azshara\n스랄-hyjal"}
          />
          <button
            onClick={fetchRaidData} disabled={isLoading}
            className="mt-4 w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-md font-bold"
          >
            {isLoading ? "데이터 로딩 중..." : "캐릭터 가져오기 및 자동 배치"}
          </button>
        </div>

        {/* 미분류 대기소 */}
        <div className="mb-3 flex justify-end">
          <div className="text-xs md:text-sm text-gray-300 bg-gray-800 border border-gray-600 rounded-md px-3 py-1">
            전체 <span className="font-bold text-white">{totalPlayersCount}</span>명 / 분류됨{" "}
            <span className="font-bold text-emerald-400">{assignedPlayersCount}</span>명
          </div>
        </div>

        <div className="mb-6">
          <RaidZone
            role="UNASSIGNED"
            title="❓ 미분류 대기소"
            bgColor="bg-gray-800/50"
            players={players}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            onRemovePlayer={removePlayer}
            onToggleDefensive={toggleDefensive}
            getClassColor={getClassColor}
          />
        </div>

        {/* 4분할 레이드 구역 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <RaidZone
            role="TANK"
            title="🛡️ 방어 전담 (Tank)"
            bgColor="bg-blue-900/20"
            players={players}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            onRemovePlayer={removePlayer}
            onToggleDefensive={toggleDefensive}
            getClassColor={getClassColor}
          />
          <RaidZone
            role="MELEE"
            title="⚔️ 근접 공격 (Melee)"
            bgColor="bg-orange-900/20"
            players={players}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            onRemovePlayer={removePlayer}
            onToggleDefensive={toggleDefensive}
            getClassColor={getClassColor}
          />
          <RaidZone
            role="RANGED"
            title="🏹 원거리 공격 (Ranged)"
            bgColor="bg-purple-900/20"
            players={players}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            onRemovePlayer={removePlayer}
            onToggleDefensive={toggleDefensive}
            getClassColor={getClassColor}
          />
          <RaidZone
            role="HEALER"
            title="💚 치유 전담 (Healer)"
            bgColor="bg-green-900/20"
            players={players}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            onRemovePlayer={removePlayer}
            onToggleDefensive={toggleDefensive}
            getClassColor={getClassColor}
          />
        </div>

        <div className="mb-10 p-6 md:p-7 rounded-2xl border-2 border-cyan-400/35 bg-linear-to-br from-gray-800 via-gray-800/95 to-gray-900 shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <div className="text-lg md:text-xl text-cyan-300 font-bold">직업 상태</div>
            <div className="text-xs md:text-sm text-gray-400">명단에 있는 직업은 직업색으로 표시됩니다.</div>
          </div>
          <div className="flex flex-wrap gap-3">
            {WOW_CLASSES.map((className) => {
              const hasClass = presentClassNames.has(className);
              const classColor = getClassColor(className);
              return (
                <span
                  key={className}
                  className="px-3 py-2 rounded-lg border text-sm md:text-base font-bold tracking-tight transition-all shadow-sm"
                  style={{
                    color: hasClass ? getReadableTextColor(classColor) : "#9CA3AF",
                    borderColor: hasClass ? classColor : "#4B5563",
                    backgroundColor: hasClass ? classColor : "rgba(75,85,99,0.18)",
                  }}
                >
                  {className}
                </span>
              );
            })}
          </div>
        </div>

          </>
        )}

        {activeTab === "TACTIC_EDITOR" && (
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
          />
        )}

        {activeTab === "RAID_AI_ANALYSIS" && (
          <ClinicAnalysisTab
            failedLogsInput={failedLogsInput}
            onFailedLogsInputChange={setFailedLogsInput}
            clinicSampleStepSec={clinicSampleStepSec}
            onClinicSampleStepSecChange={setClinicSampleStepSec}
            onAnalyze={analyzeLogs}
            isAnalysisLoading={isAnalysisLoading}
            analysisError={analysisError}
            clinicReports={clinicReports}
          />
        )}

        {activeTab === "RAID_MARKET" && (
          <RaidMarketTab />
        )}
      </div>
    </div>
  );
}


