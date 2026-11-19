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
for (const s of SHINOBI) per[s.id] = { games: 0, wins: 0 };
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
  teams.forEach((t, side) => t.members.forEach((m) => {
    per[m.id].games++;
    if (st.winner === side) per[m.id].wins++;
  }));
}
console.log(`games: ${games}, avg turns: ${(stats.turns / games).toFixed(1)}`);
console.log(`Elimination ${(100 * stats.Elimination / games).toFixed(1)}% | Intel ${(100 * stats.Intel / games).toFixed(1)}% | Time/simul ${(100 * stats.other / games).toFixed(1)}% | Draw ${(100 * stats.draw / games).toFixed(1)}%`);
console.log('\nWin rate by shinobi (appearing in random teams):');
Object.entries(per).sort((a, b) => b[1].wins / b[1].games - a[1].wins / a[1].games)
  .forEach(([id, p]) => console.log(`  ${id.padEnd(18)} ${(100 * p.wins / Math.max(1, p.games)).toFixed(1)}%  (${p.games})`));
