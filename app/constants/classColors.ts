// WoW 직업 색상 (WCL subType 기준)
export const WOW_CLASS_COLORS: Record<string, string> = {
  DeathKnight: '#C41E3A',
  DemonHunter: '#A330C9',
  Druid:       '#FF7C0A',
  Evoker:      '#33937F',
  Hunter:      '#AAD372',
  Mage:        '#3FC7EB',
  Monk:        '#00FF98',
  Paladin:     '#F48CBA',
  Priest:      '#E2E8F0',
  Rogue:       '#FFF468',
  Shaman:      '#0070DD',
  Warlock:     '#8788EE',
  Warrior:     '#C69B3A',
};

export function getClassColor(className?: string): string {
  if (!className) return '#9ca3af';
  return WOW_CLASS_COLORS[className] ?? '#9ca3af';
}
