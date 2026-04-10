import { NextResponse } from 'next/server';
import { externalApi } from '@/app/lib/api';
import { getWclToken } from '@/app/lib/tokenCache';
import { checkRateLimit, getClientIp } from '@/app/lib/rateLimit';
import { createClient } from '@/app/utils/supabase/server';

interface TimelineEventNode {
  type: string;
  timestamp: number;
  abilityGameID: number;
}

interface TimelineAbilityNode {
  gameID: number;
  name: string;
}

interface WclTimelineResponse {
  errors?: { message?: string }[];
  data?: {
    reportData?: {
      report?: {
        masterData?: {
          abilities?: TimelineAbilityNode[];
        };
        events?: {
          data?: TimelineEventNode[];
        };
      };
    };
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const rl = checkRateLimit(getClientIp(request), 'wcl-timeline', 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: '요청이 너무 많습니다.' }, { status: 429 });

  const { searchParams } = new URL(request.url);
  const reportId  = searchParams.get('reportId');
  const fightId   = searchParams.get('fightId');
  const startTime = searchParams.get('startTime');
  const endTime   = searchParams.get('endTime');

  if (!reportId || !fightId || !startTime || !endTime) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
  }

  try {
    const accessToken = await getWclToken();

    const parsedFightId = Number(fightId);
    const parsedStartTime = Number(startTime);
    const parsedEndTime = Number(endTime);
    if (!Number.isFinite(parsedFightId) || !Number.isFinite(parsedStartTime) || !Number.isFinite(parsedEndTime)) {
      return NextResponse.json({ error: '유효하지 않은 숫자 파라미터입니다.' }, { status: 400 });
    }

    const query = `
      query($code: String!, $fightIDs: [Int]!, $start: Float!, $end: Float!) {
        reportData {
          report(code: $code) {
            masterData {
              abilities {
                gameID
                name
              }
            }
            events(
              fightIDs: $fightIDs,
              dataType: Casts,
              hostilityType: Enemies,
              startTime: $start,
              endTime: $end,
              limit: 10000
            ) {
              data
            }
          }
        }
      }
    `;
    const variables = {
      code: reportId,
      fightIDs: [parsedFightId],
      start: parsedStartTime,
      end: parsedEndTime,
    };

    const wclRes = await externalApi.post('https://www.warcraftlogs.com/api/v2/client', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      json: { query, variables },
      cache: 'no-store',
      throwHttpErrors: false,
    });

    const rawText = await wclRes.text();
    if (!wclRes.ok) {
      throw new Error(`WCL 타임라인 조회 실패 HTTP ${wclRes.status}: ${rawText.slice(0, 500)}`);
    }

    let wclData: WclTimelineResponse;
    try {
      wclData = JSON.parse(rawText) as WclTimelineResponse;
    } catch {
      throw new Error(`WCL 타임라인 JSON 파싱 실패: ${rawText.slice(0, 500)}`);
    }

    if (wclData.errors) throw new Error(wclData.errors[0].message);

    const reportNode = wclData.data?.reportData?.report;
    const rawEvents: TimelineEventNode[] =
      reportNode?.events?.data || [];

    // 1. 스킬 번호(ID)를 이름으로 바꿔줄 번역 사전 만들기
    const abilities: TimelineAbilityNode[] =
      reportNode?.masterData?.abilities || [];
    const abilityMap = new Map<number, string>();
    abilities.forEach((ab) => abilityMap.set(ab.gameID, ab.name));

    const startMs = Number(startTime);
    const uniqueTimeline: { time: string; spellId: number; spellName: string }[] = [];
    const seen = new Set<string>(); // 중복 체크용

    // 2. 이벤트 정제 및 중복 제거
    rawEvents
      .filter((ev) => ev.type === 'cast')
      .forEach((ev) => {
        const timeOffsetMs = ev.timestamp - startMs;
        const minutes      = Math.floor(timeOffsetMs / 60000);
        const seconds      = Math.floor((timeOffsetMs % 60000) / 1000);
        const timeString   = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const spellId   = ev.abilityGameID;
        const spellName = abilityMap.get(spellId) || '알 수 없는 스킬';

        // "시간-스킬ID" 조합으로 고유 키 생성 (예: "01:25-1243453")
        const uniqueKey = `${timeString}-${spellId}`;

        // 같은 시간대에 같은 스킬이 없을 때만 추가 (광역기 도배 방지)
        if (!seen.has(uniqueKey)) {
          seen.add(uniqueKey);
          uniqueTimeline.push({ time: timeString, spellId, spellName });
        }
      });

    return NextResponse.json({ boss: '로그 분석 완료', timeline: uniqueTimeline });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
