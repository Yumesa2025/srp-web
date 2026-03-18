"use client";

import { useState } from "react";
import { PlayerData, RoleType } from "@/app/types";
import { ALL_DEFENSIVE_SKILLS } from "@/app/constants/defensiveSkills";

// 전문화 이름으로 역할을 자동 유추 (한국어 클라이언트 기준)
export function guessRole(spec?: string): RoleType {
  if (!spec) return "UNASSIGNED";
  const tanks   = ["방어", "수호", "혈기", "양조", "복수", "보호"];
  const healers  = ["신성", "복원", "운무", "수양", "보존"];
  const melee    = ["무기", "분노", "징벌", "암살", "무법", "잠행", "야성", "생존", "풍운", "파멸", "고양"];
  const ranged   = ["비전", "화염", "냉기", "고통", "악마", "파괴", "조화", "야수", "사격", "암흑", "정기", "황폐"];

  if (tanks.includes(spec))   return "TANK";
  if (healers.includes(spec)) return "HEALER";
  if (melee.includes(spec))   return "MELEE";
  if (ranged.includes(spec))  return "RANGED";
  return "UNASSIGNED";
}

// 캐릭터의 실제 피격 데미지와 생사 여부를 계산
export function calcDamage(player: PlayerData, bossDamage: number) {
  if (!player.health || player.armor === undefined) {
    return { isDead: false, actualDamage: 0, remainingHealth: 0 };
  }
  const armorReduction = player.armor / (player.armor + 15000);
  const versReduction  = (player.versatility || 0) / 400;
  const actualDamage   = bossDamage * (1 - armorReduction) * (1 - versReduction);
  const remainingHealth = player.health - actualDamage;
  return {
    isDead: remainingHealth <= 0,
    actualDamage,
    remainingHealth,
  };
}

// 메인 상태 관리 훅
export function useRaidPlanner() {
  const [inputText, setInputText]           = useState("");
  const [players, setPlayers]               = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading]           = useState(false);
  const [bossDamage, setBossDamage]         = useState<number>(5000000);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

  // 블리자드 API에서 캐릭터 데이터 수집
  const fetchRaidData = async () => {
    setIsLoading(true);
    setPlayers([]);

    const lines = inputText.trim().split("\n");
    const newPlayers: PlayerData[] = [];

    for (const line of lines) {
      if (!line) continue;

      const [name, realm] = line.split("-");
      const id = `${name}-${realm}`;

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
          newPlayers.push({
            id,
            name:        data.name,
            realm,
            health:      data.health,
            armor:       data.armor,
            versatility: data.versatility,
            activeSpec:  data.activeSpec,
            talents:     data.talents,
            role:        guessRole(data.activeSpec),
          });
        }
      } catch {
        newPlayers.push({ id, name, realm, role: "UNASSIGNED", error: "통신 에러" });
      }
    }

    setPlayers(newPlayers);
    setIsLoading(false);
  };

  // 드래그 앤 드랍 핸들러
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
    setPlayers((prev) =>
      prev.map((p) => (p.id === draggedPlayerId ? { ...p, role: targetRole } : p))
    );
    setDraggedPlayerId(null);
  };

  // 특성 목록에서 생존기만 필터링
  const getDefensives = (talents?: string[]) =>
    talents?.filter((t) => ALL_DEFENSIVE_SKILLS.has(t)) ?? [];

  return {
    inputText,   setInputText,
    players,
    isLoading,
    bossDamage,  setBossDamage,
    fetchRaidData,
    handleDragStart,
    handleDragOver,
    handleDrop,
    getDefensives,
  };
}
