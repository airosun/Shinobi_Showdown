// Jutsu catalogue.
//
// category: 'ninjutsu' | 'taijutsu' | 'genjutsu' | 'medical' | 'support'
//   - taijutsu scales off TAI, ninjutsu/genjutsu off NIN
//   - genjutsu rolls NIN vs target CHK, ignores Substitution
// nature: chakra nature for advantage/affinity (null = non-elemental)
// priority: hand-seal tier (+2 kunai, +1 taijutsu, 0 standard, -1 large jutsu)
// target: 'enemy' | 'allEnemies' | 'self' | 'ally' | 'allAllies'
// charged: true = 2-turn jutsu (weave on turn 1, release on turn 2)
// effects: see engine/battle.js applyEffect() for the full list

export const JUTSU = {
  // ---------------- Naruto ----------------
  shadow_clone_barrage: {
    name: 'Uzumaki Barrage', category: 'taijutsu', nature: null,
    power: 70, cost: 25, priority: 1, target: 'enemy',
    desc: 'A swarm of Shadow Clones pummels one enemy.',
  },
  rasengan: {
    name: 'Rasengan', category: 'ninjutsu', nature: null,
    power: 95, cost: 45, priority: 0, target: 'enemy',
    desc: 'A spinning sphere of pure chakra. Non-elemental, so it is never resisted.',
  },
  multi_shadow_clone: {
    name: 'Multi Shadow Clone Jutsu', category: 'support', nature: null,
    power: 0, cost: 35, priority: 0, target: 'self',
    effects: [{ type: 'decoy' }, { type: 'intel', value: 5 }],
    desc: 'Clones scatter: gain a Decoy that absorbs the next single-target hit, and +5 Intel.',
  },
  sexy_jutsu: {
    name: 'Sexy Jutsu', category: 'ninjutsu', nature: null,
    power: 0, cost: 10, priority: 2, target: 'enemy',
    effects: [{ type: 'flinch', chance: 0.6 }],
    desc: '60% chance to make the target Flinch (lose its action if it has not moved yet).',
  },
  summon_gamabunta: {
    name: 'Summoning: Gamabunta', category: 'ninjutsu', nature: 'water',
    power: 110, cost: 70, priority: -1, target: 'allEnemies', charged: true,
    desc: 'Charged. The Toad Boss crashes down with a Water Gun on all enemies.',
  },
  rasenshuriken: {
    name: 'Wind Release: Rasenshuriken', category: 'ninjutsu', nature: 'wind',
    power: 160, cost: 80, priority: -1, target: 'enemy', charged: true,
    effects: [{ type: 'recoil', value: 0.06 }],
    desc: 'Charged. Devastating wind-natured Rasengan. User takes 6% max HP recoil.',
  },
  massive_rasengan: {
    name: 'Sage Art: Massive Rasengan', category: 'ninjutsu', nature: null,
    power: 110, cost: 55, priority: 0, target: 'enemy',
    desc: 'An oversized Rasengan fuelled by natural energy.',
  },
  frog_kata: {
    name: 'Frog Kata', category: 'taijutsu', nature: null,
    power: 85, cost: 20, priority: 1, target: 'enemy',
    effects: [{ type: 'pierce', value: 0.25 }],
    desc: 'Sage taijutsu. Ignores 25% of the target\'s DEF.',
  },
  shadow_clone_scouts: {
    name: 'Shadow Clone Scouts', category: 'support', nature: null,
    power: 0, cost: 30, priority: 0, target: 'self',
    effects: [{ type: 'decoy' }, { type: 'intel', value: 8 }],
    desc: 'Clones scout ahead: gain a Decoy and +8 Intel.',
  },

  // ---------------- Sasuke ----------------
  great_fireball: {
    name: 'Fire Release: Great Fireball', category: 'ninjutsu', nature: 'fire',
    power: 95, cost: 30, priority: -1, target: 'enemy',
    effects: [{ type: 'burn', chance: 0.2, turns: 3 }],
    desc: 'Many hand seals. 20% chance to Burn.',
  },
  phoenix_flower: {
    name: 'Fire Release: Phoenix Flower', category: 'ninjutsu', nature: 'fire',
    power: 55, cost: 35, priority: 0, target: 'allEnemies',
    effects: [{ type: 'burn', chance: 0.15, turns: 3 }],
    desc: 'A spread of small fireballs hits all enemies. 15% Burn.',
  },
  chidori: {
    name: 'Chidori', category: 'ninjutsu', nature: 'lightning',
    power: 110, cost: 50, priority: 1, target: 'enemy',
    effects: [{ type: 'paralyze', chance: 0.2, turns: 2 }],
    desc: 'A lightning thrust fast enough to act at taijutsu speed. 20% Paralyze.',
  },
  lion_combo: {
    name: 'Lion Combo', category: 'taijutsu', nature: null,
    power: 80, cost: 15, priority: 1, target: 'enemy',
    desc: 'Copied from Lee and finished with a heel drop.',
  },
  dragon_flame: {
    name: 'Fire Release: Dragon Flame', category: 'ninjutsu', nature: 'fire',
    power: 75, cost: 30, priority: -1, target: 'enemy',
    effects: [{ type: 'burn', chance: 0.4, turns: 3 }],
    desc: 'Fire races along wire strings. 40% Burn.',
  },

  // ---------------- Sakura ----------------
  cherry_blossom_impact: {
    name: 'Cherry Blossom Impact', category: 'taijutsu', nature: null,
    power: 95, cost: 25, priority: 0, target: 'enemy',
    desc: 'A chakra-loaded punch that shatters the ground.',
  },
  heavenly_kick: {
    name: 'Heavenly Foot of Pain', category: 'taijutsu', nature: null,
    power: 120, cost: 40, priority: -1, target: 'enemy',
    desc: 'A slow, crushing axe kick.',
  },
  ground_splitter: {
    name: 'Ground Splitting Punch', category: 'taijutsu', nature: null,
    power: 55, cost: 30, priority: 0, target: 'allEnemies',
    desc: 'Cracks the battlefield, hitting all enemies.',
  },
  mystical_palm: {
    name: 'Mystical Palm', category: 'medical', nature: 'yang',
    power: 0, cost: 35, priority: 0, target: 'ally',
    effects: [{ type: 'heal', value: 0.3 }],
    desc: 'Heal one ally (or self) for 30% max HP.',
  },
  poison_extraction: {
    name: 'Poison Extraction', category: 'medical', nature: 'yang',
    power: 0, cost: 20, priority: 1, target: 'ally',
    effects: [{ type: 'cleanse' }, { type: 'heal', value: 0.1 }],
    desc: 'Remove all negative statuses from an ally and heal 10%.',
  },

  // ---------------- Kakashi ----------------
  lightning_blade: {
    name: 'Lightning Blade', category: 'ninjutsu', nature: 'lightning',
    power: 115, cost: 55, priority: 1, target: 'enemy',
    effects: [{ type: 'paralyze', chance: 0.2, turns: 2 }],
    desc: 'Kakashi\'s original technique. Fast. 20% Paralyze.',
  },
  water_dragon: {
    name: 'Water Release: Water Dragon', category: 'ninjutsu', nature: 'water',
    power: 100, cost: 50, priority: -1, target: 'enemy',
    desc: '44 hand seals. A dragon of water slams the target.',
  },
  headhunter: {
    name: 'Earth Release: Headhunter', category: 'ninjutsu', nature: 'earth',
    power: 70, cost: 25, priority: 0, target: 'enemy',
    effects: [{ type: 'bind', chance: 0.3, turns: 1 }],
    desc: 'Drag the target underground. 30% Bind.',
  },
  mud_wall: {
    name: 'Earth Release: Mud Wall', category: 'support', nature: 'earth',
    power: 0, cost: 35, priority: 1, target: 'allAllies',
    effects: [{ type: 'buff', stat: 'def', mult: 1.3, turns: 2 }],
    desc: 'All allies gain +30% DEF for 2 turns.',
  },
  ninja_hounds: {
    name: 'Summoning: Ninja Hounds', category: 'ninjutsu', nature: null,
    power: 50, cost: 40, priority: 0, target: 'enemy',
    effects: [{ type: 'bind', chance: 0.7, turns: 1 }, { type: 'intel', value: 5 }],
    desc: 'Pakkun and pack pin the target. 70% Bind, +5 Intel.',
  },
  demonic_illusion: {
    name: 'Sharingan: Demonic Illusion', category: 'genjutsu', nature: 'yin',
    power: 0, cost: 30, priority: 0, target: 'enemy',
    effects: [{ type: 'genjutsu', turns: 2 }],
    desc: 'Trap the target in genjutsu for 2 turns.',
  },

  // ---------------- Rock Lee ----------------
  leaf_hurricane: {
    name: 'Leaf Hurricane', category: 'taijutsu', nature: null,
    power: 75, cost: 10, priority: 1, target: 'enemy',
    desc: 'A spinning kick combo.',
  },
  dynamic_entry: {
    name: 'Dynamic Entry', category: 'taijutsu', nature: null,
    power: 55, cost: 10, priority: 3, target: 'enemy',
    desc: 'Always strikes first in its tier. Great for breaking Substitutions.',
  },
  leaf_rising_wind: {
    name: 'Leaf Rising Wind', category: 'taijutsu', nature: null,
    power: 55, cost: 10, priority: 1, target: 'enemy',
    effects: [{ type: 'flinch', chance: 0.3 }],
    desc: 'An upward kick. 30% Flinch.',
  },
  front_lotus: {
    name: 'Front Lotus', category: 'taijutsu', nature: null,
    power: 120, cost: 30, priority: 0, target: 'enemy',
    effects: [{ type: 'recoil', value: 0.06 }],
    desc: 'Kick them skyward and pile-drive. 6% max HP recoil.',
  },
  hidden_lotus: {
    name: 'Hidden Lotus', category: 'taijutsu', nature: null,
    power: 165, cost: 40, priority: 0, target: 'enemy', requiresTransform: true,
    effects: [{ type: 'recoil', value: 0.1 }],
    desc: 'Only while the Gates are open. 10% max HP recoil.',
  },

  // ---------------- Shikamaru ----------------
  shadow_possession: {
    name: 'Shadow Possession Jutsu', category: 'ninjutsu', nature: 'yin',
    power: 0, cost: 35, priority: 0, target: 'enemy',
    effects: [{ type: 'bind', chance: 0.85, turns: 1 }],
    desc: '85% Bind (the target cannot act). Ignores Substitution.',
    ignoresSub: true,
  },
  shadow_neck_bind: {
    name: 'Shadow Neck Bind', category: 'ninjutsu', nature: 'yin',
    power: 75, cost: 35, priority: 0, target: 'enemy',
    effects: [{ type: 'bonusVsBound', value: 1.6 }],
    desc: 'Deals 60% more damage to a Bound target.',
  },
  explosive_tag_kunai: {
    name: 'Explosive Tag Kunai', category: 'taijutsu', nature: null,
    power: 55, cost: 10, priority: 2, target: 'enemy',
    effects: [{ type: 'burn', chance: 0.3, turns: 2 }],
    desc: 'Fast thrown tag. 30% Burn.',
  },
  battle_analysis: {
    name: 'Battle Analysis', category: 'support', nature: null,
    power: 0, cost: 20, priority: 0, target: 'enemy',
    effects: [{ type: 'revealLoadout' }, { type: 'intel', value: 6 }],
    desc: 'Reveal the target\'s full loadout and gain +6 Intel.',
  },
  flash_bomb: {
    name: 'Flash Bomb', category: 'support', nature: null,
    power: 0, cost: 15, priority: 2, target: 'allEnemies',
    effects: [{ type: 'debuff', stat: 'spd', mult: 0.8, turns: 2 }],
    desc: 'All enemies lose 20% SPD for 2 turns.',
  },

  // ---------------- Gaara ----------------
  sand_coffin: {
    name: 'Sand Coffin', category: 'ninjutsu', nature: 'magnet',
    power: 70, cost: 30, priority: 0, target: 'enemy',
    effects: [{ type: 'bind', chance: 0.5, turns: 1 }],
    desc: 'Wrap the target in sand. 50% Bind.',
  },
  sand_burial: {
    name: 'Sand Burial', category: 'ninjutsu', nature: 'magnet',
    power: 115, cost: 60, priority: -1, target: 'enemy',
    effects: [{ type: 'bonusVsBound', value: 1.5 }],
    desc: 'Crush the target. 50% more damage if it is Bound.',
  },
  sand_shuriken: {
    name: 'Sand Shuriken', category: 'ninjutsu', nature: 'magnet',
    power: 55, cost: 30, priority: 0, target: 'allEnemies',
    desc: 'Hardened sand blades hit all enemies.',
  },
  sand_tsunami: {
    name: 'Sand Tsunami', category: 'ninjutsu', nature: 'magnet',
    power: 95, cost: 65, priority: -1, target: 'allEnemies', charged: true,
    desc: 'Charged. A wave of sand engulfs all enemies.',
  },
  sand_armor: {
    name: 'Armor of Sand', category: 'support', nature: 'magnet',
    power: 0, cost: 25, priority: 1, target: 'self',
    effects: [{ type: 'buff', stat: 'def', mult: 1.35, turns: 3 }],
    desc: '+35% DEF for 3 turns.',
  },

  // ---------------- Ino ----------------
  mind_transfer: {
    name: 'Mind Transfer Jutsu', category: 'genjutsu', nature: 'yin',
    power: 0, cost: 35, priority: 0, target: 'enemy',
    effects: [{ type: 'bind', chance: 1, turns: 1 }, { type: 'intel', value: 10 }, { type: 'selfVulnerable' }],
    desc: 'Take over the target: Bind it and gain +10 Intel. Ino\'s body is left exposed (+25% damage taken this turn).',
  },
  mind_body_disturbance: {
    name: 'Mind Body Disturbance', category: 'genjutsu', nature: 'yin',
    power: 0, cost: 30, priority: 0, target: 'enemy',
    effects: [{ type: 'genjutsu', turns: 2 }],
    desc: 'Scramble the target\'s nerves: genjutsu for 2 turns.',
  },
  mind_clone_spy: {
    name: 'Mind Clone Spy', category: 'support', nature: 'yin',
    power: 0, cost: 25, priority: 0, target: 'self',
    effects: [{ type: 'intel', value: 8 }],
    desc: '+8 Intel.',
  },
  senbon_volley: {
    name: 'Senbon Volley', category: 'taijutsu', nature: null,
    power: 50, cost: 5, priority: 2, target: 'enemy',
    effects: [{ type: 'paralyze', chance: 0.2, turns: 2 }],
    desc: 'Fast needles. 20% Paralyze.',
  },
};

// attach ids
for (const [id, j] of Object.entries(JUTSU)) {
  j.id = id;
  j.effects = j.effects || [];
}
