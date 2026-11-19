// Shinobi Showdown — local hot-seat / vs CPU client.
import { SHINOBI, SHINOBI_BY_ID, SUBSTITUTIONS, COST_CAP } from './data/shinobi.js';
import { NATURE_LABELS, KEKKEI_GENKAI } from './engine/natures.js';
import * as E from './engine/battle.js';
import { chooseActions } from './engine/ai.js';
import { randomTeam } from './engine/teams.js';

const app = document.getElementById('app');
const tip = document.getElementById('tooltip');

const S = {
  screen: 'title',
  mode: null,              // 'hotseat' | 'cpu'
  names: ['Player 1', 'Player 2'],
  specs: [null, null],
  builder: null,
  battle: null,
  choices: [{}, {}],
  order: [0, 1],
  step: 0,
  side: 0,                 // side currently choosing
  actor: null,             // uid being configured
  pending: null,           // action waiting for a target
  preview: null,
  lastLog: [],
  showRules: false,
  passTo: null,
  passNext: null,
};

// ---------------------------------------------------------------- helpers
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const natureChip = (n) => (n ? `<span class="chip ${KEKKEI_GENKAI[n] ? 'kg' : n}">${NATURE_LABELS[n] || n}</span>` : '');
const pct = (a, b) => Math.max(0, Math.min(100, (100 * a) / Math.max(1, b)));
const priLabel = (p) => (p >= 4 ? 'Stance' : p > 0 ? `+${p}` : `${p}`);
const TARGET_LABEL = { enemy: '1 enemy', allEnemies: 'All enemies', self: 'Self', ally: '1 ally', allAllies: 'All allies' };

function jutsuTip(j) {
  if (!j) return '';
  const bits = [j.category, j.power ? `Power ${j.power}` : null, `Cost ${j.cost}`, `Priority ${priLabel(j.priority)}`, TARGET_LABEL[j.target], j.charged ? 'Charged (2 turns)' : null].filter(Boolean);
  return `<b>${esc(j.name)}</b><br>${esc(bits.join(' · '))}<br>${esc(j.desc || '')}`;
}

function render() {
  const fn = SCREENS[S.screen];
  app.innerHTML = fn();
  hideTip();
}

// tooltips
document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (!el) return hideTip();
  tip.innerHTML = el.dataset.tip;
  tip.classList.remove('hidden');
});
document.addEventListener('mousemove', (e) => {
  if (tip.classList.contains('hidden')) return;
  const x = Math.min(window.innerWidth - tip.offsetWidth - 12, e.clientX + 14);
  const y = Math.min(window.innerHeight - tip.offsetHeight - 12, e.clientY + 14);
  tip.style.left = `${x}px`; tip.style.top = `${y}px`;
});
function hideTip() { tip.classList.add('hidden'); }
const tipAttr = (html) => `data-tip="${esc(html)}"`;

// click dispatcher: data-act="name" data-arg="..."
app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) fn(el.dataset.arg, el, e);
});
app.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el) ACTIONS[el.dataset.change]?.(el.value, el, e);
});

// ---------------------------------------------------------------- screens
const SCREENS = {
  title() {
    return `<div class="title-screen">
      <div class="logo">SHINOBI SHOWDOWN</div>
      <div class="tagline">Build a three-man cell plus a support. Win by wiping out the enemy cell or by stealing 100 Intel.</div>
      <div class="row">
        <button class="btn primary big" data-act="startHotseat">Hot-Seat Battle</button>
        <button class="btn big" data-act="startCpu">Vs CPU (quick test)</button>
      </div>
      <div class="row" style="margin-top:14px"><button class="btn ghost" data-act="toggleRules">${S.showRules ? 'Hide' : 'How to play'}</button></div>
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
    const roster = SHINOBI.filter((s) => b.era === 'all' || s.era === b.era);
    return `<div class="row" style="margin-bottom:12px">
        <h2 style="margin:0">${esc(S.names[b.side])} — build your team</h2>
        <span class="spacer"></span>
        <label class="small muted">Name <input type="text" value="${esc(S.names[b.side])}" data-change="rename" maxlength="18"></label>
        <button class="btn" data-act="backToTitle">Menu</button>
      </div>
      <div class="builder">
        <div>
          <div class="row" style="margin-bottom:8px">
            ${['all', 'Part 1', 'Shippuden'].map((e) => `<button class="tab ${b.era === e ? 'on' : ''}" data-act="era" data-arg="${e}">${e === 'all' ? 'All eras' : e}</button>`).join('')}
          </div>
          <div class="roster">
            ${roster.map((s) => {
              const isTaken = taken.has(s.baseId) && s.baseId !== selBase;
              return `<button class="rcard ${isTaken ? 'taken' : ''}" data-act="pick" data-arg="${s.id}" ${isTaken ? 'disabled' : ''}
                  ${tipAttr(`<b>${s.name}</b> (${s.era})<br>Trait — ${s.trait.name}: ${s.trait.desc}${s.transformation ? `<br>Transformation — ${s.transformation.name}` : ''}<br>Support — ${s.supportAura.name}: ${s.supportAura.desc}`)}>
                <div class="row" style="gap:6px"><span class="name">${esc(s.name)}</span><span class="spacer"></span><span class="chip cost">${s.cost}</span></div>
                <div class="chips">${natureChip(s.natures.primary)}${natureChip(s.natures.secondary)}${!s.natures.primary ? '<span class="chip">Taijutsu</span>' : ''}<span class="chip">${s.era}</span></div>
                <div class="small muted">${s.roles.join(' · ')}</div>
              </button>`;
            }).join('')}
          </div>
        </div>
        <div class="panel">
          <div class="slots">
            ${members.map((m, i) => `<button class="slot ${i === 3 ? 'support' : ''} ${b.sel === i ? 'sel' : ''}" data-act="selSlot" data-arg="${i}">
              <div class="lbl">${i === 3 ? 'Support' : `Active ${i + 1}`}</div>
              ${m ? `<div style="font-weight:600;font-size:.85rem">${esc(SHINOBI_BY_ID[m.id].name)}</div><span class="chip cost">${SHINOBI_BY_ID[m.id].cost}</span>` : '<div class="muted small">empty</div>'}
            </button>`).join('')}
          </div>
          <div class="row small"><span>Team cost</span><span class="spacer"></span><b>${cost} / ${COST_CAP}</b></div>
          <div class="costbar ${cost > COST_CAP ? 'over' : ''}"><div style="width:${pct(cost, COST_CAP)}%"></div></div>
          ${selMember ? memberEditor(selMember, b.sel) : `<div class="muted small">Select a shinobi from the roster for ${b.sel === 3 ? 'the support slot' : `active slot ${b.sel + 1}`}.</div>`}
          ${b.errors.length ? `<div class="errors">${b.errors.map(esc).join('<br>')}</div>` : ''}
          <div class="row" style="margin-top:12px">
            <button class="btn" data-act="randomTeam">Random team</button>
            <button class="btn ghost" data-act="clearTeam">Clear</button>
            <span class="spacer"></span>
            <button class="btn primary" data-act="ready">Ready</button>
          </div>
        </div>
      </div>`;
  },

  pass() {
    return `<div class="pass">
      <div class="muted">Hot-seat — hide the screen from your opponent</div>
      <h1>Pass to ${esc(S.names[S.passTo])}</h1>
      <p class="muted">${esc(S.passNote || '')}</p>
      <button class="btn primary big" data-act="passContinue">I'm ${esc(S.names[S.passTo])} — continue</button>
    </div>`;
  },

  select() {
    const st = S.battle;
    const side = S.side;
    const mine = E.onField(st, side);
    const actor = st.units[S.actor];
    const allChosen = mine.every((u) => S.choices[side][u.uid]);
    const targetSide = S.pending ? (['ally'].includes(E.getJutsu(S.pending.jutsuId)?.target) ? side : 1 - side) : null;
    return `${topbar(st)}
      ${S.preview ? `<div class="banner">🕵️ <b>Intel advantage:</b> ${esc(S.preview)}</div>` : ''}
      ${S.pending ? `<div class="banner warn">Choose a target for <b>${esc(E.getJutsu(S.pending.jutsuId).name)}</b> <button class="btn ghost small" data-act="cancelTarget">Cancel</button></div>` : ''}
      ${fieldHtml(st, 1 - side, side, { targetable: targetSide === 1 - side })}
      ${fieldHtml(st, side, side, { targetable: targetSide === side, acting: S.actor })}
      <div class="actionpanel">
        <div class="panel">
          <div class="tabs">
            ${mine.map((u) => `<button class="tab ${u.uid === S.actor ? 'on' : ''} ${S.choices[side][u.uid] ? 'done' : ''}" data-act="selActor" data-arg="${u.uid}">${esc(u.name)}</button>`).join('')}
          </div>
          ${actor ? actionButtons(st, actor) : ''}
        </div>
        <div class="panel">
          <h3>${esc(S.names[side])}'s orders</h3>
          <ul class="summary">${mine.map((u) => `<li><b>${esc(u.name)}:</b> ${S.choices[side][u.uid] ? esc(actionText(st, S.choices[side][u.uid])) : '<span class="muted">—</span>'}</li>`).join('')}</ul>
          <button class="btn primary" style="width:100%" data-act="confirm" ${allChosen ? '' : 'disabled'}>Confirm orders</button>
          ${S.lastLog.length ? `<h3 style="margin-top:14px">Last turn</h3><div class="log">${logHtml(S.lastLog)}</div>` : ''}
        </div>
      </div>`;
  },

  results() {
    const st = S.battle;
    const viewer = S.mode === 'cpu' ? 0 : null;
    return `${topbar(st)}
      ${fieldHtml(st, 1, viewer)}
      ${fieldHtml(st, 0, viewer)}
      <div class="panel"><div class="row"><h3 style="margin:0">Turn ${st.turn - 1} results</h3><span class="spacer"></span>
        <button class="btn primary" data-act="nextTurn">Next turn →</button></div>
        <div class="log" style="max-height:none">${logHtml(S.lastLog)}</div></div>`;
  },

  over() {
    const st = S.battle;
    const w = st.winner;
    return `<div class="winner">
        <h1>${w === 'draw' ? 'Draw!' : `${esc(st.teams[w].name)} wins!`}</h1>
        <div class="muted">${esc(st.winReason || '')} · Mission Score ${E.missionScore(st, 0)} – ${E.missionScore(st, 1)}</div>
        <div class="row" style="justify-content:center;margin-top:14px">
          <button class="btn primary" data-act="rematch">Rematch (same teams)</button>
          <button class="btn" data-act="newTeams">New teams</button>
          <button class="btn ghost" data-act="backToTitle">Menu</button>
        </div>
      </div>
      ${topbar(st)}
      ${fieldHtml(st, 1, 'all')}
      ${fieldHtml(st, 0, 'all')}
      <div class="panel"><h3>Full battle log</h3><div class="log" style="max-height:520px">${logHtml(st.log)}</div></div>`;
  },
};

function rulesHtml() {
  return `<div class="panel rules">
    <h3>How to play</h3>
    <ul>
      <li><b>Team:</b> 3 active shinobi + 1 support, ${COST_CAP} cost points max, one version of each character. Each shinobi brings 4 jutsu.</li>
      <li><b>Turns:</b> both players pick orders in secret, then everything resolves by priority (Stance → +3 … −2), then SPD.</li>
      <li><b>Natures:</b> Fire › Wind › Lightning › Earth › Water › Fire (×1.5 / ×0.75). Jutsu matching your primary nature get ×1.25, secondary ×1.1. Kekkei genkai count as both parent natures.</li>
      <li><b>Jutsu Clash:</b> two ninjutsu aimed at each other collide — the stronger nature breaks through at 70% power.</li>
      <li><b>Collaboration:</b> Wind then Fire (or Water then Lightning) on the same target in one turn = ×1.3.</li>
      <li><b>Substitution:</b> a Stance that negates the first single-target hit. Repeating it lowers the odds (100/50/25%). Area attacks are only halved; Sharingan sees through logs; genjutsu ignores it.</li>
      <li><b>Intel:</b> Gather Intel, land genjutsu, reveal enemy jutsu and score KOs to earn it. New Intel is <i>unsecured</i> until the carrier survives the end of the next turn — KO the spy and it's lost. Guard halves enemy Intel gains (sensors quarter it).</li>
      <li><b>Milestones:</b> 25 Intel reveals an enemy loadout, 50 exposes their support and Chakra, 75 lets you see one enemy order before choosing.</li>
      <li><b>Win:</b> KO all 4 enemies, <i>or</i> secure 100 Intel. After turn 20, highest Mission Score (25 per KO + Intel) wins.</li>
      <li><b>Resolve</b> builds as you take hits or lose allies and powers transformations. The support waits off-field granting an aura, can Swap in once, and auto-enters when an ally falls.</li>
    </ul>
  </div>`;
}

function memberEditor(m, slot) {
  const s = SHINOBI_BY_ID[m.id];
  const max = { hp: 130, tai: 130, nin: 130, def: 130, spd: 130, chk: 150 };
  return `<div>
    <div class="row"><h3 style="margin:0">${esc(s.name)}</h3><span class="chip">${s.era}</span><span class="spacer"></span><button class="btn ghost small" data-act="removeMember">Remove</button></div>
    <div class="chips">${natureChip(s.natures.primary)}${natureChip(s.natures.secondary)}${s.roles.map((r) => `<span class="chip">${r}</span>`).join('')}</div>
    <div class="statgrid">${Object.entries(s.stats).map(([k, v]) => `<span class="muted">${k.toUpperCase()}</span><div class="statbar"><div style="width:${pct(v, max[k])}%"></div></div><span>${v}</span>`).join('')}</div>
    <div class="small"><b>${esc(s.trait.name)}:</b> ${esc(s.trait.desc)}</div>
    ${s.transformation ? `<div class="small" style="margin-top:4px"><b>${esc(s.transformation.name)}</b> (${s.transformation.resolve} Resolve): ${esc(s.transformation.desc)}</div>` : '<div class="small muted" style="margin-top:4px">No transformation.</div>'}
    <div class="small" style="margin-top:4px;${slot === 3 ? '' : 'opacity:.6'}"><b>Support aura — ${esc(s.supportAura.name)}:</b> ${esc(s.supportAura.desc)}</div>
    <h3 style="margin-top:10px">Jutsu (${m.loadout.length}/4)</h3>
    <div class="jlist">${s.catalogue.map((id) => {
      const j = E.getJutsu(id);
      const on = m.loadout.includes(id);
      return `<div class="jopt ${on ? 'on' : ''}" data-act="toggleJutsu" data-arg="${id}" ${tipAttr(jutsuTip(j))}>
        <input type="checkbox" ${on ? 'checked' : ''} tabindex="-1" style="pointer-events:none">
        <div><div>${esc(j.name)} ${natureChip(j.nature)}</div>
        <div class="jmeta">${j.category}${j.power ? ` · ${j.power} pow` : ''} · ${j.cost} ck · ${priLabel(j.priority)} · ${TARGET_LABEL[j.target]}${j.charged ? ' · charged' : ''}${j.requiresTransform ? ' · needs transformation' : ''}</div></div>
      </div>`;
    }).join('')}</div>
    <h3 style="margin-top:10px">Substitution</h3>
    <div class="jlist">${s.substitutions.map((k) => `<div class="jopt ${m.substitution === k ? 'on' : ''}" data-act="setSub" data-arg="${k}">
      <input type="radio" ${m.substitution === k ? 'checked' : ''} tabindex="-1" style="pointer-events:none">
      <div><div>${SUBSTITUTIONS[k].name}</div><div class="jmeta">${Math.round(SUBSTITUTIONS[k].cost * 100)}% max Chakra · ${SUBSTITUTIONS[k].desc}</div></div></div>`).join('')}</div>
  </div>`;
}

function topbar(st) {
  const box = (side) => {
    const t = st.teams[side];
    const uns = t.uids.reduce((s, u) => s + (st.units[u].ko ? 0 : E.unsecuredTotal(st.units[u])), 0);
    return `<div class="intelbox side${side}" ${side === 1 ? 'style="text-align:right"' : ''}>
      <div><span class="name">${esc(t.name)}</span> <span class="muted small">· KOs ${t.kos} · Score ${E.missionScore(st, side)}</span></div>
      <div class="small">Intel <b>${t.securedIntel}</b>/100 ${uns ? `<span class="muted">(+${uns} unsecured)</span>` : ''}</div>
      <div class="intelbar"><div class="sec" style="width:${pct(t.securedIntel, 100)}%"></div>
        <div class="uns" style="left:${pct(t.securedIntel, 100)}%;width:${pct(uns, 100)}%"></div>
        ${E.MILESTONES.map((m) => `<div class="mark" style="left:${m}%"></div>`).join('')}</div>
    </div>`;
  };
  return `<div class="topbar panel">${box(0)}<div class="turnbox"><div class="muted small">TURN</div><div class="t">${Math.min(st.turn, st.maxTurns)} / ${st.maxTurns}</div></div>${box(1)}</div>`;
}

/** viewer: side number, null (public view) or 'all' (everything, for game over) */
function fieldHtml(st, side, viewer, opts = {}) {
  const team = st.teams[side];
  const cards = team.slots.map((uid, i) => (uid
    ? unitCard(st, uid, viewer, { targetable: opts.targetable && !st.units[uid].ko, slot: i, acting: opts.acting === uid })
    : `<div class="ucard empty side${side}">—</div>`));
  const res = team.reserve ? st.units[team.reserve] : null;
  cards.push(res ? unitCard(st, res.uid, viewer, { reserve: true }) : `<div class="ucard empty side${side}">no reserve</div>`);
  return `<div class="field">${cards.join('')}</div>`;
}

function unitCard(st, uid, viewer, { targetable, slot, acting, reserve } = {}) {
  const u = st.units[uid];
  const d = SHINOBI_BY_ID[u.id];
  const team = st.teams[u.side];
  const own = viewer === 'all' || viewer === u.side;
  const seeChakra = own || team.seesChakra;
  const hpP = pct(u.hp, u.maxHp);
  const chips = [];
  for (const [k, s] of Object.entries(u.statuses)) chips.push(`<span class="chip status">${k[0].toUpperCase() + k.slice(1)} ${s.turns}</span>`);
  if (u.transform) chips.push(`<span class="chip good" ${tipAttr(esc(d.transformation.desc))}>${esc(d.transformation.name)} ${u.transform.turnsLeft}</span>`);
  if (u.weaving) chips.push(`<span class="chip status">${u.weaving.kind === 'jutsu' ? `Weaving ${esc(E.getJutsu(u.weaving.jutsuId).name)}` : 'Gathering energy'}</span>`);
  if (u.decoy > 0) chips.push('<span class="chip good">Decoy</span>');
  for (const b of u.buffs) chips.push(`<span class="chip ${b.mult >= 1 ? 'good' : 'status'}">${b.stat.toUpperCase()}${b.mult >= 1 ? '↑' : '↓'}</span>`);
  if (u.subStreak) chips.push(`<span class="chip" ${tipAttr('Substitution used last turn — next one is less reliable')}>Sub ×${u.subStreak}</span>`);
  const uns = E.unsecuredTotal(u);
  if (uns) chips.push(`<span class="chip intel" ${tipAttr('Unsecured Intel — secures if this shinobi survives the end of next turn')}>📜 ${uns}</span>`);
  if (reserve && team.supportUid === uid && !u.ko) chips.push(`<span class="chip" ${tipAttr(esc(d.supportAura.desc))}>Aura: ${esc(d.supportAura.name)}</span>`);

  const known = own ? u.loadout : team.revealed[uid];
  const hidden = own ? 0 : u.loadout.length - known.filter((j) => u.loadout.includes(j)).length;
  const knownList = [...known, ...(u.copied ? [u.copied] : [])]
    .map((j) => `<b ${tipAttr(jutsuTip(E.getJutsu(j)))}>${esc(E.getJutsu(j).name)}${j === u.copied ? ' (copied)' : ''}</b>`).join(', ');

  const attrs = targetable ? `data-act="target" data-arg="${slot}"` : (own && !reserve && viewer !== 'all' && !u.ko ? `data-act="selActor" data-arg="${uid}"` : '');
  return `<div class="ucard side${u.side} ${reserve ? 'reserve' : ''} ${u.ko ? 'ko' : ''} ${targetable ? 'targetable' : ''} ${acting ? 'acting' : ''}" ${attrs}>
    <div class="row" style="gap:6px"><span class="name">${esc(u.name)}</span>${reserve ? '<span class="chip">Reserve</span>' : ''}<span class="spacer"></span>${natureChip(d.natures.primary)}${natureChip(d.natures.secondary)}</div>
    <div class="small muted" ${tipAttr(`<b>${esc(d.trait.name)}</b><br>${esc(d.trait.desc)}`)}>${esc(d.trait.name)}</div>
    <div class="barlbl"><span>HP</span><span>${u.hp}/${u.maxHp}</span></div>
    <div class="bar hp ${hpP < 25 ? 'low' : hpP < 55 ? 'mid' : ''}"><div style="width:${hpP}%"></div></div>
    <div class="barlbl"><span>Chakra</span><span>${seeChakra ? `${u.chakra}/${u.maxChakra}` : '???'}</span></div>
    <div class="bar ck"><div style="width:${seeChakra ? pct(u.chakra, u.maxChakra) : 0}%"></div></div>
    <div class="barlbl"><span>Resolve</span><span>${u.resolve}${d.transformation && !u.transformUsed ? ` / ${d.transformation.resolve}` : ''}</span></div>
    <div class="bar rs"><div style="width:${u.resolve}%"></div></div>
    <div class="chips">${chips.join('')}</div>
    <div class="known">${knownList || ''}${hidden ? `${knownList ? ', ' : ''}<span>${hidden} hidden</span>` : ''}</div>
  </div>`;
}

function actionButtons(st, u) {
  const opts = E.availableActions(st, u.uid);
  const chosen = S.choices[S.side][u.uid];
  return `<div class="actions">${opts.map((o, i) => {
    const j = o.jutsuId ? E.getJutsu(o.jutsuId) : null;
    const on = chosen && chosen.type === o.type && (chosen.jutsuId || null) === (o.jutsuId || null);
    let meta = '';
    let tipHtml = '';
    if (j) {
      const pri = o.type === 'kunai' ? 2 : j.priority + (j.category === 'taijutsu' && E.traitOf(u) === 'noNinjutsu' ? 1 : 0);
      meta = `${j.category}${j.power ? ` · ${j.power}` : ''} · ${o.cost} ck · ${priLabel(pri)} · ${TARGET_LABEL[j.target]}`;
      tipHtml = jutsuTip(j);
    } else {
      const D = {
        substitute: `${o.cost} ck · Stance · ${SUBSTITUTIONS[u.substitution].desc}${o.note ? ` (${o.note})` : ''}`,
        charge: 'Priority −2 · restore 35% Chakra, take +25% damage this turn',
        gather: `Priority −1 · +${E.defOf(u).roles.some((r) => r === 'Sensor' || r === 'Infiltrator') ? 15 : 8} Intel, fails if hit first`,
        guard: 'Stance · halve enemy Intel gains this turn, take 25% less damage',
        release: 'Stance · break free of genjutsu',
        transform: `Stance · ${E.defOf(u).transformation?.desc || ''}`,
        swap: 'Stance · once per battle, switch with your reserve',
        none: '', weaveRelease: 'Automatically released this turn',
      };
      meta = D[o.type] || '';
      tipHtml = esc(meta);
    }
    const stance = ['substitute', 'guard', 'release', 'transform', 'swap'].includes(o.type);
    return `<button class="abtn ${on ? 'on' : ''} ${stance ? 'stance' : ''} ${o.copied ? 'copy' : ''}" data-act="chooseAction" data-arg="${i}" ${o.disabled ? 'disabled' : ''} ${tipAttr(tipHtml + (o.disabled ? `<br><i>${esc(o.disabled)}</i>` : ''))}>
      <div class="an">${esc(o.label)} ${j ? natureChip(j.nature) : ''}</div>
      <div class="am">${o.disabled ? esc(o.disabled) : esc(meta).slice(0, 90)}</div>
    </button>`;
  }).join('')}</div>`;
}

function actionText(st, a) {
  const u = st.units[a.actor];
  const enemySide = 1 - u.side;
  const tname = (side) => {
    const uid = a.target && st.teams[side].slots[a.target.slot];
    return uid ? st.units[uid].name : '';
  };
  switch (a.type) {
    case 'jutsu': case 'kunai': {
      const j = E.getJutsu(a.jutsuId || 'kunai');
      const t = j.target === 'enemy' ? ` → ${tname(enemySide)}` : j.target === 'ally' ? ` → ${tname(u.side)}` : '';
      return `${j.name}${t}`;
    }
    case 'weaveRelease': return `Release ${E.getJutsu(u.weaving.jutsuId).name}`;
    case 'substitute': return SUBSTITUTIONS[u.substitution].name;
    case 'charge': return 'Charge Chakra';
    case 'gather': return 'Gather Intel';
    case 'guard': return 'Guard';
    case 'release': return 'Release genjutsu';
    case 'transform': return E.defOf(u).transformation.name;
    case 'swap': return 'Swap with reserve';
    case 'none': return 'Bound — no action';
    default: return a.type;
  }
}

function logHtml(entries) {
  return entries.map((l) => `<div class="l ${l.kind} ${l.side === 0 ? 's0' : l.side === 1 ? 's1' : ''}">${esc(l.text)}</div>`).join('');
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
  S.lastLog = [];
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
  if (S.step >= 2) return resolve();
  const side = S.order[S.step];
  // forced actions
  for (const u of E.onField(st, side)) {
    const opts = E.availableActions(st, u.uid);
    if (opts.length === 1 && (opts[0].type === 'none' || opts[0].type === 'weaveRelease')) {
      S.choices[side][u.uid] = { actor: u.uid, type: opts[0].type };
    }
  }
  if (S.mode === 'cpu' && side === 1) {
    for (const a of chooseActions(st, 1)) S.choices[1][a.actor] = a;
    S.step += 1;
    return nextStep();
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
    S.screen = 'select';
    render();
  };
  showPass(side, `Turn ${st.turn}: choose your orders.`, go);
}

function resolve() {
  const st = S.battle;
  const actions = [...Object.values(S.choices[0]), ...Object.values(S.choices[1])];
  S.lastLog = E.resolveTurn(st, actions) || [];
  S.screen = st.winner !== null ? 'over' : 'results';
  render();
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- actions
const ACTIONS = {
  startHotseat() { S.mode = 'hotseat'; S.names = ['Player 1', 'Player 2']; S.specs = [null, null]; newBuilder(0); render(); },
  startCpu() { S.mode = 'cpu'; S.names = ['Player 1', 'CPU']; S.specs = [null, randomTeam()]; newBuilder(0); render(); },
  toggleRules() { S.showRules = !S.showRules; render(); },
  backToTitle() { S.screen = 'title'; render(); },
  rename(v) { S.names[S.builder.side] = v.trim() || `Player ${S.builder.side + 1}`; },
  era(e) { S.builder.era = e; render(); },
  pick(id) {
    const b = S.builder;
    const s = SHINOBI_BY_ID[id];
    b.members[b.sel] = { id, loadout: [...s.defaultLoadout], substitution: s.substitutions[0] };
    const nextEmpty = b.members.findIndex((m) => !m);
    if (nextEmpty !== -1 && nextEmpty !== b.sel) {
      // stay on the filled slot only if everything is full
      b.lastFilled = b.sel;
      b.sel = nextEmpty;
    }
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
    if (S.screen !== 'select' || S.pending) return;
    if (S.battle.units[uid]?.side !== S.side) return;
    S.actor = uid; render();
  },
  chooseAction(i) {
    const st = S.battle;
    const u = st.units[S.actor];
    const o = E.availableActions(st, u.uid)[Number(i)];
    if (!o || o.disabled) return;
    const j = o.jutsuId ? E.getJutsu(o.jutsuId) : null;
    const action = { actor: u.uid, type: o.type, jutsuId: o.jutsuId };
    if (j && (j.target === 'enemy' || j.target === 'ally')) {
      const candidates = j.target === 'enemy' ? E.onField(st, 1 - S.side) : E.onField(st, S.side);
      if (candidates.length === 1) {
        action.target = { slot: E.slotOf(st, candidates[0]) };
      } else {
        S.pending = action; render(); return;
      }
    }
    commit(action);
  },
  target(slot) {
    if (!S.pending) return;
    const action = { ...S.pending, target: { slot: Number(slot) } };
    S.pending = null;
    commit(action);
  },
  cancelTarget() { S.pending = null; render(); },
  confirm() { S.step += 1; nextStep(); },
  nextTurn() { beginTurn(); },
  rematch() { startBattle(); },
  newTeams() {
    if (S.mode === 'cpu') S.specs[1] = randomTeam();
    newBuilder(0); render();
  },
};

function commit(action) {
  const st = S.battle;
  S.choices[S.side][action.actor] = action;
  const next = E.onField(st, S.side).find((u) => !S.choices[S.side][u.uid]);
  if (next) S.actor = next.uid;
  render();
}

render();
