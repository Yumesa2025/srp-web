import { readStore, StoreKeys, writeStore } from "@/app/lib/localStore";
import { DEFAULT_DEFENSIVE_SETTINGS } from "@/app/constants/defensiveDefaults";
import type { DefensiveEntry } from "@/app/types/raidAnalysis";

export type DefensiveSettings = Record<string, DefensiveEntry[]>;

/**
 * 방어 스킬 설정 저장소
 *
 * 기존 defensiveSettings Server Action과 user_settings 테이블을 대체한다.
 * 편집 중인 상태는 호출하는 컴포넌트가 들고 있으므로 여기서는 훅이 아니라
 * 읽기/쓰기 함수만 제공한다.
 */

/**
 * 저장값을 현재 형식으로 맞춘다.
 *
 * 예전에는 스킬 목록을 string[]으로 저장했다. 그 형식이 남아 있거나 값이 손상된
 * 경우에도 앱이 깨지지 않도록, 배열이 아닌 항목은 버리고 문자열 항목은
 * DefensiveEntry로 승격시킨다.
 */
function normalize(raw: unknown): DefensiveSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_DEFENSIVE_SETTINGS;

  const result: DefensiveSettings = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    result[key] = value
      .map((entry): DefensiveEntry | null => {
        if (typeof entry === "string") return { name: entry };
        if (entry && typeof entry === "object" && typeof (entry as DefensiveEntry).name === "string") {
          return entry as DefensiveEntry;
        }
        return null;
      })
      .filter((entry): entry is DefensiveEntry => entry !== null);
  }
  return result;
}

export function getDefensiveSettings(): DefensiveSettings {
  return normalize(
    readStore<unknown>(StoreKeys.defensiveSettings, DEFAULT_DEFENSIVE_SETTINGS, normalize)
  );
}

export function saveDefensiveSettings(settings: DefensiveSettings): { error?: string } {
  return writeStore(StoreKeys.defensiveSettings, settings);
}

export function resetDefensiveSettings(): { error?: string } {
  return saveDefensiveSettings(DEFAULT_DEFENSIVE_SETTINGS);
}
