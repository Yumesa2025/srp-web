// WoW 스펙 아이콘 매핑 (specID → Wowhead CDN URL)
// https://wow.zamimg.com/images/wow/icons/medium/{iconname}.jpg

const CDN = 'https://wow.zamimg.com/images/wow/icons/medium';

const SPEC_ICON: Record<number, string> = {
  // Warrior
  71:   'ability_warrior_savageblow',        // Arms
  72:   'ability_warrior_innerrage',         // Fury
  73:   'ability_warrior_defensivestance',   // Protection
  // Paladin
  65:   'spell_holy_holybolt',              // Holy
  66:   'ability_paladin_shieldofthetemplar', // Protection
  70:   'spell_holy_auraoflight',           // Retribution
  // Hunter
  253:  'ability_hunter_bestialdiscipline', // Beast Mastery
  254:  'ability_hunter_focusedaim',        // Marksmanship
  255:  'ability_hunter_camouflage',        // Survival
  // Rogue
  259:  'ability_rogue_deadlybrew',         // Assassination
  260:  'ability_rogue_waylay',             // Outlaw
  261:  'ability_stealth',                  // Subtlety
  // Priest
  256:  'spell_holy_powerwordshield',       // Discipline
  257:  'spell_holy_guardianspirit',        // Holy
  258:  'spell_shadow_shadowwordpain',      // Shadow
  // Death Knight
  250:  'spell_deathknight_bloodpresence',  // Blood
  251:  'spell_deathknight_frostpresence',  // Frost
  252:  'spell_deathknight_unholypresence', // Unholy
  // Shaman
  262:  'spell_nature_lightning',           // Elemental
  263:  'spell_shaman_improvedstormstrike', // Enhancement
  264:  'spell_nature_magicimmunity',       // Restoration
  // Mage
  62:   'spell_holy_magicalsentry',         // Arcane
  63:   'spell_fire_firebolt02',            // Fire
  64:   'spell_frost_frostbolt02',          // Frost
  // Warlock
  265:  'spell_shadow_deathcoil',           // Affliction
  266:  'spell_shadow_metamorphosis',       // Demonology
  267:  'spell_shadow_rainoffire',          // Destruction
  // Monk
  268:  'monk_stance_drunkenox',            // Brewmaster
  269:  'monk_stance_whitetiger',           // Windwalker
  270:  'monk_stance_wiseserpent',          // Mistweaver
  // Druid
  102:  'spell_nature_starfall',            // Balance
  103:  'ability_druid_catform',            // Feral
  104:  'ability_racial_bearform',          // Guardian
  105:  'spell_nature_healingtouch',        // Restoration
  // Demon Hunter
  577:  'ability_demonhunter_specdps',      // Havoc
  581:  'ability_demonhunter_spectank',     // Vengeance
  // Evoker
  1467: 'classicon_evoker_devastation',     // Devastation
  1468: 'classicon_evoker_preservation',    // Preservation
  1473: 'classicon_evoker_augmentation',    // Augmentation
};

export function getSpecIconUrl(specId?: number): string | null {
  if (!specId) return null;
  const icon = SPEC_ICON[specId];
  return icon ? `${CDN}/${icon}.jpg` : null;
}
