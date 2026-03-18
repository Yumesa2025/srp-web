export type RoleType = "UNASSIGNED" | "TANK" | "MELEE" | "RANGED" | "HEALER";
export type MainTab = "ROSTER" | "TACTIC_EDITOR" | "RAID_AI_ANALYSIS" | "RAID_MARKET";

export interface DefensiveState {
  name: string;
  isActive: boolean;
}

export interface WclBestPerfDetails {
  raidName: string | null;
  normal: number | null;
  heroic: number | null;
  mythic: number | null;
  metric: string | null;
}

export interface PlayerData {
  id: string;
  name: string;
  realm: string;
  realmName?: string;
  health?: number;
  armor?: number;
  versatility?: number;
  activeSpec?: string;
  talents?: string[];
  defensives?: DefensiveState[];
  role: RoleType;
  itemLevel?: number;
  className?: string;
  bestPerfAvg?: number | null;
  bestPerfDetails?: WclBestPerfDetails | null;
  error?: string;
}
