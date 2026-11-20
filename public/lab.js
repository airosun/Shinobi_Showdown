// Jutsu Animation Lab: browse every jutsu and play its battle animation on a practice field.
import { SHINOBI, SHINOBI_BY_ID } from './data/shinobi.js';
import { JUTSU } from './data/jutsu.js';
import { ANIMS, playJutsu, playDecoy, poof, logSubstitute } from './anim.js';

const KUNAI = { id: 'kunai', name: 'Kunai & Shuriken', category: 'taijutsu', nature: null, power: 25, cost: 0, priority: 2, target: 'enemy', effects: [], desc: 'The basic thrown attack every shinobi has.' };
const USERS = {};
for (const s of SHINOBI) for (const id of s.catalogue) (USERS[id] ||= []).push(s.id);
const LIST = [KUNAI, ...Object.values(JUTSU).filter((j) => USERS[j.id])].sort((a, b) => a.name.localeCompare(b.name));
const BY_ID = Object.fromEntries(LIST.map((j) => [j.id, j]));
const FOES = ['kakashi_ship', 'gaara_ship', 'hinata_ship'];
const ALLIES = ['sakura_shippuden', 'naruto_ship', 'shikamaru_ship'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const S = { filter: 'custom', q: '', id: null, userIdx: 0, speed: 1, fromFoe: false, sprites: {} };
const app = document.getElementById('lab');

function list() {
  const q = S.q.toLowerCase();
  return LIST.filter((j) => (S.filter === 'all' || ANIMS[j.id]) && (!q || j.name.toLowerCase().includes(q) || (USERS[j.id] || []).some((id) => SHINOBI_BY_ID[id].name.toLowerCase().includes(q))));
}

function img(id, back) {
  const a = S.sprites[id];
  return a?.front ? `<img class="art" src="sprites/${a.front}" alt=""${back ? ' style="transform:scaleX(-1)"' : ''}>` : `<div class="lab-dot">${esc(SHINOBI_BY_ID[id]?.name?.[0] || '?')}</div>`;
}

function arenaHtml(j) {
  const users = USERS[j.id] || ['naruto_p1'];
  const caster = users[S.userIdx % users.length];
  const castTeam = [ALLIES[0], caster, ALLIES[2]].map((id, i) => (i !== 1 && id === caster ? ALLIES[1] : id));
  const otherTeam = FOES.map((id) => (id === caster ? 'kiba_ship' : id));
  const youIds = S.fromFoe ? otherTeam : castTeam; const foeIds = S.fromFoe ? castTeam : otherTeam;
  const side = (cls, ids) => ids.map((id, i) => `<div class="mon ${cls} p${i}" id="lab-${cls}-${i}"><div class="spr has-art">${img(id, cls === 'you')}</div></div>`).join('');
  return `<div class="plat foe"></div><div class="plat you"></div>${side('you', youIds)}${side('foe', foeIds)}`;
}

function render() {
  const items = list();
  if (!S.id || !BY_ID[S.id]) S.id = (items[0] || LIST[0]).id;
  const j = BY_ID[S.id];
  const a = ANIMS[j.id];
  const users = USERS[j.id] || [];
  const caster = users.length ? SHINOBI_BY_ID[users[S.userIdx % users.length]] : null;
  app.innerHTML = `
  <div class="lab-side">
    <div class="lab-tabs">
      <button class="${S.filter === 'custom' ? 'active' : ''}" data-act="filter" data-arg="custom">Custom (${Object.keys(ANIMS).length})</button>
      <button class="${S.filter === 'all' ? 'active' : ''}" data-act="filter" data-arg="all">All (${LIST.length})</button>
    </div>
    <input type="text" id="q" placeholder="Search jutsu or shinobi…" value="${esc(S.q)}">
    <div class="lab-list" data-keep>${items.map((x) => `<button class="lab-item ${x.id === j.id ? 'sel' : ''}" data-act="pick" data-arg="${x.id}">
      <span>${esc(x.name)}</span>${ANIMS[x.id] ? '<span class="tag">custom</span>' : ''}</button>`).join('') || '<div class="muted small" style="padding:8px">Nothing matches.</div>'}</div>
  </div>
  <div class="lab-main">
    <div class="lab-head">
      <div><div class="lab-name">${esc(j.name)}</div>
        <div class="muted small">${esc(j.category)} · ${j.nature ? esc(j.nature) : 'no nature'} · ${esc(j.target === 'allEnemies' ? 'all enemies' : j.target === 'allAllies' ? 'all allies' : j.target)}${caster ? ` · cast by <b>${esc(caster.name)}</b>` : ''}${users.length > 1 ? ` <button class="small ghost" data-act="nextUser">next user ›</button>` : ''}</div></div>
      <span class="grow"></span>
      <label class="small muted">Speed <select id="speed">${[[1, '1×'], [0.5, '2×'], [2, '½× (slow-mo)']].map(([v, l]) => `<option value="${v}" ${S.speed === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="small muted"><input type="checkbox" id="fromFoe" ${S.fromFoe ? 'checked' : ''}> Cast from the enemy side</label>
      ${a?.decoy ? '<button class="small" data-act="decoy">Hit the decoy</button>' : ''}
      <button class="primary" data-act="play">▶ Play</button>
    </div>
    <div class="arena lab-arena" id="arena">${arenaHtml(j)}</div>
    <div class="row small muted" style="margin:8px 0;gap:8px;align-items:center">When the caster is hit:
      <button class="small ghost" data-act="poof" title="What any clone or substitution without its own effect does when hit">Clone poof (smoke)</button>
      <button class="small ghost" data-act="logsub" title="Log Substitution being hit">Log Substitution</button></div>
    <div class="lab-info">
      <div><div class="lbl">${a ? 'Your animation request' : 'Animation'}</div>${a ? esc(a.desc) : 'Generic animation for its category (no custom request yet).'}</div>
      <div><div class="lbl">What it does</div>${esc(j.desc || '')}</div>
    </div>
  </div>`;
  const kept = sessionStorage.getItem('lab-scroll');
  const lst = app.querySelector('.lab-list'); if (lst && kept) lst.scrollTop = +kept;
}

function targetsFor(j) {
  const arena = document.getElementById('arena');
  const castCls = S.fromFoe ? 'foe' : 'you'; const otherCls = S.fromFoe ? 'you' : 'foe';
  const q = (cls, i) => arena.querySelector(`#lab-${cls}-${i} .spr`);
  const user = q(castCls, 1);
  const enemies = [0, 1, 2].map((i) => q(otherCls, i));
  const allies = [0, 1, 2].map((i) => q(castCls, i));
  const t = { enemy: [enemies[1]], allEnemies: enemies, self: [user], ally: [allies[0]], allAllies: allies }[j.target] || [enemies[1]];
  return { arena, user, targets: t, sideEls: j.target === 'enemy' || j.target === 'allEnemies' ? enemies : allies };
}

let playing = false;
async function play() {
  if (playing) { S.again = true; return; }
  playing = true; S.again = false;
  const j = BY_ID[S.id];
  const { arena, user, targets, sideEls } = targetsFor(j);
  await playJutsu(arena, j, user, targets, { sp: S.speed, sideEls, isFoe: S.fromFoe });
  await new Promise((r) => setTimeout(r, 400));
  playing = false;
  if (S.again) play();
}
function decoy() {
  const j = BY_ID[S.id];
  const { arena, user } = targetsFor(j);
  playDecoy(arena, j.id, user, { sp: S.speed });
}

app.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-act]');
  if (!b) return;
  const { act, arg } = b.dataset;
  if (act === 'pick') { sessionStorage.setItem('lab-scroll', app.querySelector('.lab-list').scrollTop); S.id = arg; S.userIdx = 0; render(); play(); }
  if (act === 'filter') { S.filter = arg; render(); }
  if (act === 'play') play();
  if (act === 'decoy') decoy();
  if (act === 'poof' || act === 'logsub') { const { arena, user } = targetsFor(BY_ID[S.id]); (act === 'poof' ? poof : logSubstitute)(arena, user, { sp: S.speed }); }
  if (act === 'nextUser') { S.userIdx += 1; render(); play(); }
});
app.addEventListener('input', (ev) => {
  if (ev.target.id === 'q') { S.q = ev.target.value; const pos = ev.target.selectionStart; render(); const n = document.getElementById('q'); n.focus(); n.setSelectionRange(pos, pos); }
});
app.addEventListener('change', (ev) => {
  if (ev.target.id === 'speed') { S.speed = +ev.target.value; }
  if (ev.target.id === 'fromFoe') { S.fromFoe = ev.target.checked; render(); play(); }
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select')) return;
  if (e.key === ' ') { e.preventDefault(); play(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const items = list(); const i = items.findIndex((x) => x.id === S.id);
    const n = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
    if (n) { S.id = n.id; S.userIdx = 0; render(); app.querySelector('.lab-item.sel')?.scrollIntoView({ block: 'nearest' }); play(); }
  }
});

fetch('sprites/manifest.json').then((r) => r.json()).then((m) => { S.sprites = m.sprites || {}; }).catch(() => {}).finally(() => { render(); setTimeout(play, 300); });
