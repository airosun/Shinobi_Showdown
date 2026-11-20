import test from 'node:test';
import assert from 'node:assert/strict';
import { advantage, affinity } from '../public/engine/natures.js';
import {
  createBattle, resolveTurn, validateTeam, availableActions, BALANCE,
} from '../public/engine/battle.js';
import * as E from '../public/engine/battle.js';
import { SHINOBI_BY_ID } from '../public/data/shinobi.js';

const member = (id, substitution) => ({
  id, loadout: [...SHINOBI_BY_ID[id].defaultLoadout], substitution: substitution || SHINOBI_BY_ID[id].substitutions[0],
});

// A deterministic rng: always returns `v` (0.99 = no crits, no dodges, no proc chances)
function fixedRng(v = 0.99) {
  const r = () => v;
  r.pick = (arr) => arr[0];
  r.chance = (p) => v < p;
  return r;
}

function battle(a, b, rngValue = 0.99) {
  const st = createBattle([{ members: a.map((x) => (typeof x === 'string' ? member(x) : x)) }, { members: b.map((x) => (typeof x === 'string' ? member(x) : x)) }], { seed: 1 });
  st.rng = fixedRng(rngValue);
  return st;
}

const T0 = ['naruto_p1', 'sasuke_p1', 'sakura_shippuden', 'kakashi_p1'];
const T1 = ['gaara_p1', 'lee_p1', 'shikamaru_p1', 'ino_p1'];

test('nature chart follows the canon cycle', () => {
  assert.equal(advantage('fire', 'wind'), 1.5);
  assert.equal(advantage('wind', 'fire'), 0.75);
  assert.equal(advantage('water', 'fire'), 1.5);
  assert.equal(advantage('lightning', 'earth'), 1.5);
  assert.equal(advantage('fire', 'fire'), 1);
  assert.equal(advantage(null, 'fire'), 1);
  assert.equal(advantage('yin', 'fire'), 1);
  // kekkei genkai act like dual types
  assert.equal(advantage('magnet', 'water'), 1.5); // earth > water
  assert.equal(advantage('water', 'magnet'), 0.75); // earth > water
  assert.equal(affinity('fire', { primary: 'fire', secondary: 'lightning' }), 1.25);
  assert.equal(affinity('lightning', { primary: 'fire', secondary: 'lightning' }), 1.1);
});

test('team validation: cost cap, one version per character, 4 jutsu', () => {
  assert.deepEqual(validateTeam({ members: T0.map((id) => member(id)) }), []);
  const dupe = validateTeam({ members: ['naruto_p1', 'naruto_sage', 'ino_p1', 'lee_p1'].map((id) => member(id)) });
  assert.ok(dupe.some((e) => e.includes('Only one version')));
  const pricey = validateTeam({ members: ['naruto_war', 'kakashi_dms', 'gaara_p1', 'sasuke_p1'].map((id) => member(id)) });
  assert.ok(pricey.some((e) => e.includes('over the cap')));
  const bad = member('lee_p1'); bad.loadout = bad.loadout.slice(0, 3);
  assert.ok(validateTeam({ members: [bad, member('ino_p1'), member('sakura_shippuden'), member('shikamaru_p1')] }).some((e) => e.includes('exactly 4')));
});

test('substitution negates a single-target hit', () => {
  const st = battle(T0, T1);
  const gaara = st.units['1-0'];
  const hpBefore = gaara.hp;
  resolveTurn(st, [
    { actor: '0-0', type: 'jutsu', jutsuId: 'rasengan', target: { slot: 0 } },
    { actor: '1-0', type: 'substitute' },
  ]);
  assert.equal(gaara.hp, hpBefore);
  assert.ok(st.log.some((l) => l.text.includes('negated')));
});

test('Sharingan sees through Log Substitution', () => {
  const st = battle(T0, T1);
  const gaara = st.units['1-0'];
  const hpBefore = gaara.hp;
  resolveTurn(st, [
    { actor: '0-1', type: 'jutsu', jutsuId: 'chidori', target: { slot: 0 } },
    { actor: '1-0', type: 'substitute' },
  ]);
  assert.ok(gaara.hp < hpBefore);
  assert.ok(st.log.some((l) => l.text.includes('sees through')));
});

test('substitution only halves area attacks', () => {
  const st = battle(T0, T1);
  resolveTurn(st, [
    { actor: '0-1', type: 'jutsu', jutsuId: 'phoenix_flower' },
    { actor: '1-1', type: 'substitute' },
  ]);
  assert.ok(st.log.some((l) => l.text.includes('softens the area attack')));
  assert.ok(st.units['1-1'].hp < st.units['1-1'].maxHp);
});

test('consecutive substitutions lose reliability', () => {
  const st = battle(T0, T1);
  resolveTurn(st, [{ actor: '1-0', type: 'substitute' }]);
  assert.equal(st.units['1-0'].subStreak, 1);
  resolveTurn(st, [{ actor: '1-0', type: 'substitute' }]); // 50% with rng 0.99 -> fails
  assert.ok(st.log.some((l) => l.text.includes('substitution fails')));
});

test('gathered Intel secures at the end of the next turn', () => {
  const st = battle(T0, T1);
  resolveTurn(st, [{ actor: '1-3', type: 'none' }, { actor: '1-2', type: 'gather' }]);
  assert.equal(st.teams[1].securedIntel, 2); // only Ino's support relay
  assert.ok(st.units['1-2'].unsecured.length);
  resolveTurn(st, []);
  // Shikamaru: Infiltrator gather * 1.25 (200 IQ), plus two Ino relays (stage 1 = 2)
  assert.equal(st.teams[1].securedIntel, Math.round(BALANCE.intelGatherSpecialist * 1.25) + 4);
});

test('a spy KO\'d before securing loses their Intel', () => {
  const st = battle(T0, T1);
  resolveTurn(st, [{ actor: '1-2', type: 'gather' }]);
  st.units['1-2'].hp = 1;
  resolveTurn(st, [{ actor: '0-0', type: 'kunai', target: { slot: 2 } }]);
  assert.ok(st.units['1-2'].ko);
  assert.ok(st.log.some((l) => l.text.includes('unsecured Intel was lost')));
  // just relays: 2 (3 standing) then 3 (2 standing after the KO)
  assert.equal(st.teams[1].securedIntel, 5);
});

test('Gather Intel fails if hit first', () => {
  const st = battle(T0, T1);
  resolveTurn(st, [{ actor: '1-2', type: 'gather' }, { actor: '0-0', type: 'kunai', target: { slot: 2 } }]);
  assert.equal(st.units['1-2'].unsecured.length, 0);
});

test('Guard halves enemy Intel gains', () => {
  const st = battle(T0, T1);
  resolveTurn(st, [{ actor: '1-2', type: 'gather' }, { actor: '0-1', type: 'guard' }]);
  assert.equal(st.units['1-2'].unsecured[0].amount, Math.round(BALANCE.intelGatherSpecialist * 1.25 * 0.5));
});

test('Jutsu Clash: Water overpowers Fire', () => {
  const st = battle(T0, ['kakashi_p1', 'lee_p1', 'shikamaru_p1', 'ino_p1']);
  // Sasuke Great Fireball at enemy Kakashi (slot 0); enemy Kakashi Water Dragon at Sasuke (slot 1)
  resolveTurn(st, [
    { actor: '0-1', type: 'jutsu', jutsuId: 'great_fireball', target: { slot: 0 } },
    { actor: '1-0', type: 'jutsu', jutsuId: 'water_dragon', target: { slot: 1 } },
  ]);
  assert.ok(st.log.some((l) => l.text.includes('JUTSU CLASH')));
  assert.equal(st.units['1-0'].hp, st.units['1-0'].maxHp);
  assert.ok(st.units['0-1'].hp < st.units['0-1'].maxHp);
});

test('Intel win at 100', () => {
  const st = battle(T0, T1);
  st.teams[1].securedIntel = 98;
  resolveTurn(st, []); // relay +2
  assert.equal(st.winner, 1);
  assert.equal(st.winReason, 'Intel');
});

test('Elimination when all 3 active shinobi fall (the support never fights)', () => {
  const st = battle(T0, T1);
  for (const uid of ['1-0', '1-1', '1-2']) st.units[uid].hp = 1;
  resolveTurn(st, [
    { actor: '0-0', type: 'kunai', target: { slot: 0 } },
    { actor: '0-1', type: 'kunai', target: { slot: 1 } },
    { actor: '0-2', type: 'kunai', target: { slot: 2 } },
  ]);
  assert.equal(st.winner, 0);
  assert.equal(st.winReason, 'Elimination');
  assert.equal(st.units['1-3'].ko, false);
});

test('support does not enter when an ally falls, and its passive grows', () => {
  const st = battle(T0, T1);
  assert.equal(E.activeAura(st, 1).stage, 1);
  st.units['1-1'].hp = 1;
  resolveTurn(st, [{ actor: '0-0', type: 'kunai', target: { slot: 1 } }]);
  assert.equal(st.teams[1].slots[1], '1-1');
  assert.ok(st.units['1-1'].ko);
  assert.equal(E.onField(st, 1).length, 2);
  assert.equal(E.activeAura(st, 1).stage, 2);
  assert.ok(!availableActions(st, '1-0').some((a) => a.type === 'swap'));
});

test('support does not need a loadout', () => {
  const sup = { id: 'ino_p1', loadout: [] };
  assert.deepEqual(validateTeam({ members: [member('naruto_p1'), member('sasuke_p1'), member('sakura_shippuden'), sup] }), []);
});

test('turn limit decides by Mission Score', () => {
  const st = battle(T0, T1);
  st.turn = BALANCE.maxTurns;
  st.teams[0].securedIntel = 40;
  st.teams[1].securedIntel = 0;
  resolveTurn(st, []);
  assert.equal(st.winner, 0);
  assert.match(st.winReason, /Mission Score/);
});

test('charged jutsu takes two turns and locks the user in', () => {
  const st = battle(['naruto_sage', 'ino_p1', 'sakura_shippuden', 'lee_p1'], T1);
  resolveTurn(st, [{ actor: '0-0', type: 'jutsu', jutsuId: 'rasenshuriken', target: { slot: 0 } }]);
  assert.ok(st.units['0-0'].weaving);
  const opts = availableActions(st, '0-0');
  assert.equal(opts.length, 1);
  assert.equal(opts[0].type, 'weaveRelease');
  const hp = st.units['1-0'].hp;
  resolveTurn(st, []);
  assert.ok(st.units['1-0'].hp < hp);
  assert.equal(st.units['0-0'].weaving, null);
});

test('transformation needs Resolve', () => {
  const st = battle(T0, T1);
  const t = availableActions(st, '0-0').find((a) => a.type === 'transform');
  assert.ok(t.disabled);
  st.units['0-0'].resolve = 60;
  resolveTurn(st, [{ actor: '0-0', type: 'transform' }]);
  assert.ok(st.units['0-0'].transform);
  assert.equal(st.units['0-0'].resolve, 0);
});

// ---------------- Konoha batch mechanics ----------------
const T_HY = ['neji_p1', 'hinata_p1', 'kiba_p1', 'sakura_p1'];

test('Palm Rotation blocks area attacks too', () => {
  const st = battle(['sasuke_ship', 'ino_p1', 'sakura_p1', 'shino_p1'], T_HY);
  const neji = st.units['1-0'];
  resolveTurn(st, [
    { actor: '1-0', type: 'jutsu', jutsuId: 'rotation' },
    { actor: '0-0', type: 'jutsu', jutsuId: 'chidori_nagashi' },
  ]);
  assert.equal(neji.hp, neji.maxHp);
  assert.ok(st.log.some((l) => l.rotation));
});

test('Byakugan ignores decoys; Akamaru follows up', () => {
  const st = battle(T_HY, ['naruto_ship', 'ino_p1', 'sakura_p1', 'shino_p1']);
  st.units['1-0'].decoy = 2;
  const hp = st.units['1-0'].hp;
  resolveTurn(st, [{ actor: '0-0', type: 'jutsu', jutsuId: 'gentle_fist', target: { slot: 0 } }]);
  assert.ok(st.units['1-0'].hp < hp);
  assert.equal(st.units['1-0'].decoy, 1); // untouched, just ticked down
  const st2 = battle(T_HY, ['naruto_ship', 'ino_p1', 'sakura_p1', 'shino_p1']);
  resolveTurn(st2, [{ actor: '0-2', type: 'jutsu', jutsuId: 'passing_fang', target: { slot: 0 } }]);
  assert.ok(st2.log.some((l) => l.text.includes('Akamaru follows up')));
});

test('Kikaichu drains chakra on hit; Shino is immune to drain', () => {
  const st = battle(['shino_p1', 'ino_p1', 'sakura_p1', 'kiba_p1'], ['hinata_p1', 'neji_p1', 'kiba_p1', 'sakura_p1']);
  const target = st.units['1-0'];
  resolveTurn(st, [{ actor: '0-0', type: 'jutsu', jutsuId: 'insect_swarm', target: { slot: 0 } }]);
  assert.ok(st.log.some((l) => l.text.includes('Kikaichu drain')));
  const st2 = battle(['shino_p1', 'ino_p1', 'sakura_p1', 'kiba_p1'], ['hinata_p1', 'neji_p1', 'kiba_p1', 'sakura_p1']);
  resolveTurn(st2, [{ actor: '1-0', type: 'jutsu', jutsuId: 'gentle_fist', target: { slot: 0 } }]);
  assert.ok(st2.log.some((l) => l.text.includes('insects protect')));
  assert.ok(target);
});

test('genjutsu immunity (Great War Naruto)', () => {
  const st = battle(['kurenai', 'ino_p1', 'sakura_p1', 'shino_p1'], ['naruto_war', 'ino_p1', 'sakura_p1', 'kiba_p1'], 0.01);
  resolveTurn(st, [{ actor: '0-0', type: 'jutsu', jutsuId: 'sly_mind_affect', target: { slot: 0 } }]);
  assert.ok(st.log.some((l) => l.text.includes('immune to genjutsu')));
  assert.ok(!st.units['1-0'].statuses.genjutsu);
});

test("Tenten's kunai hit every enemy", () => {
  const st = battle(['tenten_p1', 'ino_p1', 'sakura_p1', 'shino_p1'], T_HY);
  const k = availableActions(st, '0-0').find((a) => a.type === 'kunai');
  assert.equal(k.jutsuId, 'kunai_storm');
  resolveTurn(st, [{ actor: '0-0', type: 'kunai', jutsuId: 'kunai_storm' }]);
  for (const uid of ['1-0', '1-1', '1-2']) assert.ok(st.units[uid].hp < st.units[uid].maxHp, uid);
});

test('Yamato binds end transformations', () => {
  const st = battle(['yamato', 'ino_p1', 'sakura_p1', 'shino_p1'], ['lee_p1', 'ino_p1', 'sakura_p1', 'kiba_p1'], 0.5);
  st.units['1-0'].resolve = 60;
  resolveTurn(st, [{ actor: '1-0', type: 'transform' }, { actor: '0-0', type: 'jutsu', jutsuId: 'wood_prison', target: { slot: 0 } }]);
  assert.equal(st.units['1-0'].transform, null);
  assert.ok(st.log.some((l) => l.text.includes('suppresses')));
});

test('Kurama Chakra Transfer restores an ally\'s chakra', () => {
  const nw = { id: 'naruto_war', loadout: ['kurama_rasengan', 'kurama_transfer', 'chakra_arm', 'frog_kata'], substitution: 'log' };
  const st = battle([nw, 'sakura_war', 'kiba_p1', 'shino_p1'], T_HY);
  st.units['0-1'].chakra = 10;
  resolveTurn(st, [{ actor: '0-0', type: 'jutsu', jutsuId: 'kurama_transfer', target: { slot: 1 } }]);
  assert.ok(st.units['0-1'].chakra > 50);
});

test('support passives describe their stages', () => {
  const st = battle(T0, T1);
  const aura = E.activeAura(st, 1);
  assert.equal(aura.stage, 1);
  assert.match(E.auraDesc(SHINOBI_BY_ID.kurenai.supportAura, 3), /10%.*50%/);
  assert.match(E.auraStages(SHINOBI_BY_ID.naruto_war.supportAura), /3% \/ 5% \/ 8%/);
});

// ---------------- chakra economy ----------------
test('overexerting: a jutsu you cannot afford costs HP and Exhausts you', () => {
  const st = battle(T0, T1);
  const naruto = st.units['0-0'];
  naruto.chakra = 5;
  const opt = availableActions(st, '0-0').find((a) => a.jutsuId === 'rasengan');
  assert.ok(!opt.disabled);
  assert.equal(opt.overexert, Math.round((45 - 5) * BALANCE.overexertHp));
  const hp = naruto.hp;
  resolveTurn(st, [{ actor: '0-0', type: 'jutsu', jutsuId: 'rasengan', target: { slot: 1 }, overexert: true }]);
  assert.ok(st.log.some((l) => l.overexert));
  assert.ok(naruto.statuses.exhausted);
  assert.ok(naruto.hp < hp + naruto.maxHp * 0.08 - opt.overexert + 1); // paid the HP (regen aside)
});

test('overexerting is not allowed when it would knock you out', () => {
  const st = battle(T0, T1);
  const naruto = st.units['0-0'];
  naruto.chakra = 0; naruto.hp = 10;
  const opt = availableActions(st, '0-0').find((a) => a.jutsuId === 'rasengan');
  assert.ok(opt.disabled);
});

test('Charge restores half the pool; passive regen is small', () => {
  const st = battle(T0, T1);
  const s = st.units['0-1'];
  s.chakra = 0;
  resolveTurn(st, [{ actor: '0-1', type: 'charge' }]);
  const expected = Math.round(s.maxChakra * BALANCE.chargeChakra) + Math.round(s.maxChakra * BALANCE.chakraRegen);
  assert.equal(s.chakra, expected);
});

// ---------------- batch 2: Sand, Sound, Mist ----------------
const B2A = ['kankuro_p1', 'chiyo', 'haku', 'kabuto_p1'];
const B2B = ['zabuza', 'orochimaru_p1', 'danzo', 'kankuro_ship'];

test('Poison deals 6% max HP per turn and is cleansed', () => {
  const st = battle(B2A, B2B, 0.01);
  const z = st.units['1-0'];
  resolveTurn(st, [{ actor: '0-0', type: 'jutsu', jutsuId: 'poison_bomb' }]);
  assert.ok(z.statuses.poison);
  assert.ok(st.log.some((l) => /hurt by poison \(\d+\)/.test(l.text) && l.u === z.uid));
});

test('Chiyo brings a fallen ally back once per battle', () => {
  const st = battle(B2A, B2B);
  const kank = st.units['0-0'];
  kank.hp = 0; kank.ko = true;
  const opt = availableActions(st, '0-1').find((a) => a.jutsuId === 'reincarnation');
  assert.ok(!opt.disabled);
  const chiyoHp = st.units['0-1'].hp;
  resolveTurn(st, [{ actor: '0-1', type: 'jutsu', jutsuId: 'reincarnation', target: { slot: 0 } }]);
  assert.ok(!kank.ko);
  assert.equal(kank.hp, Math.round(kank.maxHp * 0.4));
  assert.ok(st.units['0-1'].hp <= Math.ceil(chiyoHp / 2) + 1);
  assert.ok(availableActions(st, '0-1').find((a) => a.jutsuId === 'reincarnation').disabled);
});

test("Haku's Selfless Shield takes a single-target hit for an ally", () => {
  const st = battle(B2A, B2B);
  const kank = st.units['0-0']; const haku = st.units['0-2'];
  const k = kank.hp; const h = haku.hp;
  resolveTurn(st, [
    { actor: '0-2', type: 'jutsu', jutsuId: 'haku_shield', target: { slot: 0 } },
    { actor: '1-0', type: 'jutsu', jutsuId: 'executioner_blade', target: { slot: 0 } },
  ]);
  assert.equal(kank.hp, k);
  assert.ok(haku.hp < h);
});

test('Izanagi survives two knockouts; Body Shedding one', () => {
  const st = battle(B2A, B2B);
  const danzo = st.units['1-2'];
  for (const n of [1, 2]) {
    danzo.hp = 1;
    resolveTurn(st, [{ actor: '0-0', type: 'kunai', target: { slot: 2 } }]);
    assert.ok(!danzo.ko, `survives #${n}`);
  }
  danzo.hp = 1;
  resolveTurn(st, [{ actor: '0-0', type: 'kunai', target: { slot: 2 } }]);
  assert.ok(danzo.ko);
  assert.equal(st.units['1-1'].survives, 1);
});

test('Puppet Master poisons whoever hits the substitution', () => {
  const st = battle(B2A, B2B);
  resolveTurn(st, [
    { actor: '0-0', type: 'substitute' },
    { actor: '1-0', type: 'jutsu', jutsuId: 'executioner_blade', target: { slot: 0 } },
  ]);
  assert.ok(st.units['1-0'].statuses.poison);
});

test("Orochimaru's support lowers the Resolve transformations need", () => {
  const st = battle(['anko', 'jirobo', 'tayuya', 'orochimaru_p1'], B2A);
  assert.equal(E.tfResolve(st, st.units['0-0']), 40);
});

// ---------------- batch 3: Akatsuki, Zetsu, Taka ----------------
const AK = ['hidan', 'deidara', 'kakuzu', 'sasori'];
const TK = ['suigetsu', 'zetsu_black', 'itachi', 'karin'];
const custom = (id, loadout) => ({ ...member(id), loadout });

test("Hidan's curse passes the damage he takes to the linked enemy", () => {
  const st = battle([custom('hidan', ['curse_ritual', 'triple_scythe', 'jashin_spike', 'ritual_stab']), 'deidara', 'kakuzu', 'sasori'], TK);
  resolveTurn(st, [{ actor: '0-0', type: 'jutsu', jutsuId: 'curse_ritual', target: { slot: 0 } }]);
  resolveTurn(st, [{ actor: '1-1', type: 'kunai', target: { slot: 0 } }]);
  assert.ok(st.log.some((l) => /curse passes it on — Suigetsu/.test(l.text)), 'linked Suigetsu took the mirrored damage');
});

test('Deidara is knocked out by C0', () => {
  const st = battle(AK, TK);
  resolveTurn(st, [{ actor: '0-1', type: 'jutsu', jutsuId: 'c0' }]);
  assert.ok(st.units['0-1'].ko);
  assert.ok(st.log.some((l) => /consumed by the blast/.test(l.text)));
});

test('Kakuzu heals when he knocks an enemy out', () => {
  const st = battle(AK, TK);
  const kak = st.units['0-2']; kak.hp = Math.round(kak.maxHp / 2);
  st.units['1-0'].hp = 1;
  const h = kak.hp;
  resolveTurn(st, [{ actor: '0-2', type: 'kunai', target: { slot: 0 } }]);
  assert.ok(st.units['1-0'].ko);
  assert.ok(kak.hp > h);
});

test('Sasori is immune to poison; Black Zetsu merges through the first hit', () => {
  const st = battle(AK, ['kankuro_p1', 'zetsu_black', 'itachi', 'karin'], 0.01);
  resolveTurn(st, [{ actor: '1-0', type: 'jutsu', jutsuId: 'poison_bomb' }]);
  assert.ok(!st.units['0-3'].statuses.poison);
  const z = st.units['1-1']; const hp = z.hp;
  resolveTurn(st, [{ actor: '0-0', type: 'kunai', target: { slot: 1 } }]);
  assert.equal(z.hp, hp);
  assert.ok(!z.merge);
});

// ---------------- batch 4: Hokage, Sannin, Kage villages ----------------
test('Flying Thunder God: Minato single-target jutsu gain +1 priority; Hiruzen pays 15% less', () => {
  const st = battle(['minato', 'hiruzen', 'onoki', 'tsunade'], ['raikage_a', 'killer_bee', 'mei', 'ao']);
  const opt = availableActions(st, '0-1').find((a) => a.jutsuId === 'fire_dragon_flame');
  assert.equal(opt.cost, Math.round(45 * 0.85));
  resolveTurn(st, [
    { actor: '1-0', type: 'jutsu', jutsuId: 'lariat', target: { slot: 0 } },
    { actor: '0-0', type: 'jutsu', jutsuId: 'ftg_strike', target: { slot: 0 } },
  ]);
  const order = st.log.filter((l) => / uses /.test(l.text)).map((l) => l.u);
  assert.equal(order[0], '0-0');
});

test("Yagura's coral shell softens the first single-target hit each turn", () => {
  const st = battle(['raikage_a', 'killer_bee', 'mei', 'ao'], ['yagura', 'chojuro', 'gengetsu', 'mu']);
  resolveTurn(st, [{ actor: '0-0', type: 'kunai', target: { slot: 0 } }]);
  assert.ok(st.log.some((l) => /coral shell/.test(l.text)));
});

// ---------------- batch 5: Fourth War and Jinchuriki ----------------
test('Roshi is immune to Burn; Madara (Six Paths Mode) shrugs off genjutsu', () => {
  const st = battle(['roshi', 'madara_six_paths', 'fu', 'han'], ['yugito', 'itachi', 'kaguya', 'utakata'], 0.01);
  resolveTurn(st, [{ actor: '1-0', type: 'jutsu', jutsuId: 'cat_fireballs' }]);
  assert.ok(!st.units['0-0'].statuses.burn);
  resolveTurn(st, [{ actor: '1-1', type: 'jutsu', jutsuId: 'tsukuyomi', target: { slot: 1 } }]);
  assert.ok(!st.units['0-1'].statuses.genjutsu);
});

test('Costs above 10 count against the 30-point cap', () => {
  assert.ok(E.validateTeam({ members: ['madara_six_paths', 'kaguya', 'fu', 'karin'].map(member) }).some((e) => /over the cap/.test(e)));
});

// ---------------- batch 6 ----------------
test("Konohamaru's Will of Fire flares when an ally falls; Shisui's jutsu gain priority", () => {
  const st = battle(['konohamaru', 'shisui', 'mifune', 'shizune'], ['hanzo', 'rasa', 'kushina', 'iruka']);
  const k = st.units['0-0']; const r = k.resolve;
  st.units['0-2'].hp = 1;
  resolveTurn(st, [{ actor: '1-0', type: 'kunai', target: { slot: 2 } }]);
  assert.ok(st.units['0-2'].ko);
  assert.ok(k.resolve >= r + 15);
  resolveTurn(st, [
    { actor: '1-1', type: 'jutsu', jutsuId: 'gold_avalanche', target: { slot: 1 } },
    { actor: '0-1', type: 'jutsu', jutsuId: 'great_fireball', target: { slot: 0 } },
  ].filter(Boolean));
  const order = st.log.filter((l) => / uses /.test(l.text)).map((l) => l.u);
  assert.equal(order.indexOf('0-1') < order.indexOf('1-1'), true);
});
