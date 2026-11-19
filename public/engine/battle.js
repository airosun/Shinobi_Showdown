// Shinobi Showdown battle engine.
// Pure logic, no DOM: runs in the browser (hot-seat) and in Node (tests, sim,
// and later the online server).

import { JUTSU } from '../data/jutsu.js';
import { SHINOBI_BY_ID, SUBSTITUTIONS, COST_CAP } from '../data/shinobi.js';
import { advantage, affinity, AMPLIFIED_BY } from './natures.js';
import { makeRng } from './rng.js';

// ---------------------------------------------------------------------------
// Tunable numbers. Change these first when balancing.
// ---------------------------------------------------------------------------
export const BALANCE = {
  hpScale: 3,             // max HP = base hp * hpScale
  chakraScale: 1.25,       // max Chakra = base chk * chakraScale
  damageScale: 0.42,
  maxTurns: 20,
  intelToWin: 100,
  koScore: 25,            // Mission Score per KO (turn-limit tiebreak)
  chakraRegen: 0.04,      // passive regen per turn (Charge is the real refill)
  chargeChakra: 0.5,
  overexertHp: 1.2,       // HP paid per missing Chakra point when overexerting
  overexertExhaust: 2,    // turns of Exhausted after overexerting
  vulnerableMult: 1.25,   // charging / weaving / exposed
  guardDamageMult: 0.75,
  critChance: 1 / 16,
  critMult: 1.5,
  randomMin: 0.85,
  clashWinnerMult: 0.7,
  collabMult: 1.3,
  subChain: [1, 0.5, 0.25], // substitution success on consecutive turns
  aoeSubMult: 0.5,
  exhaustionDamage: 0.06, // end of turn at 0 Chakra
  burnDamage: 0.05,
  poisonDamage: 0.06,
  paralyzeFail: 0.25,
  genjutsuFail: 0.5,
  exhaustedMult: 0.85,
  intelGather: 12,
  intelGatherSpecialist: 22,
  intelKO: 15,
  intelGenjutsu: 4,
  intelReveal: 1,
  resolveFromDamage: 0.7, // resolve gained per 1% max HP lost
  resolveAllyKO: 25,
  resolveSuperEffective: 8,
  maxDodge: 0.12,
};

export const MILESTONES = [25, 50, 75];

// Action priorities
const P_STANCE = 4; // substitute, guard, transform, release, start weaving
const P_KUNAI = 2;
const P_GATHER = -1;
const P_CHARGE = -2;

export const KUNAI = {
  id: 'kunai', name: 'Kunai & Shuriken', category: 'taijutsu', nature: null,
  power: 35, cost: 0, priority: P_KUNAI, target: 'enemy', effects: [],
  desc: 'Free, fast thrown weapons. Good for baiting out Substitutions.',
};
// Tenten's version (Weapon Mistress): hits every enemy
export const KUNAI_STORM = {
  ...KUNAI, id: 'kunai_storm', name: 'Kunai & Shuriken Storm', target: 'allEnemies', power: 25,
  desc: 'Weapon Mistress: free, fast weapons that hit every enemy.',
};
const isKunai = (j) => j.id === 'kunai' || j.id === 'kunai_storm';

// Behaviour flags per trait id (the trait's own name/desc live in the data).
export const TRAITS = {
  uzumakiVitality: ['vitality'],
  kuramaLink: ['vitality', 'genjutsuImmune'],
  sharingan: ['dojutsu', 'reflect'],
  mangekyo: ['dojutsu', 'reflect', 'burnExtra'],
  ems: ['dojutsu', 'genjutsuImmune', 'burnExtra'],
  copyNinja: ['dojutsu', 'copy'],
  obitoGift: ['dojutsu', 'copy', 'genjutsuImmune'],
  byakugan: ['dojutsu', 'seesDecoy'],
  noNinjutsu: ['noNinjutsu'],
  whiteSnakeSage: ['seesDecoy', 'seesLog'],
};
// once-per-battle KO survival: [charges, HP left]
const SURVIVE = { bodyShedding: [1, 0.25], izanagi: [2, 0.2] };
// passive HP regen per turn by trait
const REGEN = { medicalSpy: 0.04, whiteSnakeSage: 0.06 };
export const hasFlag = (unit, flag) => (TRAITS[SHINOBI_BY_ID[unit.id].trait.id] || []).includes(flag);
const PCT_AURAS = new Set(['stat', 'heal', 'chakra', 'subDiscount', 'decoyChance', 'crit', 'execute', 'dr', 'aoeDR', 'lowHpDR',
  'protectWeakest', 'genjutsuResist', 'dodge', 'pierce', 'kunai', 'taiDamage', 'focus', 'enemyIntel', 'enemyDrain', 'controlChance', 'natureBoost',
  'aoeBoost', 'poisonChance', 'cleanseChance']);

// ---------------------------------------------------------------------------
// Team validation
// ---------------------------------------------------------------------------
export function teamCost(members) {
  return members.reduce((sum, m) => sum + (SHINOBI_BY_ID[m.id]?.cost || 0), 0);
}

export function validateTeam(spec) {
  const errors = [];
  const members = spec?.members || [];
  if (members.length !== 4) errors.push('A team needs 3 active shinobi and 1 support.');
  const bases = new Set();
  for (const m of members) {
    const s = SHINOBI_BY_ID[m.id];
    if (!s) { errors.push(`Unknown shinobi "${m.id}".`); continue; }
    if (bases.has(s.baseId)) errors.push(`Only one version of ${s.name.split(' (')[0]} per team.`);
    bases.add(s.baseId);
    if (members.indexOf(m) === 3) continue; // the support never fights: no jutsu needed
    const lo = m.loadout || [];
    if (lo.length !== 4) errors.push(`${s.name} needs exactly 4 jutsu.`);
    if (new Set(lo).size !== lo.length) errors.push(`${s.name} has a duplicate jutsu.`);
    for (const j of lo) if (!s.catalogue.includes(j)) errors.push(`${s.name} cannot learn ${j}.`);
    if (m.substitution && !s.substitutions.includes(m.substitution)) errors.push(`${s.name} cannot use ${m.substitution}.`);
  }
  const cost = teamCost(members);
  if (cost > COST_CAP) errors.push(`Team costs ${cost}, over the cap of ${COST_CAP}.`);
  return errors;
}

// ---------------------------------------------------------------------------
// Battle creation
// ---------------------------------------------------------------------------
function makeUnit(side, index, member) {
  const def = SHINOBI_BY_ID[member.id];
  const chakraMult = (TRAITS[def.trait.id] || []).includes('vitality') ? 1.3 : 1;
  const maxHp = Math.round(def.stats.hp * BALANCE.hpScale);
  const maxChakra = Math.round(def.stats.chk * BALANCE.chakraScale * chakraMult);
  return {
    uid: `${side}-${index}`,
    side,
    id: def.id,
    name: def.name,
    maxHp, hp: maxHp,
    maxChakra, chakra: maxChakra,
    resolve: 0,
    loadout: [...(member.loadout || [])],
    copied: null,
    substitution: member.substitution || def.substitutions[0],
    statuses: {},   // name -> { turns }
    buffs: [],      // { stat, mult, turns }
    transform: null, // { turnsLeft }
    transformUsed: false,
    weaving: null,   // { kind: 'jutsu'|'transform', jutsuId?, target?, startedTurn }
    decoy: 0,
    subStreak: 0,
    unsecured: [],   // { amount, turn }
    ko: false,
    survives: SURVIVE[def.trait.id]?.[0] || 0,
    reviveUsed: false,
    flags: {},       // per-turn flags, reset every turn
  };
}

export function createBattle(teamSpecs, { seed = Date.now(), names = ['Player 1', 'Player 2'] } = {}) {
  const state = {
    turn: 1,
    maxTurns: BALANCE.maxTurns,
    seed,
    log: [],
    winner: null,      // 0 | 1 | 'draw'
    winReason: null,
    units: {},
    teams: teamSpecs.map((spec, side) => {
      const uids = spec.members.map((m, i) => `${side}-${i}`);
      return {
        side,
        name: spec.name || names[side],
        uids,
        slots: uids.slice(0, 3),
        reserve: uids[3],
        supportUid: uids[3],
        securedIntel: 0,
        kos: 0,
        auraStage: 1,
        milestones: [],
        revealed: Object.fromEntries(uids.map((u) => [u, []])), // what the OTHER team knows
        fullyRevealed: [],
        seesChakra: false,
        preview: false,
      };
    }),
  };
  teamSpecs.forEach((spec, side) => spec.members.forEach((m, i) => {
    const u = makeUnit(side, i, m);
    state.units[u.uid] = u;
  }));
  Object.defineProperty(state, 'rng', { value: makeRng(seed), enumerable: false, writable: true });
  log(state, `Battle start! ${state.teams[0].name} vs ${state.teams[1].name}.`, 'system');
  return state;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// who: a unit (sets side + u) or a side number. extra: structured data used by the
// client to animate (jutsu, targets, amount, crit, adv, ...).
function log(state, text, kind = 'info', who = null, extra = null) {
  const entry = { turn: state.turn, text, kind, side: null };
  if (who && typeof who === 'object') { entry.side = who.side; entry.u = who.uid; } else if (who !== null && who !== undefined) entry.side = who;
  if (extra) Object.assign(entry, extra);
  state.log.push(entry);
  if (state._onLog) state._onLog(entry, state);
}

/** Plain-data copy of everything the UI draws (for step-by-step playback). */
export function snapshot(state) {
  return JSON.parse(JSON.stringify({
    turn: state.turn, maxTurns: state.maxTurns, winner: state.winner, winReason: state.winReason,
    units: state.units, teams: state.teams,
  }));
}

export const defOf = (unit) => SHINOBI_BY_ID[unit.id];
export const traitOf = (unit) => defOf(unit).trait.id;
const hasDojutsu = (unit) => hasFlag(unit, 'dojutsu');
const seesLog = (unit) => hasDojutsu(unit) || hasFlag(unit, 'seesLog');
/** Resolve a transformation needs, after the support's discount. */
export function tfResolve(state, unit) {
  const t = defOf(unit).transformation;
  return t ? Math.max(0, t.resolve - auraVal(state, unit.side, 'resolveDiscount')) : 0;
}
const isSpecialist = (unit) => defOf(unit).roles.some((r) => r === 'Sensor' || r === 'Infiltrator');
const isSensor = (unit) => defOf(unit).roles.includes('Sensor');
const other = (side) => 1 - side;

export function getJutsu(id) {
  return id === 'kunai' ? KUNAI : id === 'kunai_storm' ? KUNAI_STORM : JUTSU[id];
}

export function onField(state, side) {
  return state.teams[side].slots.map((uid) => (uid ? state.units[uid] : null)).filter((u) => u && !u.ko);
}

export function slotOf(state, unit) {
  return state.teams[unit.side].slots.indexOf(unit.uid);
}

/** Number of a team's active (on-field) shinobi still standing. */
export function aliveCount(state, side) {
  return onField(state, side).length;
}

/**
 * The support's passive. It never enters the battle; it grows stronger as the
 * cell falls: stage 1 with 3 allies standing, stage 2 with 2, stage 3 with 1.
 * Returns { name, desc, stage, effects: [{ type, value, ... }] } or null.
 */
export function activeAura(state, side) {
  const team = state.teams[side];
  const sup = state.units[team.supportUid];
  if (!sup) return null;
  const alive = aliveCount(state, side);
  if (!alive) return null;
  const aura = defOf(sup).supportAura;
  const stage = alive >= 3 ? 1 : alive === 2 ? 2 : 3;
  return { ...aura, stage, effects: aura.effects.map((e) => ({ ...e, value: e.values[stage - 1] })) };
}

/** Sum of a team's support-passive values of one type (optionally one stat). */
export function auraVal(state, side, type, stat = null) {
  const a = activeAura(state, side);
  if (!a) return 0;
  return a.effects.filter((e) => e.type === type && (!stat || e.stat === stat)).reduce((sum, e) => sum + e.value, 0);
}
function auraEffect(state, side, type) {
  return activeAura(state, side)?.effects.find((e) => e.type === type) || null;
}

/** Effective stat including transformation, buffs, exhaustion and aura. */
export function stat(state, unit, key) {
  let v = defOf(unit).stats[key];
  const t = defOf(unit).transformation;
  if (unit.transform && t?.mods?.[key]) v *= t.mods[key];
  for (const b of unit.buffs) if (b.stat === key) v *= b.mult;
  if (unit.statuses.exhausted) v *= BALANCE.exhaustedMult;
  if (slotOf(state, unit) !== -1) v *= 1 + auraVal(state, unit.side, 'stat', key);
  return v;
}

export function jutsuCost(state, unit, jutsu) {
  let c = jutsu.cost;
  if (traitOf(unit) === 'chakraControl') c *= 0.8;
  if (traitOf(unit) === 'genjutsuTalent' && (jutsu.category === 'genjutsu' || jutsu.nature === 'yin')) c *= 0.7;
  return Math.round(c);
}

/** HP it costs to force out a jutsu the user can't afford. */
export function overexertHpCost(unit, cost) {
  return Math.max(0, Math.round((cost - unit.chakra) * BALANCE.overexertHp));
}

export function subCost(state, unit) {
  let c = SUBSTITUTIONS[unit.substitution].cost * unit.maxChakra;
  c *= 1 - Math.min(0.9, auraVal(state, unit.side, 'subDiscount'));
  return Math.round(c);
}

function actionPriority(state, unit, action) {
  switch (action.type) {
    case 'substitute': case 'guard': case 'transform': case 'release':
      return P_STANCE;
    case 'gather': return P_GATHER;
    case 'charge': return P_CHARGE;
    case 'kunai': return P_KUNAI;
    case 'weaveRelease': {
      const j = getJutsu(unit.weaving.jutsuId);
      return j.priority;
    }
    case 'jutsu': {
      const j = getJutsu(action.jutsuId);
      if (j.charged) return P_STANCE; // starting the weave
      let p = j.priority;
      if (j.category === 'taijutsu' && hasFlag(unit, 'noNinjutsu')) p += 1;
      return p;
    }
    default: return 0;
  }
}

// ---------------------------------------------------------------------------
// Available actions (used by UI and AI)
// ---------------------------------------------------------------------------
export function availableActions(state, uid) {
  const u = state.units[uid];
  const team = state.teams[u.side];
  if (u.ko || slotOf(state, u) === -1) return [];
  if (u.statuses.bind) return [{ type: 'none', label: 'Bound — cannot act', targetType: 'none' }];
  if (u.weaving?.kind === 'jutsu') {
    const j = getJutsu(u.weaving.jutsuId);
    return [{ type: 'weaveRelease', label: `Release ${j.name}`, targetType: 'none', jutsuId: j.id }];
  }
  const acts = [];
  const jutsuIds = [...u.loadout, ...(u.copied ? [u.copied] : [])];
  for (const id of jutsuIds) {
    const j = getJutsu(id);
    const cost = jutsuCost(state, u, j);
    let disabled = null;
    let overexert = null;
    if (cost > u.chakra) {
      // not enough Chakra: it can still be forced out, paying the shortfall in HP
      const hp = overexertHpCost(u, cost);
      if (hp >= u.hp) disabled = 'Not enough Chakra (overexerting would knock you out)';
      else overexert = hp;
    }
    if (j.requiresTransform && !u.transform) disabled = 'Requires transformation';
    if (j.effects.some((e) => e.type === 'revive')) {
      if (u.reviveUsed) disabled = 'Already used this battle';
      else if (!team.slots.some((id) => state.units[id].ko)) disabled = 'No fallen ally';
    }
    if (j.effects.some((e) => e.type === 'bodyguard') && onField(state, u.side).length < 2) disabled = 'No ally to protect';
    acts.push({ type: 'jutsu', jutsuId: id, label: j.name, cost, targetType: j.target, disabled, overexert, copied: id === u.copied });
  }
  const kunai = traitOf(u) === 'weaponMistress' ? KUNAI_STORM : KUNAI;
  acts.push({ type: 'kunai', jutsuId: kunai.id, label: kunai.name, cost: 0, targetType: kunai.target });
  const sc = subCost(state, u);
  acts.push({
    type: 'substitute', label: SUBSTITUTIONS[u.substitution].name, cost: sc, targetType: 'none',
    disabled: sc > u.chakra ? 'Not enough Chakra' : null,
    note: u.subStreak ? `${Math.round(BALANCE.subChain[Math.min(u.subStreak, 2)] * 100)}% success` : null,
  });
  acts.push({ type: 'charge', label: 'Charge Chakra', targetType: 'none' });
  acts.push({ type: 'gather', label: 'Gather Intel', targetType: 'none' });
  acts.push({ type: 'guard', label: 'Guard', targetType: 'none' });
  if (u.statuses.genjutsu) acts.push({ type: 'release', label: 'Release! (Kai)', targetType: 'none' });
  const t = defOf(u).transformation;
  if (t && !u.transformUsed && !u.transform) {
    acts.push({
      type: 'transform', label: t.name, targetType: 'none',
      disabled: u.resolve < tfResolve(state, u) ? `Needs ${tfResolve(state, u)} Resolve` : null,
    });
  }
  return acts;
}

// ---------------------------------------------------------------------------
// Intel
// ---------------------------------------------------------------------------
function enemyGuardFactor(state, side) {
  const guards = onField(state, other(side)).filter((u) => u.flags.guarding);
  if (!guards.length) return 1;
  return guards.some(isSensor) ? 0.25 : 0.5;
}

function awardIntel(state, unit, amount, reason) {
  if (!unit || unit.ko) return;
  let amt = amount;
  if (traitOf(unit) === 'strategist') amt *= 1.25;
  amt *= 1 - Math.min(0.9, auraVal(state, other(unit.side), 'enemyIntel'));
  const f = traitOf(unit) === 'rootAgent' ? 1 : enemyGuardFactor(state, unit.side);
  amt = Math.round(amt * f);
  if (amt <= 0) {
    log(state, `${unit.name}'s intel was blocked by enemy guards.`, 'intel', unit);
    return;
  }
  unit.unsecured.push({ amount: amt, turn: state.turn });
  log(state, `${unit.name} gathered ${amt} Intel${reason ? ` (${reason})` : ''}${f < 1 ? ' — reduced by enemy Guard' : ''}.`, 'intel', unit, { amount: amt, minor: reason?.startsWith('revealed') });
}

export function unsecuredTotal(unit) {
  return unit.unsecured.reduce((s, e) => s + e.amount, 0);
}

function revealJutsu(state, user, jutsuId, observer) {
  if (jutsuId === 'kunai' || jutsuId === 'kunai_storm') return;
  const enemyTeam = state.teams[user.side];
  const known = enemyTeam.revealed[user.uid];
  if (known.includes(jutsuId)) return;
  known.push(jutsuId);
  const watcher = observer && !observer.ko && observer.side !== user.side
    ? observer
    : state.rng.pick(onField(state, other(user.side)) || []);
  if (watcher) awardIntel(state, watcher, BALANCE.intelReveal, `revealed ${getJutsu(jutsuId).name}`);
}

function revealLoadout(state, unit) {
  const t = state.teams[unit.side];
  if (!t.fullyRevealed.includes(unit.uid)) t.fullyRevealed.push(unit.uid);
  for (const j of unit.loadout) if (!t.revealed[unit.uid].includes(j)) t.revealed[unit.uid].push(j);
}

// ---------------------------------------------------------------------------
// Damage
// ---------------------------------------------------------------------------
export function computeDamage(state, att, def, jutsu, ctx = {}) {
  if (!jutsu.power) return { damage: 0 };
  const rng = state.rng;
  const A = jutsu.category === 'taijutsu' ? stat(state, att, 'tai') : stat(state, att, 'nin');
  const pierce = Math.min(0.8, (jutsu.effects.find((e) => e.type === 'pierce')?.value || 0) + auraVal(state, att.side, 'pierce')
    + (traitOf(att) === 'deadBone' && jutsu.category === 'taijutsu' ? 0.2 : 0));
  const D = Math.max(1, stat(state, def, 'def') * (1 - pierce));
  let dmg = jutsu.power * (A / D) * BALANCE.damageScale;
  dmg *= affinity(jutsu.nature, defOf(att).natures);
  const adv = advantage(jutsu.nature, defOf(def).natures.primary);
  dmg *= adv;
  if (jutsu.category === 'taijutsu' && hasFlag(att, 'noNinjutsu')) dmg *= 1.3;
  // attacker-side bonuses
  if (isKunai(jutsu)) {
    dmg *= 1 + auraVal(state, att.side, 'kunai');
  }
  if (jutsu.category === 'taijutsu') dmg *= 1 + auraVal(state, att.side, 'taiDamage');
  const nb = auraEffect(state, att.side, 'natureBoost');
  if (nb && nb.natures.includes(jutsu.nature)) dmg *= 1 + nb.value;
  if (def.hp < def.maxHp / 2) dmg *= 1 + auraVal(state, att.side, 'execute');
  if (ctx.focus) dmg *= 1 + auraVal(state, att.side, 'focus');
  if (traitOf(att) === 'suppression' && def.transform) dmg *= 1.3;
  if (ctx.aoe) dmg *= 1 + auraVal(state, att.side, 'aoeBoost');
  if (ctx.aoe && jutsu.nature === 'wind' && traitOf(att) === 'galeMastery') dmg *= 1.15;
  if (traitOf(def) === 'deadBone' && jutsu.category === 'taijutsu') dmg *= 0.9;
  // defender-side reductions
  dmg *= 1 - Math.min(0.6, auraVal(state, def.side, 'dr'));
  if (ctx.aoe) dmg *= 1 - Math.min(0.6, auraVal(state, def.side, 'aoeDR'));
  if (def.hp < def.maxHp / 4) dmg *= 1 - Math.min(0.6, auraVal(state, def.side, 'lowHpDR'));
  const pw = auraVal(state, def.side, 'protectWeakest');
  if (pw) {
    const weakest = onField(state, def.side).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (weakest === def) dmg *= 1 - pw;
  }
  const bonus = jutsu.effects.find((e) => e.type === 'bonusVsBound');
  if (bonus && def.statuses.bind) dmg *= bonus.value;
  if (ctx.collab) dmg *= BALANCE.collabMult;
  if (ctx.clashWinner) dmg *= BALANCE.clashWinnerMult;
  if (def.flags.vulnerable) dmg *= BALANCE.vulnerableMult;
  if (def.flags.guarding) dmg *= BALANCE.guardDamageMult;
  const critC = BALANCE.critChance + auraVal(state, att.side, 'crit') + (traitOf(att) === 'silentKilling' && !ctx.aoe ? 0.12 : 0);
  const crit = ctx.noRandom ? false : rng() < critC;
  if (crit) dmg *= BALANCE.critMult;
  if (!ctx.noRandom) dmg *= BALANCE.randomMin + rng() * (1 - BALANCE.randomMin);
  return { damage: Math.max(1, Math.round(dmg)), crit, adv };
}

// msg: text logged AFTER the HP change (so playback snapshots show the new HP), before any KO.
function dealDamage(state, target, amount, source, msg = null, extra = {}) {
  if (target.ko || amount <= 0) return;
  target.hp = Math.max(0, target.hp - amount);
  let survived = false;
  if (target.hp === 0 && target.survives > 0) {
    target.survives -= 1;
    target.hp = Math.max(1, Math.round(target.maxHp * SURVIVE[traitOf(target)][1]));
    survived = true;
  }
  if (msg) log(state, msg, 'damage', target, { amount, src: source?.uid, ...extra });
  target.flags.tookDamage = true;
  target.resolve = Math.min(100, target.resolve + Math.round((amount / target.maxHp) * 100 * BALANCE.resolveFromDamage));
  if (survived) {
    const t = defOf(target).trait;
    log(state, `${t.name}! ${target.name} cheats death and is left at ${target.hp} HP.`, 'special', target, { survive: true });
  }
  if (target.hp === 0) knockOut(state, target, source);
}

function knockOut(state, unit, source) {
  unit.ko = true;
  unit.weaving = null;
  unit.transform = null;
  unit.statuses = {};
  unit.buffs = [];
  unit.decoy = 0;
  log(state, `${unit.name} has been defeated!`, 'ko', unit);
  const lost = unsecuredTotal(unit);
  if (lost) log(state, `${unit.name}'s ${lost} unsecured Intel was lost.`, 'intel', unit);
  unit.unsecured = [];
  state.teams[other(unit.side)].kos += 1;
  for (const ally of onField(state, unit.side)) ally.resolve = Math.min(100, ally.resolve + BALANCE.resolveAllyKO);
  if (source && source.side !== unit.side && !source.ko) awardIntel(state, source, BALANCE.intelKO, 'interrogation');
}

function heal(state, unit, pct, healer) {
  if (unit.ko) return 0;
  let p = pct;
  if (healer && (traitOf(healer) === 'chakraControl' || traitOf(healer) === 'medicalSpy')) p *= 1.25;
  const amt = Math.min(unit.maxHp - unit.hp, Math.round(unit.maxHp * p));
  unit.hp += amt;
  return amt;
}

const NEGATIVE = ['burn', 'poison', 'paralyze', 'bind', 'genjutsu'];

function applyStatus(state, unit, name, turns) {
  // a status applied after the unit already acted this turn should still
  // matter next turn
  const t = turns + (unit.flags.acted ? 1 : 0);
  const cur = unit.statuses[name];
  unit.statuses[name] = { turns: Math.max(cur?.turns || 0, t) };
}

// ---------------------------------------------------------------------------
// Target resolution
// ---------------------------------------------------------------------------
function resolveTargets(state, actor, jutsu, target) {
  const rng = state.rng;
  switch (jutsu.target) {
    case 'self': return [actor];
    case 'allAllies': return onField(state, actor.side);
    case 'allEnemies': return onField(state, other(actor.side));
    case 'ally': {
      const uid = target ? state.teams[actor.side].slots[target.slot] : null;
      const u = uid && state.units[uid];
      return [u && !u.ko ? u : actor];
    }
    case 'enemy':
    default: {
      const enemies = onField(state, other(actor.side));
      if (!enemies.length) return [];
      if (actor.transform && defOf(actor).transformation?.berserk && rng() < defOf(actor).transformation.berserk) {
        const t = rng.pick(enemies);
        log(state, `${actor.name} loses control and lashes out at ${t.name}!`, 'warn', actor);
        return [t];
      }
      const uid = target ? state.teams[other(actor.side)].slots[target.slot] : null;
      const u = uid && state.units[uid];
      return [u && !u.ko ? u : rng.pick(enemies)];
    }
  }
}

// ---------------------------------------------------------------------------
// Executing a jutsu
// ---------------------------------------------------------------------------
function performJutsu(state, actor, jutsu, target, ctx = {}) {
  const rng = state.rng;
  if (jutsu.effects.some((e) => e.type === 'revive')) return performRevive(state, actor, jutsu, target);
  let targets = resolveTargets(state, actor, jutsu, target);
  // Haku: a bodyguard takes single-target hits aimed at the ally they protect
  if (jutsu.target === 'enemy' && targets[0]?.flags.guardedBy) {
    const g = state.units[targets[0].flags.guardedBy];
    targets[0].flags.guardedBy = null;
    if (g && !g.ko && g.side === targets[0].side) {
      log(state, `${g.name} leaps in front of ${targets[0].name}!`, 'special', g, { bodyguard: targets[0].uid });
      targets = [g];
    }
  }
  if (!targets.length) { log(state, `${actor.name}'s ${jutsu.name} has no target.`, 'info', actor); return; }
  const aoe = jutsu.target === 'allEnemies';
  const offensive = jutsu.target === 'enemy' || aoe;
  log(state, `${actor.name} uses ${jutsu.name}!${ctx.collabNote || ''}`, 'action', actor, { jutsu: jutsu.id, targets: targets.map((t) => t.uid), collab: !!ctx.collab });
  if (!isKunai(jutsu)) revealJutsu(state, actor, jutsu.id, offensive ? targets[0] : null);

  for (const tgt of targets) {
    if (tgt.ko) continue;
    const enemy = tgt.side !== actor.side;

    if (enemy && jutsu.category === 'genjutsu') {
      performGenjutsu(state, actor, tgt, jutsu);
      continue;
    }

    let damageMult = 1;
    if (enemy && tgt.flags.rotation) {
      log(state, `${tgt.name}'s Palm Rotation deflects ${jutsu.name}!`, 'sub', tgt, { negated: true, rotation: true });
      continue;
    }
    if (enemy) {
      const blockable = !jutsu.ignoresSub;
      // Substitution
      if (blockable && tgt.flags.subUp) {
        const type = tgt.flags.subUp;
        tgt.flags.subUp = null;
        if (aoe) {
          damageMult = BALANCE.aoeSubMult;
          log(state, `${tgt.name}'s substitution softens the area attack (half damage).`, 'sub', tgt);
          puppetPoison(state, tgt, actor);
        } else if (type === 'log' && seesLog(actor)) {
          log(state, `${actor.name} sees through ${tgt.name}'s Log Substitution!`, 'sub', actor);
        } else {
          log(state, `${tgt.name} was replaced by a ${type === 'log' ? 'log' : 'clone'}! ${jutsu.name} is negated.`, 'sub', tgt, { negated: true });
          onSubstitution(state, tgt, actor, type);
          puppetPoison(state, tgt, actor);
          continue;
        }
      } else if (blockable && !aoe && tgt.decoy > 0 && !hasFlag(actor, 'seesDecoy')) {
        tgt.decoy = 0;
        log(state, `${tgt.name}'s decoy clone absorbs the hit and pops!`, 'sub', tgt, { negated: true, decoy: true });
        puppetPoison(state, tgt, actor);
        continue;
      }
      // dodge (single-target attacks only)
      if (!aoe && jutsu.power > 0) {
        const dodge = Math.min(BALANCE.maxDodge, Math.max(0, (stat(state, tgt, 'spd') - stat(state, actor, 'spd')) / 500)) + auraVal(state, tgt.side, 'dodge')
          + (traitOf(tgt) === 'iceMirrors' ? 0.1 : 0);
        if (rng() < dodge) { log(state, `${tgt.name} dodges!`, 'info', tgt, { dodge: true }); continue; }
      }
    }

    // damage
    if (jutsu.power > 0 && enemy) {
      let collab = !!ctx.collab;
      // Asuma: his own Wind hit sets up his Fire jutsu (this turn or last)
      if (traitOf(actor) === 'chakraBlades' && jutsu.nature === 'fire' && actor.lastWind?.uid === tgt.uid && state.turn - actor.lastWind.turn <= 1) collab = true;
      const hitBy = (state._hitBy[tgt.uid] ||= []);
      const focus = hitBy.some((uid) => uid !== actor.uid && state.units[uid].side === actor.side);
      let { damage, crit, adv } = computeDamage(state, actor, tgt, jutsu, { collab, clashWinner: ctx.clashWinner, aoe, focus });
      damage = Math.round(damage * damageMult);
      if (traitOf(tgt) === 'sandShield' && !aoe && !tgt.flags.shieldUsed) {
        tgt.flags.shieldUsed = true;
        damage = Math.round(damage / 2);
        log(state, `Gaara's sand rises to block — damage halved.`, 'sub', tgt);
      }
      const notes = [];
      if (crit) notes.push('critical');
      if (adv > 1) notes.push('super effective');
      if (adv < 1) notes.push('resisted');
      if (adv > 1) actor.resolve = Math.min(100, actor.resolve + BALANCE.resolveSuperEffective);
      dealDamage(state, tgt, damage, actor, `${tgt.name} takes ${damage} damage${notes.length ? ` (${notes.join(', ')})` : ''}.`, { crit, adv, hit: true, jutsu: jutsu.id });
      if (jutsu.nature) {
        (state._hits[tgt.uid] ||= []).push({ nature: jutsu.nature, side: actor.side });
      }
      hitBy.push(actor.uid);
      if (traitOf(actor) === 'chakraBlades' && jutsu.nature === 'wind') actor.lastWind = { uid: tgt.uid, turn: state.turn };
      // Kiba: Akamaru follows up on taijutsu
      if (traitOf(actor) === 'akamaru' && jutsu.category === 'taijutsu' && !isKunai(jutsu) && !tgt.ko && !actor.ko) {
        const extra = Math.max(1, Math.round(damage * 0.3));
        dealDamage(state, tgt, extra, actor, `Akamaru follows up — ${tgt.name} takes ${extra} more damage.`, { hit: true });
      }
      // Kidomaru: six arms throw twice
      if (traitOf(actor) === 'sixArms' && isKunai(jutsu) && !tgt.ko && !actor.ko) {
        dealDamage(state, tgt, damage, actor, `A second volley from the other arms — ${tgt.name} takes ${damage} more damage.`, { hit: true });
      }
      // Sakon and Ukon: the twin strikes again
      if (traitOf(actor) === 'twinDemons' && jutsu.category === 'taijutsu' && !isKunai(jutsu) && !tgt.ko && !actor.ko) {
        const extra = Math.max(1, Math.round(damage * 0.35));
        dealDamage(state, tgt, extra, actor, `Ukon strikes too — ${tgt.name} takes ${extra} more damage.`, { hit: true });
      }
      // poison on hit (Anko's trait, Kankuro's support passive)
      if (!tgt.ko && !tgt.statuses.poison) {
        const pc = auraVal(state, actor.side, 'poisonChance') + (traitOf(actor) === 'snakeMistress' ? 0.25 : 0);
        if (pc && rng() < pc) inflictPoison(state, tgt, 3);
      }
      // Shino: chakra-eating insects on every hit
      if (traitOf(actor) === 'kikaichu' && !tgt.ko && traitOf(tgt) !== 'kikaichu') {
        const amt = Math.round(tgt.maxChakra * 0.06);
        tgt.chakra = Math.max(0, tgt.chakra - amt);
        log(state, `Kikaichu drain ${amt} Chakra from ${tgt.name}.`, 'status', tgt, { minor: true });
      }
      // Copy Ninja
      if (!tgt.ko && hasFlag(tgt, 'copy') && !tgt.copied && !isKunai(jutsu) && !jutsu.requiresTransform) {
        tgt.copied = jutsu.id;
        log(state, `${tgt.name} copies ${jutsu.name} with his Sharingan!`, 'special', tgt, { copy: jutsu.id });
      }
    }

    // effects
    if (!tgt.ko) for (const eff of jutsu.effects) applyEffect(state, actor, tgt, eff, jutsu);
  }

  // self effects that apply once
  for (const eff of jutsu.effects) {
    if (eff.type === 'recoil' && !actor.ko) {
      const r = Math.round(actor.maxHp * eff.value);
      dealDamage(state, actor, r, null, `${actor.name} takes ${r} recoil.`);
    }
    if (eff.type === 'intel' && jutsu.target !== 'enemy') awardIntel(state, actor, eff.value, jutsu.name);
    if (eff.type === 'selfVulnerable') actor.flags.vulnerable = true;
  }
}

function performGenjutsu(state, actor, tgt, jutsu) {
  const rng = state.rng;
  let caster = actor;
  let victim = tgt;
  if (hasFlag(tgt, 'reflect') && rng() < 0.25) {
    log(state, `${tgt.name}'s Sharingan reflects the genjutsu back at ${actor.name}!`, 'special', tgt);
    caster = tgt; victim = actor;
  }
  if (hasFlag(victim, 'genjutsuImmune')) { log(state, `${victim.name} is immune to genjutsu!`, 'info', victim); return; }
  let chance = 0.6 + (stat(state, caster, 'nin') - stat(state, victim, 'chk')) / 150;
  if (traitOf(caster) === 'yamanaka' || traitOf(caster) === 'genjutsuMistress') chance += 0.15;
  chance += auraVal(state, caster.side, 'controlChance');
  chance = Math.min(0.95, Math.max(0.25, chance));
  if (rng() >= chance) { log(state, `${victim.name} resists the genjutsu.`, 'info', victim); return; }
  const shrug = auraVal(state, victim.side, 'genjutsuResist') + (traitOf(victim) === 'genjutsuTalent' ? 0.5 : 0);
  if (shrug && rng() < shrug) { log(state, `${victim.name} sees through the illusion and shrugs it off!`, 'info', victim); return; }
  log(state, `${victim.name} is caught in ${jutsu.name}!`, 'status', victim, { status: 'genjutsu' });
  if (caster === actor && traitOf(caster) === 'demonFlute' && rng() < 0.3) {
    applyStatus(state, victim, 'paralyze', 2);
    log(state, `The flute's melody Paralyzes ${victim.name}!`, 'status', victim, { status: 'paralyze' });
  }
  if (jutsu.power) {
    const { damage, crit } = computeDamage(state, caster, victim, jutsu, {});
    dealDamage(state, victim, damage, caster, `${victim.name} takes ${damage} damage${crit ? ' (critical)' : ''}.`, { crit, hit: true, jutsu: jutsu.id });
    if (victim.ko) return;
  }
  for (const eff of jutsu.effects) {
    if (eff.type === 'intel') continue; // handled below for caster
    applyEffect(state, caster, victim, eff, jutsu);
  }
  if (caster === actor) {
    const intelEff = jutsu.effects.find((e) => e.type === 'intel');
    let amt = BALANCE.intelGenjutsu + (intelEff?.value || 0);
    if (traitOf(actor) === 'yamanaka') amt += 3;
    awardIntel(state, actor, amt, 'genjutsu');
  }
}

function applyEffect(state, actor, tgt, eff, jutsu) {
  const rng = state.rng;
  const roll = (p) => (p === undefined ? true : rng() < p);
  const ctl = (p) => (p === undefined ? undefined : Math.min(1, p + auraVal(state, actor.side, 'controlChance')));
  switch (eff.type) {
    case 'burn':
      if (tgt.side !== actor.side && roll(eff.chance)) { applyStatus(state, tgt, 'burn', eff.turns + (hasFlag(actor, 'burnExtra') ? 1 : 0)); log(state, `${tgt.name} is Burned!`, 'status', tgt, { status: 'burn' }); }
      break;
    case 'poison':
      if (tgt.side !== actor.side && roll(eff.chance)) inflictPoison(state, tgt, eff.turns);
      break;
    case 'bodyguard':
      if (tgt === actor) { log(state, `${actor.name} has no one to protect.`, 'info', actor); break; }
      tgt.flags.guardedBy = actor.uid;
      log(state, `${actor.name} stands ready to shield ${tgt.name}.`, 'special', actor);
      break;
    case 'paralyze':
      if (tgt.side !== actor.side && roll(ctl(eff.chance))) { applyStatus(state, tgt, 'paralyze', eff.turns); log(state, `${tgt.name} is Paralyzed!`, 'status', tgt, { status: 'paralyze' }); }
      break;
    case 'bind':
      if (tgt.side !== actor.side && roll(ctl(eff.chance))) {
        const turns = eff.turns + (traitOf(actor) === 'strategist' ? 1 : 0);
        applyStatus(state, tgt, 'bind', turns);
        if (tgt.weaving) { tgt.weaving = null; log(state, `${tgt.name}'s jutsu is interrupted!`, 'status', tgt); }
        log(state, `${tgt.name} is Bound!`, 'status', tgt, { status: 'bind' });
        if (traitOf(actor) === 'suppression' && tgt.transform) {
          endTransform(state, tgt, `${actor.name} suppresses ${tgt.name}'s transformation!`);
        }
      }
      break;
    case 'genjutsu':
      applyStatus(state, tgt, 'genjutsu', eff.turns + (traitOf(actor) === 'genjutsuMistress' ? 1 : 0));
      break;
    case 'restoreChakra': {
      const amt = Math.min(tgt.maxChakra - tgt.chakra, Math.round(tgt.maxChakra * eff.value));
      tgt.chakra += amt;
      log(state, `${tgt.name} restores ${amt} Chakra.`, 'heal', tgt, { amount: amt, chakra: true });
      break;
    }
    case 'rotation': {
      tgt.flags.usedSub = true;
      const p = BALANCE.subChain[Math.min(tgt.subStreak, BALANCE.subChain.length - 1)];
      if (rng() < p) { tgt.flags.rotation = true; log(state, `${tgt.name} spins into the Palm Rotation!`, 'sub', tgt); }
      else log(state, `${tgt.name}'s Palm Rotation is too slow (used too often)!`, 'sub', tgt);
      break;
    }
    case 'flinch':
      if (tgt.side !== actor.side && !tgt.flags.acted && roll(eff.chance)) {
        tgt.flags.flinched = true;
        log(state, `${tgt.name} flinches!`, 'status', tgt);
      }
      break;
    case 'decoy':
      tgt.decoy = 2;
      log(state, `${tgt.name} has a decoy clone ready.`, 'sub', tgt);
      break;
    case 'heal': {
      const amt = heal(state, tgt, eff.value, actor);
      log(state, `${tgt.name} recovers ${amt} HP.`, 'heal', tgt, { amount: amt });
      break;
    }
    case 'cleanse':
      for (const n of NEGATIVE) delete tgt.statuses[n];
      tgt.buffs = tgt.buffs.filter((b) => b.mult >= 1);
      log(state, `${tgt.name}'s ailments are cleansed.`, 'heal', tgt);
      break;
    case 'buff':
      tgt.buffs.push({ stat: eff.stat, mult: eff.mult, turns: eff.turns + (tgt.flags.acted ? 1 : 0) });
      log(state, `${tgt.name}'s ${eff.stat.toUpperCase()} rises.`, 'status', tgt);
      break;
    case 'debuff':
      if (roll(eff.chance)) {
        tgt.buffs.push({ stat: eff.stat, mult: eff.mult, turns: eff.turns + (tgt.flags.acted ? 1 : 0) });
        log(state, `${tgt.name}'s ${eff.stat.toUpperCase()} falls.`, 'status', tgt);
      }
      break;
    case 'drainChakra': {
      if (traitOf(tgt) === 'kikaichu') { log(state, `${tgt.name}'s insects protect his chakra.`, 'info', tgt); break; }
      const amt = Math.round(tgt.maxChakra * eff.value);
      const lost = Math.min(tgt.chakra, amt);
      tgt.chakra -= lost;
      log(state, `${tgt.name} loses ${amt} Chakra.`, 'status', tgt);
      if (traitOf(actor) === 'chakraEater' && lost > 0 && !actor.ko) {
        const g = Math.min(actor.maxChakra - actor.chakra, lost);
        actor.chakra += g;
        if (g) log(state, `${actor.name} eats the stolen Chakra (+${g}).`, 'heal', actor, { amount: g, chakra: true, minor: true });
      }
      break;
    }
    case 'revealLoadout':
      if (tgt.side !== actor.side) {
        revealLoadout(state, tgt);
        log(state, `${actor.name} reads ${tgt.name}'s full jutsu loadout!`, 'intel', actor);
      }
      break;
    case 'intel':
      if (jutsu.target === 'enemy' && tgt.side !== actor.side) awardIntel(state, actor, eff.value, jutsu.name);
      break;
    default:
      break; // recoil / selfVulnerable / pierce / bonusVsBound handled elsewhere
  }
}

function inflictPoison(state, tgt, turns) {
  applyStatus(state, tgt, 'poison', turns);
  log(state, `${tgt.name} is Poisoned!`, 'status', tgt, { status: 'poison' });
}

// Kankuro / Chiyo: a puppet took the hit, and its blades were poisoned
function puppetPoison(state, unit, attacker) {
  if (traitOf(unit) !== 'puppetMaster' || attacker.ko || attacker.side === unit.side) return;
  log(state, `The puppet's hidden blades nick ${attacker.name}.`, 'sub', unit);
  inflictPoison(state, attacker, 3);
}

// Chiyo: One's Own Life Reincarnation
function performRevive(state, actor, jutsu, target) {
  const team = state.teams[actor.side];
  const eff = jutsu.effects.find((e) => e.type === 'revive');
  let t = target ? state.units[team.slots[target.slot]] : null;
  if (!t || !t.ko) t = team.slots.map((id) => state.units[id]).find((u) => u.ko);
  log(state, `${actor.name} uses ${jutsu.name}!`, 'action', actor, { jutsu: jutsu.id, targets: t ? [t.uid] : [] });
  revealJutsu(state, actor, jutsu.id, null);
  if (!t || actor.reviveUsed) { log(state, `There is no fallen ally to bring back.`, 'info', actor); return; }
  actor.reviveUsed = true;
  t.ko = false;
  t.hp = Math.round(t.maxHp * eff.value);
  t.chakra = Math.round(t.maxChakra * eff.value);
  t.resolve = 0;
  t.statuses = {};
  t.buffs = [];
  t.flags = { acted: true };
  log(state, `${t.name} is brought back to life with ${t.hp} HP!`, 'heal', t, { amount: t.hp, revive: true });
  const cost = Math.floor(actor.hp / 2);
  if (cost) dealDamage(state, actor, cost, null, `${actor.name} gives up ${cost} HP of her own life.`);
}

function onSubstitution(state, unit, attacker, type) {
  if (type === 'shadowClone') {
    unit.decoy = 2;
    log(state, `A Shadow Clone stays behind as a decoy.`, 'sub', unit);
  } else if (type === 'explosiveTag') {
    const d = Math.round(attacker.maxHp * 0.1);
    dealDamage(state, attacker, d, unit, `The log explodes! ${attacker.name} takes ${d} damage.`, { hit: true, boom: true });
  } else if (type === 'waterClone') {
    attacker.buffs.push({ stat: 'spd', mult: 0.75, turns: 2 });
    log(state, `${attacker.name} is soaked and slowed.`, 'status', attacker);
  }
}

// ---------------------------------------------------------------------------
// Turn resolution
// ---------------------------------------------------------------------------
function findClashes(state, entries) {
  const result = {}; // uid -> { opponent, win: bool | null (both cancel) }
  const isClashable = (e) => {
    const jid = e.action.type === 'weaveRelease' ? e.unit.weaving?.jutsuId : e.action.type === 'jutsu' ? e.action.jutsuId : null;
    if (!jid) return null;
    const j = getJutsu(jid);
    if (e.action.type === 'jutsu' && j.charged) return null; // just weaving this turn
    if (j.category !== 'ninjutsu' || !j.power || j.target !== 'enemy') return null;
    const tgt = e.action.type === 'weaveRelease' ? e.unit.weaving.target : e.action.target;
    if (!tgt) return null;
    return { j, targetUid: state.teams[other(e.unit.side)].slots[tgt.slot] };
  };
  for (const a of entries) {
    if (a.unit.side !== 0) continue;
    const ca = isClashable(a);
    if (!ca) continue;
    for (const b of entries) {
      if (b.unit.side !== 1) continue;
      const cb = isClashable(b);
      if (!cb) continue;
      if (ca.targetUid === b.unit.uid && cb.targetUid === a.unit.uid) {
        const advA = advantage(ca.j.nature, cb.j.nature);
        const advB = advantage(cb.j.nature, ca.j.nature);
        let winner = null;
        if (advA > advB) winner = a;
        else if (advB > advA) winner = b;
        else {
          const pa = ca.j.power * stat(state, a.unit, 'nin');
          const pb = cb.j.power * stat(state, b.unit, 'nin');
          if (pa > pb) winner = a; else if (pb > pa) winner = b;
        }
        result[a.unit.uid] = { opponent: b.unit.uid, win: winner === a ? true : winner ? false : null, jutsu: ca.j };
        result[b.unit.uid] = { opponent: a.unit.uid, win: winner === b ? true : winner ? false : null, jutsu: cb.j };
      }
    }
  }
  return result;
}

/**
 * Resolve one full turn.
 * actions: array of { actor: uid, type, jutsuId?, target?: { slot } } for BOTH sides.
 * Units with no action provided just guard... no: they idle.
 */
export function resolveTurn(state, actions, { onLog = null } = {}) {
  if (state.winner !== null) return;
  const rng = state.rng;
  const startLog = state.log.length;
  Object.defineProperty(state, '_onLog', { value: onLog, configurable: true, writable: true, enumerable: false });
  log(state, `— Turn ${state.turn} —`, 'turn');
  state._hits = {};
  state._hitBy = {};

  // reset per-turn flags
  for (const u of Object.values(state.units)) u.flags = {};

  // Naruto (Shippuden) support: clones may stand guard
  for (const side of [0, 1]) {
    const v = auraVal(state, side, 'decoyChance');
    if (!v) continue;
    for (const u of onField(state, side)) {
      if (u.decoy <= 0 && rng() < v) { u.decoy = 1; log(state, `A Shadow Clone stands guard by ${u.name}.`, 'sub', u, { minor: true }); }
    }
  }

  // build entries for units currently on the field
  const entries = [];
  for (const side of [0, 1]) {
    for (const u of onField(state, side)) {
      let action = actions.find((a) => a.actor === u.uid) || { actor: u.uid, type: 'none' };
      if (u.weaving?.kind === 'jutsu') action = { actor: u.uid, type: 'weaveRelease' };
      if (u.statuses.bind && action.type !== 'weaveRelease') action = { actor: u.uid, type: 'none' };
      entries.push({ unit: u, action, priority: actionPriority(state, u, action), spd: stat(state, u, 'spd'), tie: rng() });
    }
  }
  // vulnerability that lasts the whole turn
  for (const e of entries) {
    if (e.action.type === 'charge' || e.unit.weaving) e.unit.flags.vulnerable = true;
    if (e.action.type === 'jutsu' && getJutsu(e.action.jutsuId)?.charged) e.unit.flags.vulnerable = true;
  }
  entries.sort((a, b) => b.priority - a.priority || b.spd - a.spd || a.tie - b.tie);

  const clashes = findClashes(state, entries);
  const cancelled = new Set();

  for (const e of entries) {
    const u = e.unit;
    const a = e.action;
    if (u.ko || slotOf(state, u) === -1) continue;
    if (state.winner !== null) break;
    if (cancelled.has(u.uid)) { u.flags.acted = true; continue; }

    if (a.type === 'none') {
      if (u.statuses.bind) log(state, `${u.name} is Bound and cannot move.`, 'status', u);
      u.flags.acted = true;
      continue;
    }
    if (u.flags.flinched) { log(state, `${u.name} flinched and couldn't act.`, 'status', u); u.flags.acted = true; if (a.type === 'weaveRelease') u.weaving = null; continue; }
    if (u.statuses.bind) { log(state, `${u.name} is Bound and cannot move.`, 'status', u); u.flags.acted = true; if (a.type === 'weaveRelease') u.weaving = null; continue; }
    if (u.statuses.paralyze && rng() < BALANCE.paralyzeFail) {
      log(state, `${u.name} is Paralyzed and can't move!`, 'status', u);
      u.flags.acted = true; if (a.type === 'weaveRelease') { u.weaving = null; log(state, `The jutsu fizzles.`, 'status', u); }
      continue;
    }
    if (u.statuses.genjutsu && a.type !== 'release' && rng() < BALANCE.genjutsuFail) {
      log(state, `${u.name} is lost in genjutsu and does nothing!`, 'status', u);
      u.flags.acted = true; if (a.type === 'weaveRelease') { u.weaving = null; log(state, `The jutsu fizzles.`, 'status', u); }
      continue;
    }

    executeAction(state, u, a, clashes, cancelled, entries);
    u.flags.acted = true;
  }

  endOfTurn(state);
  state._onLog = null;
  return state.log.slice(startLog);
}

function executeAction(state, u, a, clashes, cancelled, entries) {
  const team = state.teams[u.side];
  switch (a.type) {
    case 'substitute': {
      const cost = subCost(state, u);
      if (cost > u.chakra) { log(state, `${u.name} lacks the Chakra to substitute.`, 'info', u); return; }
      u.chakra -= cost;
      u.flags.usedSub = true;
      const p = BALANCE.subChain[Math.min(u.subStreak, BALANCE.subChain.length - 1)];
      if (state.rng() < p) {
        u.flags.subUp = u.substitution;
        log(state, `${u.name} readies a ${SUBSTITUTIONS[u.substitution].name}.`, 'sub', u);
      } else {
        log(state, `${u.name}'s substitution fails (used too often)!`, 'sub', u);
      }
      return;
    }
    case 'guard':
      u.flags.guarding = true;
      log(state, `${u.name} stands guard${isSensor(u) ? ' (sensor)' : ''}.`, 'info', u);
      return;
    case 'release':
      delete u.statuses.genjutsu;
      log(state, `${u.name}: "Release!" The genjutsu shatters.`, 'status', u);
      return;
    case 'transform': {
      const t = defOf(u).transformation;
      if (!t || u.transformUsed || u.transform || u.resolve < tfResolve(state, u)) return;
      u.resolve -= tfResolve(state, u);
      u.transformUsed = true;
      if (t.charged) {
        u.weaving = { kind: 'transform', startedTurn: state.turn };
        u.flags.vulnerable = true;
        log(state, `${u.name} stands still, gathering energy for ${t.name}...`, 'special', u, { weave: 'transform' });
      } else {
        activateTransform(state, u);
      }
      return;
    }
    case 'charge': {
      const amt = Math.min(u.maxChakra - u.chakra, Math.round(u.maxChakra * BALANCE.chargeChakra));
      u.chakra += amt;
      log(state, `${u.name} charges Chakra (+${amt}).`, 'info', u);
      if (traitOf(u) === 'akimichi') {
        const h = heal(state, u, 0.1);
        if (h) log(state, `${u.name} snacks and recovers ${h} HP.`, 'heal', u, { amount: h });
      }
      return;
    }
    case 'gather': {
      if (u.flags.tookDamage) { log(state, `${u.name} was hit and couldn't gather Intel!`, 'intel', u); return; }
      awardIntel(state, u, (isSpecialist(u) ? BALANCE.intelGatherSpecialist : BALANCE.intelGather) + auraVal(state, u.side, 'gatherBonus'), 'reconnaissance');
      return;
    }
    case 'kunai':
    case 'jutsu':
    case 'weaveRelease': {
      let jutsu; let target = a.target;
      if (a.type === 'weaveRelease') {
        jutsu = getJutsu(u.weaving.jutsuId); target = u.weaving.target; u.weaving = null;
      } else {
        jutsu = getJutsu(a.type === 'kunai' ? (traitOf(u) === 'weaponMistress' ? 'kunai_storm' : 'kunai') : a.jutsuId);
        if (!jutsu) return;
        if (a.type === 'jutsu' && !u.loadout.includes(jutsu.id) && u.copied !== jutsu.id) return;
        if (jutsu.requiresTransform && !u.transform) { log(state, `${u.name} can't use ${jutsu.name} right now.`, 'info', u); return; }
        const cost = jutsuCost(state, u, jutsu);
        if (cost > u.chakra) {
          const hp = overexertHpCost(u, cost);
          if (hp >= u.hp) { log(state, `${u.name} doesn't have enough Chakra for ${jutsu.name}.`, 'info', u); return; }
          u.chakra = 0;
          dealDamage(state, u, hp, null, `${u.name} overexerts to force out ${jutsu.name}! (-${hp} HP)`, { overexert: true });
          applyStatus(state, u, 'exhausted', BALANCE.overexertExhaust);
          log(state, `${u.name} is Exhausted.`, 'status', u, { status: 'exhausted' });
        } else {
          u.chakra -= cost;
        }
        if (jutsu.charged) {
          u.weaving = { kind: 'jutsu', jutsuId: jutsu.id, target, startedTurn: state.turn };
          log(state, `${u.name} begins weaving signs for ${jutsu.name}...`, 'special', u, { weave: jutsu.id });
          revealJutsu(state, u, jutsu.id, null);
          return;
        }
      }
      // Jutsu Clash
      const clash = clashes[u.uid];
      const ctx = {};
      if (clash) {
        const opp = state.units[clash.opponent];
        const oppEntry = entries.find((x) => x.unit.uid === opp.uid);
        const oppCanAct = opp && !opp.ko && !opp.flags.acted && !opp.statuses.bind && !opp.flags.flinched && !cancelled.has(opp.uid);
        if (oppCanAct && oppEntry) {
          const oj = clashes[opp.uid].jutsu;
          if (oppEntry.action.type === 'jutsu') opp.chakra = Math.max(0, opp.chakra - jutsuCost(state, opp, oj));
          if (oppEntry.action.type === 'weaveRelease') opp.weaving = null;
          cancelled.add(opp.uid);
          log(state, `JUTSU CLASH! ${jutsu.name} collides with ${oj.name}!`, 'special', u, { clash: [u.uid, opp.uid], jutsu: jutsu.id, jutsu2: oj.id });
          if (clash.win === true) { ctx.clashWinner = true; log(state, `${jutsu.name} overpowers it and breaks through!`, 'special', u); }
          else if (clash.win === false) {
            log(state, `${oj.name} overpowers it and breaks through!`, 'special', opp);
            revealJutsu(state, u, jutsu.id, opp);
            performJutsu(state, opp, oj, { slot: slotOf(state, u) }, { clashWinner: true });
            return;
          } else {
            log(state, `The jutsu cancel each other out!`, 'special', u);
            revealJutsu(state, u, jutsu.id, opp);
            revealJutsu(state, opp, oj.id, u);
            return;
          }
        }
      }
      // Collaboration
      if (jutsu.target === 'enemy' && AMPLIFIED_BY[jutsu.nature]) {
        const tuid = target ? state.teams[other(u.side)].slots[target.slot] : null;
        const hits = (tuid && state._hits[tuid]) || [];
        if (hits.some((h) => h.side === u.side && AMPLIFIED_BY[jutsu.nature].includes(h.nature))) {
          ctx.collab = true;
          ctx.collabNote = ' COLLABORATION — boosted by an ally\'s jutsu!';
        }
      }
      performJutsu(state, u, jutsu, target, ctx);
      return;
    }
    default:
      return;
  }
}

function endTransform(state, u, msg) {
  const t = defOf(u).transformation;
  u.transform = null;
  log(state, msg, 'special', u);
  if (t.drawback === 'exhausted') { u.statuses.exhausted = { turns: 3 }; log(state, `${u.name} is Exhausted.`, 'status', u); }
}

function activateTransform(state, u) {
  const t = defOf(u).transformation;
  u.transform = { turnsLeft: t.turns, since: state.turn };
  if (t.onActivate?.chakraPct) u.chakra = Math.min(u.maxChakra, u.chakra + Math.round(u.maxChakra * t.onActivate.chakraPct));
  log(state, `${u.name} activates ${t.name}!`, 'special', u, { transform: true });
}

function endOfTurn(state) {
  const B = BALANCE;
  for (const u of Object.values(state.units)) {
    if (u.ko || u.uid === state.teams[u.side].supportUid) continue;
    const fielded = slotOf(state, u) !== -1;
    const d = defOf(u);

    // charged transformation completes if undisturbed
    if (u.weaving?.kind === 'transform') {
      if (u.flags.tookDamage) { log(state, `${u.name} was hit — ${d.transformation.name} is disrupted!`, 'warn', u); }
      else activateTransform(state, u);
      u.weaving = null;
    }

    if (u.statuses.burn) {
      const dmg = Math.round(u.maxHp * B.burnDamage);
      dealDamage(state, u, dmg, null, `${u.name} is hurt by its burn (${dmg}).`, { burn: true });
      if (u.ko) continue;
    }
    if (u.statuses.poison) {
      const dmg = Math.round(u.maxHp * B.poisonDamage);
      dealDamage(state, u, dmg, null, `${u.name} is hurt by poison (${dmg}).`, { poison: true });
      if (u.ko) continue;
    }
    const regenPct = hasFlag(u, 'vitality') ? 0.08 : REGEN[traitOf(u)] || 0;
    if (regenPct && u.hp < u.maxHp) {
      const amt = heal(state, u, regenPct);
      if (amt) log(state, `${u.name} regenerates ${amt} HP.`, 'heal', u, { amount: amt, minor: true });
    }
    if (fielded) {
      const h = auraVal(state, u.side, 'heal');
      if (h) heal(state, u, h);
      const r = auraVal(state, u.side, 'resolve');
      if (r) u.resolve = Math.min(100, u.resolve + r);
      const drain = auraVal(state, other(u.side), 'enemyDrain');
      if (drain && traitOf(u) !== 'kikaichu') u.chakra = Math.max(0, u.chakra - Math.round(u.maxChakra * drain));
      const cc = auraVal(state, u.side, 'cleanseChance');
      if (cc && NEGATIVE.some((n) => u.statuses[n]) && state.rng() < cc) {
        for (const n of NEGATIVE) delete u.statuses[n];
        log(state, `${state.units[state.teams[u.side].supportUid].name}'s antidote cleanses ${u.name}.`, 'heal', u);
      }
    }

    // transformation upkeep (not on the turn it was activated)
    if (u.transform && u.transform.since !== state.turn) {
      const t = d.transformation;
      if (t.regenHpPct) heal(state, u, t.regenHpPct);
      if (t.upkeepHpPct) {
        const dmg = Math.round(u.maxHp * t.upkeepHpPct);
        dealDamage(state, u, dmg, null, `${u.name} takes ${dmg} damage from the strain of ${t.name}.`);
        if (u.ko) continue;
      }
      u.transform.turnsLeft -= 1;
      if (u.transform.turnsLeft <= 0) endTransform(state, u, `${u.name}'s ${t.name} wears off.`);
    }

    // chakra
    const regen = B.chakraRegen + (fielded ? auraVal(state, u.side, 'chakra') : 0);
    u.chakra = Math.min(u.maxChakra, u.chakra + Math.round(u.maxChakra * regen));
    if (u.chakra <= 0 && !hasFlag(u, 'noNinjutsu') && fielded) {
      const dmg = Math.round(u.maxHp * B.exhaustionDamage);
      dealDamage(state, u, dmg, null, `${u.name} suffers Chakra Exhaustion (${dmg}).`);
      if (u.ko) continue;
    }

    // statuses & buffs tick (exhausted ticks here too)
    for (const [name, s] of Object.entries(u.statuses)) {
      s.turns -= 1;
      if (s.turns <= 0) {
        delete u.statuses[name];
        if (name === 'genjutsu') log(state, `${u.name} breaks free of the genjutsu.`, 'status', u);
        if (name === 'bind') log(state, `${u.name} is no longer Bound.`, 'status', u);
      }
    }
    u.buffs = u.buffs.filter((b) => (b.turns -= 1) > 0);
    if (u.decoy > 0) u.decoy -= 1;
    u.subStreak = u.flags.usedSub ? u.subStreak + 1 : 0;

    // secure intel gathered last turn or earlier
    const secured = u.unsecured.filter((e) => e.turn < state.turn);
    if (secured.length) {
      const amt = secured.reduce((s, e) => s + e.amount, 0);
      state.teams[u.side].securedIntel += amt;
      u.unsecured = u.unsecured.filter((e) => e.turn >= state.turn);
      log(state, `${u.name} secures ${amt} Intel for the team.`, 'intel', u, { secured: amt });
    }
  }

  for (const side of [0, 1]) {
    const team = state.teams[side];
    const relay = auraVal(state, side, 'intel');
    if (relay) {
      team.securedIntel += relay;
      log(state, `${state.units[team.supportUid].name} relays ${relay} Intel from the rear.`, 'intel', side, { secured: relay, minor: true, relay: true });
    }
    // milestones
    for (const m of MILESTONES) {
      if (team.securedIntel >= m && !team.milestones.includes(m)) {
        team.milestones.push(m);
        applyMilestone(state, side, m);
      }
    }
    // the support's passive grows as the cell falls
    const stage = activeAura(state, side)?.stage || 1;
    if (stage > (team.auraStage || 1)) {
      const sup = state.units[team.supportUid];
      log(state, `${sup.name}'s ${defOf(sup).supportAura.name} grows stronger (stage ${stage})!`, 'special', side, { auraStage: stage });
    }
    team.auraStage = stage;
  }

  checkWin(state);
  if (state.winner === null) state.turn += 1;
}

function applyMilestone(state, side, m) {
  const team = state.teams[side];
  const enemy = state.teams[other(side)];
  log(state, `${team.name} reached ${m} Intel!`, 'milestone', side);
  if (m === 25) {
    const candidates = enemy.slots.map((u) => state.units[u]).filter((u) => !u.ko && !enemy.fullyRevealed.includes(u.uid));
    const pool = candidates.length ? candidates : enemy.slots.map((u) => state.units[u]).filter((u) => !enemy.fullyRevealed.includes(u.uid));
    const t = state.rng.pick(pool);
    if (t) { revealLoadout(state, t); log(state, `Intel report: ${t.name}'s full loadout is exposed.`, 'milestone', side); }
  } else if (m === 50) {
    const pool = enemy.slots.map((u) => state.units[u]).filter((u) => !enemy.fullyRevealed.includes(u.uid));
    const t = state.rng.pick(pool);
    if (t) revealLoadout(state, t);
    enemy.seesChakra = true;
    // (seesChakra on the ENEMY team object means: the other side can see this team's chakra)
    log(state, `Intel report: ${t ? `${t.name}'s loadout is exposed and ` : ''}enemy Chakra is now visible.`, 'milestone', side);
  } else if (m === 75) {
    team.preview = true;
    log(state, `Intel report: ${team.name} now sees one enemy action before choosing each turn.`, 'milestone', side);
  }
}

export function missionScore(state, side) {
  const t = state.teams[side];
  return t.kos * BALANCE.koScore + t.securedIntel;
}

function checkWin(state) {
  const wins = [false, false];
  const reasons = ['', ''];
  for (const side of [0, 1]) {
    const enemyAlive = aliveCount(state, other(side)) > 0;
    if (!enemyAlive) { wins[side] = true; reasons[side] = 'Elimination'; }
    if (state.teams[side].securedIntel >= BALANCE.intelToWin) { wins[side] = true; reasons[side] ||= 'Intel'; }
  }
  const timeUp = state.turn >= state.maxTurns;
  if (!wins[0] && !wins[1] && !timeUp) return;
  if (wins[0] !== wins[1]) {
    const w = wins[0] ? 0 : 1;
    state.winner = w; state.winReason = reasons[w];
  } else {
    const s0 = missionScore(state, 0); const s1 = missionScore(state, 1);
    state.winner = s0 > s1 ? 0 : s1 > s0 ? 1 : 'draw';
    state.winReason = wins[0] ? 'Simultaneous — Mission Score' : 'Time up — Mission Score';
  }
  if (state.winner === 'draw') log(state, `The battle ends in a draw!`, 'system');
  else log(state, `${state.teams[state.winner].name} wins by ${state.winReason}!`, 'system');
}

// ---------------------------------------------------------------------------
// Visibility helpers (hidden information)
// ---------------------------------------------------------------------------
/** Jutsu of `uid` that the viewing side knows about. */
export function knownJutsu(state, viewerSide, uid) {
  const u = state.units[uid];
  if (u.side === viewerSide) return [...u.loadout];
  return [...state.teams[u.side].revealed[uid]];
}

export function canSeeChakra(state, viewerSide, uid) {
  const u = state.units[uid];
  return u.side === viewerSide || state.teams[u.side].seesChakra;
}

/** Support passive description for a stage (1-3), with the value filled in. */
const fmtAura = (e, v) => (PCT_AURAS.has(e.type) ? `${Math.round(v * 100)}%` : `${v}`);
export function auraDesc(aura, stage) {
  return aura.desc.replace(/\{(\d)\}/g, (_, i) => fmtAura(aura.effects[i], aura.effects[i].values[stage - 1]));
}
/** "+10% / 15% / 25%" style summary of every stage. */
export function auraStages(aura) {
  return aura.desc.replace(/\{(\d)\}/g, (_, i) => aura.effects[i].values.map((v) => fmtAura(aura.effects[i], v)).join(' / '));
}
