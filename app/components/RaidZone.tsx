"use client";

import { PlayerData, RoleType } from "@/app/types";
import PlayerCard from "./PlayerCard";

interface RaidZoneProps {
  role: RoleType;
  title: string;
  bgColor: string;
  players: PlayerData[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, role: RoleType) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onToggleDefensive: (playerId: string, skillName: string) => void;
  getClassColor: (className?: string) => string;
}

export default function RaidZone({
  role,
  title,
  bgColor,
  players,
  onDragOver,
  onDrop,
  onDragStart,
  onRemovePlayer,
  onToggleDefensive,
  getClassColor,
}: RaidZoneProps) {
  const zonePlayers = players.filter((p) => p.role === role);

  return (
    <div
      className={`flex flex-col rounded-xl border-2 border-dashed border-gray-600 p-4 min-h-[250px] ${bgColor} transition-colors`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, role)}
    >
      <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2 text-gray-200">
        {title} ({zonePlayers.length}명)
      </h2>

      <div className="flex flex-col gap-3">
        {zonePlayers.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            onDragStart={onDragStart}
            onRemovePlayer={onRemovePlayer}
            onToggleDefensive={onToggleDefensive}
            getClassColor={getClassColor}
          />
        ))}

        {zonePlayers.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-10">
            여기로 카드를 드래그하세요.
          </p>
        )}
      </div>
    </div>
  );
}
