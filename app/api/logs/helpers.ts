import { ALL_DEFENSIVE_SKILLS } from "@/app/constants/defensiveSkills";

export interface WclFightNode {
  id: number;
  name: string;
  startTime: number;
  endTime: number;
  kill?: boolean;
  bossPercentage?: number;
  size?: number;
  difficulty?: number;
}

export interface WclAbilityNode {
  gameID: number;
  name: string;
}

export interface WclActorNode {
  id: number;
  name: string;
  type?: string;
  subType?: string;
  petOwner?: number | null;
}

export interface WclEventNode {
  type?: string;
  timestamp?: number;
  sourceID?: number;
  targetID?: number;
  abilityGameID?: number;
  ability?: { guid?: number; name?: string };
  amount?: number;
  unmitigatedAmount?: number;
  absorbed?: number;
  specID?: number;
  hitPoints?: number;
  maxHitPoints?: number;
  targetResources?: Array<{ type?: number; amount?: number; max?: number }>;
}

interface WclGraphQlPayload {
  errors?: { message?: string }[];
  data?: {
    reportData?: {
      report?: {
        startTime?: number;
        fights?: WclFightNode[];
        masterData?: {
          abilities?: WclAbilityNode[];
          actors?: WclActorNode[];
        };
        events?: {
          data?: WclEventNode[];
          nextPageTimestamp?: number;
        };
      };
    };
  };
}

export type WclDataType = "Deaths" | "Casts" | "DamageDone" | "Healing" | "CombatantInfo";
export type WclHostilityType = "Enemies" | "Friendlies";

export interface DeathSummary {
  playerName: string;
  time: string;
  timeSec: number;
  ability: string;
  damage: number | null;
  hpPercentBefore: number | null;
  defensives: string[];
  nearbyBossSkills: string[];
}

export interface PlayerInsight {
  playerName: string;
  deaths: number;
  firstDeathTime: string | null;
  lastDeathTime: string | null;
  avgHpBeforeDeath: number | null;
  defensiveMissingCount: number;
  defensiveUseRate: number | null;
  topCauses: Array<{ ability: string; count: number }>;
  nearbyBossSkills: Array<{ ability: string; count: number }>;
  deathTimes: string[];
  risk: "HIGH" | "MEDIUM" | "LOW";
  notes: string[];
}

export type ConsumableType = "HEALTHSTONE" | "HEALING_POTION" | "DPS_POTION";
export type ConsumableSource = "env_override" | "built_in_override" | "name_guess";

const CONSUMABLE_SPELL_ID_OVERRIDES: Record<number, ConsumableType> = {
  // Healthstone
  6262: "HEALTHSTONE",
};

const parseConsumableOverrideEnv = () => {
  const raw = process.env.WCL_CONSUMABLE_SPELL_OVERRIDES;
  if (!raw) return {};

  // Format: "6262:HEALTHSTONE,12345:HEALING_POTION,67890:DPS_POTION"
  const out: Record<number, ConsumableType> = {};
  raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .forEach((token) => {
      const [idRaw, typeRaw] = token.split(":").map((v) => v.trim());
      const id = Number(idRaw);
      if (!Number.isFinite(id) || id <= 0) return;
      if (typeRaw === "HEALTHSTONE" || typeRaw === "HEALING_POTION" || typeRaw === "DPS_POTION") {
        out[Math.floor(id)] = typeRaw;
      }
    });
  return out;
};

const CONSUMABLE_SPELL_ID_OVERRIDES_FROM_ENV = parseConsumableOverrideEnv();

const EXTRA_DEFENSIVE_ALIASES = [
  "power word: barrier",
  "pain suppression",
  "guardian spirit",
  "blessing of sacrifice",
  "blessing of protection",
  "aura mastery",
  "revival",
  "tranquility",
  "divine hymn",
  "healing tide totem",
  "spirit link totem",
  "anti-magic zone",
  "rallying cry",
  "darkness",
  "zephyr",
  "rewind",
  "time dilation",
  "ironbark",
];

export const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

export const DEFENSIVE_NAME_SET = new Set(
  [...ALL_DEFENSIVE_SKILLS, ...EXTRA_DEFENSIVE_ALIASES].map((name) => normalizeName(name))
);

export const classifyConsumable = (
  event: WclEventNode,
  abilityName: string
): { type: ConsumableType; source: ConsumableSource } | null => {
  const abilityId = typeof event.abilityGameID === "number"
    ? event.abilityGameID
    : typeof event.ability?.guid === "number"
      ? event.ability.guid
      : null;
  if (abilityId !== null) {
    if (CONSUMABLE_SPELL_ID_OVERRIDES_FROM_ENV[abilityId]) {
      return { type: CONSUMABLE_SPELL_ID_OVERRIDES_FROM_ENV[abilityId], source: "env_override" };
    }
    if (CONSUMABLE_SPELL_ID_OVERRIDES[abilityId]) {
      return { type: CONSUMABLE_SPELL_ID_OVERRIDES[abilityId], source: "built_in_override" };
    }
  }

  const normalized = normalizeName(abilityName);
  const hasPotionWord = normalized.includes("물약") || normalized.includes("potion");

  if (normalized.includes("생명석") || normalized.includes("healthstone")) {
    return { type: "HEALTHSTONE", source: "name_guess" };
  }
  if (
    normalized.includes("치유물약") ||
    normalized.includes("healingpotion") ||
    normalized.includes("healing") && hasPotionWord
  ) {
    return { type: "HEALING_POTION", source: "name_guess" };
  }
  if (
    hasPotionWord &&
    !normalized.includes("치유") &&
    !normalized.includes("healing") &&
    !normalized.includes("mana") &&
    !normalized.includes("마나")
  ) {
    return { type: "DPS_POTION", source: "name_guess" };
  }
  return null;
};

/** 이벤트 배열을 type으로 필터링하고 timestamp 오름차순으로 정렬 */
export const filterAndSort = (events: WclEventNode[], type?: string): WclEventNode[] =>
  (events as WclEventNode[])
    .filter((e) => (!type || e.type === type) && typeof e.timestamp === "number")
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

/** 전투 시작 시간 기준으로 이벤트 timestamp를 초 단위로 변환 */
export const toFightSec = (timestamp: number, fightStartTime: number): number =>
  Math.max(0, Math.floor((timestamp - fightStartTime) / 1000));

/**
 * 문자열 배열에서 각 항목의 빈도를 집계하고 내림차순으로 limit개 반환
 * @returns [{ name, count }]
 */
export const countAndRank = (items: string[], limit: number): { name: string; count: number }[] =>
  Array.from(
    items.reduce((acc, item) => acc.set(item, (acc.get(item) || 0) + 1), new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));

/** 초 단위 Map에서 특정 초의 값을 1 증가 */
export const incrementSecMap = (map: Map<number, number>, sec: number): void => {
  map.set(sec, (map.get(sec) || 0) + 1);
};

export const pushAmountToSecMap = (map: Map<number, number>, sec: number, amount: number | null | undefined) => {
  if (!Number.isFinite(sec) || sec < 0) return;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return;
  map.set(sec, (map.get(sec) || 0) + amount);
};

export const secondsToTime = (sec: number) => {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export const getAbilityName = (event: WclEventNode, abilityMap: Map<number, string>) => {
  if (typeof event.abilityGameID === "number") {
    return abilityMap.get(event.abilityGameID) || `알 수 없는 스킬 (${event.abilityGameID})`;
  }
  if (typeof event.ability?.guid === "number") {
    return abilityMap.get(event.ability.guid) || event.ability.name || `알 수 없는 스킬 (${event.ability.guid})`;
  }
  if (event.ability?.name) return event.ability.name;
  return "알 수 없는 스킬";
};

export const getHpPercentBefore = (event: WclEventNode): number | null => {
  if (typeof event.hitPoints === "number" && typeof event.maxHitPoints === "number" && event.maxHitPoints > 0) {
    return Number(((event.hitPoints / event.maxHitPoints) * 100).toFixed(1));
  }
  const healthResource = event.targetResources?.find((resource) => resource?.type === 0);
  if (
    healthResource &&
    typeof healthResource.amount === "number" &&
    typeof healthResource.max === "number" &&
    healthResource.max > 0
  ) {
    return Number(((healthResource.amount / healthResource.max) * 100).toFixed(1));
  }
  return null;
};

export const getDamage = (event: WclEventNode): number | null => {
  if (typeof event.amount === "number") return event.amount;
  if (typeof event.unmitigatedAmount === "number") return event.unmitigatedAmount;
  return null;
};

export const pickFight = (fights: WclFightNode[], fightId?: number, preferKill = false) => {
  if (fightId) {
    return fights.find((fight) => fight.id === fightId) || null;
  }
  const sorted = [...fights].sort((a, b) => b.endTime - a.endTime);
  if (preferKill) {
    return sorted.find((fight) => Boolean(fight.kill)) || sorted[0] || null;
  }
  return sorted.find((fight) => !fight.kill) || sorted[0] || null;
};

export const detectWipeTailStart = (deathSeconds: number[], fightDurationSec: number) => {
  if (deathSeconds.length < 6) return null;
  const windowSec = 5;
  const threshold = 6;
  const tailFloorSec = Math.max(Math.floor(fightDurationSec * 0.75), fightDurationSec - 40);

  for (let i = 0; i < deathSeconds.length; i += 1) {
    const start = deathSeconds[i];
    let count = 1;
    for (let j = i + 1; j < deathSeconds.length; j += 1) {
      if (deathSeconds[j] - start <= windowSec) {
        count += 1;
      } else {
        break;
      }
    }
    if (count >= threshold && start >= tailFloorSec) {
      return { startSec: start, windowSec, clusterDeaths: count };
    }
  }
  return null;
};

export const fetchWclGraphQL = async (
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<WclGraphQlPayload> => {
  const response = await fetch("https://www.warcraftlogs.com/api/v2/client", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(`WCL GraphQL HTTP ${response.status}: ${rawText.slice(0, 500)}`);
  }

  try {
    return JSON.parse(rawText) as WclGraphQlPayload;
  } catch {
    throw new Error(`WCL GraphQL JSON 파싱 실패: ${rawText.slice(0, 500)}`);
  }
};

export const fetchPagedEvents = async (params: {
  accessToken: string;
  reportId: string;
  fightId: number;
  dataType: WclDataType;
  startTime: number;
  endTime: number;
  hostilityType?: WclHostilityType;
  limit?: number;
  maxPages?: number;
}) => {
  const {
    accessToken,
    reportId,
    fightId,
    dataType,
    startTime,
    endTime,
    hostilityType,
    limit = 10000,
    maxPages = 60,
  } = params;

  let pageStart = startTime;
  let pages = 0;
  const allEvents: WclEventNode[] = [];

  // dataType and hostilityType are GraphQL enums — kept inline since they're hardcoded
  while (pageStart < endTime && pages < maxPages) {
    const hostilityClause = hostilityType ? `hostilityType: ${hostilityType},` : "";
    const query = `
      query($code: String!, $fightIDs: [Int]!, $start: Float!, $end: Float!, $limit: Int!) {
        reportData {
          report(code: $code) {
            events(
              fightIDs: $fightIDs,
              dataType: ${dataType},
              ${hostilityClause}
              startTime: $start,
              endTime: $end,
              limit: $limit
            ) {
              data
              nextPageTimestamp
            }
          }
        }
      }
    `;
    const variables = { code: reportId, fightIDs: [fightId], start: pageStart, end: endTime, limit };

    const payload = await fetchWclGraphQL(accessToken, query, variables);
    if (payload?.errors?.length) {
      throw new Error(payload.errors[0].message || `${dataType} 이벤트 조회 실패`);
    }

    const node = payload?.data?.reportData?.report?.events;
    const chunk = (node?.data || []) as WclEventNode[];
    const nextPageTimestamp = typeof node?.nextPageTimestamp === "number" ? node.nextPageTimestamp : null;
    allEvents.push(...chunk);

    if (!nextPageTimestamp || nextPageTimestamp <= pageStart || nextPageTimestamp >= endTime) {
      break;
    }

    pageStart = nextPageTimestamp;
    pages += 1;
  }

  return allEvents;
};
