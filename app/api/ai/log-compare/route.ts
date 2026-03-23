import { NextResponse } from "next/server";

interface CompareInputLog {
  reportId: string;
  fight: {
    id: number;
    name: string;
    kill: boolean;
    durationSec: number;
  };
  totalDeaths: number;
  topCauses: { ability: string; count: number }[];
  playerDeaths: { name: string; count: number }[];
  defensiveMissingCount?: number;
  hpTraceAvg?: { secFromDeath: number; hpPercent: number | null }[];
  drTraceAvg?: { secFromDeath: number; drPercentEstimate: number | null }[];
  reactionMsStats?: {
    avgMs: number | null;
    p50Ms: number | null;
    sampleCount: number;
    lateCount: number;
  };
  eventOverlay?: { secFromDeath: number; kind: "damage" | "debuff" | "defensive"; ability: string; count: number }[];
  deaths: {
    playerName: string;
    time: string;
    ability: string;
    damage: number | null;
    hpPercentBefore: number | null;
    defensives: string[];
    hpTrace?: { secFromDeath: number; hpPercent: number | null }[];
  }[];
}

interface MinimaxResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

const compactLog = (log: CompareInputLog) => ({
  reportId: log.reportId,
  fight: log.fight,
  totalDeaths: log.totalDeaths,
  topCauses: log.topCauses.slice(0, 6),
  playerDeaths: log.playerDeaths.slice(0, 8),
  defensiveMissingCount: log.defensiveMissingCount ?? 0,
  hpTraceAvg: log.hpTraceAvg ?? [],
  drTraceAvg: log.drTraceAvg ?? [],
  reactionMsStats: log.reactionMsStats ?? null,
  eventOverlay: (log.eventOverlay ?? []).slice(0, 10),
  deaths: log.deaths.slice(0, 40),
});

const buildFallbackAnalysis = (failed: CompareInputLog, successes: CompareInputLog[]) => {
  const avgSuccessDeaths =
    successes.length > 0
      ? successes.reduce((sum, log) => sum + log.totalDeaths, 0) / successes.length
      : 0;

  const failedTopCause = failed.topCauses[0];
  const repeatedDeathPlayer = failed.playerDeaths[0];
  const failedDefMissing = failed.defensiveMissingCount ?? 0;
  const failedDefMissingRate =
    failed.totalDeaths > 0 ? ((failedDefMissing / failed.totalDeaths) * 100).toFixed(1) : "0.0";

  return [
    "## 공대 AI 분석 (기본 분석)",
    `- 실패 로그: ${failed.fight.name} / 총 사망 ${failed.totalDeaths}회`,
    `- 비교 로그 평균 사망: ${avgSuccessDeaths.toFixed(1)}회`,
    failedTopCause
      ? `- 주요 사망 원인: ${failedTopCause.ability} (${failedTopCause.count}회)`
      : "- 주요 사망 원인: 데이터 없음",
    `- 생존기 미사용 추정 사망 비율: ${failedDefMissingRate}%`,
    repeatedDeathPlayer
      ? `- 반복 사망 대상: ${repeatedDeathPlayer.name} (${repeatedDeathPlayer.count}회)`
      : "- 반복 사망 대상: 데이터 없음",
    "",
    "## 즉시 액션",
    "1. 주요 사망 원인 스킬 직전(2~3초) 외생기 예약 배정",
    "2. 반복 사망 대상 개인 생존기 타이밍 고정",
    "3. 동일 구간 힐러 프리힐 타이밍을 성공 로그와 맞춤",
    "",
    "## 개인별 코칭",
    repeatedDeathPlayer
      ? `- ${repeatedDeathPlayer.name}: 사망 직전 5초 구간에서 개인 생존기 우선 사용 지시`
      : "- 데이터 부족",
  ].join("\n");
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      failedLog?: CompareInputLog;
      successLogs?: CompareInputLog[];
    };
    const failedLog = body.failedLog;
    const successLogs = body.successLogs || [];

    if (!failedLog || !Array.isArray(successLogs) || successLogs.length === 0) {
      return NextResponse.json({ error: "failedLog / successLogs 데이터가 필요합니다." }, { status: 400 });
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ analysis: buildFallbackAnalysis(failedLog, successLogs) });
    }

    const prompt = `
너는 월드 오브 워크래프트 공대 로그를 비교 분석하는 코치 AI다.

[우리 공대 실패 로그 요약]
${JSON.stringify(compactLog(failedLog), null, 2)}

[비교 대상 성공 로그 요약들]
${JSON.stringify(successLogs.map(compactLog), null, 2)}

다음 형식으로 한국어 분석 리포트를 작성하라.
1) "핵심 차이 TOP 3" (숫자 근거 포함)
2) "우리 공대 문제점" (공대 공통 / 개인 반복 이슈 분리)
3) "즉시 수정 액션" (다음 트라이에서 바로 적용 가능한 지시문)
4) "트라이별 코멘트" (실패 로그 1개 + 성공 로그 각각 1~2줄)
5) "HP 추이 비교" (사망 직전 5초 평균 HP 기준으로 결론)
6) "개인별 코칭" (반복 사망자/핵심 대상자 3명 이내)

규칙:
- 모르면 추정하지 말고 "데이터 부족"이라고 명시한다.
- 비난 대신 개선 지시 형태로 쓴다.
- 생존기 관련 코멘트는 death.defensives 정보가 있을 때만 단정한다.
`;

    const response = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "MiniMax-Text-01",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      })
    });

    if (!response.ok) {
        console.error(`Minimax API 에러: ${response.status}`);
        throw new Error("AI 서비스 요청에 실패했습니다.");
    }

    const data = (await response.json()) as MinimaxResponse;
    const analysis = data.choices?.[0]?.message?.content || "AI 분석 결과를 생성하지 못했습니다.";
    return NextResponse.json({ analysis });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "로그 비교 AI 분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
