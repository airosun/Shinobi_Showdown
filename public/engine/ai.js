// Heuristic CPU ("Normal", and the balance sim) plus the lookahead CPU ("Hard") below.
import {
  availableActions, onField, getJutsu, computeDamage, slotOf, defOf, unsecuredTotal, supportSkillState,
} from './battle.js';

export const AI_CONSERVE_DEFAULT = 2.5;
let AI_CONSERVE = Number(globalThis.process?.env?.AI_CONSERVE ?? AI_CONSERVE_DEFAULT);

export function chooseActions(state, side, rng = Math.random) {
  const actions = [];
  const chance = (p) => rng() < p;
  const enemies = onField(state, 1 - side);
  const allies = onField(state, side);

  for (const u of allies) {
    const opts = availableActions(state, u.uid).filter((o) => !o.disabled);
    if (!opts.length) continue;
    const forced = opts.find((o) => o.type === 'none' || o.type === 'weaveRelease');
    if (forced) { actions.push({ actor: u.uid, type: forced.type }); continue; }
    const has = (type) => opts.find((o) => o.type === type);
    const specialist = defOf(u).roles.some((r) => r === 'Sensor' || r === 'Infiltrator');

    if (has('release') && chance(0.7)) { actions.push({ actor: u.uid, type: 'release' }); continue; }
    if (has('transform') && chance(0.8)) { actions.push({ actor: u.uid, type: 'transform' }); continue; }
    // Chakra management: when low, usually Charge (more often if nothing affordable is worth casting)
    const affordable = opts.filter((o) => o.type === 'jutsu' && !o.overexert);
    const lowCk = u.chakra < u.maxChakra * 0.25;
    if (lowCk && chance(affordable.length ? 0.45 : 0.7)) { actions.push({ actor: u.uid, type: 'charge' }); continue; }
    if (u.hp < u.maxHp * 0.35 && u.subStreak === 0 && has('substitute') && chance(0.35)) {
      actions.push({ actor: u.uid, type: 'substitute' }); continue;
    }
    if (unsecuredTotal(u) >= 12 && has('substitute') && u.subStreak === 0 && chance(0.4)) {
      actions.push({ actor: u.uid, type: 'substitute' }); continue;
    }
    if (chance(specialist ? 0.35 : 0.08)) { actions.push({ actor: u.uid, type: 'gather' }); continue; }
    if (chance(0.06)) { actions.push({ actor: u.uid, type: 'guard' }); continue; }

    // Chiyo: bring back a fallen ally
    const reviveOpt = opts.find((o) => o.type === 'jutsu' && !o.overexert && getJutsu(o.jutsuId).effects.some((e) => e.type === 'revive'));
    if (reviveOpt && chance(0.85)) {
      const fallen = state.teams[side].slots.map((id) => state.units[id]).find((x) => x.ko);
      actions.push({ actor: u.uid, type: 'jutsu', jutsuId: reviveOpt.jutsuId, target: { slot: slotOf(state, fallen) } });
      continue;
    }
    // Haku: shield a badly hurt ally
    const guardOpt = opts.find((o) => o.type === 'jutsu' && !o.overexert && getJutsu(o.jutsuId).effects.some((e) => e.type === 'bodyguard'));
    const weak = allies.filter((a) => a !== u && a.hp < a.maxHp * 0.4 && a.hp / a.maxHp < u.hp / u.maxHp - 0.2)[0];
    if (guardOpt && weak && chance(0.5)) {
      actions.push({ actor: u.uid, type: 'jutsu', jutsuId: guardOpt.jutsuId, target: { slot: slotOf(state, weak) } });
      continue;
    }

    // healing
    const hurt = allies.filter((a) => a.hp < a.maxHp * 0.5).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const healOpt = opts.find((o) => o.type === 'jutsu' && !o.overexert && getJutsu(o.jutsuId).effects.some((e) => e.type === 'heal'));
    if (hurt && healOpt) {
      actions.push({ actor: u.uid, type: 'jutsu', jutsuId: healOpt.jutsuId, target: { slot: slotOf(state, hurt) } });
      continue;
    }

    // score offensive / utility options
    const scored = [];
    for (const o of opts) {
      if (o.type !== 'jutsu' && o.type !== 'kunai') continue;
      const j = getJutsu(o.jutsuId);
      if (j.effects.some((e) => e.type === 'revive' || e.type === 'bodyguard')) continue; // handled above
      // Deidara's C0 is a last resort; Hidan's stab only makes sense while the curse is up
      if (j.effects.some((e) => e.type === 'selfKO') && u.hp > u.maxHp * 0.35) continue;
      if (j.effects.some((e) => e.type === 'selfStab') && !u.link) continue;
      if (j.effects.some((e) => e.type === 'curseLink') && u.link) continue;
      // overexerting costs HP: only worth it for a knockout (or rarely when desperate)
      // chakra conservation: the emptier the tank, the more a jutsu's cost weighs against it (free Kunai gains ground)
      const frac = u.chakra / Math.max(1, u.maxChakra);
      const conserve = (sc, lethal) => (o.type === 'jutsu' && o.cost && !lethal ? sc - o.cost * AI_CONSERVE * Math.max(0, 0.75 - frac) : sc);
      const ox = (sc, lethal) => conserve(o.overexert ? (lethal ? sc * 0.9 : sc - o.overexert * 1.6) : sc, lethal);
      const tag = (a) => (o.overexert ? { ...a, overexert: true } : a);
      if (j.target === 'enemy') {
        for (const e of enemies) {
          let s = j.power ? computeDamage(state, u, e, j, { noRandom: true }).damage : 0;
          if (!j.power) s = j.effects.some((x) => ['bind', 'genjutsu'].includes(x.type)) ? (e.statuses.bind ? 5 : 45) : 20;
          if (j.effects.some((x) => x.type === 'intel')) s += 15;
          if (unsecuredTotal(e) > 0) s *= 1.3;
          if (j.power && s >= e.hp) s *= 1.4;
          if (j.charged) s *= 0.55;
          s = ox(s, j.power && s >= e.hp);
          scored.push({ s, action: tag({ actor: u.uid, type: o.type, jutsuId: o.jutsuId, target: { slot: slotOf(state, e) } }) });
        }
      } else if (j.target === 'allEnemies') {
        let s = 0;
        for (const e of enemies) s += j.power ? computeDamage(state, u, e, j, { noRandom: true }).damage : 15;
        if (j.charged) s *= 0.55;
        s = ox(s, false);
        scored.push({ s, action: tag({ actor: u.uid, type: o.type, jutsuId: o.jutsuId }) });
      } else {
        const s = ox(j.effects.some((x) => x.type === 'intel') ? 30 : 25, false);
        scored.push({ s, action: tag({ actor: u.uid, type: 'jutsu', jutsuId: o.jutsuId, target: { slot: slotOf(state, u) } }) });
      }
    }
    if (!scored.length) { actions.push({ actor: u.uid, type: 'charge' }); continue; }
    scored.sort((a, b) => b.s - a.s);
    // nothing worth doing: refill instead
    if (scored[0].s <= 0) { actions.push({ actor: u.uid, type: 'charge' }); continue; }
    // mostly pick the best, sometimes the second best
    const pick = scored.length > 1 && chance(0.25) ? scored[1] : scored[0];
    actions.push(pick.action);
  }
  const sup = supportPick(state, side, rng);
  if (sup) actions.push(sup);
  return actions;
}

/** Heuristic support-skill order: use it when it's ready and has a sensible target. */
export function supportPick(state, side, rng = Math.random) {
  const sk = supportSkillState(state, side);
  if (sk.disabled) return null;
  const j = sk.jutsu;
  const allies = onField(state, side);
  const enemies = onField(state, 1 - side);
  const a = { actor: sk.uid, type: 'supportSkill', jutsuId: j.id };
  const has = (t) => j.effects.some((e) => e.type === t);
  if (has('revive')) {
    const fallen = state.teams[side].slots.map((id) => state.units[id]).find((x) => x.ko);
    return fallen ? { ...a, target: { slot: slotOf(state, fallen) } } : null;
  }
  if (j.target === 'ally' || j.target === 'self') {
    const healing = has('heal') || has('cleanse') || has('restoreChakra');
    const pickA = healing
      ? allies.slice().sort((x, y) => (x.hp / x.maxHp - (Object.keys(x.statuses).length ? 0.3 : 0)) - (y.hp / y.maxHp - (Object.keys(y.statuses).length ? 0.3 : 0)))[0]
      : allies[Math.floor(rng() * allies.length)];
    if (healing && pickA.hp > pickA.maxHp * 0.7 && !Object.keys(pickA.statuses).length && !(has('restoreChakra') && pickA.chakra < pickA.maxChakra * 0.5)) return null;
    return { ...a, target: { slot: slotOf(state, pickA) } };
  }
  if (j.target === 'allAllies') {
    if (has('heal') && !allies.some((x) => x.hp < x.maxHp * 0.75)) return rng() < 0.3 ? a : null;
    return a;
  }
  if (j.target === 'enemy') {
    let best = null; let bs = -1;
    for (const e of enemies) {
      let sc = j.power ? computeDamage(state, state.units[sk.uid], e, j, { noRandom: true }).damage : 30;
      if (has('bind') && e.statuses.bind) sc *= 0.3;
      if (j.power && sc >= e.hp) sc *= 2;
      if (sc > bs) { bs = sc; best = e; }
    }
    return best ? { ...a, target: { slot: slotOf(state, best) } } : null;
  }
  return a; // allEnemies
}

// ---------------------------------------------------------------------------
// Smarter CPU: one-turn lookahead.
// Start from the heuristic plan, then for each shinobi try every legal action
// (and target), play the whole turn out on copies of the battle against a few
// predicted enemy plans, and keep whatever leaves the position best.
// Because the engine is deterministic and cheap to copy, this sees things the
// heuristic can't: Substituting out of a predicted lethal hit, focusing a KO,
// when Gather Intel will actually land, or when a Charge leaves you exposed.
// ---------------------------------------------------------------------------
import { resolveTurn, missionScore, createBattle } from './battle.js';
import { randomTeam } from './teams.js';
import { teamCost } from './battle.js';
const costOf = (t) => teamCost(t.members);
import { makeRng } from './rng.js';

export const W = { alive: 140, hp: 120, chakra: 60, intel: 3.2, unsecured: 2.2, threat: 0.25 };
if (globalThis.process?.env?.AI_W) Object.assign(W, JSON.parse(globalThis.process.env.AI_W));
const STATUS_COST = { bind: 22, genjutsu: 18, paralyze: 12, burn: 9, poison: 9, exhausted: 12 };

function cloneState(state, seed) {
  const { log, ...rest } = state;
  const c = structuredClone(rest);
  c.log = [];
  Object.defineProperty(c, 'rng', { value: makeRng(seed), enumerable: false, writable: true });
  return c;
}

// best single-target damage a unit could deal next turn with what it can afford (rough "threat")
function threat(state, u, foes) {
  if (u.ko || !foes.length) return 0;
  let best = 0;
  for (const id of u.loadout) {
    const j = getJutsu(id);
    if (!j.power || (j.requiresTransform && !u.transform)) continue;
    for (const e of foes) best = Math.max(best, computeDamage(state, u, e, j, { noRandom: true }).damage);
  }
  return best;
}

/** Position value for `side` (positive = good for side). */
export function evaluate(state, side) {
  if (state.winner === side) return 100000 - state.turn;
  if (state.winner === 1 - side) return -100000 + state.turn;
  if (state.winner === 'draw') return 0;
  let v = 0;
  for (const s of [0, 1]) {
    const sign = s === side ? 1 : -1;
    const team = state.teams[s];
    const foes = onField(state, 1 - s);
    let tv = 0;
    for (const id of team.slots) {
      const u = state.units[id];
      if (u.ko) continue;
      const hpF = u.hp / u.maxHp;
      tv += W.alive + W.hp * hpF;                       // being alive matters most; HP next
      tv += W.chakra * Math.min(1, u.chakra / Math.max(1, u.maxChakra)); // fuel for future jutsu
      tv += 0.15 * u.resolve;
      if (u.transform) tv += 12 * Math.max(0, u.transform.turnsLeft);
      if (u.weaving?.kind === 'transform') tv += 30;
      if (u.weaving?.kind === 'jutsu') {
        const j = getJutsu(u.weaving.jutsuId);
        tv += j.power ? 0.45 * Math.max(...foes.map((e) => computeDamage(state, u, e, j, { noRandom: true }).damage), 0) : 20;
      }
      for (const [k, st] of Object.entries(u.statuses)) tv -= (STATUS_COST[k] || 6) * Math.min(3, st.turns || 1);
      for (const b of u.buffs) tv += (b.mult - 1) * 60 * Math.min(3, b.turns);
      tv += W.threat * threat(state, u, foes) * Math.min(1, u.chakra / Math.max(1, u.maxChakra) + 0.3);
      // Intel still in hand can be lost if this shinobi falls
      tv += W.unsecured * unsecuredTotal(u) * (0.6 + 0.4 * hpF);
    }
    if (!supportSkillState(state, s).disabled) tv += 8; // a skill in hand has some value
    const intel = team.securedIntel;
    tv += W.intel * intel + (intel >= 75 ? 25 : 0) + (intel >= 90 ? 40 : 0);
    if (state.turn > state.maxTurns - 3) tv += 1.5 * missionScore(state, s);
    v += sign * tv;
  }
  return v;
}

function candidates(state, u) {
  const out = [];
  const opts = availableActions(state, u.uid);
  for (const o of opts) {
    if (o.disabled) continue;
    if (o.type === 'none' || o.type === 'weaveRelease') return [{ actor: u.uid, type: o.type }];
    const base = { actor: u.uid, type: o.type };
    if (o.jutsuId) base.jutsuId = o.jutsuId;
    if (o.overexert) base.overexert = true;
    if (o.type === 'jutsu' || o.type === 'kunai') {
      const j = getJutsu(o.jutsuId);
      if (j.effects.some((e) => e.type === 'selfKO') && u.hp > u.maxHp * 0.35) continue;
      if (j.target === 'enemy') {
        for (const e of onField(state, 1 - u.side)) out.push({ ...base, target: { slot: slotOf(state, e) } });
      } else if (j.target === 'ally') {
        const revive = j.effects.some((e) => e.type === 'revive');
        const pool = revive ? state.teams[u.side].slots.map((id) => state.units[id]).filter((x) => x.ko)
          : onField(state, u.side).filter((x) => !j.effects.some((e) => e.type === 'bodyguard') || x !== u);
        for (const a of pool) out.push({ ...base, target: { slot: slotOf(state, a) } });
      } else out.push({ ...base, target: { slot: slotOf(state, u) } });
    } else out.push(base);
  }
  return out;
}

/**
 * Smarter CPU orders for `side`.
 * opts.samples: predicted enemy plans to test against (more = stronger, slower)
 * opts.passes: rounds of improving each shinobi's choice given the others'
 * opts.known: enemy actions the CPU has seen (Intel preview)
 */
export function chooseActionsSmart(state, side, rng = Math.random, { samples = 6, passes = 2, known = [] } = {}) {
  if (state.winner !== null) return [];
  const mine = onField(state, side);
  const plan = new Map(chooseActions(state, side, rng).map((a) => [a.actor, a]));
  // predicted enemy plans (the heuristic AI with different dice), with anything we've seen pinned in
  const scen = [];
  for (let k = 0; k < samples; k++) {
    const r = makeRng(Math.floor(rng() * 2 ** 31));
    const ep = chooseActions(state, 1 - side, r);
    for (const kn of known) { const i = ep.findIndex((a) => a.actor === kn.actor); if (i >= 0) ep[i] = kn; }
    scen.push({ enemy: ep, seed: Math.floor(rng() * 2 ** 31) });
  }
  const score = (p) => {
    let tot = 0;
    for (const sc of scen) {
      const c = cloneState(state, sc.seed);
      try { resolveTurn(c, [...p.values(), ...sc.enemy].filter(Boolean).map((a) => ({ ...a }))); } catch { return -Infinity; }
      tot += evaluate(c, side);
    }
    return tot / scen.length;
  };
  const cands = new Map(mine.map((u) => [u.uid, candidates(state, u)]));
  // the support skill: hold it, or use it on any legal target
  const sk = supportSkillState(state, side);
  if (!sk.disabled) {
    const base = { actor: sk.uid, type: 'supportSkill', jutsuId: sk.jutsu.id };
    const j = sk.jutsu;
    const revive = j.effects.some((e) => e.type === 'revive');
    const pool = revive ? state.teams[side].slots.map((id) => state.units[id]).filter((x) => x.ko)
      : j.target === 'enemy' ? onField(state, 1 - side) : (j.target === 'ally' || j.target === 'self') ? mine : null;
    const list = [null, ...(pool ? pool.map((t) => ({ ...base, target: { slot: slotOf(state, t) } })) : [base])];
    cands.set(sk.uid, list);
    if (!plan.has(sk.uid)) plan.set(sk.uid, null);
  }
  const movers = [...mine, ...(sk.disabled ? [] : [state.units[sk.uid]])];
  let best = score(plan);
  for (let pass = 0; pass < passes; pass++) {
    let improved = false;
    for (const u of movers) {
      const list = cands.get(u.uid);
      if (list.length <= 1) { if (list[0]) plan.set(u.uid, list[0]); continue; }
      const cur = plan.get(u.uid);
      let pick = cur; let pickS = best;
      for (const a of list) {
        if (cur && JSON.stringify(a) === JSON.stringify(cur)) continue;
        plan.set(u.uid, a);
        const s = score(plan) + rng() * 1.5; // a little noise so it isn't fully predictable
        if (s > pickS + 0.5) { pick = a; pickS = s; }
      }
      plan.set(u.uid, pick);
      if (pick !== cur) { best = pickS; improved = true; }
    }
    if (!improved) break;
  }
  return movers.map((u) => plan.get(u.uid)).filter(Boolean);
}

/**
 * CPU team for Hard: a handful of full-budget teams with their signature loadouts,
 * each tried in quick heuristic-vs-heuristic games against the player's team; keep the best.
 */
export function buildCpuTeam(playerSpec, rng = Math.random, { candidates = 6, games = 6 } = {}) {
  let best = null; let bestScore = -1;
  for (let c = 0; c < candidates; c++) {
    let team = randomTeam(rng, { keepDefaults: 1 });
    for (let k = 0; k < 4; k++) { // lean towards spending the whole budget
      const t = randomTeam(rng, { keepDefaults: 1 });
      if (costOf(t) > costOf(team)) team = t;
    }
    if (!playerSpec) return team;
    let wins = 0;
    for (let g = 0; g < games; g++) {
      const specs = [{ name: 'P', members: playerSpec.members }, { name: 'CPU', members: team.members }];
      const st = createBattle(specs, { seed: Math.floor(rng() * 2 ** 31) });
      const r = makeRng(Math.floor(rng() * 2 ** 31));
      let guard = 0;
      while (st.winner === null && guard++ < 40) resolveTurn(st, [...chooseActions(st, 0, r), ...chooseActions(st, 1, r)]);
      wins += st.winner === 1 ? 1 : st.winner === 'draw' ? 0.5 : 0;
    }
    if (wins > bestScore) { bestScore = wins; best = team; }
  }
  return best;
}
