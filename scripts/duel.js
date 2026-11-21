// Smart CPU vs heuristic CPU: node scripts/duel.js [games]  (sides swap every game)
import { createBattle, resolveTurn } from '../public/engine/battle.js';
import { randomTeam } from '../public/engine/teams.js';
import { chooseActions, chooseActionsSmart } from '../public/engine/ai.js';
import { makeRng } from '../public/engine/rng.js';
const games = Number(process.argv[2] || 100);
const opts = JSON.parse(process.env.SMART_OPTS || '{}');
const rng = makeRng(777);
let smartWins = 0, draws = 0, turns = 0; const reasons = {};
const t0 = Date.now();
for (let g = 0; g < games; g++) {
  const teams = [randomTeam(rng), randomTeam(rng)];
  const smart = g % 2;
  const st = createBattle(teams, { seed: Math.floor(rng() * 1e9) });
  const r = makeRng(Math.floor(rng() * 1e9));
  let guard = 0;
  while (st.winner === null && guard++ < 50) {
    const a = smart === 0 ? [...chooseActionsSmart(st, 0, r, opts), ...chooseActions(st, 1, r)] : [...chooseActions(st, 0, r), ...chooseActionsSmart(st, 1, r, opts)];
    resolveTurn(st, a);
  }
  turns += st.turn;
  if (st.winner === smart) { smartWins++; reasons[st.winReason] = (reasons[st.winReason] || 0) + 1; } else if (st.winner === 'draw') draws++;
}
console.log(`smart won ${smartWins}/${games} (${(100 * smartWins / games).toFixed(1)}%), draws ${draws}, avg turns ${(turns / games).toFixed(1)}, ${((Date.now() - t0) / games / 1000).toFixed(2)}s/game`, JSON.stringify(reasons));
