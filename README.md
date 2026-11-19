# Shinobi Showdown

A Naruto team battler: build a three-man cell plus a support, pick 4 jutsu each, and win by **Elimination** or by securing **100 Intel**, both in the same Standard mode.

## Run it

```bash
npm start          # http://localhost:3000  (no dependencies)
npm test           # engine rules tests
npm run sim 2000   # AI-vs-AI balance sim (win types, per-shinobi win rate)
```

Modes: **Hot-Seat** (two players, one device, with pass-the-device screens) and **Vs CPU** (quick testing).

## Project layout

```
public/
  index.html, style.css, app.js   hot-seat UI (vanilla JS modules)
  data/shinobi.js                 roster: stats, natures, traits, transformations, auras, costs
  data/jutsu.js                   jutsu catalogue
  engine/natures.js               nature chart, kekkei genkai, affinity
  engine/battle.js                battle engine: turn resolution, damage, Intel, win checks (BALANCE constants at top)
  engine/ai.js                    heuristic CPU
  engine/teams.js                 random team builder
scripts/sim.js                    balance simulator
tests/engine.test.js              rules tests
server.js                         static server (Render-ready: `npm start`)
docs/DESIGN.md                    full rules reference
```

The engine has no DOM code, so the same files will run on a Socket.IO server when online play is added.

## Adding a shinobi

1. Add the jutsu to `public/data/jutsu.js`.
2. Add an entry to `public/data/shinobi.js`. Give alternate forms the same `baseId` and a different `id`/`cost`.
3. If the trait needs new behaviour, add it in `engine/battle.js` (search `traitOf(`).
4. Run `npm test` and `npm run sim` to check balance.
