import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/app/lib/rateLimit';
import { getWclToken } from '@/app/lib/tokenCache';
import { fetchWclGraphQL, fetchPagedEvents, WclActorNode, WclAbilityNode, WclEventNode, WclFightNode } from '@/app/api/logs/helpers';
import { BLOODLUST_ABILITY_NAMES } from '@/app/constants/defensiveDefaults';
import { translateBossName } from '@/app/constants/bossNames';
import { translatePotionName } from '@/app/constants/potionNames';
import type { RaidFight, RaidAnalysisResult, EarlyDeath, ConsumableRow, DpsPlayerData, HpsPlayerData, BloodlustEvent, DefensiveUsagePlayer } from '@/app/types/raidAnalysis';

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
            fights {
              id name startTime endTime kill bossPercentage
            }
          }
        }
      }
    `;
    const data = await fetchWclGraphQL(token, query, { code });
    if (data?.errors?.length) throw new Error(data.errors[0].message);

    const raw = (data?.data?.reportData?.report?.fights ?? []) as WclFightNode[];
    const fights: RaidFight[] = raw
      .filter(f => typeof f.bossPercentage === 'number')
      .map(f => ({
        id: f.id,
        name: translateBossName(f.name || '알 수 없는 보스'),
        durationSec: Math.floor((f.endTime - f.startTime) / 1000),
        kill: Boolean(f.kill),
        bossPercentage: f.bossPercentage ?? null,
        startTime: f.startTime,
        endTime: f.endTime,
      }));

    return NextResponse.json({ fights });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '전투 목록을 불러오지 못했습니다.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST: 전체 분석 ────────────────────────────────────────────
const AnalysisSchema = z.object({
  reportCode: z.string().min(1),
  fightId: z.number().int().positive(),
  defensiveSpellNames: z.array(z.string()).default([]),
  stepSec: z.number().int().min(1).max(30).default(5),
});

export async function POST(request: Request) {
  const rl = checkRateLimit(getClientIp(request), 'raid-analysis-full', 5, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 }); }

  const parsed = AnalysisSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });

  const { reportCode: rawCode, fightId, defensiveSpellNames, stepSec } = parsed.data;
  const reportCode = extractReportCode(rawCode);

  try {
    const token = await getWclToken();

    // 1. masterData + fight info
    const metaQuery = `
      query($code: String!) {
        reportData {
          report(code: $code) {
            fights { id name startTime endTime kill bossPercentage }
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
    const fights = (reportNode?.fights ?? []) as WclFightNode[];
    const selectedFight = fights.find(f => f.id === fightId);
    if (!selectedFight) return NextResponse.json({ error: '선택한 전투를 찾을 수 없습니다.' }, { status: 404 });

    const abilities = (reportNode?.masterData?.abilities ?? []) as WclAbilityNode[];
    const actors = (reportNode?.masterData?.actors ?? []) as WclActorNode[];

    const abilityMap = new Map<number, string>();
    abilities.forEach(a => abilityMap.set(a.gameID, a.name));
    const actorMap = new Map<number, string>();
    actors.forEach(a => actorMap.set(a.id, a.name));
    const actorClassMap = new Map<number, string>();
    actors.forEach(a => { if (a.type === 'Player' && a.subType) actorClassMap.set(a.id, a.subType); });
    const playerIds = new Set(actors.filter(a => a.type === 'Player').map(a => a.id));

    const { startTime, endTime } = selectedFight;
    const durationSec = Math.max(1, Math.floor((endTime - startTime) / 1000));

    // 2. 이벤트 병렬 조회 (힐링 추가)
    const [deathEvents, castEvents, damageEvents, healEvents] = await Promise.all([
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'Deaths', startTime, endTime }),
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'Casts', hostilityType: 'Friendlies', startTime, endTime }),
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'DamageDone', hostilityType: 'Friendlies', startTime, endTime }),
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'Healing', hostilityType: 'Friendlies', startTime, endTime }),
    ]);

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

    // 플레이어별 총 힐량 사전 계산 (역할 분류용)
    const totalHealByPlayer = new Map<number, number>();
    playerHealBySecond.forEach((secMap, id) => {
      let total = 0;
      secMap.forEach(v => total += v);
      totalHealByPlayer.set(id, total);
    });

    // 힐러 분류: 총힐량 > 총딜량 * 3 이고 avg HPS > 30K
    const healer_HPS_THRESHOLD = 30_000;
    const isHealer = (actorId: number): boolean => {
      const totalDmg = (() => { let s = 0; (playerDamageBySecond.get(actorId) ?? new Map()).forEach(v => s += v); return s; })();
      const totalHeal = totalHealByPlayer.get(actorId) ?? 0;
      return totalHeal > totalDmg * 3 && totalHeal / durationSec > healer_HPS_THRESHOLD;
    };

    // DPS players (힐러 제외, 최소 딜량 1000)
    const dpsPlayers: DpsPlayerData[] = [];
    playerDamageBySecond.forEach((secMap, sourceId) => {
      if (isHealer(sourceId)) return;
      const name = actorMap.get(sourceId);
      if (!name) return;

      let totalDamage = 0;
      secMap.forEach(v => totalDamage += v);
      if (totalDamage < 1000) return;

      const timeline: { sec: number; dps: number }[] = [];
      let maxDps = 0;
      for (let s = 0; s <= durationSec; s += stepSec) {
        let sum = 0;
        for (let t = s; t < s + stepSec && t <= durationSec; t++) {
          sum += secMap.get(t) ?? 0;
        }
        const dps = Math.round(sum / stepSec);
        if (dps > maxDps) maxDps = dps;
        timeline.push({ sec: s, dps });
      }

      dpsPlayers.push({
        name,
        actorId: sourceId,
        className: actorClassMap.get(sourceId),
        totalDamage,
        avgDps: Math.round(totalDamage / durationSec),
        maxDps,
        bloodlustAvgDps: calcBloodlustAvg(secMap, bloodlusts, durationSec),
        timeline,
      });
    });
    dpsPlayers.sort((a, b) => b.totalDamage - a.totalDamage);

    // HPS players (힐러만, 최소 힐량)
    const hpsPlayers: HpsPlayerData[] = [];
    playerHealBySecond.forEach((secMap, sourceId) => {
      if (!isHealer(sourceId)) return;
      const name = actorMap.get(sourceId);
      if (!name) return;

      let totalHealing = 0;
      secMap.forEach(v => totalHealing += v);
      if (totalHealing < 10_000) return;

      const timeline: { sec: number; hps: number }[] = [];
      let maxHps = 0;
      for (let s = 0; s <= durationSec; s += stepSec) {
        let sum = 0;
        for (let t = s; t < s + stepSec && t <= durationSec; t++) {
          sum += secMap.get(t) ?? 0;
        }
        const hps = Math.round(sum / stepSec);
        if (hps > maxHps) maxHps = hps;
        timeline.push({ sec: s, hps });
      }

      hpsPlayers.push({
        name,
        actorId: sourceId,
        className: actorClassMap.get(sourceId),
        totalHealing,
        avgHps: Math.round(totalHealing / durationSec),
        maxHps,
        bloodlustAvgHps: calcBloodlustAvg(secMap, bloodlusts, durationSec),
        timeline,
      });
    });
    hpsPlayers.sort((a, b) => b.totalHealing - a.totalHealing);

    // ── 죽음 분석 ─────────────────────────────────────────────
    const defensiveNameSet = new Set(defensiveSpellNames.map(n => n.toLowerCase().trim()));
    const sortedDeaths = deathEvents
      .filter(e => e.type === 'death' && typeof e.timestamp === 'number' && typeof e.targetID === 'number' && playerIds.has(e.targetID!))
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

    const allDeathTimes = sortedDeaths.map(e => toFightSec(e.timestamp!, startTime));

    const earlyDeaths: EarlyDeath[] = sortedDeaths.slice(0, 3).map((death, idx) => {
      const timeSec = toFightSec(death.timestamp!, startTime);
      const windowCount = allDeathTimes.filter(t => Math.abs(t - timeSec) <= 10).length;
      const isMassDeath = idx > 0 && windowCount >= 5;

      if (isMassDeath) {
        return {
          rank: idx + 1,
          playerName: actorMap.get(death.targetID!) ?? `플레이어#${death.targetID}`,
          actorId: death.targetID!,
          className: actorClassMap.get(death.targetID!),
          timeSec,
          timeStr: secondsToTime(timeSec),
          cause: getAbilityName(death, abilityMap),
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
          const name = getAbilityName(c, abilityMap).toLowerCase().trim();
          return defensiveNameSet.size > 0 ? defensiveNameSet.has(name) : true;
        })
        .map(c => getAbilityName(c, abilityMap));

      let hpBefore: number | null = null;
      if (death.targetResources) {
        const hpRes = death.targetResources.find(r => r.type === 0);
        if (hpRes && hpRes.max) hpBefore = Math.round((hpRes.amount ?? 0) / hpRes.max * 100);
      } else if (death.hitPoints !== undefined && death.maxHitPoints) {
        hpBefore = Math.round((death.hitPoints / death.maxHitPoints) * 100);
      }

      return {
        rank: idx + 1,
        playerName: actorMap.get(death.targetID!) ?? `플레이어#${death.targetID}`,
        actorId: death.targetID!,
        className: actorClassMap.get(death.targetID!),
        timeSec,
        timeStr: secondsToTime(timeSec),
        cause: getAbilityName(death, abilityMap),
        hpBefore,
        defensivesUsed: Array.from(new Set(defensivesUsed)),
        isSkipped: false,
      };
    });

    // ── 소모품 O/X (물약 이름 추적) ───────────────────────────
    type ConsumableState = { className?: string; dpsPotion: string | null; healthstone: boolean; healingPotion: string | null };
    const consumableMap = new Map<string, ConsumableState & { actorId: number }>();
    const ensurePlayer = (name: string, actorId: number) => {
      if (!consumableMap.has(name)) consumableMap.set(name, { actorId, className: actorClassMap.get(actorId), dpsPotion: null, healthstone: false, healingPotion: null });
      return consumableMap.get(name)!;
    };
    playerIds.forEach(id => {
      const name = actorMap.get(id);
      if (name) ensurePlayer(name, id);
    });

    castEvents.forEach(e => {
      if (!e.timestamp || typeof e.sourceID !== 'number' || !playerIds.has(e.sourceID)) return;
      const pName = actorMap.get(e.sourceID) ?? '';
      if (!pName) return;
      const abilityName = getAbilityName(e, abilityMap);
      const lower = abilityName.toLowerCase();
      const row = ensurePlayer(pName, e.sourceID);

      if (lower.includes('생명석') || lower.includes('healthstone')) {
        row.healthstone = true;
      } else if (
        (lower.includes('치유') && lower.includes('물약')) ||
        (lower.includes('healing') && lower.includes('potion'))
      ) {
        if (!row.healingPotion) row.healingPotion = abilityName;
      } else if (
        lower.includes('물약') || lower.includes('potion') ||
        lower.includes('엘릭서') || lower.includes('elixir')
      ) {
        if (!row.dpsPotion) row.dpsPotion = abilityName;
      }
    });

    const consumables: ConsumableRow[] = Array.from(consumableMap.entries())
      .map(([name, flags]) => ({ name, actorId: flags.actorId, className: flags.className, dpsPotion: flags.dpsPotion ? translatePotionName(flags.dpsPotion) : null, healthstone: flags.healthstone, healingPotion: flags.healingPotion ? translatePotionName(flags.healingPotion) : null }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // ── 생존기 사용 현황 ──────────────────────────────────────
    const defensiveUsageMap = new Map<string, { actorId: number; className?: string; casts: { ability: string; timeSec: number; timeStr: string }[] }>();
    if (defensiveNameSet.size > 0) {
      castEvents.forEach(e => {
        if (!e.timestamp || typeof e.sourceID !== 'number' || !playerIds.has(e.sourceID)) return;
        const abilityName = getAbilityName(e, abilityMap);
        if (!defensiveNameSet.has(abilityName.toLowerCase().trim())) return;
        const name = actorMap.get(e.sourceID) ?? '';
        if (!name) return;
        if (!defensiveUsageMap.has(name)) defensiveUsageMap.set(name, { actorId: e.sourceID, className: actorClassMap.get(e.sourceID), casts: [] });
        const timeSec = toFightSec(e.timestamp, startTime);
        defensiveUsageMap.get(name)!.casts.push({ ability: abilityName, timeSec, timeStr: secondsToTime(timeSec) });
      });
    }

    const defensiveUsage: DefensiveUsagePlayer[] = Array.from(defensiveUsageMap.entries())
      .map(([name, { actorId, className, casts }]) => ({ name, actorId, className, casts: casts.sort((a, b) => a.timeSec - b.timeSec) }))
      .sort((a, b) => b.casts.length - a.casts.length);

    // ── 결과 반환 ────────────────────────────────────────────
    const result: RaidAnalysisResult = {
      fight: {
        id: selectedFight.id,
        name: translateBossName(selectedFight.name ?? '알 수 없는 보스'),
        durationSec,
        kill: Boolean(selectedFight.kill),
        bossPercentage: selectedFight.bossPercentage ?? null,
      },
      wclUrl: `https://www.warcraftlogs.com/reports/${reportCode}#fight=${fightId}`,
      reportCode,
      earlyDeaths,
      consumables,
      dpsPlayers,
      hpsPlayers,
      bloodlusts,
      defensiveUsage,
    };

    return NextResponse.json({ result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
