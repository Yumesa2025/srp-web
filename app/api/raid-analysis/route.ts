import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/app/lib/rateLimit';
import { getWclToken } from '@/app/lib/tokenCache';
import { fetchWclGraphQL, fetchPagedEvents, WclActorNode, WclAbilityNode, WclEventNode, WclFightNode } from '@/app/api/logs/helpers';
import { BLOODLUST_ABILITY_NAMES } from '@/app/constants/defensiveDefaults';
import type { RaidFight, RaidAnalysisResult, EarlyDeath, ConsumableRow, DpsPlayerData, BloodlustEvent, DefensiveUsagePlayer } from '@/app/types/raidAnalysis';

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
  if (typeof id === 'number' && abilityMap.has(id)) return abilityMap.get(id)!;
  return event.ability?.name ?? '알 수 없는 기술';
}

function extractReportCode(raw: string): string {
  const urlMatch = raw.trim().match(/reports\/([A-Za-z0-9]+)/i);
  if (urlMatch?.[1]) return urlMatch[1];
  return raw.trim().split(/[/?#\s]/)[0].replace(/[^A-Za-z0-9]/g, '');
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
    // 보스 전투만 (bossPercentage가 숫자인 것)
    const fights: RaidFight[] = raw
      .filter(f => typeof f.bossPercentage === 'number')
      .map(f => ({
        id: f.id,
        name: f.name || '알 수 없는 보스',
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
    const playerIds = new Set(actors.filter(a => a.type === 'Player').map(a => a.id));

    const { startTime, endTime } = selectedFight;
    const durationSec = Math.max(1, Math.floor((endTime - startTime) / 1000));

    // 2. 이벤트 병렬 조회
    const [deathEvents, castEvents, damageEvents] = await Promise.all([
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'Deaths', startTime, endTime }),
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'Casts', hostilityType: 'Friendlies', startTime, endTime }),
      fetchPagedEvents({ accessToken: token, reportId: reportCode, fightId, dataType: 'DamageDone', hostilityType: 'Friendlies', startTime, endTime }),
    ]);

    // ── 죽음 분석: 먼저 죽은 3명 ──────────────────────────────
    const sortedDeaths = deathEvents
      .filter(e => e.type === 'death' && typeof e.timestamp === 'number' && typeof e.targetID === 'number' && playerIds.has(e.targetID!))
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

    const allDeathTimes = sortedDeaths.map(e => toFightSec(e.timestamp!, startTime));

    const defensiveNameSet = new Set(defensiveSpellNames.map(n => n.toLowerCase().trim()));

    const earlyDeaths: EarlyDeath[] = sortedDeaths.slice(0, 3).map((death, idx) => {
      const timeSec = toFightSec(death.timestamp!, startTime);

      // 집단 죽음 감지: 이 죽음 ±10초 내에 5명 이상 사망
      const windowCount = allDeathTimes.filter(t => Math.abs(t - timeSec) <= 10).length;
      const isMassDeath = idx > 0 && windowCount >= 5;

      if (isMassDeath) {
        return {
          rank: idx + 1,
          playerName: actorMap.get(death.targetID!) ?? `플레이어#${death.targetID}`,
          timeSec,
          timeStr: secondsToTime(timeSec),
          cause: getAbilityName(death, abilityMap),
          hpBefore: null,
          defensivesUsed: [],
          isSkipped: true,
          skipReason: `집단 죽음 (${windowCount}명, ±10초 이내) — 리트라이 가능성`,
        };
      }

      // 죽기 전 5초 이내 생존기 사용 여부
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

      // HP before death
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
        timeSec,
        timeStr: secondsToTime(timeSec),
        cause: getAbilityName(death, abilityMap),
        hpBefore,
        defensivesUsed: Array.from(new Set(defensivesUsed)),
        isSkipped: false,
      };
    });

    // ── 소모품 O/X ────────────────────────────────────────────
    const consumableMap = new Map<string, { dpsPotion: boolean; healthstone: boolean; healingPotion: boolean }>();
    const ensurePlayer = (name: string) => {
      if (!consumableMap.has(name)) consumableMap.set(name, { dpsPotion: false, healthstone: false, healingPotion: false });
      return consumableMap.get(name)!;
    };
    playerIds.forEach(id => {
      const name = actorMap.get(id);
      if (name) ensurePlayer(name);
    });

    castEvents.forEach(e => {
      if (!e.timestamp || typeof e.sourceID !== 'number' || !playerIds.has(e.sourceID)) return;
      const name = actorMap.get(e.sourceID) ?? '';
      if (!name) return;
      const abilityName = getAbilityName(e, abilityMap).toLowerCase();
      const row = ensurePlayer(name);

      if (abilityName.includes('생명석') || abilityName.includes('healthstone')) {
        row.healthstone = true;
      } else if (
        (abilityName.includes('치유') && abilityName.includes('물약')) ||
        (abilityName.includes('healing') && abilityName.includes('potion'))
      ) {
        row.healingPotion = true;
      } else if (
        abilityName.includes('물약') || abilityName.includes('potion') ||
        abilityName.includes('엘릭서') || abilityName.includes('elixir')
      ) {
        row.dpsPotion = true;
      }
    });

    const consumables: ConsumableRow[] = Array.from(consumableMap.entries())
      .map(([name, flags]) => ({ name, ...flags }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // ── 개인별 DPS 그래프 ─────────────────────────────────────
    // 플레이어별 초당 딜량 누적
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

    const dpsPlayers: DpsPlayerData[] = [];
    playerDamageBySecond.forEach((secMap, sourceId) => {
      const name = actorMap.get(sourceId);
      if (!name) return;

      let totalDamage = 0;
      secMap.forEach(v => totalDamage += v);
      if (totalDamage < 1000) return; // 딜러가 아닌 플레이어 제외

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
        totalDamage,
        avgDps: Math.round(totalDamage / durationSec),
        maxDps,
        timeline,
      });
    });
    dpsPlayers.sort((a, b) => b.totalDamage - a.totalDamage);

    // ── 블러드러스트 타이밍 ──────────────────────────────────
    const bloodlusts: BloodlustEvent[] = [];
    castEvents.forEach(e => {
      if (!e.timestamp) return;
      const name = getAbilityName(e, abilityMap).toLowerCase().trim();
      if (BLOODLUST_ABILITY_NAMES.has(name)) {
        const timeSec = toFightSec(e.timestamp, startTime);
        bloodlusts.push({
          ability: getAbilityName(e, abilityMap),
          timeSec,
          timeStr: secondsToTime(timeSec),
        });
      }
    });

    // ── 생존기 사용 횟수 (유저 설정 기반) ────────────────────
    const defensiveUsageMap = new Map<string, { ability: string; timeSec: number; timeStr: string }[]>();
    if (defensiveNameSet.size > 0) {
      castEvents.forEach(e => {
        if (!e.timestamp || typeof e.sourceID !== 'number' || !playerIds.has(e.sourceID)) return;
        const abilityName = getAbilityName(e, abilityMap);
        if (!defensiveNameSet.has(abilityName.toLowerCase().trim())) return;
        const name = actorMap.get(e.sourceID) ?? '';
        if (!name) return;
        if (!defensiveUsageMap.has(name)) defensiveUsageMap.set(name, []);
        const timeSec = toFightSec(e.timestamp, startTime);
        defensiveUsageMap.get(name)!.push({ ability: abilityName, timeSec, timeStr: secondsToTime(timeSec) });
      });
    }

    const defensiveUsage: DefensiveUsagePlayer[] = Array.from(defensiveUsageMap.entries())
      .map(([name, casts]) => ({ name, casts: casts.sort((a, b) => a.timeSec - b.timeSec) }))
      .sort((a, b) => b.casts.length - a.casts.length);

    // ── 결과 반환 ────────────────────────────────────────────
    const result: RaidAnalysisResult = {
      fight: {
        id: selectedFight.id,
        name: selectedFight.name ?? '알 수 없는 보스',
        durationSec,
        kill: Boolean(selectedFight.kill),
        bossPercentage: selectedFight.bossPercentage ?? null,
      },
      wclUrl: `https://www.warcraftlogs.com/reports/${reportCode}#fight=${fightId}`,
      reportCode,
      earlyDeaths,
      consumables,
      dpsPlayers,
      bloodlusts,
      defensiveUsage,
    };

    return NextResponse.json({ result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
