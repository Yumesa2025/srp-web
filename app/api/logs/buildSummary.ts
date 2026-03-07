import {
  classifyConsumable,
  ConsumableSource,
  ConsumableType,
  countAndRank,
  DeathSummary,
  DEFENSIVE_NAME_SET,
  detectWipeTailStart,
  filterAndSort,
  getAbilityName,
  getDamage,
  getHpPercentBefore,
  incrementSecMap,
  normalizeName,
  PlayerInsight,
  pushAmountToSecMap,
  secondsToTime,
  toFightSec,
  WclAbilityNode,
  WclActorNode,
  WclEventNode,
  WclFightNode,
} from "./helpers";

interface BuildSummaryParams {
  reportId: string;
  selectedFight: WclFightNode;
  throughputStepSec: number;
  abilities: WclAbilityNode[];
  actors: WclActorNode[];
  rawDeathEvents: WclEventNode[];
  rawEnemyCastEvents: WclEventNode[];
  rawFriendlyCastEvents: WclEventNode[];
  rawDamageEvents: WclEventNode[];
  rawHealingEvents: WclEventNode[];
}

export const buildLogSummary = ({
  reportId,
  selectedFight,
  throughputStepSec,
  abilities,
  actors,
  rawDeathEvents,
  rawEnemyCastEvents,
  rawFriendlyCastEvents,
  rawDamageEvents,
  rawHealingEvents,
}: BuildSummaryParams) => {
  const abilityMap = new Map<number, string>();
  const actorMap = new Map<number, string>();
  abilities.forEach((ability) => abilityMap.set(ability.gameID, ability.name));
  actors.forEach((actor) => actorMap.set(actor.id, actor.name));
  const playerActorIds = new Set(
    actors.filter((actor) => actor.type === "Player" || Boolean(actor.subType)).map((actor) => actor.id)
  );

  const deathEvents = filterAndSort(rawDeathEvents, "death");
  const enemyCastEvents = filterAndSort(rawEnemyCastEvents, "cast");
  const friendlyCastEvents = filterAndSort(rawFriendlyCastEvents, "cast");
  const damageEvents = filterAndSort(rawDamageEvents);
  const healingEvents = filterAndSort(rawHealingEvents);

  const defensiveCastEvents = friendlyCastEvents.filter((event) => {
    const abilityName = getAbilityName(event, abilityMap);
    return DEFENSIVE_NAME_SET.has(normalizeName(abilityName));
  });

  const participantIds = new Set<number>();
  const addParticipants = (events: WclEventNode[], idKey: "sourceID" | "targetID") =>
    events.forEach((e) => {
      const id = e[idKey];
      if (typeof id === "number" && playerActorIds.has(id)) participantIds.add(id);
    });
  addParticipants(deathEvents, "targetID");
  addParticipants(friendlyCastEvents, "sourceID");
  addParticipants(damageEvents, "sourceID");
  addParticipants(healingEvents, "sourceID");

  const consumableTimeline: Array<{
    time: string;
    timeSec: number;
    playerName: string;
    ability: string;
    type: ConsumableType;
  }> = [];
  const consumableByPlayer = new Map<string, { playerName: string; healthstone: number; healingPotion: number; dpsPotion: number }>();
  const consumableSpellIdStats = new Map<
    number,
    { spellId: number; ability: string; inferredType: ConsumableType; source: ConsumableSource; count: number }
  >();
  const unclassifiedConsumableCandidates = new Map<string, { spellId: number | null; ability: string; count: number }>();

  const ensureConsumablePlayer = (playerName: string) => {
    if (!consumableByPlayer.has(playerName)) {
      consumableByPlayer.set(playerName, { playerName, healthstone: 0, healingPotion: 0, dpsPotion: 0 });
    }
    return consumableByPlayer.get(playerName)!;
  };

  friendlyCastEvents.forEach((event) => {
    if (!event.timestamp || typeof event.sourceID !== "number" || !playerActorIds.has(event.sourceID)) return;
    const abilityName = getAbilityName(event, abilityMap);
    const classification = classifyConsumable(event, abilityName);
    const abilityId =
      typeof event.abilityGameID === "number"
        ? event.abilityGameID
        : typeof event.ability?.guid === "number"
          ? event.ability.guid
          : null;

    const normalizedAbility = normalizeName(abilityName);
    const maybeConsumableByName =
      normalizedAbility.includes("물약") ||
      normalizedAbility.includes("potion") ||
      normalizedAbility.includes("생명석") ||
      normalizedAbility.includes("healthstone");
    if (!classification) {
      if (maybeConsumableByName) {
        const key = `${abilityId ?? "null"}-${abilityName}`;
        const prev = unclassifiedConsumableCandidates.get(key);
        if (prev) {
          prev.count += 1;
        } else {
          unclassifiedConsumableCandidates.set(key, {
            spellId: abilityId,
            ability: abilityName,
            count: 1,
          });
        }
      }
      return;
    }
    const type = classification.type;

    const sourceName = actorMap.get(event.sourceID) || `플레이어#${event.sourceID}`;
    const timeSec = toFightSec(event.timestamp, selectedFight.startTime);
    const row = ensureConsumablePlayer(sourceName);
    if (type === "HEALTHSTONE") row.healthstone += 1;
    if (type === "HEALING_POTION") row.healingPotion += 1;
    if (type === "DPS_POTION") row.dpsPotion += 1;

    consumableTimeline.push({
      time: secondsToTime(timeSec),
      timeSec,
      playerName: sourceName,
      ability: abilityName,
      type,
    });

    if (abilityId !== null) {
      const prev = consumableSpellIdStats.get(abilityId);
      if (prev) {
        prev.count += 1;
      } else {
        consumableSpellIdStats.set(abilityId, {
          spellId: abilityId,
          ability: abilityName,
          inferredType: type,
          source: classification.source,
          count: 1,
        });
      }
    }
  });
  consumableTimeline.sort((a, b) => a.timeSec - b.timeSec);

  const deathSeconds = deathEvents.map((event) => toFightSec(event.timestamp || 0, selectedFight.startTime));
  const fightDurationSec = Math.max(1, Math.floor((selectedFight.endTime - selectedFight.startTime) / 1000));
  const wipeTail = detectWipeTailStart(deathSeconds, fightDurationSec);
  const tailStartSec = wipeTail?.startSec ?? null;

  const damageBySecond = new Map<number, number>();
  const healingBySecond = new Map<number, number>();
  damageEvents.forEach((event) => {
    if (!event.timestamp || typeof event.sourceID !== "number" || !playerActorIds.has(event.sourceID)) return;
    pushAmountToSecMap(damageBySecond, toFightSec(event.timestamp, selectedFight.startTime), getDamage(event));
  });
  healingEvents.forEach((event) => {
    if (!event.timestamp || typeof event.sourceID !== "number" || !playerActorIds.has(event.sourceID)) return;
    pushAmountToSecMap(healingBySecond, toFightSec(event.timestamp, selectedFight.startTime), event.amount);
  });

  const bossCastBySecond = new Map<number, number>();
  const defensiveCastBySecond = new Map<number, number>();
  const deathBySecond = new Map<number, number>();
  const bossCastEventsSimple: Array<{ time: string; timeSec: number; ability: string }> = [];
  const defensiveCastEventsSimple: Array<{ time: string; timeSec: number; ability: string }> = [];

  enemyCastEvents.forEach((event) => {
    const timeSec = toFightSec(event.timestamp || 0, selectedFight.startTime);
    const ability = getAbilityName(event, abilityMap);
    incrementSecMap(bossCastBySecond, timeSec);
    bossCastEventsSimple.push({ time: secondsToTime(timeSec), timeSec, ability });
  });

  defensiveCastEvents.forEach((event) => {
    const timeSec = toFightSec(event.timestamp || 0, selectedFight.startTime);
    const ability = getAbilityName(event, abilityMap);
    incrementSecMap(defensiveCastBySecond, timeSec);
    defensiveCastEventsSimple.push({ time: secondsToTime(timeSec), timeSec, ability });
  });

  const deaths: DeathSummary[] = deathEvents.map((event) => {
    const ts = event.timestamp || selectedFight.startTime;
    const timeSec = toFightSec(ts, selectedFight.startTime);
    incrementSecMap(deathBySecond, timeSec);
    const playerName = actorMap.get(event.targetID || -1) || `대상#${event.targetID ?? "?"}`;
    const ability = getAbilityName(event, abilityMap);

    const nearbyDefensives = defensiveCastEvents
      .filter((cast) => {
        const castTs = cast.timestamp || 0;
        if (castTs < ts - 5000 || castTs > ts) return false;
        if (!event.targetID) return true;
        return cast.sourceID === event.targetID || cast.targetID === event.targetID || cast.targetID === undefined;
      })
      .map((cast) => getAbilityName(cast, abilityMap));

    const nearbyBossSkills = enemyCastEvents
      .filter((cast) => {
        const castTs = cast.timestamp || 0;
        return castTs >= ts - 4000 && castTs <= ts + 1000;
      })
      .map((cast) => getAbilityName(cast, abilityMap));

    return {
      playerName,
      time: secondsToTime(timeSec),
      timeSec,
      ability,
      damage: getDamage(event),
      hpPercentBefore: getHpPercentBefore(event),
      defensives: Array.from(new Set(nearbyDefensives)).slice(0, 5),
      nearbyBossSkills: Array.from(new Set(nearbyBossSkills)).slice(0, 5),
    };
  });

  const meaningfulDeaths = deaths.filter((death) => (tailStartSec === null ? true : death.timeSec < tailStartSec));
  const excludedTailDeaths = deaths.length - meaningfulDeaths.length;
  const deathStartSec = meaningfulDeaths.length > 0 ? meaningfulDeaths[0].timeSec : null;

  const topCauses = countAndRank(meaningfulDeaths.map((d) => d.ability), 8)
    .map(({ name, count }) => ({ ability: name, count }));

  const playerDeaths = countAndRank(meaningfulDeaths.map((d) => d.playerName), 10);

  const defensiveMissingCount = meaningfulDeaths.filter((death) => death.defensives.length === 0).length;

  const perPlayerMap = meaningfulDeaths.reduce((acc, death) => {
    const list = acc.get(death.playerName) || [];
    list.push(death);
    acc.set(death.playerName, list);
    return acc;
  }, new Map<string, DeathSummary[]>());

  const perPlayer: PlayerInsight[] = Array.from(perPlayerMap.entries())
    .map(([playerName, entries]) => {
      const sorted = [...entries].sort((a, b) => a.timeSec - b.timeSec);
      const deathsCount = sorted.length;
      const defensiveMissing = sorted.filter((entry) => entry.defensives.length === 0).length;
      const hpValues = sorted
        .map((entry) => entry.hpPercentBefore)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const avgHpBeforeDeath =
        hpValues.length > 0 ? Number((hpValues.reduce((sum, value) => sum + value, 0) / hpValues.length).toFixed(1)) : null;
      const defensiveUseRate =
        deathsCount > 0 ? Number((((deathsCount - defensiveMissing) / deathsCount) * 100).toFixed(1)) : null;

      const playerTopCauses = countAndRank(sorted.map((e) => e.ability), 3)
        .map(({ name, count }) => ({ ability: name, count }));

      const nearbyBossSkills = countAndRank(sorted.flatMap((e) => e.nearbyBossSkills), 3)
        .map(({ name, count }) => ({ ability: name, count }));

      let riskScore = deathsCount * 1.4 + defensiveMissing * 1.6;
      if (avgHpBeforeDeath !== null && avgHpBeforeDeath < 35) riskScore += 1.2;
      if (deathsCount >= 3) riskScore += 1;
      if (deathsCount >= 5) riskScore += 1;

      const risk: PlayerInsight["risk"] = riskScore >= 9 ? "HIGH" : riskScore >= 5 ? "MEDIUM" : "LOW";
      const notes: string[] = [];
      if (defensiveMissing >= Math.ceil(deathsCount * 0.5)) {
        notes.push("생존기 선사용 비율이 낮음");
      }
      if (avgHpBeforeDeath !== null && avgHpBeforeDeath < 35) {
        notes.push("피해 직전 평균 HP가 낮음");
      }
      if (playerTopCauses[0]) {
        notes.push(`반복 원인: ${playerTopCauses[0].ability}`);
      }
      if (notes.length === 0) {
        notes.push("핵심 사망 지표 양호");
      }

      return {
        playerName,
        deaths: deathsCount,
        firstDeathTime: sorted[0]?.time || null,
        lastDeathTime: sorted[sorted.length - 1]?.time || null,
        avgHpBeforeDeath,
        defensiveMissingCount: defensiveMissing,
        defensiveUseRate,
        topCauses: playerTopCauses,
        nearbyBossSkills,
        deathTimes: sorted.slice(0, 8).map((entry) => entry.time),
        risk,
        notes,
      };
    })
    .sort((a, b) => {
      const riskRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      if (riskRank[b.risk] !== riskRank[a.risk]) return riskRank[b.risk] - riskRank[a.risk];
      if (b.deaths !== a.deaths) return b.deaths - a.deaths;
      return a.playerName.localeCompare(b.playerName);
    });

  const uniqueBossCastPoints = Array.from(
    bossCastEventsSimple.reduce((acc, cast) => {
      const key = `${cast.timeSec}-${cast.ability}`;
      if (!acc.has(key)) acc.set(key, cast);
      return acc;
    }, new Map<string, { time: string; timeSec: number; ability: string }>())
  )
    .map(([, value]) => value)
    .sort((a, b) => a.timeSec - b.timeSec);

  const bossCoverage = uniqueBossCastPoints.slice(0, 240).map((bossCast) => {
    const nearbyDefensives = defensiveCastEventsSimple
      .filter((cast) => cast.timeSec >= bossCast.timeSec - 3 && cast.timeSec <= bossCast.timeSec + 2)
      .map((cast) => cast.ability);
    const uniqDefensives = Array.from(new Set(nearbyDefensives)).slice(0, 5);
    return {
      time: bossCast.time,
      timeSec: bossCast.timeSec,
      ability: bossCast.ability,
      defensiveCount: nearbyDefensives.length,
      defensives: uniqDefensives,
      covered: nearbyDefensives.length > 0,
    };
  });

  const deathTimeline: Array<{ sec: number; time: string; deaths: number; cumulativeDeaths: number }> = [];
  const castTimeline: Array<{
    sec: number;
    time: string;
    bossCasts: number;
    defensiveCasts: number;
    deaths: number;
    cumulativeDeaths: number;
  }> = [];

  let cumulativeDeaths = 0;
  for (let sec = 0; sec <= fightDurationSec; sec += 1) {
    const deathsAtSec = deathBySecond.get(sec) || 0;
    cumulativeDeaths += deathsAtSec;

    deathTimeline.push({
      sec,
      time: secondsToTime(sec),
      deaths: deathsAtSec,
      cumulativeDeaths,
    });

    castTimeline.push({
      sec,
      time: secondsToTime(sec),
      bossCasts: bossCastBySecond.get(sec) || 0,
      defensiveCasts: defensiveCastBySecond.get(sec) || 0,
      deaths: deathsAtSec,
      cumulativeDeaths,
    });
  }

  const throughputTimeline: Array<{
    sec: number;
    time: string;
    damage: number;
    healing: number;
    dps: number;
    hps: number;
  }> = [];
  for (let sec = 0; sec <= fightDurationSec; sec += throughputStepSec) {
    const windowEnd = Math.min(fightDurationSec, sec + throughputStepSec - 1);
    let damageSum = 0;
    let healingSum = 0;
    for (let t = sec; t <= windowEnd; t += 1) {
      damageSum += damageBySecond.get(t) || 0;
      healingSum += healingBySecond.get(t) || 0;
    }
    const windowSize = windowEnd - sec + 1;
    throughputTimeline.push({
      sec,
      time: secondsToTime(sec),
      damage: damageSum,
      healing: healingSum,
      dps: Math.round(damageSum / windowSize),
      hps: Math.round(healingSum / windowSize),
    });
  }

  const participantNames = Array.from(participantIds)
    .map((id) => actorMap.get(id))
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b));

  participantNames.forEach((name) => {
    ensureConsumablePlayer(name);
  });

  const consumablePerPlayer = Array.from(consumableByPlayer.values()).sort((a, b) =>
    a.playerName.localeCompare(b.playerName)
  );

  const playersWithoutHealthstone = consumablePerPlayer.filter((row) => row.healthstone === 0).map((row) => row.playerName);
  const playersWithoutHealingPotion = consumablePerPlayer.filter((row) => row.healingPotion === 0).map((row) => row.playerName);
  const playersWithoutDpsPotion = consumablePerPlayer.filter((row) => row.dpsPotion === 0).map((row) => row.playerName);

  const consumableTotals = consumablePerPlayer.reduce(
    (acc, row) => {
      acc.healthstone += row.healthstone;
      acc.healingPotion += row.healingPotion;
      acc.dpsPotion += row.dpsPotion;
      return acc;
    },
    { healthstone: 0, healingPotion: 0, dpsPotion: 0 }
  );

  const spellIdInsights = Array.from(consumableSpellIdStats.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.spellId - b.spellId;
  });
  const recommendedOverrides = spellIdInsights
    .filter((row) => row.source === "name_guess")
    .map((row) => `${row.spellId}:${row.inferredType}`)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .join(",");
  const unclassifiedCandidates = Array.from(unclassifiedConsumableCandidates.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.ability.localeCompare(b.ability);
  });

  return {
    reportId,
    fight: {
      id: selectedFight.id,
      name: selectedFight.name || "알 수 없는 전투",
      kill: Boolean(selectedFight.kill),
      durationSec: fightDurationSec,
      bossPercentage: typeof selectedFight.bossPercentage === "number" ? selectedFight.bossPercentage : null,
    },
    totalDeaths: deaths.length,
    meaningfulDeathsCount: meaningfulDeaths.length,
    excludedTailDeaths,
    deathStartSec,
    wipeTail: {
      detected: Boolean(wipeTail),
      startSec: wipeTail?.startSec ?? null,
      windowSec: wipeTail?.windowSec ?? 5,
      clusterDeaths: wipeTail?.clusterDeaths ?? 0,
      tailDeaths: tailStartSec === null ? 0 : deaths.filter((death) => death.timeSec >= tailStartSec).length,
    },
    topCauses,
    playerDeaths,
    defensiveMissingCount,
    perPlayer,
    consumables: {
      timeline: consumableTimeline.slice(0, 500),
      perPlayer: consumablePerPlayer,
      spellIdInsights: spellIdInsights.slice(0, 50),
      recommendedOverrides,
      unclassifiedCandidates: unclassifiedCandidates.slice(0, 30),
      missing: {
        healthstone: playersWithoutHealthstone,
        healingPotion: playersWithoutHealingPotion,
        dpsPotion: playersWithoutDpsPotion,
      },
      totals: consumableTotals,
    },
    throughputStepSec,
    throughputTimeline,
    firstMeaningfulDeaths: meaningfulDeaths.slice(0, 8),
    deaths: meaningfulDeaths.slice(0, 80),
    bossCoverage: bossCoverage.slice(0, 120),
    deathTimeline,
    castTimeline,
    bossCasts: bossCastEventsSimple.slice(0, 500),
    defensiveCasts: defensiveCastEventsSimple.slice(0, 500),
  };
};
