"use client";

import { useState } from "react";
import { PlayerData, RoleType } from "@/app/types";
import RaidZone from "@/app/components/RaidZone";
import RosterManager from "@/app/components/RosterManager";
import PlayerCardSkeleton from "@/app/components/PlayerCardSkeleton";

const WOW_CLASSES = [
  "전사", "성기사", "사냥꾼", "도적", "사제", "죽음의 기사",
  "주술사", "마법사", "흑마법사", "수도사", "드루이드", "악마사냥꾼", "기원사",
] as const;

const getClassColor = (className?: string) => {
  const colors: Record<string, string> = {
    "전사": "#C69B6D", "성기사": "#F48CBA", "사냥꾼": "#ABD473", "도적": "#FFF468",
    "사제": "#FFFFFF", "죽음의 기사": "#C41E3A", "주술사": "#0070DE", "마법사": "#3FC7EB",
    "흑마법사": "#8788EE", "수도사": "#00FF98", "드루이드": "#FF7C0A",
    "악마사냥꾼": "#A330C9", "기원사": "#33937F",
  };
  return colors[className ?? ""] ?? "#CCCCCC";
};

const getReadableTextColor = (hexColor: string) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.65 ? "#111827" : "#F9FAFB";
};

interface RosterTabProps {
  inputText: string;
  onInputTextChange: (v: string) => void;
  players: PlayerData[];
  isLoading: boolean;
  skippedDuplicates: string[];
  onFetchRaidData: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, role: RoleType) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onRemovePlayer: (id: string) => void;
  onToggleDefensive: (playerId: string, skillName: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  TANK: "🛡️ 탱커",
  MELEE: "⚔️ 근접 딜러",
  RANGED: "🏹 원거리 딜러",
  HEALER: "💚 힐러",
  UNASSIGNED: "❓ 미분류",
};

function buildRosterText(players: PlayerData[]): string {
  const groups: Record<string, PlayerData[]> = {
    TANK: [], MELEE: [], RANGED: [], HEALER: [], UNASSIGNED: [],
  };
  players.forEach((p) => {
    const key = p.role in groups ? p.role : "UNASSIGNED";
    groups[key].push(p);
  });

  const lines: string[] = [`[SRP 공대 구성] 전체 ${players.length}명`, ""];
  (["TANK", "MELEE", "RANGED", "HEALER", "UNASSIGNED"] as const).forEach((role) => {
    const group = groups[role];
    if (group.length === 0) return;
    lines.push(`${ROLE_LABELS[role]} (${group.length})`);
    group.forEach((p) => {
      const spec = p.activeSpec ? ` · ${p.activeSpec}` : "";
      const ilvl = p.itemLevel ? ` | ${p.itemLevel}` : "";
      lines.push(`- ${p.name}${spec}${ilvl}`);
    });
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

export default function RosterTab({
  inputText, onInputTextChange, players, isLoading, skippedDuplicates,
  onFetchRaidData, onDragOver, onDrop, onDragStart, onRemovePlayer, onToggleDefensive,
}: RosterTabProps) {
  const [copyLabel, setCopyLabel] = useState("구성 복사");
  const totalPlayersCount = players.length;
  const assignedPlayersCount = players.filter((p) => p.role !== "UNASSIGNED").length;
  const presentClassNames = new Set(
    players.map((p) => p.className).filter((c): c is string => Boolean(c))
  );

  const handleCopyRoster = async () => {
    if (players.length === 0) return;
    const text = buildRosterText(players);
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("복사됨 ✓");
      setTimeout(() => setCopyLabel("구성 복사"), 2000);
    } catch {
      setCopyLabel("실패");
      setTimeout(() => setCopyLabel("구성 복사"), 2000);
    }
  };

  return (
    <>
      {/* 파티원 명단 입력 */}
      <div className="mb-8 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <div className="flex justify-between items-start gap-4 mb-2">
          <label className="block text-gray-300 font-semibold">
            1. 파티원 명단 입력
            <span className="text-gray-500 text-xs font-normal block mt-1">(이름-서버명 한 줄에 하나씩)</span>
          </label>
          <RosterManager currentText={inputText} onSelectRoster={onInputTextChange} />
        </div>
        <textarea
          className="w-full p-4 bg-gray-900 text-white border border-gray-600 rounded-md focus:outline-none focus:border-blue-500 resize-none"
          rows={3}
          value={inputText}
          onChange={(e) => onInputTextChange(e.target.value)}
          placeholder={"닉네임-azshara\n가로쉬-azshara\n스랄-hyjal"}
        />
        <button
          onClick={onFetchRaidData}
          disabled={isLoading}
          className="mt-4 w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-md font-bold"
        >
          {isLoading ? "데이터 로딩 중..." : "캐릭터 가져오기 및 자동 배치"}
        </button>
        {skippedDuplicates.length > 0 && (
          <div className="mt-2 px-4 py-2 bg-yellow-900/40 border border-yellow-700 rounded-md text-yellow-300 text-sm">
            이미 추가된 캐릭터 스킵: {skippedDuplicates.join(", ")}
          </div>
        )}
        {/* 로딩 스켈레톤 */}
        {isLoading && (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <PlayerCardSkeleton key={i} />
            ))}
          </div>
        )}
      </div>

      {/* 인원 카운터 + 구성 복사 */}
      <div className="mb-3 flex justify-end items-center gap-2">
        <button
          onClick={handleCopyRoster}
          disabled={players.length === 0}
          className="text-xs md:text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-300 border border-gray-600 rounded-md transition-colors"
        >
          📋 {copyLabel}
        </button>
        <div className="text-xs md:text-sm text-gray-300 bg-gray-800 border border-gray-600 rounded-md px-3 py-1">
          전체 <span className="font-bold text-white">{totalPlayersCount}</span>명 / 분류됨{" "}
          <span className="font-bold text-emerald-400">{assignedPlayersCount}</span>명
        </div>
      </div>

      {/* 미분류 대기소 */}
      <div className="mb-6">
        <RaidZone
          role="UNASSIGNED" title="❓ 미분류 대기소" bgColor="bg-gray-800/50"
          players={players} onDragOver={onDragOver} onDrop={onDrop} onDragStart={onDragStart}
          onRemovePlayer={onRemovePlayer} onToggleDefensive={onToggleDefensive} getClassColor={getClassColor}
        />
      </div>

      {/* 4분할 레이드 구역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {([
          { role: "TANK", title: "🛡️ 방어 전담 (Tank)", bgColor: "bg-blue-900/20" },
          { role: "MELEE", title: "⚔️ 근접 공격 (Melee)", bgColor: "bg-orange-900/20" },
          { role: "RANGED", title: "🏹 원거리 공격 (Ranged)", bgColor: "bg-purple-900/20" },
          { role: "HEALER", title: "💚 치유 전담 (Healer)", bgColor: "bg-green-900/20" },
        ] as const).map(({ role, title, bgColor }) => (
          <RaidZone
            key={role} role={role} title={title} bgColor={bgColor}
            players={players} onDragOver={onDragOver} onDrop={onDrop} onDragStart={onDragStart}
            onRemovePlayer={onRemovePlayer} onToggleDefensive={onToggleDefensive} getClassColor={getClassColor}
          />
        ))}
      </div>

      {/* 직업 상태 */}
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
  );
}
