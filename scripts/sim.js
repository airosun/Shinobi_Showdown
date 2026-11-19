// AI-vs-AI balance sim: node scripts/sim.js [games]
import { createBattle, resolveTurn } from '../public/engine/battle.js';
import { randomTeam } from '../public/engine/teams.js';
import { chooseActions } from '../public/engine/ai.js';
import { SHINOBI } from '../public/data/shinobi.js';
import { makeRng } from '../public/engine/rng.js';

const games = Number(process.argv[2] || 2000);
const rng = makeRng(12345);
const stats = { Elimination: 0, Intel: 0, other: 0, draw: 0, turns: 0 };
const per = {};
for (const s of SHINOBI) per[s.id] = { games: 0, wins: 0, sg: 0, sw: 0 };
for (let g = 0; g < games; g++) {
  const teams = [randomTeam(rng), randomTeam(rng)];
  const st = createBattle(teams, { seed: Math.floor(rng() * 1e9) });
  const aiRng = makeRng(Math.floor(rng() * 1e9));
  let guard = 0;
  while (st.winner === null && guard++ < 50) {
    resolveTurn(st, [...chooseActions(st, 0, aiRng), ...chooseActions(st, 1, aiRng)]);
  }
  stats.turns += st.turn;
  if (st.winner === 'draw') stats.draw++;
  else if (st.winReason === 'Elimination') stats.Elimination++;
  else if (st.winReason === 'Intel') stats.Intel++;
  else stats.other++;
  teams.forEach((t, side) => t.members.forEach((m, i) => {
    const p = per[m.id];
    if (i < 3) { p.games++; if (st.winner === side) p.wins++; } else { p.sg++; if (st.winner === side) p.sw++; }
  }));
}
console.log(`games: ${games}, avg turns: ${(stats.turns / games).toFixed(1)}`);
console.log(`Elimination ${(100 * stats.Elimination / games).toFixed(1)}% | Intel ${(100 * stats.Intel / games).toFixed(1)}% | Time/simul ${(100 * stats.other / games).toFixed(1)}% | Draw ${(100 * stats.draw / games).toFixed(1)}%`);
// expected win rate from cost (least squares), so the residual shows over/under-performers
const rows = SHINOBI.map((s) => ({ id: s.id, cost: s.cost, wr: per[s.id].wins / Math.max(1, per[s.id].games), n: per[s.id].games, swr: per[s.id].sw / Math.max(1, per[s.id].sg), sn: per[s.id].sg }));
const mx = rows.reduce((a, r) => a + r.cost, 0) / rows.length; const my = rows.reduce((a, r) => a + r.wr, 0) / rows.length;
const b = rows.reduce((a, r) => a + (r.cost - mx) * (r.wr - my), 0) / rows.reduce((a, r) => a + (r.cost - mx) ** 2, 0);
const fit = (c) => my + b * (c - mx);
console.log(`\nActive win rate vs what its cost predicts (fit: ${(100 * fit(4)).toFixed(0)}% at cost 4 … ${(100 * fit(10)).toFixed(0)}% at cost 10)`);
console.log('  id                 cost  active   vs cost   as support');
rows.sort((x, y) => (y.wr - fit(y.cost)) - (x.wr - fit(x.cost)))
  .forEach((r) => console.log(`  ${r.id.padEnd(18)} ${String(r.cost).padStart(3)}   ${(100 * r.wr).toFixed(1).padStart(5)}%   ${((r.wr - fit(r.cost)) * 100 >= 0 ? '+' : '') + ((r.wr - fit(r.cost)) * 100).toFixed(1).padStart(4)}    ${(100 * r.swr).toFixed(1).padStart(5)}% (${r.sn})`));
