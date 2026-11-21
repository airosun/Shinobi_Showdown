// Builds tools/sprites/index.html: every drawn animation piece (data-sp name) with a preview.
// Input: a capture of every animation played in the lab (see tools/sprites/README.md).
import { readFileSync, writeFileSync } from 'node:fs';
import { JUTSU } from '../../public/data/jutsu.js';
const cap = JSON.parse(readFileSync(process.argv[2] || '/tmp/spr/cap.json', 'utf8'));
const tagged = JSON.parse(readFileSync(process.argv[3] || '/tmp/spr/names.json', 'utf8'));
const animSrc = readFileSync(new URL('../../public/anim.js', import.meta.url), 'utf8');
const css = (animSrc.match(/s\.textContent = `([\s\S]*?)`;/) || [])[1] || '';
const fxCss = readFileSync(new URL('../../public/style.css', import.meta.url), 'utf8').split('\n').filter((l) => /^\.fx\.(orb|burst|slash|ring|puff)/.test(l)).join('\n');

const fixName = (c) => {
  if (!c.sp.startsWith('fx-')) return c.sp;
  const m = /class="fx ([^"]+)"/.exec(c.html);
  return m ? `fx-${m[1].trim().split(/\s+/).join('-')}` : c.sp;
};
const by = new Map();
for (const c of cap) {
  const name = fixName(c);
  if (name === 'fx-log') continue;
  const e = by.get(name) || { name, uses: new Set(), variants: [] };
  e.uses.add(c.cur);
  const html = c.html.replace(/ data-ovr="1"/g, '');
  if (e.variants.length < 4 && !e.variants.some((v) => v.html === html)) e.variants.push({ html, w: parseFloat(c.w) || c.bw || 60, h: parseFloat(c.h) || c.bh || 60 });
  by.set(name, e);
}
const jname = (id) => JUTSU[id]?.name || ({ clone_poof: 'Clone poof (any clone / substitution)', log_substitution: 'Log Substitution', misc: 'Battle effects' }[id] || id);
const owner = (name) => {
  for (const id of Object.keys(JUTSU)) if (name === id || name.startsWith(`${id}-`)) return id;
  return null;
};
const items = [...by.values()].map((e) => {
  const own = owner(e.name);
  return { name: e.name, own, ownName: own ? jname(own) : null, uses: [...e.uses].map((u) => ({ id: u, name: jname(u) })), variants: e.variants };
});
const missing = tagged.filter((n) => !by.has(n));
items.sort((a, b) => (a.own ? 0 : 1) - (b.own ? 0 : 1) || (a.ownName || a.name).localeCompare(b.ownName || b.name) || a.name.localeCompare(b.name, undefined, { numeric: true }));
const data = JSON.stringify({ items, missing }).replace(/</g, '\\u003c');
const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shinobi Showdown — Animation sprites</title>
<style>
:root { --bg:#14100c; --panel:#1f1813; --line:#3a2c20; --ink:#f3e9da; --muted:#b5a48f; --accent:#ff8c1a; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.45 system-ui, sans-serif; }
header { position:sticky; top:0; z-index:5; background:#120d09f2; border-bottom:2px solid var(--accent); padding:14px 22px; }
h1 { margin:0 0 6px; font-size:22px; }
.how { color:var(--muted); max-width:1100px; }
.how code, .nm code { background:#00000055; padding:1px 5px; border-radius:4px; color:#ffd7a8; }
.bar { display:flex; gap:12px; align-items:center; margin-top:10px; flex-wrap:wrap; }
input[type=search] { background:#0c0907; color:var(--ink); border:1px solid var(--line); border-radius:8px; padding:8px 12px; min-width:320px; font-size:14px; }
.bar label { color:var(--muted); }
main { padding:18px 22px 60px; }
h2 { font-size:17px; margin:26px 0 10px; color:var(--accent); border-bottom:1px solid var(--line); padding-bottom:4px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:12px; }
.card { background:var(--panel); border:1px solid var(--line); border-radius:10px; overflow:hidden; display:flex; flex-direction:column; }
.pv { height:170px; display:flex; gap:6px; align-items:center; justify-content:center; background:repeating-conic-gradient(#2a221b 0 25%, #221b15 0 50%) 0 0/20px 20px; position:relative; overflow:hidden; }
.pv.light { background:repeating-conic-gradient(#8c8c8c 0 25%, #a9a9a9 0 50%) 0 0/20px 20px; }
.slot { position:relative; flex:1; min-width:0; height:100%; display:flex; align-items:center; justify-content:center; }
.slot > .scale { transform-origin:center; display:flex; align-items:center; justify-content:center; flex:none; }
.slot > .scale > * { flex:none; }
.slot svg { display:block; overflow:visible; }
.slot .fx { position:static; transform:none; animation:none !important; opacity:1 !important; }
.meta { padding:9px 11px 11px; display:flex; flex-direction:column; gap:4px; }
.nm { font-weight:700; word-break:break-all; display:flex; gap:6px; align-items:center; }
.nm button { white-space:nowrap; flex:none; margin-left:auto; background:#00000044; color:var(--muted); border:1px solid var(--line); border-radius:6px; font-size:11px; padding:2px 7px; cursor:pointer; }
.sz, .uses { color:var(--muted); font-size:12px; }
.uses b { color:var(--ink); font-weight:600; }
.note { color:var(--muted); font-size:12px; }
.missing li { font-family:ui-monospace, monospace; }
${css}
${fxCss}
</style></head><body>
<header>
  <h1>Animation sprites — ${items.length} drawn pieces</h1>
  <div class="how">Every piece drawn for the jutsu animations. To replace one, save your image in <code>public/img/</code> named exactly as shown, e.g. <code>beastBomb-spark-red.png</code> for the red sparks around a Tailed Beast Bomb (.png, .webp, .svg, .gif or .jpg). It takes over everywhere that piece appears. A piece marked <b>shared</b> is used by several jutsu; to change it for one jutsu only, name the file <code>&lt;jutsu id&gt;__&lt;piece&gt;.png</code>, e.g. <code>rasengan__boom.png</code>. Draw on a transparent background at about 2× the listed size: your image is stretched to fit that box. Pieces you haven't replaced keep the drawn version.</div>
  <div class="bar"><input type="search" id="q" placeholder="Filter by jutsu, piece name or id…"><label><input type="checkbox" id="light"> light background</label><span id="count" class="note"></span></div>
</header>
<main id="main"></main>
<script>
const D = ${data};
const main = document.getElementById('main');
const k0 = (v) => Math.min(4, 210 / Math.max(v.w, 1), 150 / Math.max(v.h, 1));
function card(it) {
  const shared = !it.own;
  const vs = it.variants.slice(0, shared ? 4 : 2);
  const slots = vs.map((v) => {
    const k = Math.min(4, (210 / vs.length) / Math.max(v.w, 1), 150 / Math.max(v.h, 1));
    return '<div class="slot"><div class="scale" style="transform:scale(' + k.toFixed(3) + ')">' + v.html + '</div></div>';
  }).join('');
  const v = it.variants[0];
  const uses = it.uses.map((u) => u.name).sort();
  const file = it.name + '.png';
  return '<div class="card" data-s="' + (it.name + ' ' + it.uses.map((u) => u.id + ' ' + u.name).join(' ')).toLowerCase().replace(/"/g, '') + '">'
    + '<div class="pv">' + slots + '</div><div class="meta">'
    + '<div class="nm"><code>' + file + '</code><button data-copy="' + it.name + '">copy</button></div>'
    + '<div class="sz">' + Math.round(v.w) + ' × ' + Math.round(v.h) + ' px' + (k0(v) > 1 ? ' · preview enlarged' : '') + (shared ? ' · <b style="color:#ffcf6e">shared</b>' : '') + (it.variants.length > 1 ? ' · ' + it.variants.length + (it.variants.length >= 4 && shared ? '+' : '') + ' colour/size variants shown' : '') + '</div>'
    + (shared ? '<div class="uses">Used by <b>' + uses.length + '</b>: ' + uses.slice(0, 12).join(', ') + (uses.length > 12 ? ', …' : '') + '</div>' : '')
    + '</div></div>';
}
function render() {
  const groups = new Map();
  for (const it of D.items) {
    const g = it.own ? it.ownName + ' (' + it.own + ')' : 'Shared pieces (used by several jutsu)';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(it);
  }
  let out = '';
  for (const [g, list] of groups) out += '<section><h2>' + g + '</h2><div class="grid">' + list.map(card).join('') + '</div></section>';
  if (D.missing.length) out += '<section class="missing"><h2>Tagged but not seen in the test run (' + D.missing.length + ')</h2><p class="note">These pieces only appear in rare branches (e.g. a miss or a special target). They still accept a replacement image by these names.</p><ul>' + D.missing.map((n) => '<li>' + n + '.png</li>').join('') + '</ul></section>';
  main.innerHTML = out;
  filter();
}
function filter() {
  const q = document.getElementById('q').value.trim().toLowerCase();
  let n = 0;
  for (const c of main.querySelectorAll('.card')) { const on = !q || c.dataset.s.includes(q); c.style.display = on ? '' : 'none'; if (on) n++; }
  for (const s of main.querySelectorAll('section')) { if (s.classList.contains('missing')) continue; s.style.display = [...s.querySelectorAll('.card')].some((c) => c.style.display !== 'none') ? '' : 'none'; }
  document.getElementById('count').textContent = n + ' shown';
}
document.getElementById('q').addEventListener('input', filter);
document.getElementById('light').addEventListener('change', (e) => document.querySelectorAll('.pv').forEach((p) => p.classList.toggle('light', e.target.checked)));
document.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (!b) return; navigator.clipboard?.writeText(b.dataset.copy).then(() => { b.textContent = 'copied'; setTimeout(() => { b.textContent = 'copy'; }, 1000); }).catch(() => {}); });
render();
</script></body></html>`;
writeFileSync(new URL('./index.html', import.meta.url), html);
console.log(items.length, 'pieces;', items.filter((i) => !i.own).length, 'shared;', missing.length, 'tagged but not captured');
