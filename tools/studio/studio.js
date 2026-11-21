// Sprite & Animation Studio: edit the drawn animation pieces and tune each jutsu's animation.
// Edits are kept in this artifact (db + assets) and exported as files for the game repo:
//   images  -> public/img/<piece>.png
//   tweaks  -> public/data/anim_tweaks.json
import { SHINOBI, SHINOBI_BY_ID } from './data/shinobi.js';
import { JUTSU } from './data/jutsu.js';
import { ANIMS, playJutsu, poisonBubbles } from './anim.js';
import * as FX from './fx.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = (id) => document.getElementById(id);
const app = $('studio');

// ------------------------------------------------------------------ data
const KUNAI = { id: 'kunai', name: 'Kunai & Shuriken', category: 'taijutsu', nature: null, power: 25, cost: 0, priority: 2, target: 'enemy', effects: [], desc: 'The basic thrown attack every shinobi has.' };
const USERS = {};
for (const s of SHINOBI) for (const id of s.catalogue) (USERS[id] ||= []).push(s.id);
const JLIST = [KUNAI, ...Object.values(JUTSU).filter((j) => USERS[j.id])].sort((a, b) => a.name.localeCompare(b.name));
const JBY = Object.fromEntries(JLIST.map((j) => [j.id, j]));
const FOES = ['kakashi_ship', 'gaara_ship', 'hinata_ship'];
const ALLIES = ['sakura_shippuden', 'naruto_ship', 'shikamaru_ship'];
const jname = (id) => JBY[id]?.name || ({ clone_poof: 'Clone poof', log_substitution: 'Log Substitution', misc: 'Battle effects' }[id] || id);

const S = {
  tab: 'anim',
  pieces: [], byName: {},      // catalogue of every drawn piece
  repoImgs: new Set(),         // custom images already in the game repo (public/img)
  saved: {},                   // name -> {image, layers, updatedAt} saved in this studio
  tweaks: {},                  // jutsu id -> {speed, pieces:{}}
  sprites: {},                 // shinobi battle sprites manifest
  // animation tab
  jid: 'tailed_beast_bomb', jq: '', jfilter: 'custom', userIdx: 0, piece: null, loop: false, highlight: true, seen: {},
  // image tab
  iq: '', ifilter: 'all', edit: null,
};
let db = null; let assets = null; let downloads = null;

// ------------------------------------------------------------------ helpers
function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('hidden'), ms); }
function setSaveState(txt) { $('saveState').textContent = txt; }
const blobUrl = (id) => `/_blob/${id}`;
function pieceThumb(p, box = 46) {
  const url = customUrl(p.name);
  if (url) return `<span class="thumb" style="width:${box}px;height:${box}px"><img src="${esc(url)}" alt=""></span>`;
  const k = Math.min(3, box / Math.max(p.w, 1), box / Math.max(p.h, 1));
  return `<span class="thumb" style="width:${box}px;height:${box}px"><span class="tscale" style="transform:scale(${k.toFixed(3)})">${p.html}</span></span>`;
}
function customUrl(name) {
  if (S.saved[name]?.image) return blobUrl(S.saved[name].image);
  if (S.repoImgs.has(name)) return `img/${S.repoFiles[name]}`;
  return null;
}
function piecesFor(jid) {
  const set = new Set(S.pieces.filter((p) => p.uses.includes(jid)).map((p) => p.name));
  for (const n of Object.keys(S.seen[jid] || {})) set.add(n);
  return [...set].map((n) => S.byName[n] || { name: n, w: 60, h: 60, html: '', uses: [jid] });
}

// ------------------------------------------------------------------ persistence
let writeChain = Promise.resolve();
const pendingTweak = {};
function saveTweak(jid) {
  // coalesce bursts of slider input into one write per pause
  clearTimeout(pendingTweak[jid]);
  pendingTweak[jid] = setTimeout(() => {
    const body = S.tweaks[jid] ? JSON.parse(JSON.stringify(S.tweaks[jid])) : null;
    if (!db) { setSaveState('Not saved — this view can’t store changes (use Export)'); return; }
    setSaveState('Saving…');
    writeChain = writeChain.then(async () => {
      try {
        const ref = db.doc(`tweaks/${jid}`);
        if (body && (Object.keys(body.pieces || {}).length || (body.speed && body.speed !== 1))) await ref.set({ ...body, updatedAt: new Date().toISOString() });
        else await ref.delete();
        setSaveState('All changes saved');
      } catch (e) { setSaveState(`Couldn’t save (${e?.code || 'error'})`); }
    });
  }, 600);
}

async function loadStore() {
  try { db = await window.claude?.use?.('db'); } catch { db = null; }
  try { assets = await window.claude?.use?.('assets'); } catch { assets = null; }
  try { downloads = await window.claude?.use?.('downloads'); } catch { downloads = null; }
  if (!db) { setSaveState('Changes stay in this tab only (use Export to keep them)'); return; }
  const timer = setTimeout(() => setSaveState('Couldn’t reach saved changes yet…'), 10000);
  try {
    const [sp, tw] = await Promise.all([db.collection('sprites').get(), db.collection('tweaks').get()]);
    for (const d of sp.docs) { const v = d.data(); if (v?.image) { S.saved[d.id] = v; FX.setSpriteOverride(d.id, blobUrl(v.image)); } }
    for (const d of tw.docs) { const v = d.data(); if (v) { const { updatedAt, ...rest } = v; S.tweaks[d.id] = rest; } }
    FX.setAnimTweaks(S.tweaks);
    clearTimeout(timer);
    setSaveState(Object.keys(S.saved).length || tw.size ? `${Object.keys(S.saved).length} image(s) and ${tw.size} animation(s) edited` : 'Ready');
    render();
  } catch (e) { clearTimeout(timer); setSaveState(`Couldn’t load saved changes (${e?.code || 'error'})`); }
}

// ------------------------------------------------------------------ render shell
function render() {
  document.querySelectorAll('.st-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.arg === S.tab));
  if (S.tab === 'anim') renderAnim(); else renderImage();
}

// ================================================================== ANIMATION TAB
const SLIDERS = [
  ['scale', 'Size', 10, 400, 100, '%'],
  ['dx', 'Move left / right', -300, 300, 0, 'px'],
  ['dy', 'Move up / down', -300, 300, 0, 'px'],
  ['rotate', 'Rotate', -180, 180, 0, '°'],
  ['hue', 'Colour shift', -180, 180, 0, '°'],
  ['sat', 'Saturation', 0, 300, 100, '%'],
  ['bright', 'Brightness', 0, 300, 100, '%'],
  ['opacity', 'Opacity', 0, 100, 100, '%'],
];
const tw = (jid) => (S.tweaks[jid] ||= { speed: 1, pieces: {} });

function jlist() {
  const q = S.jq.toLowerCase();
  return JLIST.filter((j) => (S.jfilter === 'all' || (S.jfilter === 'custom' ? ANIMS[j.id] : S.tweaks[j.id])) && (!q || j.name.toLowerCase().includes(q) || j.id.includes(q) || (USERS[j.id] || []).some((id) => SHINOBI_BY_ID[id].name.toLowerCase().includes(q))));
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
  const side = (cls, ids) => ids.map((id, i) => `<div class="mon ${cls} p${i}" id="st-${cls}-${i}"><div class="spr has-art">${img(id, cls === 'you')}</div></div>`).join('');
  return `<div class="plat foe"></div><div class="plat you"></div>${side('you', castTeam)}${side('foe', otherTeam)}`;
}

function renderAnim() {
  const items = jlist();
  if (!JBY[S.jid]) S.jid = items[0]?.id || JLIST[0].id;
  const j = JBY[S.jid];
  const t = S.tweaks[j.id];
  const pcs = piecesFor(j.id);
  if (S.piece && !pcs.some((p) => p.name === S.piece)) S.piece = null;
  if (!S.piece && pcs.length) S.piece = pcs[0].name;
  const pt = (t?.pieces || {})[S.piece] || {};
  const users = USERS[j.id] || [];
  const caster = users.length ? SHINOBI_BY_ID[users[S.userIdx % users.length]] : null;
  const speed = t?.speed || 1;
  app.className = 'st-anim';
  app.innerHTML = `
  <aside class="st-side">
    <div class="lab-tabs">
      <button class="${S.jfilter === 'custom' ? 'active' : ''}" data-act="jfilter" data-arg="custom">Custom</button>
      <button class="${S.jfilter === 'edited' ? 'active' : ''}" data-act="jfilter" data-arg="edited">Edited (${Object.keys(S.tweaks).filter((k) => S.tweaks[k] && (Object.keys(S.tweaks[k].pieces || {}).length || S.tweaks[k].speed !== 1)).length})</button>
      <button class="${S.jfilter === 'all' ? 'active' : ''}" data-act="jfilter" data-arg="all">All</button>
    </div>
    <input type="text" id="jq" placeholder="Search jutsu or shinobi…" value="${esc(S.jq)}">
    <div class="lab-list" id="jlist">${items.map((x) => `<button class="lab-item ${x.id === j.id ? 'sel' : ''}" data-act="pickJ" data-arg="${x.id}"><span>${esc(x.name)}</span>${S.tweaks[x.id] && (Object.keys(S.tweaks[x.id].pieces || {}).length || S.tweaks[x.id].speed !== 1) ? '<span class="tag ed">edited</span>' : ''}</button>`).join('') || '<div class="muted small" style="padding:8px">Nothing matches.</div>'}</div>
  </aside>
  <section class="st-center">
    <div class="lab-head">
      <div><div class="lab-name">${esc(j.name)}</div>
        <div class="muted small">${caster ? `cast by <b>${esc(caster.name)}</b>` : ''}${users.length > 1 ? ` <button class="small ghost" data-act="nextUser">next user ›</button>` : ''}${ANIMS[j.id] ? '' : ' · uses the generic animation for its type'}</div></div>
      <span class="grow"></span>
      <label class="small muted"><input type="checkbox" id="loop" ${S.loop ? 'checked' : ''}> Loop</label>
      <label class="small muted"><input type="checkbox" id="hl" ${S.highlight ? 'checked' : ''}> Outline selected piece</label>
      <button class="primary" data-act="play">▶ Play</button>
    </div>
    <div class="arena lab-arena" id="arena">${arenaHtml(j)}</div>
    <div class="st-pieces">
      <div class="lbl">Pieces in this animation <span class="muted small">— pick one to adjust it</span></div>
      <div class="strip">${pcs.map((p) => `<button class="pc ${p.name === S.piece ? 'sel' : ''} ${(t?.pieces || {})[p.name] ? 'ed' : ''}" data-act="pickPiece" data-arg="${esc(p.name)}" title="${esc(p.name)}">${pieceThumb(p)}<span class="pn">${esc(p.name)}</span></button>`).join('') || '<span class="muted small">Play the animation to list its pieces.</span>'}</div>
    </div>
  </section>
  <aside class="st-panel">
    <div class="sect">
      <h3>Whole animation</h3>
      <div class="sl"><label>Speed <b id="v-speed">${Math.round(speed * 100)}%</b></label><input type="range" id="speed" min="25" max="300" step="5" value="${Math.round(speed * 100)}"></div>
      <div class="muted small">100% = as drawn. 200% plays twice as fast.</div>
      <div class="row"><button class="small ghost" data-act="resetJutsu" ${t ? '' : 'disabled'}>Reset this animation</button></div>
    </div>
    ${S.piece ? `<div class="sect">
      <h3>Piece: <code>${esc(S.piece)}</code></h3>
      ${(S.byName[S.piece]?.uses?.length || 0) > 1 ? `<div class="muted small">Shared piece — these settings only change it in <b>${esc(j.name)}</b>.</div>` : ''}
      ${SLIDERS.map(([k, label, min, max, def, unit]) => `<div class="sl"><label>${label} <b id="v-${k}">${pt[k] ?? def}${unit}</b></label><input type="range" data-tw="${k}" min="${min}" max="${max}" step="1" value="${pt[k] ?? def}"></div>`).join('')}
      <div class="row chk">
        <label><input type="checkbox" data-twc="flipX" ${pt.flipX ? 'checked' : ''}> Flip ↔</label>
        <label><input type="checkbox" data-twc="flipY" ${pt.flipY ? 'checked' : ''}> Flip ↕</label>
        <label><input type="checkbox" data-twc="hide" ${pt.hide ? 'checked' : ''}> Hide</label>
      </div>
      <div class="row"><button class="small ghost" data-act="resetPiece" ${Object.keys(pt).length ? '' : 'disabled'}>Reset piece</button><span class="grow"></span><button class="small" data-act="editImage" data-arg="${esc(S.piece)}">🖌️ Edit its image ›</button></div>
    </div>` : ''}
    <div class="sect muted small">Changes save automatically. When you're happy, use <b>Export all changes</b> (top right) — or just tell me in the chat and I'll put the animation changes in the game for you.</div>
  </aside>`;
  const lst = $('jlist'); const sel = lst?.querySelector('.sel'); if (sel && S._scrollToSel) { sel.scrollIntoView({ block: 'nearest' }); S._scrollToSel = false; }
  if (S._jlScroll != null && lst) { lst.scrollTop = S._jlScroll; S._jlScroll = null; }
}

// live elements of each piece in the playing animation, so slider moves show immediately
const LIVE = new Map(); // name -> Set of {el, base}
FX.onSpritePlaced((el, name, jid) => {
  if (!jid) return;
  const seen = (S.seen[jid] ||= {});
  const isNew = !seen[name] && !S.pieces.some((p) => p.name === name && p.uses.includes(jid));
  seen[name] = true;
  // remember the element's own transform-ish styles before tweaks, to re-apply live
  if (!LIVE.has(name)) LIVE.set(name, new Set());
  LIVE.get(name).add({ el, base: { scale: '', rotate: '', translate: '', filter: (el.style.filter || '').replace(/ ?(hue-rotate|saturate|brightness|opacity)\([^)]*\)/g, '').trim(), visibility: '' } });
  if (S.highlight && jid === S.jid && name === S.piece) el.classList.add('st-hl');
  if (isNew && S.tab === 'anim' && jid === S.jid) S._needsStrip = true;
});
function liveApply(name) {
  const t = S.tweaks[S.jid]?.pieces?.[name] || {};
  for (const rec of LIVE.get(name) || []) {
    const { el, base } = rec;
    if (!el.isConnected) { LIVE.get(name).delete(rec); continue; }
    el.style.scale = base.scale; el.style.rotate = base.rotate; el.style.translate = base.translate; el.style.filter = base.filter; el.style.visibility = base.visibility;
    // reuse the game's own tweak code through a fresh apply on just this element
    const sc = (t.scale ?? 100) / 100;
    if (t.hide) { el.style.visibility = 'hidden'; continue; }
    if (sc !== 1 || t.flipX || t.flipY) el.style.scale = `${sc * (t.flipX ? -1 : 1)} ${sc * (t.flipY ? -1 : 1)}`;
    if (t.rotate) el.style.rotate = `${t.rotate}deg`;
    if (t.dx || t.dy) el.style.translate = `${t.dx || 0}px ${t.dy || 0}px`;
    const f = [];
    if (t.hue) f.push(`hue-rotate(${t.hue}deg)`);
    if (t.sat != null && t.sat !== 100) f.push(`saturate(${t.sat}%)`);
    if (t.bright != null && t.bright !== 100) f.push(`brightness(${t.bright}%)`);
    if (t.opacity != null && t.opacity !== 100) f.push(`opacity(${t.opacity}%)`);
    if (f.length) el.style.filter = `${base.filter} ${f.join(' ')}`.trim();
  }
}
function clean(jid) {
  const t = S.tweaks[jid];
  if (!t) return;
  for (const [n, p] of Object.entries(t.pieces || {})) {
    for (const [k, def] of [['scale', 100], ['dx', 0], ['dy', 0], ['rotate', 0], ['hue', 0], ['sat', 100], ['bright', 100], ['opacity', 100], ['flipX', false], ['flipY', false], ['hide', false]]) if (p[k] === def || p[k] == null) delete p[k];
    if (!Object.keys(p).length) delete t.pieces[n];
  }
  if (!Object.keys(t.pieces || {}).length && (t.speed || 1) === 1) delete S.tweaks[jid];
  FX.setAnimTweaks(S.tweaks);
}

function targetsFor(j) {
  const arena = $('arena');
  const q = (cls, i) => arena.querySelector(`#st-${cls}-${i} .spr`);
  const user = q('you', 1);
  const enemies = [0, 1, 2].map((i) => q('foe', i));
  const allies = [0, 1, 2].map((i) => q('you', i));
  const t = { enemy: [enemies[1]], allEnemies: enemies, self: [user], ally: [allies[0]], allAllies: allies }[j.target] || [enemies[1]];
  return { arena, user, targets: t, sideEls: j.target === 'enemy' || j.target === 'allEnemies' ? enemies : allies };
}
let playing = false;
async function play() {
  if (S.tab !== 'anim') return;
  if (playing) { S.again = true; return; }
  playing = true; S.again = false;
  LIVE.clear();
  const j = JBY[S.jid];
  const arena = $('arena');
  if (arena) {
    arena.querySelectorAll('.ax, .fx').forEach((n) => n.remove());
    arena.innerHTML = arenaHtml(j);
    const { user, targets, sideEls } = targetsFor(j);
    try {
      await playJutsu(arena, j, user, targets, { sp: 1, sideEls });
      if (j.effects?.some((e) => e.type === 'poison')) targets.forEach((t) => poisonBubbles(arena, t, { sp: 1 }));
    } catch (e) { console.error(e); }
  }
  await new Promise((r) => setTimeout(r, 450));
  playing = false;
  if (S._needsStrip) { S._needsStrip = false; S._jlScroll = $('jlist')?.scrollTop; renderAnim(); }
  if (S.again || (S.loop && S.tab === 'anim')) play();
}

// ================================================================== IMAGE TAB
function ilist() {
  const q = S.iq.toLowerCase();
  return S.pieces.filter((p) => (S.ifilter === 'all' || customUrl(p.name)) && (!q || p.name.toLowerCase().includes(q) || p.uses.some((u) => jname(u).toLowerCase().includes(q) || u.includes(q))));
}
function renderImage() {
  app.className = 'st-image';
  const items = ilist();
  const E = S.edit;
  app.innerHTML = `
  <aside class="st-side">
    <div class="lab-tabs">
      <button class="${S.ifilter === 'all' ? 'active' : ''}" data-act="ifilter" data-arg="all">All (${S.pieces.length})</button>
      <button class="${S.ifilter === 'custom' ? 'active' : ''}" data-act="ifilter" data-arg="custom">Customised (${S.pieces.filter((p) => customUrl(p.name)).length})</button>
    </div>
    <input type="text" id="iq" placeholder="Search piece or jutsu…" value="${esc(S.iq)}">
    <div class="pc-list" id="plist">${items.map((p) => `<button class="pcrow ${E?.name === p.name ? 'sel' : ''}" data-act="openPiece" data-arg="${esc(p.name)}">${pieceThumb(p, 40)}<span><b>${esc(p.name)}</b><span class="muted small">${esc(p.uses.slice(0, 3).map(jname).join(', '))}${p.uses.length > 3 ? ` +${p.uses.length - 3}` : ''}</span></span>${S.saved[p.name] ? '<span class="tag ed">studio</span>' : S.repoImgs.has(p.name) ? '<span class="tag">yours</span>' : ''}</button>`).join('')}</div>
  </aside>
  ${E ? editorHtml(E) : `<section class="st-empty"><div><h2>Pick a piece to edit</h2><p class="muted">Every drawn part of every jutsu animation is listed on the left. Open one to paint over my drawing, start from scratch, or import your own picture. Saved images show up straight away in the Animations tab.</p></div></section>`}`;
  if (E) rebuildEditorView();
  if (S._plScroll != null) { $('plist').scrollTop = S._plScroll; S._plScroll = null; }
}

function editorHtml(E) {
  const p = S.byName[E.name];
  return `<section class="st-center ed-center">
    <div class="lab-head">
      <div><div class="lab-name"><code>${esc(E.name)}.png</code></div><div class="muted small">${E.W} × ${E.H} canvas · shows in the game at ${p.w} × ${p.h} · used by ${esc(p.uses.slice(0, 4).map(jname).join(', '))}${p.uses.length > 4 ? ` and ${p.uses.length - 4} more` : ''}</div></div>
      <span class="grow"></span>
      <button class="small ghost" data-act="testPiece">▶ Test in animation</button>
      <button class="primary" data-act="saveImage">💾 Save</button>
    </div>
    <div class="tools">
      ${[['brush', '🖌️', 'Brush (B)'], ['eraser', '🩹', 'Eraser (E)'], ['fill', '🪣', 'Fill (G)'], ['picker', '💧', 'Colour picker (I)'], ['move', '✥', 'Move layer (M)']].map(([k, ic, t]) => `<button class="tool ${E.tool === k ? 'on' : ''}" data-act="tool" data-arg="${k}" title="${t}">${ic}</button>`).join('')}
      <input type="color" id="color" value="${E.color}" title="Colour">
      <label class="small">Size <input type="range" id="bsize" min="1" max="200" value="${E.size}"><b id="v-bsize">${E.size}</b></label>
      <label class="small">Opacity <input type="range" id="bop" min="1" max="100" value="${E.alpha}"><b id="v-bop">${E.alpha}%</b></label>
      <span class="sep"></span>
      <button class="small" data-act="undo" title="Undo (Ctrl+Z)">↶</button><button class="small" data-act="redo" title="Redo (Ctrl+Shift+Z)">↷</button>
      <span class="sep"></span>
      <button class="small" data-act="zoom" data-arg="-1">−</button><b id="v-zoom">${Math.round(E.zoom * 100)}%</b><button class="small" data-act="zoom" data-arg="1">+</button><button class="small ghost" data-act="zoom" data-arg="0">Fit</button>
      <label class="small"><input type="checkbox" id="ghost" ${E.ghost ? 'checked' : ''}> Show my drawing underneath</label>
      <label class="small"><input type="checkbox" id="dark" ${E.dark ? 'checked' : ''}> Dark backdrop</label>
    </div>
    <div class="stage ${E.dark ? 'dark' : ''}" id="stage"><div class="stage-in" id="stageIn"><canvas id="ghostCv"></canvas><canvas id="view"></canvas></div></div>
  </section>
  <aside class="st-panel">
    <div class="sect">
      <h3>Layers</h3>
      <div class="layers" id="layers"></div>
      <div class="row wrap"><button class="small" data-act="addLayer">+ Layer</button><button class="small" data-act="dupLayer">Duplicate</button><button class="small" data-act="layerUp">▲</button><button class="small" data-act="layerDown">▼</button><button class="small ghost" data-act="clearLayer">Clear</button><button class="small ghost" data-act="delLayer">Delete</button></div>
      <div class="sl"><label>Layer opacity <b id="v-lop">${Math.round((E.layers[E.active]?.opacity ?? 1) * 100)}%</b></label><input type="range" id="lop" min="0" max="100" value="${Math.round((E.layers[E.active]?.opacity ?? 1) * 100)}"></div>
    </div>
    <div class="sect">
      <h3>Start from</h3>
      <div class="row wrap"><button class="small" data-act="addFrom" data-arg="orig">My drawing</button>${customUrl(E.name) ? '<button class="small" data-act="addFrom" data-arg="custom">Current custom image</button>' : ''}<button class="small" data-act="importImg">Import picture…</button><input type="file" id="importFile" accept="image/*" hidden></div>
      <div class="muted small">Each adds a new layer, so nothing you've painted is lost.</div>
    </div>
    <div class="sect">
      <h3>Save &amp; export</h3>
      <div class="row wrap"><button class="small" data-act="downloadPng">⬇ Download ${esc(E.name)}.png</button>${S.saved[E.name] ? '<button class="small ghost" data-act="revertPiece">Remove studio image</button>' : ''}</div>
      <div class="muted small">Save keeps it here with its layers and shows it in the Animations tab. To put it in the game, upload the PNG to <code>public/img/</code> on GitHub (or use Export all changes).</div>
    </div>
  </aside>`;
}

// ---------------------------------------------------------------- editor model
function editorSize(p) {
  let W = p.w * 2; let H = p.h * 2;
  const k = Math.min(1, 1024 / Math.max(W, H));
  W *= k; H *= k;
  const m = Math.max(1, 96 / Math.min(W, H));
  if (m > 1 && Math.max(W, H) * m <= 1024) { W *= m; H *= m; }
  return { W: Math.max(16, Math.round(W)), H: Math.max(16, Math.round(H)) };
}
function newLayer(E, name) { const c = document.createElement('canvas'); c.width = E.W; c.height = E.H; return { id: Math.random().toString(36).slice(2), name, canvas: c, ctx: c.getContext('2d', { willReadFrequently: true }), visible: true, opacity: 1 }; }

const SESSIONS = {}; // open pictures keep their layers and undo history while you switch between them
async function openPiece(name) {
  const p = S.byName[name];
  if (!p) return;
  S._plScroll = $('plist')?.scrollTop;
  if (SESSIONS[name]) { S.edit = SESSIONS[name]; renderImage(); setTimeout(fitZoom, 0); return; }
  const { W, H } = editorSize(p);
  const E = { name, W, H, layers: [], active: 0, tool: 'brush', color: S.edit?.color || '#ffffff', size: S.edit?.size || 12, alpha: S.edit?.alpha || 100, zoom: 1, ghost: false, dark: true, undo: [], redo: [], dirty: false };
  S.edit = E; SESSIONS[name] = E;
  renderImage();
  const saved = S.saved[name];
  if (saved?.layers?.length) {
    for (const L of saved.layers) {
      const l = newLayer(E, L.name || 'Layer'); l.opacity = L.opacity ?? 1; l.visible = L.visible !== false;
      await drawUrlInto(l, blobUrl(L.id));
      E.layers.push(l);
    }
  } else if (customUrl(name)) {
    const l = newLayer(E, 'Custom image'); await drawUrlInto(l, customUrl(name)); E.layers.push(l);
  } else {
    const l = newLayer(E, 'My drawing'); await drawOriginal(l, p); E.layers.push(l);
  }
  E.layers.push(newLayer(E, 'Paint'));
  E.active = E.layers.length - 1;
  if (S.edit === E) { fitZoom(); composite(); renderLayers(); }
}

function loadImg(url) { return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = url; }); }
async function drawUrlInto(l, url) {
  try { const im = await loadImg(url); drawContain(l.ctx, im, l.canvas.width, l.canvas.height); } catch { toast('Couldn’t load that image'); }
}
function drawContain(ctx, im, W, H) {
  // trim transparent edges first so the picture fills the frame like it does in the game
  const iw = im.naturalWidth || im.width; const ih = im.naturalHeight || im.height;
  const k = Math.min(W / iw, H / ih);
  const w = iw * k; const h = ih * k;
  ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
}
async function drawOriginal(l, p, isGhost = false) {
  const W = l.canvas.width; const H = l.canvas.height;
  if (isGhost) l.ctx.clearRect(0, 0, W, H);
  const holder = document.createElement('div');
  holder.className = 'st-render';
  holder.innerHTML = p.html;
  const el = holder.firstElementChild;
  if (!el) return;
  document.body.appendChild(holder);
  try {
    if (el.tagName.toLowerCase() === 'svg') {
      el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      if (!el.getAttribute('width')) el.setAttribute('width', p.w);
      if (!el.getAttribute('height')) el.setAttribute('height', p.h);
      el.removeAttribute('class'); el.style.transform = ''; el.style.animation = 'none';
      const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(el))}`;
      const im = await loadImg(src);
      l.ctx.drawImage(im, 0, 0, W, H);
    } else if (window.html2canvas) {
      el.style.animation = 'none'; el.style.opacity = '1'; el.style.transform = 'none'; el.style.position = 'relative'; el.style.left = '0'; el.style.top = '0';
      if (!el.style.width) el.style.width = `${p.w}px`;
      if (!el.style.height) el.style.height = `${p.h}px`;
      // the browser's own renderer (via SVG foreignObject) handles gradients that html2canvas can't
      let cv = null;
      try { cv = await window.html2canvas(el, { backgroundColor: null, scale: Math.max(W / p.w, 0.1), logging: false, foreignObjectRendering: true }); cv.getContext('2d').getImageData(0, 0, 1, 1); } catch { cv = null; }
      if (!cv) cv = await window.html2canvas(el, { backgroundColor: null, scale: Math.max(W / p.w, 0.1), logging: false });
      l.ctx.drawImage(cv, 0, 0, W, H);
    }
  } catch (e) { console.warn('render original', e); }
  holder.remove();
}

function composite() {
  const E = S.edit; const v = $('view');
  if (!E || !v) return;
  if (v.width !== E.W) { v.width = E.W; v.height = E.H; }
  const g = v.getContext('2d');
  g.clearRect(0, 0, E.W, E.H);
  E.layers.forEach((l, i) => {
    if (!l.visible) return;
    g.globalAlpha = l.opacity;
    g.drawImage(l.canvas, l.ox || 0, l.oy || 0);
    if (i === E.active && E.stroke) { g.globalAlpha = l.opacity * (E.alpha / 100); g.drawImage(E.stroke.canvas, 0, 0); }
  });
  g.globalAlpha = 1;
  $('ghostCv').style.display = E.ghost ? 'block' : 'none';
}
function flatten() {
  const E = S.edit; const c = document.createElement('canvas'); c.width = E.W; c.height = E.H;
  const g = c.getContext('2d');
  for (const l of E.layers) if (l.visible) { g.globalAlpha = l.opacity; g.drawImage(l.canvas, 0, 0); }
  return c;
}
function renderLayers() {
  const E = S.edit; const box = $('layers');
  if (!E || !box) return;
  box.innerHTML = E.layers.map((l, i) => ({ l, i })).reverse().map(({ l, i }) => `<div class="layer ${i === E.active ? 'on' : ''}" data-act="pickLayer" data-arg="${i}">
    <button class="eye" data-act="toggleLayer" data-arg="${i}" title="Show / hide">${l.visible ? '👁' : '—'}</button>
    <canvas width="40" height="40" data-li="${i}"></canvas><span>${esc(l.name)}</span><span class="muted small">${Math.round(l.opacity * 100)}%</span></div>`).join('');
  box.querySelectorAll('canvas[data-li]').forEach((c) => { const l = E.layers[+c.dataset.li]; const g = c.getContext('2d'); const k = Math.min(40 / E.W, 40 / E.H); g.drawImage(l.canvas, (40 - E.W * k) / 2, (40 - E.H * k) / 2, E.W * k, E.H * k); });
  const lop = $('lop'); if (lop) { lop.value = Math.round((E.layers[E.active]?.opacity ?? 1) * 100); $('v-lop').textContent = `${lop.value}%`; }
}
function fitZoom() {
  const E = S.edit; const st = $('stage');
  if (!E || !st) return;
  const r = st.getBoundingClientRect();
  E.zoom = clamp(Math.min((r.width - 40) / E.W, (r.height - 40) / E.H), 0.1, 16);
  applyZoom();
}
function applyZoom() {
  const E = S.edit; const inner = $('stageIn');
  if (!inner) return;
  inner.style.width = `${E.W * E.zoom}px`; inner.style.height = `${E.H * E.zoom}px`;
  for (const id of ['view', 'ghostCv']) { const c = $(id); c.style.width = `${E.W * E.zoom}px`; c.style.height = `${E.H * E.zoom}px`; }
  const z = $('v-zoom'); if (z) z.textContent = `${Math.round(E.zoom * 100)}%`;
}

// undo / redo: pixel snapshots of one layer, or the whole layer stack for structural changes
function pushUndo(entry) { const E = S.edit; E.undo.push(entry); if (E.undo.length > 30) E.undo.shift(); E.redo = []; E.dirty = true; }
function snapPixels(i) { const l = S.edit.layers[i]; return { type: 'px', layer: l, data: l.ctx.getImageData(0, 0, S.edit.W, S.edit.H), ox: l.ox || 0, oy: l.oy || 0 }; }
function snapStruct() { const E = S.edit; return { type: 'st', layers: [...E.layers], active: E.active, props: E.layers.map((l) => ({ l, opacity: l.opacity, visible: l.visible })) }; }
function restore(entry) {
  const E = S.edit;
  if (entry.type === 'px') {
    const cur = { type: 'px', layer: entry.layer, data: entry.layer.ctx.getImageData(0, 0, E.W, E.H), ox: entry.layer.ox || 0, oy: entry.layer.oy || 0 };
    entry.layer.ctx.putImageData(entry.data, 0, 0); entry.layer.ox = entry.ox; entry.layer.oy = entry.oy;
    return cur;
  }
  const cur = snapStruct();
  E.layers = [...entry.layers]; E.active = clamp(entry.active, 0, E.layers.length - 1);
  for (const pr of entry.props) { pr.l.opacity = pr.opacity; pr.l.visible = pr.visible; }
  return cur;
}
function undo() { const E = S.edit; if (!E?.undo.length) return; E.redo.push(restore(E.undo.pop())); composite(); renderLayers(); }
function redo() { const E = S.edit; if (!E?.redo.length) return; E.undo.push(restore(E.redo.pop())); composite(); renderLayers(); }

// ---------------------------------------------------------------- painting
function canvasPos(e) {
  const E = S.edit; const r = $('view').getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * E.W, y: ((e.clientY - r.top) / r.height) * E.H };
}
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function floodFill(l, x, y, hex, alpha) {
  const E = S.edit; const W = E.W; const H = E.H;
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const img = l.ctx.getImageData(0, 0, W, H); const d = img.data;
  const i0 = (y * W + x) * 4; const t = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
  const [r, g, b] = hexToRgb(hex); const a = Math.round(255 * alpha);
  const tol = 40;
  const match = (i) => Math.abs(d[i] - t[0]) <= tol && Math.abs(d[i + 1] - t[1]) <= tol && Math.abs(d[i + 2] - t[2]) <= tol && Math.abs(d[i + 3] - t[3]) <= tol;
  if (t[0] === r && t[1] === g && t[2] === b && t[3] === a) return;
  const seen = new Uint8Array(W * H); const stack = [[x, y]];
  while (stack.length) {
    let [cx, cy] = stack.pop();
    while (cx >= 0 && !seen[cy * W + cx] && match((cy * W + cx) * 4)) cx -= 1;
    cx += 1;
    let up = false; let down = false;
    while (cx < W && !seen[cy * W + cx] && match((cy * W + cx) * 4)) {
      const i = (cy * W + cx) * 4; seen[cy * W + cx] = 1;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
      if (cy > 0) { const m = !seen[(cy - 1) * W + cx] && match(((cy - 1) * W + cx) * 4); if (m && !up) { stack.push([cx, cy - 1]); up = true; } else if (!m) up = false; }
      if (cy < H - 1) { const m = !seen[(cy + 1) * W + cx] && match(((cy + 1) * W + cx) * 4); if (m && !down) { stack.push([cx, cy + 1]); down = true; } else if (!m) down = false; }
      cx += 1;
    }
  }
  l.ctx.putImageData(img, 0, 0);
}
function mountEditor() {
  const v = $('view'); const E = S.edit;
  if (!v || v._mounted) return;
  v._mounted = true;
  v.width = E.W; v.height = E.H; $('ghostCv').width = E.W; $('ghostCv').height = E.H;
  let drawing = false; let last = null; let moveStart = null;
  v.addEventListener('pointerdown', (e) => {
    const l = E.layers[E.active]; if (!l) return;
    if (!l.visible) { toast('That layer is hidden — show it to paint on it'); return; }
    v.setPointerCapture(e.pointerId);
    const p = canvasPos(e);
    if (E.tool === 'picker') {
      const px = flatten().getContext('2d').getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
      if (px[3]) { E.color = `#${[px[0], px[1], px[2]].map((n) => n.toString(16).padStart(2, '0')).join('')}`; $('color').value = E.color; }
      return;
    }
    if (E.tool === 'fill') { pushUndo(snapPixels(E.active)); floodFill(l, p.x, p.y, E.color, E.alpha / 100); composite(); renderLayers(); return; }
    if (E.tool === 'move') { pushUndo(snapPixels(E.active)); moveStart = { p, ox: l.ox || 0, oy: l.oy || 0 }; drawing = true; return; }
    pushUndo(snapPixels(E.active));
    drawing = true; last = p;
    if (E.tool === 'brush') { const c = document.createElement('canvas'); c.width = E.W; c.height = E.H; E.stroke = { canvas: c, ctx: c.getContext('2d') }; }
    dab(p, p);
  });
  v.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = canvasPos(e);
    if (E.tool === 'move') { const l = E.layers[E.active]; l.ox = moveStart.ox + (p.x - moveStart.p.x); l.oy = moveStart.oy + (p.y - moveStart.p.y); composite(); return; }
    dab(last, p); last = p;
  });
  const end = () => {
    if (!drawing) return;
    drawing = false;
    const l = E.layers[E.active];
    if (E.tool === 'move') {
      // bake the offset into the pixels
      const c = document.createElement('canvas'); c.width = E.W; c.height = E.H; c.getContext('2d').drawImage(l.canvas, l.ox || 0, l.oy || 0);
      l.ctx.clearRect(0, 0, E.W, E.H); l.ctx.drawImage(c, 0, 0); l.ox = 0; l.oy = 0;
    } else if (E.stroke) {
      l.ctx.globalAlpha = E.alpha / 100; l.ctx.drawImage(E.stroke.canvas, 0, 0); l.ctx.globalAlpha = 1; E.stroke = null;
    }
    composite(); renderLayers();
  };
  v.addEventListener('pointerup', end); v.addEventListener('pointercancel', end);
  $('stage').addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); E.zoom = clamp(E.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.1, 16); applyZoom(); }, { passive: false });
  applyZoom();
}
function dab(a, b) {
  const E = S.edit; const l = E.layers[E.active];
  const g = E.tool === 'brush' ? E.stroke.ctx : l.ctx;
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = E.size;
  if (E.tool === 'eraser') { g.globalCompositeOperation = 'destination-out'; g.globalAlpha = E.alpha / 100; g.strokeStyle = '#000'; } else { g.strokeStyle = E.color; }
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x + 0.01, b.y); g.stroke();
  g.restore();
  composite();
}

// ---------------------------------------------------------------- saving images
async function canvasBlob(c) { return new Promise((res) => c.toBlob(res, 'image/png')); }
async function saveImage() {
  const E = S.edit;
  if (!E) return;
  if (!assets || !db) { toast('This view can’t store images — use Download instead'); return; }
  setSaveState('Saving image…');
  try {
    const flat = await canvasBlob(flatten());
    const up = await assets.upload(flat, { type: 'image/png' });
    const layers = [];
    if (E.layers.length > 1) {
      for (const l of E.layers) {
        const r = await assets.upload(await canvasBlob(l.canvas), { type: 'image/png' });
        layers.push({ id: r.id, name: l.name, opacity: l.opacity, visible: l.visible });
      }
    } else layers.push({ id: up.id, name: E.layers[0]?.name || 'Layer', opacity: 1, visible: true });
    const doc = { image: up.id, layers, w: E.W, h: E.H, updatedAt: new Date().toISOString() };
    await (writeChain = writeChain.then(() => db.doc(`sprites/${E.name}`).set(doc)));
    S.saved[E.name] = doc;
    FX.setSpriteOverride(E.name, blobUrl(up.id));
    E.dirty = false;
    setSaveState('Image saved');
    toast(`Saved ${E.name} — it now shows in the Animations tab`);
    S._plScroll = $('plist')?.scrollTop;
    renderImage(); // refresh the list badge and panel
  } catch (e) { setSaveState('Image not saved'); toast(`Couldn’t save (${e?.code || e?.message || 'error'})`); }
}
async function rebuildEditorView() {
  // after a re-render the canvases are new elements; redraw them from the model
  const E = S.edit; if (!E) return;
  mountEditor();
  composite(); renderLayers(); applyZoom();
  await drawOriginal({ canvas: $('ghostCv'), ctx: $('ghostCv').getContext('2d') }, S.byName[E.name], true);
  composite(); renderLayers(); applyZoom();
}
async function save(filename, data) {
  if (!downloads) { toast('Downloads aren’t available in this view'); return false; }
  try { await downloads.save({ filename, data }); return true; } catch (e) { if (e?.code !== 'declined') toast(`Download failed (${e?.code || 'error'})`); return false; }
}
async function exportAll() {
  const names = Object.keys(S.saved);
  // the studio's tweaks already start from the game's file, with your edits on top
  const tweaksOut = {};
  for (const [k, v] of Object.entries(S.tweaks)) if (v) tweaksOut[k] = v;
  if (!names.length && !Object.keys(tweaksOut).length) { toast('Nothing changed yet'); return; }
  if (!window.JSZip) { toast('Zip support didn’t load'); return; }
  const zip = new window.JSZip();
  for (const n of names) { try { zip.file(`public/img/${n}.png`, await (await fetch(blobUrl(S.saved[n].image))).blob()); } catch { /* skip */ } }
  zip.file('public/data/anim_tweaks.json', `${JSON.stringify(tweaksOut, null, 1)}\n`);
  zip.file('README.txt', 'Upload the public folder to the root of the Shinobi_Showdown repo on GitHub (Add file > Upload files, drag the folder in).\nImages go to public/img, animation settings to public/data/anim_tweaks.json.\n');
  const blob = await zip.generateAsync({ type: 'blob' });
  if (await save('shinobi-studio-changes.zip', blob)) toast(`Exported ${names.length} image(s) and ${Object.keys(tweaksOut).length} animation setting(s)`);
}

// ================================================================== events
app.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const { act, arg } = b.dataset;
  const E = S.edit;
  switch (act) {
    // animation tab
    case 'pickJ': S._jlScroll = $('jlist').scrollTop; S.jid = arg; S.userIdx = 0; S.piece = null; renderAnim(); play(); break;
    case 'jfilter': S.jfilter = arg; renderAnim(); break;
    case 'play': play(); break;
    case 'nextUser': S.userIdx += 1; renderAnim(); play(); break;
    case 'pickPiece': S._jlScroll = $('jlist').scrollTop; S.piece = arg; document.querySelectorAll('.st-hl').forEach((n) => n.classList.remove('st-hl')); renderAnim(); play(); break;
    case 'resetPiece': if (S.tweaks[S.jid]?.pieces) delete S.tweaks[S.jid].pieces[S.piece]; clean(S.jid); saveTweak(S.jid); S._jlScroll = $('jlist').scrollTop; renderAnim(); play(); break;
    case 'resetJutsu': delete S.tweaks[S.jid]; FX.setAnimTweaks(S.tweaks); saveTweak(S.jid); S._jlScroll = $('jlist').scrollTop; renderAnim(); play(); break;
    case 'editImage': S.tab = 'image'; S.iq = ''; render(); await openPiece(arg); break;
    // image tab
    case 'ifilter': S.ifilter = arg; S._plScroll = $('plist').scrollTop; renderImage(); break;
    case 'openPiece': await openPiece(arg); break;
    case 'tool': E.tool = arg; document.querySelectorAll('.tool').forEach((t) => t.classList.toggle('on', t.dataset.arg === arg)); break;
    case 'undo': undo(); break;
    case 'redo': redo(); break;
    case 'zoom': if (+arg === 0) fitZoom(); else { E.zoom = clamp(E.zoom * (+arg > 0 ? 1.25 : 0.8), 0.1, 16); applyZoom(); } break;
    case 'pickLayer': if (ev.target.closest('.eye')) break; E.active = +arg; renderLayers(); break;
    case 'toggleLayer': pushUndo(snapStruct()); E.layers[+arg].visible = !E.layers[+arg].visible; composite(); renderLayers(); break;
    case 'addLayer': pushUndo(snapStruct()); E.layers.splice(E.active + 1, 0, newLayer(E, `Layer ${E.layers.length + 1}`)); E.active += 1; composite(); renderLayers(); break;
    case 'dupLayer': { pushUndo(snapStruct()); const s = E.layers[E.active]; const l = newLayer(E, `${s.name} copy`); l.ctx.drawImage(s.canvas, 0, 0); l.opacity = s.opacity; E.layers.splice(E.active + 1, 0, l); E.active += 1; composite(); renderLayers(); break; }
    case 'layerUp': if (E.active < E.layers.length - 1) { pushUndo(snapStruct()); const a = E.layers; [a[E.active], a[E.active + 1]] = [a[E.active + 1], a[E.active]]; E.active += 1; composite(); renderLayers(); } break;
    case 'layerDown': if (E.active > 0) { pushUndo(snapStruct()); const a = E.layers; [a[E.active], a[E.active - 1]] = [a[E.active - 1], a[E.active]]; E.active -= 1; composite(); renderLayers(); } break;
    case 'clearLayer': pushUndo(snapPixels(E.active)); E.layers[E.active].ctx.clearRect(0, 0, E.W, E.H); composite(); renderLayers(); break;
    case 'delLayer': if (E.layers.length > 1) { pushUndo(snapStruct()); E.layers.splice(E.active, 1); E.active = clamp(E.active - 1, 0, E.layers.length - 1); composite(); renderLayers(); } else toast('A picture needs at least one layer'); break;
    case 'addFrom': { pushUndo(snapStruct()); const l = newLayer(E, arg === 'orig' ? 'My drawing' : 'Custom image'); if (arg === 'orig') await drawOriginal(l, S.byName[E.name]); else await drawUrlInto(l, customUrl(E.name)); E.layers.splice(E.active + 1, 0, l); E.active += 1; composite(); renderLayers(); break; }
    case 'importImg': $('importFile').click(); break;
    case 'saveImage': await saveImage(); break;
    case 'downloadPng': save(`${E.name}.png`, await canvasBlob(flatten())); break;
    case 'revertPiece': if (db) { try { await db.doc(`sprites/${E.name}`).delete(); } catch { /* ignore */ } } delete S.saved[E.name]; FX.setSpriteOverride(E.name, S.repoImgs.has(E.name) ? `img/${S.repoFiles[E.name]}` : null); toast('Studio image removed'); renderImage(); break;
    case 'testPiece': {
      const p = S.byName[E.name];
      const flat = await canvasBlob(flatten());
      FX.setSpriteOverride(E.name, URL.createObjectURL(flat)); // preview the unsaved painting too
      S.tab = 'anim'; S.jid = (p.uses.includes(S.jid) && S.jid) || p.own || p.uses.find((u) => JBY[u]) || S.jid; S.piece = E.name; S._scrollToSel = true; render(); play();
      toast('Previewing your current painting — Save it in the Images tab to keep it');
      break;
    }
    default:
  }
});
document.querySelector('.topbar').addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'tab') {
    S.tab = b.dataset.arg;
    if (S.tab === 'image' && S.edit) {
      const saved = S.saved[S.edit.name];
      FX.setSpriteOverride(S.edit.name, saved ? blobUrl(saved.image) : (S.repoImgs.has(S.edit.name) ? `img/${S.repoFiles[S.edit.name]}` : null));
      render();
    } else { render(); if (S.tab === 'anim') play(); }
  }
  if (b.dataset.act === 'exportAll') exportAll();
});
app.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'jq') { S.jq = t.value; const pos = t.selectionStart; renderAnim(); const n = $('jq'); n.focus(); n.setSelectionRange(pos, pos); return; }
  if (t.id === 'iq') { S.iq = t.value; const pos = t.selectionStart; renderImage(); const n = $('iq'); n.focus(); n.setSelectionRange(pos, pos); return; }
  if (t.id === 'speed') { tw(S.jid).speed = +t.value / 100; $('v-speed').textContent = `${t.value}%`; clean(S.jid); saveTweak(S.jid); return; }
  if (t.dataset.tw) {
    const k = t.dataset.tw; const T = tw(S.jid); const p = (T.pieces[S.piece] ||= {});
    p[k] = +t.value;
    const def = SLIDERS.find((x) => x[0] === k);
    $(`v-${k}`).textContent = `${t.value}${def[5]}`;
    clean(S.jid); liveApply(S.piece); saveTweak(S.jid);
    return;
  }
  const E = S.edit;
  if (t.id === 'bsize') { E.size = +t.value; $('v-bsize').textContent = t.value; }
  if (t.id === 'bop') { E.alpha = +t.value; $('v-bop').textContent = `${t.value}%`; }
  if (t.id === 'color') E.color = t.value;
  if (t.id === 'lop') { const l = E.layers[E.active]; if (!E._lopUndo) { pushUndo(snapStruct()); E._lopUndo = true; } l.opacity = +t.value / 100; $('v-lop').textContent = `${t.value}%`; composite(); }
});
app.addEventListener('change', async (ev) => {
  const t = ev.target; const E = S.edit;
  if (t.dataset.twc) { const T = tw(S.jid); const p = (T.pieces[S.piece] ||= {}); p[t.dataset.twc] = t.checked; clean(S.jid); liveApply(S.piece); saveTweak(S.jid); play(); return; }
  if (t.dataset.tw || t.id === 'speed') { S._jlScroll = $('jlist').scrollTop; renderAnim(); play(); return; }
  if (t.id === 'loop') { S.loop = t.checked; if (S.loop) play(); }
  if (t.id === 'hl') { S.highlight = t.checked; if (!S.highlight) document.querySelectorAll('.st-hl').forEach((n) => n.classList.remove('st-hl')); }
  if (t.id === 'lop') { E._lopUndo = false; renderLayers(); }
  if (t.id === 'ghost') { E.ghost = t.checked; composite(); }
  if (t.id === 'dark') { E.dark = t.checked; $('stage').classList.toggle('dark', E.dark); }
  if (t.id === 'importFile' && t.files?.[0]) {
    const url = URL.createObjectURL(t.files[0]);
    pushUndo(snapStruct());
    const l = newLayer(E, t.files[0].name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Imported');
    await drawUrlInto(l, url);
    E.layers.splice(E.active + 1, 0, l); E.active += 1; composite(); renderLayers();
    t.value = '';
  }
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input[type=text], textarea')) return;
  const E = S.edit;
  if (S.tab === 'anim' && e.key === ' ') { e.preventDefault(); play(); return; }
  if (S.tab !== 'image' || !E) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const map = { b: 'brush', e: 'eraser', g: 'fill', i: 'picker', m: 'move' };
  if (map[k]) { E.tool = map[k]; document.querySelectorAll('.tool').forEach((t) => t.classList.toggle('on', t.dataset.arg === E.tool)); }
  if (k === '[' || k === ']') { E.size = clamp(E.size + (k === ']' ? 2 : -2), 1, 200); const s = $('bsize'); if (s) { s.value = E.size; $('v-bsize').textContent = E.size; } }
});
window.addEventListener('resize', () => { if (S.tab === 'image' && S.edit) fitZoom(); });

// ================================================================== boot
(async () => {
  render();
  const [pieces, manifest, imgList, base] = await Promise.all([
    fetch('sprites.json').then((r) => r.json()).catch(() => []),
    fetch('sprites/manifest.json').then((r) => r.json()).catch(() => ({})),
    fetch('img/index.json').then((r) => r.json()).catch(() => []),
    fetch('data/anim_tweaks.json').then((r) => r.json()).catch(() => ({})),
  ]);
  S.pieces = pieces.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  S.byName = Object.fromEntries(S.pieces.map((p) => [p.name, p]));
  S.sprites = manifest.sprites || {};
  S.repoFiles = {};
  for (const f of imgList) { const m = /^(.+)\.(png|webp|svg|gif|jpe?g)$/i.exec(f); if (m && S.byName[m[1]]) { S.repoImgs.add(m[1]); S.repoFiles[m[1]] = f; } }
  S.tweaks = base && typeof base === 'object' ? base : {};
  FX.setAnimTweaks(S.tweaks);
  render();
  setTimeout(play, 300);
  loadStore();
})();
