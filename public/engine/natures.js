// Chakra nature chart.
// Canon cycle: Fire > Wind > Lightning > Earth > Water > Fire
// Kekkei genkai are combinations and are checked like dual types.

export const BASIC_NATURES = ['fire', 'wind', 'lightning', 'earth', 'water'];
export const NEUTRAL_NATURES = ['yin', 'yang']; // no advantage either way

// attacker nature -> nature it beats
export const BEATS = {
  fire: 'wind',
  wind: 'lightning',
  lightning: 'earth',
  earth: 'water',
  water: 'fire',
};

export const KEKKEI_GENKAI = {
  wood: ['earth', 'water'],
  ice: ['wind', 'water'],
  lava: ['fire', 'earth'],
  storm: ['lightning', 'water'],
  magnet: ['wind', 'earth'],
  scorch: ['fire', 'wind'],
  boil: ['fire', 'water'],
  explosion: ['earth', 'lightning'],
  dust: ['earth', 'wind', 'fire'], // kekkei tota
};

// Collaboration: if an ally already hit the same target this turn with a
// nature listed here, the incoming jutsu is amplified.
export const AMPLIFIED_BY = {
  fire: ['wind'], // wind feeds fire
  lightning: ['water'], // water conducts lightning
};

export const ADV_STRONG = 1.5;
export const ADV_WEAK = 0.75;

export const NATURE_LABELS = {
  fire: 'Fire', wind: 'Wind', lightning: 'Lightning', earth: 'Earth', water: 'Water',
  yin: 'Yin', yang: 'Yang', wood: 'Wood', ice: 'Ice', lava: 'Lava', storm: 'Storm',
  magnet: 'Magnet', scorch: 'Scorch', boil: 'Boil', explosion: 'Explosion', dust: 'Dust',
};

/** Break a nature into its basic components ([] for neutral / none). */
export function components(nature) {
  if (!nature) return [];
  if (KEKKEI_GENKAI[nature]) return KEKKEI_GENKAI[nature];
  if (BASIC_NATURES.includes(nature)) return [nature];
  return [];
}

/**
 * Advantage multiplier of an attacking nature against a defending nature.
 * Dual natures multiply per component pair (so Magnet vs Water can stack).
 */
export function advantage(attackNature, defendNature) {
  const atk = components(attackNature);
  const def = components(defendNature);
  let mult = 1;
  for (const a of atk) {
    for (const d of def) {
      if (BEATS[a] === d) mult *= ADV_STRONG;
      else if (BEATS[d] === a) mult *= ADV_WEAK;
    }
  }
  return mult;
}

/** Affinity bonus for using a jutsu that matches the user's natures. */
export function affinity(jutsuNature, natures) {
  if (!jutsuNature || !natures) return 1;
  if (jutsuNature === natures.primary) return 1.25;
  if (jutsuNature === natures.secondary) return 1.1;
  // a basic-nature jutsu used by a kekkei genkai user of that component
  if (components(natures.primary).includes(jutsuNature)) return 1.1;
  return 1;
}
