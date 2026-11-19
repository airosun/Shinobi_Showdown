// Shinobi roster. Each alternate form is its own entry sharing a baseId
// (only one version of a character per team).
//
// stats: hp, tai, nin, def, spd, chk  (base values; see engine for scaling)
// roles: 'Sensor' and 'Infiltrator' gather +15 Intel instead of +8;
//        a 'Sensor' on Guard quarters enemy Intel instead of halving it.
// trait.id is implemented in engine/battle.js (search TRAIT HOOKS)
// transformation: Resolve-gated power-up (null = none)
// supportAura: passive that applies while this shinobi sits in the support slot

export const COST_CAP = 30;

export const SHINOBI = [
  {
    id: 'naruto_p1', baseId: 'naruto', name: 'Naruto Uzumaki', era: 'Part 1', cost: 6,
    natures: { primary: 'wind', secondary: 'yang' },
    stats: { hp: 105, tai: 85, nin: 80, def: 75, spd: 80, chk: 140 },
    roles: ['Striker', 'Tank'],
    trait: { id: 'uzumakiVitality', name: 'Uzumaki Vitality', desc: 'Regenerates 6% max HP each turn. +30% max Chakra.' },
    substitutions: ['log', 'shadowClone'],
    catalogue: ['shadow_clone_barrage', 'rasengan', 'multi_shadow_clone', 'sexy_jutsu', 'summon_gamabunta'],
    defaultLoadout: ['shadow_clone_barrage', 'rasengan', 'multi_shadow_clone', 'sexy_jutsu'],
    transformation: {
      name: 'Nine-Tails Cloak (One Tail)', resolve: 60, cost: 0, turns: 3,
      mods: { tai: 1.3, nin: 1.2, spd: 1.15, def: 1.1 },
      onActivate: { chakraPct: 0.4 }, upkeepHpPct: 0.04, drawback: 'exhausted',
      desc: 'Restore 40% Chakra. +30% TAI, +20% NIN, +15% SPD, +10% DEF for 3 turns. The cloak burns 4% HP per turn. Exhausted afterwards.',
    },
    supportAura: { id: 'resolve', value: 5, name: 'Unbreakable Spirit', desc: 'Active allies gain +5 Resolve per turn.' },
  },
  {
    id: 'naruto_sage', baseId: 'naruto', name: 'Naruto Uzumaki (Sage)', era: 'Shippuden', cost: 9,
    natures: { primary: 'wind', secondary: 'yang' },
    stats: { hp: 120, tai: 100, nin: 115, def: 90, spd: 95, chk: 150 },
    roles: ['Striker', 'Sensor'],
    trait: { id: 'uzumakiVitality', name: 'Uzumaki Vitality', desc: 'Regenerates 6% max HP each turn. +30% max Chakra.' },
    substitutions: ['log', 'shadowClone'],
    catalogue: ['rasenshuriken', 'massive_rasengan', 'frog_kata', 'shadow_clone_scouts', 'rasengan'],
    defaultLoadout: ['rasenshuriken', 'massive_rasengan', 'frog_kata', 'shadow_clone_scouts'],
    transformation: {
      name: 'Sage Mode', resolve: 50, cost: 0, turns: 4, charged: true,
      mods: { tai: 1.35, nin: 1.35, def: 1.2, spd: 1.1 },
      desc: 'Takes a turn to gather natural energy (cancelled if hit). Then +35% TAI/NIN, +20% DEF, +10% SPD for 4 turns.',
    },
    supportAura: { id: 'chakra', value: 0.05, name: 'Toad Sage Tutelage', desc: 'Active allies regenerate +5% Chakra per turn.' },
  },
  {
    id: 'sasuke_p1', baseId: 'sasuke', name: 'Sasuke Uchiha', era: 'Part 1', cost: 7,
    natures: { primary: 'fire', secondary: 'lightning' },
    stats: { hp: 90, tai: 90, nin: 100, def: 70, spd: 110, chk: 95 },
    roles: ['Striker'],
    trait: { id: 'sharingan', name: 'Sharingan', desc: 'Sees through Log Substitution. 25% chance to reflect genjutsu back at the caster.' },
    substitutions: ['log', 'explosiveTag'],
    catalogue: ['great_fireball', 'phoenix_flower', 'chidori', 'lion_combo', 'dragon_flame'],
    defaultLoadout: ['great_fireball', 'phoenix_flower', 'chidori', 'lion_combo'],
    transformation: {
      name: 'Curse Mark (Level 1)', resolve: 50, cost: 0, turns: 3,
      mods: { nin: 1.3, tai: 1.2, spd: 1.2 },
      upkeepHpPct: 0.05, drawback: 'exhausted',
      desc: '+30% NIN, +20% TAI, +20% SPD for 3 turns. Costs 5% HP per turn. Exhausted afterwards.',
    },
    supportAura: { id: 'stat', stat: 'nin', mult: 1.1, name: 'Uchiha Pride', desc: 'Active allies gain +10% NIN.' },
  },
  {
    id: 'sakura_shippuden', baseId: 'sakura', name: 'Sakura Haruno', era: 'Shippuden', cost: 6,
    natures: { primary: 'earth', secondary: 'yang' },
    stats: { hp: 100, tai: 105, nin: 70, def: 80, spd: 80, chk: 110 },
    roles: ['Medic', 'Frontliner'],
    trait: { id: 'chakraControl', name: 'Perfect Chakra Control', desc: 'All jutsu cost 20% less Chakra. Healing is 25% stronger.' },
    substitutions: ['log', 'explosiveTag'],
    catalogue: ['cherry_blossom_impact', 'heavenly_kick', 'ground_splitter', 'mystical_palm', 'poison_extraction'],
    defaultLoadout: ['cherry_blossom_impact', 'heavenly_kick', 'mystical_palm', 'poison_extraction'],
    transformation: {
      name: 'Strength of a Hundred Seal', resolve: 70, cost: 0, turns: 3,
      mods: { tai: 1.3, def: 1.2 }, regenHpPct: 0.1,
      desc: '+30% TAI, +20% DEF and regenerate 10% HP per turn for 3 turns.',
    },
    supportAura: { id: 'heal', value: 0.04, name: 'Field Medic', desc: 'Active allies heal 4% max HP per turn.' },
  },
  {
    id: 'kakashi_p1', baseId: 'kakashi', name: 'Kakashi Hatake', era: 'Part 1', cost: 8,
    natures: { primary: 'lightning', secondary: 'earth' },
    stats: { hp: 100, tai: 95, nin: 105, def: 85, spd: 105, chk: 100 },
    roles: ['Striker', 'Controller'],
    trait: { id: 'copyNinja', name: 'Copy Ninja', desc: 'Sharingan: sees through Log Substitution. The first enemy jutsu that hits him is copied into a 5th slot.' },
    substitutions: ['log', 'shadowClone', 'waterClone'],
    catalogue: ['lightning_blade', 'water_dragon', 'headhunter', 'mud_wall', 'ninja_hounds', 'demonic_illusion'],
    defaultLoadout: ['lightning_blade', 'water_dragon', 'ninja_hounds', 'demonic_illusion'],
    transformation: null,
    supportAura: { id: 'stat', stat: 'spd', mult: 1.1, name: 'Jonin Leadership', desc: 'Active allies gain +10% SPD.' },
  },
  {
    id: 'lee_p1', baseId: 'lee', name: 'Rock Lee', era: 'Part 1', cost: 6,
    natures: { primary: null, secondary: null },
    stats: { hp: 100, tai: 125, nin: 0, def: 85, spd: 120, chk: 70 },
    roles: ['Frontliner'],
    trait: { id: 'noNinjutsu', name: 'Splendid Taijutsu', desc: 'Cannot use ninjutsu. +30% taijutsu damage, taijutsu gets +1 priority, immune to Chakra Exhaustion damage.' },
    substitutions: ['log'],
    catalogue: ['leaf_hurricane', 'dynamic_entry', 'leaf_rising_wind', 'front_lotus', 'hidden_lotus'],
    defaultLoadout: ['leaf_hurricane', 'dynamic_entry', 'front_lotus', 'hidden_lotus'],
    transformation: {
      name: 'Eight Inner Gates (Fifth Gate)', resolve: 40, cost: 0, turns: 3,
      mods: { tai: 1.4, spd: 1.3 }, upkeepHpPct: 0.07, drawback: 'exhausted',
      desc: '+40% TAI, +30% SPD for 3 turns and unlocks Hidden Lotus. Costs 7% HP per turn. Exhausted afterwards.',
    },
    supportAura: { id: 'stat', stat: 'tai', mult: 1.1, name: 'Power of Youth', desc: 'Active allies gain +10% TAI.' },
  },
  {
    id: 'shikamaru_p1', baseId: 'shikamaru', name: 'Shikamaru Nara', era: 'Part 1', cost: 6,
    natures: { primary: 'yin', secondary: 'fire' },
    stats: { hp: 85, tai: 65, nin: 90, def: 75, spd: 85, chk: 100 },
    roles: ['Controller', 'Infiltrator'],
    trait: { id: 'strategist', name: '200 IQ', desc: 'Intel he gathers is +50%. His Binds last 1 extra turn.' },
    substitutions: ['log', 'explosiveTag'],
    catalogue: ['shadow_possession', 'shadow_neck_bind', 'explosive_tag_kunai', 'battle_analysis', 'flash_bomb'],
    defaultLoadout: ['shadow_possession', 'shadow_neck_bind', 'explosive_tag_kunai', 'battle_analysis'],
    transformation: null,
    supportAura: { id: 'subDiscount', value: 0.25, name: 'Battle Plan', desc: 'Active allies\' Substitutions cost 25% less Chakra.' },
  },
  {
    id: 'gaara_p1', baseId: 'gaara', name: 'Gaara', era: 'Part 1', cost: 8,
    natures: { primary: 'magnet', secondary: 'wind' },
    stats: { hp: 100, tai: 45, nin: 105, def: 125, spd: 60, chk: 120 },
    roles: ['Tank', 'Striker'],
    trait: { id: 'sandShield', name: 'Shield of Sand', desc: 'The first damaging single-target hit he takes each turn is halved.' },
    substitutions: ['log', 'shadowClone'],
    catalogue: ['sand_coffin', 'sand_burial', 'sand_shuriken', 'sand_tsunami', 'sand_armor'],
    defaultLoadout: ['sand_coffin', 'sand_burial', 'sand_shuriken', 'sand_armor'],
    transformation: {
      name: 'Partial Shukaku', resolve: 60, cost: 0, turns: 3,
      mods: { nin: 1.35, def: 1.2 }, berserk: 0.3,
      desc: '+35% NIN, +20% DEF for 3 turns. 30% chance each turn that his attack hits a random enemy.',
    },
    supportAura: { id: 'stat', stat: 'def', mult: 1.1, name: 'Sand Barrier', desc: 'Active allies gain +10% DEF.' },
  },
  {
    id: 'ino_p1', baseId: 'ino', name: 'Ino Yamanaka', era: 'Part 1', cost: 4,
    natures: { primary: 'yin', secondary: null },
    stats: { hp: 80, tai: 65, nin: 85, def: 65, spd: 85, chk: 95 },
    roles: ['Infiltrator', 'Controller'],
    trait: { id: 'yamanaka', name: 'Yamanaka Mind Clan', desc: 'Her genjutsu that land grant +5 extra Intel and are 15% more accurate.' },
    substitutions: ['log'],
    catalogue: ['mind_transfer', 'mind_body_disturbance', 'mind_clone_spy', 'senbon_volley'],
    defaultLoadout: ['mind_transfer', 'mind_body_disturbance', 'mind_clone_spy', 'senbon_volley'],
    transformation: null,
    supportAura: { id: 'intel', value: 3, name: 'Sensory Relay', desc: 'Team gains +3 Secured Intel per turn.' },
  },
];

export const SHINOBI_BY_ID = Object.fromEntries(SHINOBI.map((s) => [s.id, s]));

// Substitution types. cost = fraction of max Chakra.
export const SUBSTITUTIONS = {
  log: { name: 'Log Substitution', cost: 0.15, desc: 'Negate the first single-target hit. Dojutsu users see through it.' },
  shadowClone: { name: 'Shadow Clone Substitution', cost: 0.22, desc: 'Negate the first single-target hit and leave a Decoy that absorbs the next one.' },
  explosiveTag: { name: 'Explosive Tag Substitution', cost: 0.25, desc: 'Negate the first single-target hit and blast the attacker for 10% of its max HP.' },
  waterClone: { name: 'Water Clone Substitution', cost: 0.2, desc: 'Negate the first single-target hit and slow the attacker (-25% SPD, 2 turns).' },
};
