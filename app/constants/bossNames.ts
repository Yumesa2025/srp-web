// TWW(The War Within) 보스 이름 영 → 한 매핑
export const TWW_BOSS_NAMES: Record<string, string> = {
  // 네루바르 궁전 (Nerub-ar Palace) - 시즌 1
  "Ulgrax the Devourer": "삼키는 자 울그락스",
  "The Bloodbound Horror": "선혈의 공포",
  "Sikran, Captain of the Sureki": "수레키의 대장 시크란",
  "Rasha'nan": "라샤난",
  "Eggtender Ovi'nax": "알지기 오비낙스",
  "Nexus-Princess Ky'veza": "차원점 공주 키베자",
  "The Silken Court": "비단 법원",
  "Queen Ansurek": "여왕 안수렉",

  // 언더마인 해방 (Liberation of Undermine) - 시즌 2
  "Vexie and the Geargrinders": "벡시와 기어그라인더",
  "Cauldron of Carnage": "학살의 가마",
  "Rik Reverb": "릭 리버브",
  "Stix Bunkjunker": "스틱스 번크정커",
  "Sprocketmonger Lockenstock": "스프로켓몽거 로켄스탁",
  "The One-Armed Bandit": "외팔이 강도",
  "Mug'Zee, Heads of Security": "수석 경호원 머그지",
  "Chrome King Gallywix": "크롬 왕 갈리웍스",

  // 공허첨탑 (The Voidspire) - 시즌 3
  "The Voidspire": "공허첨탑",
  "Imperator Averzian": "전제군주 아베르지안",
  "Vorasius": "보라시우스",
  "Fallen-King Salhadaar": "몰락한 왕 살라다르",
  "Vaelgor & Ezzorak": "바엘고어와 에조라크",
  "Lightblinded Vanguard": "빛에 눈이 먼 선봉대",
  "Crown of the Cosmos": "우주의 왕관",

  // 꿈의 균열 (The Dreamrift) - 시즌 3
  "The Dreamrift": "꿈의 균열",
  "Chimaerus the Undreamt God": "꿈결을 벗어난 신 카이메루스",

  // 쿠엘다나스 진격로 (March on Quel'Danas) - 시즌 4
  "March on Quel'Danas": "쿠엘다나스 진격로",
  "Belo'ren, Child of Al'ar": "알라르의 자손 벨로렌",
  "Midnight Falls": "한밤의 도래",
};

export function translateBossName(name: string): string {
  return TWW_BOSS_NAMES[name] ?? name;
}
