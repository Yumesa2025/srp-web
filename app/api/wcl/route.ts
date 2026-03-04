import { NextResponse } from 'next/server';

interface WclFightNode {
  id: number;
  name: string;
  startTime: number;
  endTime: number;
  kill?: boolean;
  bossPercentage?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get('reportId');

  if (!reportId) {
    return NextResponse.json({ error: 'WCL 리포트 ID를 입력해주세요.' }, { status: 400 });
  }

  try {
    // 1. WCL 임시 출입증(Access Token) 발급받기
    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch('https://www.warcraftlogs.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('WCL 토큰 발급 실패. ID/Secret을 확인하세요.');
    }

    // 2. [핵심] WCL GraphQL 쿼리 작성 (해당 로그의 보스 킬 목록 가져오기)
    const query = `
      query {
        reportData {
          report(code: "${reportId}") {
            fights {
              id
              name
              startTime
              endTime
              kill
              bossPercentage
            }
          }
        }
      }
    `;

    // 3. WCL API(V2) 서버에 쿼리 전송
    const wclRes = await fetch('https://www.warcraftlogs.com/api/v2/client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query }),
      cache: 'no-store',
    });

    const wclData = await wclRes.json();

    // 에러 처리
    if (wclData.errors) {
      throw new Error(wclData.errors[0].message);
    }

    // 결과값만 예쁘게 뽑아서 전달
    const rawFights = (wclData.data?.reportData?.report?.fights || []) as WclFightNode[];
    const fights = rawFights
      .filter((fight) => typeof fight.id === 'number' && fight.id > 0)
      .map((fight) => ({
        id: fight.id,
        name: fight.name || '알 수 없는 전투',
        startTime: fight.startTime,
        endTime: fight.endTime,
        kill: Boolean(fight.kill),
        bossPercentage: typeof fight.bossPercentage === 'number' ? fight.bossPercentage : null,
        durationSec: Math.max(1, Math.round((fight.endTime - fight.startTime) / 1000)),
      }))
      .sort((a, b) => b.endTime - a.endTime);

    return NextResponse.json({ reportId, fights });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
