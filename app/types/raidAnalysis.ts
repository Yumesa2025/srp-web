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
  actorId: number;
  dpsPotion: string | null;       // 사용한 공격물약 이름 (미사용 시 null)
  healthstone: boolean;
  healingPotion: string | null;   // 사용한 치유물약 이름 (미사용 시 null)
}

export interface DpsPlayerData {
  name: string;
  actorId: number;
  totalDamage: number;
  avgDps: number;
  maxDps: number;
  bloodlustAvgDps: number | null;  // 블러드러스트 구간 평균 DPS
  timeline: { sec: number; dps: number }[];
}

export interface HpsPlayerData {
  name: string;
  actorId: number;
  totalHealing: number;
  avgHps: number;
  maxHps: number;
  bloodlustAvgHps: number | null;
  timeline: { sec: number; hps: number }[];
}

export interface BloodlustEvent {
  ability: string;
  timeSec: number;
  timeStr: string;
}

export interface DefensiveUsagePlayer {
  name: string;
  actorId: number;
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
  hpsPlayers: HpsPlayerData[];
  bloodlusts: BloodlustEvent[];
  defensiveUsage: DefensiveUsagePlayer[];
}
