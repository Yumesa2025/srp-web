// helpers.ts의 DeathSummary와 동일하므로 re-export해 재사용
export type { DeathSummary as ClinicDeathSummary, PlayerInsight as ClinicPlayerInsight } from "@/app/api/logs/helpers";
import type { DeathSummary, PlayerInsight } from "@/app/api/logs/helpers";

export interface ClinicLogTarget {
  reportId: string;
  fightId?: number;
  preferKill?: boolean;
  throughputStepSec?: number;
}

export interface ClinicLogSummary {
  reportId: string;
  fight: {
    id: number;
    name: string;
    kill: boolean;
    durationSec: number;
    bossPercentage: number | null;
  };
  totalDeaths: number;
  meaningfulDeathsCount: number;
  excludedTailDeaths: number;
  deathStartSec: number | null;
  wipeTail: {
    detected: boolean;
    startSec: number | null;
    windowSec: number;
    clusterDeaths: number;
    tailDeaths: number;
  };
  topCauses: { ability: string; count: number }[];
  playerDeaths: { name: string; count: number }[];
  defensiveMissingCount: number;
  perPlayer: PlayerInsight[];
  consumables: {
    timeline: {
      time: string;
      timeSec: number;
      playerName: string;
      ability: string;
      type: "HEALTHSTONE" | "HEALING_POTION" | "DPS_POTION";
    }[];
    perPlayer: {
      playerName: string;
      healthstone: number;
      healingPotion: number;
      dpsPotion: number;
    }[];
    spellIdInsights: {
      spellId: number;
      ability: string;
      inferredType: "HEALTHSTONE" | "HEALING_POTION" | "DPS_POTION";
      source: "env_override" | "built_in_override" | "name_guess";
      count: number;
    }[];
    recommendedOverrides: string;
    unclassifiedCandidates: {
      spellId: number | null;
      ability: string;
      count: number;
    }[];
    missing: {
      healthstone: string[];
      healingPotion: string[];
      dpsPotion: string[];
    };
    totals: {
      healthstone: number;
      healingPotion: number;
      dpsPotion: number;
    };
  };
  throughputTimeline: {
    sec: number;
    time: string;
    damage: number;
    healing: number;
    dps: number;
    hps: number;
  }[];
  throughputStepSec: number;
  firstMeaningfulDeaths: DeathSummary[];
  bossCoverage: {
    time: string;
    timeSec: number;
    ability: string;
    defensiveCount: number;
    defensives: string[];
    covered: boolean;
  }[];
  deathTimeline: { sec: number; time: string; deaths: number; cumulativeDeaths: number }[];
  castTimeline: {
    sec: number;
    time: string;
    bossCasts: number;
    defensiveCasts: number;
    deaths: number;
    cumulativeDeaths: number;
  }[];
  deaths: DeathSummary[];
}

export interface ClinicReportItem {
  key: string;
  label: string;
  summary: ClinicLogSummary;
  analysis: string;
}
