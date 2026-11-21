// Drafts one support skill per shinobi from their own jutsu list (see "Support Skills" tab in the kit sheet).
import { SHINOBI } from '../public/data/shinobi.js';
import { JUTSU } from '../public/data/jutsu.js';
import { writeFileSync } from 'node:fs';
const BAD = ['selfKO', 'selfStab', 'curseLink', 'bodyguard', 'rotation', 'selfVulnerable'];
const W = { heal: 10, revive: 9, cleanse: 8, buff: 7, revealLoadout: 6, bind: 7, genjutsu: 7, paralyze: 6, debuff: 6, drainChakra: 5, intel: 4, decoy: 5, restoreChakra: 8, poison: 3, burn: 3, flinch: 2, pierce: 0 };
// hand picks where the auto pick reads oddly from the rear (self-only stances, recoil moves) or a signature fits better
export const PICKS = {
  kiba_p1: 'dynamic_marking', kiba_ship: 'dynamic_marking', suigetsu: 'great_water_arm', han: 'steam_punch', mifune: 'iai_flash',
  raikage_a: 'guillotine_drop', darui: 'black_panther', mu: 'mu_invisibility', guy: 'dynamic_entry', kakashi_dms: 'kamui_raikiri',
};
export const POWER_MULT = 0.7;
// balance pass 8 (after the first support-skill sims)
export const COOLDOWN_OVERRIDES = { jugo: 3, kabuto_p1: 4, kimimaro: 3, choji_p1: 4, choji_ship: 3, karin: 4, asuma: 2, kabuto_sage: 5 };
export function cooldown(j) {
  if (j.effects.some((e) => e.type === 'revive')) return 'Once';
  let cd = Math.ceil(j.cost / 15);
  if (j.target === 'allEnemies' && j.effects.some((e) => ['bind', 'genjutsu', 'paralyze', 'drainChakra', 'poison', 'burn', 'debuff'].includes(e.type))) cd += 1;
  if (j.power >= 110) cd += 1;
  return Math.max(2, Math.min(6, cd));
}
const rows = [];
for (const s of SHINOBI) {
  const opts = s.catalogue.map((id) => JUTSU[id]).filter((j) => j && !j.requiresTransform && !j.effects.some((e) => BAD.includes(e.type)) && !j.charged);
  const sc = (j) => { let v = 0; for (const e of j.effects) v += W[e.type] ?? 0; if (j.target === 'allEnemies') v += j.power ? 4 : 3; else if (j.target === 'allAllies') v += 3; if (j.power) v += j.power / 50; return v; };
  opts.sort((a, b) => sc(b) - sc(a));
  const j = JUTSU[PICKS[s.id]] || opts[0];
  const tgt = { enemy: '1 enemy', allEnemies: 'All enemies', ally: '1 ally', allAllies: 'All allies', self: '1 ally (was Self)' }[j.target];
  const pow = j.power ? Math.round(j.power * POWER_MULT) : '';
  let eff = j.desc;
  if (j.target === 'self') eff = eff.replace(/^(\+)/, 'Target ally gets +');
  rows.push([s.name, s.cost, `${s.supportAura.name}`, j.name, tgt, pow, j.priority > 0 ? `+${j.priority}` : `${j.priority}`, eff, COOLDOWN_OVERRIDES[s.id] ?? cooldown(j), '']);
  rows[rows.length - 1].id = j.id;
}
writeFileSync('/tmp/support_rows.json', JSON.stringify(rows));
writeFileSync('drafts/support_skills.json', JSON.stringify(Object.fromEntries(SHINOBI.map((s, i) => [s.id, { jutsu: rows[i].id, cooldown: rows[i][8] }])), null, 1));
console.log(rows.length, rows.slice(0, 3));
const c = {}; for (const r of rows) c[r[8]] = (c[r[8]] || 0) + 1; console.log(c);
