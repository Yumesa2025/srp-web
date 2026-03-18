import { NextResponse } from "next/server";
import {
  fetchPagedEvents,
  fetchWclGraphQL,
  pickFight,
  WclAbilityNode,
  WclActorNode,
  WclFightNode,
} from "./helpers";
import { buildLogSummary } from "./buildSummary";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      reportId?: string;
      fightId?: number;
      preferKill?: boolean;
      throughputStepSec?: number;
    };
    const rawReportId = typeof body.reportId === "string" ? body.reportId : "";
    const reportId = rawReportId.replace(/[^A-Za-z0-9]/g, "");
    const fightId = typeof body.fightId === "number" ? Math.floor(body.fightId) : undefined;
    const preferKill = Boolean(body.preferKill);
    const rawThroughputStepSec = Number(body.throughputStepSec);
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

    const fights = (fightData?.data?.reportData?.report?.fights || []) as WclFightNode[];
    if (fights.length === 0) {
      return NextResponse.json({ error: "해당 리포트에서 전투를 찾지 못했습니다." }, { status: 404 });
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

    const reportNode = masterData?.data?.reportData?.report;
    const abilities = (reportNode?.masterData?.abilities || []) as WclAbilityNode[];
    const actors = (reportNode?.masterData?.actors || []) as WclActorNode[];

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
