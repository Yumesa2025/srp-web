"use client";

import { PlayerData } from "@/app/types";

interface PlayerCardProps {
  onDragStart: (e: React.DragEvent, id: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onToggleDefensive: (playerId: string, skillName: string) => void;
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
  onToggleDefensive,
  getClassColor,
  player: p,
}: PlayerCardProps) {
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
                className="font-bold text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate"
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
                className="font-bold text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate hover:underline hover:brightness-125 transition-colors"
                style={{ color: getClassColor(p.className) }}
                title="Warcraft Logs 캐릭터 페이지 열기"
              >
                {p.name}
              </a>
            )}
            {p.activeSpec && (
              <span className={`text-xs px-2 py-0.5 rounded border shadow-sm font-semibold whitespace-nowrap ${getRoleBadgeColor(p.role)}`}>
                {p.activeSpec}
              </span>
            )}
          </div>
          {p.error && <p className="text-red-400 text-xs font-semibold mt-1">{p.error}</p>}
          {!p.error && (
            <div className="text-xs text-gray-400 mt-1 font-mono flex flex-wrap gap-x-3 gap-y-1">
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
          onClick={(e) => {
            e.stopPropagation();
            onRemovePlayer(p.id);
          }}
          className="shrink-0 w-6 h-6 rounded-full border border-red-500/60 text-red-300 hover:text-white hover:bg-red-600/70 transition-colors text-xs font-bold"
          title="파티원 삭제"
        >
          ✕
        </button>
      </div>

      {!p.error && p.defensives && p.defensives.length > 0 && (
        <div className="pt-2 mt-2 border-t border-gray-600/50 flex flex-wrap gap-1">
          {p.defensives.map((d, i) => (
            <button
              key={i}
              onClick={() => onToggleDefensive(p.id, d.name)}
              className={`text-xs px-2 py-1 rounded-md shadow transition-colors ${
                d.isActive
                  ? "bg-blue-800 text-blue-100 border border-blue-500 hover:bg-blue-700"
                  : "bg-gray-700 text-gray-500 border border-gray-600 opacity-50 line-through hover:bg-gray-600"
              }`}
              title="클릭하여 AI 택틱 사용 여부 토글"
            >
              🛡️ {d.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
