import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/app/lib/rateLimit";

const LogsRequestSchema = z.object({
  reportId: z.string().min(1, "reportId가 필요합니다."),
  fightId: z.number().int().positive().optional(),
  preferKill: z.boolean().optional(),
  throughputStepSec: z.number().optional(),
});
import {
  fetchPagedEvents,
  fetchWclGraphQL,
  pickFight,
  WclAbilityNode,
  WclActorNode,
  WclFightNode,
} from "./helpers";
import { buildLogSummary } from "./buildSummary";

function extractReportCode(raw: string): string {
  const value = raw.trim();
  if (!value) return "";

  const urlMatch = value.match(/reports\/([A-Za-z0-9]+)/i);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  const token = value.split(/[/?#\s]/)[0] || "";
  return token.replace(/[^A-Za-z0-9]/g, "");
}

export async function POST(request: Request) {
  const rl = checkRateLimit(getClientIp(request), "logs", 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  try {
    const rawBody = await request.json();
    const parsed = LogsRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const reportId = extractReportCode(parsed.data.reportId);
    const fightId = parsed.data.fightId;
    const preferKill = Boolean(parsed.data.preferKill);
    const rawThroughputStepSec = Number(parsed.data.throughputStepSec);
    const throughputStepSec =
      Number.isFinite(rawThroughputStepSec) && rawThroughputStepSec >= 1
        ? Math.min(30, Math.floor(rawThroughputStepSec))
        : 2;

    if (!reportId) {
      return NextResponse.json({ error: "reportId가 필요합니다." }, { status: 400 });
    }

    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "WCL_CLIENT_ID / WCL_CLIENT_SECRET 환경변수를 설정해 주세요." }, { status: 500 });
    }

    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://www.warcraftlogs.com/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.json({ error: "WCL 토큰 발급 실패" }, { status: 500 });
    }

    const fightQuery = `
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

    const fightData = await fetchWclGraphQL(accessToken, fightQuery);
    if (fightData?.errors?.length) {
      throw new Error(fightData.errors[0].message || "WCL fight 조회 실패");
    }

    const reportNode = fightData?.data?.reportData?.report;
    if (!reportNode) {
      return NextResponse.json(
        { error: `WCL 리포트를 찾지 못했습니다. reportId를 확인해 주세요. (${reportId})` },
        { status: 404 }
      );
    }

    const fights = (reportNode.fights || []) as WclFightNode[];
    if (fights.length === 0) {
      return NextResponse.json(
        { error: `리포트는 찾았지만 전투 목록이 비어 있습니다. 비공개 로그이거나 접근 권한 문제일 수 있습니다. (${reportId})` },
        { status: 404 }
      );
    }

    const selectedFight = pickFight(fights, fightId, preferKill);
    if (!selectedFight) {
      return NextResponse.json({ error: "선택 가능한 전투가 없습니다." }, { status: 404 });
    }

    const masterQuery = `
      query {
        reportData {
          report(code: "${reportId}") {
            masterData {
              abilities { gameID name }
              actors { id name type subType petOwner }
            }
          }
        }
      }
    `;

    const masterData = await fetchWclGraphQL(accessToken, masterQuery);
    if (masterData?.errors?.length) {
      throw new Error(masterData.errors[0].message || "WCL masterData 조회 실패");
    }

    const [
      rawDeathEvents,
      rawEnemyCastEvents,
      rawFriendlyCastEvents,
      rawDamageEvents,
      rawHealingEvents,
    ] = await Promise.all([
      fetchPagedEvents({
        accessToken,
        reportId,
        fightId: selectedFight.id,
        dataType: "Deaths",
        startTime: selectedFight.startTime,
        endTime: selectedFight.endTime,
      }),
      fetchPagedEvents({
        accessToken,
        reportId,
        fightId: selectedFight.id,
        dataType: "Casts",
        hostilityType: "Enemies",
        startTime: selectedFight.startTime,
        endTime: selectedFight.endTime,
      }),
      fetchPagedEvents({
        accessToken,
        reportId,
        fightId: selectedFight.id,
        dataType: "Casts",
        hostilityType: "Friendlies",
        startTime: selectedFight.startTime,
        endTime: selectedFight.endTime,
      }),
      fetchPagedEvents({
        accessToken,
        reportId,
        fightId: selectedFight.id,
        dataType: "DamageDone",
        hostilityType: "Friendlies",
        startTime: selectedFight.startTime,
        endTime: selectedFight.endTime,
      }),
      fetchPagedEvents({
        accessToken,
        reportId,
        fightId: selectedFight.id,
        dataType: "Healing",
        hostilityType: "Friendlies",
        startTime: selectedFight.startTime,
        endTime: selectedFight.endTime,
      }),
    ]);

    const masterReportNode = masterData?.data?.reportData?.report;
    const abilities = (masterReportNode?.masterData?.abilities || []) as WclAbilityNode[];
    const actors = (masterReportNode?.masterData?.actors || []) as WclActorNode[];

    const summary = buildLogSummary({
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
    });

    return NextResponse.json({ summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "로그 분석 데이터를 불러오는 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
