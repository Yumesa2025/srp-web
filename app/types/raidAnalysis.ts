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
  timeSec: number;
  timeStr: string;
  cause: string;
  hpBefore: number | null;
  defensivesUsed: string[];
  isSkipped: boolean;
  skipReason?: string;
}

export interface ConsumableRow {
  name: string;
  dpsPotion: boolean;
  healthstone: boolean;
  healingPotion: boolean;
}

export interface DpsPlayerData {
  name: string;
  totalDamage: number;
  avgDps: number;
  maxDps: number;
  timeline: { sec: number; dps: number }[];
}

export interface BloodlustEvent {
  ability: string;
  timeSec: number;
  timeStr: string;
}

export interface DefensiveUsagePlayer {
  name: string;
  casts: { ability: string; timeSec: number; timeStr: string }[];
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
  dpsPlayers: DpsPlayerData[];
  bloodlusts: BloodlustEvent[];
  defensiveUsage: DefensiveUsagePlayer[];
}
