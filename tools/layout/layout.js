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
const art = (id) => S.sprites[id] || {};
const hasTf = (id) => !!art(id).transform;

// --- the same rules the game uses (app.js artStyle / faceStyle)
function artStyle(id, tf, back) {
  const L = (tf && S.layout.sprites[`${id}:tf`]) || S.layout.sprites[id] || {};
  const out = ['transform-origin:50% 100%'];
  if (back) out.push('transform:scaleX(-1)');
  const sc = (L.scale ?? 100) / 100;
  if (sc !== 1) out.push(`scale:${sc}`);
  if (L.dx || L.dy) out.push(`translate:${back ? -(L.dx || 0) : (L.dx || 0)}% ${L.dy || 0}%`);
  return out.join(';');
}
function faceStyle(id, tf) {
  const F = (tf && S.layout.faces[`${id}:tf`]) || S.layout.faces[id];
  if (!F) return '';
  const x = F.x ?? 50; const y = F.y ?? 50;
  return `object-position:${x}% ${y}%;transform-origin:${x}% ${y}%;scale:${(F.zoom ?? 100) / 100}`;
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
  return `<img class="art" src="sprites/${esc(src)}" alt="" style="${artStyle(id, !!(tf && a.transform), back)}" ${sel ? `data-drag="${back ? 'you' : 'foe'}"` : ''}>`;
}
const edited = (id) => S.layout.sprites[id] || S.layout.sprites[`${id}:tf`] || S.layout.faces[id] || S.layout.faces[`${id}:tf`];

// ------------------------------------------------------------------ render
function render() {
  const d = SHINOBI_BY_ID[S.id];
  const tf = S.tf && hasTf(S.id);
  const k = key(S.id, tf);
  const L = S.layout.sprites[k] || {};
  const fk = tf && art(S.id).transformFace ? `${S.id}:tf` : S.id;
  const F = S.layout.faces[fk] || {};
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
      <div><div class="lab-name">${esc(d.name)}</div><div class="muted small">Drag the middle shinobi to move them · the dashed lines show where each one's feet are</div></div>
      <span class="grow"></span>
      ${hasTf(S.id) ? `<label class="small"><input type="checkbox" id="tf" ${S.tf ? 'checked' : ''}> Transformed form</label>` : ''}
      <label class="small"><input type="checkbox" id="guides" ${S.guides ? 'checked' : ''}> Guides</label>
      <label class="small muted">Beside them <select id="refL">${refOpts(S.refL)}</select><select id="refR">${refOpts(S.refR)}</select></label>
    </div>
    <div class="arena ly-arena ${S.guides ? 'guides' : ''}" id="arena"><div class="plat foe"></div><div class="plat you"></div>${lineup('you', true)}${lineup('foe', false)}</div>
    <div class="ly-faces">
      <div><div class="lbl">Portrait — drag to move, scroll to zoom</div><div class="face-edit" id="faceEdit">${faceSrc(S.id, tf) ? `<img src="sprites/${esc(faceSrc(S.id, tf))}" style="${faceStyle(S.id, tf && art(S.id).transformFace)}">` : ''}</div></div>
      <div><div class="lbl">As it appears in the game</div><div class="face-sizes">
        <figure>${badge(S.id, 'lg', tf)}<span>Dex / builder</span></figure>
        <figure>${badge(S.id, '', tf)}<span>Roster &amp; cards</span></figure>
        <figure>${badge(S.id, 'sm', tf)}<span>Team slots</span></figure>
        <figure>${badge(S.id, 'xs', tf)}<span>Order tabs</span></figure>
      </div></div>
    </div>
  </section>
  <aside class="ly-panel">
    <div class="sect">
      <h3>On the field${tf ? ' (transformed)' : ''}</h3>
      ${[['scale', 'Size', 40, 250, 100, '%'], ['dx', 'Left / right', -60, 60, 0, '%'], ['dy', 'Up / down (feet)', -60, 60, 0, '%']].map(([p, label, min, max, def, u]) => `<div class="sl"><label>${label} <b id="v-${p}">${L[p] ?? def}${u}</b></label><input type="range" data-s="${p}" min="${min}" max="${max}" step="1" value="${L[p] ?? def}"></div>`).join('')}
      <div class="muted small">Left / right is set for the enemy side and mirrors automatically on yours.</div>
      <div class="row"><button class="small ghost" data-act="resetSprite">Reset</button>${hasTf(S.id) ? `<button class="small ghost" data-act="copyForm">Copy to ${tf ? 'normal' : 'transformed'} form</button>` : ''}</div>
    </div>
    <div class="sect">
      <h3>Portrait${tf && art(S.id).transformFace ? ' (transformed)' : ''}</h3>
      ${[['zoom', 'Zoom', 100, 400, 100, '%'], ['x', 'Focus left ↔ right', 0, 100, 50, '%'], ['y', 'Focus top ↕ bottom', 0, 100, 50, '%']].map(([p, label, min, max, def, u]) => `<div class="sl"><label>${label} <b id="v-f${p}">${F[p] ?? def}${u}</b></label><input type="range" data-f="${p}" min="${min}" max="${max}" step="1" value="${F[p] ?? def}"></div>`).join('')}
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
    try { if (v && Object.keys(v).length) await db.doc(`${coll}/${k.replace(':', '~')}`).set(v); else await db.doc(`${coll}/${k.replace(':', '~')}`).delete(); $('saveState').textContent = 'All changes saved'; } catch (e) { $('saveState').textContent = `Couldn’t save (${e?.code || 'error'})`; }
  }, 500);
}
function clean(coll, k, defs) {
  const o = S.layout[coll][k];
  if (!o) return;
  for (const [p, d] of Object.entries(defs)) if (o[p] === d || o[p] == null) delete o[p];
  if (!Object.keys(o).length) delete S.layout[coll][k];
}
const SDEF = { scale: 100, dx: 0, dy: 0 }; const FDEF = { zoom: 100, x: 50, y: 50 };
function setSprite(p, v) {
  const k = key(S.id, S.tf && hasTf(S.id));
  (S.layout.sprites[k] ||= {})[p] = v;
  clean('sprites', k, SDEF); persist('sprites', k); livePaint();
}
function setFace(p, v) {
  const k = S.tf && art(S.id).transformFace ? `${S.id}:tf` : S.id;
  (S.layout.faces[k] ||= {})[p] = v;
  clean('faces', k, FDEF); persist('faces', k); livePaint();
}
// update just the styles (no full re-render) so dragging and sliders stay smooth
function livePaint() {
  const tf = S.tf && hasTf(S.id);
  document.querySelectorAll('.mon.sel img.art').forEach((im) => { im.setAttribute('style', artStyle(S.id, tf, im.closest('.mon').classList.contains('you'))); });
  const fs = faceStyle(S.id, tf && art(S.id).transformFace);
  document.querySelectorAll('.face-edit img, .face-sizes img').forEach((im) => { im.setAttribute('style', fs); });
  const L = S.layout.sprites[key(S.id, tf)] || {};
  for (const [p, d] of Object.entries(SDEF)) { const el = document.querySelector(`[data-s="${p}"]`); if (el && document.activeElement !== el) el.value = L[p] ?? d; const v = $(`v-${p}`); if (v) v.textContent = `${L[p] ?? d}%`; }
  const F = S.layout.faces[tf && art(S.id).transformFace ? `${S.id}:tf` : S.id] || {};
  for (const [p, d] of Object.entries(FDEF)) { const el = document.querySelector(`[data-f="${p}"]`); if (el && document.activeElement !== el) el.value = F[p] ?? d; const v = $(`v-f${p}`); if (v) v.textContent = `${F[p] ?? d}%`; }
}
function mountDrag() {
  document.querySelectorAll('img[data-drag]').forEach((im) => {
    im.addEventListener('pointerdown', (e) => {
      e.preventDefault(); im.setPointerCapture(e.pointerId);
      const back = im.dataset.drag === 'you';
      const tf = S.tf && hasTf(S.id);
      const L = S.layout.sprites[key(S.id, tf)] || {};
      const st = { x: e.clientX, y: e.clientY, dx: L.dx || 0, dy: L.dy || 0, w: im.offsetWidth, h: im.offsetHeight };
      const move = (ev) => {
        const ddx = ((ev.clientX - st.x) / st.w) * 100 * (back ? -1 : 1);
        const ddy = ((ev.clientY - st.y) / st.h) * 100;
        const k = key(S.id, tf);
        const o = (S.layout.sprites[k] ||= {});
        o.dx = Math.round(clamp(st.dx + ddx, -60, 60)); o.dy = Math.round(clamp(st.dy + ddy, -60, 60));
        clean('sprites', k, SDEF); livePaint();
      };
      const up = () => { im.removeEventListener('pointermove', move); im.removeEventListener('pointerup', up); persist('sprites', key(S.id, tf)); markList(); };
      im.addEventListener('pointermove', move); im.addEventListener('pointerup', up);
    });
  });
  const fe = $('faceEdit');
  if (!fe) return;
  fe.addEventListener('pointerdown', (e) => {
    fe.setPointerCapture(e.pointerId);
    const tf = S.tf && art(S.id).transformFace;
    const F = S.layout.faces[tf ? `${S.id}:tf` : S.id] || {};
    const st = { x: e.clientX, y: e.clientY, fx: F.x ?? 50, fy: F.y ?? 50, z: (F.zoom ?? 100) / 100 };
    const move = (ev) => {
      // dragging the picture right moves the focus left
      setFaceRaw('x', Math.round(clamp(st.fx - ((ev.clientX - st.x) / fe.offsetWidth) * 100 / st.z, 0, 100)));
      setFaceRaw('y', Math.round(clamp(st.fy - ((ev.clientY - st.y) / fe.offsetHeight) * 100 / st.z, 0, 100)));
      livePaint();
    };
    const up = () => { fe.removeEventListener('pointermove', move); fe.removeEventListener('pointerup', up); setFace('x', (S.layout.faces[tf ? `${S.id}:tf` : S.id] || {}).x ?? 50); markList(); };
    fe.addEventListener('pointermove', move); fe.addEventListener('pointerup', up);
  });
  fe.addEventListener('wheel', (e) => {
    e.preventDefault();
    const tf = S.tf && art(S.id).transformFace;
    const F = S.layout.faces[tf ? `${S.id}:tf` : S.id] || {};
    setFace('zoom', Math.round(clamp((F.zoom ?? 100) * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 100, 400)));
    markList();
  }, { passive: false });
}
function setFaceRaw(p, v) { const k = S.tf && art(S.id).transformFace ? `${S.id}:tf` : S.id; (S.layout.faces[k] ||= {})[p] = v; clean('faces', k, FDEF); }
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
    case 'resetSprite': { const k = key(S.id, tf); delete S.layout.sprites[k]; persist('sprites', k); render(); break; }
    case 'resetFace': { const k = S.tf && art(S.id).transformFace ? `${S.id}:tf` : S.id; delete S.layout.faces[k]; persist('faces', k); render(); break; }
    case 'copyForm': { const from = key(S.id, tf); const to = key(S.id, !tf); if (S.layout.sprites[from]) S.layout.sprites[to] = { ...S.layout.sprites[from] }; else delete S.layout.sprites[to]; persist('sprites', to); toast('Copied'); break; }
    case 'export': exportJson(); break;
    default:
  }
});
app.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.id === 'q') { S.q = t.value; const pos = t.selectionStart; render(); const n = $('q'); n.focus(); n.setSelectionRange(pos, pos); return; }
  if (t.dataset.s) setSprite(t.dataset.s, +t.value);
  if (t.dataset.f) setFace(t.dataset.f, +t.value);
});
app.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.id === 'tf') { S.tf = t.checked; render(); }
  if (t.id === 'guides') { S.guides = t.checked; $('arena').classList.toggle('guides', S.guides); }
  if (t.id === 'refL' || t.id === 'refR') { S[t.id] = t.value; render(); }
  if (t.dataset.s || t.dataset.f) markList();
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
    for (const d of sp.docs) S.layout.sprites[d.id.replace('~', ':')] = d.data();
    for (const d of fc.docs) S.layout.faces[d.id.replace('~', ':')] = d.data();
    clearTimeout(timer);
    $('saveState').textContent = sp.size + fc.size ? `${sp.size + fc.size} setting(s) saved` : 'Ready';
    render();
  } catch (e) { clearTimeout(timer); $('saveState').textContent = `Couldn’t load saved changes (${e?.code || 'error'})`; }
})();
