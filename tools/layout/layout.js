// Character Layout: set each shinobi's size and footing on the battlefield and how their portrait is framed.
// Saved here (db) and exported as public/data/layout.json, which the game reads.
import { SHINOBI, SHINOBI_BY_ID } from './data/shinobi.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = (id) => document.getElementById(id);
const app = $('lay');
const LIST = [...SHINOBI].sort((a, b) => a.name.localeCompare(b.name));

const S = { id: LIST[0].id, q: '', tf: false, guides: true, refL: 'sakura_shippuden', refR: 'kakashi_ship', sprites: {}, layout: { sprites: {}, faces: {} } };
let db = null; let downloads = null;

function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('hidden'), 2600); }
const key = (id, tf) => (tf ? `${id}:tf` : id);
const skey = (id, tf, side) => `${key(id, tf)}:${side}`;
const docId = (k) => k.replaceAll(':', '~');
const fromDoc = (d) => d.replaceAll('~', ':');
const art = (id) => S.sprites[id] || {};
const hasTf = (id) => !!art(id).transform;

// --- the same rules the game uses (app.js artStyle / faceStyle)
// Sprite settings are per side: "<id>[:tf]:you" (your side, mirrored art) and "<id>[:tf]:foe" (enemy side).
// Older shared "<id>[:tf]" entries still apply to a side that has none of its own (their left/right mirrors on your side).
const SIDES = ['foe', 'you'];
function layoutFor(id, tf, side) {
  const all = S.layout.sprites;
  for (const k of tf ? [`${id}:tf`, id] : [id]) {
    if (all[`${k}:${side}`]) return { L: all[`${k}:${side}`], own: true };
    if (all[k]) return { L: all[k], own: false };
  }
  return { L: {}, own: true };
}
// what a side currently shows, with left/right as seen on screen
function effective(id, tf, side) {
  const { L, own } = layoutFor(id, tf, side);
  const dx = own || side === 'foe' ? (L.dx || 0) : -(L.dx || 0);
  return { scale: L.scale ?? 100, dx, dy: L.dy || 0 };
}
function artStyle(id, tf, back) {
  const side = back ? 'you' : 'foe';
  const E = effective(id, tf, side);
  const out = ['transform-origin:50% 100%'];
  if (back) out.push('transform:scaleX(-1)');
  if (E.scale !== 100) out.push(`scale:${E.scale / 100}`);
  if (E.dx || E.dy) out.push(`translate:${E.dx}% ${E.dy}%`);
  return out.join(';');
}
function faceStyle(id, tf) {
  const F = (tf && S.layout.faces[`${id}:tf`]) || S.layout.faces[id];
  if (!F) return '';
  const z = (F.zoom ?? 100) / 100;
  let cx = F.cx ?? 50; let cy = F.cy ?? 50;
  if (F.x != null || F.y != null) { const f = Math.min(1, 1 / z); cx = (F.x ?? 50) * (1 - f) + 50 * f; cy = (F.y ?? 50) * (1 - f) + 50 * f; } // older focus-style entries
  return `transform-origin:50% 50%;transform:scale(${z}) translate(${+(50 - cx).toFixed(2)}%, ${+(50 - cy).toFixed(2)}%)`;
}
function faceSrc(id, tf) { const a = art(id); return (tf && a.transformFace) || a.face; }
function badge(id, cls = '', tf = false) {
  const f = faceSrc(id, tf);
  return f ? `<div class="badge face ${cls}"><img src="sprites/${esc(f)}" alt="" style="${faceStyle(id, tf && art(id).transformFace)}"></div>` : `<div class="badge ${cls}">${esc(SHINOBI_BY_ID[id].name[0])}</div>`;
}
function sprite(id, back, tf, sel) {
  const a = art(id);
  const src = (tf && a.transform) || a.front;
  if (!src) return badge(id);
  return `<img class="art" src="sprites/${esc(src)}" alt="" style="${artStyle(id, !!(tf && a.transform), back)}" ${sel ? `data-drag="${back ? 'you' : 'foe'}" title="Drag to move (${back ? 'your side' : 'enemy side'} only)"` : ''}>`;
}
const edited = (id) => Object.keys(S.layout.sprites).some((k) => k === id || k.startsWith(`${id}:`)) || S.layout.faces[id] || S.layout.faces[`${id}:tf`];

// ------------------------------------------------------------------ render
function render() {
  const d = SHINOBI_BY_ID[S.id];
  const tf = S.tf && hasTf(S.id);
  const fk = tf && art(S.id).transformFace ? `${S.id}:tf` : S.id;
  const FN = faceNow();
  const q = S.q.toLowerCase();
  const items = LIST.filter((s) => !q || s.name.toLowerCase().includes(q));
  const refOpts = (sel) => LIST.map((s) => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const lineup = (cls, back) => [S.refL, S.id, S.refR].map((id, i) => `<div class="mon ${cls} p${i} ${i === 1 ? 'sel' : ''}"><div class="spr has-art">${sprite(id, back, i === 1 ? tf : false, i === 1)}</div></div>`).join('');
  const lst = $('llist'); const scroll = lst ? lst.scrollTop : null;
  app.innerHTML = `
  <aside class="ly-side">
    <input type="text" id="q" placeholder="Search shinobi…" value="${esc(S.q)}">
    <div class="ly-list" id="llist">${items.map((s) => `<button class="ly-item ${s.id === S.id ? 'sel' : ''}" data-act="pick" data-arg="${s.id}">${badge(s.id, 'sm')}<span>${esc(s.name)}</span>${edited(s.id) ? '<span class="tag">set</span>' : ''}</button>`).join('')}</div>
  </aside>
  <section class="ly-center">
    <div class="ly-head">
      <div><div class="lab-name">${esc(d.name)}</div><div class="muted small">Drag either middle shinobi to move them — each side is set separately · the dashed lines show where each one's feet are</div></div>
      <span class="grow"></span>
      ${hasTf(S.id) ? `<label class="small"><input type="checkbox" id="tf" ${S.tf ? 'checked' : ''}> Transformed form</label>` : ''}
      <label class="small"><input type="checkbox" id="guides" ${S.guides ? 'checked' : ''}> Guides</label>
      <label class="small muted">Beside them <select id="refL">${refOpts(S.refL)}</select><select id="refR">${refOpts(S.refR)}</select></label>
    </div>
    <div class="arena ly-arena ${S.guides ? 'guides' : ''}" id="arena"><div class="plat foe"></div><div class="plat you"></div>${lineup('you', true)}${lineup('foe', false)}</div>
    <div class="ly-faces">
      <div><div class="lbl">Portrait — drag the picture to move it, scroll to zoom</div><div class="face-crop" id="faceEdit">${faceSrc(S.id, tf) ? `<img id="cropImg" src="sprites/${esc(faceSrc(S.id, tf))}" alt="" draggable="false"><div class="crop-ring"></div>` : '<div class="muted small" style="padding:20px">No portrait image</div>'}</div></div>
      <div><div class="lbl">As it appears in the game</div><div class="face-sizes">
        <figure>${badge(S.id, 'lg', tf)}<span>Dex / builder</span></figure>
        <figure>${badge(S.id, '', tf)}<span>Roster &amp; cards</span></figure>
        <figure>${badge(S.id, 'sm', tf)}<span>Team slots</span></figure>
        <figure>${badge(S.id, 'xs', tf)}<span>Order tabs</span></figure>
      </div></div>
    </div>
  </section>
  <aside class="ly-panel">
${SIDES.map((side) => { const E = effective(S.id, tf, side); const own = layoutFor(S.id, tf, side).own && S.layout.sprites[skey(S.id, tf, side)]; return `<div class="sect">
      <h3>${side === 'you' ? 'Your side' : 'Enemy side'}${tf ? ' (transformed)' : ''}${own ? '' : ' <span class="muted small" style="text-transform:none;letter-spacing:0">· default</span>'}</h3>
      ${[['scale', 'Size', 40, 250, '%'], ['dx', 'Left / right', -60, 60, '%'], ['dy', 'Up / down (feet)', -60, 60, '%']].map(([p, label, min, max, u]) => `<div class="sl"><label>${label} <b id="v-${side}-${p}">${E[p]}${u}</b></label><input type="range" data-s="${p}" data-side="${side}" min="${min}" max="${max}" step="1" value="${E[p]}"></div>`).join('')}
      <div class="row"><button class="small ghost" data-act="resetSprite" data-arg="${side}">Reset</button><button class="small ghost" data-act="copySide" data-arg="${side}" title="Same size and footing, mirrored left/right">Copy to ${side === 'you' ? 'enemy' : 'your'} side</button></div>
    </div>`; }).join('')}
    ${hasTf(S.id) ? `<div class="sect"><div class="row" style="margin-top:0"><button class="small ghost" data-act="copyForm">Copy both sides to ${tf ? 'normal' : 'transformed'} form</button></div></div>` : ''}
    <div class="sect">
      <h3>Portrait${tf && art(S.id).transformFace ? ' (transformed)' : ''}</h3>
      ${[['zoom', 'Zoom', 50, 400, '%'], ['cx', 'Centre left ↔ right', 0, 100, '%'], ['cy', 'Centre top ↕ bottom', 0, 100, '%']].map(([p, label, min, max, u]) => `<div class="sl"><label>${label} <b id="v-f${p}">${FN[p]}${u}</b></label><input type="range" data-f="${p}" min="${min}" max="${max}" step="1" value="${FN[p]}"></div>`).join('')}
      <div class="row"><button class="small ghost" data-act="resetFace">Reset</button></div>
    </div>
    <div class="sect muted small">Changes save automatically. Tell me in the chat when you're done and I'll put them in the game — or use <b>Export layout.json</b> and upload it to <code>public/data/</code>.</div>
  </aside>`;
  if (scroll != null) $('llist').scrollTop = scroll;
  mountDrag();
}

// ------------------------------------------------------------------ editing
const pending = {};
function persist(coll, k) {
  clearTimeout(pending[`${coll}/${k}`]);
  pending[`${coll}/${k}`] = setTimeout(async () => {
    if (!db) { $('saveState').textContent = 'Not saved here — use Export'; return; }
    $('saveState').textContent = 'Saving…';
    const v = S.layout[coll][k];
    try { if (v && Object.keys(v).length) await db.doc(`${coll}/${docId(k)}`).set(v); else await db.doc(`${coll}/${docId(k)}`).delete(); $('saveState').textContent = 'All changes saved'; } catch (e) { $('saveState').textContent = `Couldn’t save (${e?.code || 'error'})`; }
  }, 500);
}
function clean(coll, k, defs) {
  const o = S.layout[coll][k];
  if (!o) return;
  for (const [p, d] of Object.entries(defs)) if (o[p] === d || o[p] == null) delete o[p];
  if (!Object.keys(o).length) delete S.layout[coll][k];
}
const SDEF = { scale: 100, dx: 0, dy: 0 }; const FDEF = { zoom: 100, cx: 50, cy: 50 };
// the side's own entry, seeded from what it shows now (so taking over from a shared entry changes nothing visible)
function sideEntry(side) {
  const tf = S.tf && hasTf(S.id);
  const k = skey(S.id, tf, side);
  if (!S.layout.sprites[k]) S.layout.sprites[k] = { ...effective(S.id, tf, side) };
  return [k, S.layout.sprites[k]];
}
function setSprite(side, p, v) {
  const [k, o] = sideEntry(side);
  o[p] = v;
  clean('sprites', k, SDEF); keepOwn(k); persist('sprites', k); livePaint();
}
// a side entry equal to the defaults still has to exist if a shared entry would otherwise take over
function keepOwn(k) { if (!S.layout.sprites[k]) { const base = k.replace(/:(you|foe)$/, ''); if (S.layout.sprites[base] || (base.endsWith(':tf') && S.layout.sprites[base.slice(0, -3)])) S.layout.sprites[k] = { scale: 100 }; } }
function setFace(p, v) {
  const k = faceKey();
  S.layout.faces[k] = { ...faceNow(), [p]: v };
  clean('faces', k, FDEF); persist('faces', k); livePaint();
}
// update just the styles (no full re-render) so dragging and sliders stay smooth
function livePaint() {
  const tf = S.tf && hasTf(S.id);
  document.querySelectorAll('.mon.sel img.art').forEach((im) => { im.setAttribute('style', artStyle(S.id, tf, im.closest('.mon').classList.contains('you'))); });
  const fs = faceStyle(S.id, tf && art(S.id).transformFace);
  document.querySelectorAll('.face-sizes img').forEach((im) => { im.setAttribute('style', fs); });
  for (const side of SIDES) {
    const E = effective(S.id, tf, side);
    for (const p of Object.keys(SDEF)) { const el = document.querySelector(`[data-s="${p}"][data-side="${side}"]`); if (el && document.activeElement !== el) el.value = E[p]; const v = $(`v-${side}-${p}`); if (v) v.textContent = `${E[p]}%`; }
  }
  paintCrop();
  const FN = faceNow();
  for (const p of Object.keys(FDEF)) { const el = document.querySelector(`[data-f="${p}"]`); if (el && document.activeElement !== el) el.value = FN[p]; const v = $(`v-f${p}`); if (v) v.textContent = `${FN[p]}%`; }
}
function mountDrag() {
  document.querySelectorAll('img[data-drag]').forEach((im) => {
    im.addEventListener('pointerdown', (e) => {
      e.preventDefault(); im.setPointerCapture(e.pointerId);
      const side = im.dataset.drag;
      const [k, o] = sideEntry(side);
      const st = { x: e.clientX, y: e.clientY, dx: o.dx || 0, dy: o.dy || 0, w: im.offsetWidth, h: im.offsetHeight };
      const move = (ev) => {
        o.dx = Math.round(clamp(st.dx + ((ev.clientX - st.x) / st.w) * 100, -60, 60));
        o.dy = Math.round(clamp(st.dy + ((ev.clientY - st.y) / st.h) * 100, -60, 60));
        livePaint();
      };
      const up = () => { im.removeEventListener('pointermove', move); im.removeEventListener('pointerup', up); clean('sprites', k, SDEF); keepOwn(k); persist('sprites', k); markList(); render(); };
      im.addEventListener('pointermove', move); im.addEventListener('pointerup', up);
    });
  });
  const fe = $('faceEdit'); const img = $('cropImg');
  if (!fe || !img) return;
  if (img.complete) paintCrop(); else img.addEventListener('load', paintCrop);
  fe.addEventListener('pointerdown', (e) => {
    e.preventDefault(); fe.setPointerCapture(e.pointerId);
    const F = faceNow(); const E = (CROP_D * F.zoom) / 100; // picture size on screen
    const st = { x: e.clientX, y: e.clientY, cx: F.cx, cy: F.cy };
    const move = (ev) => {
      // the picture follows the pointer, so the point under the ring's centre moves the other way
      setFaceRaw('cx', Math.round(clamp(st.cx - ((ev.clientX - st.x) / E) * 100, 0, 100)));
      setFaceRaw('cy', Math.round(clamp(st.cy - ((ev.clientY - st.y) / E) * 100, 0, 100)));
      livePaint();
    };
    const up = () => { fe.removeEventListener('pointermove', move); fe.removeEventListener('pointerup', up); fe.removeEventListener('pointercancel', up); persist('faces', faceKey()); markList(); };
    fe.addEventListener('pointermove', move); fe.addEventListener('pointerup', up); fe.addEventListener('pointercancel', up);
  });
  fe.addEventListener('wheel', (e) => {
    e.preventDefault();
    setFace('zoom', Math.round(clamp(faceNow().zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 50, 400)));
    markList();
  }, { passive: false });
}
// --- portrait cropper: the whole picture is shown, the ring is what the game's circle shows
const CROP_D = 220; // ring diameter (px), centred in the box
const faceKey = () => (S.tf && art(S.id).transformFace ? `${S.id}:tf` : S.id);
function faceNow() {
  const F = S.layout.faces[faceKey()] || {};
  const zoom = F.zoom ?? 100;
  if (F.x == null && F.y == null) return { zoom, cx: F.cx ?? 50, cy: F.cy ?? 50 };
  const f = Math.min(1, 100 / zoom); // older focus-style entry → the point at the centre
  return { zoom, cx: Math.round((F.x ?? 50) * (1 - f) + 50 * f), cy: Math.round((F.y ?? 50) * (1 - f) + 50 * f) };
}
// The whole picture is shown; the ring is the game's circle. The picture covers the circle at 100% zoom,
// and the point (cx, cy) sits at the ring's centre.
function paintCrop() {
  const img = $('cropImg'); if (!img || !img.naturalWidth) return;
  const F = faceNow(); const box = $('faceEdit');
  const E = (CROP_D * F.zoom) / 100; const m = Math.min(img.naturalWidth, img.naturalHeight);
  const W = (E * img.naturalWidth) / m; const H = (E * img.naturalHeight) / m;
  const px = (W - E) / 2 + (F.cx / 100) * E; const py = (H - E) / 2 + (F.cy / 100) * E;
  Object.assign(img.style, { width: `${W}px`, height: `${H}px`, left: `${box.clientWidth / 2 - px}px`, top: `${box.clientHeight / 2 - py}px` });
}
function setFaceRaw(p, v) { const k = faceKey(); S.layout.faces[k] = { ...faceNow(), [p]: v }; clean('faces', k, FDEF); }
function markList() { const b = document.querySelector(`.ly-item[data-arg="${S.id}"]`); if (b && edited(S.id) && !b.querySelector('.tag')) b.insertAdjacentHTML('beforeend', '<span class="tag">set</span>'); }

async function exportJson() {
  const out = `${JSON.stringify({ sprites: S.layout.sprites, faces: S.layout.faces }, null, 1)}\n`;
  if (!downloads) { toast('Downloads aren’t available here'); return; }
  try { await downloads.save({ filename: 'layout.json', data: out }); toast('Upload it to public/data/ on GitHub'); } catch (e) { if (e?.code !== 'declined') toast(`Download failed (${e?.code || 'error'})`); }
}

// ------------------------------------------------------------------ events
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const tf = S.tf && hasTf(S.id);
  switch (b.dataset.act) {
    case 'pick': S.id = b.dataset.arg; S.tf = false; render(); break;
    case 'resetSprite': { const k = skey(S.id, tf, b.dataset.arg); delete S.layout.sprites[k]; keepOwn(k); persist('sprites', k); render(); break; }
    case 'copySide': { const from = b.dataset.arg; const to = from === 'you' ? 'foe' : 'you'; const E = effective(S.id, tf, from); const k = skey(S.id, tf, to); S.layout.sprites[k] = { scale: E.scale, dx: -E.dx, dy: E.dy }; clean('sprites', k, SDEF); keepOwn(k); persist('sprites', k); render(); toast(`Copied to ${to === 'you' ? 'your' : 'the enemy'} side`); break; }
    case 'resetFace': { const k = S.tf && art(S.id).transformFace ? `${S.id}:tf` : S.id; delete S.layout.faces[k]; persist('faces', k); render(); break; }
    case 'copyForm': { for (const side of SIDES) { const k = skey(S.id, !tf, side); S.layout.sprites[k] = { ...effective(S.id, tf, side) }; clean('sprites', k, SDEF); keepOwn(k); persist('sprites', k); } toast('Copied both sides'); break; }
    case 'export': exportJson(); break;
    default:
  }
});
app.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'q') { S.q = t.value; const pos = t.selectionStart; render(); const n = $('q'); n.focus(); n.setSelectionRange(pos, pos); return; }
  if (t.dataset.s) setSprite(t.dataset.side, t.dataset.s, +t.value);
  if (t.dataset.f) setFace(t.dataset.f, +t.value);
});
app.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.id === 'tf') { S.tf = t.checked; render(); }
  if (t.id === 'guides') { S.guides = t.checked; $('arena').classList.toggle('guides', S.guides); }
  if (t.id === 'refL' || t.id === 'refR') { S[t.id] = t.value; render(); }
  if (t.dataset.s) { markList(); render(); } else if (t.dataset.f) markList();
});

// ------------------------------------------------------------------ boot
(async () => {
  const [m, base] = await Promise.all([
    fetch('sprites/manifest.json').then((r) => r.json()).catch(() => ({})),
    fetch('data/layout.json').then((r) => r.json()).catch(() => ({})),
  ]);
  S.sprites = m.sprites || {};
  S.layout = { sprites: base.sprites || {}, faces: base.faces || {} };
  render();
  try { db = await window.claude?.use?.('db'); } catch { db = null; }
  try { downloads = await window.claude?.use?.('downloads'); } catch { downloads = null; }
  if (!db) { $('saveState').textContent = 'Changes stay in this tab only (use Export)'; return; }
  const timer = setTimeout(() => { $('saveState').textContent = 'Couldn’t reach saved changes yet…'; }, 10000);
  try {
    const [sp, fc] = await Promise.all([db.collection('sprites').get(), db.collection('faces').get()]);
    for (const d of sp.docs) S.layout.sprites[fromDoc(d.id)] = d.data();
    for (const d of fc.docs) S.layout.faces[fromDoc(d.id)] = d.data();
    clearTimeout(timer);
    $('saveState').textContent = sp.size + fc.size ? `${sp.size + fc.size} setting(s) saved` : 'Ready';
    render();
  } catch (e) { clearTimeout(timer); $('saveState').textContent = `Couldn’t load saved changes (${e?.code || 'error'})`; }
})();
