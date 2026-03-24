// 영어 물약 이름 → 한글 매핑 (TWW 기준)
const POTION_NAME_MAP: Record<string, string> = {
  // 공격 물약
  "Tempered Potion": "단련된 물약",
  "Potion of Unwavering Focus": "흔들리지 않는 집중의 물약",
  "Potion of Fierce Resolve": "맹렬한 결의의 물약",
  "Algari Mana Potion": "알가리 마나 물약",
  "Potion of the Recalled Hero": "소환된 영웅의 물약",
  "Cauldron of Power": "힘의 가마솥",
  "Flask of Tempered Swiftness": "단련된 민첩의 플라스크",
  "Flask of Tempered Mastery": "단련된 숙련도의 플라스크",
  "Flask of Tempered Versatility": "단련된 유연성의 플라스크",
  "Flask of Tempered Aggression": "단련된 공격력의 플라스크",
  "Flask of Saving Graces": "구원의 플라스크",

  // 치유 물약
  "Cavediver's Healing Potion": "동굴잠수부의 치유 물약",
  "Healing Potion": "치유 물약",
  "Potion of the Exiled Consul": "추방된 집정관의 물약",

  // 생명석
  "Healthstone": "생명석",
  "Create Healthstone": "생명석 생성",
};

/** 알려진 영어 물약 이름이면 한글로 변환, 이미 한글이거나 매핑 없으면 원문 반환 */
export function translatePotionName(name: string): string {
  return POTION_NAME_MAP[name] ?? name;
}
