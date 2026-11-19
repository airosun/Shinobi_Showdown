// Small battlefield animation helpers (Web Animations API, no libraries).

export const NATURE_COLOR = {
  fire: '#ee8130', wind: '#6fcf7f', lightning: '#e0c020', earth: '#b5894f', water: '#6390f0',
  yin: '#8a6cc4', yang: '#e6d39a', wood: '#5c9e4a', ice: '#9be3f0', lava: '#e0502a', storm: '#7fb0ff',
  magnet: '#c8b48a', scorch: '#ff9a3c', boil: '#e8a0a0', explosion: '#ffe066',
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

export function centerOf(el, arena) {
  const a = arena.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 };
}

export function fx(arena, cls, at, html = '') {
  const d = document.createElement('div');
  d.className = `fx ${cls}`;
  d.innerHTML = html;
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
  o.style.background = color;
  o.style.boxShadow = `0 0 18px 6px ${color}`;
  const dur = (small ? 260 : 440) * sp;
  o.animate([
    { transform: 'translate(-50%,-50%) scale(.6)' },
    { transform: `translate(calc(-50% + ${to.x - from.x}px), calc(-50% + ${to.y - from.y}px)) scale(1.25)` },
  ], { duration: dur, easing: 'ease-in', fill: 'forwards' });
  setTimeout(() => {
    o.remove();
    const b = fx(arena, 'burst', to);
    b.style.background = color;
  }, dur);
  return dur;
}

export function ring(arena, el, cls = '', color = null) {
  if (!el) return;
  const r = fx(arena, `ring ${cls}`, centerOf(el, arena));
  if (color) { r.style.borderColor = color; r.style.boxShadow = `0 0 18px ${color}`; }
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
