// Simple heuristic CPU. Used for "vs CPU" quick tests and the balance sim.
import {
  availableActions, onField, getJutsu, computeDamage, slotOf, defOf, unsecuredTotal,
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
  return actions;
}
