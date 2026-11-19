// Shinobi Showdown — local hot-seat / vs CPU client.
import { SHINOBI, SHINOBI_BY_ID, SUBSTITUTIONS, COST_CAP } from './data/shinobi.js';
import { NATURE_LABELS } from './engine/natures.js';
import * as E from './engine/battle.js';
import { chooseActions } from './engine/ai.js';
import { randomTeam } from './engine/teams.js';
import * as FX from './fx.js';

const app = document.getElementById('app');
const tip = document.getElementById('tooltip');
const topinfo = document.getElementById('topinfo');

const S = {
  screen: 'title',          // title | builder | pass | battle
  phase: null,              // select | play | over
  mode: null,               // hotseat | cpu
  names: ['Player 1', 'Player 2'],
  specs: [null, null],
  builder: null,
  battle: null,
  choices: [{}, {}],
  order: [0, 1],
  step: 0,
  side: 0,                  // side choosing orders
  actor: null,
  pending: null,
  preview: null,
  view: null,               // snapshot shown during playback
  logShown: 0,
  speed: Number(localStorage.getItem('ss-speed')) || 1, // duration multiplier: 1 = 1×, 0.5 = 2×, 0.25 = 4×
  skip: false,
  showRules: false,
  sprites: {},
  msg: null,
};

fetch('sprites/manifest.json').then((r) => r.json()).then((m) => {
  S.sprites = m.sprites || {};
  for (const a of Object.values(S.sprites)) for (const f of [a.front, a.transform]) if (f) new Image().src = `sprites/${f}`; // preload
  if (S.screen !== 'title' && !(S.screen === 'battle' && S.phase === 'play')) { render(); if (S.screen === 'battle') syncField(); }
}).catch(() => {});

// ---------------------------------------------------------------- helpers
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => Math.max(0, Math.min(100, (100 * a) / Math.max(1, b)));
const priLabel = (p) => (p >= 4 ? 'Stance' : p > 0 ? `+${p}` : `${p}`);
const TARGET_LABEL = { enemy: '1 enemy', allEnemies: 'All enemies', self: 'Self', ally: '1 ally', allAllies: 'All allies' };
const STATUS_LABEL = { burn: 'BRN', poison: 'PSN', paralyze: 'PAR', bind: 'BND', genjutsu: 'GEN', exhausted: 'EXH' };
const STATUS_NAME = { burn: 'Burned', poison: 'Poisoned', paralyze: 'Paralyzed', bind: 'Bound', genjutsu: 'Genjutsu', exhausted: 'Exhausted' };
const STATUS_COLOR = { burn: '#e4572e', poison: '#9b5de5', paralyze: '#e0c020', bind: '#8a6cc4', genjutsu: '#c77dff' };
const hpColor = (p) => (p > 50 ? '#3ddc84' : p > 20 ? '#ffcc4d' : '#ff5c5c');
const natColor = (n) => (n ? FX.NATURE_COLOR[n] || '#8c93a8' : '#c94a3a');
const natChip = (n) => (n ? `<span class="nat" style="--c:${natColor(n)}">${NATURE_LABELS[n] || n}</span>` : '');
const sideName = (side) => esc(S.names[side]);

function initials(name) {
  const base = name.replace(/\s*\(.*\)/, '').split(/\s+/);
  return (base[0][0] + (base[1] ? base[1][0] : base[0][1] || '')).toUpperCase();
}
const SHORT = { Rock: 'Lee', Might: 'Guy', Sakon: 'Sakon', Zabuza: 'Zabuza' };
/** Short display name: first name, except where people use another (Lee, Guy). */
function shortName(name) {
  const w = name.replace(/\s*\(.*\)/, '').split(' ');
  return SHORT[w[0]] || w[0];
}
function formTag(name) { const m = name.match(/\((.*)\)/); return m ? m[1] : ''; }
function badge(def, cls = '', transformed = false) {
  const c1 = natColor(def.natures.primary);
  const c2 = def.natures.secondary ? natColor(def.natures.secondary) : '#3a2a2a';
  const art = S.sprites[def.id];
  const face = art && ((transformed && art.transformFace) || art.face);
  if (face) return `<div class="badge face ${cls}" style="--c1:${c1};--c2:${c2}"><img src="sprites/${esc(face)}" alt="${esc(def.name)}" loading="lazy"></div>`;
  return `<div class="badge ${cls}" style="--c1:${c1};--c2:${c2}">${initials(def.name)}</div>`;
}
/** Battle art (front view; your side is mirrored). Falls back to the badge. */
function sprite(def, back, transformed = false) {
  const art = S.sprites[def.id];
  if (art && art.front) {
    const src = (transformed && art.transform) || art.front;
    return `<img class="art" src="sprites/${esc(src)}" data-front="sprites/${esc(art.front)}" data-tf="${art.transform ? `sprites/${esc(art.transform)}` : ''}" alt="${esc(def.name)}" ${back ? 'style="transform:scaleX(-1)"' : ''}>`;
  }
  return badge(def);
}

function jutsuTip(j, cost) {
  if (!j) return '';
  const bits = [j.category, j.power ? `Power ${j.power}` : null, `Chakra ${cost ?? j.cost}`, `Priority ${priLabel(j.priority)}`, TARGET_LABEL[j.target], j.charged ? 'Charged (2 turns)' : null].filter(Boolean);
  return `<b>${esc(j.name)}</b> ${natChip(j.nature)}<div class="tip-s">${esc(bits.join(' · '))}</div>${esc(j.desc || '')}`;
}
const tipAttr = (html) => `data-tip="${esc(html)}"`;

// tooltips
document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (!el) { tip.classList.add('hidden'); return; }
  tip.innerHTML = el.dataset.tip;
  tip.classList.remove('hidden');
});
document.addEventListener('mousemove', (e) => {
  if (tip.classList.contains('hidden')) return;
  tip.style.left = `${Math.min(window.innerWidth - tip.offsetWidth - 12, e.clientX + 14)}px`;
  tip.style.top = `${Math.min(window.innerHeight - tip.offsetHeight - 12, e.clientY + 14)}px`;
});

// click dispatcher
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  ACTIONS[el.dataset.act]?.(el.dataset.arg, el, e);
});
app.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el && el.dataset.input === 'search') {
    S.builder.query = el.value;
    const pos = el.selectionStart;
    render();
    const n = document.getElementById('rosterSearch');
    if (n) { n.focus(); n.setSelectionRange(pos, pos); }
  }
});
app.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el) ACTIONS[el.dataset.change]?.(el.value, el, e);
});
document.getElementById('menuBtn').addEventListener('click', () => {
  if (S.screen === 'battle' && S.phase !== 'over' && !confirm('Leave this battle?')) return;
  S.skip = true; S.screen = 'title'; render();
});

function render() {
  tip.classList.add('hidden');
  topinfo.textContent = S.screen === 'battle' && S.battle ? `${S.mode === 'cpu' ? 'Vs CPU' : 'Hot-seat'} · Turn ${Math.min((S.view || S.battle).turn, S.battle.maxTurns)} / ${S.battle.maxTurns}` : '';
  app.innerHTML = SCREENS[S.screen]();
  if (S.screen === 'battle') { const lg = document.getElementById('blog'); if (lg) lg.scrollTop = lg.scrollHeight; }
}

// ---------------------------------------------------------------- screens
const SCREENS = {
  title() {
    return `<div class="title-screen">
      <div class="logo"><span class="b1">SHINOBI</span><br><span class="b2">SHOWDOWN</span></div>
      <div class="tagline">Build a three-man cell plus a support. Wipe out the enemy cell — or steal 100 Intel.</div>
      <div class="row">
        <button class="primary big" data-act="startHotseat">Hot-Seat Battle</button>
        <button class="big" data-act="startCpu">Vs CPU</button>
      </div>
      <div class="row" style="margin-top:14px"><button class="ghost" data-act="toggleRules">${S.showRules ? 'Hide rules' : 'How to play'}</button></div>
      ${S.showRules ? rulesHtml() : ''}
    </div>`;
  },

  builder() {
    const b = S.builder;
    const members = b.members;
    const cost = E.teamCost(members.filter(Boolean));
    const taken = new Set(members.filter(Boolean).map((m) => SHINOBI_BY_ID[m.id].baseId));
    const selMember = members[b.sel];
    const selBase = selMember && SHINOBI_BY_ID[selMember.id].baseId;
    const q = (b.query || '').toLowerCase();
    const roster = SHINOBI.filter((s) => (b.era === 'all' || s.era === b.era) && (!q || s.name.toLowerCase().includes(q) || s.roles.join(' ').toLowerCase().includes(q)));
    return `<div class="row" style="margin-bottom:12px">
        <h3 style="margin:0;font-size:20px">${sideName(b.side)} — build your team</h3>
        <span class="grow"></span>
        <label class="small muted">Name <input type="text" value="${esc(S.names[b.side])}" data-change="rename" maxlength="18"></label>
      </div>
      <div class="builder">
        <div>
          <div class="tabs" style="margin-bottom:10px">
            ${['all', 'Part 1', 'Shippuden'].map((e) => `<button class="tab ${b.era === e ? 'active' : ''}" data-act="era" data-arg="${e}">${e === 'all' ? 'All eras' : e}</button>`).join('')}
            <span class="grow"></span>
            <input type="text" id="rosterSearch" placeholder="Search name or role…" value="${esc(b.query || '')}" data-input="search" style="min-width:200px">
          </div>
          <div class="roster">
            ${roster.map((s) => {
              const isTaken = taken.has(s.baseId) && s.baseId !== selBase;
              return `<button class="rcard" data-act="pick" data-arg="${s.id}" ${isTaken ? 'disabled' : ''}
                  ${tipAttr(`<b>${esc(s.name)}</b> (${s.era})<div class="tip-s">${s.roles.join(' · ')}</div><b>${esc(s.trait.name)}:</b> ${esc(s.trait.desc)}${s.transformation ? `<br><b>${esc(s.transformation.name)}</b> (${s.transformation.resolve} Resolve)` : ''}<br><b>As support — ${esc(s.supportAura.name)}:</b> ${esc(E.auraStages(s.supportAura))}`)}>
                ${badge(s)}
                <div class="meta">
                  <div class="row" style="gap:6px"><span class="nm">${esc(s.name)}</span></div>
                  <div class="chips">${natChip(s.natures.primary)}${natChip(s.natures.secondary)}${!s.natures.primary ? '<span class="nat" style="--c:#8c93a8">Non-elemental</span>' : ''}<span class="chip">${s.era}</span><span class="chip cost">${s.cost}</span></div>
                  <div class="small muted">${s.roles.join(' · ')}</div>
                </div>
              </button>`;
            }).join('')}
          </div>
        </div>
        <div class="card">
          <div class="slots">
            ${members.map((m, i) => `<button class="slot ${i === 3 ? 'support' : ''} ${b.sel === i ? 'sel' : ''}" data-act="selSlot" data-arg="${i}">
              <div class="lbl">${i === 3 ? 'Support' : `Active ${i + 1}`}</div>
              ${m ? `${badge(SHINOBI_BY_ID[m.id], 'sm')}<div class="nm">${esc(SHINOBI_BY_ID[m.id].name)}</div>` : '<div class="muted small">empty</div>'}
            </button>`).join('')}
          </div>
          <div class="row small"><span>Team cost</span><span class="grow"></span><b>${cost} / ${COST_CAP}</b></div>
          <div class="costbar ${cost > COST_CAP ? 'over' : ''}"><i style="width:${pct(cost, COST_CAP)}%"></i></div>
          ${selMember ? memberEditor(selMember, b.sel) : `<div class="muted small">Pick a shinobi from the roster for ${b.sel === 3 ? 'the support slot' : `active slot ${b.sel + 1}`}.</div>`}
          ${b.errors.length ? `<div class="errors">${b.errors.map(esc).join('<br>')}</div>` : ''}
          <div class="row" style="margin-top:12px">
            <button data-act="randomTeam">Random team</button>
            <button class="ghost" data-act="clearTeam">Clear</button>
            <span class="grow"></span>
            <button class="primary" data-act="ready">Ready</button>
          </div>
        </div>
      </div>`;
  },

  pass() {
    return `<div class="pass">
      <div class="muted">Hot-seat — hide the screen from your opponent</div>
      <h1>Pass to ${sideName(S.passTo)}</h1>
      <p class="muted">${esc(S.passNote || '')}</p>
      <button class="primary big" data-act="passContinue">I'm ${sideName(S.passTo)} — continue</button>
    </div>`;
  },

  battle() {
    return `<div class="battle">
      <div>
        <div class="arena" id="arena">${arenaInner()}</div>
        <div class="controls" id="controls">${controlsHtml()}</div>
      </div>
      <aside>
        <div class="card mission" id="mission">${missionHtml()}</div>
        <div class="log" id="blog">${logHtml(S.battle.log.slice(0, S.logShown))}</div>
      </aside>
    </div>`;
  },
};

function rulesHtml() {
  return `<div class="card rules">
    <h3>How to play</h3>
    <ul>
      <li><b>Team:</b> 3 active shinobi + 1 support, ${COST_CAP} cost points max, one version of each character. Each active shinobi brings 4 jutsu.</li>
      <li><b>Support:</b> never enters the battle — it's a 3v3. It gives the team a passive that grows as your cell falls (stage 1 with 3 standing, stage 2 with 2, stage 3 with 1).</li>
      <li><b>Turns:</b> both players pick orders in secret, then actions play out one by one — Stances first, then by priority (+3 … −2), then by SPD. Click the text box to advance; change the speed (1× / 2× / 4×) or skip the turn.</li>
      <li><b>Natures:</b> Fire › Wind › Lightning › Earth › Water › Fire (×1.5 / ×0.75). Jutsu matching your primary nature get ×1.25, secondary ×1.1. Kekkei genkai count as both parent natures.</li>
      <li><b>Jutsu Clash:</b> two ninjutsu aimed at each other collide — the stronger nature breaks through at 70% power.</li>
      <li><b>Collaboration:</b> Wind then Fire (or Water then Lightning) on the same target in one turn = ×1.3.</li>
      <li><b>Substitution:</b> a Stance that negates the first single-target hit. Repeating it lowers the odds (100/50/25%). Area attacks are only halved; Sharingan sees through logs; genjutsu ignores it.</li>
      <li><b>Intel:</b> Gather Intel, land genjutsu, reveal enemy jutsu and score KOs. New Intel is <i>unsecured</i> until the carrier survives the end of the next turn — KO the spy and it's lost. Guard halves enemy Intel gains (sensors quarter it).</li>
      <li><b>Milestones:</b> 25 Intel reveals an enemy loadout, 50 reveals another and makes enemy Chakra visible, 75 lets you see one enemy order before choosing.</li>
      <li><b>Win:</b> KO all 3 enemy shinobi, <i>or</i> secure 100 Intel. After turn 20, the highest Mission Score (25 per KO + Intel) wins.</li>
      <li><b>Chakra</b> is scarce: pools are small and only ~4% comes back each turn. <b>Charge Chakra</b> restores half your pool (but you take +25% damage that turn). Out of Chakra? Throw kunai, Charge, or <b>overexert</b> — force the jutsu out anyway by paying the shortfall in HP and becoming Exhausted. Ending a turn at 0 Chakra also costs HP.</li>
      <li><b>Resolve</b> builds as you take hits or lose allies and powers transformations.</li>
    </ul>
  </div>`;
}

function memberEditor(m, slot) {
  const s = SHINOBI_BY_ID[m.id];
  const max = { hp: 130, tai: 130, nin: 130, def: 130, spd: 130, chk: 150 };
  const sc = (v) => (v >= 110 ? '#3ddc84' : v >= 85 ? '#ffcc4d' : v >= 60 ? '#ff9a3c' : '#ff5c5c');
  return `<div>
    <div class="row">${badge(s)}<div><h3 style="margin:0">${esc(s.name)}</h3><div class="chips" style="margin-top:3px">${natChip(s.natures.primary)}${natChip(s.natures.secondary)}${s.roles.map((r) => `<span class="chip">${r}</span>`).join('')}</div></div><span class="grow"></span><button class="small ghost" data-act="removeMember">Remove</button></div>
    <div class="statgrid">${Object.entries(s.stats).map(([k, v]) => `<span class="muted">${k.toUpperCase()}</span><div class="statbar"><i style="width:${pct(v, max[k])}%;background:${sc(v)}"></i></div><span class="mono">${v}</span>`).join('')}</div>
    <div class="small"><b>${esc(s.trait.name)}:</b> ${esc(s.trait.desc)}</div>
    ${s.transformation ? `<div class="small" style="margin-top:4px"><b>${esc(s.transformation.name)}</b> (${s.transformation.resolve} Resolve): ${esc(s.transformation.desc)}</div>` : '<div class="small muted" style="margin-top:4px">No transformation.</div>'}
    ${slot === 3 ? supportPanel(s) : `<div class="small muted" style="margin-top:4px"><b>As support — ${esc(s.supportAura.name)}:</b> ${esc(E.auraStages(s.supportAura))} <span style="opacity:.7">(3 / 2 / 1 standing)</span></div>`}
    ${slot === 3 ? '' : `<h2 style="margin-top:12px">Jutsu (${m.loadout.length}/4)</h2>`}
    ${slot === 3 ? '' : `<div class="jlist">${s.catalogue.map((id) => {
      const j = E.getJutsu(id);
      const on = m.loadout.includes(id);
      return `<button class="jopt ${on ? 'on' : ''}" style="--c:${FX.jutsuColor(j)}" data-act="toggleJutsu" data-arg="${id}" ${tipAttr(jutsuTip(j))}>
        <span class="box">${on ? '✓' : ''}</span>
        <div><div>${esc(j.name)} ${natChip(j.nature)}</div>
        <div class="jm">${j.category}${j.power ? ` · POW ${j.power}` : ''} · CK ${j.cost} · ${priLabel(j.priority)} · ${TARGET_LABEL[j.target]}${j.charged ? ' · charged' : ''}${j.requiresTransform ? ' · transformed only' : ''}</div></div>
      </button>`;
    }).join('')}</div>
    <h2 style="margin-top:12px">Substitution</h2>
    <div class="jlist">${s.substitutions.map((k) => `<button class="jopt ${m.substitution === k ? 'on' : ''}" style="--c:#c9d0dd" data-act="setSub" data-arg="${k}">
      <span class="box">${m.substitution === k ? '✓' : ''}</span>
      <div><div>${SUBSTITUTIONS[k].name}</div><div class="jm">${Math.round(SUBSTITUTIONS[k].cost * 100)}% max Chakra · ${esc(SUBSTITUTIONS[k].desc)}</div></div></button>`).join('')}</div>`}
  </div>`;
}

function supportPanel(s) {
  const a = s.supportAura;
  return `<div class="support-panel">
    <h2 style="margin:10px 0 6px">Support passive — ${esc(a.name)}</h2>
    <div class="small muted" style="margin-bottom:6px">The support never enters the battle. Its passive grows as your cell falls.</div>
    ${[1, 2, 3].map((n) => `<div class="stage-row"><span class="stg">${'★'.repeat(n)}</span><span class="muted small">${4 - n} standing</span><span>${esc(E.auraDesc(a, n))}</span></div>`).join('')}
  </div>`;
}

// ---------------------------------------------------------------- battlefield
const vsNow = () => S.view || S.battle;
function bottomSide() { return S.phase === 'select' ? S.side : 0; }
function viewer() {
  if (S.phase === 'over') return 'all';
  if (S.phase === 'select') return S.side;
  return S.mode === 'cpu' ? 0 : null; // hot-seat playback is watched by both players
}

function arenaInner() {
  const vs = vsNow();
  const me = bottomSide();
  const sel = selectionTargets();
  return `<div class="plat foe"></div><div class="plat you"></div>
    ${sideMons(vs, 1 - me, true, sel)}${sideMons(vs, me, false, sel)}
    ${sideHud(vs, 1 - me, true, sel)}${sideHud(vs, me, false, sel)}`;
}

function selectionTargets() {
  if (S.phase !== 'select' || !S.pending) return null;
  const j = E.getJutsu(S.pending.jutsuId);
  // Reincarnation targets a fallen ally; everything else a standing one
  return { side: j.target === 'ally' ? S.side : 1 - S.side, fallen: j.effects.some((e) => e.type === 'revive') };
}

function sideMons(vs, side, isFoe, sel) {
  const team = vs.teams[side];
  return team.slots.map((uid, pos) => {
    if (!uid) return '';
    const u = vs.units[uid];
    const d = SHINOBI_BY_ID[u.id];
    const pickable = sel && sel.side === side && (sel.fallen ? u.ko : !u.ko);
    const acting = S.phase === 'select' && S.actor === uid;
    const cls = [isFoe ? 'foe' : 'you', `p${pos}`, u.ko ? 'down' : '', u.transform ? 'transformed' : '', u.weaving ? 'weaving' : '', pickable ? 'pickable' : '', acting ? 'acting' : ''].join(' ');
    const ghost = u.decoy > 0 && !u.ko ? `<div class="ghost">${badge(d)}</div>` : '';
    const form = formTag(d.name);
    return `<div class="mon ${cls}" id="mon-${uid}" ${pickable ? `data-act="target" data-arg="${pos}"` : `data-tip="${esc(unitTip(vs, u))}"`}>
      <div class="spr ${S.sprites[d.id]?.front ? 'has-art' : ''}">${ghost}${sprite(d, !isFoe, !!u.transform)}</div>
      <div class="tag">${esc(shortName(d.name))}${form ? ` · ${esc(form)}` : ''}</div>
      ${pickable ? '<span class="pick-hint">Target</span>' : ''}
    </div>`;
  }).join('');
}

function unitTip(vs, u) {
  const d = SHINOBI_BY_ID[u.id];
  const v = viewer();
  const own = v === 'all' || v === u.side;
  const known = own ? u.loadout : vs.teams[u.side].revealed[u.uid];
  const hidden = own ? 0 : u.loadout.filter((j) => !known.includes(j)).length;
  const list = [...known, ...(u.copied ? [u.copied] : [])].map((j) => esc(E.getJutsu(j).name) + (j === u.copied ? ' (copied)' : '')).join(', ');
  return `<b>${esc(d.name)}</b> ${natChip(d.natures.primary)}${natChip(d.natures.secondary)}<div class="tip-s">${d.roles.join(' · ')} · ${d.era}</div>
    <b>${esc(d.trait.name)}:</b> ${esc(d.trait.desc)}<br>
    ${d.transformation ? `<b>${esc(d.transformation.name)}</b> (${d.transformation.resolve} Resolve${u.transformUsed ? ', used' : ''})<br>` : ''}
    <b>Jutsu:</b> ${list || '—'}${hidden ? ` <i>+${hidden} hidden</i>` : ''}`;
}

function sideHud(vs, side, isFoe, sel) {
  const team = vs.teams[side];
  const pips = team.slots.map((uid) => {
    const u = vs.units[uid];
    return `<span class="pip ${u.ko ? 'fainted' : ''}" title="${esc(u.name)}"></span>`;
  }).join('');
  const sup = vs.units[team.supportUid];
  const aura = SHINOBI_BY_ID[sup.id].supportAura;
  const alive = team.slots.filter((uid) => !vs.units[uid].ko).length;
  const stage = alive >= 3 ? 1 : alive === 2 ? 2 : 3;
  const resChip = `<span class="chip support-chip st${stage}" ${tipAttr(supportTip(sup, stage))}>Support: ${esc(shortName(sup.name))} · ${'★'.repeat(stage)}</span>`;
  const cards = team.slots.map((uid, pos) => (uid ? hpCard(vs, vs.units[uid], sel && sel.side === side && (sel.fallen ? 'fallen' : true), pos) : '<div class="hpcard empty">—</div>')).join('');
  return `<div class="hud ${isFoe ? 'foe' : 'you'}">
    <div class="sidelabel"><span class="who s${side}">${sideName(side)}</span><span class="pips">${pips}</span>${resChip}</div>
    ${cards}
  </div>`;
}

function supportTip(sup, stage) {
  const aura = SHINOBI_BY_ID[sup.id].supportAura;
  const lines = [1, 2, 3].map((n) => `<div style="${n === stage ? 'color:#ffc83d;font-weight:700' : 'opacity:.6'}">${n === stage ? '▶ ' : ''}Stage ${n} (${4 - n} standing): ${esc(E.auraDesc(aura, n))}</div>`).join('');
  return `<b>${esc(sup.name)}</b> — support (never enters battle)<div class="tip-s">${esc(aura.name)}</div>${lines}`;
}

function hpCard(vs, u, pickableSide, pos) {
  const d = SHINOBI_BY_ID[u.id];
  const pickable = pickableSide && (pickableSide === 'fallen' ? u.ko : !u.ko);
  const acting = S.phase === 'select' && S.actor === u.uid;
  return `<div class="hpcard ${u.ko ? 'down' : ''} ${pickable ? 'pickable' : ''} ${acting ? 'acting' : ''}" id="card-${u.uid}" ${pickable ? `data-act="target" data-arg="${pos}"` : `data-tip="${esc(unitTip(vs, u))}"`}>
    <div class="nm"><span>${esc(d.name)}</span>${natChip(d.natures.primary)}<span class="grow"></span><span class="hptext"></span></div>
    <div class="bars">
      <div class="bar hp"><i></i></div>
      <div class="bar thin ck"><i></i></div>
      <div class="bar thin rs"><i></i></div>
    </div>
    <div class="hprow"><span class="sts"></span><span class="chips"></span></div>
  </div>`;
}

function statusHtml(u) {
  return Object.keys(u.statuses).map((k) => `<span class="st st-${k}" title="${STATUS_NAME[k]}">${STATUS_LABEL[k] || k}</span>`).join(' ');
}

function cardChips(vs, u) {
  const d = SHINOBI_BY_ID[u.id];
  const c = [];
  if (u.transform) c.push(`<span class="chip up" ${tipAttr(esc(d.transformation.desc))}>${esc(d.transformation.name.split(' (')[0])} ${u.transform.turnsLeft}</span>`);
  if (u.weaving) c.push(`<span class="chip">${u.weaving.kind === 'jutsu' ? 'Weaving' : 'Gathering'}</span>`);
  if (u.decoy > 0) c.push('<span class="chip up">Decoy</span>');
  for (const b of u.buffs) c.push(`<span class="chip ${b.mult >= 1 ? 'up' : 'down'}">${b.stat.toUpperCase()}${b.mult >= 1 ? '▲' : '▼'}</span>`);
  if (u.subStreak) c.push(`<span class="chip" ${tipAttr('Substituted last turn — the next one is less reliable')}>Sub×${u.subStreak}</span>`);
  const uns = E.unsecuredTotal(u);
  if (uns) c.push(`<span class="chip intel" ${tipAttr('Unsecured Intel — secures if this shinobi survives the end of next turn')}>📜${uns}</span>`);
  return c.join('');
}

/** Fill in / update the dynamic parts of every HP card and sprite from a snapshot. */
function syncField() {
  const vs = vsNow();
  const v = viewer();
  for (const u of Object.values(vs.units)) {
    const card = document.getElementById(`card-${u.uid}`);
    if (card) {
      const own = v === 'all' || v === u.side;
      const seeCk = own || vs.teams[u.side].seesChakra;
      const hp = pct(u.hp, u.maxHp);
      const hpI = card.querySelector('.bar.hp > i');
      hpI.style.width = `${hp}%`; hpI.style.background = hpColor(hp);
      const ck = card.querySelector('.bar.ck');
      ck.classList.toggle('hidden-info', !seeCk);
      ck.classList.toggle('low', seeCk && u.chakra < u.maxChakra * 0.25);
      ck.firstElementChild.style.width = seeCk ? `${pct(u.chakra, u.maxChakra)}%` : '100%';
      card.querySelector('.bar.rs > i').style.width = `${u.resolve}%`;
      const t = SHINOBI_BY_ID[u.id].transformation;
      card.querySelector('.hptext').innerHTML = `${own ? `${u.hp}/${u.maxHp}` : `${Math.ceil(hp)}%`} <span style="color:#4fb3ff">${seeCk ? `CK ${u.chakra}` : 'CK ?'}</span> <span style="color:#ffc83d">RS ${u.resolve}${t && !u.transformUsed ? `/${E.tfResolve(vs, u)}` : ''}</span>`;
      card.querySelector('.chips').innerHTML = cardChips(vs, u);
      card.querySelector('.sts').innerHTML = statusHtml(u);
      card.classList.toggle('down', u.ko);
    }
    const mon = document.getElementById(`mon-${u.uid}`);
    if (mon) {
      mon.classList.toggle('down', u.ko);
      mon.classList.toggle('transformed', !!u.transform);
      const art = mon.querySelector('img.art');
      if (art && art.dataset.tf) {
        const want = u.transform ? art.dataset.tf : art.dataset.front;
        if (!art.src.endsWith(want)) art.src = want;
      }
      mon.classList.toggle('weaving', !!u.weaving);
      const hasGhost = !!mon.querySelector('.ghost');
      if (hasGhost !== (u.decoy > 0 && !u.ko)) {
        const spr = mon.querySelector('.spr');
        if (hasGhost) spr.querySelector('.ghost').remove();
        else spr.insertAdjacentHTML('afterbegin', `<div class="ghost">${badge(SHINOBI_BY_ID[u.id])}</div>`);
      }
    }
  }
  const m = document.getElementById('mission');
  if (m) m.innerHTML = missionHtml();
  topinfo.textContent = `${S.mode === 'cpu' ? 'Vs CPU' : 'Hot-seat'} · Turn ${Math.min(vs.turn, S.battle.maxTurns)} / ${S.battle.maxTurns}`;
}

function fieldSignature(vs) {
  return vs.teams.map((t) => `${t.slots.join(',')}|${t.reserve}`).join('/');
}
function redrawArena() {
  const ar = document.getElementById('arena');
  if (!ar) return;
  [...ar.children].forEach((c) => { if (!c.classList.contains('fx')) c.remove(); });
  ar.insertAdjacentHTML('afterbegin', arenaInner());
  syncField();
}

function missionHtml() {
  const vs = vsNow();
  const box = (side) => {
    const t = vs.teams[side];
    const uns = t.uids.reduce((s, uid) => s + (vs.units[uid].ko ? 0 : E.unsecuredTotal(vs.units[uid])), 0);
    return `<div class="team-intel">
      <div class="hdr"><span class="nm s${side}">${sideName(side)}</span><span class="grow"></span><span class="small muted">KOs ${t.kos} · Score ${t.kos * E.BALANCE.koScore + t.securedIntel}</span></div>
      <div class="small">Intel <b>${t.securedIntel}</b>/100 ${uns ? `<span class="muted">(+${uns} unsecured)</span>` : ''}</div>
      <div class="intelbar" ${tipAttr('Secured Intel (solid) and unsecured Intel being carried (striped). Milestones at 25 / 50 / 75; 100 wins.')}>
        <div class="sec" style="width:${pct(t.securedIntel, 100)}%"></div>
        <div class="uns" style="left:${pct(t.securedIntel, 100)}%;width:${pct(uns, 100)}%"></div>
        ${E.MILESTONES.map((m) => `<div class="mark ${t.securedIntel >= m ? 'hit' : ''}" style="left:${m}%"></div>`).join('')}
      </div>
    </div>`;
  };
  return `<div class="row"><h2 style="margin:0">Mission</h2><span class="grow"></span><span class="turn">Turn ${Math.min(vs.turn, S.battle.maxTurns)}<span class="muted" style="font-size:18px"> / ${S.battle.maxTurns}</span></span></div>
    ${box(0)}${box(1)}`;
}

function logHtml(entries) {
  return entries.map((l) => `<div class="l ${l.kind} ${l.side === 0 ? 's0' : l.side === 1 ? 's1' : ''}">${esc(l.text)}</div>`).join('');
}
function appendLog(entry) {
  const lg = document.getElementById('blog');
  if (!lg) return;
  lg.insertAdjacentHTML('beforeend', logHtml([entry]));
  lg.scrollTop = lg.scrollHeight;
}

// ---------------------------------------------------------------- controls
function controlsHtml() {
  if (S.phase === 'play') {
    const e = S.msg;
    return `<div class="textbox ${e && e.side !== null && e.side !== undefined ? `s${e.side}` : ''}" id="textbox" data-act="advance">
      <span id="tbtext">${esc(e ? e.text : '')}</span>
      <div class="tools"><button class="small" data-act="toggleSpeed" title="Animation speed">Speed ${speedLabel()}</button><button class="small" data-act="skipPlayback">Skip turn ⏭</button></div>
      <span class="more">▼</span>
    </div>`;
  }
  if (S.phase === 'over') {
    const st = S.battle;
    const w = st.winner;
    return `<div class="endbanner"><span>${w === 'draw' ? 'Draw!' : `${sideName(w)} wins!`} <span class="muted small">${esc(st.winReason || '')} · Mission Score ${E.missionScore(st, 0)} – ${E.missionScore(st, 1)}</span></span>
      <div class="row"><button class="primary" data-act="rematch">Rematch</button><button data-act="newTeams">New teams</button><button class="ghost" data-act="toTitle">Menu</button></div></div>`;
  }
  return commandHtml();
}

function commandHtml() {
  const st = S.battle;
  const side = S.side;
  const mine = E.onField(st, side);
  const u = st.units[S.actor];
  const allChosen = mine.every((x) => S.choices[side][x.uid]);
  const head = S.pending
    ? `<span class="q tgt-note">Choose a target for ${esc(E.getJutsu(S.pending.jutsuId).name)} — tap a shinobi on the field</span><button class="small ghost" data-act="cancelTarget">Cancel</button>`
    : `<span class="q">What will <b>${esc(u ? u.name : '')}</b> do?</span>`;
  return `<div class="card cmd">
    ${S.preview ? `<div class="banner-note">🕵️ <b>Intel advantage:</b> ${esc(S.preview)}</div>` : ''}
    <div class="cmd-head">
      ${head}
      <span class="grow"></span>
      <div class="who-tabs">${mine.map((x) => `<button class="who-tab ${x.uid === S.actor ? 'active' : ''}" data-act="selActor" data-arg="${x.uid}">${badge(SHINOBI_BY_ID[x.id])}${esc(shortName(x.name))}${S.choices[side][x.uid] ? '<span class="ok">✓</span>' : ''}</button>`).join('')}</div>
    </div>
    ${u ? actionSections(st, u) : ''}
    <div class="orders">
      <div class="list">${mine.map((x) => `<span class="o ${S.choices[side][x.uid] ? '' : 'none'}"><b>${esc(shortName(x.name))}:</b> ${S.choices[side][x.uid] ? esc(actionText(st, S.choices[side][x.uid])) : '—'}</span>`).join('')}</div>
      <button class="primary" data-act="confirm" ${allChosen ? '' : 'disabled'}>Confirm orders</button>
    </div>
  </div>`;
}

const GROUPS = {
  tactics: ['kunai', 'charge', 'gather'],
  defense: ['substitute', 'guard', 'release'],
  special: ['transform'],
};
const KUNAI_TIP = 'Free, fast thrown weapons (priority +2). Good for baiting out a Substitution before your big jutsu lands.';

function actionSections(st, u) {
  const opts = E.availableActions(st, u.uid);
  const chosen = S.choices[S.side][u.uid];
  const isOn = (o) => chosen && chosen.type === o.type && (chosen.jutsuId || null) === (o.jutsuId || null);
  const forced = opts.length === 1 && (opts[0].type === 'none' || opts[0].type === 'weaveRelease');
  if (forced) {
    return `<div class="banner-note">${esc(opts[0].type === 'none' ? `${u.name} is Bound and can't act this turn.` : `${u.name} is weaving signs — ${opts[0].label} happens automatically this turn.`)}</div>`;
  }
  const idx = (o) => opts.indexOf(o);
  const jutsu = opts.filter((o) => o.type === 'jutsu');
  const moveBtn = (o) => {
    const j = E.getJutsu(o.jutsuId);
    const pri = j.priority + (j.category === 'taijutsu' && E.traitOf(u) === 'noNinjutsu' ? 1 : 0);
    const overTip = o.overexert ? `<br><b style="color:#ffcc4d">Not enough Chakra.</b> Overexert to force it out anyway: costs ${o.overexert} HP and leaves you Exhausted (−15% stats) for 2 turns.` : '';
    return `<button class="move-btn ${isOn(o) ? 'on' : ''} ${o.copied ? 'copied' : ''} ${o.overexert ? 'over' : ''}" style="--c:${FX.jutsuColor(j)}" data-act="chooseAction" data-arg="${idx(o)}" ${o.disabled ? 'disabled' : ''} ${tipAttr(jutsuTip(j, o.cost) + overTip)}>
      <span class="mn">${esc(j.name)} ${natChip(j.nature)}${o.copied ? '<span class="chip down">Copied</span>' : ''}</span>
      <span class="mi">${j.power ? `POW ${j.power}` : j.category.toUpperCase()} · CK ${o.cost} · ${priLabel(j.charged ? j.priority : pri)} · ${TARGET_LABEL[j.target]}${j.charged ? ' · 2 turns' : ''}</span>
      ${o.disabled ? `<span class="why">${esc(o.disabled)}</span>` : ''}
      ${o.overexert ? `<span class="why">⚠ Overexert: −${o.overexert} HP + Exhausted</span>` : ''}
    </button>`;
  };
  const SUB = {
    kunai: (o) => { const k = E.getJutsu(o.jutsuId); return `POW ${k.power} · free · +2${k.target === 'allEnemies' ? ' · all enemies' : ''}`; },
    charge: () => `+${Math.round(E.BALANCE.chargeChakra * 100)}% Chakra · −2 · vulnerable`,
    gather: () => `+${(E.defOf(u).roles.some((r) => r === 'Sensor' || r === 'Infiltrator') ? E.BALANCE.intelGatherSpecialist : E.BALANCE.intelGather) + E.auraVal(S.battle, u.side, 'gatherBonus')} Intel · −1 · fails if hit`,
    substitute: (o) => `CK ${o.cost} · Stance${o.note ? ` · ${o.note}` : ''}`,
    guard: () => 'Stance · halve enemy Intel',
    release: () => 'Stance · break genjutsu',
    transform: (o) => o.disabled || `Stance · ${E.tfResolve(S.battle, u)} Resolve`,
  };
  const TIPS = {
    kunai: KUNAI_TIP,
    charge: 'Restore half of your max Chakra (it resolves last). You take +25% damage this turn. Passive regen is small, so this is how you refill.',
    gather: 'Priority −1. Gain Intel (Sensors and Infiltrators gain more). Fails if you were hit earlier this turn. The Intel is unsecured until you survive the end of next turn.',
    substitute: `${SUBSTITUTIONS[u.substitution].desc} Success drops to 50% / 25% if used on consecutive turns. Area attacks are only halved.`,
    guard: 'Stance. Enemy Intel gains are halved this turn (quartered if a Sensor guards), and you take 25% less damage.',
    release: 'Stance. Break free of genjutsu.',
    transform: E.defOf(u).transformation?.desc || '',
  };
  const optBtn = (o) => `<button class="opt-btn ${isOn(o) ? 'on' : ''}" data-act="chooseAction" data-arg="${idx(o)}" ${o.disabled ? 'disabled' : ''} ${tipAttr(`<b>${esc(o.label)}</b><br>${esc(TIPS[o.type] || '')}`)}>
      <span>${esc(o.label)}</span><span class="mi">${esc(SUB[o.type] ? SUB[o.type](o) : '')}</span></button>`;
  const group = (title, types, hint = '') => {
    const list = opts.filter((o) => types.includes(o.type));
    if (!list.length) return '';
    return `<div class="sect"><h2>${title} ${hint ? `<span class="hint muted">${hint}</span>` : ''}</h2><div class="opt-grid">${list.map(optBtn).join('')}</div></div>`;
  };
  return `<div class="sections">
    <div class="sect"><h2>Jutsu <span class="hint ${u.chakra < u.maxChakra * 0.25 ? 'lowck' : 'muted'}">${u.chakra}/${u.maxChakra} Chakra${u.chakra < u.maxChakra * 0.25 ? ' — running low' : ''}</span></h2><div class="moves">${jutsu.map(moveBtn).join('')}</div></div>
    <div class="others">
      ${group('Tactics', GROUPS.tactics)}
      ${group('Defense', GROUPS.defense, u.subStreak ? 'substitution less reliable' : '')}
      ${group('Special', GROUPS.special, `Resolve ${u.resolve}`)}
    </div>
  </div>`;
}

function actionText(st, a) {
  const u = st.units[a.actor];
  const tname = (side) => {
    const uid = a.target && st.teams[side].slots[a.target.slot];
    return uid ? shortName(st.units[uid].name) : '';
  };
  switch (a.type) {
    case 'jutsu': case 'kunai': {
      const j = E.getJutsu(a.jutsuId || 'kunai');
      const t = j.target === 'enemy' ? ` → ${tname(1 - u.side)}` : j.target === 'ally' ? ` → ${tname(u.side)}` : '';
      return `${j.name}${t}${a.overexert ? ' (overexert)' : ''}`;
    }
    case 'weaveRelease': return `Release ${E.getJutsu(u.weaving.jutsuId).name}`;
    case 'substitute': return SUBSTITUTIONS[u.substitution].name;
    case 'charge': return 'Charge Chakra';
    case 'gather': return 'Gather Intel';
    case 'guard': return 'Guard';
    case 'release': return 'Release genjutsu';
    case 'transform': return E.defOf(u).transformation.name;
    case 'none': return 'Bound';
    default: return a.type;
  }
}

// ---------------------------------------------------------------- playback
const speedLabel = () => `${Math.round(1 / S.speed)}×`;
let advanceNow = null;
function pause(ms) {
  if (S.skip) return Promise.resolve();
  return new Promise((res) => {
    const t = setTimeout(() => { advanceNow = null; res(); }, ms * S.speed);
    advanceNow = () => { clearTimeout(t); advanceNow = null; res(); };
  });
}

function setText(entry) {
  S.msg = entry;
  const tb = document.getElementById('textbox');
  if (!tb) return;
  document.getElementById('tbtext').textContent = entry.text;
  tb.classList.remove('s0', 's1');
  if (entry.side === 0 || entry.side === 1) tb.classList.add(`s${entry.side}`);
}

const monEl = (uid) => document.querySelector(`#mon-${uid} .spr`);

async function playback(events, startSnap) {
  S.phase = 'play';
  S.view = startSnap;
  S.skip = false;
  S.msg = null;
  S.logShown = S.battle.log.length - events.length;
  render();
  syncField();
  let sig = fieldSignature(S.view);
  for (const ev of events) {
    if (S.skip || S.screen !== 'battle') break;
    await playEvent(ev, () => {
      S.view = ev.snap;
      const ns = fieldSignature(S.view);
      if (ns !== sig) { sig = ns; redrawArena(); } else syncField();
    });
    S.logShown += 1;
  }
  if (S.screen !== 'battle') return;
  S.view = null;
  S.logShown = S.battle.log.length;
  if (S.battle.winner !== null) { S.phase = 'over'; render(); syncField(); return; }
  beginTurn();
}

async function playEvent(ev, apply) {
  const e = ev.entry;
  const arena = document.getElementById('arena');
  const sp = S.speed;
  appendLog(e);
  if (e.kind === 'turn') { apply(); setText({ text: `Turn ${e.turn}`, side: null }); await pause(700); return; }
  // small bookkeeping events (intel from revealing a jutsu, regen, support relays) only pop up
  if (e.minor) {
    apply();
    const el = monEl(e.u);
    if (el && e.kind === 'intel' && e.amount) FX.pop(arena, el, `📜 +${e.amount}`, 'intel');
    else if (el && e.kind === 'heal' && e.amount) { FX.pop(arena, el, `+${e.amount}`, 'heal'); }
    await pause(380);
    return;
  }
  setText(e);

  // the attacker moves before the HP changes
  if (e.kind === 'action' && e.jutsu) {
    const j = E.getJutsu(e.jutsu);
    const user = monEl(e.u);
    const targets = (e.targets || []).map(monEl).filter(Boolean);
    if (user) {
      const from = FX.centerOf(user, arena);
      const color = FX.jutsuColor(j);
      if (j.category === 'taijutsu' && targets.length && j.id !== 'kunai') {
        FX.lunge(user, from, FX.centerOf(targets[0], arena), sp);
        setTimeout(() => targets.forEach((t) => { FX.fx(arena, 'slash', FX.centerOf(t, arena)); }), 230 * sp);
      } else if (j.category === 'genjutsu') {
        FX.ring(arena, user, 'gen');
        targets.forEach((t) => setTimeout(() => FX.ring(arena, t, 'gen'), 250 * sp));
      } else if (j.target === 'self' || j.target === 'ally' || j.target === 'allAllies') {
        targets.forEach((t) => FX.ring(arena, t, j.category === 'medical' ? 'heal' : 'aura'));
      } else {
        targets.forEach((t) => FX.orb(arena, from, FX.centerOf(t, arena), color, { small: j.id === 'kunai', sp }));
      }
    }
    apply();
    await pause(e.collab ? 1500 : 1300);
    return;
  }
  apply();
  const el = monEl(e.u);
  let ms = 1000;
  switch (e.kind) {
    case 'damage': {
      if (el) {
        FX.shake(el);
        FX.pop(arena, el, `-${e.amount}`, e.burn || e.poison ? 'status' : 'dmg', true);
        if (e.crit) FX.pop(arena, el, 'Critical!', 'crit', false, -30);
        else if (e.adv > 1) FX.pop(arena, el, 'Super effective!', 'se', false, -30);
        else if (e.adv < 1) FX.pop(arena, el, 'Resisted', 'nve', false, -30);
        if (e.boom) FX.fx(arena, 'burst', FX.centerOf(el, arena)).style.background = '#ff9a3c';
        if (e.overexert) { FX.pop(arena, el, 'Overexert!', 'crit', false, -30); FX.ring(arena, el, '', '#ff9a3c'); }
      }
      ms = 1150;
      break;
    }
    case 'heal':
      if (el && e.revive) {
        el.parentElement.getAnimations().forEach((a) => a.cancel());
        FX.appear(el); FX.banner(arena, 'REVIVED!', '#7ee08a');
      }
      if (el) { FX.ring(arena, el, 'heal', e.chakra ? '#4fb3ff' : null); if (e.amount) FX.pop(arena, el, `+${e.amount}${e.chakra ? ' CK' : ''}`, 'heal'); }
      ms = e.revive ? 1700 : 1000;
      break;
    case 'ko':
      if (el) FX.faint(el.parentElement);
      ms = 1400;
      break;
    case 'sub':
      if (el && e.rotation) {
        FX.ring(arena, el, '', '#7fd8ff'); FX.ring(arena, el, 'aura', '#7fd8ff');
        FX.pop(arena, el, 'Rotation!', 'sub', true);
        ms = 1200;
      } else if (el && e.negated) {
        FX.fx(arena, 'puff', FX.centerOf(el, arena));
        if (!e.decoy) FX.fx(arena, 'log', FX.centerOf(el, arena), '🪵');
        FX.pop(arena, el, e.decoy ? 'Decoy!' : 'Substitution!', 'sub', true);
        ms = 1300;
      } else if (el) { FX.ring(arena, el, '', '#c9d0dd'); }
      break;
    case 'status':
      if (el) { FX.ring(arena, el, '', STATUS_COLOR[e.status] || '#ffcf9e'); if (e.status) FX.pop(arena, el, STATUS_NAME[e.status], 'status'); }
      break;
    case 'intel':
      if (el) {
        if (e.secured) FX.pop(arena, el, `📜 Secured +${e.secured}`, 'intel');
        else if (e.amount) FX.pop(arena, el, `📜 +${e.amount}`, 'intel');
        else if (/lost/.test(e.text)) FX.pop(arena, el, '📜 Intel lost', 'dmg');
      }
      ms = 1000;
      break;
    case 'special':
      if (e.clash) { FX.banner(arena, 'JUTSU CLASH!', '#ff5c5c'); ms = 1700; }
      else if (e.transform) {
        if (el) { FX.ring(arena, el, 'aura'); FX.appear(el); }
        FX.banner(arena, E.defOf(S.battle.units[e.u]).transformation.name.toUpperCase(), '#ffc83d'); ms = 1800;
      } else if (e.weave) { if (el) FX.ring(arena, el, 'gen'); ms = 1200; }
      else if (e.survive) { if (el) { FX.ring(arena, el, 'aura'); FX.pop(arena, el, 'Survived!', 'se', true); } ms = 1500; }
      else if (e.bodyguard) { const g = monEl(e.bodyguard); if (el) FX.ring(arena, el, 'aura', '#9fe7ff'); if (g) FX.pop(arena, g, 'Protected!', 'sub', true); ms = 1300; }
      else if (e.copy) { if (el) FX.pop(arena, el, 'Copied!', 'se', true); ms = 1300; }
      else if (e.auraStage) { FX.banner(arena, `SUPPORT STAGE ${e.auraStage}`, e.side === 0 ? '#4fa8ff' : '#ff6a4d'); ms = 1800; }
      else ms = 1300;
      break;
    case 'milestone': {
      const m = e.text.match(/reached (\d+) Intel/);
      if (m) { FX.banner(arena, `INTEL ${m[1]}`, '#b98cff'); ms = 1800; } else ms = 1400;
      break;
    }
    case 'system':
      if (S.battle.winner !== null) FX.banner(arena, S.battle.winner === 'draw' ? 'DRAW' : `${S.names[S.battle.winner].toUpperCase()} WINS`, '#3ddc84');
      ms = 2200;
      break;
    case 'info':
      if (e.dodge && el) FX.pop(arena, el, 'Dodged!', 'sub', true);
      break;
    default: break;
  }
  if (/flinch/.test(e.text) && el) FX.pop(arena, el, 'Flinched!', 'status', true);
  if (/cannot move|can't move|does nothing/.test(e.text) && el) FX.shake(el);
  await pause(ms);
}

// ---------------------------------------------------------------- flow
function newBuilder(side) {
  S.builder = { side, members: [null, null, null, null], sel: 0, era: 'all', errors: [] };
  if (S.specs[side]) S.builder.members = S.specs[side].members.map((m) => ({ ...m, loadout: [...m.loadout] }));
  S.screen = 'builder';
}

function showPass(side, note, next) {
  if (S.mode !== 'hotseat') { next(); return; }
  S.passTo = side; S.passNote = note; S.passNext = next; S.screen = 'pass';
  render();
}

function startBattle() {
  S.battle = E.createBattle(S.specs, { seed: Date.now() & 0x7fffffff, names: S.names });
  S.logShown = S.battle.log.length;
  S.view = null;
  beginTurn();
}

function beginTurn() {
  const st = S.battle;
  S.choices = [{}, {}];
  S.preview = null;
  let first = 0;
  if (st.teams[0].preview && !st.teams[1].preview) first = 1;
  S.order = [first, 1 - first];
  S.step = 0;
  nextStep();
}

function nextStep() {
  const st = S.battle;
  if (S.step >= 2) { resolve(); return; }
  const side = S.order[S.step];
  for (const u of E.onField(st, side)) {
    const opts = E.availableActions(st, u.uid);
    if (opts.length === 1 && (opts[0].type === 'none' || opts[0].type === 'weaveRelease')) S.choices[side][u.uid] = { actor: u.uid, type: opts[0].type };
  }
  if (S.mode === 'cpu' && side === 1) {
    for (const a of chooseActions(st, 1)) S.choices[1][a.actor] = a;
    S.step += 1;
    nextStep();
    return;
  }
  const go = () => {
    S.side = side;
    S.pending = null;
    S.preview = null;
    const otherSide = 1 - side;
    if (S.step === 1 && st.teams[side].preview && !st.teams[otherSide].preview) {
      const list = Object.values(S.choices[otherSide]);
      if (list.length) {
        const a = list[Math.floor(Math.random() * list.length)];
        S.preview = `${st.units[a.actor].name} is planning: ${actionText(st, a)}.`;
      }
    }
    const firstOpen = E.onField(st, side).find((u) => !S.choices[side][u.uid]);
    S.actor = (firstOpen || E.onField(st, side)[0])?.uid || null;
    S.screen = 'battle';
    S.phase = 'select';
    render();
    syncField();
  };
  showPass(side, `Turn ${st.turn}: choose your orders.`, go);
}

function resolve() {
  const st = S.battle;
  const actions = [...Object.values(S.choices[0]), ...Object.values(S.choices[1])];
  const startSnap = E.snapshot(st);
  const events = [];
  E.resolveTurn(st, actions, { onLog: (entry, state) => events.push({ entry, snap: E.snapshot(state) }) });
  S.screen = 'battle';
  playback(events, startSnap);
}

function commit(action) {
  const st = S.battle;
  S.choices[S.side][action.actor] = action;
  const next = E.onField(st, S.side).find((u) => !S.choices[S.side][u.uid]);
  if (next) S.actor = next.uid;
  render();
  syncField();
}

// ---------------------------------------------------------------- actions
const ACTIONS = {
  startHotseat() { S.mode = 'hotseat'; S.names = ['Player 1', 'Player 2']; S.specs = [null, null]; newBuilder(0); render(); },
  startCpu() { S.mode = 'cpu'; S.names = ['Player 1', 'CPU']; S.specs = [null, randomTeam()]; newBuilder(0); render(); },
  toggleRules() { S.showRules = !S.showRules; render(); },
  toTitle() { S.screen = 'title'; render(); },
  rename(v) { S.names[S.builder.side] = v.trim() || `Player ${S.builder.side + 1}`; },
  era(e) { S.builder.era = e; render(); },
  pick(id) {
    const b = S.builder;
    const s = SHINOBI_BY_ID[id];
    b.members[b.sel] = { id, loadout: [...s.defaultLoadout], substitution: s.substitutions[0] };
    const nextEmpty = b.members.findIndex((m) => !m);
    if (nextEmpty !== -1) b.sel = nextEmpty;
    b.errors = [];
    render();
  },
  selSlot(i) { S.builder.sel = Number(i); render(); },
  removeMember() { S.builder.members[S.builder.sel] = null; render(); },
  toggleJutsu(id) {
    const m = S.builder.members[S.builder.sel];
    if (m.loadout.includes(id)) m.loadout = m.loadout.filter((j) => j !== id);
    else if (m.loadout.length < 4) m.loadout.push(id);
    render();
  },
  setSub(k) { S.builder.members[S.builder.sel].substitution = k; render(); },
  randomTeam() { S.builder.members = randomTeam().members; S.builder.errors = []; render(); },
  clearTeam() { S.builder.members = [null, null, null, null]; S.builder.sel = 0; render(); },
  ready() {
    const b = S.builder;
    if (b.members.some((m) => !m)) { b.errors = ['Fill all 3 active slots and the support slot.']; render(); return; }
    const errs = E.validateTeam({ members: b.members });
    if (errs.length) { b.errors = errs; render(); return; }
    S.specs[b.side] = { name: S.names[b.side], members: b.members };
    if (S.mode === 'hotseat' && b.side === 0) {
      showPass(1, 'Build your team in secret.', () => { newBuilder(1); render(); });
      return;
    }
    S.specs.forEach((sp, i) => { if (sp) sp.name = S.names[i]; });
    startBattle();
  },
  passContinue() { const n = S.passNext; S.passNext = null; n?.(); },
  selActor(uid) {
    if (S.phase !== 'select' || S.pending) return;
    if (S.battle.units[uid]?.side !== S.side) return;
    S.actor = uid; render(); syncField();
  },
  chooseAction(i) {
    const st = S.battle;
    const u = st.units[S.actor];
    const o = E.availableActions(st, u.uid)[Number(i)];
    if (!o || o.disabled) return;
    const j = o.jutsuId ? E.getJutsu(o.jutsuId) : null;
    const action = { actor: u.uid, type: o.type, jutsuId: o.jutsuId };
    if (o.overexert) action.overexert = true;
    if (j && (j.target === 'enemy' || j.target === 'ally')) {
      const revive = j.effects.some((e) => e.type === 'revive');
      const candidates = revive ? st.teams[S.side].slots.map((id) => st.units[id]).filter((x) => x.ko)
        : j.target === 'enemy' ? E.onField(st, 1 - S.side) : E.onField(st, S.side).filter((x) => !j.effects.some((e) => e.type === 'bodyguard') || x !== u);
      if (candidates.length === 1) action.target = { slot: E.slotOf(st, candidates[0]) };
      else { S.pending = action; render(); syncField(); return; }
    }
    commit(action);
  },
  target(slot) {
    if (!S.pending) return;
    const action = { ...S.pending, target: { slot: Number(slot) } };
    S.pending = null;
    commit(action);
  },
  cancelTarget() { S.pending = null; render(); syncField(); },
  confirm() { S.step += 1; nextStep(); },
  advance(_, el, e) { if (e.target.closest('button')) return; advanceNow?.(); },
  toggleSpeed() {
    S.speed = S.speed === 1 ? 0.5 : S.speed === 0.5 ? 0.25 : 1;
    try { localStorage.setItem('ss-speed', String(S.speed)); } catch {}
    const b = document.querySelector('[data-act=toggleSpeed]');
    if (b) b.textContent = `Speed ${speedLabel()}`;
  },
  skipPlayback() { S.skip = true; advanceNow?.(); },
  rematch() { startBattle(); },
  newTeams() {
    if (S.mode === 'cpu') S.specs[1] = randomTeam();
    newBuilder(0); render();
  },
};

render();
