import { NextResponse } from 'next/server';
import { resolveKrRealm } from '@/app/lib/krRealmResolver';
import { checkRateLimit, getClientIp } from '@/app/lib/rateLimit';
import { getBlizzardToken, getWclToken } from '@/app/lib/tokenCache';

type WclMetric = 'dps' | 'hps' | 'tankhps';

interface WclBestPerfDetails {
  raidName: string | null;
  normal: number | null;
  heroic: number | null;
  mythic: number | null;
  metric: WclMetric | null;
}

interface BlizzardStatsResponse {
  character?: {
    name?: string;
  };
  health?: number;
  armor?: {
    effective?: number;
  };
  versatility?: number;
}

interface BlizzardProfileResponse {
  name?: string;
  equipped_item_level?: number;
  character_class?: {
    name?: string;
  };
}

interface BlizzardTalentNode {
  tooltip?: {
    spell_tooltip?: {
      spell?: {
        name?: string;
      };
    };
  };
}

interface BlizzardLoadout {
  is_active?: boolean;
  selected_class_talents?: BlizzardTalentNode[];
  selected_spec_talents?: BlizzardTalentNode[];
}

interface BlizzardSpecializationEntry {
  specialization?: {
    id?: number;
  };
  loadouts?: BlizzardLoadout[];
}

interface BlizzardTalentsResponse {
  active_specialization?: {
    id?: number;
    name?: string;
  };
  specializations?: BlizzardSpecializationEntry[];
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timeout);
        resolve(fallback);
      });
  });
}

const WCL_DIFFICULTY = {
  normal: 3,
  heroic: 4,
  mythic: 5,
} as const;

function parseJsonIfString(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function findBestPerformanceAverage(value: unknown): number | null {
  const parsed = parseJsonIfString(value);

  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.bestPerformanceAverage === 'number' && Number.isFinite(obj.bestPerformanceAverage)) {
      return obj.bestPerformanceAverage;
    }
  }

  return null;
}

function findZoneId(value: unknown): number | null {
  const parsed = parseJsonIfString(value);
  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.zone === 'number' && Number.isFinite(obj.zone)) {
    return obj.zone;
  }

  if (obj.zone && typeof obj.zone === 'object') {
    const zoneObj = obj.zone as Record<string, unknown>;
    if (typeof zoneObj.id === 'number' && Number.isFinite(zoneObj.id)) {
      return zoneObj.id;
    }
  }

  return null;
}

function hasAnyWclValue(details: Pick<WclBestPerfDetails, 'normal' | 'heroic' | 'mythic'>): boolean {
  return [details.normal, details.heroic, details.mythic].some(
    (value) => typeof value === 'number' && Number.isFinite(value)
  );
}

function getLegacyBestPerfAvg(details: WclBestPerfDetails | null): number | null {
  if (!details) return null;
  const values = [details.normal, details.heroic, details.mythic].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  );
  if (values.length === 0) return null;
  return Math.max(...values);
}

async function fetchWclRaidName(accessToken: string, zoneId: number): Promise<string | null> {
  try {
    const query = `query($zoneId: Int!) { worldData { zone(id: $zoneId) { name } } }`;
    const response = await fetch('https://www.warcraftlogs.com/api/v2/client', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { zoneId } }),
      cache: 'no-store',
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { data?: { worldData?: { zone?: { name?: string } } } };
    const zoneName = data?.data?.worldData?.zone?.name;
    return typeof zoneName === 'string' ? zoneName : null;
  } catch {
    return null;
  }
}

async function fetchWclBestPerfDetails(characterName: string, realmSlug: string): Promise<WclBestPerfDetails | null> {
  if (!process.env.WCL_CLIENT_ID || !process.env.WCL_CLIENT_SECRET) return null;

  try {
    const accessToken = await getWclToken();
    const normalizedRealm = realmSlug.toLowerCase().trim().replace(/\s+/g, '-');

    const metrics: WclMetric[] = ['hps', 'dps', 'tankhps'];
    let bestCandidate: (WclBestPerfDetails & { zoneId: number | null; peak: number }) | null = null;

    for (const metric of metrics) {
      // metric is an enum (CharacterRankingMetricType) — kept inline since it's hardcoded
      const query = `
        query($name: String!, $server: String!, $region: String!) {
          characterData {
            character(name: $name, serverSlug: $server, serverRegion: $region) {
              normal: zoneRankings(difficulty: ${WCL_DIFFICULTY.normal}, metric: ${metric})
              heroic: zoneRankings(difficulty: ${WCL_DIFFICULTY.heroic}, metric: ${metric})
              mythic: zoneRankings(difficulty: ${WCL_DIFFICULTY.mythic}, metric: ${metric})
            }
          }
        }
      `;
      const variables = { name: characterName, server: normalizedRealm, region: "KR" };

      const graphResponse = await fetch('https://www.warcraftlogs.com/api/v2/client', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
      });

      if (!graphResponse.ok) {
        continue;
      }

      const graphData = (await graphResponse.json()) as {
        data?: {
          characterData?: {
            character?: Record<string, unknown>;
          };
        };
      };
      const character = graphData?.data?.characterData?.character;
      if (!character) {
        continue;
      }

      const normal = findBestPerformanceAverage(character.normal);
      const heroic = findBestPerformanceAverage(character.heroic);
      const mythic = findBestPerformanceAverage(character.mythic);
      const zoneId =
        findZoneId(character.mythic) ??
        findZoneId(character.heroic) ??
        findZoneId(character.normal);

      const candidateBase = { normal, heroic, mythic, metric };
      if (!hasAnyWclValue(candidateBase)) {
        continue;
      }

      const values = [normal, heroic, mythic].filter(
        (value): value is number => typeof value === 'number' && Number.isFinite(value)
      );
      const peak = values.length > 0 ? Math.max(...values) : -1;

      if (!bestCandidate || peak > bestCandidate.peak) {
        bestCandidate = {
          raidName: null,
          normal,
          heroic,
          mythic,
          metric,
          zoneId,
          peak,
        };
      }
    }

    if (!bestCandidate) {
      return null;
    }

    const raidName = bestCandidate.zoneId
      ? await fetchWclRaidName(accessToken, bestCandidate.zoneId)
      : null;

    return {
      raidName,
      normal: bestCandidate.normal,
      heroic: bestCandidate.heroic,
      mythic: bestCandidate.mythic,
      metric: bestCandidate.metric,
    };
  } catch (error) {
    console.warn('WCL Best Perf. Avg 조회 실패:', error);
  }

  return null;
}

export async function GET(request: Request) {
  const rl = checkRateLimit(getClientIp(request), "character", 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const realm = searchParams.get('realm');
  const name = searchParams.get('name');

  if (!realm || !name) {
    return NextResponse.json({ error: '서버 이름과 캐릭터 이름을 입력해주세요.' }, { status: 400 });
  }

  try {
    // 1. 블리자드 토큰 (캐시에서 반환, 만료 시 자동 재발급)
    const accessToken = await getBlizzardToken();
    const resolvedRealm = await resolveKrRealm(accessToken, realm);
    const realmSlug = resolvedRealm.slug;

    // 2~4. Blizzard 3개 + WCL 병렬 호출
    const headers = { 'Authorization': `Bearer ${accessToken}` };
    const baseUrl = `https://kr.api.blizzard.com/profile/wow/character/${realmSlug}/${encodeURIComponent(name)}`;

    const [statsResponse, profileResponse, talentsResponse, bestPerfDetails] = await Promise.all([
      fetch(`${baseUrl}/statistics?namespace=profile-kr&locale=ko_KR`, { headers, cache: 'no-store' }),
      fetch(`${baseUrl}?namespace=profile-kr&locale=ko_KR`, { headers, cache: 'no-store' }),
      fetch(`${baseUrl}/specializations?namespace=profile-kr&locale=ko_KR`, { headers, cache: 'no-store' }),
      withTimeout(fetchWclBestPerfDetails(name, realmSlug), 4000, null),
    ]);

    if (!statsResponse.ok) {
      throw new Error('캐릭터를 찾을 수 없거나 서버 오류입니다.');
    }
    const statsData = (await statsResponse.json()) as BlizzardStatsResponse;

    let itemLevel = 0;
    let className = "알 수 없음";
    let profileName = statsData.character?.name;

    if (profileResponse.ok) {
      const profileData = (await profileResponse.json()) as BlizzardProfileResponse;
      itemLevel = profileData.equipped_item_level || 0;
      className = profileData.character_class?.name || "알 수 없음";
      profileName = profileData.name || profileName;
    }

    const bestPerfAvg = getLegacyBestPerfAvg(bestPerfDetails);

    let activeSpecName = "알 수 없음";
    const talentNames: string[] = [];

    if (talentsResponse.ok) {
      const talentsData = (await talentsResponse.json()) as BlizzardTalentsResponse;
      
      // 현재 활성화된 전문화 이름 (예: "신성", "무기", "화염")
      activeSpecName = talentsData.active_specialization?.name || "알 수 없음";

      // 현재 활성화된 특성 트리(Loadout) 찾기
      const activeSpec = talentsData.specializations?.find(
        (spec) => spec.specialization?.id === talentsData.active_specialization?.id
      );
      const activeLoadout = activeSpec?.loadouts?.find((loadout) => loadout.is_active);

      // 찍어둔 공용 특성 & 전문화 특성 이름 모두 수집
      if (activeLoadout) {
        activeLoadout.selected_class_talents?.forEach((talent) => {
          if (talent.tooltip?.spell_tooltip?.spell?.name) {
            talentNames.push(talent.tooltip.spell_tooltip.spell.name);
          }
        });
        activeLoadout.selected_spec_talents?.forEach((talent) => {
          if (talent.tooltip?.spell_tooltip?.spell?.name) {
            talentNames.push(talent.tooltip.spell_tooltip.spell.name);
          }
        });
      }
    }

    // 5. 필요한 데이터만 정제해서 프론트엔드로 리턴
    const result = {
      name: profileName,
      health: statsData.health,
      armor: statsData.armor?.effective ?? 0,
      versatility: statsData.versatility,
      activeSpec: activeSpecName, // 추가: 현재 전문화
      talents: talentNames,       // 추가: 찍은 스킬(특성) 전체 목록
      itemLevel,                  // 추가: 착용 아이템 레벨
      className,                  // 추가: 직업명(한국어)
      bestPerfAvg,                // 추가: Warcraft Logs Best Perf. Avg
      bestPerfDetails,            // 추가: 난이도별 Best Perf Avg + 레이드명
      realm: realmSlug,           // 추가: 정규화된 서버 슬러그
      realmName: resolvedRealm.name, // 추가: 서버 표시명(가능한 경우)
    };

    return NextResponse.json(result);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
