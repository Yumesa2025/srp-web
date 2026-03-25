"use client";

import { useState } from "react";
import { PlayerData } from "@/app/types";

interface PlayerCardProps {
  onDragStart: (e: React.DragEvent, id: string) => void;
  onRemovePlayer: (playerId: string) => void;
  getClassColor: (className?: string) => string;
  player: PlayerData;
}

const getRoleBadgeColor = (role: PlayerData["role"]) => {
  switch (role) {
    case "TANK":
      return "bg-blue-600 text-white border-blue-400";
    case "HEALER":
      return "bg-green-600 text-white border-green-400";
    case "MELEE":
      return "bg-red-600 text-white border-red-400";
    case "RANGED":
      return "bg-purple-600 text-white border-purple-400";
    default:
      return "bg-gray-600 text-gray-200 border-gray-500";
  }
};

const getWarcraftLogsCharacterUrl = (realm: string, name: string) => {
  const encodedRealm = encodeURIComponent(realm.trim());
  const encodedName = encodeURIComponent(name.trim());
  return `https://ko.warcraftlogs.com/character/kr/${encodedRealm}/${encodedName}`;
};

const hasAnyWclScore = (details?: PlayerData["bestPerfDetails"] | null) => {
  if (!details) return false;
  return [details.normal, details.heroic, details.mythic].some(
    (value) => typeof value === "number" && Number.isFinite(value)
  );
};

const formatWclScore = (value?: number | null) => {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "-";
};

export default function PlayerCard({
  onDragStart,
  onRemovePlayer,
  getClassColor,
  player: p,
}: PlayerCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, p.id)}
      className={`p-4 cursor-grab active:cursor-grabbing rounded-lg border shadow-md transition-all ${p.error ? "bg-gray-800 border-gray-700" : "bg-gray-800 border-gray-500 hover:border-blue-400"}`}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {p.error ? (
              <span
                className="font-bold text-2xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate"
                style={{ color: getClassColor(p.className) }}
              >
                {p.name}
              </span>
            ) : (
              <a
                href={getWarcraftLogsCharacterUrl(p.realm, p.name)}
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
                className="font-bold text-2xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate hover:underline hover:brightness-125 transition-colors"
                style={{ color: getClassColor(p.className) }}
                title="Warcraft Logs 캐릭터 페이지 열기"
              >
                {p.name}
              </a>
            )}
            {p.activeSpec && (
              <span className={`text-sm px-2 py-0.5 rounded border shadow-sm font-semibold whitespace-nowrap ${getRoleBadgeColor(p.role)}`}>
                {p.activeSpec}
              </span>
            )}
          </div>
          {p.error && <p className="text-base text-red-400 font-semibold mt-1">{p.error}</p>}
          {!p.error && (
            <div className="text-base text-gray-400 mt-1 font-mono flex flex-wrap gap-x-3 gap-y-1">
              {p.itemLevel !== undefined && (
                <span>
                  템렙: <span className="text-yellow-400">{p.itemLevel}</span>
                </span>
              )}
              {hasAnyWclScore(p.bestPerfDetails) ? (
                <span className="basis-full text-cyan-300">
                  WCL {p.bestPerfDetails?.raidName || "레이드 미상"} | 일반 {formatWclScore(p.bestPerfDetails?.normal)} / 영웅 {formatWclScore(p.bestPerfDetails?.heroic)} / 신화 {formatWclScore(p.bestPerfDetails?.mythic)}
                </span>
              ) : typeof p.bestPerfAvg === "number" ? (
                <span>
                  Best Perf. Avg: <span className="text-cyan-300">{p.bestPerfAvg.toFixed(1)}</span>
                </span>
              ) : null}
              {p.health !== undefined && (
                <span>
                  체력: <span className="text-green-400">{Math.round(p.health / 10000)}만</span>
                </span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onBlur={() => setConfirmDelete(false)}
          onClick={(e) => {
            e.stopPropagation();
            if (!confirmDelete) { setConfirmDelete(true); return; }
            onRemovePlayer(p.id);
          }}
          className={`shrink-0 rounded-full border text-xs font-bold transition-colors ${
            confirmDelete
              ? "px-2 h-6 border-red-500 bg-red-600 text-white"
              : "w-6 h-6 border-red-500/60 text-red-300 hover:text-white hover:bg-red-600/70"
          }`}
          title={confirmDelete ? "한 번 더 클릭하면 삭제" : "파티원 삭제"}
        >
          {confirmDelete ? "확인" : "✕"}
        </button>
      </div>
    </div>
  );
}
