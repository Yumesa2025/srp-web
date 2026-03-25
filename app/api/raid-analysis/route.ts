import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/app/lib/rateLimit';
import { getWclToken } from '@/app/lib/tokenCache';
import { createClient } from '@/app/utils/supabase/server';
import { fetchWclGraphQL, fetchPagedEvents, WclActorNode, WclAbilityNode, WclEventNode, WclFightNode } from '@/app/api/logs/helpers';
import { BLOODLUST_ABILITY_NAMES } from '@/app/constants/defensiveDefaults';
import { translateBossName } from '@/app/constants/bossNames';
import { translatePotionName } from '@/app/constants/potionNames';
import { DEFENSIVE_SPELL_IDS } from '@/app/constants/defensiveSpellIds';
import { getSpellLookup } from '@/app/lib/spellLookup';
import type { RaidFight, RaidAnalysisResult, EarlyDeath, ConsumableRow, AllPlayerData, BloodlustEvent, DefensiveUsagePlayer } from '@/app/types/raidAnalysis';

// ── 유틸 ──────────────────────────────────────────────────────
function secondsToTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function toFightSec(ts: number, start: number): number {
  return Math.max(0, Math.floor((ts - start) / 1000));
}

function getAbilityName(event: WclEventNode, abilityMap: Map<number, string>): string {
  const id = event.abilityGameID ?? event.ability?.guid;
  if (typeof id === 'number' && id !== 0 && abilityMap.has(id)) return abilityMap.get(id)!;
  const name = event.ability?.name;
  if (!name || name === 'Unknown Ability' || name === 'Unknown' || id === 0) return '알 수 없는 피해';
  return name;
}

function extractReportCode(raw: string): string {
  const urlMatch = raw.trim().match(/reports\/([A-Za-z0-9]+)/i);
  if (urlMatch?.[1]) return urlMatch[1];
  return raw.trim().split(/[/?#\s]/)[0].replace(/[^A-Za-z0-9]/g, '');
}

// 블러드러스트 구간 평균 DPS/HPS 계산
function calcBloodlustAvg(
  secMap: Map<number, number>,
  bloodlusts: BloodlustEvent[],
  durationSec: number,
): number | null {
  if (bloodlusts.length === 0) return null;
  let totalAmt = 0;
  let totalSecs = 0;
  bloodlusts.forEach(bl => {
    const endSec = Math.min(bl.timeSec + 40, durationSec);
    for (let s = bl.timeSec; s < endSec; s++) {
      totalAmt += secMap.get(s) ?? 0;
      totalSecs++;
    }
  });
  return totalSecs > 0 ? Math.round(totalAmt / totalSecs) : null;
}

// ── GET: 전투 목록 ─────────────────────────────────────────────
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const rl = checkRateLimit(getClientIp(request), 'raid-analysis-fights', 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const rawCode = searchParams.get('code') ?? '';
  const code = extractReportCode(rawCode);
  if (!code) return NextResponse.json({ error: 'WCL 리포트 코드가 필요합니다.' }, { status: 400 });

  try {
    const token = await getWclToken();
    const query = `
      query($code: String!) {
        reportData {
          report(code: $code) {
            startTime
            fights {
              id name startTime endTime kill bossPercentage size difficulty
            }
          }
        }
      }
    `;
    const data = await fetchWclGraphQL(token, query, { code });
    if (data?.errors?.length) throw new Error(data.errors[0].message);

    const reportNode = data?.data?.reportData?.report;
    if (!reportNode) {
      return NextResponse.json({
        error: `WCL 리포트를 찾지 못했습니다. report(code: "${code}")가 null입니다.`,
      }, { status: 404 });
    }

    if (!Array.isArray(reportNode.fights)) {
      return NextResponse.json({
        error: 'WCL 리포트는 찾았지만 fights 필드가 배열이 아닙니다.',
      }, { status: 502 });
    }

    const reportStartTime = typeof reportNode.startTime === 'number' ? reportNode.startTime : 0;
    const raw = reportNode.fights as WclFightNode[];
    const fights: RaidFight[] = raw
      .filter(f => typeof f.kill === 'boolean' && (!f.size || f.size > 5))
      .map(f => ({
        id: f.id,
        name: translateBossName(f.name || '알 수 없는 보스'),
        durationSec: Math.floor((f.endTime - f.startTime) / 1000),
        kill: Boolean(f.kill),
        bossPercentage: f.bossPercentage ?? null,
        startTime: f.startTime,
        endTime: f.endTime,
        difficulty: f.difficulty,
        fightStartedAt: reportStartTime > 0 ? reportStartTime + f.startTime : undefined,
      }));

    return NextResponse.json({ fights });
  } catch (e) {
    const raw = e instanceof Error ? e.message : '전투 목록을 불러오지 못했습니다.';
    const msg = raw.includes('429')
      ? 'WCL API 요청 한도 초과 (429). 잠시 후 다시 시도해주세요. (무료 API 키는 분당 요청 수 제한이 있습니다)'
      : raw;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST: 전체 분석 ────────────────────────────────────────────
const AnalysisSchema = z.object({
  reportCode: z.string().min(1),
  fightId: z.number().int().positive(),
  fightName: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  kill: z.boolean(),
  bossPercentage: z.number().nullable(),
  defensiveEntries: z.array(z.object({ id: z.number().int().positive().optional(), name: z.string() })).default([]).optional(), // kept for backward compat, not used
  stepSec: z.number().int().min(1).max(30).default(5),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const rl = checkRateLimit(getClientIp(request), 'raid-analysis-full', 5, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 }); }

  const parsed = AnalysisSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });

  const { reportCode: rawCode, fightId, fightName, startTime, endTime, kill, bossPercentage, stepSec } = parsed.data;
  const reportCode = extractReportCode(rawCode);

  try {
    const token = await getWclToken();

    // 1. masterData 조회 (fights는 클라이언트에서 전달받음)
    const metaQuery = `
      query($code: String!) {
        reportData {
          report(code: $code) {
            masterData {
              abilities { gameID name }
              actors { id name type subType petOwner }
            }
          }
        }
      }
    `;
    const metaData = await fetchWclGraphQL(token, metaQuery, { code: reportCode });
    if (metaData?.errors?.length) throw new Error(metaData.errors[0].message);

    const reportNode = metaData?.data?.reportData?.report;
    const abilities = (reportNode?.masterData?.abilities ?? []) as WclAbilityNode[];
    const actors = (reportNode?.masterData?.actors ?? []) as WclActorNode[];

    const abilityMap = new Map<number, string>();
    abilities.forEach(a => abilityMap.set(a.gameID, a.name));
    const actorMap = new Map<number, string>();
    actors.forEach(a => actorMap.set(a.id, a.name));
    const actorClassMap = new Map<number, string>();
    actors.forEach(a => { if (a.type === 'Player' && a.subType) actorClassMap.set(a.id, a.subType); });
    const playerIds = new Set(actors.filter(a => a.type === 'Player').map(a => a.id));

    const durationSec = Math.max(1, Math.floor((endTime - startTime) / 1000));

    // 2. 이벤트 병렬 조회
    const [deathEvents, castEvents, damageEvents, healEvents, combatantInfoEvents, incomingDamageEvents] = await Promise.all([
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'Deaths', startTime, endTime }),
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'Casts', hostilityType: 'Friendlies', startTime, endTime }),
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'DamageDone', hostilityType: 'Friendlies', startTime, endTime }),
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'Healing', hostilityType: 'Friendlies', startTime, endTime }),
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'CombatantInfo', startTime, endTime }).catch(() => []),
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'DamageDone', hostilityType: 'Enemies', startTime, endTime }),
    ]);

    // combatantInfo → specIdMap (actorId → specId) + 실제 전투 참여자 집합
    const specIdMap = new Map<number, number>();
    const fightPlayerIds = new Set<number>();
    combatantInfoEvents.forEach(e => {
      if (typeof e.sourceID !== 'number' || !playerIds.has(e.sourceID)) return;
      fightPlayerIds.add(e.sourceID);
      if (typeof e.specID === 'number') specIdMap.set(e.sourceID, e.specID);
    });
    damageEvents.forEach(e => { if (typeof e.sourceID === 'number' && playerIds.has(e.sourceID)) fightPlayerIds.add(e.sourceID); });
    healEvents.forEach(e => { if (typeof e.sourceID === 'number' && playerIds.has(e.sourceID)) fightPlayerIds.add(e.sourceID); });

    // ── defensive 매칭 헬퍼 (spell ID 기반 자동 감지) ─────────
    const isDefensiveCast = (e: WclEventNode): boolean => {
      const id = e.abilityGameID ?? e.ability?.guid;
      return typeof id === 'number' && DEFENSIVE_SPELL_IDS.has(id);
    };

    // ── 블러드러스트 타이밍 (먼저 계산해야 DPS 블러드구간 계산 가능) ──
    const bloodlusts: BloodlustEvent[] = [];
    const seenBloodlustTimes = new Set<number>();
    castEvents.forEach(e => {
      if (!e.timestamp) return;
      const name = getAbilityName(e, abilityMap).toLowerCase().trim();
      if (BLOODLUST_ABILITY_NAMES.has(name)) {
        const timeSec = toFightSec(e.timestamp, startTime);
        // 같은 초에 중복 블러드러스트 제거
        if (!seenBloodlustTimes.has(timeSec)) {
          seenBloodlustTimes.add(timeSec);
          bloodlusts.push({
            ability: getAbilityName(e, abilityMap),
            timeSec,
            timeStr: secondsToTime(timeSec),
          });
        }
      }
    });

    // ── 마력주입 (Power Infusion) 수신자별 타이밍 ──────────────
    const PI_SPELL_ID = 10060;
    const piTimingMap = new Map<number, number[]>(); // targetActorId → timeSec[]
    castEvents.forEach(e => {
      if (!e.timestamp || typeof e.targetID !== 'number') return;
      if (!fightPlayerIds.has(e.targetID)) return;
      const abilityId = e.abilityGameID ?? e.ability?.guid;
      const abilityNameLower = getAbilityName(e, abilityMap).toLowerCase().trim();
      if (abilityId !== PI_SPELL_ID && abilityNameLower !== 'power infusion') return;
      const timeSec = toFightSec(e.timestamp, startTime);
      if (!piTimingMap.has(e.targetID)) piTimingMap.set(e.targetID, []);
      piTimingMap.get(e.targetID)!.push(timeSec);
    });

    // ── 개인별 DPS ─────────────────────────────────────────────
    const playerDamageBySecond = new Map<number, Map<number, number>>();
    damageEvents.forEach(e => {
      if (!e.timestamp || typeof e.sourceID !== 'number' || !playerIds.has(e.sourceID)) return;
      const sec = toFightSec(e.timestamp, startTime);
      const amount = (e.amount ?? 0) - (e.absorbed ?? 0);
      if (amount <= 0) return;
      if (!playerDamageBySecond.has(e.sourceID)) playerDamageBySecond.set(e.sourceID, new Map());
      const secMap = playerDamageBySecond.get(e.sourceID)!;
      secMap.set(sec, (secMap.get(sec) ?? 0) + amount);
    });

    // ── 개인별 HPS ─────────────────────────────────────────────
    const playerHealBySecond = new Map<number, Map<number, number>>();
    healEvents.forEach(e => {
      if (!e.timestamp || typeof e.sourceID !== 'number' || !playerIds.has(e.sourceID)) return;
      const sec = toFightSec(e.timestamp, startTime);
      const amount = e.amount ?? 0;
      if (amount <= 0) return;
      if (!playerHealBySecond.has(e.sourceID)) playerHealBySecond.set(e.sourceID, new Map());
      const secMap = playerHealBySecond.get(e.sourceID)!;
      secMap.set(sec, (secMap.get(sec) ?? 0) + amount);
    });

    // ── 생존기 사용 현황 (allPlayers defensiveCasts를 위해 먼저 계산) ──
    const defensiveUsageMap = new Map<string, { actorId: number; className?: string; specId?: number; casts: { ability: string; timeSec: number; timeStr: string; spellId?: number }[] }>();
    castEvents.forEach(e => {
      if (!e.timestamp || typeof e.sourceID !== 'number' || !fightPlayerIds.has(e.sourceID)) return;
      if (!isDefensiveCast(e)) return;
      const abilityName = getAbilityName(e, abilityMap);
      const name = actorMap.get(e.sourceID) ?? '';
      if (!name) return;
      if (!defensiveUsageMap.has(name)) defensiveUsageMap.set(name, { actorId: e.sourceID, className: actorClassMap.get(e.sourceID), specId: specIdMap.get(e.sourceID), casts: [] });
      const timeSec = toFightSec(e.timestamp, startTime);
      const spellId = e.abilityGameID ?? e.ability?.guid;
      defensiveUsageMap.get(name)!.casts.push({ ability: abilityName, timeSec, timeStr: secondsToTime(timeSec), spellId: typeof spellId === 'number' ? spellId : undefined });
    });

    // ── 전체 플레이어 데이터 중간 계산 (타임라인) ────────────
    type PlayerIntermediate = {
      name: string; actorId: number; dpsSecMap: Map<number, number>; hpsSecMap: Map<number, number>;
      totalDamage: number; totalHealing: number; maxDps: number; maxHps: number;
      dpsTimeline: { sec: number; dps: number }[]; hpsTimeline: { sec: number; hps: number }[];
    };
    const playerIntermediates: PlayerIntermediate[] = [];
    fightPlayerIds.forEach(actorId => {
      const name = actorMap.get(actorId);
      if (!name) return;

      const dpsSecMap = playerDamageBySecond.get(actorId) ?? new Map<number, number>();
      const hpsSecMap = playerHealBySecond.get(actorId) ?? new Map<number, number>();

      let totalDamage = 0;
      dpsSecMap.forEach(v => { totalDamage += v; });
      let totalHealing = 0;
      hpsSecMap.forEach(v => { totalHealing += v; });

      if (totalDamage < 1000 && totalHealing < 10_000) return;

      const dpsTimeline: { sec: number; dps: number }[] = [];
      let maxDps = 0;
      for (let s = 0; s <= durationSec; s += stepSec) {
        let sum = 0;
        for (let t = s; t < s + stepSec && t <= durationSec; t++) sum += dpsSecMap.get(t) ?? 0;
        const dps = Math.round(sum / stepSec);
        if (dps > maxDps) maxDps = dps;
        dpsTimeline.push({ sec: s, dps });
      }

      const hpsTimeline: { sec: number; hps: number }[] = [];
      let maxHps = 0;
      for (let s = 0; s <= durationSec; s += stepSec) {
        let sum = 0;
        for (let t = s; t < s + stepSec && t <= durationSec; t++) sum += hpsSecMap.get(t) ?? 0;
        const hps = Math.round(sum / stepSec);
        if (hps > maxHps) maxHps = hps;
        hpsTimeline.push({ sec: s, hps });
      }

      playerIntermediates.push({ name, actorId, dpsSecMap, hpsSecMap, totalDamage, totalHealing, maxDps, maxHps, dpsTimeline, hpsTimeline });
    });

    // ── 죽음 분석 (사망 원인 ID 수집) ────────────────────────
    const sortedDeaths = deathEvents
      .filter(e => e.type === 'death' && typeof e.timestamp === 'number' && typeof e.targetID === 'number' && playerIds.has(e.targetID!))
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

    const allDeathTimes = sortedDeaths.map(e => toFightSec(e.timestamp!, startTime));

    // Collect cause IDs for batch lookup
    const earlyDeathCauseIds = new Set<number>();
    sortedDeaths.slice(0, 3).forEach(death => {
      const causeId = death.abilityGameID ?? death.ability?.guid;
      if (typeof causeId === 'number' && causeId !== 0) earlyDeathCauseIds.add(causeId);
    });

    // ── Batch spell lookup (생존기 + 사망 원인) ──────────────
    const spellIdsToLookup = new Set<number>();
    defensiveUsageMap.forEach(p => p.casts.forEach(c => { if (c.spellId) spellIdsToLookup.add(c.spellId); }));
    earlyDeathCauseIds.forEach(id => spellIdsToLookup.add(id));

    const spellInfoMap = new Map<number, { name: string; iconUrl: string }>();
    await Promise.all(
      Array.from(spellIdsToLookup).map(async id => {
        const info = await getSpellLookup(String(id));
        spellInfoMap.set(id, { name: info.name, iconUrl: info.iconUrl });
      })
    );

    // Apply Wowhead names to defensiveUsageMap casts
    defensiveUsageMap.forEach(p => {
      p.casts.forEach(c => {
        if (c.spellId && spellInfoMap.has(c.spellId)) {
          const info = spellInfoMap.get(c.spellId)!;
          c.ability = info.name;
        }
      });
    });

    // ── 전체 플레이어 데이터 최종 빌드 (spellInfoMap 사용) ───
    const allPlayers: AllPlayerData[] = playerIntermediates.map(p => ({
      name: p.name,
      actorId: p.actorId,
      className: actorClassMap.get(p.actorId),
      specId: specIdMap.get(p.actorId),
      totalDamage: p.totalDamage,
      avgDps: Math.round(p.totalDamage / durationSec),
      maxDps: p.maxDps,
      bloodlustAvgDps: calcBloodlustAvg(p.dpsSecMap, bloodlusts, durationSec),
      dpsTimeline: p.dpsTimeline,
      totalHealing: p.totalHealing,
      avgHps: Math.round(p.totalHealing / durationSec),
      maxHps: p.maxHps,
      bloodlustAvgHps: calcBloodlustAvg(p.hpsSecMap, bloodlusts, durationSec),
      hpsTimeline: p.hpsTimeline,
      defensiveCasts: defensiveUsageMap.get(p.name)?.casts.map(c => ({
        ability: c.ability,
        timeSec: c.timeSec,
        spellId: c.spellId,
        iconUrl: c.spellId ? spellInfoMap.get(c.spellId)?.iconUrl : undefined,
      })) ?? [],
      piTimings: piTimingMap.get(p.actorId) ?? [],
    }));
    allPlayers.sort((a, b) => b.totalDamage - a.totalDamage);

    // Build earlyDeaths with causeIconUrl
    const earlyDeaths: EarlyDeath[] = sortedDeaths.slice(0, 3).map((death, idx) => {
      const timeSec = toFightSec(death.timestamp!, startTime);
      const windowCount = allDeathTimes.filter(t => Math.abs(t - timeSec) <= 10).length;
      const isMassDeath = idx > 0 && windowCount >= 5;

      const causeId = death.abilityGameID ?? death.ability?.guid;
      const causeInfo = typeof causeId === 'number' && causeId !== 0 ? spellInfoMap.get(causeId) : undefined;
      const causeName = causeInfo?.name ?? getAbilityName(death, abilityMap);
      const causeIconUrl = causeInfo?.iconUrl;

      if (isMassDeath) {
        return {
          rank: idx + 1,
          playerName: actorMap.get(death.targetID!) ?? `플레이어#${death.targetID}`,
          actorId: death.targetID!,
          className: actorClassMap.get(death.targetID!),
          specId: specIdMap.get(death.targetID!),
          timeSec,
          timeStr: secondsToTime(timeSec),
          cause: causeName,
          causeIconUrl,
          hpBefore: null,
          defensivesUsed: [],
          isSkipped: true,
          skipReason: `집단 죽음 (${windowCount}명, ±10초 이내) — 리트라이 가능성`,
        };
      }

      const deathTs = death.timestamp!;
      const defensivesUsed = castEvents
        .filter(c => {
          if (!c.timestamp || typeof c.sourceID !== 'number') return false;
          if (c.sourceID !== death.targetID) return false;
          if (c.timestamp < deathTs - 5000 || c.timestamp > deathTs) return false;
          return isDefensiveCast(c);
        })
        .map(c => getAbilityName(c, abilityMap));

      let hpBefore: number | null = null;
      if (death.targetResources) {
        const hpRes = death.targetResources.find(r => r.type === 0);
        if (hpRes && hpRes.max) hpBefore = Math.round((hpRes.amount ?? 0) / hpRes.max * 100);
      } else if (death.hitPoints !== undefined && death.maxHitPoints) {
        hpBefore = Math.round((death.hitPoints / death.maxHitPoints) * 100);
      }

      // 사망 직전 5초 받은 피해 계산
      const preDeathHits = incomingDamageEvents.filter(e =>
        typeof e.targetID === 'number' && e.targetID === death.targetID &&
        typeof e.timestamp === 'number' && e.timestamp >= deathTs - 5000 && e.timestamp <= deathTs &&
        (e.amount ?? 0) > 0
      );
      const totalIncoming = preDeathHits.reduce((sum, e) => sum + (e.amount ?? 0), 0);
      // 스킬별 합산
      const hitsByAbility = new Map<number, { name: string; total: number }>();
      preDeathHits.forEach(e => {
        const id = e.abilityGameID ?? e.ability?.guid;
        if (typeof id !== 'number') return;
        const name = abilityMap.get(id) ?? e.ability?.name ?? `스킬#${id}`;
        const prev = hitsByAbility.get(id) ?? { name, total: 0 };
        hitsByAbility.set(id, { name, total: prev.total + (e.amount ?? 0) });
      });
      const topHits = Array.from(hitsByAbility.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
        .map(h => ({ ability: h.name, amount: h.total }));

      return {
        rank: idx + 1,
        playerName: actorMap.get(death.targetID!) ?? `플레이어#${death.targetID}`,
        actorId: death.targetID!,
        className: actorClassMap.get(death.targetID!),
        specId: specIdMap.get(death.targetID!),
        timeSec,
        timeStr: secondsToTime(timeSec),
        cause: causeName,
        causeIconUrl,
        hpBefore,
        defensivesUsed: Array.from(new Set(defensivesUsed)),
        isSkipped: false,
        incomingDamage: totalIncoming > 0 ? { totalDamage: totalIncoming, topHits } : undefined,
      };
    });

    // ── 소모품 O/X (물약 이름 추적) ───────────────────────────
    type ConsumableState = { className?: string; specId?: number; dpsPotion: string | null; healthstone: boolean; healingPotion: string | null; augmentRune: string | null };
    const consumableMap = new Map<string, ConsumableState & { actorId: number }>();
    const ensurePlayer = (name: string, actorId: number) => {
      if (!consumableMap.has(name)) consumableMap.set(name, { actorId, className: actorClassMap.get(actorId), specId: specIdMap.get(actorId), dpsPotion: null, healthstone: false, healingPotion: null, augmentRune: null });
      return consumableMap.get(name)!;
    };
    // fightPlayerIds: 이 전투에 실제 참여한 플레이어만
    fightPlayerIds.forEach(id => {
      const name = actorMap.get(id);
      if (name) ensurePlayer(name, id);
    });

    castEvents.forEach(e => {
      if (!e.timestamp || typeof e.sourceID !== 'number' || !fightPlayerIds.has(e.sourceID)) return;
      const pName = actorMap.get(e.sourceID) ?? '';
      if (!pName) return;
      const abilityName = getAbilityName(e, abilityMap);
      const lower = abilityName.toLowerCase();
      const row = ensurePlayer(pName, e.sourceID);

      if (lower.includes('생명석') || lower.includes('healthstone')) {
        row.healthstone = true;
      } else if (
        (lower.includes('치유') && lower.includes('물약')) ||
        (lower.includes('healing') && lower.includes('potion')) ||
        (lower.includes('health') && lower.includes('potion')) ||
        lower.includes('refreshing serum') ||
        lower.includes('상쾌한 세럼')
      ) {
        if (!row.healingPotion) row.healingPotion = abilityName;
      } else if (lower.includes('augment rune')) {
        if (!row.augmentRune) row.augmentRune = translatePotionName(abilityName);
      } else if (
        lower.includes('물약') || lower.includes('potion') ||
        lower.includes('엘릭서') || lower.includes('elixir')
      ) {
        if (!row.dpsPotion) row.dpsPotion = abilityName;
      }
    });

    const consumables: ConsumableRow[] = Array.from(consumableMap.entries())
      .map(([name, flags]) => ({ name, actorId: flags.actorId, className: flags.className, specId: flags.specId, dpsPotion: flags.dpsPotion ? translatePotionName(flags.dpsPotion) : null, healthstone: flags.healthstone, healingPotion: flags.healingPotion ? translatePotionName(flags.healingPotion) : null, augmentRune: flags.augmentRune }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const defensiveUsage: DefensiveUsagePlayer[] = Array.from(defensiveUsageMap.entries())
      .map(([name, { actorId, className, specId, casts }]) => ({
        name,
        actorId,
        className,
        specId,
        casts: casts
          .sort((a, b) => a.timeSec - b.timeSec)
          .map(c => ({
            ...c,
            iconUrl: c.spellId ? spellInfoMap.get(c.spellId)?.iconUrl : undefined,
          })),
      }))
      .sort((a, b) => b.casts.length - a.casts.length);

    // ── 결과 반환 ────────────────────────────────────────────
    const result: RaidAnalysisResult = {
      fight: {
        id: fightId,
        name: translateBossName(fightName),
        durationSec,
        kill,
        bossPercentage,
      },
      wclUrl: `https://www.warcraftlogs.com/reports/${reportCode}#fight=${fightId}`,
      reportCode,
      earlyDeaths,
      consumables,
      allPlayers,
      bloodlusts,
      defensiveUsage,
    };

    return NextResponse.json({ result });
  } catch (e) {
    const raw = e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.';
    const msg = raw.includes('429')
      ? 'WCL API 요청 한도 초과 (429). 잠시 후 다시 시도해주세요. (무료 API 키는 분당 요청 수 제한이 있습니다)'
      : raw;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
