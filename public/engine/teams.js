// Team-building helpers shared by the UI, the CPU and the sim.
import { SHINOBI, COST_CAP } from '../data/shinobi.js';
import { teamCost, validateTeam } from './battle.js';

/** Random legal team (3 active + support) under the cost cap. */
export function randomTeam(rng = Math.random, { keepDefaults = 0.6 } = {}) {
  for (let tries = 0; tries < 500; tries++) {
    const pool = [...SHINOBI];
    const members = [];
    const bases = new Set();
    while (members.length < 4 && pool.length) {
      const s = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      if (bases.has(s.baseId)) continue;
      bases.add(s.baseId);
      const loadout = [];
      if (rng() < keepDefaults) loadout.push(...s.defaultLoadout);
      else {
        const cat = [...s.catalogue];
        while (loadout.length < 4) loadout.push(cat.splice(Math.floor(rng() * cat.length), 1)[0]);
      }
      members.push({ id: s.id, loadout, substitution: s.substitutions[Math.floor(rng() * s.substitutions.length)] });
    }
    if (members.length === 4 && teamCost(members) <= COST_CAP && !validateTeam({ members }).length) return { members };
  }
  throw new Error('could not build a random team');
}
