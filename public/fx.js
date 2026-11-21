// Small battlefield animation helpers (Web Animations API, no libraries).

export const NATURE_COLOR = {
  fire: '#ee8130', wind: '#6fcf7f', lightning: '#e0c020', earth: '#b5894f', water: '#6390f0',
  yin: '#8a6cc4', yang: '#e6d39a', wood: '#5c9e4a', ice: '#9be3f0', lava: '#e0502a', storm: '#7fb0ff',
  magnet: '#c8b48a', scorch: '#ff9a3c', boil: '#e8a0a0', explosion: '#ffe066', dust: '#9fb3bf',
};

/** Accent color for a jutsu (left border of buttons, projectile color). */
export function jutsuColor(j) {
  if (!j) return '#8c93a8';
  if (j.nature && NATURE_COLOR[j.nature] && j.category !== 'medical') return NATURE_COLOR[j.nature];
  if (j.category === 'taijutsu') return '#c94a3a';
  if (j.category === 'genjutsu') return NATURE_COLOR.yin;
  if (j.category === 'medical') return '#3ddc84';
  return '#8c93a8';
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- custom sprite overrides
// Every drawn piece of an animation carries data-sp="<name>". Drop an image named <name>.png
// (or .webp / .svg / .gif / .jpg) into public/img and it replaces the drawn version everywhere;
// <jutsu_id>__<name>.png replaces it for that one jutsu only. The server lists public/img at /img/index.json.
const OVR = {};
if (typeof fetch !== 'undefined') {
  fetch('img/index.json').then((r) => (r.ok ? r.json() : [])).then((list) => {
    for (const f of list) {
      const m = /^(.+)\.(png|webp|svg|gif|jpe?g)$/i.exec(f);
      if (!m) continue;
      OVR[m[1]] = `img/${encodeURIComponent(f)}`;
      if (!/svg|gif/i.test(m[2])) trimSprite(m[1], OVR[m[1]]);
    }
  }).catch(() => {});
}
// cut away the transparent margin around a custom sprite so it fills its box
function trimSprite(name, url) {
  const img = new Image();
  img.onload = () => {
    try {
      const W = img.naturalWidth; const H = img.naturalHeight;
      const k = Math.min(1, 256 / Math.max(W, H));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width; let y0 = c.height; let x1 = -1; let y1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return;
      const sx = Math.max(0, Math.floor((x0 - 1) / k)); const sy = Math.max(0, Math.floor((y0 - 1) / k));
      const sw = Math.min(W - sx, Math.ceil((x1 + 2) / k) - sx); const sh = Math.min(H - sy, Math.ceil((y1 + 2) / k) - sy);
      if (sw >= W * 0.97 && sh >= H * 0.97) return; // nothing worth trimming
      const out = document.createElement('canvas');
      const ok = Math.min(1, 1024 / Math.max(sw, sh));
      out.width = Math.round(sw * ok); out.height = Math.round(sh * ok);
      out.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);
      out.toBlob((b) => { if (b) OVR[name] = URL.createObjectURL(b); }, 'image/png');
    } catch { /* keep the original */ }
  };
  img.src = url;
}
export function spriteUrl(name, jutsuId = null) { return (jutsuId && OVR[`${jutsuId}__${name}`]) || OVR[name] || null; }
/** Set (or clear with null) a custom image for a piece, e.g. from the Sprite Studio. */
export function setSpriteOverride(name, url) { if (url) OVR[name] = url; else delete OVR[name]; }

// ---------------------------------------------------------------- animation tweaks
// Per-jutsu adjustments made in the Sprite & Animation Studio, saved as data/anim_tweaks.json:
// { "<jutsu id>": { speed: 1.5, pieces: { "<piece name>": { scale, dx, dy, rotate, flipX, flipY, hue, sat, bright, opacity, hide } } } }
let TWEAKS = {};
if (typeof fetch !== 'undefined') fetch('data/anim_tweaks.json').then((r) => (r.ok ? r.json() : {})).then((t) => { if (t && typeof t === 'object') TWEAKS = t; }).catch(() => {});
export function setAnimTweaks(t) { TWEAKS = t || {}; }
export function jutsuSpeed(jutsuId) { const v = TWEAKS[jutsuId]?.speed; return v > 0 ? v : 1; }
let CURRENT = null; // the jutsu whose animation is playing (so shared helpers know whose tweaks apply)
export function setCurrentJutsu(id) { CURRENT = id; }
let HOOK = null; // studio hook: called for every piece placed (el, name, jutsuId)
export function onSpritePlaced(fn) { HOOK = fn; }

function tweakPiece(el, t) {
  if (!t) return;
  if (t.hide) { el.style.visibility = 'hidden'; return; }
  const sc = (t.scale ?? 100) / 100;
  if (sc !== 1 || t.flipX || t.flipY) el.style.scale = `${sc * (t.flipX ? -1 : 1)} ${sc * (t.flipY ? -1 : 1)}`;
  if (t.rotate) el.style.rotate = `${t.rotate}deg`;
  if (t.dx || t.dy) el.style.translate = `${t.dx || 0}px ${t.dy || 0}px`;
  const f = [];
  if (t.hue) f.push(`hue-rotate(${t.hue}deg)`);
  if (t.sat != null && t.sat !== 100) f.push(`saturate(${t.sat}%)`);
  if (t.bright != null && t.bright !== 100) f.push(`brightness(${t.bright}%)`);
  if (t.opacity != null && t.opacity !== 100) f.push(`opacity(${t.opacity}%)`);
  if (f.length) el.style.filter = `${el.style.filter || ''} ${f.join(' ')}`.trim();
}

/** Swap drawn pieces inside root (and root itself) for custom images, then apply any tweaks. */
export function applySprites(root, jutsuId = null) {
  if (!root) return;
  const jid = jutsuId || CURRENT;
  const tw = jid && TWEAKS[jid]?.pieces;
  if (!Object.keys(OVR).length && !tw && !HOOK) return;
  const els = [...(root.dataset?.sp ? [root] : []), ...root.querySelectorAll('[data-sp]')];
  for (let el of els) {
    const name = el.dataset.sp;
    const url = spriteUrl(name, jid);
    if (url && el.dataset.ovr !== '1') {
      if (el.tagName.toLowerCase() === 'svg') {
        const img = document.createElement('img');
        img.src = url;
        img.dataset.sp = name;
        img.dataset.ovr = '1';
        const cls = el.getAttribute('class'); if (cls) img.setAttribute('class', cls);
        img.setAttribute('style', el.getAttribute('style') || '');
        const w = el.getAttribute('width'); const h = el.getAttribute('height');
        if (w) img.style.width = `${parseFloat(w)}px`;
        if (h) img.style.height = `${parseFloat(h)}px`;
        img.style.objectFit = 'contain'; img.style.display = 'block';
        el.replaceWith(img);
        el = img;
      } else {
        el.dataset.ovr = '1';
        el.style.background = `url("${url}") center / contain no-repeat`;
        el.style.border = 'none'; el.style.borderRadius = '0'; el.style.boxShadow = 'none'; el.style.clipPath = 'none';
      }
    }
    if (tw) tweakPiece(el, tw[name]);
    if (HOOK) { try { HOOK(el, name, jid); } catch { /* studio only */ } }
  }
}
const NO_SPRITE = new Set(['pop', 'banner', 'log']);

export function centerOf(el, arena) {
  const a = arena.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 };
}

export function fx(arena, cls, at, html = '') {
  const d = document.createElement('div');
  d.className = `fx ${cls}`;
  d.innerHTML = html;
  const parts = cls.trim().split(/\s+/);
  if (!NO_SPRITE.has(parts[0])) { d.dataset.sp = `fx-${parts.join('-')}`; applySprites(d); }
  d.style.left = `${at.x}px`;
  d.style.top = `${at.y}px`;
  arena.appendChild(d);
  setTimeout(() => d.remove(), 2200);
  return d;
}

export function pop(arena, el, text, tone = '', big = false, dy = 0) {
  if (!el) return;
  const at = centerOf(el, arena);
  fx(arena, `pop ${tone} ${big ? 'big' : ''}`, { x: at.x, y: at.y - 20 + dy }, text);
}

export function banner(arena, text, color = '#ff8c1a') {
  const d = fx(arena, 'banner', { x: 0, y: 0 }, text);
  d.style.setProperty('--bc', color);
}

export function shake(el) {
  el?.animate([
    { transform: 'translateX(0)', filter: 'brightness(1)' },
    { transform: 'translateX(-9px)', filter: 'brightness(2.6)' },
    { transform: 'translateX(8px)', filter: 'brightness(1)' },
    { transform: 'translateX(-5px)', filter: 'brightness(2)' },
    { transform: 'translateX(0)', filter: 'brightness(1)' },
  ], { duration: 380 });
}

export function lunge(el, from, to, sp = 1) {
  if (!el) return;
  const dx = (to.x - from.x) * 0.55; const dy = (to.y - from.y) * 0.55;
  el.animate([
    { transform: 'translate(0,0)' },
    { transform: `translate(${dx}px, ${dy}px) scale(1.06)`, offset: 0.45 },
    { transform: 'translate(0,0)' },
  ], { duration: 520 * sp, easing: 'ease-in-out' });
}

export function orb(arena, from, to, color, { small = false, sp = 1 } = {}) {
  const o = fx(arena, `orb ${small ? 'small' : ''}`, from);
  if (!o.dataset.ovr) { o.style.background = color; o.style.boxShadow = `0 0 18px 6px ${color}`; }
  const dur = (small ? 260 : 440) * sp;
  o.animate([
    { transform: 'translate(-50%,-50%) scale(.6)' },
    { transform: `translate(calc(-50% + ${to.x - from.x}px), calc(-50% + ${to.y - from.y}px)) scale(1.25)` },
  ], { duration: dur, easing: 'ease-in', fill: 'forwards' });
  setTimeout(() => {
    o.remove();
    const b = fx(arena, 'burst', to);
    if (!b.dataset.ovr) b.style.background = color;
  }, dur);
  return dur;
}

export function ring(arena, el, cls = '', color = null) {
  if (!el) return;
  const r = fx(arena, `ring ${cls}`, centerOf(el, arena));
  if (color && !r.dataset.ovr) { r.style.borderColor = color; r.style.boxShadow = `0 0 18px ${color}`; }
}

export function faint(el) {
  el?.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(40px)', opacity: 0.15 }], { duration: 650, easing: 'ease-in', fill: 'forwards' });
}

/** Log Substitution: the shinobi vanishes, a log takes the hit in their place, then they reappear. */
export function logSwap(el, src, hold = 1100) {
  if (!el) return;
  const log = document.createElement('img');
  log.src = src;
  log.className = 'sub-log';
  el.appendChild(log);
  const kids = [...el.children].filter((c) => c !== log);
  kids.forEach((c) => c.animate([{ opacity: 1 }, { opacity: 0, offset: 0.12 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: hold + 300 }));
  log.animate([
    { opacity: 0, transform: 'translate(-50%, 0) scale(.6)' },
    { opacity: 1, transform: 'translate(-50%, 0) scale(1.05)', offset: 0.12 },
    { opacity: 1, transform: 'translate(-50%, 0) rotate(-6deg)', offset: 0.3 },
    { opacity: 1, transform: 'translate(-50%, 0) rotate(3deg)', offset: 0.45 },
    { opacity: 1, transform: 'translate(-50%, 0)', offset: 0.75 },
    { opacity: 0, transform: 'translate(-50%, 20px)' },
  ], { duration: hold + 300, easing: 'ease-out' }).onfinish = () => log.remove();
}

export function appear(el) {
  el?.animate([
    { transform: 'scale(.2)', opacity: 0, filter: 'brightness(3)' },
    { transform: 'scale(1.08)', opacity: 1, offset: 0.7 },
    { transform: 'scale(1)', opacity: 1, filter: 'none' },
  ], { duration: 450, easing: 'ease-out' });
}
