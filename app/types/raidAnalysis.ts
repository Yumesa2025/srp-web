export interface DefensiveEntry {
  id?: number;    // spell ID for exact matching
  name: string;   // display name
}

export interface RaidFight {
  id: number;
  name: string;
  durationSec: number;
  kill: boolean;
  bossPercentage: number | null;
  startTime: number;
  endTime: number;
}

export interface EarlyDeath {
  rank: number;
  playerName: string;
  actorId: number;
  className?: string;
  specId?: number;
  timeSec: number;
  timeStr: string;
  cause: string;
  causeIconUrl?: string;
  hpBefore: number | null;
  defensivesUsed: string[];
  isSkipped: boolean;
  skipReason?: string;
}

export interface ConsumableRow {
  name: string;
  actorId: number;
  className?: string;
  specId?: number;
  dpsPotion: string | null;
  healthstone: boolean;
  healingPotion: string | null;
  augmentRune: string | null;
}

export interface AllPlayerData {
  name: string;
  actorId: number;
  className?: string;
  specId?: number;
  totalDamage: number;
  avgDps: number;
  maxDps: number;
  bloodlustAvgDps: number | null;
  dpsTimeline: { sec: number; dps: number }[];
  totalHealing: number;
  avgHps: number;
  maxHps: number;
  bloodlustAvgHps: number | null;
  hpsTimeline: { sec: number; hps: number }[];
  defensiveCasts: { ability: string; timeSec: number; spellId?: number; iconUrl?: string }[];
  piTimings: number[];  // Power Infusion received timestamps
}

export interface BloodlustEvent {
  ability: string;
  timeSec: number;
  timeStr: string;
}

export interface DefensiveUsagePlayer {
  name: string;
  actorId: number;
  className?: string;
  specId?: number;
  casts: { ability: string; timeSec: number; timeStr: string; spellId?: number; iconUrl?: string }[];
}

export interface RaidAnalysisResult {
  fight: {
    id: number;
    name: string;
    durationSec: number;
    kill: boolean;
    bossPercentage: number | null;
  };
  wclUrl: string;
  reportCode: string;
  earlyDeaths: EarlyDeath[];
  consumables: ConsumableRow[];
  allPlayers: AllPlayerData[];
  bloodlusts: BloodlustEvent[];
  defensiveUsage: DefensiveUsagePlayer[];
}
