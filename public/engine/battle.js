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
  chakraScale: 2,         // max Chakra = base chk * chakraScale
  damageScale: 0.42,
  maxTurns: 20,
  intelToWin: 100,
  koScore: 25,            // Mission Score per KO (turn-limit tiebreak)
  chakraRegen: 0.1,
  chargeChakra: 0.35,
  vulnerableMult: 1.25,   // charging / weaving / exposed
  guardDamageMult: 0.75,
  critChance: 1 / 16,
  critMult: 1.5,
  randomMin: 0.85,
  clashWinnerMult: 0.7,
  collabMult: 1.3,
  subChain: [1, 0.5, 0.25], // substitution success on consecutive turns
  aoeSubMult: 0.5,
  exhaustionDamage: 0.1,
  burnDamage: 0.05,
  paralyzeFail: 0.25,
  genjutsuFail: 0.5,
  exhaustedMult: 0.85,
  intelGather: 8,
  intelGatherSpecialist: 15,
  intelKO: 15,
  intelGenjutsu: 5,
  intelReveal: 3,
  resolveFromDamage: 0.7, // resolve gained per 1% max HP lost
  resolveAllyKO: 25,
  resolveSuperEffective: 8,
  maxDodge: 0.12,
};

export const MILESTONES = [25, 50, 75];

// Action priorities
const P_STANCE = 4; // substitute, guard, swap, transform, release, start weaving
const P_KUNAI = 2;
const P_GATHER = -1;
const P_CHARGE = -2;

export const KUNAI = {
  id: 'kunai', name: 'Kunai & Shuriken', category: 'taijutsu', nature: null,
  power: 35, cost: 0, priority: P_KUNAI, target: 'enemy', effects: [],
  desc: 'Free, fast thrown weapons. Good for baiting out Substitutions.',
};

const DOJUTSU_TRAITS = ['sharingan', 'copyNinja'];

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
  const chakraMult = def.trait.id === 'uzumakiVitality' ? 1.3 : 1;
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
    loadout: [...member.loadout],
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
        swapUsed: false,
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
function log(state, text, kind = 'info', side = null) {
  state.log.push({ turn: state.turn, text, kind, side });
}

export const defOf = (unit) => SHINOBI_BY_ID[unit.id];
export const traitOf = (unit) => defOf(unit).trait.id;
const hasDojutsu = (unit) => DOJUTSU_TRAITS.includes(traitOf(unit));
const isSpecialist = (unit) => defOf(unit).roles.some((r) => r === 'Sensor' || r === 'Infiltrator');
const isSensor = (unit) => defOf(unit).roles.includes('Sensor');
const other = (side) => 1 - side;

export function getJutsu(id) {
  return id === 'kunai' ? KUNAI : JUTSU[id];
}

export function onField(state, side) {
  return state.teams[side].slots.map((uid) => (uid ? state.units[uid] : null)).filter((u) => u && !u.ko);
}

export function slotOf(state, unit) {
  return state.teams[unit.side].slots.indexOf(unit.uid);
}

/** Support aura of a team, if its designated support is waiting in reserve. */
export function activeAura(state, side) {
  const team = state.teams[side];
  if (!team.reserve || team.reserve !== team.supportUid) return null;
  const sup = state.units[team.supportUid];
  if (!sup || sup.ko) return null;
  return defOf(sup).supportAura;
}

/** Effective stat including transformation, buffs, exhaustion and aura. */
export function stat(state, unit, key) {
  let v = defOf(unit).stats[key];
  const t = defOf(unit).transformation;
  if (unit.transform && t?.mods?.[key]) v *= t.mods[key];
  for (const b of unit.buffs) if (b.stat === key) v *= b.mult;
  if (unit.statuses.exhausted) v *= BALANCE.exhaustedMult;
  const aura = activeAura(state, unit.side);
  if (aura?.id === 'stat' && aura.stat === key && slotOf(state, unit) !== -1) v *= aura.mult;
  return v;
}

export function jutsuCost(state, unit, jutsu) {
  let c = jutsu.cost;
  if (traitOf(unit) === 'chakraControl') c *= 0.8;
  return Math.round(c);
}

export function subCost(state, unit) {
  let c = SUBSTITUTIONS[unit.substitution].cost * unit.maxChakra;
  const aura = activeAura(state, unit.side);
  if (aura?.id === 'subDiscount') c *= 1 - aura.value;
  return Math.round(c);
}

function actionPriority(state, unit, action) {
  switch (action.type) {
    case 'substitute': case 'guard': case 'swap': case 'transform': case 'release':
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
      if (j.category === 'taijutsu' && traitOf(unit) === 'noNinjutsu') p += 1;
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
    if (cost > u.chakra) disabled = 'Not enough Chakra';
    if (j.requiresTransform && !u.transform) disabled = 'Requires transformation';
    acts.push({ type: 'jutsu', jutsuId: id, label: j.name, cost, targetType: j.target, disabled, copied: id === u.copied });
  }
  acts.push({ type: 'kunai', jutsuId: 'kunai', label: KUNAI.name, cost: 0, targetType: 'enemy' });
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
      disabled: u.resolve < t.resolve ? `Needs ${t.resolve} Resolve` : null,
    });
  }
  const res = team.reserve ? state.units[team.reserve] : null;
  if (!team.swapUsed && res && !res.ko) {
    acts.push({ type: 'swap', label: `Swap with ${res.name}`, targetType: 'none' });
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
  if (traitOf(unit) === 'strategist') amt *= 1.5;
  const f = enemyGuardFactor(state, unit.side);
  amt = Math.round(amt * f);
  if (amt <= 0) {
    log(state, `${unit.name}'s intel was blocked by enemy guards.`, 'intel', unit.side);
    return;
  }
  unit.unsecured.push({ amount: amt, turn: state.turn });
  log(state, `${unit.name} gathered ${amt} Intel${reason ? ` (${reason})` : ''}${f < 1 ? ' — reduced by enemy Guard' : ''}. It secures if they survive next turn.`, 'intel', unit.side);
}

export function unsecuredTotal(unit) {
  return unit.unsecured.reduce((s, e) => s + e.amount, 0);
}

function revealJutsu(state, user, jutsuId, observer) {
  if (jutsuId === 'kunai') return;
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
  const pierce = jutsu.effects.find((e) => e.type === 'pierce')?.value || 0;
  const D = Math.max(1, stat(state, def, 'def') * (1 - pierce));
  let dmg = jutsu.power * (A / D) * BALANCE.damageScale;
  dmg *= affinity(jutsu.nature, defOf(att).natures);
  const adv = advantage(jutsu.nature, defOf(def).natures.primary);
  dmg *= adv;
  if (jutsu.category === 'taijutsu' && traitOf(att) === 'noNinjutsu') dmg *= 1.3;
  const bonus = jutsu.effects.find((e) => e.type === 'bonusVsBound');
  if (bonus && def.statuses.bind) dmg *= bonus.value;
  if (ctx.collab) dmg *= BALANCE.collabMult;
  if (ctx.clashWinner) dmg *= BALANCE.clashWinnerMult;
  if (def.flags.vulnerable) dmg *= BALANCE.vulnerableMult;
  if (def.flags.guarding) dmg *= BALANCE.guardDamageMult;
  const crit = ctx.noRandom ? false : rng() < BALANCE.critChance;
  if (crit) dmg *= BALANCE.critMult;
  if (!ctx.noRandom) dmg *= BALANCE.randomMin + rng() * (1 - BALANCE.randomMin);
  return { damage: Math.max(1, Math.round(dmg)), crit, adv };
}

function dealDamage(state, target, amount, source) {
  if (target.ko || amount <= 0) return;
  target.hp = Math.max(0, target.hp - amount);
  target.flags.tookDamage = true;
  target.resolve = Math.min(100, target.resolve + Math.round((amount / target.maxHp) * 100 * BALANCE.resolveFromDamage));
  if (target.hp === 0) knockOut(state, target, source);
}

function knockOut(state, unit, source) {
  unit.ko = true;
  unit.weaving = null;
  unit.transform = null;
  log(state, `${unit.name} has been defeated!`, 'ko', unit.side);
  const lost = unsecuredTotal(unit);
  if (lost) log(state, `${unit.name}'s ${lost} unsecured Intel was lost.`, 'intel', unit.side);
  unit.unsecured = [];
  state.teams[other(unit.side)].kos += 1;
  for (const ally of onField(state, unit.side)) ally.resolve = Math.min(100, ally.resolve + BALANCE.resolveAllyKO);
  if (source && source.side !== unit.side && !source.ko) awardIntel(state, source, BALANCE.intelKO, 'interrogation');
}

function heal(state, unit, pct, healer) {
  if (unit.ko) return 0;
  let p = pct;
  if (healer && traitOf(healer) === 'chakraControl') p *= 1.25;
  const amt = Math.min(unit.maxHp - unit.hp, Math.round(unit.maxHp * p));
  unit.hp += amt;
  return amt;
}

const NEGATIVE = ['burn', 'paralyze', 'bind', 'genjutsu'];

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
        log(state, `${actor.name} loses control and lashes out at ${t.name}!`, 'warn', actor.side);
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
  const targets = resolveTargets(state, actor, jutsu, target);
  if (!targets.length) { log(state, `${actor.name}'s ${jutsu.name} has no target.`, 'info', actor.side); return; }
  const aoe = jutsu.target === 'allEnemies';
  const offensive = jutsu.target === 'enemy' || aoe;
  log(state, `${actor.name} uses ${jutsu.name}!${ctx.collabNote || ''}`, 'action', actor.side);
  if (jutsu.id !== 'kunai') revealJutsu(state, actor, jutsu.id, offensive ? targets[0] : null);

  for (const tgt of targets) {
    if (tgt.ko) continue;
    const enemy = tgt.side !== actor.side;

    if (enemy && jutsu.category === 'genjutsu') {
      performGenjutsu(state, actor, tgt, jutsu);
      continue;
    }

    let damageMult = 1;
    if (enemy) {
      const blockable = !jutsu.ignoresSub;
      // Substitution
      if (blockable && tgt.flags.subUp) {
        const type = tgt.flags.subUp;
        tgt.flags.subUp = null;
        if (aoe) {
          damageMult = BALANCE.aoeSubMult;
          log(state, `${tgt.name}'s substitution softens the area attack (half damage).`, 'sub', tgt.side);
        } else if (type === 'log' && hasDojutsu(actor)) {
          log(state, `${actor.name}'s Sharingan sees through ${tgt.name}'s Log Substitution!`, 'sub', actor.side);
        } else {
          log(state, `${tgt.name} was replaced by a ${type === 'log' ? 'log' : 'clone'}! ${jutsu.name} is negated.`, 'sub', tgt.side);
          onSubstitution(state, tgt, actor, type);
          continue;
        }
      } else if (blockable && !aoe && tgt.decoy > 0) {
        tgt.decoy = 0;
        log(state, `${tgt.name}'s decoy clone absorbs the hit and pops!`, 'sub', tgt.side);
        continue;
      }
      // dodge (single-target attacks only)
      if (!aoe && jutsu.power > 0) {
        const dodge = Math.min(BALANCE.maxDodge, Math.max(0, (stat(state, tgt, 'spd') - stat(state, actor, 'spd')) / 500));
        if (rng() < dodge) { log(state, `${tgt.name} dodges!`, 'info', tgt.side); continue; }
      }
    }

    // damage
    if (jutsu.power > 0 && enemy) {
      const collab = !!ctx.collab;
      let { damage, crit, adv } = computeDamage(state, actor, tgt, jutsu, { collab, clashWinner: ctx.clashWinner });
      damage = Math.round(damage * damageMult);
      if (traitOf(tgt) === 'sandShield' && !aoe && !tgt.flags.shieldUsed) {
        tgt.flags.shieldUsed = true;
        damage = Math.round(damage / 2);
        log(state, `Gaara's sand rises to block — damage halved.`, 'sub', tgt.side);
      }
      const notes = [];
      if (crit) notes.push('critical');
      if (adv > 1) notes.push('super effective');
      if (adv < 1) notes.push('resisted');
      log(state, `${tgt.name} takes ${damage} damage${notes.length ? ` (${notes.join(', ')})` : ''}.`, 'damage', tgt.side);
      if (adv > 1) actor.resolve = Math.min(100, actor.resolve + BALANCE.resolveSuperEffective);
      dealDamage(state, tgt, damage, actor);
      if (jutsu.nature) {
        (state._hits[tgt.uid] ||= []).push({ nature: jutsu.nature, side: actor.side });
      }
      // Copy Ninja
      if (!tgt.ko && traitOf(tgt) === 'copyNinja' && !tgt.copied && jutsu.id !== 'kunai' && !jutsu.requiresTransform) {
        tgt.copied = jutsu.id;
        log(state, `${tgt.name} copies ${jutsu.name} with his Sharingan!`, 'special', tgt.side);
      }
    }

    // effects
    if (!tgt.ko) for (const eff of jutsu.effects) applyEffect(state, actor, tgt, eff, jutsu);
  }

  // self effects that apply once
  for (const eff of jutsu.effects) {
    if (eff.type === 'recoil' && !actor.ko) {
      const r = Math.round(actor.maxHp * eff.value);
      log(state, `${actor.name} takes ${r} recoil.`, 'damage', actor.side);
      dealDamage(state, actor, r, null);
    }
    if (eff.type === 'intel' && jutsu.target !== 'enemy') awardIntel(state, actor, eff.value, jutsu.name);
    if (eff.type === 'selfVulnerable') actor.flags.vulnerable = true;
  }
}

function performGenjutsu(state, actor, tgt, jutsu) {
  const rng = state.rng;
  let caster = actor;
  let victim = tgt;
  if (traitOf(tgt) === 'sharingan' && rng() < 0.25) {
    log(state, `${tgt.name}'s Sharingan reflects the genjutsu back at ${actor.name}!`, 'special', tgt.side);
    caster = tgt; victim = actor;
  }
  let chance = 0.6 + (stat(state, caster, 'nin') - stat(state, victim, 'chk')) / 150;
  if (traitOf(caster) === 'yamanaka') chance += 0.15;
  chance = Math.min(0.95, Math.max(0.25, chance));
  if (rng() >= chance) { log(state, `${victim.name} resists the genjutsu.`, 'info', victim.side); return; }
  log(state, `${victim.name} is caught in ${jutsu.name}!`, 'status', victim.side);
  for (const eff of jutsu.effects) {
    if (eff.type === 'intel') continue; // handled below for caster
    applyEffect(state, caster, victim, eff, jutsu);
  }
  if (caster === actor) {
    const intelEff = jutsu.effects.find((e) => e.type === 'intel');
    let amt = BALANCE.intelGenjutsu + (intelEff?.value || 0);
    if (traitOf(actor) === 'yamanaka') amt += 5;
    awardIntel(state, actor, amt, 'genjutsu');
  }
}

function applyEffect(state, actor, tgt, eff, jutsu) {
  const rng = state.rng;
  const roll = (p) => (p === undefined ? true : rng() < p);
  switch (eff.type) {
    case 'burn':
      if (tgt.side !== actor.side && roll(eff.chance)) { applyStatus(state, tgt, 'burn', eff.turns); log(state, `${tgt.name} is Burned!`, 'status', tgt.side); }
      break;
    case 'paralyze':
      if (tgt.side !== actor.side && roll(eff.chance)) { applyStatus(state, tgt, 'paralyze', eff.turns); log(state, `${tgt.name} is Paralyzed!`, 'status', tgt.side); }
      break;
    case 'bind':
      if (tgt.side !== actor.side && roll(eff.chance)) {
        const turns = eff.turns + (traitOf(actor) === 'strategist' ? 1 : 0);
        applyStatus(state, tgt, 'bind', turns);
        if (tgt.weaving) { tgt.weaving = null; log(state, `${tgt.name}'s jutsu is interrupted!`, 'status', tgt.side); }
        log(state, `${tgt.name} is Bound!`, 'status', tgt.side);
      }
      break;
    case 'genjutsu':
      applyStatus(state, tgt, 'genjutsu', eff.turns);
      break;
    case 'flinch':
      if (tgt.side !== actor.side && !tgt.flags.acted && roll(eff.chance)) {
        tgt.flags.flinched = true;
        log(state, `${tgt.name} flinches!`, 'status', tgt.side);
      }
      break;
    case 'decoy':
      tgt.decoy = 2;
      log(state, `${tgt.name} has a decoy clone ready.`, 'sub', tgt.side);
      break;
    case 'heal': {
      const amt = heal(state, tgt, eff.value, actor);
      log(state, `${tgt.name} recovers ${amt} HP.`, 'heal', tgt.side);
      break;
    }
    case 'cleanse':
      for (const n of NEGATIVE) delete tgt.statuses[n];
      tgt.buffs = tgt.buffs.filter((b) => b.mult >= 1);
      log(state, `${tgt.name}'s ailments are cleansed.`, 'heal', tgt.side);
      break;
    case 'buff':
      tgt.buffs.push({ stat: eff.stat, mult: eff.mult, turns: eff.turns + (tgt.flags.acted ? 1 : 0) });
      log(state, `${tgt.name}'s ${eff.stat.toUpperCase()} rises.`, 'status', tgt.side);
      break;
    case 'debuff':
      if (roll(eff.chance)) {
        tgt.buffs.push({ stat: eff.stat, mult: eff.mult, turns: eff.turns + (tgt.flags.acted ? 1 : 0) });
        log(state, `${tgt.name}'s ${eff.stat.toUpperCase()} falls.`, 'status', tgt.side);
      }
      break;
    case 'drainChakra': {
      const amt = Math.round(tgt.maxChakra * eff.value);
      tgt.chakra = Math.max(0, tgt.chakra - amt);
      log(state, `${tgt.name} loses ${amt} Chakra.`, 'status', tgt.side);
      break;
    }
    case 'revealLoadout':
      if (tgt.side !== actor.side) {
        revealLoadout(state, tgt);
        log(state, `${actor.name} reads ${tgt.name}'s full jutsu loadout!`, 'intel', actor.side);
      }
      break;
    case 'intel':
      if (jutsu.target === 'enemy' && tgt.side !== actor.side) awardIntel(state, actor, eff.value, jutsu.name);
      break;
    default:
      break; // recoil / selfVulnerable / pierce / bonusVsBound handled elsewhere
  }
}

function onSubstitution(state, unit, attacker, type) {
  if (type === 'shadowClone') {
    unit.decoy = 2;
    log(state, `A Shadow Clone stays behind as a decoy.`, 'sub', unit.side);
  } else if (type === 'explosiveTag') {
    const d = Math.round(attacker.maxHp * 0.1);
    log(state, `The log explodes! ${attacker.name} takes ${d} damage.`, 'damage', attacker.side);
    dealDamage(state, attacker, d, unit);
  } else if (type === 'waterClone') {
    attacker.buffs.push({ stat: 'spd', mult: 0.75, turns: 2 });
    log(state, `${attacker.name} is soaked and slowed.`, 'status', attacker.side);
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
export function resolveTurn(state, actions) {
  if (state.winner !== null) return;
  const rng = state.rng;
  const startLog = state.log.length;
  log(state, `— Turn ${state.turn} —`, 'turn');
  state._hits = {};

  // reset per-turn flags
  for (const u of Object.values(state.units)) u.flags = {};

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
      if (u.statuses.bind) log(state, `${u.name} is Bound and cannot move.`, 'status', u.side);
      u.flags.acted = true;
      continue;
    }
    if (u.flags.flinched) { log(state, `${u.name} flinched and couldn't act.`, 'status', u.side); u.flags.acted = true; if (a.type === 'weaveRelease') u.weaving = null; continue; }
    if (u.statuses.bind) { log(state, `${u.name} is Bound and cannot move.`, 'status', u.side); u.flags.acted = true; if (a.type === 'weaveRelease') u.weaving = null; continue; }
    if (u.statuses.paralyze && rng() < BALANCE.paralyzeFail) {
      log(state, `${u.name} is Paralyzed and can't move!`, 'status', u.side);
      u.flags.acted = true; if (a.type === 'weaveRelease') { u.weaving = null; log(state, `The jutsu fizzles.`, 'status', u.side); }
      continue;
    }
    if (u.statuses.genjutsu && a.type !== 'release' && rng() < BALANCE.genjutsuFail) {
      log(state, `${u.name} is lost in genjutsu and does nothing!`, 'status', u.side);
      u.flags.acted = true; if (a.type === 'weaveRelease') { u.weaving = null; log(state, `The jutsu fizzles.`, 'status', u.side); }
      continue;
    }

    executeAction(state, u, a, clashes, cancelled, entries);
    u.flags.acted = true;
  }

  endOfTurn(state);
  return state.log.slice(startLog);
}

function executeAction(state, u, a, clashes, cancelled, entries) {
  const team = state.teams[u.side];
  switch (a.type) {
    case 'substitute': {
      const cost = subCost(state, u);
      if (cost > u.chakra) { log(state, `${u.name} lacks the Chakra to substitute.`, 'info', u.side); return; }
      u.chakra -= cost;
      u.flags.usedSub = true;
      const p = BALANCE.subChain[Math.min(u.subStreak, BALANCE.subChain.length - 1)];
      if (state.rng() < p) {
        u.flags.subUp = u.substitution;
        log(state, `${u.name} readies a ${SUBSTITUTIONS[u.substitution].name}.`, 'sub', u.side);
      } else {
        log(state, `${u.name}'s substitution fails (used too often)!`, 'sub', u.side);
      }
      return;
    }
    case 'guard':
      u.flags.guarding = true;
      log(state, `${u.name} stands guard${isSensor(u) ? ' (sensor)' : ''}.`, 'info', u.side);
      return;
    case 'release':
      delete u.statuses.genjutsu;
      log(state, `${u.name}: "Release!" The genjutsu shatters.`, 'status', u.side);
      return;
    case 'swap': {
      const resUid = team.reserve;
      const res = resUid && state.units[resUid];
      if (team.swapUsed || !res || res.ko) return;
      const slot = slotOf(state, u);
      team.slots[slot] = resUid;
      team.reserve = u.uid;
      team.swapUsed = true;
      res.flags.acted = true;
      u.weaving = null;
      log(state, `${u.name} swaps out — ${res.name} jumps in!`, 'action', u.side);
      return;
    }
    case 'transform': {
      const t = defOf(u).transformation;
      if (!t || u.transformUsed || u.transform || u.resolve < t.resolve) return;
      u.resolve -= t.resolve;
      u.transformUsed = true;
      if (t.charged) {
        u.weaving = { kind: 'transform', startedTurn: state.turn };
        u.flags.vulnerable = true;
        log(state, `${u.name} stands still, gathering energy for ${t.name}...`, 'special', u.side);
      } else {
        activateTransform(state, u);
      }
      return;
    }
    case 'charge': {
      const amt = Math.min(u.maxChakra - u.chakra, Math.round(u.maxChakra * BALANCE.chargeChakra));
      u.chakra += amt;
      log(state, `${u.name} charges Chakra (+${amt}).`, 'info', u.side);
      return;
    }
    case 'gather': {
      if (u.flags.tookDamage) { log(state, `${u.name} was hit and couldn't gather Intel!`, 'intel', u.side); return; }
      awardIntel(state, u, isSpecialist(u) ? BALANCE.intelGatherSpecialist : BALANCE.intelGather, 'reconnaissance');
      return;
    }
    case 'kunai':
    case 'jutsu':
    case 'weaveRelease': {
      let jutsu; let target = a.target;
      if (a.type === 'weaveRelease') {
        jutsu = getJutsu(u.weaving.jutsuId); target = u.weaving.target; u.weaving = null;
      } else {
        jutsu = getJutsu(a.type === 'kunai' ? 'kunai' : a.jutsuId);
        if (!jutsu) return;
        if (a.type === 'jutsu' && !u.loadout.includes(jutsu.id) && u.copied !== jutsu.id) return;
        if (jutsu.requiresTransform && !u.transform) { log(state, `${u.name} can't use ${jutsu.name} right now.`, 'info', u.side); return; }
        const cost = jutsuCost(state, u, jutsu);
        if (cost > u.chakra) { log(state, `${u.name} doesn't have enough Chakra for ${jutsu.name}.`, 'info', u.side); return; }
        u.chakra -= cost;
        if (jutsu.charged) {
          u.weaving = { kind: 'jutsu', jutsuId: jutsu.id, target, startedTurn: state.turn };
          log(state, `${u.name} begins weaving signs for ${jutsu.name}...`, 'special', u.side);
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
          log(state, `JUTSU CLASH! ${jutsu.name} collides with ${oj.name}!`, 'special', u.side);
          if (clash.win === true) { ctx.clashWinner = true; log(state, `${jutsu.name} overpowers it and breaks through!`, 'special', u.side); }
          else if (clash.win === false) {
            log(state, `${oj.name} overpowers it and breaks through!`, 'special', opp.side);
            revealJutsu(state, u, jutsu.id, opp);
            performJutsu(state, opp, oj, { slot: slotOf(state, u) }, { clashWinner: true });
            return;
          } else {
            log(state, `The jutsu cancel each other out!`, 'special', u.side);
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

function activateTransform(state, u) {
  const t = defOf(u).transformation;
  u.transform = { turnsLeft: t.turns, since: state.turn };
  if (t.onActivate?.chakraPct) u.chakra = Math.min(u.maxChakra, u.chakra + Math.round(u.maxChakra * t.onActivate.chakraPct));
  log(state, `${u.name} activates ${t.name}!`, 'special', u.side);
}

function endOfTurn(state) {
  const B = BALANCE;
  for (const u of Object.values(state.units)) {
    if (u.ko) continue;
    const fielded = slotOf(state, u) !== -1;
    const aura = activeAura(state, u.side);
    const d = defOf(u);

    // charged transformation completes if undisturbed
    if (u.weaving?.kind === 'transform') {
      if (u.flags.tookDamage) { log(state, `${u.name} was hit — ${d.transformation.name} is disrupted!`, 'warn', u.side); }
      else activateTransform(state, u);
      u.weaving = null;
    }

    if (u.statuses.burn) {
      const dmg = Math.round(u.maxHp * B.burnDamage);
      log(state, `${u.name} is hurt by its burn (${dmg}).`, 'damage', u.side);
      dealDamage(state, u, dmg, null);
      if (u.ko) continue;
    }
    if (traitOf(u) === 'uzumakiVitality' && u.hp < u.maxHp) {
      const amt = heal(state, u, 0.06);
      if (amt) log(state, `${u.name} regenerates ${amt} HP.`, 'heal', u.side);
    }
    if (fielded && aura?.id === 'heal') heal(state, u, aura.value);
    if (fielded && aura?.id === 'resolve') u.resolve = Math.min(100, u.resolve + aura.value);

    // transformation upkeep (not on the turn it was activated)
    if (u.transform && u.transform.since !== state.turn) {
      const t = d.transformation;
      if (t.regenHpPct) heal(state, u, t.regenHpPct);
      if (t.upkeepHpPct) {
        const dmg = Math.round(u.maxHp * t.upkeepHpPct);
        dealDamage(state, u, dmg, null);
        if (u.ko) { log(state, `${u.name} collapses from the strain of ${t.name}.`, 'ko', u.side); continue; }
      }
      u.transform.turnsLeft -= 1;
      if (u.transform.turnsLeft <= 0) {
        u.transform = null;
        log(state, `${u.name}'s ${t.name} wears off.`, 'special', u.side);
        if (t.drawback === 'exhausted') { u.statuses.exhausted = { turns: 3 }; log(state, `${u.name} is Exhausted.`, 'status', u.side); }
      }
    }

    // chakra
    const regen = B.chakraRegen + (fielded && aura?.id === 'chakra' ? aura.value : 0);
    u.chakra = Math.min(u.maxChakra, u.chakra + Math.round(u.maxChakra * regen));
    if (u.chakra <= 0 && traitOf(u) !== 'noNinjutsu' && fielded) {
      const dmg = Math.round(u.maxHp * B.exhaustionDamage);
      log(state, `${u.name} suffers Chakra Exhaustion (${dmg}).`, 'damage', u.side);
      dealDamage(state, u, dmg, null);
      if (u.ko) continue;
    }

    // statuses & buffs tick (exhausted ticks here too)
    for (const [name, s] of Object.entries(u.statuses)) {
      s.turns -= 1;
      if (s.turns <= 0) {
        delete u.statuses[name];
        if (name === 'genjutsu') log(state, `${u.name} breaks free of the genjutsu.`, 'status', u.side);
        if (name === 'bind') log(state, `${u.name} is no longer Bound.`, 'status', u.side);
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
      log(state, `${u.name} secures ${amt} Intel for the team.`, 'intel', u.side);
    }
  }

  for (const side of [0, 1]) {
    const team = state.teams[side];
    const aura = activeAura(state, side);
    if (aura?.id === 'intel') {
      team.securedIntel += aura.value;
      log(state, `${state.units[team.supportUid].name} relays ${aura.value} Intel from the rear.`, 'intel', side);
    }
    // milestones
    for (const m of MILESTONES) {
      if (team.securedIntel >= m && !team.milestones.includes(m)) {
        team.milestones.push(m);
        applyMilestone(state, side, m);
      }
    }
    // reinforcements
    for (let i = 0; i < 3; i++) {
      const uid = team.slots[i];
      if (uid && !state.units[uid].ko) continue;
      const res = team.reserve && state.units[team.reserve];
      if (res && !res.ko) {
        team.slots[i] = res.uid;
        team.reserve = null;
        log(state, `${res.name} enters the battle!`, 'action', side);
      } else if (uid) {
        team.slots[i] = null;
      }
    }
  }

  checkWin(state);
  if (state.winner === null) state.turn += 1;
}

function applyMilestone(state, side, m) {
  const team = state.teams[side];
  const enemy = state.teams[other(side)];
  log(state, `${team.name} reached ${m} Intel!`, 'milestone', side);
  if (m === 25) {
    const candidates = enemy.slots.filter(Boolean).map((u) => state.units[u]).filter((u) => !u.ko && !enemy.fullyRevealed.includes(u.uid));
    const pool = candidates.length ? candidates : enemy.uids.map((u) => state.units[u]).filter((u) => !enemy.fullyRevealed.includes(u.uid));
    const t = state.rng.pick(pool);
    if (t) { revealLoadout(state, t); log(state, `Intel report: ${t.name}'s full loadout is exposed.`, 'milestone', side); }
  } else if (m === 50) {
    const sup = state.units[enemy.supportUid];
    revealLoadout(state, sup);
    enemy.seesChakra = true;
    // (seesChakra on the ENEMY team object means: the other side can see this team's chakra)
    log(state, `Intel report: enemy support exposed and enemy Chakra is now visible.`, 'milestone', side);
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
    const enemyAlive = state.teams[other(side)].uids.some((u) => !state.units[u].ko);
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
