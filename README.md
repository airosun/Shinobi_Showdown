# Shinobi Showdown

A Naruto team battler: build a three-man cell plus a support, pick 4 jutsu each, and win by **Elimination** or by securing **100 Intel**, both in the same Standard mode.

## Run it

```bash
npm start          # http://localhost:3000  (no dependencies)
npm test           # engine rules tests
npm run sim 2000   # AI-vs-AI balance sim (win types, per-shinobi win rate)
```

## Deploy (Render)

`render.yaml` defines a free Node web service (`npm install` / `npm start`, auto-deploys on push to `main`). In Render: **New → Blueprint** → pick this repo, or **New → Web Service** with those two commands.

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

## Roster data

`public/data/shinobi.js` and `jutsu.js` are generated: kits are reviewed in the kit sheet, copied into
`drafts/konoha.py` (one file per batch), and `python3 drafts/gen_data.py` writes the data files, applying the
balance-pass overrides kept at the top of that script.

1. Draft the batch (stats, natures, trait, transformation, support passive stages, jutsu).
2. New trait behaviour goes in `TRAITS` / `traitOf(...)` in `engine/battle.js`; new support passive types in `auraVal(...)` call sites.
3. Run `npm test` and `npm run sim` — the sim prints each shinobi's win rate against what its cost predicts.
