import { externalApi } from "@/app/lib/api";

export interface WclFightNode {
  id: number;
  name: string;
  startTime: number;
  endTime: number;
  kill?: boolean;
  bossPercentage?: number;
  size?: number;
  difficulty?: number;
}

export interface WclAbilityNode {
  gameID: number;
  name: string;
}

export interface WclActorNode {
  id: number;
  name: string;
  type?: string;
  subType?: string;
  petOwner?: number | null;
}

export interface WclEventNode {
  type?: string;
  timestamp?: number;
  sourceID?: number;
  targetID?: number;
  abilityGameID?: number;
  ability?: { guid?: number; name?: string };
  amount?: number;
  unmitigatedAmount?: number;
  absorbed?: number;
  specID?: number;
  hitPoints?: number;
  maxHitPoints?: number;
  targetResources?: Array<{ type?: number; amount?: number; max?: number }>;
}

interface WclGraphQlPayload {
  errors?: { message?: string }[];
  data?: {
    reportData?: {
      report?: {
        startTime?: number;
        fights?: WclFightNode[];
        masterData?: {
          abilities?: WclAbilityNode[];
          actors?: WclActorNode[];
        };
        events?: {
          data?: WclEventNode[];
          nextPageTimestamp?: number;
        };
      };
    };
  };
}

type WclDataType = "Deaths" | "Casts" | "DamageDone" | "Healing" | "CombatantInfo";
type WclHostilityType = "Enemies" | "Friendlies";

export const fetchWclGraphQL = async (
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<WclGraphQlPayload> => {
  const response = await externalApi.post("https://www.warcraftlogs.com/api/v2/client", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    json: { query, variables },
    cache: "no-store",
    throwHttpErrors: false,
  });
  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(`WCL GraphQL HTTP ${response.status}: ${rawText.slice(0, 500)}`);
  }

  try {
    return JSON.parse(rawText) as WclGraphQlPayload;
  } catch {
    throw new Error(`WCL GraphQL JSON 파싱 실패: ${rawText.slice(0, 500)}`);
  }
};

export const fetchPagedEvents = async (params: {
  accessToken: string;
  reportId: string;
  fightId: number;
  dataType: WclDataType;
  startTime: number;
  endTime: number;
  hostilityType?: WclHostilityType;
  limit?: number;
  maxPages?: number;
}) => {
  const {
    accessToken,
    reportId,
    fightId,
    dataType,
    startTime,
    endTime,
    hostilityType,
    limit = 10000,
    maxPages = 60,
  } = params;

  let pageStart = startTime;
  let pages = 0;
  const allEvents: WclEventNode[] = [];

  // dataType/hostilityType은 GraphQL enum이라 변수 바인딩($var)이 불가능하다.
  // 따라서 쿼리 문자열에 직접 삽입한다 (값은 하드코딩된 리터럴 타입이라 주입 위험 없음).
  while (pageStart < endTime && pages < maxPages) {
    const hostilityClause = hostilityType ? `hostilityType: ${hostilityType},` : "";
    const query = `
      query($code: String!, $fightIDs: [Int]!, $start: Float!, $end: Float!, $limit: Int!) {
        reportData {
          report(code: $code) {
            events(
              fightIDs: $fightIDs,
              dataType: ${dataType},
              ${hostilityClause}
              startTime: $start,
              endTime: $end,
              limit: $limit
            ) {
              data
              nextPageTimestamp
            }
          }
        }
      }
    `;
    const variables = { code: reportId, fightIDs: [fightId], start: pageStart, end: endTime, limit };

    const payload = await fetchWclGraphQL(accessToken, query, variables);
    if (payload?.errors?.length) {
      throw new Error(payload.errors[0].message || `${dataType} 이벤트 조회 실패`);
    }

    const node = payload?.data?.reportData?.report?.events;
    const chunk = (node?.data || []) as WclEventNode[];
    const nextPageTimestamp = typeof node?.nextPageTimestamp === "number" ? node.nextPageTimestamp : null;
    allEvents.push(...chunk);

    if (!nextPageTimestamp || nextPageTimestamp <= pageStart || nextPageTimestamp >= endTime) {
      break;
    }

    pageStart = nextPageTimestamp;
    pages += 1;
  }

  return allEvents;
};
