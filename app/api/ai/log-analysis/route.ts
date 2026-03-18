import { NextResponse } from "next/server";

interface AnalysisInputLog {
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
  perPlayer: {
    playerName: string;
    deaths: number;
    firstDeathTime: string | null;
    lastDeathTime: string | null;
    avgHpBeforeDeath: number | null;
    defensiveMissingCount: number;
    defensiveUseRate: number | null;
    topCauses: { ability: string; count: number }[];
    nearbyBossSkills: { ability: string; count: number }[];
    deathTimes: string[];
    risk: "HIGH" | "MEDIUM" | "LOW";
    notes: string[];
  }[];
  consumables?: {
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
  throughputTimeline?: {
    sec: number;
    time: string;
    damage: number;
    healing: number;
    dps: number;
    hps: number;
  }[];
  firstMeaningfulDeaths: {
    playerName: string;
    time: string;
    ability: string;
    hpPercentBefore: number | null;
    defensives: string[];
    nearbyBossSkills: string[];
  }[];
  bossCoverage: {
    time: string;
    ability: string;
    defensiveCount: number;
    defensives: string[];
    covered: boolean;
  }[];
  deaths: {
    playerName: string;
    time: string;
    ability: string;
    hpPercentBefore: number | null;
    defensives: string[];
    nearbyBossSkills: string[];
  }[];
}

const compactLog = (log: AnalysisInputLog) => ({
  reportId: log.reportId,
  fight: log.fight,
  totalDeaths: log.totalDeaths,
  meaningfulDeathsCount: log.meaningfulDeathsCount,
  excludedTailDeaths: log.excludedTailDeaths,
  deathStartSec: log.deathStartSec,
  wipeTail: log.wipeTail,
  topCauses: log.topCauses.slice(0, 8),
  playerDeaths: log.playerDeaths.slice(0, 8),
  defensiveMissingCount: log.defensiveMissingCount,
  perPlayer: log.perPlayer.slice(0, 20),
  consumables: log.consumables
    ? {
        totals: log.consumables.totals,
        missing: {
          healthstone: log.consumables.missing.healthstone.slice(0, 15),
          healingPotion: log.consumables.missing.healingPotion.slice(0, 15),
          dpsPotion: log.consumables.missing.dpsPotion.slice(0, 15),
        },
        timeline: log.consumables.timeline.slice(0, 40),
      }
    : null,
  throughputSample: (log.throughputTimeline || []).filter((point) => point.sec % 10 === 0).slice(0, 80),
  firstMeaningfulDeaths: log.firstMeaningfulDeaths.slice(0, 8),
  bossCoverageSample: log.bossCoverage.slice(0, 30),
  deathSamples: log.deaths.slice(0, 30),
});

const buildFallbackAnalysis = (log: AnalysisInputLog) => {
  const startTime = typeof log.deathStartSec === "number" ? `${Math.floor(log.deathStartSec / 60)
    .toString()
    .padStart(2, "0")}:${(log.deathStartSec % 60).toString().padStart(2, "0")}` : "데이터 부족";
  const topCause = log.topCauses[0];
  const topDeadPlayer = log.playerDeaths[0];
  const uncovered = log.bossCoverage.filter((item) => !item.covered).length;

  return [
    "## 공대 클리닉: 사망 원인 분석 (기본 분석)",
    `- 전투: ${log.fight.name} (#${log.fight.id})`,
    `- 총 사망: ${log.totalDeaths}회 / 유효 사망: ${log.meaningfulDeathsCount}회`,
    `- 사망 시작 시점: ${startTime}`,
    log.wipeTail.detected
      ? `- 막바지 대량 전멸 구간 제외: ${log.wipeTail.startSec}s 이후 ${log.wipeTail.tailDeaths}회`
      : "- 막바지 대량 전멸 구간 제외: 없음",
    topCause ? `- 주요 원인 스킬: ${topCause.ability} (${topCause.count}회)` : "- 주요 원인 스킬: 데이터 부족",
    topDeadPlayer
      ? `- 반복 사망 대상: ${topDeadPlayer.name} (${topDeadPlayer.count}회)`
      : "- 반복 사망 대상: 데이터 부족",
    `- 생존기 미사용 추정: ${log.defensiveMissingCount}회`,
    `- 보스 캐스트 커버 누락 구간: ${uncovered}회`,
    `- 개인 추적 대상: ${log.perPlayer.filter((p) => p.risk !== "LOW").length}명`,
    "",
    "## 즉시 수정 액션",
    "1. 첫 사망 구간 직전 3초에 외생기/공생기 예약 배치",
    "2. 반복 사망 대상의 개인 생존기 타이밍을 고정 호출",
    "3. 보스 스킬 커버 누락 구간부터 택틱 우선 보강",
  ].join("\n");
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const failedLog = body?.failedLog as AnalysisInputLog | undefined;
    if (!failedLog) {
      return NextResponse.json({ error: "failedLog 데이터가 필요합니다." }, { status: 400 });
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ analysis: buildFallbackAnalysis(failedLog) });
    }

    const prompt = `
너는 월드 오브 워크래프트 공대 로그를 분석하는 코치 AI다.
아래는 실패 로그 단일 분석 데이터다.

${JSON.stringify(compactLog(failedLog), null, 2)}

아래 형식으로 한국어 분석 리포트를 작성하라.
1) "언제 무너지기 시작했는가" (첫 사망 구간 중심)
2) "핵심 사망 원인 TOP 3" (능력명, 횟수, 근거)
3) "보스 스킬 대비 생존기 커버 상태" (커버된 패턴 / 비어있는 패턴)
4) "플레이어별 추적 분석" (최소 5명 또는 데이터 있는 전원, 각 1~2줄)
5) "반복 사망자 코칭" (최대 3명)
6) "소모품 사용 평가" (생석/치유물약/딜물약 사용/미사용)
7) "다음 트라이 즉시 지시문" (현장에서 그대로 읽을 수 있게 짧고 명확하게)

규칙:
- 막바지 대량 전멸로 판정된 구간(wipeTail)은 주 원인 분석에서 제외한다.
- 모르면 추정하지 말고 "데이터 부족"으로 명시한다.
- 비난 대신 실행 가능한 지시문으로 작성한다.
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
        const errText = await response.text();
        throw new Error(`Minimax API 에러: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const analysis = data.choices[0]?.message?.content || "AI 분석 결과를 생성하지 못했습니다.";
    return NextResponse.json({ analysis });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "로그 AI 분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
