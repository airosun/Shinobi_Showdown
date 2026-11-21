// Jutsu animations. One entry per jutsu that has a custom animation (requested in the kit sheet's
// "Jutsu Animations" tab); every other jutsu falls back to the generic animation for its category.
// Used by the battle playback (app.js) and by the Animation Lab (lab.html).
import * as FX from './fx.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- tiny drawing kit
let styled = false;
function ensureStyle() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = `
  .ax { position: absolute; left: 0; top: 0; z-index: 6; pointer-events: none; transform: translate(-50%, -50%); }
  .ax svg { display: block; overflow: visible; }
  @keyframes ax-spin { to { rotate: 360deg; } }
  @keyframes ax-flicker { 0%, 100% { transform: scaleY(1) skewX(0deg); } 33% { transform: scaleY(1.18) skewX(4deg); } 66% { transform: scaleY(.9) skewX(-5deg); } }
  @keyframes ax-glitch { 0% { clip-path: inset(0 0 60% 0); translate: -4px 0; } 25% { clip-path: inset(30% 0 20% 0); translate: 5px 2px; } 50% { clip-path: inset(10% 0 50% 0); translate: -6px -2px; } 75% { clip-path: inset(55% 0 5% 0); translate: 3px 0; } 100% { clip-path: inset(0 0 0 0); translate: 0 0; } }
  .ax-spin { animation: ax-spin .35s linear infinite; }
  .ax-flicker { animation: ax-flicker .28s ease-in-out infinite; transform-origin: 50% 100%; }
  .ax-glitch { animation: ax-glitch .18s steps(2) infinite; }
  @keyframes ax-flap { from { transform: scaleY(1); } to { transform: scaleY(.3); } }
  @keyframes ax-flapx { from { transform: scaleX(1); } to { transform: scaleX(.25); } }
  .ax-flap { animation: ax-flap .14s ease-in-out infinite alternate; }
  .ax-flapx { animation: ax-flapx .12s ease-in-out infinite alternate; }`;
  document.head.appendChild(s);
}

/** Put a node (HTML string) on the arena at a point. */
function spawn(ctx, html, at, { z = 6, life = 4000 } = {}) {
  ensureStyle();
  const d = document.createElement('div');
  d.className = 'ax';
  d.style.left = `${at.x}px`;
  d.style.top = `${at.y}px`;
  d.style.zIndex = z;
  d.innerHTML = html;
  ctx.arena.appendChild(d);
  if (life) setTimeout(() => d.remove(), life * ctx.sp);
  return d;
}

/** Move a spawned node from a to b (relative translate), optional spin/arc. */
function fly(ctx, node, a, b, ms, { ease = 'ease-in', arc = 0, rotate = null, scale = [1, 1] } = {}) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const ang = rotate ?? (Math.atan2(dy, dx) * 180) / Math.PI;
  const frames = [
    { transform: `translate(-50%,-50%) rotate(${ang}deg) scale(${scale[0]})` },
    ...(arc ? [{ transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - arc}px)) rotate(${ang}deg)`, offset: 0.5 }] : []),
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${ang}deg) scale(${scale[1]})` },
  ];
  return node.animate(frames, { duration: ms * ctx.sp, easing: ease, fill: 'forwards' }).finished.catch(() => {});
}

const fade = (ctx, node, ms = 300) => node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms * ctx.sp, fill: 'forwards' }).finished.then(() => node.remove()).catch(() => {});
const pop = (ctx, node, ms = 250) => node.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.2)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: ms * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
const shake = (ctx) => ctx.targetEls.forEach((t) => FX.shake(t));
const shakeEl = (el) => FX.shake(el);
const boom = (ctx, at, color = '#ffe066', size = 120) => {
  const b = spawn(ctx, `<div style="width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,#fff 0%,${color} 35%,${color}00 70%)"></div>`, at, { life: 900 });
  b.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }], { duration: 550 * ctx.sp, easing: 'ease-out', fill: 'forwards' });
};
const puff = (ctx, at, color = '#ffffff', size = 70) => {
  const p = spawn(ctx, `<div style="width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,${color}e0 0%,${color}80 40%,${color}00 70%)"></div>`, at, { life: 1200 });
  p.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0.9 }, { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 30}px), calc(-50% - 40px)) scale(1.6)`, opacity: 0 }], { duration: 900 * ctx.sp, easing: 'ease-out', fill: 'forwards' });
};
const lunge = (ctx, to, k = 0.55, ms = 520) => {
  const el = ctx.userEl;
  const dx = (to.x - ctx.from.x) * k; const dy = (to.y - ctx.from.y) * k;
  el.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px, ${dy}px) scale(1.06)`, offset: 0.45 }, { transform: 'translate(0,0)' }], { duration: ms * ctx.sp, easing: 'ease-in-out' });
  return { x: ctx.from.x + dx, y: ctx.from.y + dy };
};
const between = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const feetOf = (ctx, el) => { const r = el.getBoundingClientRect(); const a = ctx.arena.getBoundingClientRect(); return { x: r.left - a.left + r.width / 2, y: r.bottom - a.top - 8 }; };
const sizeOf = (el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; };
const userImg = (ctx) => ctx.userEl.querySelector('img.art, img');
const ghostOf = (ctx, at, opacity = 0.55) => {
  const img = userImg(ctx);
  const { w, h } = ctx.userSize || sizeOf(ctx.userEl);
  const html = img ? `<img src="${img.getAttribute('src')}" style="height:${h}px;${img.style.transform ? `transform:${img.style.transform};` : ''}opacity:${opacity};filter:drop-shadow(0 0 6px #fff)">`
    : `<div style="width:${w}px;height:${h}px;border-radius:50%;background:#fff;opacity:${opacity}"></div>`;
  return spawn(ctx, html, at, { life: 1500 });
};
// enemy side box (all units of the targets' side)
function sideBox(ctx) {
  const els = ctx.sideEls.length ? ctx.sideEls : ctx.targetEls;
  const a = ctx.arena.getBoundingClientRect();
  const rs = els.map((e) => e.getBoundingClientRect());
  const x1 = Math.min(...rs.map((r) => r.left)) - a.left; const x2 = Math.max(...rs.map((r) => r.right)) - a.left;
  const y1 = Math.min(...rs.map((r) => r.top)) - a.top; const y2 = Math.max(...rs.map((r) => r.bottom)) - a.top;
  return { x1, x2, y1, y2, c: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }, w: x2 - x1, h: y2 - y1 };
}

// ---------------------------------------------------------------- art (inline SVG)
const ART = {
  star: (s = 26, c = '#c9ced6') => `<svg width="${s}" height="${s}" viewBox="-10 -10 20 20" class="ax-spin"><path d="M0-10 2-2 10 0 2 2 0 10-2 2-10 0-2-2Z" fill="${c}" stroke="#555" stroke-width=".8"/><circle r="1.8" fill="#333"/></svg>`,
  bone: (l = 70) => `<svg width="${l}" height="16" viewBox="0 0 70 16"><path d="M0 8 Q30 1 70 8 Q30 15 0 8Z" fill="#f4f1e8" stroke="#cfc8b4"/></svg>`,
  spike: (l = 60, c = '#151515') => `<svg width="${l}" height="14" viewBox="0 0 60 14"><path d="M0 2 60 7 0 12Z" fill="${c}" stroke="#7a5cff" stroke-width=".8"/></svg>`,
  missile: () => `<svg width="46" height="14" viewBox="0 0 46 14"><path d="M8 3h28l8 4-8 4H8Z" fill="#9aa3ad" stroke="#555"/><path d="M8 3 3 0v14l5-3" fill="#6b737c"/><path d="M3 4-8 7 3 10Z" fill="#ff9a3c"/></svg>`,
  flame: (s = 40, c1 = '#000', c2 = '#7a2bd6') => `<svg width="${s}" height="${s * 1.3}" viewBox="0 0 40 52" class="ax-flicker"><path d="M20 52C6 52 0 42 4 30 7 22 12 18 12 8c6 4 10 10 10 16 2-4 2-8 1-12 9 6 15 16 13 26-2 10-8 14-16 14Z" fill="${c1}" stroke="${c2}" stroke-width="2.5"/></svg>`,
  bubble: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#bfe8ff33" stroke="#e6f7ff" stroke-width="1.2"/><circle cx="7" cy="6" r="2" fill="#fff" opacity=".8"/></svg>`,
  axe: () => `<svg width="56" height="44" viewBox="0 0 56 44"><path d="M0 22h34" stroke="#8a6a52" stroke-width="7" stroke-linecap="round"/><path d="M30 4c14 2 24 10 24 18S44 40 30 42c4-6 5-13 5-20S34 10 30 4Z" fill="#c9b8a8" stroke="#6b5444" stroke-width="2"/></svg>`,
  palm: () => `<svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#fff6" stroke="#fff" stroke-width="3"/><path d="M16 30V18m6 12V14m6 16V15m6 15V19" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`,
  eye: () => `<svg width="64" height="34" viewBox="0 0 64 34"><path d="M2 17C14 2 50 2 62 17 50 32 14 32 2 17Z" fill="#f4f2ff" stroke="#c9c2e8" stroke-width="2"/><circle cx="32" cy="17" r="9" fill="#e9e4ff" stroke="#b9b0dd"/><path d="M2 17c8-3 12-8 14-12M62 17c-8-3-12-8-14-12M10 26c6-2 9-3 12-6M54 26c-6-2-9-3-12-6" stroke="#b89bd8" stroke-width="1.5" fill="none"/></svg>`,
  rasengan: (s = 54) => `<div class="ax-spin" style="width:${s}px;height:${s}px;border-radius:50%;background:conic-gradient(from 0deg,#e8f6ff,#4aa3ff,#cfeaff,#1f6fd6,#e8f6ff);box-shadow:0 0 22px 8px #6cb8ffaa"></div>`,
  ant: () => `<svg width="140" height="150" viewBox="0 0 90 96"><g stroke="#3a2a22" stroke-width="2"><path d="M20 30 4 18M20 40 2 40M20 50 4 62M70 30 86 18M70 40 88 40M70 50 86 62" stroke="#5e4a3e" stroke-width="5" stroke-linecap="round"/><path d="M36 68 32 94M54 68 58 94" stroke="#3a2a22" stroke-width="9" stroke-linecap="round"/><path d="M36 68 32 94M54 68 58 94" stroke="#8c7b6c" stroke-width="6" stroke-linecap="round"/><ellipse cx="45" cy="42" rx="26" ry="30" fill="#7a6a5c"/><ellipse cx="45" cy="18" rx="13" ry="11" fill="#8c7b6c"/></g><path d="M37 9 31-2M53 9 59-2" stroke="#c8202a" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="18" r="2" fill="#111"/><circle cx="50" cy="18" r="2" fill="#111"/><path d="M33 40h24M33 50h24" stroke="#4a3a30" stroke-width="2"/></svg>`,
  antBody: (h = 160) => `<svg width="${h * 0.72}" height="${h}" viewBox="0 0 72 100"><g stroke="#3a2a22" stroke-width="2.5"><ellipse cx="36" cy="58" rx="32" ry="40" fill="#7a6a5c"/><ellipse cx="36" cy="18" rx="16" ry="14" fill="#8c7b6c"/></g><path d="M27 7 20-6M45 7 52-6" stroke="#c8202a" stroke-width="5" stroke-linecap="round"/><circle cx="30" cy="18" r="2.5" fill="#111"/><circle cx="42" cy="18" r="2.5" fill="#111"/><path d="M14 52h44M14 66h44" stroke="#4a3a30" stroke-width="2.5"/><path d="M20 28c10 6 22 6 32 0" stroke="#5e4a3e" stroke-width="2" fill="none"/></svg>`,
  antLimb: () => `<svg width="64" height="14" viewBox="0 0 64 14"><path d="M0 7H42" stroke="#5e4a3e" stroke-width="7" stroke-linecap="round"/><circle cx="22" cy="7" r="4.5" fill="#7a6a5c" stroke="#3a2a22"/><path d="M40 2 64 7 40 12Z" fill="#c9ced6" stroke="#444"/></svg>`,
  crowBody: (s = 120) => `<svg width="${s}" height="${s}" viewBox="0 0 120 120"><path d="M60 6C88 6 108 28 110 56 112 86 90 112 60 114 30 112 8 86 10 56 12 28 32 6 60 6Z" fill="#1d1d24" stroke="#5a5a6e" stroke-width="3"/><path d="M42 40h36M42 70h36" stroke="#5a5a6e" stroke-width="3"/></svg>`,
  blade: (l = 40) => `<svg width="${l}" height="10" viewBox="0 0 40 10"><path d="M0 5 40 1v8Z" fill="#c9ced6" stroke="#444"/></svg>`,
  spider: () => `<svg width="34" height="28" viewBox="0 0 22 18"><g stroke="#f4f4f4" stroke-width="1.6" fill="none"><path d="M6 7 0 2M6 9 0 9M6 11 0 16M16 7 22 2M16 9 22 9M16 11 22 16"/></g><ellipse cx="11" cy="9" rx="6" ry="5" fill="#fafafa" stroke="#bbb"/></svg>`,
  dragon: () => `<svg width="170" height="90" viewBox="0 0 170 90"><path d="M10 50C40 40 60 60 90 52 112 46 120 30 140 28l18-10-4 16 12 4-16 6c-14 12-30 24-56 26-26 2-44-10-84-12Z" fill="#f6f4ee" stroke="#c9c4b4" stroke-width="2"/><path d="M70 40 54 6l28 30M100 40l10-30 6 28" fill="#efece2" stroke="#c9c4b4" stroke-width="2"/><circle cx="148" cy="30" r="2.5" fill="#333"/></svg>`,
  teardrop: () => `<svg width="70" height="90" viewBox="0 0 70 90"><path d="M35 0C45 26 66 42 66 60A31 31 0 0 1 4 60C4 42 25 26 35 0Z" fill="#f6f4ee" stroke="#c9c4b4" stroke-width="3"/><circle cx="35" cy="62" r="9" fill="#e9e5d8"/></svg>`,
};
const goldChain = (len) => `<svg width="${len}" height="14" viewBox="0 0 ${len} 14"><line x1="0" y1="7" x2="${len}" y2="7" stroke="#f7d354" stroke-width="5" stroke-dasharray="10 4" stroke-linecap="round" style="filter:drop-shadow(0 0 4px #ffcf33)"/></svg>`;

/** A gold chain growing from a to b (rotated line that scales out from a). */
async function chain(ctx, a, b, ms = 380) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const n = spawn(ctx, goldChain(len), a, { life: 2600 });
  n.style.transformOrigin = '0 50%';
  await n.animate([{ transform: `translate(0,-50%) rotate(${ang}deg) scaleX(0)` }, { transform: `translate(0,-50%) rotate(${ang}deg) scaleX(1)` }], { duration: ms * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
  return n;
}

/** A ring around a unit (chains, wraps). */
function wrapRing(ctx, el, html, ms = 900) {
  const { w, h } = sizeOf(el);
  const at = FX.centerOf(el, ctx.arena);
  const n = spawn(ctx, `<div style="width:${w * 0.9}px;height:${h * 0.55}px;border-radius:50%;${html}"></div>`, at, { life: ms + 900 });
  n.animate([{ transform: 'translate(-50%,-50%) scale(1.6) rotate(0deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1) rotate(200deg)', opacity: 1, offset: 0.5 }, { transform: 'translate(-50%,-50%) scale(.95) rotate(360deg)', opacity: 1 }], { duration: ms * ctx.sp, easing: 'ease-out', fill: 'forwards' });
  setTimeout(() => fade(ctx, n, 400), (ms + 300) * ctx.sp);
  return n;
}

// ---------------------------------------------------------------- the animations
// Each entry: desc (what was asked for), play(ctx) → resolves at impact. Optional decoy(ctx, el): when its Decoy pops.
export const ANIMS = {
  kunai: {
    desc: 'Ninja stars fly at the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      for (let i = 0; i < 3; i++) {
        const s = spawn(ctx, ART.star(22), ctx.from, { life: 1200 });
        fly(ctx, s, ctx.from, { x: to.x + (i - 1) * 10, y: to.y + (i - 1) * 8 }, 300, { rotate: 0 }).then(() => s.remove());
        await wait(90 * ctx.sp);
      }
      await wait(230 * ctx.sp);
    },
  },
  chain_barrier: {
    desc: 'Gold chains encircle each ally.',
    async play(ctx) {
      ctx.targetEls.forEach((el) => wrapRing(ctx, el, 'border:6px dashed #f7d354;box-shadow:0 0 14px #ffcf33', 1000));
      await wait(1000 * ctx.sp);
    },
  },
  chain_lash: {
    desc: 'Gold chains reach out to strike each enemy; targets shake.',
    async play(ctx) {
      const ns = await Promise.all(ctx.tos.map((t) => chain(ctx, ctx.from, t, 420)));
      shake(ctx);
      ns.forEach((n) => setTimeout(() => fade(ctx, n), 300 * ctx.sp));
    },
  },
  adamantine_chains: {
    desc: 'Gold chains reach out from the user, then bind the target; target shakes.',
    async play(ctx) {
      const n = await chain(ctx, ctx.from, ctx.tos[0], 420);
      wrapRing(ctx, ctx.targetEls[0], 'border:6px dashed #f7d354;box-shadow:0 0 14px #ffcf33', 700);
      shake(ctx);
      setTimeout(() => fade(ctx, n), 500 * ctx.sp);
      await wait(400 * ctx.sp);
    },
  },
  ash_bones: {
    desc: 'User dashes and slashes with a white pointed bone; target shakes.',
    async play(ctx) {
      const to = ctx.tos[0];
      const hit = lunge(ctx, to, 0.6);
      const b = spawn(ctx, ART.bone(80), ctx.from, { life: 900 });
      fly(ctx, b, ctx.from, hit, 240, { ease: 'ease-in-out' });
      await wait(240 * ctx.sp);
      FX.fx(ctx.arena, 'slash', to);
      shake(ctx);
      fade(ctx, b, 250);
    },
  },
  almighty_push: {
    desc: 'A light purple circle expands from the user until it reaches and strikes the target.',
    async play(ctx) {
      const r = Math.hypot(ctx.tos[0].x - ctx.from.x, ctx.tos[0].y - ctx.from.y) * 2;
      const c = spawn(ctx, `<div style="width:${r}px;height:${r}px;border-radius:50%;border:5px solid #d6c4ff;background:radial-gradient(circle,#c9b3ff00 55%,#c9b3ff55 70%,#c9b3ff00 72%);box-shadow:0 0 24px #b99cff"></div>`, ctx.from, { life: 1200 });
      await c.animate([{ transform: 'translate(-50%,-50%) scale(.05)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0.9 }], { duration: 520 * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      shake(ctx);
      fade(ctx, c, 250);
    },
  },
  amaterasu: {
    desc: "Black flames appear at the target's feet and burn them.",
    async play(ctx) {
      ctx.targetEls.forEach((el) => {
        const f = feetOf(ctx, el);
        [-28, 0, 28].forEach((dx, i) => {
          const n = spawn(ctx, ART.flame(52 + (i === 1 ? 22 : 0)), { x: f.x + dx * 1.4, y: f.y - 34 }, { life: 1500 });
          pop(ctx, n, 200);
          setTimeout(() => fade(ctx, n, 400), 1000 * ctx.sp);
        });
      });
      await wait(450 * ctx.sp);
      shake(ctx);
    },
  },
  dimension_shift: {
    desc: 'A black, blocky, glitching shape appears in front of the user.',
    async play(ctx) {
      const { h } = sizeOf(ctx.userEl);
      const at = { x: ctx.from.x + (ctx.isFoe ? -40 : 40), y: ctx.from.y };
      const g = spawn(ctx, `<div class="ax-glitch" style="width:${h * 0.55}px;height:${h * 0.8}px;background:repeating-linear-gradient(0deg,#000 0 10px,#1b1630 10px 13px,#000 13px 22px);box-shadow:0 0 18px #6b4bd6, inset 0 0 0 2px #2a2050"></div>`, at, { life: 1600 });
      await pop(ctx, g, 160);
      await wait(700 * ctx.sp);
      fade(ctx, g, 300);
    },
  },
  arhat_fist: {
    desc: 'User dashes to and strikes the target with a palm strike.',
    async play(ctx) {
      const to = ctx.tos[0];
      lunge(ctx, to, 0.62);
      await wait(240 * ctx.sp);
      const p = spawn(ctx, ART.palm(), to, { life: 700 });
      p.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], { duration: 450 * ctx.sp, fill: 'forwards' });
      shake(ctx);
    },
  },
  sand_armor: {
    desc: 'A sandy wall grows in front of the user.',
    async play(ctx) {
      const { w, h } = sizeOf(ctx.userEl);
      const f = feetOf(ctx, ctx.userEl);
      const wall = spawn(ctx, `<div style="width:${Math.max(70, w * 0.75)}px;height:${h * 0.85}px;border-radius:40% 40% 6px 6px;background:radial-gradient(circle at 30% 30%,#ead7a6,#c9a86b 60%,#a8864e);box-shadow:inset 0 -10px 18px #8a6a3a, 0 0 14px #d9b56a88"></div>`, { x: f.x + (ctx.isFoe ? -26 : 26), y: f.y }, { life: 1700 });
      wall.style.transformOrigin = '50% 100%';
      await wall.animate([{ transform: 'translate(-50%,-100%) scaleY(0)' }, { transform: 'translate(-50%,-100%) scaleY(1)' }], { duration: 450 * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      await wait(600 * ctx.sp);
      fade(ctx, wall, 350);
    },
  },
  asura_missiles: {
    desc: 'Missiles fire from the user and strike the targets.',
    async play(ctx) {
      for (const [i, t] of ctx.tos.entries()) {
        const m = spawn(ctx, ART.missile(), ctx.from, { life: 1200 });
        fly(ctx, m, ctx.from, t, 380, { arc: 50 }).then(() => { m.remove(); boom(ctx, t, '#ff9a3c', 90); shakeEl(ctx.targetEls[i]); });
        await wait(110 * ctx.sp);
      }
      await wait(380 * ctx.sp);
    },
  },
  axe_arm: {
    desc: 'User dashes and strikes the target with an axe arm.',
    async play(ctx) {
      const to = ctx.tos[0];
      const hit = lunge(ctx, to, 0.6);
      const a = spawn(ctx, ART.axe(), ctx.from, { life: 900 });
      fly(ctx, a, ctx.from, hit, 240, { ease: 'ease-in-out' });
      await wait(240 * ctx.sp);
      FX.fx(ctx.arena, 'slash', to);
      shake(ctx);
      fade(ctx, a, 250);
    },
  },
  battle_analysis: {
    desc: 'A radar scan sweeps over the target.',
    play: (ctx) => radar(ctx, ctx.targetEls[0]),
  },
  giant_rasengan: {
    desc: 'User forms a large blue spiraling orb, dashes and strikes the target with it.',
    async play(ctx) {
      const to = ctx.tos[0];
      const hand = { x: ctx.from.x + (ctx.isFoe ? -24 : 24), y: ctx.from.y };
      const r = spawn(ctx, ART.rasengan(70), hand, { life: 2000 });
      await pop(ctx, r, 380);
      const hit = lunge(ctx, to, 0.75, 600);
      await fly(ctx, r, hand, between(hand, to, 0.9), 270, { rotate: 0 });
      boom(ctx, to, '#6cb8ff', 150);
      shake(ctx);
      fade(ctx, r, 200);
      void hit;
    },
  },
  iron_maiden: {
    desc: "Kankuro's Black Ant puppet (six arms, two legs, gray-brown, red horns) flies to the target and grabs them.",
    async play(ctx) {
      const to = ctx.tos[0];
      const ant = spawn(ctx, ART.ant(), ctx.from, { life: 1800 });
      await fly(ctx, ant, ctx.from, to, 480, { rotate: 0, ease: 'ease-in-out' });
      await ant.animate([{ transform: `translate(calc(-50% + ${to.x - ctx.from.x}px), calc(-50% + ${to.y - ctx.from.y}px)) scale(1.1, 1)` }, { transform: `translate(calc(-50% + ${to.x - ctx.from.x}px), calc(-50% + ${to.y - ctx.from.y}px)) scale(.7, 1.05)` }], { duration: 200 * ctx.sp, fill: 'forwards' }).finished.catch(() => {});
      shake(ctx);
      setTimeout(() => fade(ctx, ant, 300), 400 * ctx.sp);
    },
  },
  black_panther: {
    desc: 'A black lightning strike shaped like a panther flies from the user to the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const bolt = `<svg width="110" height="50" viewBox="0 0 110 50" style="filter:drop-shadow(0 0 6px #8a5cff)"><path d="M0 26 22 18 30 30 50 14 58 28 78 12 84 22 100 8 110 18 96 30 104 32 84 44 78 34 60 46 52 34 34 46 26 34 8 40Z" fill="#0d0b12" stroke="#b49bff" stroke-width="1.5"/><path d="M96 12l6-10 4 10M86 14l2-10 6 8" stroke="#b49bff" stroke-width="2" fill="none"/></svg>`;
      const b = spawn(ctx, bolt, ctx.from, { life: 1200 });
      await fly(ctx, b, ctx.from, to, 360);
      b.remove();
      boom(ctx, to, '#6d4bd6', 130);
      shake(ctx);
    },
  },
  crow_embrace: {
    desc: "The Black Ant's body (no limbs) engulfs the target, then its limbs fly in and stab them.",
    async play(ctx) {
      const el = ctx.targetEls[0]; const to = ctx.tos[0];
      const { h } = sizeOf(el);
      const body = spawn(ctx, ART.antBody(h * 1.05), to, { life: 2200 });
      await body.animate([{ transform: 'translate(-50%,-50%) scale(1.8)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0.92 }], { duration: 380 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      const dirs = [0, 60, 120, 180, 240, 300];
      await Promise.all(dirs.map((d, i) => {
        const rad = (d * Math.PI) / 180;
        const start = { x: to.x + Math.cos(rad) * 110, y: to.y + Math.sin(rad) * 80 };
        const bl = spawn(ctx, ART.antLimb(), start, { life: 900 });
        return wait(i * 40 * ctx.sp).then(() => fly(ctx, bl, start, to, 220)).then(() => bl.remove());
      }));
      shake(ctx);
      setTimeout(() => fade(ctx, body, 350), 300 * ctx.sp);
    },
  },
  black_spear: {
    desc: 'A black spike flies from the user to the target.',
    async play(ctx) {
      const s = spawn(ctx, ART.spike(70), ctx.from, { life: 1000 });
      await fly(ctx, s, ctx.from, ctx.tos[0], 300);
      s.remove();
      boom(ctx, ctx.tos[0], '#5a3fa8', 90);
      shake(ctx);
    },
  },
  blaze_kagutsuchi: {
    desc: 'A black flame, trailed by more black flame, shoots out and strikes the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const lead = spawn(ctx, ART.flame(46), ctx.from, { life: 1400 });
      const trail = setInterval(() => {
        const box = lead.getBoundingClientRect(); const a = ctx.arena.getBoundingClientRect();
        const t = spawn(ctx, ART.flame(24), { x: box.left - a.left + box.width / 2, y: box.top - a.top + box.height / 2 }, { life: 900 });
        fade(ctx, t, 600);
      }, 45);
      await fly(ctx, lead, ctx.from, to, 420, { rotate: 90 + (Math.atan2(to.y - ctx.from.y, to.x - ctx.from.x) * 180) / Math.PI });
      clearInterval(trail);
      lead.remove();
      ANIMS.amaterasu.play(ctx);
      shake(ctx);
      await wait(300 * ctx.sp);
    },
  },
  flicker_slashes: {
    desc: 'Afterimages of the user slash every target.',
    async play(ctx) {
      await afterimages(ctx, ctx.tos, true);
    },
  },
  flicker_strike: {
    desc: 'Afterimages of the user strike the target.',
    async play(ctx) {
      await afterimages(ctx, [ctx.tos[0], ctx.tos[0], ctx.tos[0]], false);
    },
  },
  body_hijack: {
    desc: 'The user flies to the target and wraps around them.',
    async play(ctx) {
      const to = ctx.tos[0];
      const g = ghostOf(ctx, ctx.from, 0.75);
      g.style.filter = 'brightness(.25)';
      await fly(ctx, g, ctx.from, to, 380, { rotate: 0, scale: [1, 0.5] });
      g.remove();
      wrapRing(ctx, ctx.targetEls[0], 'border:9px solid #0b0b0b;box-shadow:0 0 12px #000, inset 0 0 8px #3b2b55', 900);
      shake(ctx);
      await wait(350 * ctx.sp);
    },
  },
  solid_fog: {
    desc: "A fog cloud spreads from the user and covers the enemies' side.",
    async play(ctx) {
      const box = sideBox(ctx);
      const fog = spawn(ctx, `<div style="width:${box.w + 120}px;height:${box.h + 60}px;border-radius:50%;background:radial-gradient(ellipse,#cfe8c8cc 0%,#b9d8b0aa 45%,#b9d8b000 72%);filter:blur(4px)"></div>`, ctx.from, { life: 2400 });
      await fly(ctx, fog, ctx.from, box.c, 600, { rotate: 0, scale: [0.2, 1], ease: 'ease-out' });
      shake(ctx);
      setTimeout(() => fade(ctx, fog, 600), 700 * ctx.sp);
    },
  },
  steam_armor: {
    desc: 'Steam pours off the user and forms a shield in front of them.',
    async play(ctx) {
      for (let i = 0; i < 8; i++) { puff(ctx, { x: ctx.from.x + (Math.random() - 0.5) * 50, y: ctx.from.y + (Math.random() - 0.3) * 60 }); await wait(50 * ctx.sp); }
      const { h } = sizeOf(ctx.userEl);
      const sh = spawn(ctx, `<div style="width:${h * 0.35}px;height:${h * 0.85}px;border-radius:50%;background:radial-gradient(ellipse,#ffffffaa,#e8f2ff55 55%,#ffffff00 72%);box-shadow:0 0 24px #fff8"></div>`, { x: ctx.from.x + (ctx.isFoe ? -45 : 45), y: ctx.from.y }, { life: 1600 });
      await pop(ctx, sh, 300);
      await wait(600 * ctx.sp);
      fade(ctx, sh, 350);
    },
  },
  steam_kick: { desc: 'User flies in to kick the target; steam bursts off it.', play: (ctx) => steamHit(ctx) },
  steam_punch: { desc: 'User flies in to punch the target; steam bursts off it.', play: (ctx) => steamHit(ctx) },
  bubble_clone: {
    desc: 'When the clone is struck, it turns into bubbles before the user returns.',
    async play(ctx) { FX.ring(ctx.arena, ctx.userEl, 'aura'); for (let i = 0; i < 6; i++) bubbleUp(ctx, ctx.from); await wait(500 * ctx.sp); },
    decoy(ctx, el) {
      const at = FX.centerOf(el, ctx.arena);
      el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.15 }, { opacity: 0, offset: 0.8 }, { opacity: 1 }], { duration: 1300 * ctx.sp });
      for (let i = 0; i < 26; i++) setTimeout(() => bubbleUp(ctx, { x: at.x + (Math.random() - 0.5) * 80, y: at.y + (Math.random() - 0.3) * 110 }, 1.6), i * 20 * ctx.sp);
    },
  },
  acid_bubbles: {
    desc: 'User shoots bubbles at the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      for (let i = 0; i < 6; i++) {
        const b = spawn(ctx, ART.bubble(16 + Math.random() * 12), ctx.from, { life: 1200 });
        fly(ctx, b, ctx.from, { x: to.x + (Math.random() - 0.5) * 40, y: to.y + (Math.random() - 0.5) * 40 }, 420, { rotate: 0, arc: 20 + Math.random() * 30 }).then(() => { b.remove(); puff(ctx, to, '#d9ff9a', 40); });
        await wait(60 * ctx.sp);
      }
      await wait(420 * ctx.sp);
      shake(ctx);
    },
  },
  bubble_prison: {
    desc: 'User shoots a bubble that keeps growing until it engulfs the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const { h } = sizeOf(ctx.targetEls[0]);
      const b = spawn(ctx, ART.bubble(20), ctx.from, { life: 2400 });
      await fly(ctx, b, ctx.from, to, 600, { rotate: 0, scale: [0.6, h / 20 * 0.9], ease: 'ease-in-out' });
      shake(ctx);
      setTimeout(() => fade(ctx, b, 400), 900 * ctx.sp);
    },
  },
  bubble_burst: {
    desc: "User shoots a cloud of bubbles at the enemies' side; they explode on contact.",
    async play(ctx) {
      for (let i = 0; i < 14; i++) {
        const t = ctx.tos[i % ctx.tos.length];
        const b = spawn(ctx, ART.bubble(14 + Math.random() * 14), ctx.from, { life: 1500 });
        fly(ctx, b, ctx.from, { x: t.x + (Math.random() - 0.5) * 60, y: t.y + (Math.random() - 0.5) * 60 }, 520, { rotate: 0, arc: 30 + Math.random() * 40 }).then(() => { b.remove(); boom(ctx, t, '#bfe8ff', 50); });
        await wait(35 * ctx.sp);
      }
      await wait(520 * ctx.sp);
      shake(ctx);
    },
  },
  butterfly_bullet: {
    desc: 'User flies in and strikes the enemy.',
    async play(ctx) {
      const to = ctx.tos[0];
      const g = ghostOf(ctx, ctx.from, 0.6);
      await fly(ctx, g, ctx.from, to, 300, { rotate: 0, ease: 'ease-in' });
      g.remove();
      lunge(ctx, to, 0.7, 420);
      boom(ctx, to, '#ffb2d9', 140);
      shake(ctx);
    },
  },
  byakugan_scan: { desc: 'A Byakugan eye appears over the user, then a radar scan sweeps the target.', play: (ctx) => eyeScan(ctx) },
  ao_sensing: { desc: 'A Byakugan eye appears over the user, then a radar scan sweeps the target.', play: (ctx) => eyeScan(ctx) },
  c0: {
    desc: 'The user explodes; the blast expands until it reaches and strikes every enemy.',
    async play(ctx) {
      const far = Math.max(...ctx.tos.map((t) => Math.hypot(t.x - ctx.from.x, t.y - ctx.from.y)));
      ctx.userEl.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(4)' }], { duration: 400 * ctx.sp, fill: 'forwards' });
      await wait(400 * ctx.sp);
      const d = far * 2 + 80;
      const e = spawn(ctx, `<div style="width:${d}px;height:${d}px;border-radius:50%;background:radial-gradient(circle,#fff 0%,#fff6c2 20%,#ffd04a 40%,#ff7a1a 58%,#ff7a1a00 70%)"></div>`, ctx.from, { life: 1600 });
      await e.animate([{ transform: 'translate(-50%,-50%) scale(.05)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 650 * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      shake(ctx);
      ctx.userEl.getAnimations().forEach((a) => a.cancel());
      fade(ctx, e, 500);
    },
  },
  c1_spiders: {
    desc: 'White clay spiders crawl from the user to every enemy and blow up on them.',
    async play(ctx) {
      const f0 = feetOf(ctx, ctx.userEl);
      await Promise.all(ctx.targetEls.flatMap((el, i) => [0, 1].map(async (k) => {
        const f = feetOf(ctx, el);
        const s = spawn(ctx, ART.spider(), { x: f0.x + k * 14, y: f0.y }, { life: 1600 });
        await wait((i * 60 + k * 90) * ctx.sp);
        await fly(ctx, s, { x: f0.x + k * 14, y: f0.y }, { x: f.x + (k ? 14 : -14), y: f.y }, 650, { rotate: 0, ease: 'linear', arc: 6 });
        s.remove();
        boom(ctx, { x: f.x, y: f.y - 20 }, '#ffe066', 80);
      })));
      shake(ctx);
    },
  },
  c2_dragon: {
    desc: "A large white clay dragon flies to the enemies' side and blows up every enemy.",
    async play(ctx) {
      const box = sideBox(ctx);
      const start = { x: ctx.from.x, y: ctx.from.y - 40 };
      const d = spawn(ctx, ART.dragon(), start, { life: 2200 });
      if (ctx.isFoe) d.firstElementChild.style.transform = 'scaleX(-1)';
      await fly(ctx, d, start, { x: box.c.x, y: box.y1 + box.h * 0.3 }, 650, { rotate: 0, ease: 'ease-in-out', arc: 30, scale: [0.8, 1.3] });
      for (const t of ctx.tos) { boom(ctx, t, '#ffe066', 130); await wait(90 * ctx.sp); }
      shake(ctx);
      fade(ctx, d, 300);
    },
  },
  c3_bomb: {
    desc: "A white clay teardrop bomb drops onto the enemies' side and explodes over them.",
    async play(ctx) {
      const box = sideBox(ctx);
      const top = { x: box.c.x, y: -60 };
      const b = spawn(ctx, ART.teardrop(), top, { life: 1600 });
      await fly(ctx, b, top, { x: box.c.x, y: box.c.y }, 600, { rotate: 180, ease: 'ease-in' });
      b.remove();
      const d = box.w + 140;
      const e = spawn(ctx, `<div style="width:${d}px;height:${d * 0.6}px;border-radius:50%;background:radial-gradient(ellipse,#fff 0%,#ffe9a0 25%,#ffb340 50%,#ff7a1a00 72%)"></div>`, box.c, { life: 1400 });
      await e.animate([{ transform: 'translate(-50%,-50%) scale(.1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 380 * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      shake(ctx);
      fade(ctx, e, 500);
    },
  },
  c4_karura: {
    desc: 'Each enemy explodes, one after another.',
    async play(ctx) {
      for (const [i, t] of ctx.tos.entries()) {
        const el = ctx.targetEls[i];
        el.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(3) saturate(0)' }, { filter: 'brightness(1)' }], { duration: 300 * ctx.sp });
        await wait(160 * ctx.sp);
        boom(ctx, t, '#fff3b0', 150);
        shakeEl(el);
        await wait(220 * ctx.sp);
      }
    },
  },
};

// shared pieces
async function radar(ctx, el) {
  const at = FX.centerOf(el, ctx.arena); const { h } = sizeOf(el); const d = Math.max(90, h * 0.9);
  const r = spawn(ctx, `<div style="width:${d}px;height:${d}px;border-radius:50%;border:2px solid #6dff9a;background:repeating-radial-gradient(circle,#6dff9a22 0 2px,transparent 2px ${d / 6}px);box-shadow:0 0 12px #6dff9a88;position:relative;overflow:hidden"><div class="ax-spin" style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(#6dff9aaa,#6dff9a00 25%,#6dff9a00);animation-duration:.6s"></div></div>`, at, { life: 1700 });
  await pop(ctx, r, 200);
  await wait(900 * ctx.sp);
  fade(ctx, r, 300);
}
async function eyeScan(ctx) {
  const { h } = sizeOf(ctx.userEl);
  const e = spawn(ctx, ART.eye(), { x: ctx.from.x, y: ctx.from.y - h * 0.38 }, { life: 1900 });
  await pop(ctx, e, 260);
  await radar(ctx, ctx.targetEls[0]);
  fade(ctx, e, 250);
}
async function afterimages(ctx, tos, slash) {
  for (const [i, to] of tos.entries()) {
    const g = ghostOf(ctx, ctx.from, 0.6);
    const near = between(ctx.from, to, 0.82);
    await fly(ctx, g, ctx.from, near, 150, { rotate: 0, ease: 'ease-out' });
    if (slash) FX.fx(ctx.arena, 'slash', to); else boom(ctx, to, '#ffffff', 70);
    const el = ctx.targetEls[Math.min(i, ctx.targetEls.length - 1)];
    shakeEl(el);
    fade(ctx, g, 260);
  }
  await wait(150 * ctx.sp);
}
async function steamHit(ctx) {
  const to = ctx.tos[0];
  const g = ghostOf(ctx, ctx.from, 0.5);
  fly(ctx, g, ctx.from, between(ctx.from, to, 0.85), 260, { rotate: 0 }).then(() => g.remove());
  lunge(ctx, to, 0.7, 480);
  await wait(250 * ctx.sp);
  boom(ctx, to, '#ffffff', 100);
  for (let i = 0; i < 6; i++) puff(ctx, { x: to.x + (Math.random() - 0.5) * 50, y: to.y + (Math.random() - 0.5) * 40 });
  shake(ctx);
}
function bubbleUp(ctx, at, k = 1) {
  const b = spawn(ctx, ART.bubble((10 + Math.random() * 16) * k), at, { life: 1300 });
  b.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 50}px), calc(-50% - ${50 + Math.random() * 60}px)) scale(1.1)`, opacity: 0 }], { duration: 1000 * ctx.sp, easing: 'ease-out', fill: 'forwards' });
}

// ---------------------------------------------------------------- batch 2 (sheet rows 10, 41–77)
const rnd = (a, b) => a + Math.random() * (b - a);
const ang = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
const grow = (ctx, n, ms, from = 'scale(.2)', to = 'scale(1)', origin) => {
  if (origin) n.style.transformOrigin = origin;
  return n.animate([{ transform: `translate(-50%,-50%) ${from}`, opacity: 1 }, { transform: `translate(-50%,-50%) ${to}`, opacity: 1 }], { duration: ms * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
};
const ART2 = {
  claw: (c = '#fff', glow = '#fff') => `<svg width="70" height="70" viewBox="0 0 70 70" style="filter:drop-shadow(0 0 6px ${glow})"><path d="M14 6C30 24 36 44 34 66M28 4C44 22 50 42 48 64M42 4C58 20 64 38 62 58" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
  crescent: (s = 110, c = '#9fd8ff', glow = '#4aa3ff') => `<svg width="${s}" height="${s}" viewBox="0 0 100 100" style="filter:drop-shadow(0 0 8px ${glow})"><path d="M10 80C30 30 70 10 95 12 70 22 42 44 22 86Z" fill="${c}"/></svg>`,
  crack: (w = 130) => `<svg width="${w}" height="${w * 0.4}" viewBox="0 0 130 52"><g stroke="#2a1d12" stroke-width="3.5" fill="none" stroke-linecap="round"><path d="M65 26 40 14 22 18 4 8M65 26 44 34 30 46 10 48M65 26 88 12 104 16 126 6M65 26 90 36 100 48 124 46M65 26 62 4M65 26 70 50"/></g><ellipse cx="65" cy="26" rx="16" ry="7" fill="#2a1d1288"/></svg>`,
  petal: (c = '#ffb7d5') => `<svg width="14" height="10" viewBox="0 0 14 10"><path d="M0 5C3 0 10 0 14 5 10 10 3 10 0 5Z" fill="${c}" stroke="#ff8fbf" stroke-width=".8"/></svg>`,
  rock: (s = 26) => `<svg width="${s}" height="${s}" viewBox="0 0 20 20"><path d="M3 6 9 1 17 4 19 12 13 19 4 17 1 11Z" fill="#8a7f72" stroke="#4e463e" stroke-width="1.2"/><path d="M6 8 10 6M11 12 15 10" stroke="#5f564c"/></svg>`,
  note: (c = '#c79bff', s = 22) => `<svg width="${s}" height="${s * 1.3}" viewBox="0 0 20 26" style="filter:drop-shadow(0 0 4px ${c})"><ellipse cx="6" cy="21" rx="5.5" ry="4" fill="${c}" transform="rotate(-20 6 21)"/><path d="M11 20V2c3 2 7 4 8 9" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`,
  wing: (w = 70) => `<svg width="${w}" height="${w * 0.4}" viewBox="0 0 70 28"><path d="M0 14C14 0 54-2 70 10 54 26 16 28 0 14Z" fill="#ffcf5a55" stroke="#ffe9a8" stroke-width="1.5"/><path d="M4 14C24 10 46 10 66 11M10 15 30 22M12 13 34 5" stroke="#ffe9a8aa" fill="none"/></svg>`,
  clam: (s = 120) => `<svg width="${s}" height="${s * 0.8}" viewBox="0 0 120 96"><path d="M60 92C20 92 4 64 6 40 20 12 100 12 114 40 116 64 100 92 60 92Z" fill="#d9b9a6" stroke="#8a6a5a" stroke-width="3"/><path d="M60 92 22 26M60 92 40 18M60 92V16M60 92 80 18M60 92 98 26" stroke="#a88472" stroke-width="2.5"/><path d="M48 92h24v4H48Z" fill="#8a6a5a"/></svg>`,
  bird: (w = 120) => `<svg width="${w}" height="${w * 0.5}" viewBox="0 0 120 60"><path d="M4 30C30 24 40 4 60 20 74 6 96 4 116 12 100 18 92 26 86 30 100 34 108 44 112 52 90 44 74 44 60 44 44 46 26 42 4 30Z" fill="#f6f4ee" stroke="#c9c4b4" stroke-width="2"/><circle cx="100" cy="14" r="2" fill="#333"/><path d="M110 12l8 2-7 3" fill="#e9e5d8" stroke="#c9c4b4"/></svg>`,
  puppet: () => `<svg width="125" height="150" viewBox="0 0 80 96"><g stroke-linecap="round"><path d="M28 34 6 22M28 44 4 50M52 34 74 22M52 44 76 50" stroke="#7d6b5e" stroke-width="5"/><path d="M34 70 28 94M46 70 52 94" stroke="#7d6b5e" stroke-width="6"/></g><rect x="26" y="28" width="28" height="44" rx="8" fill="#8b7d70" stroke="#4a3e35" stroke-width="2"/><circle cx="40" cy="18" r="11" fill="#9a8c7e" stroke="#4a3e35" stroke-width="2"/><path d="M28 14 26 2 34 10 38 0 42 9 48 0 50 10 56 4 52 16Z" fill="#6b4226" stroke="#3e2614"/><circle cx="36" cy="19" r="1.8" fill="#111"/><circle cx="44" cy="19" r="1.8" fill="#111"/></svg>`,
  curse: (s = 120) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#111" stroke-width="5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><path d="M12 30H88L50 94Z" fill="none" stroke="#111" stroke-width="5" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`,
  stake: (h = 90) => `<svg width="${h * 0.24}" height="${h}" viewBox="0 0 22 90"><path d="M11 0 21 22V90H1V22Z" fill="#9b6b3e" stroke="#5a3a1e" stroke-width="2"/><path d="M6 34 8 70M15 30 14 80" stroke="#7a5230" stroke-width="1.5"/></svg>`,
  boneSpike: (h = 70) => `<svg width="${h * 0.26}" height="${h}" viewBox="0 0 18 70"><path d="M9 0 17 70H1Z" fill="#f4f1e8" stroke="#bfb7a2" stroke-width="1.5"/></svg>`,
  butterfly: (s = 28) => `<svg width="${s}" height="${s * 0.8}" viewBox="0 0 30 24" class="ax-flapx"><path d="M15 12C10 0 0 0 2 8 3 12 9 13 15 12ZM15 12C20 0 30 0 28 8 27 12 21 13 15 12ZM15 12C10 18 4 22 6 16 7 13 11 12 15 12ZM15 12C20 18 26 22 24 16 23 13 19 12 15 12Z" fill="#fbfbf7" stroke="#cfcfc4" stroke-width=".8"/></svg>`,
  tiger: (s = 200) => `<svg width="${s}" height="${s * 0.85}" viewBox="0 0 200 170" style="filter:drop-shadow(0 0 14px #bfe9ff)"><path d="M30 40 44 4 76 30C90 24 110 24 124 30L156 4 170 40C190 64 192 110 168 138 146 162 118 168 100 168S54 162 32 138C8 110 10 64 30 40Z" fill="#dff4ff55" stroke="#e8f8ff" stroke-width="4"/><path d="M60 70 84 82M140 70 116 82" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M100 30V58M78 34 86 54M122 34 114 54M36 92 58 96M164 92 142 96M40 116 62 112M160 116 138 112" stroke="#bfe9ff" stroke-width="5" stroke-linecap="round"/><path d="M84 120Q100 132 116 120M100 108V124" stroke="#fff" stroke-width="4" fill="none"/><path d="M78 132 84 150M122 132 116 150" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
  mannequin: (h = 150) => `<svg width="${h * 0.45}" height="${h}" viewBox="0 0 54 120"><circle cx="27" cy="14" r="11" fill="#e8ddd0" stroke="#9a8c7e" stroke-width="2"/><path d="M14 30H40L44 66 38 68 36 118H29L27 76 25 118H18L16 68 10 66Z" fill="#e8ddd0" stroke="#9a8c7e" stroke-width="2" stroke-linejoin="round"/><path d="M27 28V70M14 46H40" stroke="#b9a996" stroke-dasharray="3 3"/></svg>`,
};
const greyChain = (len) => `<svg width="${len}" height="12" viewBox="0 0 ${len} 12"><line x1="0" y1="6" x2="${len}" y2="6" stroke="#b9c0c8" stroke-width="4" stroke-dasharray="9 4" stroke-linecap="round" style="filter:drop-shadow(0 0 2px #000)"/></svg>`;
const thread = (len) => `<svg width="${len}" height="10" viewBox="0 0 ${len} 10"><path d="M0 3H${len}M0 7H${len}" stroke="#8fd3ff" stroke-width="1.4" style="filter:drop-shadow(0 0 3px #4aa3ff)"/></svg>`;
const armSvg = (len) => {
  const L = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#fff1c2" stroke-width="12" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="#ffc35c" stroke-width="8" stroke-linecap="round"/>`;
  const C = (x, y) => `<path d="M${x} ${y}q14 0 12 9" stroke="#fff1c2" stroke-width="12" stroke-linecap="round" fill="none"/><path d="M${x} ${y}q14 0 12 9" stroke="#ffc35c" stroke-width="8" stroke-linecap="round" fill="none"/>`;
  const x = len;
  return `<svg width="${len + 120}" height="80" viewBox="0 0 ${len + 120} 80" style="overflow:visible;filter:drop-shadow(0 0 10px #ff8a1f)"><path d="M0 34Q${len * 0.5} 32 ${x} 32V48Q${len * 0.5} 48 0 46Z" fill="#ffae3c" opacity=".9"/>`
    + `<g transform="translate(${x} 40) scale(1.9) translate(${-x} -40)"><g class="open">${L(x + 18, 29, x + 50, 18)}${L(x + 20, 36, x + 56, 32)}${L(x + 20, 44, x + 55, 47)}${L(x + 18, 51, x + 48, 60)}${L(x + 6, 29, x + 20, 8)}</g>`
    + `<g class="shut" style="display:none">${C(x + 20, 29)}${C(x + 22, 36)}${C(x + 22, 44)}${C(x + 20, 51)}${L(x + 6, 30, x + 24, 24)}</g>`
    + `<rect x="${x - 4}" y="25" width="30" height="31" rx="11" fill="#ffc35c" stroke="#fff1c2" stroke-width="2"/></g></svg>`;
};

/** Stretch an SVG strip (made by mk(len)) from a to b. */
async function stretch(ctx, a, b, mk, ms = 380, life = 2600) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = spawn(ctx, mk(len), a, { life });
  n.style.transformOrigin = '0 50%';
  await n.animate([{ transform: `translate(0,-50%) rotate(${ang(a, b)}deg) scaleX(0)` }, { transform: `translate(0,-50%) rotate(${ang(a, b)}deg) scaleX(1)` }], { duration: ms * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
  return n;
}
/** A flickering zig-zag lightning bolt between a and b. */
function bolt(ctx, a, b, { color = '#9fd8ff', glow = '#4aa3ff', ms = 450, width = 3 } = {}) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const path = () => { let d = 'M0 20'; const n = Math.max(4, Math.round(len / 22)); for (let i = 1; i < n; i++) d += ` L${(len * i) / n} ${20 + rnd(-12, 12)}`; return `${d} L${len} 20`; };
  const n = spawn(ctx, `<svg width="${len}" height="40" viewBox="0 0 ${len} 40" style="filter:drop-shadow(0 0 6px ${glow})"><path d="${path()}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linejoin="round"/><path d="${path()}" stroke="#fff" stroke-width="1.2" fill="none"/></svg>`, a, { life: ms + 200 });
  n.style.transformOrigin = '0 50%';
  n.style.transform = `translate(0,-50%) rotate(${ang(a, b)}deg)`;
  const iv = setInterval(() => { const ps = n.querySelectorAll('path'); ps[0]?.setAttribute('d', path()); ps[1]?.setAttribute('d', path()); }, 60);
  setTimeout(() => { clearInterval(iv); n.remove(); }, ms * ctx.sp);
  return n;
}
/** Crackling electricity ball at a point. */
function sparkBall(ctx, at, size = 46, life = 900) {
  const n = spawn(ctx, `<div style="width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle,#fff 0%,#bfe6ff 30%,#4aa3ff88 60%,#4aa3ff00 72%);box-shadow:0 0 18px #6cc4ff"></div>`, at, { life });
  for (let i = 0; i < 5; i++) setTimeout(() => { const t = rnd(0, Math.PI * 2); bolt(ctx, at, { x: at.x + Math.cos(t) * size, y: at.y + Math.sin(t) * size }, { ms: 120, width: 2 }); }, i * 90 * ctx.sp);
  return n;
}
function slashArc(ctx, at, { color = '#9fd8ff', glow = '#4aa3ff', size = 110, rot = 0, ms = 320 } = {}) {
  const n = spawn(ctx, ART2.crescent(size, color, glow), at, { life: ms + 300 });
  n.animate([{ transform: `translate(-50%,-50%) rotate(${rot - 30}deg) scale(.6)`, opacity: 0 }, { transform: `translate(-50%,-50%) rotate(${rot}deg) scale(1)`, opacity: 1, offset: 0.4 }, { transform: `translate(-50%,-50%) rotate(${rot + 20}deg) scale(1.1)`, opacity: 0 }], { duration: ms * ctx.sp, easing: 'ease-out', fill: 'forwards' });
}
function claws(ctx, at, color, glow) {
  const n = spawn(ctx, ART2.claw(color, glow), at, { life: 700 });
  n.animate([{ clipPath: 'inset(0 0 100% 0)', transform: 'translate(-50%,-50%) rotate(-15deg)' }, { clipPath: 'inset(0 0 0 0)', transform: 'translate(-50%,-50%) rotate(-15deg)', offset: 0.4 }, { clipPath: 'inset(0 0 0 0)', transform: 'translate(-50%,-50%) rotate(-15deg)', opacity: 0 }], { duration: 520 * ctx.sp, fill: 'forwards' });
}
function crackAt(ctx, el) {
  const f = feetOf(ctx, el);
  const c = spawn(ctx, ART2.crack(150), { x: f.x, y: f.y + 4 }, { life: 1500, z: 1 });
  c.animate([{ transform: 'translate(-50%,-50%) scaleX(.1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scaleX(1)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-50%) scaleX(1)', opacity: 0 }], { duration: 1300 * ctx.sp, fill: 'forwards' });
}
function scatter(ctx, at, html, n = 12, dist = 90, ms = 800) {
  for (let i = 0; i < n; i++) {
    const p = spawn(ctx, html, at, { life: ms + 200 });
    const t = rnd(0, Math.PI * 2); const r = rnd(dist * 0.4, dist);
    p.animate([{ transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(t) * r}px), calc(-50% + ${Math.sin(t) * r * 0.7 + 20}px)) rotate(${rnd(-300, 300)}deg)`, opacity: 0 }], { duration: ms * ctx.sp * rnd(0.8, 1.2), easing: 'ease-out', fill: 'forwards' });
  }
}
/** Dash in, show a hit effect at the target. */
async function dash(ctx, k = 0.62, ms = 500) { const to = ctx.tos[0]; lunge(ctx, to, k, ms); await wait(ms * 0.45 * ctx.sp); return to; }
function glowAura(ctx, el, color = '#5dff8f', ms = 1100) {
  const { w, h } = sizeOf(el); const at = FX.centerOf(el, ctx.arena);
  const n = spawn(ctx, `<div style="width:${w * 0.95}px;height:${h * 0.95}px;border-radius:45%;background:radial-gradient(ellipse,${color}55 0%,${color}33 45%,${color}00 70%);box-shadow:0 0 30px ${color}88"></div>`, at, { life: ms + 500 });
  n.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.8)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.05)', offset: 0.3 }, { opacity: 0.8, transform: 'translate(-50%,-50%) scale(1)', offset: 0.7 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.1)' }], { duration: ms * ctx.sp, fill: 'forwards' });
  el.animate([{ filter: 'none' }, { filter: `drop-shadow(0 0 12px ${color}) brightness(1.2)`, offset: 0.4 }, { filter: 'none' }], { duration: ms * ctx.sp });
}
function noteStream(ctx, a, b, color, delay = 0, n = 5) {
  return Promise.all(Array.from({ length: n }, (_, i) => wait((delay + i * 80) * ctx.sp).then(async () => {
    const s = spawn(ctx, ART2.note(color, i === 0 ? 24 : 16), a, { life: 1200 });
    if (i) s.style.opacity = String(1 - i * 0.15);
    await fly(ctx, s, a, b, 520, { rotate: 0, arc: 30, ease: 'ease-in-out' });
    s.remove();
  })));
}
function mistOver(ctx, color) {
  const box = sideBox(ctx);
  const fog = spawn(ctx, `<div style="width:${box.w + 120}px;height:${box.h + 60}px;border-radius:50%;background:radial-gradient(ellipse,${color}cc 0%,${color}99 45%,${color}00 72%);filter:blur(4px)"></div>`, ctx.from, { life: 2400 });
  return { fog, go: fly(ctx, fog, ctx.from, box.c, 650, { rotate: 0, scale: [0.15, 1], ease: 'ease-out' }) };
}

Object.assign(ANIMS, {
  antidote: {
    desc: 'User moves over to the targeted ally and applies a green healing glow to them.',
    async play(ctx) {
      const to = ctx.tos[0];
      if (ctx.targetEls[0] !== ctx.userEl) { lunge(ctx, to, 0.75, 700); await wait(300 * ctx.sp); }
      glowAura(ctx, ctx.targetEls[0]);
      await wait(500 * ctx.sp);
    },
  },
  blue_fire_claw: {
    desc: 'User dashes at the target and strikes them with a blue-flaming cat scratch.',
    async play(ctx) {
      const to = await dash(ctx);
      claws(ctx, to, '#9fd0ff', '#2f7bff');
      [-26, 0, 26].forEach((dx) => { const f = spawn(ctx, ART.flame(30, '#2f7bff', '#bfe0ff'), { x: to.x + dx, y: to.y + 10 }, { life: 900 }); setTimeout(() => fade(ctx, f, 300), 450 * ctx.sp); });
      shake(ctx);
    },
  },
  cat_pounce: {
    desc: 'User quickly dashes and strikes the target with a cat scratch.',
    async play(ctx) { const to = await dash(ctx, 0.7, 340); claws(ctx, to, '#ffffff', '#ffd27a'); shake(ctx); },
  },
  hanzo_chain_bind: {
    desc: 'A chain flies from the user and binds the target.',
    async play(ctx) {
      const n = await stretch(ctx, ctx.from, ctx.tos[0], greyChain, 380);
      wrapRing(ctx, ctx.targetEls[0], 'border:5px dashed #b9c0c8;box-shadow:0 0 6px #000', 700);
      shake(ctx);
      setTimeout(() => fade(ctx, n), 500 * ctx.sp);
      await wait(350 * ctx.sp);
    },
  },
  chakra_arm: {
    desc: 'An orange chakra arm reaches out from the user; its open hand strikes the target and closes around them.',
    async play(ctx) {
      const to = ctx.tos[0];
      const end = between(ctx.from, to, 0.78);
      const n = await stretch(ctx, ctx.from, end, armSvg, 330);
      n.querySelector('.open').style.display = 'none'; n.querySelector('.shut').style.display = '';
      ctx.targetEls[0].animate([{ filter: 'none' }, { filter: 'drop-shadow(0 0 10px #ff8a1f)' }, { filter: 'none' }], { duration: 700 * ctx.sp });
      shake(ctx);
      setTimeout(() => n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 * ctx.sp, fill: 'forwards' }), 500 * ctx.sp);
      await wait(300 * ctx.sp);
    },
  },
  chakra_blade_combo: {
    desc: 'User strikes the target with blue chakra blades; the slashes form an X.',
    async play(ctx) {
      const to = await dash(ctx, 0.65, 560);
      slashArc(ctx, to, { rot: 0, size: 120 });
      await wait(140 * ctx.sp);
      slashArc(ctx, to, { rot: 90, size: 120 });
      shake(ctx);
    },
  },
  chakra_blade_wave: {
    desc: 'A sweeping strike across the enemies with a blue chakra blade.',
    async play(ctx) {
      lunge(ctx, ctx.tos[0], 0.45, 520);
      await wait(200 * ctx.sp);
      const box = sideBox(ctx);
      const s = spawn(ctx, ART2.crescent(Math.max(160, box.w * 0.6), '#bfe6ff', '#4aa3ff'), { x: box.x1, y: box.c.y }, { life: 900 });
      await fly(ctx, s, { x: box.x1, y: box.c.y }, { x: box.x2, y: box.c.y }, 360, { rotate: ctx.isFoe ? 180 : 0, ease: 'ease-out' });
      shake(ctx);
      fade(ctx, s, 200);
    },
  },
  tsunade_punch: {
    desc: 'User strikes the target with enough force to crack the ground beneath them.',
    async play(ctx) { const to = await dash(ctx, 0.66, 520); boom(ctx, to, '#ffd9a0', 130); crackAt(ctx, ctx.targetEls[0]); shake(ctx); },
  },
  cherry_blossom_impact: {
    desc: 'A crushing punch cracks the ground; pink cherry blossom petals scatter.',
    async play(ctx) {
      const to = await dash(ctx, 0.66, 520);
      boom(ctx, to, '#ffb7d5', 140); crackAt(ctx, ctx.targetEls[0]);
      scatter(ctx, to, ART2.petal(), 18, 120, 1000);
      shake(ctx);
    },
  },
  chakra_scalpel: {
    desc: 'User flies at the target and slashes them with a small blue chakra blade.',
    async play(ctx) {
      const to = ctx.tos[0];
      const g = ghostOf(ctx, ctx.from, 0.55);
      fly(ctx, g, ctx.from, between(ctx.from, to, 0.82), 240, { rotate: 0 }).then(() => fade(ctx, g, 250));
      lunge(ctx, to, 0.6, 460);
      await wait(230 * ctx.sp);
      slashArc(ctx, to, { size: 70, rot: 30 });
      shake(ctx);
    },
  },
  chakra_threads: {
    desc: 'Thin blue chakra threads fly from the user to the target and bind them.',
    async play(ctx) {
      const n = await stretch(ctx, ctx.from, ctx.tos[0], thread, 420);
      wrapRing(ctx, ctx.targetEls[0], 'border:2px solid #8fd3ff;box-shadow:0 0 8px #4aa3ff, inset 0 0 0 5px #8fd3ff33', 700);
      shake(ctx);
      setTimeout(() => fade(ctx, n), 500 * ctx.sp);
      await wait(300 * ctx.sp);
    },
  },
  chibaku_tensei: {
    desc: 'Stones fly up from the ground, stick to each target and engulf them in a stony ball.',
    async play(ctx) {
      await Promise.all(ctx.targetEls.map(async (el, i) => {
        const to = ctx.tos[i]; const f = feetOf(ctx, el); const { h } = sizeOf(el);
        await Promise.all(Array.from({ length: 12 }, (_, k) => wait(k * 45 * ctx.sp).then(async () => {
          const st = { x: f.x + rnd(-120, 120), y: f.y + rnd(0, 20) };
          const r = spawn(ctx, ART2.rock(rnd(16, 30)), st, { life: 1800 });
          await fly(ctx, r, st, { x: to.x + rnd(-h * 0.2, h * 0.2), y: to.y + rnd(-h * 0.3, h * 0.3) }, 380, { rotate: rnd(0, 360), ease: 'ease-in' });
          setTimeout(() => r.remove(), 700 * ctx.sp);
        })));
        const d = h * 0.95;
        const ball = spawn(ctx, `<div style="width:${d}px;height:${d}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#a99d8e,#7a6f62 55%,#4e463e);box-shadow:inset -10px -12px 20px #2e2822,0 0 14px #000;border:3px solid #4e463e"></div>`, to, { life: 1800 });
        await grow(ctx, ball, 260, 'scale(.3)', 'scale(1)');
        shakeEl(el);
        setTimeout(() => fade(ctx, ball, 400), 700 * ctx.sp);
      }));
    },
  },
  chidori: {
    desc: 'User produces blue crackling electricity and flies in to strike the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const hand = { x: ctx.from.x + (ctx.isFoe ? -22 : 22), y: ctx.from.y + 10 };
      const s = sparkBall(ctx, hand, 44, 1400);
      await pop(ctx, s, 300);
      await wait(200 * ctx.sp);
      lunge(ctx, to, 0.75, 520);
      await fly(ctx, s, hand, between(hand, to, 0.9), 230, { rotate: 0 });
      boom(ctx, to, '#9fd8ff', 130);
      for (let i = 0; i < 4; i++) bolt(ctx, to, { x: to.x + rnd(-70, 70), y: to.y + rnd(-70, 70) }, { ms: 220 });
      fade(ctx, s, 150);
      shake(ctx);
    },
  },
  chidori_nagashi: {
    desc: 'User produces blue crackling electricity and shoots it at every enemy.',
    async play(ctx) {
      const s = sparkBall(ctx, ctx.from, 90, 1100);
      await pop(ctx, s, 260);
      ctx.tos.forEach((t) => { bolt(ctx, ctx.from, t, { ms: 420, width: 4 }); setTimeout(() => bolt(ctx, ctx.from, t, { ms: 300 }), 120 * ctx.sp); });
      await wait(200 * ctx.sp);
      shake(ctx);
      fade(ctx, s, 300);
      await wait(150 * ctx.sp);
    },
  },
  chidori_spear: {
    desc: 'Blue crackling electricity forms into a blade that pierces the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const s = sparkBall(ctx, ctx.from, 40, 900);
      await pop(ctx, s, 220);
      const blade = (len) => `<svg width="${len}" height="16" viewBox="0 0 ${len} 16" style="filter:drop-shadow(0 0 8px #4aa3ff)"><path d="M0 4H${len - 18}L${len} 8 ${len - 18} 12H0Z" fill="#cfeeff" stroke="#fff" stroke-width="1"/></svg>`;
      const b = await stretch(ctx, ctx.from, to, blade, 200, 1200);
      bolt(ctx, ctx.from, to, { ms: 300 });
      boom(ctx, to, '#9fd8ff', 90);
      shake(ctx);
      fade(ctx, s, 200);
      setTimeout(() => fade(ctx, b, 250), 280 * ctx.sp);
    },
  },
  chomei_flight: {
    desc: 'The user sprouts six bug wings.',
    async play(ctx) {
      const { h } = sizeOf(ctx.userEl);
      const at = { x: ctx.from.x, y: ctx.from.y - h * 0.12 };
      const ws = [];
      [-1, 1].forEach((side) => [-24, 0, 24].forEach((rot, i) => {
        const w = spawn(ctx, `<div class="ax-flap" style="animation-duration:.16s">${ART2.wing(h * 0.42)}</div>`, at, { life: 1800, z: 5 });
        w.style.transformOrigin = '0 50%';
        w.style.transform = `translate(0,-50%) rotate(${side < 0 ? 180 - rot : rot}deg)`;
        w.animate([{ opacity: 0 }, { opacity: 1 }], { duration: (200 + i * 80) * ctx.sp, fill: 'forwards' });
        ws.push(w);
      }));
      await wait(1100 * ctx.sp);
      ws.forEach((w) => fade(ctx, w, 300));
    },
  },
  chomei_bomb: {
    desc: 'A black orb with a purple aura and tiny blue and red sparks grows in front of the user, then fires at the enemies.',
    async play(ctx) {
      const at = { x: ctx.from.x + (ctx.isFoe ? -60 : 60), y: ctx.from.y - 20 };
      const orb = spawn(ctx, `<div style="width:90px;height:90px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#2a2235,#000 60%);box-shadow:0 0 0 4px #7a3cff66,0 0 30px 12px #8a4bffaa"></div>`, at, { life: 2600 });
      const sparks = setInterval(() => {
        const box = orb.getBoundingClientRect(); const a = ctx.arena.getBoundingClientRect();
        const c = { x: box.left - a.left + box.width / 2, y: box.top - a.top + box.height / 2 };
        const p = spawn(ctx, `<div style="width:7px;height:7px;border-radius:50%;background:${Math.random() < 0.5 ? '#4ab0ff' : '#ff4a4a'};box-shadow:0 0 6px currentColor"></div>`, c, { life: 600 });
        const t = rnd(0, Math.PI * 2);
        fly(ctx, p, c, { x: c.x + Math.cos(t) * 60, y: c.y + Math.sin(t) * 60 }, 400, { rotate: 0, ease: 'ease-out' }).then(() => p.remove());
      }, 40);
      await grow(ctx, orb, 650, 'scale(.1)', 'scale(1)');
      const box = sideBox(ctx);
      await fly(ctx, orb, at, box.c, 330, { rotate: 0, scale: [1, 1.2], ease: 'ease-in' });
      clearInterval(sparks);
      orb.remove();
      for (const t of ctx.tos) boom(ctx, t, '#8a4bff', 170);
      boom(ctx, box.c, '#ffffff', 220);
      shake(ctx);
    },
  },
  clam_mirage: {
    desc: 'A giant clam drops in front of the user, then mist rises from it and engulfs the enemies.',
    async play(ctx) {
      const f = feetOf(ctx, ctx.userEl);
      const at = { x: f.x + (ctx.isFoe ? -70 : 70), y: f.y - 40 };
      const top = { x: at.x, y: at.y - 160 };
      const c = spawn(ctx, ART2.clam(120), top, { life: 2600 });
      await fly(ctx, c, top, at, 300, { rotate: 0, ease: 'ease-in' });
      for (let i = 0; i < 5; i++) puff(ctx, { x: at.x + rnd(-30, 30), y: at.y - 20 }, '#e8f0ff', 60);
      const { fog, go } = mistOver(ctx, '#e6ecf5');
      await go;
      ctx.targetEls.forEach((t) => FX.ring(ctx.arena, t, 'gen'));
      setTimeout(() => { fade(ctx, fog, 600); fade(ctx, c, 400); }, 700 * ctx.sp);
    },
  },
  clay_bird: {
    desc: 'A white clay bird forms under the user.',
    async play(ctx) {
      const f = feetOf(ctx, ctx.userEl); const { w } = sizeOf(ctx.userEl);
      const b = spawn(ctx, ART2.bird(Math.max(140, w * 1.3)), { x: f.x, y: f.y - 6 }, { life: 1900, z: 5 });
      if (ctx.isFoe) b.firstElementChild.style.transform = 'scaleX(-1)';
      await grow(ctx, b, 380, 'scale(.1,.1)', 'scale(1,1)');
      ctx.userEl.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)', offset: 0.5 }, { transform: 'translateY(0)' }], { duration: 900 * ctx.sp });
      b.animate([{ translate: '0 0' }, { translate: '0 -14px', offset: 0.5 }, { translate: '0 0' }], { duration: 900 * ctx.sp });
      await wait(900 * ctx.sp);
      fade(ctx, b, 300);
    },
  },
  cleaver_sword: {
    desc: 'User slashes the target with a heavy sword slash.',
    async play(ctx) { const to = await dash(ctx, 0.62, 560); slashArc(ctx, to, { color: '#f2f4f7', glow: '#9aa3ad', size: 170, rot: 40, ms: 380 }); boom(ctx, to, '#ffffff', 80); shake(ctx); },
  },
  clone_feint: {
    desc: 'A clone of the user appears in front of them.',
    async play(ctx) {
      const at = { x: ctx.from.x + (ctx.isFoe ? -55 : 55), y: ctx.from.y };
      puff(ctx, at, '#ffffff', 90); puff(ctx, at, '#ffffff', 70);
      const g = ghostOf(ctx, at, 0.85);
      g.firstElementChild.style.filter = 'none';
      await pop(ctx, g, 200);
      await wait(800 * ctx.sp);
      puff(ctx, at, '#ffffff', 70);
      fade(ctx, g, 250);
    },
  },
  karui_flurry: {
    desc: 'User strikes the target with a flurry of blows.',
    async play(ctx) {
      const to = ctx.tos[0];
      ctx.userEl.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${(to.x - ctx.from.x) * 0.6}px, ${(to.y - ctx.from.y) * 0.6}px)`, offset: 0.2 }, { transform: `translate(${(to.x - ctx.from.x) * 0.6}px, ${(to.y - ctx.from.y) * 0.6}px)`, offset: 0.8 }, { transform: 'translate(0,0)' }], { duration: 900 * ctx.sp });
      await wait(180 * ctx.sp);
      for (let i = 0; i < 6; i++) { boom(ctx, { x: to.x + rnd(-30, 30), y: to.y + rnd(-40, 30) }, '#ffffff', 55); shake(ctx); await wait(80 * ctx.sp); }
    },
  },
  karui_combo: {
    desc: 'User slashes the target with a sword slash.',
    async play(ctx) { const to = await dash(ctx, 0.64, 500); slashArc(ctx, to, { color: '#f2f4f7', glow: '#c9ced6', size: 130, rot: 120 }); shake(ctx); },
  },
  creation_rebirth: {
    desc: 'The user glows with a green aura.',
    async play(ctx) { glowAura(ctx, ctx.userEl, '#5dff8f', 1300); await wait(700 * ctx.sp); },
  },
  crow_clone: {
    desc: 'When the user is struck, they dissipate into a murder of black crows that fly away.',
    async play(ctx) { FX.ring(ctx.arena, ctx.userEl, 'aura'); await wait(400 * ctx.sp); },
    decoy(ctx, el) {
      const at = FX.centerOf(el, ctx.arena);
      el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.1 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1400 * ctx.sp });
      const crow = '<svg width="54" height="32" viewBox="0 0 34 20" class="ax-flap"><path d="M17 12C12 4 4 2 0 6 6 6 10 9 13 13ZM17 12C22 4 30 2 34 6 28 6 24 9 21 13Z" fill="#111"/><ellipse cx="17" cy="13" rx="5" ry="3.5" fill="#111"/><path d="M21 12l4 1-4 1" fill="#333"/></svg>';
      for (let i = 0; i < 16; i++) {
        const st = { x: at.x + rnd(-40, 40), y: at.y + rnd(-60, 60) };
        const c = spawn(ctx, crow, st, { life: 1400 });
        const t = rnd(-Math.PI * 0.95, -Math.PI * 0.05);
        fly(ctx, c, st, { x: st.x + Math.cos(t) * 260, y: st.y + Math.sin(t) * 200 }, rnd(700, 1100), { rotate: 0, ease: 'ease-in', scale: [0.6, 1.2] }).then(() => c.remove());
      }
    },
  },
  crow_blades: {
    desc: 'A grey-brown, spiky-haired, four-armed puppet flies at the target and slashes them with a purple blade.',
    async play(ctx) {
      const to = ctx.tos[0];
      const p = spawn(ctx, ART2.puppet(), ctx.from, { life: 1500 });
      await fly(ctx, p, ctx.from, between(ctx.from, to, 0.82), 400, { rotate: 0, ease: 'ease-in-out' });
      slashArc(ctx, to, { color: '#c48bff', glow: '#7a2bd6', size: 110, rot: 60 });
      shake(ctx);
      setTimeout(() => fade(ctx, p, 300), 250 * ctx.sp);
    },
  },
  curse_ritual: {
    desc: 'A black circle with an upside-down triangle draws itself under the user, then appears under the target and glows purple. Both marks stay for as long as the curse lasts.',
    async play(ctx) {
      const f = feetOf(ctx, ctx.userEl);
      const mk = (at) => {
        const n = spawn(ctx, `<div style="transform:scaleY(.38)">${ART2.curse(130)}</div>`, at, { life: 2200, z: 1 });
        n.querySelectorAll('circle,path').forEach((p, i) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 450 * ctx.sp, delay: i * 300 * ctx.sp, fill: 'both' }));
        return n;
      };
      const a = mk({ x: f.x, y: f.y });
      await wait(800 * ctx.sp);
      const tf = feetOf(ctx, ctx.targetEls[0]);
      const b = mk({ x: tf.x, y: tf.y });
      await wait(750 * ctx.sp);
      [a, b].forEach((n) => n.querySelector('svg').animate([{ filter: 'none' }, { filter: 'drop-shadow(0 0 10px #b44bff) drop-shadow(0 0 4px #b44bff)' }], { duration: 300 * ctx.sp, fill: 'forwards' }));
      b.querySelectorAll('circle,path').forEach((p) => p.setAttribute('stroke', '#7a2bd6'));
      ctx.targetEls[0].animate([{ filter: 'none' }, { filter: 'drop-shadow(0 0 10px #b44bff)' }, { filter: 'none' }], { duration: 700 * ctx.sp });
      shake(ctx);
      setTimeout(() => { fade(ctx, a, 400); fade(ctx, b, 400); }, 500 * ctx.sp);
    },
  },
  wood_stakes: {
    desc: 'Wooden stakes shoot up from the ground under each target and strike them.',
    async play(ctx) {
      ctx.targetEls.forEach((el) => {
        const f = feetOf(ctx, el); const { h } = sizeOf(el);
        [-30, -10, 10, 30].forEach((dx, i) => {
          const s = spawn(ctx, ART2.stake(h * (0.45 + (i % 2) * 0.2)), { x: f.x + dx, y: f.y + 6 }, { life: 1500 });
          s.animate([{ transform: `translate(-50%,-100%) rotate(${dx / 3}deg) scaleY(0)` }, { transform: `translate(-50%,-100%) rotate(${dx / 3}deg) scaleY(1)` }], { duration: 220 * ctx.sp, delay: i * 40 * ctx.sp, easing: 'ease-out', fill: 'both' });
          s.style.transformOrigin = '50% 100%';
          setTimeout(() => fade(ctx, s, 350), 900 * ctx.sp);
        });
      });
      await wait(300 * ctx.sp);
      shake(ctx);
    },
  },
  camellia_dance: {
    desc: 'User produces a bone sword, flies at the target and strikes them.',
    async play(ctx) {
      const to = ctx.tos[0];
      const hand = { x: ctx.from.x + (ctx.isFoe ? -20 : 20), y: ctx.from.y };
      const b = spawn(ctx, ART.bone(80), hand, { life: 1400 });
      b.firstElementChild.style.transform = `rotate(${ang(hand, to)}deg)`;
      await pop(ctx, b, 220);
      const g = ghostOf(ctx, ctx.from, 0.55);
      fly(ctx, g, ctx.from, between(ctx.from, to, 0.8), 230, { rotate: 0 }).then(() => fade(ctx, g, 250));
      lunge(ctx, to, 0.66, 460);
      await fly(ctx, b, hand, between(hand, to, 0.85), 230, { rotate: 0 });
      FX.fx(ctx.arena, 'slash', to);
      shake(ctx);
      fade(ctx, b, 200);
    },
  },
  larch_dance: {
    desc: 'Many bone swords protrude from the user, who flies at the enemies in a spinning strike.',
    async play(ctx) {
      const bones = Array.from({ length: 8 }, (_, i) => {
        const t = (i / 8) * 360;
        const b = spawn(ctx, `<div style="transform:rotate(${t}deg) translateX(34px)">${ART.bone(56)}</div>`, ctx.from, { life: 1800 });
        pop(ctx, b, 200); return b;
      });
      await wait(300 * ctx.sp);
      bones.forEach((b) => fade(ctx, b, 200));
      for (const [i, to] of ctx.tos.entries()) {
        const g = ghostOf(ctx, ctx.from, 0.6);
        g.firstElementChild.classList.add('ax-spin');
        g.firstElementChild.style.animationDuration = '.25s';
        const spikes = spawn(ctx, `<div class="ax-spin" style="animation-duration:.25s;width:0;height:0">${Array.from({ length: 6 }, (_, k) => `<div style="position:absolute;transform:rotate(${k * 60}deg) translateX(30px)">${ART.bone(50)}</div>`).join('')}</div>`, ctx.from, { life: 900 });
        fly(ctx, spikes, ctx.from, between(ctx.from, to, 0.85), 220, { rotate: 0 }).then(() => spikes.remove());
        await fly(ctx, g, ctx.from, between(ctx.from, to, 0.85), 220, { rotate: 0 });
        FX.fx(ctx.arena, 'slash', to);
        shakeEl(ctx.targetEls[i]);
        fade(ctx, g, 200);
      }
    },
  },
  bracken_dance: {
    desc: 'A field of bone spikes shoots up from the ground at the enemies’ feet and stabs them.',
    async play(ctx) {
      const box = sideBox(ctx);
      const n = Math.round(box.w / 22) + 6;
      for (let i = 0; i < n; i++) {
        const x = box.x1 - 30 + ((box.w + 60) * i) / n + rnd(-8, 8);
        const near = ctx.targetEls.map((el) => feetOf(ctx, el)).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
        const s = spawn(ctx, ART2.boneSpike(rnd(70, 130)), { x, y: near.y + rnd(-6, 10) }, { life: 1600 });
        s.style.transformOrigin = '50% 100%';
        s.animate([{ transform: `translate(-50%,-100%) rotate(${rnd(-14, 14)}deg) scaleY(0)` }, { transform: `translate(-50%,-100%) rotate(${rnd(-14, 14)}deg) scaleY(1)` }], { duration: 200 * ctx.sp, delay: rnd(0, 180) * ctx.sp, easing: 'ease-out', fill: 'both' });
        setTimeout(() => fade(ctx, s, 350), 1000 * ctx.sp);
      }
      await wait(320 * ctx.sp);
      shake(ctx);
    },
  },
  paper_butterflies: {
    desc: 'User produces white paper butterflies that fly at and strike every enemy.',
    async play(ctx) {
      await Promise.all(ctx.tos.flatMap((t, ti) => Array.from({ length: 6 }, (_, k) => wait((k * 60 + ti * 30) * ctx.sp).then(async () => {
        const st = { x: ctx.from.x + rnd(-30, 30), y: ctx.from.y + rnd(-40, 30) };
        const b = spawn(ctx, ART2.butterfly(rnd(22, 32)), st, { life: 1400 });
        await fly(ctx, b, st, { x: t.x + rnd(-30, 30), y: t.y + rnd(-40, 30) }, 560, { rotate: 0, arc: rnd(-40, 60), ease: 'ease-in-out' });
        b.remove();
      }))));
      ctx.tos.forEach((t) => scatter(ctx, t, '<div style="width:8px;height:6px;background:#fbfbf7"></div>', 6, 50, 500));
      shake(ctx);
    },
  },
  willow_dance: {
    desc: 'Many bone swords protrude from the user, then fly at and strike the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const pts = Array.from({ length: 6 }, (_, i) => ({ x: ctx.from.x + rnd(-30, 30), y: ctx.from.y - 50 + i * 20 }));
      const bones = pts.map((p) => { const b = spawn(ctx, ART.bone(60), p, { life: 1600 }); b.firstElementChild.style.transform = `rotate(${ang(p, to)}deg)`; pop(ctx, b, 200); return b; });
      await wait(380 * ctx.sp);
      await Promise.all(bones.map((b, i) => wait(i * 50 * ctx.sp).then(() => fly(ctx, b, pts[i], { x: to.x + rnd(-20, 20), y: to.y + rnd(-30, 30) }, 260, { rotate: 0, ease: 'ease-in' })).then(() => { b.remove(); FX.fx(ctx.arena, 'slash', to); })));
      shake(ctx);
    },
  },
  daytime_tiger: {
    desc: 'User fires a giant tiger made of air at the enemies.',
    async play(ctx) {
      const box = sideBox(ctx);
      ctx.userEl.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${ctx.isFoe ? 14 : -14}px,0)` }, { transform: 'translate(0,0)' }], { duration: 400 * ctx.sp });
      const t = spawn(ctx, ART2.tiger(220), ctx.from, { life: 1800 });
      if (ctx.isFoe) t.firstElementChild.style.transform = 'scaleX(-1)';
      await fly(ctx, t, ctx.from, box.c, 520, { rotate: 0, scale: [0.3, 1.3], ease: 'ease-in' });
      boom(ctx, box.c, '#dff4ff', Math.max(220, box.w));
      for (const p of ctx.tos) puff(ctx, p, '#ffffff', 90);
      shake(ctx);
      fade(ctx, t, 250);
    },
  },
  dead_soul: {
    desc: 'A mannequin appears in front of the user.',
    async play(ctx) {
      const { h } = sizeOf(ctx.userEl);
      const at = { x: ctx.from.x + (ctx.isFoe ? -60 : 60), y: ctx.from.y + h * 0.05 };
      puff(ctx, at, '#ffffff', 90);
      const m = spawn(ctx, ART2.mannequin(h * 0.85), at, { life: 1800 });
      await pop(ctx, m, 260);
      await wait(800 * ctx.sp);
      fade(ctx, m, 300);
    },
  },
  phantom_sound_chains: {
    desc: 'Musical notes (with a trail of notes) fly from the user to every enemy.',
    async play(ctx) {
      FX.ring(ctx.arena, ctx.userEl, 'gen');
      await Promise.all(ctx.tos.map((t, i) => noteStream(ctx, ctx.from, t, '#c79bff', i * 90)));
      ctx.targetEls.forEach((t) => FX.ring(ctx.arena, t, 'gen'));
      shake(ctx);
    },
  },
  frog_song: {
    desc: 'Two streams of musical notes — red from the left, blue from the right — fly to every enemy.',
    async play(ctx) {
      const { w } = sizeOf(ctx.userEl);
      const L = { x: ctx.from.x - w * 0.45, y: ctx.from.y - 20 }; const R = { x: ctx.from.x + w * 0.45, y: ctx.from.y - 20 };
      await Promise.all(ctx.tos.flatMap((t, i) => [noteStream(ctx, L, t, '#ff5a5a', i * 90), noteStream(ctx, R, t, '#5aa8ff', i * 90 + 40)]));
      ctx.targetEls.forEach((t) => FX.ring(ctx.arena, t, 'gen'));
      shake(ctx);
    },
  },
  mist_hiding: {
    desc: 'User sprays a pink mist that engulfs every enemy.',
    async play(ctx) {
      for (let i = 0; i < 4; i++) puff(ctx, { x: ctx.from.x + (ctx.isFoe ? -30 : 30), y: ctx.from.y }, '#ffb3dc', 70);
      const { fog, go } = mistOver(ctx, '#ffb3dc');
      await go;
      ctx.targetEls.forEach((t) => FX.ring(ctx.arena, t, 'gen'));
      setTimeout(() => fade(ctx, fog, 600), 700 * ctx.sp);
    },
  },
});

// ---------------------------------------------------------------- batch 3 (sheet rows 78–115)
const ART3 = {
  tree: (h = 200) => `<svg width="${h * 0.8}" height="${h}" viewBox="0 0 160 200"><path d="M70 200C72 160 66 140 60 120 48 100 30 96 14 90M74 150C84 120 104 104 130 100M64 118C70 90 76 70 80 40" stroke="#5a3a1e" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M62 200C66 170 72 150 86 130 96 116 112 112 140 116" stroke="#6b4626" stroke-width="9" fill="none" stroke-linecap="round"/><g fill="#3f7a3a" stroke="#2c5a28" stroke-width="2" opacity=".95"><circle cx="80" cy="34" r="30"/><circle cx="40" cy="58" r="26"/><circle cx="124" cy="62" r="28"/><circle cx="20" cy="88" r="18"/><circle cx="140" cy="100" r="18"/></g><g fill="#e889c0"><circle cx="70" cy="28" r="4"/><circle cx="100" cy="44" r="4"/><circle cx="44" cy="52" r="4"/><circle cx="128" cy="58" r="4"/></g></svg>`,
  mirror: (h = 90) => `<svg width="${h * 0.6}" height="${h}" viewBox="0 0 60 100"><rect x="3" y="3" width="54" height="94" rx="4" fill="#d6f2ff66" stroke="#e8fbff" stroke-width="3"/><path d="M12 20 30 8M10 44 46 14M14 70 50 40" stroke="#ffffffaa" stroke-width="2"/></svg>`,
  needle: () => '<svg width="34" height="4" viewBox="0 0 34 4"><path d="M0 2H34" stroke="#e8fbff" stroke-width="2" stroke-linecap="round" style="filter:drop-shadow(0 0 3px #7fd6ff)"/></svg>',
  ogre: (h = 240) => `<svg width="${h * 0.8}" height="${h}" viewBox="0 0 160 200"><path d="M30 90C14 110 8 140 16 170M130 90C146 110 152 140 144 170" stroke="#f1d2b6" stroke-width="22" stroke-linecap="round"/><circle cx="16" cy="172" r="14" fill="#f1d2b6" stroke="#b58a6a" stroke-width="2"/><circle cx="144" cy="172" r="14" fill="#f1d2b6" stroke="#b58a6a" stroke-width="2"/><path d="M36 78C50 66 110 66 124 78L130 170C110 186 50 186 30 170Z" fill="#f4dcc4" stroke="#b58a6a" stroke-width="3"/><path d="M60 100C70 108 90 108 100 100M80 110V150M64 130H96" stroke="#d7b296" stroke-width="2.5" fill="none"/><path d="M30 170H130V200H30Z" fill="#5a4636"/><circle cx="80" cy="44" r="32" fill="#f4dcc4" stroke="#b58a6a" stroke-width="3"/><path d="M48 40H112V54H48Z" fill="#fafafa" stroke="#cfcfcf" stroke-width="2"/><path d="M68 69Q80 60 92 69" stroke="#8a5a4a" stroke-width="3" fill="none"/><path d="M60 66 56 74M100 66 104 74" stroke="#fff" stroke-width="4"/></svg>`,
  cube: (s = 120) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><g fill="#ffffff22" stroke="#f4fbff" stroke-width="2.5" stroke-linejoin="round" style="filter:drop-shadow(0 0 8px #bfe9ff)"><path d="M20 30 50 16 80 30 50 44Z"/><path d="M20 30V72L50 86V44Z"/><path d="M80 30V72L50 86V44Z"/></g></svg>`,
  rockFist: (s = 64) => `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><path d="M6 20 18 6 40 4 58 16 60 40 48 58 22 60 6 46Z" fill="#8a7f72" stroke="#4e463e" stroke-width="3"/><path d="M22 18V32M34 14V30M46 18V32M14 34 28 40 46 40" stroke="#5f564c" stroke-width="3" stroke-linecap="round"/></svg>`,
  golem: (h = 220) => `<svg width="${h * 0.8}" height="${h}" viewBox="0 0 160 200"><g fill="#8a7f72" stroke="#4e463e" stroke-width="3" stroke-linejoin="round"><path d="M40 70 120 70 130 150 30 150Z"/><path d="M60 22 100 22 108 62 52 62Z"/><path d="M40 76 10 120 22 134 50 98Z"/><path class="g-arm" d="M120 76 150 120 138 134 110 98Z"/><path d="M44 150 40 198 70 198 74 150ZM86 150 90 198 120 198 116 150Z"/></g><path d="M66 40H94" stroke="#ffcf5a" stroke-width="4" style="filter:drop-shadow(0 0 4px #ffcf5a)"/><path d="M60 90 80 100 100 92M56 120 76 116" stroke="#5f564c" stroke-width="3" fill="none"/></svg>`,
  snake: (s = 70) => `<svg width="${s}" height="${s * 0.7}" viewBox="0 0 70 50" style="filter:drop-shadow(0 0 8px #b44bff)"><path d="M0 10C12 2 34 0 52 6L70 14 46 18C34 19 14 20 0 22Z" fill="#e8e6dc" stroke="#6a4a8a" stroke-width="2" stroke-linejoin="round"/><path d="M0 26C12 26 30 26 42 28L64 38 46 42C30 42 12 38 0 34Z" fill="#dcd8c8" stroke="#6a4a8a" stroke-width="2" stroke-linejoin="round"/><path d="M8 22C20 23 34 24 44 26" stroke="#7a1f3a" stroke-width="5"/><path d="M60 16 58 26M50 18 49 26M56 36 55 29" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="40" cy="9" r="3" fill="#d4a017" stroke="#333"/><path d="M40 7V11" stroke="#111" stroke-width="1.4"/></svg>`,
  scales: (len) => `<svg width="${len}" height="26" viewBox="0 0 ${len} 26" style="filter:drop-shadow(0 0 6px #b44bff)"><path d="M0 6H${len}V20H0Z" fill="#e8e6dc" stroke="#6a4a8a" stroke-width="2"/><path d="M0 13H${len}" stroke="#c8c4b2" stroke-width="6" stroke-dasharray="6 5"/></svg>`,
  airFist: (s = 40) => `<svg width="${s}" height="${s}" viewBox="0 0 40 40"><path d="M6 12C6 6 30 4 34 10 38 16 38 28 32 32 26 36 10 36 6 30Z" fill="#e8f8ff44" stroke="#f4fcff" stroke-width="2.5"/><path d="M14 10V20M22 9V20M30 12V22" stroke="#f4fcff" stroke-width="2"/></svg>`,
  staff: (len) => `<svg width="${len}" height="20" viewBox="0 0 ${len} 20"><rect x="0" y="5" width="${len}" height="10" rx="4" fill="#141414" stroke="#3a3a3a"/><rect x="0" y="3" width="20" height="14" rx="3" fill="#e6b422" stroke="#8a6a12"/><rect x="${len - 20}" y="3" width="20" height="14" rx="3" fill="#e6b422" stroke="#8a6a12"/></svg>`,
  cleaver: (l = 150) => `<svg width="${l}" height="${l * 0.36}" viewBox="0 0 150 54"><rect x="0" y="22" width="34" height="10" rx="3" fill="#6b4a2a"/><path d="M32 6H146L150 48H32Z" fill="#d7dde3" stroke="#5a6068" stroke-width="2.5"/><circle cx="126" cy="18" r="8" fill="#2a2f36"/><path d="M96 48A8 8 0 0 1 112 48" fill="#2a2f36"/></svg>`,
  kunai: () => `<svg width="46" height="16" viewBox="0 0 46 16"><path d="M18 8 46 8 34 3ZM18 8 46 8 34 13Z" fill="#c9ced6" stroke="#555"/><rect x="2" y="6" width="16" height="4" fill="#3a3a3a"/><circle cx="3" cy="8" r="3" fill="none" stroke="#3a3a3a" stroke-width="1.5"/><rect x="6" y="1" width="9" height="14" fill="#f3e3b0" stroke="#b08a3a"/><path d="M8 4h5M8 7h5M8 10h5" stroke="#c0392b" stroke-width="1.2"/></svg>`,
  tag: () => '<svg width="20" height="30" viewBox="0 0 20 30"><rect x="1" y="1" width="18" height="28" fill="#f3e3b0" stroke="#b08a3a"/><path d="M5 6h10M10 6v18M5 14h10M6 22h8" stroke="#c0392b" stroke-width="1.8"/></svg>',
};

const darkChain = (len) => `<svg width="${len}" height="14" viewBox="0 0 ${len} 14"><line x1="0" y1="7" x2="${len}" y2="7" stroke="#1b1b1f" stroke-width="6" stroke-dasharray="11 4" stroke-linecap="round" style="filter:drop-shadow(0 0 5px #ff2a2a) drop-shadow(0 0 2px #ff2a2a)"/></svg>`;

/** Akamaru sprite matching the casting Kiba (Part I → puppy, otherwise grown). */
function akamaru(ctx, at, k = 1) {
  const img = userImg(ctx); const src = img?.getAttribute('src') || 'sprites/battle/kiba-shippuden.webp';
  const p1 = /part-1/.test(src);
  const { h } = sizeOf(ctx.userEl);
  const file = src.replace(/[^/]+$/, p1 ? 'akamaru-part-1.webp' : 'akamaru.webp');
  const flip = ctx.isFoe ? '' : 'transform:scaleX(-1);';
  return spawn(ctx, `<img src="${file}" style="height:${h * (p1 ? 0.34 : 0.55) * k}px;${flip}filter:drop-shadow(0 2px 3px #0008)">`, at, { life: 2600 });
}
/** Spinning grey vortex (Fang Over Fang style). */
function vortex(ctx, at, w, h, color = '#c9ced6') {
  return spawn(ctx, `<div style="width:${w}px;height:${h}px;border-radius:50%;background:repeating-conic-gradient(from 0deg,${color}dd 0 10deg,${color}55 10deg 22deg,#ffffff00 22deg 36deg);box-shadow:0 0 16px ${color};filter:blur(1.2px);animation:ax-spin .14s linear infinite"></div>`, at, { life: 2000 });
}
/** Grow an element from the ground at a point (bottom-anchored). */
function rise(ctx, n, ms = 320, delay = 0) {
  n.style.transformOrigin = '50% 100%';
  return n.animate([{ transform: 'translate(-50%,-100%) scaleY(0)' }, { transform: 'translate(-50%,-100%) scaleY(1)' }], { duration: ms * ctx.sp, delay: delay * ctx.sp, easing: 'ease-out', fill: 'both' }).finished.catch(() => {});
}
function dome(ctx, at, w, h, life = 1900) {
  const n = spawn(ctx, `<div style="width:${w}px;height:${h}px;border-radius:50% 50% 8px 8px / 90% 90% 8px 8px;background:radial-gradient(circle at 40% 30%,#b3a089,#8a7560 55%,#5e4e3e);box-shadow:inset 0 -12px 22px #3e3226, 0 0 10px #000a;opacity:.94"><div style="position:absolute;inset:0;border-radius:inherit;background:repeating-linear-gradient(160deg,#0000 0 18px,#4e3e3088 18px 21px)"></div></div>`, at, { life });
  n.firstElementChild.style.position = 'relative';
  return n;
}
async function palmStrikes(ctx, n, { aura = false } = {}) {
  const to = ctx.tos[0];
  const g = ghostOf(ctx, ctx.from, 0.55);
  fly(ctx, g, ctx.from, between(ctx.from, to, 0.8), 220, { rotate: 0 }).then(() => fade(ctx, g, 200));
  const dx = (to.x - ctx.from.x) * 0.66; const dy = (to.y - ctx.from.y) * 0.66;
  const total = 300 + n * Math.max(45, 480 / n);
  ctx.userEl.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px)`, offset: 220 / total }, { transform: `translate(${dx}px,${dy}px)`, offset: 0.92 }, { transform: 'translate(0,0)' }], { duration: total * ctx.sp });
  if (aura) ctx.userEl.animate([{ filter: 'none' }, { filter: 'drop-shadow(0 0 14px #4ab0ff) drop-shadow(0 0 6px #9fd8ff)', offset: 0.2 }, { filter: 'drop-shadow(0 0 14px #4ab0ff) drop-shadow(0 0 6px #9fd8ff)', offset: 0.9 }, { filter: 'none' }], { duration: total * ctx.sp });
  await wait(220 * ctx.sp);
  const step = Math.max(45, 480 / n);
  for (let i = 0; i < n; i++) {
    const ti = ctx.tos.length > 1 ? i % ctx.tos.length : 0;
    const t = ctx.tos[ti];
    const p = spawn(ctx, ART.palm(), { x: t.x + rnd(-26, 26), y: t.y + rnd(-50, 30) }, { life: 500 });
    p.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 0 }], { duration: 260 * ctx.sp, fill: 'forwards' });
    if (aura) p.firstElementChild.style.filter = 'drop-shadow(0 0 6px #4ab0ff)';
    shakeEl(ctx.targetEls[ti]);
    await wait(step * ctx.sp);
  }
}

Object.assign(ANIMS, {
  tree_binding: {
    desc: 'User sprays a pink mist at the target, and a tree grows up under them.',
    async play(ctx) {
      const to = ctx.tos[0]; const el = ctx.targetEls[0];
      const m = spawn(ctx, '<div style="width:120px;height:90px;border-radius:50%;background:radial-gradient(ellipse,#ffb3dccc,#ffb3dc66 50%,#ffb3dc00 72%);filter:blur(3px)"></div>', ctx.from, { life: 2200 });
      await fly(ctx, m, ctx.from, to, 450, { rotate: 0, scale: [0.3, 1.4], ease: 'ease-out' });
      const f = feetOf(ctx, el); const { h } = sizeOf(el);
      const t = spawn(ctx, ART3.tree(h * 1.15), { x: f.x, y: f.y + 6 }, { life: 2200 });
      await rise(ctx, t, 420);
      FX.ring(ctx.arena, el, 'gen');
      shake(ctx);
      setTimeout(() => { fade(ctx, t, 400); fade(ctx, m, 400); }, 700 * ctx.sp);
    },
  },
  ice_mirrors: {
    desc: 'Ice mirrors form around the target and shoot ice needles at them.',
    async play(ctx) {
      const to = ctx.tos[0]; const { h } = sizeOf(ctx.targetEls[0]);
      const pts = Array.from({ length: 6 }, (_, i) => { const t = (i / 6) * Math.PI * 2 - Math.PI / 2; return { x: to.x + Math.cos(t) * h * 0.5, y: to.y + Math.sin(t) * h * 0.42 }; });
      const ms = pts.map((p, i) => { const n = spawn(ctx, ART3.mirror(h * 0.38), p, { life: 2200 }); n.style.opacity = '0'; setTimeout(() => pop(ctx, n, 180), i * 60 * ctx.sp); return n; });
      await wait(520 * ctx.sp);
      for (let r = 0; r < 3; r++) {
        pts.forEach((p) => { const nd = spawn(ctx, ART3.needle(), p, { life: 600 }); fly(ctx, nd, p, { x: to.x + rnd(-10, 10), y: to.y + rnd(-14, 14) }, 160, { ease: 'linear' }).then(() => nd.remove()); });
        await wait(110 * ctx.sp);
      }
      shake(ctx);
      ms.forEach((n) => setTimeout(() => fade(ctx, n, 300), 250 * ctx.sp));
    },
  },
  gedo_chains: {
    desc: 'User shoots dark chains with a red aura at the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const ns = await Promise.all([-14, 0, 14].map((dy, i) => wait(i * 70 * ctx.sp).then(() => stretch(ctx, { x: ctx.from.x, y: ctx.from.y + dy }, { x: to.x, y: to.y + dy * 0.6 }, darkChain, 360))));
      wrapRing(ctx, ctx.targetEls[0], 'border:7px dashed #1b1b1f;box-shadow:0 0 12px #ff2a2a, inset 0 0 8px #ff2a2a', 700);
      shake(ctx);
      ns.forEach((n) => setTimeout(() => fade(ctx, n), 450 * ctx.sp));
      await wait(300 * ctx.sp);
    },
  },
  spirit_eaters: {
    desc: 'Giant bald, shirtless, fair-skinned ogres with white blindfolds appear around the targets and strike them.',
    async play(ctx) {
      await Promise.all(ctx.targetEls.map(async (el, i) => {
        const f = feetOf(ctx, el); const { h } = sizeOf(el);
        const side = i % 2 ? 1 : -1;
        const at = { x: f.x + side * h * 0.32, y: f.y + 4 };
        await wait(i * 120 * ctx.sp);
        puff(ctx, { x: at.x, y: at.y - h * 0.5 }, '#d8d0ff', 110);
        const o = spawn(ctx, ART3.ogre(h * 1.25), at, { life: 2000, z: 5 });
        if (side > 0) o.firstElementChild.style.transform = 'scaleX(-1)';
        o.style.transformOrigin = '50% 100%';
        await o.animate([{ transform: 'translate(-50%,-100%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-100%) scale(1)', opacity: 0.95 }], { duration: 300 * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
        await o.animate([{ transform: 'translate(-50%,-100%) rotate(0deg)', opacity: 0.95 }, { transform: `translate(-50%,-100%) rotate(${-side * 14}deg)`, opacity: 0.95 }, { transform: 'translate(-50%,-100%) rotate(0deg)', opacity: 0.95 }], { duration: 300 * ctx.sp, fill: 'forwards' }).finished.catch(() => {});
        boom(ctx, ctx.tos[i], '#e8dcff', 90);
        shakeEl(el);
        setTimeout(() => fade(ctx, o, 350), 300 * ctx.sp);
      }));
    },
  },
  drunken_fist: {
    desc: 'The user sways unpredictably, then strikes the target with a flurry of blows.',
    async play(ctx) {
      const to = ctx.tos[0];
      await ctx.userEl.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-12deg) translateX(-8px)' }, { transform: 'rotate(10deg) translateX(10px)' }, { transform: 'rotate(-8deg) translateX(-6px)' }, { transform: 'rotate(0deg)' }], { duration: 650 * ctx.sp, easing: 'ease-in-out' }).finished.catch(() => {});
      const dx = (to.x - ctx.from.x) * 0.62; const dy = (to.y - ctx.from.y) * 0.62;
      ctx.userEl.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px) rotate(8deg)`, offset: 0.2 }, { transform: `translate(${dx}px,${dy}px) rotate(-10deg)`, offset: 0.5 }, { transform: `translate(${dx}px,${dy}px) rotate(6deg)`, offset: 0.8 }, { transform: 'translate(0,0)' }], { duration: 900 * ctx.sp });
      await wait(180 * ctx.sp);
      for (let i = 0; i < 5; i++) { boom(ctx, { x: to.x + rnd(-34, 34), y: to.y + rnd(-50, 30) }, '#ffffff', 55); shake(ctx); await wait(100 * ctx.sp); }
    },
  },
  dust_cone: {
    desc: 'User emits a transparent cone at the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const { h } = sizeOf(ctx.targetEls[0]);
      const cone = (len) => `<svg width="${len}" height="${h * 0.7}" viewBox="0 0 ${len} 100" preserveAspectRatio="none" style="filter:drop-shadow(0 0 8px #e8fbff)"><path d="M0 50 ${len} 0V100Z" fill="#f4fbff33" stroke="#f4fbff" stroke-width="2" vector-effect="non-scaling-stroke"/><ellipse cx="${len}" cy="50" rx="${Math.min(30, len * 0.06)}" ry="50" fill="#f4fbff55" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
      const n = await stretch(ctx, ctx.from, to, cone, 380, 1500);
      boom(ctx, to, '#ffffff', 120);
      ctx.targetEls[0].animate([{ filter: 'none' }, { filter: 'brightness(3) saturate(0)' }, { filter: 'none' }], { duration: 450 * ctx.sp });
      shake(ctx);
      setTimeout(() => fade(ctx, n, 300), 300 * ctx.sp);
    },
  },
  particle_detachment: {
    desc: 'A transparent cube forms over the target and compresses them as it shrinks.',
    async play(ctx) {
      const to = ctx.tos[0]; const el = ctx.targetEls[0]; const { h } = sizeOf(el);
      const c = spawn(ctx, ART3.cube(h * 1.1), to, { life: 2200 });
      await grow(ctx, c, 380, 'scale(.1)', 'scale(1)');
      await wait(250 * ctx.sp);
      el.animate([{ transform: 'scale(1)', filter: 'none' }, { transform: 'scale(.35)', filter: 'brightness(2.5) saturate(0)' }, { transform: 'scale(1)', filter: 'none' }], { duration: 900 * ctx.sp, easing: 'ease-in' });
      await c.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(.12)' }], { duration: 420 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      boom(ctx, to, '#ffffff', 170);
      shake(ctx);
      fade(ctx, c, 150);
    },
  },
  dynamic_entry: {
    desc: 'User flies in at high speed to kick the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      for (let i = 0; i < 3; i++) { const g = ghostOf(ctx, ctx.from, 0.35 - i * 0.08); fly(ctx, g, ctx.from, between(ctx.from, to, 0.8), 170 + i * 40, { rotate: 0, ease: 'ease-in' }).then(() => fade(ctx, g, 200)); }
      lunge(ctx, to, 0.78, 380);
      await wait(170 * ctx.sp);
      boom(ctx, to, '#ffe9a0', 140);
      puff(ctx, to, '#ffffff', 80);
      shake(ctx);
    },
  },
  dynamic_marking: {
    desc: 'Akamaru jumps from the user and pounces on the target (Part I Kiba uses Part I Akamaru).',
    async play(ctx) {
      const to = ctx.tos[0]; const st = feetOf(ctx, ctx.userEl);
      const a0 = { x: st.x + (ctx.isFoe ? -30 : 30), y: st.y - 40 };
      const a = akamaru(ctx, a0);
      await pop(ctx, a, 200);
      await fly(ctx, a, a0, { x: to.x, y: to.y + 10 }, 520, { rotate: 0, arc: 110, ease: 'ease-in-out' });
      boom(ctx, to, '#fff3c2', 80);
      shake(ctx);
      await wait(250 * ctx.sp);
      fade(ctx, a, 300);
    },
  },
  earth_grudge_threads: {
    desc: 'Wild black threads shoot from the user and entangle the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const len = Math.hypot(to.x - ctx.from.x, to.y - ctx.from.y);
      const wild = () => { let d = 'M0 30'; for (let i = 1; i <= 4; i++) d += ` Q${(len * (i - 0.5)) / 4} ${30 + rnd(-28, 28)} ${(len * i) / 4} ${30 + rnd(-10, 10)}`; return d; };
      const mk = () => `<svg width="${len}" height="60" viewBox="0 0 ${len} 60" style="overflow:visible">${Array.from({ length: 5 }, () => `<path d="${wild()}" stroke="#0d0d0d" stroke-width="${rnd(1.5, 3.5)}" fill="none" style="filter:drop-shadow(0 0 2px #6a6a6a)"/>`).join('')}</svg>`;
      const n = await stretch(ctx, ctx.from, to, mk, 360, 1800);
      wrapRing(ctx, ctx.targetEls[0], 'border:3px solid #0d0d0d;box-shadow:0 0 0 4px #0d0d0d55, inset 0 0 0 6px #0d0d0d44', 700);
      shake(ctx);
      setTimeout(() => fade(ctx, n, 300), 500 * ctx.sp);
      await wait(300 * ctx.sp);
    },
  },
  weighted_boulder: {
    desc: 'The target gets a red aura and sinks further into the ground.',
    async play(ctx) {
      const el = ctx.targetEls[0];
      glowAura(ctx, el, '#ff3b3b', 1300);
      el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(22px) scaleY(.94)', offset: 0.35 }, { transform: 'translateY(22px) scaleY(.94)', offset: 0.8 }, { transform: 'translateY(0)' }], { duration: 1300 * ctx.sp, easing: 'ease-in-out' });
      crackAt(ctx, el);
      await wait(600 * ctx.sp);
    },
  },
  earth_dome: {
    desc: 'User raises an earth dome from the ground that traps the target.',
    async play(ctx) {
      const el = ctx.targetEls[0]; const f = feetOf(ctx, el); const { w, h } = sizeOf(el);
      const d = dome(ctx, { x: f.x, y: f.y + 8 }, Math.max(120, w * 1.15), h * 0.95);
      await rise(ctx, d, 420);
      shake(ctx);
      setTimeout(() => fade(ctx, d, 400), 700 * ctx.sp);
    },
  },
  stone_wall: {
    desc: "User raises an earth dome from the ground that covers the allies' side.",
    async play(ctx) {
      const box = sideBox(ctx);
      const d = dome(ctx, { x: box.c.x, y: box.y2 + 8 }, box.w + 120, box.h * 1.05);
      d.style.zIndex = '7';
      await rise(ctx, d, 500);
      await wait(700 * ctx.sp);
      fade(ctx, d, 400);
    },
  },
  earth_shore_return: {
    desc: 'A slab of earth rises from the ground and falls on the enemies.',
    async play(ctx) {
      const box = sideBox(ctx);
      const w = box.w + 80; const h = box.h * 0.9;
      const back = { x: box.c.x, y: box.y1 + box.h * 0.35 };
      const s = spawn(ctx, `<div style="width:${w}px;height:${h}px;border-radius:10px 10px 4px 4px;background:linear-gradient(#9b8a76,#6e5e4c);box-shadow:inset 0 -10px 18px #3e3226,0 0 10px #000a;background-image:repeating-linear-gradient(170deg,#0000 0 22px,#4e3e3066 22px 25px),linear-gradient(#9b8a76,#6e5e4c)"></div>`, back, { life: 2200, z: 1 });
      await rise(ctx, s, 380);
      s.style.zIndex = '7';
      await s.animate([{ transform: 'translate(-50%,-100%) perspective(600px) rotateX(0deg)' }, { transform: `translate(-50%,-100%) translateY(${box.h * 0.55}px) perspective(600px) rotateX(-70deg)` }], { duration: 300 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      ctx.tos.forEach((t) => { puff(ctx, { x: t.x, y: t.y + 30 }, '#b9a689', 110); });
      shake(ctx);
      fade(ctx, s, 350);
    },
  },
  earth_spear: {
    desc: 'An earth wall grows from the ground in front of the user.',
    async play(ctx) {
      const { w, h } = sizeOf(ctx.userEl); const f = feetOf(ctx, ctx.userEl);
      const wall = spawn(ctx, `<div style="width:${Math.max(70, w * 0.75)}px;height:${h * 0.85}px;border-radius:14px 14px 4px 4px;background:repeating-linear-gradient(165deg,#0000 0 18px,#4e3e3077 18px 21px),linear-gradient(#a8957e,#6e5e4c);box-shadow:inset 0 -10px 18px #3e3226,0 0 10px #000a"></div>`, { x: f.x + (ctx.isFoe ? -26 : 26), y: f.y + 4 }, { life: 1700 });
      await rise(ctx, wall, 420);
      await wait(600 * ctx.sp);
      fade(ctx, wall, 350);
    },
  },
  golem: {
    desc: 'An earth golem grows from the ground beside the enemy and strikes them.',
    async play(ctx) {
      const el = ctx.targetEls[0]; const f = feetOf(ctx, el); const { h } = sizeOf(el);
      const side = ctx.isFoe ? 1 : -1;
      const at = { x: f.x + side * h * 0.42, y: f.y + 4 };
      const g = spawn(ctx, ART3.golem(h * 1.2), at, { life: 2200, z: 5 });
      if (side > 0) g.firstElementChild.style.transform = 'scaleX(-1)';
      await rise(ctx, g, 450);
      await g.animate([{ transform: 'translate(-50%,-100%) rotate(0deg)' }, { transform: `translate(-50%,-100%) rotate(${-side * 12}deg)`, offset: 0.4 }, { transform: `translate(-50%,-100%) translateX(${-side * 26}px) rotate(${side * 8}deg)` }], { duration: 300 * ctx.sp, fill: 'forwards' }).finished.catch(() => {});
      boom(ctx, ctx.tos[0], '#d9c4a0', 120);
      shake(ctx);
      setTimeout(() => fade(ctx, g, 350), 300 * ctx.sp);
    },
  },
  headhunter: {
    desc: 'User disappears underground, then pops up under the target and strikes them.',
    async play(ctx) {
      const u = ctx.userEl; const fu = feetOf(ctx, u); const ft = feetOf(ctx, ctx.targetEls[0]);
      for (let i = 0; i < 3; i++) puff(ctx, { x: fu.x + rnd(-30, 30), y: fu.y - 10 }, '#a8916e', 80);
      u.animate([{ clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' }, { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(60px)', offset: 0.25 }, { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(60px)', offset: 0.85 }, { clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' }], { duration: 1500 * ctx.sp });
      await wait(550 * ctx.sp);
      for (let i = 0; i < 4; i++) puff(ctx, { x: ft.x + rnd(-30, 30), y: ft.y - 10 }, '#a8916e', 90);
      const g = ghostOf(ctx, { x: ft.x, y: ft.y + 40 }, 0.75);
      g.style.clipPath = 'inset(0 0 30% 0)';
      await fly(ctx, g, { x: ft.x, y: ft.y + 40 }, { x: ft.x, y: ft.y - 30 }, 200, { rotate: 0, ease: 'ease-out' });
      crackAt(ctx, ctx.targetEls[0]);
      boom(ctx, ctx.tos[0], '#d9c4a0', 110);
      shake(ctx);
      fade(ctx, g, 300);
    },
  },
  lightened_boulder: {
    desc: 'A light blue aura covers the allies and they float up a little.',
    async play(ctx) {
      ctx.targetEls.forEach((el) => {
        glowAura(ctx, el, '#8fd3ff', 1400);
        el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-22px)', offset: 0.35 }, { transform: 'translateY(-16px)', offset: 0.7 }, { transform: 'translateY(0)' }], { duration: 1400 * ctx.sp, easing: 'ease-in-out' });
      });
      await wait(700 * ctx.sp);
    },
  },
  mud_wall: {
    desc: 'An earth wall grows from the ground in front of the whole ally team.',
    async play(ctx) {
      const box = sideBox(ctx);
      const wall = spawn(ctx, `<div style="width:${box.w + 60}px;height:${box.h * 0.6}px;border-radius:16px 16px 4px 4px;background:repeating-linear-gradient(165deg,#0000 0 22px,#4e3e3077 22px 25px),linear-gradient(#a8957e,#6e5e4c);box-shadow:inset 0 -10px 18px #3e3226,0 0 10px #000a;opacity:.9"></div>`, { x: box.c.x + (ctx.isFoe ? -30 : 30), y: box.y2 + 10 }, { life: 2000, z: 7 });
      await rise(ctx, wall, 480);
      await wait(700 * ctx.sp);
      fade(ctx, wall, 350);
    },
  },
  rock_fist: {
    desc: 'User grows a big rocky fist, then flies in to strike the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const hand = { x: ctx.from.x + (ctx.isFoe ? -26 : 26), y: ctx.from.y };
      const f = spawn(ctx, ART3.rockFist(70), hand, { life: 1600 });
      await pop(ctx, f, 300);
      lunge(ctx, to, 0.72, 520);
      await fly(ctx, f, hand, between(hand, to, 0.88), 240, { rotate: 0 });
      boom(ctx, to, '#d9c4a0', 130);
      crackAt(ctx, ctx.targetEls[0]);
      shake(ctx);
      fade(ctx, f, 200);
    },
  },
  eight_branches: {
    desc: 'User lunges and a snake bites each target (the bite has a purple aura).',
    async play(ctx) {
      lunge(ctx, ctx.tos[0], 0.3, 600);
      await wait(160 * ctx.sp);
      const ns = await Promise.all(ctx.tos.map((t, i) => wait(i * 70 * ctx.sp).then(async () => {
        const end = between(ctx.from, t, 0.84);
        const body = await stretch(ctx, ctx.from, end, ART3.scales, 300, 1600);
        const head = spawn(ctx, ART3.snake(78), end, { life: 1400 });
        head.style.transform = `translate(-20%,-50%) rotate(${ang(ctx.from, t)}deg)`;
        head.style.transformOrigin = '20% 50%';
        boom(ctx, t, '#b44bff', 90);
        shakeEl(ctx.targetEls[i]);
        return [body, head];
      })));
      setTimeout(() => ns.flat().forEach((n) => fade(ctx, n, 300)), 350 * ctx.sp);
      await wait(200 * ctx.sp);
    },
  },
  palms_32: { desc: 'User flies at the target and strikes them with 4 very quick strikes.', play: (ctx) => palmStrikes(ctx, 4) },
  palms_64: { desc: 'User flies at the target and strikes them with 8 very quick strikes.', play: (ctx) => palmStrikes(ctx, 8) },
  palms_128: { desc: 'User flies at the target and strikes them with 16 very quick strikes.', play: (ctx) => palmStrikes(ctx, 16) },
  protection_64: { desc: 'User flies in and lands 8 very quick strikes, glowing with a blue aura.', play: (ctx) => palmStrikes(ctx, 8, { aura: true }) },
  rotation: {
    desc: 'A blue dome of aura covers the user.',
    async play(ctx) {
      const { w, h } = sizeOf(ctx.userEl); const f = feetOf(ctx, ctx.userEl);
      const d = spawn(ctx, `<div style="width:${Math.max(140, w * 1.3)}px;height:${h * 1.02}px;border-radius:50% 50% 10% 10% / 90% 90% 10% 10%;background:radial-gradient(ellipse at 50% 80%,#bfe6ff22,#4aa3ff55 70%,#9fd8ffaa);box-shadow:0 0 26px #4aa3ff,inset 0 0 18px #cfeeff;overflow:hidden;position:relative"><div class="ax-spin" style="position:absolute;inset:-20%;background:repeating-conic-gradient(#ffffff33 0 10deg,#0000 10deg 30deg);animation-duration:.5s"></div></div>`, { x: f.x, y: f.y + 6 }, { life: 1800 });
      await rise(ctx, d, 300);
      await wait(800 * ctx.sp);
      fade(ctx, d, 350);
    },
  },
  vacuum_palm: {
    desc: 'User flies at the target and strikes them, letting off an air blast.',
    async play(ctx) {
      const to = await dash(ctx, 0.66, 500);
      const p = spawn(ctx, ART.palm(), to, { life: 600 }); p.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.4)', opacity: 0 }], { duration: 400 * ctx.sp, fill: 'forwards' });
      const r = spawn(ctx, '<div style="width:160px;height:160px;border-radius:50%;border:6px solid #f4fcffcc;box-shadow:0 0 18px #bfe9ff"></div>', to, { life: 800 });
      r.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], { duration: 520 * ctx.sp, easing: 'ease-out', fill: 'forwards' });
      shake(ctx);
    },
  },
  vacuum_wall: {
    desc: 'The user shoots a blast of air at the enemies.',
    async play(ctx) {
      const box = sideBox(ctx);
      ctx.userEl.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${ctx.isFoe ? -14 : 14}px,0)`, offset: 0.3 }, { transform: 'translate(0,0)' }], { duration: 420 * ctx.sp });
      const h = box.h * 0.9;
      const wave = spawn(ctx, `<svg width="${h * 0.5}" height="${h}" viewBox="0 0 50 100" style="filter:drop-shadow(0 0 12px #bfe9ff)"><path d="M6 2C40 20 40 80 6 98 26 70 26 30 6 2Z" fill="#f4fcff99" stroke="#ffffff" stroke-width="2"/><path d="M20 10C44 30 44 70 20 90" stroke="#ffffffaa" stroke-width="3" fill="none"/></svg>`, ctx.from, { life: 1200 });
      if (ctx.isFoe) wave.firstElementChild.style.transform = 'scaleX(-1)';
      await fly(ctx, wave, ctx.from, box.c, 380, { rotate: 0, scale: [0.4, 1.3], ease: 'ease-in' });
      ctx.tos.forEach((t) => puff(ctx, t, '#ffffff', 90));
      shake(ctx);
      fade(ctx, wave, 200);
    },
  },
  eighty_gods: {
    desc: 'User flies at the enemies and pummels them with many fists made of air.',
    async play(ctx) {
      const near = between(ctx.from, sideBox(ctx).c, 0.45);
      lunge(ctx, near, 0.9, 1100);
      await wait(260 * ctx.sp);
      const src = between(ctx.from, near, 0.9);
      for (let i = 0; i < 24; i++) {
        const t = ctx.tos[i % ctx.tos.length];
        const st = { x: src.x + rnd(-40, 40), y: src.y + rnd(-60, 40) };
        const f = spawn(ctx, ART3.airFist(rnd(30, 46)), st, { life: 700 });
        fly(ctx, f, st, { x: t.x + rnd(-24, 24), y: t.y + rnd(-40, 30) }, 220, { ease: 'ease-in' }).then(() => { f.remove(); boom(ctx, t, '#f4fcff', 40); shakeEl(ctx.targetEls[i % ctx.tos.length]); });
        await wait(32 * ctx.sp);
      }
      await wait(240 * ctx.sp);
    },
  },
  adamantine_staff: {
    desc: 'User swings a large black staff with golden ends that strikes the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const len = Math.hypot(to.x - ctx.from.x, to.y - ctx.from.y) * 0.95;
      const a = ang(ctx.from, to); const sw = ctx.isFoe ? 70 : -70;
      const s = spawn(ctx, ART3.staff(len), ctx.from, { life: 1500 });
      s.style.transformOrigin = '0 50%';
      await s.animate([{ transform: `translate(0,-50%) rotate(${a + sw}deg) scaleX(.2)` }, { transform: `translate(0,-50%) rotate(${a + sw}deg) scaleX(1)`, offset: 0.45 }, { transform: `translate(0,-50%) rotate(${a}deg) scaleX(1)` }], { duration: 560 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      boom(ctx, to, '#ffd65a', 130);
      shake(ctx);
      setTimeout(() => fade(ctx, s, 250), 200 * ctx.sp);
    },
  },
  executioner_blade: {
    desc: 'User slashes the target with a large blade.',
    async play(ctx) {
      const to = ctx.tos[0];
      const hit = lunge(ctx, to, 0.6, 560);
      const b = spawn(ctx, ART3.cleaver(170), ctx.from, { life: 1100 });
      if (ctx.isFoe) b.firstElementChild.style.transform = 'scaleX(-1)';
      await fly(ctx, b, ctx.from, hit, 260, { rotate: ctx.isFoe ? 30 : -30, ease: 'ease-in-out' });
      slashArc(ctx, to, { color: '#f2f4f7', glow: '#9aa3ad', size: 170, rot: 40, ms: 380 });
      shake(ctx);
      fade(ctx, b, 250);
    },
  },
  expansive_tsb: {
    desc: 'A large black orb grows in front of the user, then flies out and hits every enemy.',
    async play(ctx) {
      const at = { x: ctx.from.x + (ctx.isFoe ? -60 : 60), y: ctx.from.y - 20 };
      const o = spawn(ctx, '<div style="width:110px;height:110px;border-radius:50%;background:radial-gradient(circle at 38% 32%,#3a3a44,#050507 60%);box-shadow:0 0 20px 6px #00000099,0 0 40px #6b6b8a55"></div>', at, { life: 2400 });
      await grow(ctx, o, 600, 'scale(.1)', 'scale(1)');
      const box = sideBox(ctx);
      await fly(ctx, o, at, box.c, 380, { rotate: 0, scale: [1, Math.min(2.2, Math.max(1.6, box.w / 110))], ease: 'ease-in' });
      ctx.targetEls.forEach((el) => el.animate([{ filter: 'none' }, { filter: 'brightness(.3)' }, { filter: 'none' }], { duration: 500 * ctx.sp }));
      shake(ctx);
      fade(ctx, o, 350);
    },
  },
  explosive_tag_kunai: {
    desc: 'User throws a kunai at the target that explodes.',
    async play(ctx) {
      const to = ctx.tos[0];
      const k = spawn(ctx, ART3.kunai(), ctx.from, { life: 900 });
      await fly(ctx, k, ctx.from, to, 300);
      k.remove();
      boom(ctx, to, '#ff8a2a', 150);
      boom(ctx, to, '#ffe066', 90);
      shake(ctx);
    },
  },
  trap_tags: {
    desc: 'User dashes over and places an explosive tag at each enemy’s feet, which then explode.',
    async play(ctx) {
      const tags = [];
      for (const el of ctx.targetEls) {
        const f = feetOf(ctx, el);
        const g = ghostOf(ctx, ctx.from, 0.45);
        await fly(ctx, g, ctx.from, { x: f.x, y: f.y - 60 }, 200, { rotate: 0 });
        fade(ctx, g, 150);
        const t = spawn(ctx, ART3.tag(), { x: f.x, y: f.y - 6 }, { life: 1600, z: 2 });
        pop(ctx, t, 150); tags.push([t, f, el]);
      }
      await wait(300 * ctx.sp);
      for (const [t, f, el] of tags) { t.remove(); boom(ctx, { x: f.x, y: f.y - 30 }, '#ff8a2a', 140); shakeEl(el); await wait(110 * ctx.sp); }
    },
  },
  fang_over_fang: {
    desc: 'Akamaru appears beside the user; both start spinning, then fly at the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const f = feetOf(ctx, ctx.userEl); const { w, h } = sizeOf(ctx.userEl);
      const side = ctx.isFoe ? -1 : 1;
      const aAt = { x: f.x + side * w * 0.55, y: f.y - h * 0.2 };
      const a = akamaru(ctx, aAt);
      await pop(ctx, a, 220);
      await wait(250 * ctx.sp);
      ctx.userEl.animate([{ opacity: 1 }, { opacity: 0, offset: 0.15 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1300 * ctx.sp });
      fade(ctx, a, 150);
      const v1 = vortex(ctx, ctx.from, w * 0.7, h * 0.75, '#8a8f99');
      const v2 = vortex(ctx, aAt, w * 0.55, h * 0.45, '#e6e6e6');
      await Promise.all([pop(ctx, v1, 150), pop(ctx, v2, 150)]);
      await wait(250 * ctx.sp);
      await Promise.all([fly(ctx, v1, ctx.from, { x: to.x - 12, y: to.y }, 300, { rotate: 0, ease: 'ease-in' }), fly(ctx, v2, aAt, { x: to.x + 12, y: to.y + 10 }, 340, { rotate: 0, ease: 'ease-in' })]);
      boom(ctx, to, '#ffffff', 130);
      FX.fx(ctx.arena, 'slash', to);
      shake(ctx);
      fade(ctx, v1, 200); fade(ctx, v2, 200);
    },
  },
  fang_wolf_fang: {
    desc: 'The user starts spinning, then flies through every enemy.',
    async play(ctx) {
      const { w, h } = sizeOf(ctx.userEl);
      ctx.userEl.animate([{ opacity: 1 }, { opacity: 0, offset: 0.15 }, { opacity: 0, offset: 0.88 }, { opacity: 1 }], { duration: (900 + ctx.tos.length * 280) * ctx.sp });
      const v = vortex(ctx, ctx.from, w * 0.95, h * 0.8, '#d8dce4');
      await pop(ctx, v, 180);
      await wait(250 * ctx.sp);
      let at = ctx.from;
      for (const [i, t] of ctx.tos.entries()) {
        const n = vortex(ctx, at, w * 0.95, h * 0.8, '#d8dce4'); v.style.opacity = '0';
        await fly(ctx, n, at, t, 240, { rotate: 0, ease: 'ease-in' });
        n.remove();
        at = t;
        boom(ctx, t, '#ffffff', 110); FX.fx(ctx.arena, 'slash', t); shakeEl(ctx.targetEls[i]);
      }
      const back = vortex(ctx, at, w * 0.95, h * 0.8, '#d8dce4');
      fly(ctx, back, at, ctx.from, 300, { rotate: 0 }).then(() => back.remove());
      v.remove();
    },
  },
  female_bug: {
    desc: 'The target is engulfed in a cloud of small black bugs.',
    async play(ctx) {
      const to = ctx.tos[0]; const { h } = sizeOf(ctx.targetEls[0]);
      const bugs = Array.from({ length: 40 }, () => {
        const st = { x: to.x + rnd(-h, h) * 0.9, y: to.y + rnd(-h, h) * 0.7 };
        const b = spawn(ctx, `<div style="width:${rnd(3, 6)}px;height:${rnd(3, 5)}px;border-radius:50%;background:#0b0b0b"></div>`, st, { life: 2200 });
        const pts = Array.from({ length: 5 }, () => `translate(calc(-50% + ${to.x - st.x + rnd(-h * 0.35, h * 0.35)}px), calc(-50% + ${to.y - st.y + rnd(-h * 0.45, h * 0.45)}px))`);
        b.animate([{ transform: 'translate(-50%,-50%)', opacity: 0 }, ...pts.map((t) => ({ transform: t, opacity: 1 })), { transform: pts[4], opacity: 0 }], { duration: 1600 * ctx.sp, easing: 'ease-in-out', fill: 'forwards' });
        return b;
      });
      await wait(600 * ctx.sp);
      shake(ctx);
      await wait(300 * ctx.sp);
      void bugs;
    },
  },
  fire_ash: {
    desc: 'User blows a cloud of ash at the enemies, and it ignites and burns them.',
    async play(ctx) {
      const { fog, go } = mistOver(ctx, '#6e6a66');
      await go;
      const box = sideBox(ctx);
      for (let i = 0; i < 18; i++) {
        const at = { x: rnd(box.x1, box.x2), y: rnd(box.y1 + box.h * 0.2, box.y2) };
        setTimeout(() => { boom(ctx, at, '#ff7a1a', rnd(40, 80)); }, rnd(0, 300) * ctx.sp);
      }
      ctx.targetEls.forEach((el) => { const f = feetOf(ctx, el); const fl = spawn(ctx, ART.flame(44, '#ff7a1a', '#ffd04a'), { x: f.x, y: f.y - 30 }, { life: 1200 }); pop(ctx, fl, 200); setTimeout(() => fade(ctx, fl, 300), 700 * ctx.sp); });
      shake(ctx);
      setTimeout(() => fade(ctx, fog, 500), 400 * ctx.sp);
      await wait(300 * ctx.sp);
    },
  },
});

// ---------------------------------------------------------------- batch 4 (sheet rows 116–153)
const ART4 = {
  fireball: (s = 60, blue = false) => `<div style="width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle at 45% 45%,#fff 0%,${blue ? '#bfe6ff 20%,#4aa3ff 45%,#1f5fd6 62%,#1f5fd600 72%' : '#fff3b0 18%,#ffb340 40%,#ff5a1a 60%,#ff5a1a00 72%'});box-shadow:0 0 ${s * 0.4}px ${blue ? '#4aa3ff' : '#ff7a1a'}"></div>`,
  tripleKunai: () => '<svg width="40" height="22" viewBox="0 0 40 22"><path d="M14 11 40 11 30 7ZM14 11 40 11 30 15Z" fill="#c9ced6" stroke="#555"/><path d="M20 11 30 1 27 9ZM20 11 30 21 27 13Z" fill="#c9ced6" stroke="#555"/><rect x="2" y="9" width="12" height="4" fill="#3a3a3a"/><circle cx="2" cy="11" r="2.5" fill="none" stroke="#3a3a3a" stroke-width="1.5"/></svg>',
  seal: (s = 70) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100" style="filter:drop-shadow(0 0 8px #b44bff)"><circle cx="50" cy="50" r="40" fill="none" stroke="#2a0f3a" stroke-width="4"/><circle cx="50" cy="50" r="14" fill="none" stroke="#2a0f3a" stroke-width="3"/>${[0, 72, 144, 216, 288].map((a) => `<g transform="rotate(${a} 50 50)"><path d="M50 36V14" stroke="#2a0f3a" stroke-width="3"/><circle cx="50" cy="12" r="4" fill="#2a0f3a"/></g>`).join('')}<path d="M44 50h12M50 44v12" stroke="#2a0f3a" stroke-width="2.5"/></svg>`,
  flute: () => '<svg width="70" height="10" viewBox="0 0 70 10"><rect x="0" y="2" width="70" height="6" rx="3" fill="#e9e4d8" stroke="#8a7e66"/><circle cx="20" cy="5" r="1.4" fill="#5a4e3a"/><circle cx="32" cy="5" r="1.4" fill="#5a4e3a"/><circle cx="44" cy="5" r="1.4" fill="#5a4e3a"/></svg>',
  lion: (s = 80) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100" style="filter:drop-shadow(0 0 12px #4aa3ff)">${Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return `<path d="M${50 + Math.cos(a) * 30} ${50 + Math.sin(a) * 30}L${50 + Math.cos(a + 0.22) * 48} ${50 + Math.sin(a + 0.22) * 48}L${50 + Math.cos(a + 0.44) * 30} ${50 + Math.sin(a + 0.44) * 30}Z" fill="#6cc4ff" opacity=".85"/>`; }).join('')}<circle cx="50" cy="52" r="30" fill="#bfe6ff" stroke="#4aa3ff" stroke-width="3" opacity=".95"/><path d="M38 44l6 4M62 44l-6 4" stroke="#1f5fd6" stroke-width="4" stroke-linecap="round"/><path d="M44 60Q50 66 56 60M50 54v6M40 66Q50 76 60 66" stroke="#1f5fd6" stroke-width="3" fill="none"/><path d="M28 30 22 18 36 26M72 30 78 18 64 26" fill="#6cc4ff"/></svg>`,
  fan: (l = 170) => `<svg width="${l}" height="${l * 0.3}" viewBox="0 0 170 50"><rect x="0" y="4" width="170" height="42" rx="6" fill="#efe6cf" stroke="#6b5a3a" stroke-width="2.5"/><path d="M0 12H170M0 38H170" stroke="#3a3a3a" stroke-width="3"/><circle cx="56" cy="25" r="8" fill="#6a3fa0"/><circle cx="96" cy="25" r="8" fill="#6a3fa0"/><circle cx="136" cy="25" r="8" fill="#6a3fa0"/></svg>`,
  waterFist: (s = 80) => `<svg width="${s}" height="${s}" viewBox="0 0 80 80" style="filter:drop-shadow(0 0 8px #4ab0ff)"><path d="M10 26C8 12 36 6 52 10 70 14 76 30 72 48 68 66 50 74 32 72 14 70 8 56 10 40Z" fill="#8fd3ff99" stroke="#e6f7ff" stroke-width="3"/><path d="M28 20V36M42 16V34M56 20V36" stroke="#e6f7ff" stroke-width="3" stroke-linecap="round"/><circle cx="26" cy="54" r="5" fill="#ffffff88"/></svg>`,
  needle: () => '<svg width="40" height="6" viewBox="0 0 40 6"><path d="M0 3H40" stroke="#d9dde3" stroke-width="2" stroke-linecap="round"/><path d="M36 1 40 3 36 5" fill="#888"/></svg>',
};

function fireball(ctx, a, b, { size = 60, blue = false, ms = 420, arc = 0, trail = true } = {}) {
  const f = spawn(ctx, `<div class="ax-flicker" style="animation-duration:.2s">${ART4.fireball(size, blue)}</div>`, a, { life: ms + 800 });
  let iv = null;
  if (trail) iv = setInterval(() => { const r = f.getBoundingClientRect(); const ar = ctx.arena.getBoundingClientRect(); puff(ctx, { x: r.left - ar.left + r.width / 2, y: r.top - ar.top + r.height / 2 }, blue ? '#6cc4ff' : '#ff8a2a', size * 0.6); }, 45);
  return fly(ctx, f, a, b, ms, { rotate: 0, arc, ease: 'ease-in' }).then(() => { if (iv) clearInterval(iv); f.remove(); boom(ctx, b, blue ? '#4aa3ff' : '#ff7a1a', size * 2); });
}
function burnAt(ctx, el, blue = false) {
  const f = feetOf(ctx, el);
  [-22, 0, 22].forEach((dx, i) => { const n = spawn(ctx, ART.flame(30 + (i === 1 ? 14 : 0), blue ? '#2f7bff' : '#ff6a1a', blue ? '#bfe0ff' : '#ffd04a'), { x: f.x + dx, y: f.y - 28 }, { life: 1300 }); pop(ctx, n, 180); setTimeout(() => fade(ctx, n, 300), 750 * ctx.sp); });
}
function yellowFlash(ctx, at) {
  const n = spawn(ctx, '<div style="width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,#fff 0%,#ffe066 30%,#ffd04a00 70%)"></div>', at, { life: 700 });
  n.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.2)', opacity: 0 }], { duration: 380 * ctx.sp, fill: 'forwards' });
}
async function ashBurn(ctx, single = false) {
  let fog;
  if (single) {
    const to = ctx.tos[0];
    fog = spawn(ctx, '<div style="width:170px;height:150px;border-radius:50%;background:radial-gradient(ellipse,#6e6a66cc 0%,#6e6a6699 45%,#6e6a6600 72%);filter:blur(4px)"></div>', ctx.from, { life: 2400 });
    await fly(ctx, fog, ctx.from, to, 600, { rotate: 0, scale: [0.2, 1], ease: 'ease-out' });
    for (let i = 0; i < 10; i++) setTimeout(() => boom(ctx, { x: to.x + rnd(-50, 50), y: to.y + rnd(-60, 50) }, '#ff7a1a', rnd(40, 80)), rnd(0, 260) * ctx.sp);
  } else {
    const m = mistOver(ctx, '#6e6a66'); fog = m.fog; await m.go;
    const box = sideBox(ctx);
    for (let i = 0; i < 18; i++) setTimeout(() => boom(ctx, { x: rnd(box.x1, box.x2), y: rnd(box.y1 + box.h * 0.2, box.y2) }, '#ff7a1a', rnd(40, 80)), rnd(0, 300) * ctx.sp);
  }
  ctx.targetEls.forEach((el) => burnAt(ctx, el));
  shake(ctx);
  setTimeout(() => fade(ctx, fog, 500), 400 * ctx.sp);
  await wait(300 * ctx.sp);
}
async function wireFlame(ctx) {
  const to = ctx.tos[0];
  const wire = (len) => `<svg width="${len}" height="6" viewBox="0 0 ${len} 6"><path d="M0 3H${len}" stroke="#d9dde3" stroke-width="1.4"/></svg>`;
  const w = await stretch(ctx, ctx.from, to, wire, 260, 2400);
  await wait(150 * ctx.sp);
  const f = spawn(ctx, ART.flame(34, '#ff6a1a', '#ffd04a'), ctx.from, { life: 1200 });
  const iv = setInterval(() => { const r = f.getBoundingClientRect(); const ar = ctx.arena.getBoundingClientRect(); const t = spawn(ctx, ART.flame(20, '#ff8a2a', '#ffd04a'), { x: r.left - ar.left + r.width / 2, y: r.top - ar.top + r.height / 2 }, { life: 700 }); fade(ctx, t, 500); }, 40);
  await fly(ctx, f, ctx.from, to, 420, { rotate: 0, ease: 'linear' });
  clearInterval(iv); f.remove();
  boom(ctx, to, '#ff7a1a', 120); burnAt(ctx, ctx.targetEls[0]);
  shake(ctx);
  fade(ctx, w, 300);
}
async function lotus(ctx, flaming) {
  const to = ctx.tos[0]; const el = ctx.targetEls[0];
  if (flaming) { ctx.userEl.animate([{ filter: 'none' }, { filter: 'drop-shadow(0 0 14px #ff7a1a) drop-shadow(0 0 6px #ffd04a)', offset: 0.15 }, { filter: 'drop-shadow(0 0 14px #ff7a1a) drop-shadow(0 0 6px #ffd04a)', offset: 0.85 }, { filter: 'none' }], { duration: 1600 * ctx.sp }); await wait(200 * ctx.sp); }
  lunge(ctx, to, 0.7, 380);
  await wait(170 * ctx.sp);
  boom(ctx, to, '#ffffff', 80);
  const up = -Math.min(130, Math.max(50, to.y - sizeOf(el).h * 0.3));
  const glow = flaming ? 'drop-shadow(0 0 12px #ff7a1a)' : 'none';
  el.animate([{ transform: 'translateY(0) rotate(0deg)', filter: 'none' }, { transform: `translateY(${up}px) rotate(0deg)`, filter: glow, offset: 0.35 }, { transform: `translateY(${up}px) rotate(540deg)`, filter: glow, offset: 0.6 }, { transform: 'translateY(0) rotate(1080deg)', filter: glow, offset: 0.85 }, { transform: 'translateY(0) rotate(1080deg)', filter: 'none' }], { duration: 1200 * ctx.sp, easing: 'ease-in-out' });
  const g = ghostOf(ctx, { x: to.x - 18, y: to.y }, 0.7);
  if (flaming) g.firstElementChild.style.filter = 'drop-shadow(0 0 10px #ff7a1a)';
  g.animate([{ transform: 'translate(-50%,-50%) translateY(0) rotate(0deg)' }, { transform: `translate(-50%,-50%) translateY(${up - 10}px) rotate(0deg)`, offset: 0.35 }, { transform: `translate(-50%,-50%) translateY(${up - 10}px) rotate(540deg)`, offset: 0.6 }, { transform: 'translate(-50%,-50%) translateY(-10px) rotate(1080deg)', offset: 0.85 }, { transform: 'translate(-50%,-50%) translateY(-10px) rotate(1080deg)', opacity: 0 }], { duration: 1200 * ctx.sp, easing: 'ease-in-out', fill: 'forwards' });
  await wait(1020 * ctx.sp);
  crackAt(ctx, el);
  boom(ctx, { x: to.x, y: to.y + 30 }, flaming ? '#ff7a1a' : '#d9c4a0', 160);
  shakeEl(el);
}

Object.assign(ANIMS, {
  ash_pile: { desc: 'User blows a cloud of ash at the target, and it ignites and burns them.', play: (ctx) => ashBurn(ctx, true) },
  burning_ash: { desc: 'User blows a cloud of ash at the enemies, and it ignites and burns them.', play: (ctx) => ashBurn(ctx) },
  dragon_fire: { desc: 'User shoots a wire at the target, then ignites it; the flame races along the wire and burns the target.', play: (ctx) => wireFlame(ctx) },
  dragon_flame: { desc: 'User shoots a wire at the target, then ignites it; the flame races along the wire and burns the target.', play: (ctx) => wireFlame(ctx) },
  fire_dragon_flame: {
    desc: 'User shoots a medium-sized fireball at the target.',
    async play(ctx) { await fireball(ctx, ctx.from, ctx.tos[0], { size: 64 }); burnAt(ctx, ctx.targetEls[0]); shake(ctx); },
  },
  great_fireball: {
    desc: 'User shoots a large fireball at the target.',
    async play(ctx) { await fireball(ctx, ctx.from, ctx.tos[0], { size: 110, ms: 520 }); burnAt(ctx, ctx.targetEls[0]); shake(ctx); },
  },
  searing_migraine: {
    desc: 'User shoots a medium-sized fireball at each enemy.',
    async play(ctx) {
      await Promise.all(ctx.tos.map((t, i) => wait(i * 120 * ctx.sp).then(() => fireball(ctx, ctx.from, t, { size: 60 })).then(() => { burnAt(ctx, ctx.targetEls[i]); shakeEl(ctx.targetEls[i]); })));
    },
  },
  fire_annihilation: {
    desc: 'User shoots fire at every enemy, trailing along a spiral path.',
    async play(ctx) {
      await Promise.all(ctx.tos.map((t, i) => wait(i * 90 * ctx.sp).then(async () => {
        const f = spawn(ctx, `<div class="ax-flicker" style="animation-duration:.2s">${ART4.fireball(54)}</div>`, ctx.from, { life: 2000 });
        const dx = t.x - ctx.from.x; const dy = t.y - ctx.from.y; const L = Math.hypot(dx, dy); const nx = -dy / L; const ny = dx / L;
        const frames = Array.from({ length: 25 }, (_, k) => { const p = k / 24; const r = 60 * Math.sin(p * Math.PI) ; const a = p * Math.PI * 4 + i; const ox = nx * Math.cos(a) * r; const oy = ny * Math.cos(a) * r + Math.sin(a) * r * 0.35; return { transform: `translate(calc(-50% + ${dx * p + ox}px), calc(-50% + ${dy * p + oy}px))` }; });
        const iv = setInterval(() => { const r = f.getBoundingClientRect(); const ar = ctx.arena.getBoundingClientRect(); const tr = spawn(ctx, ART4.fireball(30), { x: r.left - ar.left + r.width / 2, y: r.top - ar.top + r.height / 2 }, { life: 700 }); fade(ctx, tr, 450); }, 35);
        await f.animate(frames, { duration: 700 * ctx.sp, easing: 'linear', fill: 'forwards' }).finished.catch(() => {});
        clearInterval(iv); f.remove();
        boom(ctx, t, '#ff7a1a', 130); burnAt(ctx, ctx.targetEls[i]); shakeEl(ctx.targetEls[i]);
      })));
    },
  },
  majestic_flame: {
    desc: 'User shoots a massive fireball that burns every enemy.',
    async play(ctx) {
      const box = sideBox(ctx);
      const size = Math.max(200, box.w * 0.7);
      const f = spawn(ctx, `<div class="ax-flicker" style="animation-duration:.22s">${ART4.fireball(size)}</div>`, ctx.from, { life: 2000 });
      await fly(ctx, f, ctx.from, box.c, 650, { rotate: 0, scale: [0.2, 1], ease: 'ease-in' });
      f.remove();
      boom(ctx, box.c, '#ff7a1a', box.w + 160);
      ctx.targetEls.forEach((el) => burnAt(ctx, el));
      shake(ctx);
    },
  },
  cat_fireballs: {
    desc: 'User shoots multiple small blue fireballs at every enemy.',
    async play(ctx) {
      const ps = [];
      for (let k = 0; k < 3; k++) ctx.tos.forEach((t, i) => ps.push(wait((k * 110 + i * 40) * ctx.sp).then(() => fireball(ctx, ctx.from, { x: t.x + rnd(-20, 20), y: t.y + rnd(-30, 20) }, { size: 28, blue: true, ms: 380, arc: rnd(-40, 60), trail: false })).then(() => shakeEl(ctx.targetEls[i]))));
      await Promise.all(ps);
      ctx.targetEls.forEach((el) => burnAt(ctx, el, true));
    },
  },
  phoenix_flower: {
    desc: 'User shoots multiple fireballs at every enemy.',
    async play(ctx) {
      const ps = [];
      for (let k = 0; k < 3; k++) ctx.tos.forEach((t, i) => ps.push(wait((k * 110 + i * 40) * ctx.sp).then(() => fireball(ctx, ctx.from, { x: t.x + rnd(-20, 20), y: t.y + rnd(-30, 20) }, { size: 32, ms: 380, arc: rnd(-40, 60), trail: false })).then(() => shakeEl(ctx.targetEls[i]))));
      await Promise.all(ps);
      ctx.targetEls.forEach((el) => burnAt(ctx, el));
    },
  },
  toad_oil_flame: {
    desc: 'User sprays the enemies with brownish-black oil that pools at their feet, then fireballs ignite the oil, which explodes and burns them.',
    async play(ctx) {
      const pools = [];
      await Promise.all(ctx.targetEls.map(async (el, i) => {
        const f = feetOf(ctx, el);
        await Promise.all(Array.from({ length: 6 }, (_, k) => wait(k * 40 * ctx.sp).then(async () => {
          const d = spawn(ctx, `<div style="width:${rnd(10, 18)}px;height:${rnd(10, 18)}px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#7a5a3a,#2a1a0e)"></div>`, ctx.from, { life: 1200 });
          await fly(ctx, d, ctx.from, { x: f.x + rnd(-30, 30), y: f.y - rnd(0, 60) }, 380, { rotate: 0, arc: 70 });
          d.remove();
        })));
        const p = spawn(ctx, '<div style="width:130px;height:30px;border-radius:50%;background:radial-gradient(ellipse,#3a2614,#2a1a0eee 55%,#2a1a0e00 72%)"></div>', { x: f.x, y: f.y }, { life: 2600, z: 1 });
        await pop(ctx, p, 200); pools.push([p, el, i]);
      }));
      await wait(200 * ctx.sp);
      await Promise.all(pools.map(([p, el, i]) => wait(i * 90 * ctx.sp).then(() => fireball(ctx, ctx.from, feetOf(ctx, el), { size: 54 })).then(() => {
        const f = feetOf(ctx, el); fade(ctx, p, 300);
        boom(ctx, { x: f.x, y: f.y - 30 }, '#ff5a1a', 170); burnAt(ctx, el); shakeEl(el);
      })));
    },
  },
  five_pronged_seal: {
    desc: 'User lunges at the target and puts a seal on them.',
    async play(ctx) {
      const to = await dash(ctx, 0.68, 520);
      const s = spawn(ctx, ART4.seal(70), { x: to.x, y: to.y + 6 }, { life: 1600 });
      s.animate([{ transform: 'translate(-50%,-50%) scale(1.8) rotate(-90deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 }], { duration: 300 * ctx.sp, easing: 'ease-out', fill: 'forwards' });
      ctx.targetEls[0].animate([{ filter: 'none' }, { filter: 'drop-shadow(0 0 10px #b44bff)' }, { filter: 'none' }], { duration: 800 * ctx.sp });
      shake(ctx);
      setTimeout(() => fade(ctx, s, 300), 800 * ctx.sp);
    },
  },
  flash_bomb: {
    desc: 'User throws a round smoke bomb at the enemies that blinds them with a flash.',
    async play(ctx) {
      const box = sideBox(ctx);
      const b = spawn(ctx, '<div style="width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#8a8f99,#2a2d33);border:1.5px solid #111"></div>', ctx.from, { life: 1200 });
      await fly(ctx, b, ctx.from, box.c, 480, { rotate: 0, arc: 90, ease: 'ease-in-out' });
      b.remove();
      const fl = spawn(ctx, `<div style="width:${box.w + 200}px;height:${box.h + 160}px;border-radius:50%;background:radial-gradient(ellipse,#ffffff 0%,#ffffffcc 40%,#ffffff00 72%)"></div>`, box.c, { life: 1200 });
      fl.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], { duration: 800 * ctx.sp, fill: 'forwards' });
      ctx.targetEls.forEach((el) => el.animate([{ filter: 'none' }, { filter: 'brightness(3)' }, { filter: 'none' }], { duration: 700 * ctx.sp }));
      for (let i = 0; i < 4; i++) puff(ctx, { x: box.c.x + rnd(-60, 60), y: box.c.y + rnd(-30, 30) }, '#c9ced6', 110);
      shake(ctx);
    },
  },
  flower_bomb: {
    desc: 'User throws kunai at the enemies that explode into purple flower petals.',
    async play(ctx) {
      await Promise.all(ctx.tos.map((t, i) => wait(i * 90 * ctx.sp).then(async () => {
        const k = spawn(ctx, ART3.kunai(), ctx.from, { life: 900 });
        await fly(ctx, k, ctx.from, t, 320);
        k.remove();
        boom(ctx, t, '#c78bff', 100);
        scatter(ctx, t, ART2.petal('#c78bff'), 12, 100, 900);
        shakeEl(ctx.targetEls[i]);
      })));
    },
  },
  petal_escape: {
    desc: 'A clone of the user appears in front of them; when the clone is struck, pink flower petals scatter.',
    play: (ctx) => ANIMS.clone_feint.play(ctx),
    decoy(ctx, el) {
      const at = FX.centerOf(el, ctx.arena);
      el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.1 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1300 * ctx.sp });
      scatter(ctx, at, ART2.petal(), 30, 140, 1100);
    },
  },
  flute_strike: {
    desc: 'User flies in and strikes the target with their flute.',
    async play(ctx) {
      const to = ctx.tos[0];
      const hit = lunge(ctx, to, 0.66, 500);
      const f = spawn(ctx, ART4.flute(), ctx.from, { life: 1000 });
      await fly(ctx, f, ctx.from, hit, 240, { rotate: ctx.isFoe ? 140 : -40, ease: 'ease-in-out' });
      boom(ctx, to, '#ffffff', 70);
      shake(ctx);
      fade(ctx, f, 250);
    },
  },
  flying_swallow: { desc: 'User strikes the target with blue chakra blades; the slashes form an X.', play: (ctx) => ANIMS.chakra_blade_combo.play(ctx) },
  ftg_slash: {
    desc: 'User teleports through the target, slashing them on the way.',
    async play(ctx) {
      const to = ctx.tos[0];
      const beyond = { x: to.x + (to.x - ctx.from.x) * 0.25, y: to.y + (to.y - ctx.from.y) * 0.25 };
      yellowFlash(ctx, ctx.from);
      ctx.userEl.animate([{ opacity: 1 }, { opacity: 0, offset: 0.08 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1000 * ctx.sp });
      const streak = (len) => `<svg width="${len}" height="12" viewBox="0 0 ${len} 12" style="filter:drop-shadow(0 0 6px #ffe066)"><path d="M0 6H${len}" stroke="#fff6c2" stroke-width="4" stroke-linecap="round"/></svg>`;
      const s = await stretch(ctx, ctx.from, beyond, streak, 120, 900);
      const g = ghostOf(ctx, beyond, 0.8);
      FX.fx(ctx.arena, 'slash', to);
      slashArc(ctx, to, { color: '#fff6c2', glow: '#ffe066', size: 120, rot: 30 });
      shake(ctx);
      fade(ctx, s, 250);
      setTimeout(() => { yellowFlash(ctx, beyond); fade(ctx, g, 150); }, 450 * ctx.sp);
      await wait(150 * ctx.sp);
    },
  },
  ftg_strike: {
    desc: 'User throws a three-pronged kunai at the target, then teleports to it and strikes.',
    async play(ctx) {
      const to = ctx.tos[0]; const near = between(ctx.from, to, 0.82);
      const k = spawn(ctx, ART4.tripleKunai(), ctx.from, { life: 900 });
      await fly(ctx, k, ctx.from, near, 280);
      yellowFlash(ctx, ctx.from); yellowFlash(ctx, near);
      ctx.userEl.animate([{ opacity: 1 }, { opacity: 0, offset: 0.08 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 900 * ctx.sp });
      const g = ghostOf(ctx, near, 0.85);
      k.remove();
      await wait(80 * ctx.sp);
      boom(ctx, to, '#ffe066', 120);
      shake(ctx);
      setTimeout(() => { yellowFlash(ctx, near); fade(ctx, g, 150); }, 400 * ctx.sp);
    },
  },
  ftg_rasengan: {
    desc: 'User forms a blue spiraling orb, throws a three-pronged kunai at the target, teleports to it and strikes with the orb.',
    async play(ctx) {
      const to = ctx.tos[0]; const near = between(ctx.from, to, 0.78);
      const hand = { x: ctx.from.x + (ctx.isFoe ? -24 : 24), y: ctx.from.y };
      const r = spawn(ctx, ART.rasengan(48), hand, { life: 2400 });
      await pop(ctx, r, 300);
      const k = spawn(ctx, ART4.tripleKunai(), ctx.from, { life: 900 });
      await fly(ctx, k, ctx.from, near, 280);
      yellowFlash(ctx, ctx.from); yellowFlash(ctx, near);
      ctx.userEl.animate([{ opacity: 1 }, { opacity: 0, offset: 0.08 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1000 * ctx.sp });
      const g = ghostOf(ctx, near, 0.85); k.remove();
      const handNear = { x: near.x + (ctx.isFoe ? -24 : 24), y: near.y };
      await fly(ctx, r, hand, between(handNear, to, 0.6), 120, { rotate: 0, ease: 'linear' });
      boom(ctx, to, '#6cb8ff', 150);
      shake(ctx);
      fade(ctx, r, 200);
      setTimeout(() => { yellowFlash(ctx, near); fade(ctx, g, 150); }, 450 * ctx.sp);
    },
  },
  four_legs: {
    desc: 'A white aura glows on the user.',
    async play(ctx) { glowAura(ctx, ctx.userEl, '#ffffff', 1200); await wait(600 * ctx.sp); },
  },
  frog_kata: {
    desc: 'User glows blue, then flies in and strikes the target.',
    async play(ctx) {
      ctx.userEl.animate([{ filter: 'none' }, { filter: 'drop-shadow(0 0 14px #4aa3ff) drop-shadow(0 0 6px #9fd8ff)', offset: 0.3 }, { filter: 'drop-shadow(0 0 14px #4aa3ff)', offset: 0.8 }, { filter: 'none' }], { duration: 1100 * ctx.sp });
      await wait(380 * ctx.sp);
      const to = ctx.tos[0];
      const g = ghostOf(ctx, ctx.from, 0.55);
      fly(ctx, g, ctx.from, between(ctx.from, to, 0.82), 240, { rotate: 0 }).then(() => fade(ctx, g, 200));
      lunge(ctx, to, 0.72, 480);
      await wait(230 * ctx.sp);
      boom(ctx, to, '#9fd8ff', 120);
      shake(ctx);
    },
  },
  front_lotus: { desc: 'User carries the target into the air and spirals down, slamming them into the ground.', play: (ctx) => lotus(ctx, false) },
  hidden_lotus: { desc: 'Like Front Lotus, wrapped in a flaming aura.', play: (ctx) => lotus(ctx, true) },
  genjutsu_dispel: {
    desc: 'User moves over to the targeted ally and applies a light green aura to them.',
    async play(ctx) {
      if (ctx.targetEls[0] !== ctx.userEl) { lunge(ctx, ctx.tos[0], 0.75, 700); await wait(300 * ctx.sp); }
      glowAura(ctx, ctx.targetEls[0], '#b8ffc4');
      await wait(500 * ctx.sp);
    },
  },
  gentle_fist: { desc: 'User flies at the target and strikes them with 2 very quick strikes.', play: (ctx) => palmStrikes(ctx, 2) },
  twin_lion_fists: {
    desc: 'User forms two blue lion heads on their left and right, then flies in and strikes the target with both.',
    async play(ctx) {
      const to = ctx.tos[0]; const { w, h } = sizeOf(ctx.userEl);
      const L = { x: ctx.from.x - w * 0.55, y: ctx.from.y - h * 0.05 }; const R = { x: ctx.from.x + w * 0.55, y: ctx.from.y - h * 0.05 };
      const a = spawn(ctx, ART4.lion(Math.max(90, h * 0.45)), L, { life: 2200 }); const b = spawn(ctx, ART4.lion(Math.max(90, h * 0.45)), R, { life: 2200 });
      await Promise.all([pop(ctx, a, 300), pop(ctx, b, 300)]);
      ctx.userEl.animate([{ filter: 'none' }, { filter: 'drop-shadow(0 0 12px #4aa3ff)' }, { filter: 'none' }], { duration: 1000 * ctx.sp });
      await wait(250 * ctx.sp);
      lunge(ctx, to, 0.7, 520);
      await Promise.all([fly(ctx, a, L, { x: to.x - 18, y: to.y }, 260, { rotate: 0 }), fly(ctx, b, R, { x: to.x + 18, y: to.y }, 260, { rotate: 0 })]);
      boom(ctx, to, '#6cc4ff', 170);
      shake(ctx);
      fade(ctx, a, 250); fade(ctx, b, 250);
    },
  },
  fan_strike: {
    desc: 'User swings their giant fan and strikes the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      lunge(ctx, to, 0.55, 600);
      await wait(150 * ctx.sp);
      const pivot = between(ctx.from, to, 0.3);
      const a = ang(pivot, to); const sw = ctx.isFoe ? 80 : -80;
      const f = spawn(ctx, ART4.fan(Math.min(200, Math.hypot(to.x - pivot.x, to.y - pivot.y))), pivot, { life: 1300 });
      f.style.transformOrigin = '0 50%';
      await f.animate([{ transform: `translate(0,-50%) rotate(${a + sw}deg)` }, { transform: `translate(0,-50%) rotate(${a}deg)` }], { duration: 260 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      boom(ctx, to, '#ffffff', 110);
      puff(ctx, to, '#e8f8ff', 90);
      shake(ctx);
      fade(ctx, f, 250);
    },
  },
  giant_shuriken: {
    desc: 'User throws a giant shuriken at the target.',
    async play(ctx) {
      const s = spawn(ctx, ART.star(90), ctx.from, { life: 1300 });
      await fly(ctx, s, ctx.from, ctx.tos[0], 420, { rotate: 0, arc: 30 });
      s.remove();
      FX.fx(ctx.arena, 'slash', ctx.tos[0]);
      boom(ctx, ctx.tos[0], '#ffffff', 90);
      shake(ctx);
    },
  },
  great_water_arm: {
    desc: 'User flies in and strikes the target with a giant water arm.',
    async play(ctx) {
      const to = ctx.tos[0];
      const hand = { x: ctx.from.x + (ctx.isFoe ? -26 : 26), y: ctx.from.y };
      const f = spawn(ctx, ART4.waterFist(60), hand, { life: 1600 });
      await pop(ctx, f, 220);
      lunge(ctx, to, 0.7, 520);
      await fly(ctx, f, hand, between(hand, to, 0.88), 240, { rotate: 0, scale: [1, 1.8] });
      boom(ctx, to, '#8fd3ff', 140);
      for (let i = 0; i < 8; i++) { const d = spawn(ctx, '<div style="width:8px;height:8px;border-radius:50%;background:#bfe8ff"></div>', to, { life: 700 }); const t = rnd(0, Math.PI * 2); fly(ctx, d, to, { x: to.x + Math.cos(t) * 70, y: to.y + Math.sin(t) * 60 }, 400, { rotate: 0, ease: 'ease-out' }).then(() => d.remove()); }
      shake(ctx);
      fade(ctx, f, 200);
    },
  },
  ground_splitter: {
    desc: 'User flies in and smashes the ground, cracking it at every enemy’s feet.',
    async play(ctx) {
      const box = sideBox(ctx);
      const g = ghostOf(ctx, ctx.from, 0.6);
      await fly(ctx, g, ctx.from, { x: box.c.x, y: box.y2 - 60 }, 300, { rotate: 0 });
      boom(ctx, { x: box.c.x, y: box.y2 - 10 }, '#d9c4a0', 140);
      fade(ctx, g, 200);
      ctx.targetEls.forEach((el) => crackAt(ctx, el));
      for (let i = 0; i < 5; i++) puff(ctx, { x: rnd(box.x1, box.x2), y: box.y2 - 10 }, '#b9a689', 80);
      shake(ctx);
    },
  },
  gyuki_bomb: { desc: 'A black orb with a purple aura and tiny blue and red sparks grows in front of the user, then fires at the enemies.', play: (ctx) => ANIMS.chomei_bomb.play(ctx) },
  hair_needles: {
    desc: 'User shoots white needle-like hair at the target, then it binds them.',
    async play(ctx) {
      const to = ctx.tos[0];
      await Promise.all(Array.from({ length: 10 }, (_, i) => wait(i * 30 * ctx.sp).then(async () => {
        const st = { x: ctx.from.x + rnd(-12, 12), y: ctx.from.y - 30 + rnd(-12, 12) };
        const n = spawn(ctx, '<svg width="46" height="4" viewBox="0 0 46 4"><path d="M0 2H46" stroke="#fafafa" stroke-width="2" stroke-linecap="round" style="filter:drop-shadow(0 0 3px #fff)"/></svg>', st, { life: 900 });
        await fly(ctx, n, st, { x: to.x + rnd(-24, 24), y: to.y + rnd(-40, 30) }, 260, { ease: 'linear' });
        n.remove();
      })));
      wrapRing(ctx, ctx.targetEls[0], 'border:3px solid #fafafa;box-shadow:0 0 10px #fff, inset 0 0 0 5px #fafafa55', 700);
      shake(ctx);
      await wait(300 * ctx.sp);
    },
  },
  healing_bite: {
    desc: 'User moves over to the targeted ally, bites them, and a green healing aura appears on them.',
    async play(ctx) {
      const to = ctx.tos[0];
      if (ctx.targetEls[0] !== ctx.userEl) { lunge(ctx, to, 0.75, 760); await wait(320 * ctx.sp); }
      const bite = spawn(ctx, '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M4 8Q20 0 36 8" stroke="#fff" stroke-width="3" fill="none"/><path d="M4 22Q20 30 36 22" stroke="#fff" stroke-width="3" fill="none"/><path d="M10 7v5M16 5v6M22 5v6M28 6v5M10 23v-5M16 25v-6M22 25v-6M28 24v-5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>', { x: to.x, y: to.y - 10 }, { life: 900 });
      bite.animate([{ transform: 'translate(-50%,-50%) scaleY(1.6)', opacity: 0 }, { transform: 'translate(-50%,-50%) scaleY(.7)', opacity: 1, offset: 0.4 }, { transform: 'translate(-50%,-50%) scaleY(.7)', opacity: 0 }], { duration: 600 * ctx.sp, fill: 'forwards' });
      await wait(250 * ctx.sp);
      glowAura(ctx, ctx.targetEls[0]);
      await wait(400 * ctx.sp);
    },
  },
  heavenly_kick: {
    desc: 'User flies up, then comes down on the target and cracks the ground at their feet.',
    async play(ctx) {
      const to = ctx.tos[0];
      const top = { x: to.x, y: Math.max(30, to.y - 160) };
      ctx.userEl.animate([{ opacity: 1 }, { opacity: 0, offset: 0.12 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1100 * ctx.sp });
      const g = ghostOf(ctx, ctx.from, 0.85);
      await fly(ctx, g, ctx.from, top, 380, { rotate: 0, arc: 40, ease: 'ease-out' });
      await wait(120 * ctx.sp);
      const g2 = ghostOf(ctx, top, 0.85); g.remove();
      await fly(ctx, g2, top, { x: to.x, y: to.y - 20 }, 180, { rotate: 0, ease: 'ease-in' });
      crackAt(ctx, ctx.targetEls[0]);
      boom(ctx, to, '#ffd9a0', 150);
      shake(ctx);
      fade(ctx, g2, 250);
    },
  },
  hidden_mist: {
    desc: 'User shoots thick fog at the enemies.',
    async play(ctx) {
      const { fog, go } = mistOver(ctx, '#e3e8ee');
      fog.firstElementChild.style.filter = 'blur(6px)';
      await go;
      ctx.targetEls.forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0.35, offset: 0.3 }, { opacity: 0.35, offset: 0.8 }, { opacity: 1 }], { duration: 1200 * ctx.sp }));
      setTimeout(() => fade(ctx, fog, 600), 800 * ctx.sp);
      await wait(300 * ctx.sp);
    },
  },
  poison_needles: {
    desc: 'User throws a needle at the target that strikes with a purple hit.',
    async play(ctx) {
      const n = spawn(ctx, ART4.needle(), ctx.from, { life: 800 });
      await fly(ctx, n, ctx.from, ctx.tos[0], 240, { ease: 'linear' });
      n.remove();
      boom(ctx, ctx.tos[0], '#b44bff', 100);
      shake(ctx);
    },
  },
});

// ---------------------------------------------------------------- batch 5 (sheet rows 154–190)
export const SHARINGAN = (s = 30) => `<svg width="${s}" height="${s}" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#d0101a" stroke="#1a0000" stroke-width="2.5"/><circle cx="20" cy="20" r="10.5" fill="none" stroke="#5a0006" stroke-width="1.2"/><circle cx="20" cy="20" r="4" fill="#111"/>${[0, 120, 240].map((a) => `<g transform="rotate(${a} 20 20)"><circle cx="20" cy="9.5" r="3" fill="#111"/><path d="M20 6.5C24 6.5 25 10 23 12" stroke="#111" stroke-width="1.8" fill="none"/></g>`).join('')}</svg>`;
export const TSUKUYOMI_MOON = (s = 150) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100" style="filter:drop-shadow(0 0 30px #ff2a2a) drop-shadow(0 0 10px #ff5a5a)"><circle cx="50" cy="50" r="46" fill="#e0242c"/><circle cx="50" cy="50" r="46" fill="url(#tm-g)"/><defs><radialGradient id="tm-g"><stop offset="0" stop-color="#ff6a6a" stop-opacity=".5"/><stop offset="1" stop-color="#7a0008" stop-opacity=".6"/></radialGradient></defs>${[12, 22, 32].map((r) => `<circle cx="50" cy="50" r="${r}" fill="none" stroke="#3a0004" stroke-width="2"/>`).join('')}<circle cx="50" cy="50" r="6" fill="#120000"/>${[0, 40, 80, 120, 160, 200, 240, 280, 320].map((a, i) => `<g transform="rotate(${a} 50 50)"><circle cx="50" cy="${i % 3 === 0 ? 18 : i % 3 === 1 ? 28 : 38}" r="3" fill="#120000"/></g>`).join('')}</svg>`;
const ART5 = {
  shieldBlue: (w, h) => `<div style="width:${w}px;height:${h}px;border-radius:50%;background:radial-gradient(ellipse,#bfe6ff55,#4aa3ff66 55%,#4aa3ff00 72%);box-shadow:0 0 24px #4aa3ff, inset 0 0 22px #cfeeff;border:3px solid #9fd8ffcc"></div>`,
  waterShield: (w, h) => `<div style="width:${w}px;height:${h}px;border-radius:44% 44% 10px 10px;background:linear-gradient(#bfe8ffaa,#4ab0ffaa);box-shadow:inset 0 0 18px #e6f7ff,0 0 16px #4ab0ff;border:2px solid #e6f7ffcc;overflow:hidden;position:relative"><div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,#ffffff00 0 10px,#ffffff44 10px 12px);animation:ax-flicker .5s infinite"></div></div>`,
  tail: (len) => `<svg width="${len + 30}" height="30" viewBox="0 0 ${len + 30} 30" style="filter:drop-shadow(0 0 4px #000)"><path d="M0 15H${len}" stroke="#3b3a3f" stroke-width="10" stroke-dasharray="14 3"/><path d="M0 15H${len}" stroke="#6d6a74" stroke-width="4" stroke-dasharray="14 3"/><path d="M${len - 4} 6 ${len + 30} 15 ${len - 4} 24Z" fill="#c9ced6" stroke="#3b3a3f" stroke-width="2"/></svg>`,
  hookStaff: (len) => `<svg width="${len + 30}" height="40" viewBox="0 0 ${len + 30} 40"><rect x="0" y="17" width="${len}" height="6" rx="3" fill="#4e7a3a" stroke="#2a4a20"/><path d="M${len} 20C${len + 18} 20 ${len + 24} 10 ${len + 16} 4" stroke="#4e7a3a" stroke-width="5" fill="none" stroke-linecap="round"/><g transform="translate(${len + 4} 26)">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-5" rx="3.2" ry="5" fill="#ff8fbf" transform="rotate(${a})"/>`).join('')}<circle r="2.5" fill="#ffd04a"/></g></svg>`,
  spikeBall: (s = 120) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100">${Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return `<path d="M${50 + Math.cos(a - 0.15) * 38} ${50 + Math.sin(a - 0.15) * 38}L${50 + Math.cos(a) * 50} ${50 + Math.sin(a) * 50}L${50 + Math.cos(a + 0.15) * 38} ${50 + Math.sin(a + 0.15) * 38}Z" fill="#6b4226"/>`; }).join('')}<circle cx="50" cy="50" r="39" fill="#8b5a32" stroke="#4a2c16" stroke-width="3"/><path d="M24 40Q50 30 76 40M22 58Q50 50 78 60M34 76Q50 70 66 78" stroke="#5a3820" stroke-width="3" fill="none"/></svg>`,
  inkBird: (s = 80) => `<svg width="${s}" height="${s * 0.6}" viewBox="0 0 80 48" class="ax-flap"><path d="M40 26C30 10 14 4 2 10 14 14 22 20 30 28ZM40 26C50 10 66 4 78 10 66 14 58 20 50 28Z" fill="#fff" stroke="#000" stroke-width="3.5" stroke-linejoin="round"/><ellipse cx="40" cy="30" rx="12" ry="8" fill="#fff" stroke="#000" stroke-width="3.5"/><path d="M50 28l8 2-8 3" fill="#fff" stroke="#000" stroke-width="2.5"/></svg>`,
  inkSnake: (s = 60) => `<svg width="${s}" height="${s * 0.4}" viewBox="0 0 60 24"><path d="M2 12C10 2 18 22 28 12S44 2 50 10" stroke="#000" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M2 12C10 2 18 22 28 12S44 2 50 10" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="52" cy="11" rx="7" ry="5.5" fill="#fff" stroke="#000" stroke-width="3"/><circle cx="54" cy="9" r="1.3" fill="#000"/></svg>`,
  innerHead: (h = 200) => `<svg width="${h}" height="${h}" viewBox="0 0 100 100"><path d="M14 58C10 28 30 8 50 8S90 28 86 58L94 92 76 74 70 96 60 78 50 98 40 78 30 96 24 74 6 92Z" fill="#14101a" opacity=".78"/><path d="M28 46 42 52M72 46 58 52" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M30 54Q36 58 42 55M70 54Q64 58 58 55" stroke="#fff" stroke-width="2.5" fill="none"/><path d="M36 70Q50 82 64 70Q50 76 36 70Z" fill="#fff"/><path d="M46 22 50 16 54 22 50 28Z" fill="#fff"/><text x="80" y="20" font-family="sans-serif" font-weight="900" font-size="14" fill="#fff">CHA!</text></svg>`,
  ironBlock: (w, h) => `<div style="width:${w}px;height:${h}px;border-radius:8px;background:repeating-linear-gradient(45deg,#16161a 0 6px,#26262c 6px 8px);box-shadow:0 0 18px #000, inset 0 0 12px #5a3a7a"></div>`,
};
const swirl = (s) => `<div class="ax-spin" style="width:${s}px;height:${s}px;border-radius:50%;animation-duration:.6s;background:repeating-conic-gradient(from 0deg,#2a1d3a 0 15deg,#0b0710 15deg 30deg);-webkit-mask:radial-gradient(circle,#000 0 15%,#000a 40%,#0000 70%);mask:radial-gradient(circle,#000 0 15%,#000a 40%,#0000 70%);box-shadow:0 0 20px #5a3a7a"></div>`;

function snakeStrike(ctx, n, color = '#8a6a44') {
  return Promise.all(ctx.tos.map((t, i) => wait(i * 80 * ctx.sp).then(async () => {
    const parts = [];
    for (let k = 0; k < n; k++) {
      const off = (k - (n - 1) / 2) * 16;
      const a = { x: ctx.from.x, y: ctx.from.y + off };
      const end = between(a, t, 0.84);
      const body = await stretch(ctx, a, end, (len) => ART3.scales(len).replaceAll('#e8e6dc', color).replaceAll('#c8c4b2', '#5a4228'), 220, 1600);
      const head = spawn(ctx, ART3.snake(60).replaceAll('#e8e6dc', color).replaceAll('#dcd8c8', '#7a5a38'), end, { life: 1400 });
      head.style.transform = `translate(-20%,-50%) rotate(${ang(a, t)}deg)`; head.style.transformOrigin = '20% 50%';
      parts.push(body, head);
    }
    boom(ctx, t, '#b44bff', 100);
    shakeEl(ctx.targetEls[i]);
    setTimeout(() => parts.forEach((p) => fade(ctx, p, 300)), 350 * ctx.sp);
  })));
}
function shieldFront(ctx, html, life = 1600) {
  const { h } = sizeOf(ctx.userEl);
  const n = spawn(ctx, html, { x: ctx.from.x + (ctx.isFoe ? -48 : 48), y: ctx.from.y }, { life });
  return pop(ctx, n, 300).then(() => wait(650 * ctx.sp)).then(() => fade(ctx, n, 350)).then(() => h);
}
function bugCloud(ctx, at, n = 50, spread = 50) {
  return Array.from({ length: n }, () => spawn(ctx, `<div style="width:${rnd(3, 5)}px;height:${rnd(3, 4)}px;border-radius:50%;background:#0b0b0b"></div>`, { x: at.x + rnd(-spread, spread), y: at.y + rnd(-spread, spread) }, { life: 3000 }));
}
async function swarm(ctx, to, shape) {
  const bugs = bugCloud(ctx, ctx.from, 60, 30);
  const { h } = sizeOf(ctx.targetEls[0]);
  await Promise.all(bugs.map((b, i) => {
    const st = { x: parseFloat(b.style.left), y: parseFloat(b.style.top) };
    return wait(i * 6 * ctx.sp).then(() => fly(ctx, b, st, { x: to.x + rnd(-30, 30), y: to.y + rnd(-40, 40) }, 380, { rotate: 0, arc: rnd(-40, 40), ease: 'ease-in-out' }));
  }));
  // reshape around the target
  bugs.forEach((b, i) => {
    const st = { x: parseFloat(b.style.left), y: parseFloat(b.style.top) };
    const t = (i / bugs.length) * Math.PI * 2;
    const frames = [];
    for (let k = 0; k <= 12; k++) {
      let x; let y;
      if (shape === 'ball') { const r = h * 0.45; x = to.x + Math.cos(t + k * 0.5) * r * rnd(0.85, 1); y = to.y + Math.sin(t + k * 0.5) * r * rnd(0.85, 1); }
      else if (shape === 'tornado') { const yy = (i / bugs.length) * h - h * 0.5; const r = 20 + (yy + h * 0.5) * 0.35; x = to.x + Math.cos(t * 3 + k * 0.9) * r; y = to.y + yy; }
      else { x = to.x + Math.cos(t + k * 0.6) * h * 0.35 * Math.sin(t * 2); y = to.y + Math.sin(t + k * 0.6) * h * 0.4; }
      frames.push({ transform: `translate(calc(-50% + ${x - st.x}px), calc(-50% + ${y - st.y}px))` });
    }
    b.animate(frames, { duration: 900 * ctx.sp, easing: 'linear', fill: 'forwards' });
  });
  return bugs;
}
async function warpOut(ctx, el, at) {
  const { h } = sizeOf(el);
  const s = spawn(ctx, swirl(h * 0.9), at, { life: 4500 });
  await pop(ctx, s, 250);
  await el.animate([{ transform: 'scale(1) rotate(0deg)', opacity: 1 }, { transform: 'scale(.05) rotate(540deg)', opacity: 0 }], { duration: 520 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
  return s;
}
/** Grow a unit back out of a Kamui swirl (the reverse of warpOut), then close the swirl. */
async function warpIn(ctx, el, swirlNode) {
  el.getAnimations().forEach((a) => a.cancel());
  await el.animate([{ transform: 'scale(.05) rotate(-540deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1 }], { duration: 480 * ctx.sp, easing: 'ease-out' }).finished.catch(() => {});
  if (swirlNode) fade(ctx, swirlNode, 250);
}
/** The user's double at the far end spins back into its swirl, then the user reappears out of the swirl at home. */
async function warpHome(ctx, ghost, farSwirl, homeSwirl) {
  const img = ghost.firstElementChild;
  await img.animate([{ transform: `${img.style.transform || ''} scale(1) rotate(0deg)`, opacity: 1 }, { transform: `${img.style.transform || ''} scale(.05) rotate(540deg)`, opacity: 0 }], { duration: 420 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
  ghost.remove(); fade(ctx, farSwirl, 250);
  await warpIn(ctx, ctx.userEl, homeSwirl);
}
const restore = (ctx, el, ms = 300) => { el.getAnimations().forEach((a) => a.cancel()); el.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: ms * ctx.sp }); };

Object.assign(ANIMS, {
  hidden_snake_hands: { desc: 'Three brownish snakes shoot from the user and strike each enemy; the bite glows purple.', async play(ctx) { lunge(ctx, ctx.tos[0], 0.25, 600); await wait(150 * ctx.sp); await snakeStrike(ctx, 3); } },
  hiramekarei_guard: { desc: 'User creates a blue chakra shield in front of themself.', play: (ctx) => { const { h } = sizeOf(ctx.userEl); return shieldFront(ctx, ART5.shieldBlue(h * 0.42, h * 0.9)); } },
  hiramekarei_slash: {
    desc: 'User flies to the target and slashes them in an X with blue chakra blades.',
    async play(ctx) {
      const to = ctx.tos[0]; const g = ghostOf(ctx, ctx.from, 0.5);
      fly(ctx, g, ctx.from, between(ctx.from, to, 0.82), 240, { rotate: 0 }).then(() => fade(ctx, g, 200));
      lunge(ctx, to, 0.68, 520); await wait(240 * ctx.sp);
      slashArc(ctx, to, { rot: 0, size: 130 }); await wait(130 * ctx.sp); slashArc(ctx, to, { rot: 90, size: 130 }); shake(ctx);
    },
  },
  hiramekarei_unleashed: {
    desc: 'User flies to the target and slashes them with a large blue chakra blade.',
    async play(ctx) {
      const to = ctx.tos[0]; const g = ghostOf(ctx, ctx.from, 0.5);
      fly(ctx, g, ctx.from, between(ctx.from, to, 0.8), 260, { rotate: 0 }).then(() => fade(ctx, g, 200));
      lunge(ctx, to, 0.66, 560); await wait(260 * ctx.sp);
      slashArc(ctx, to, { rot: 35, size: 240, ms: 420, color: '#cfeeff', glow: '#1f8fff' }); boom(ctx, to, '#6cc4ff', 120); shake(ctx);
    },
  },
  hiruko_tail: {
    desc: 'A sharp mechanical tail shoots from the user and jabs the target with a purple glow.',
    async play(ctx) {
      const to = ctx.tos[0]; const end = between(ctx.from, to, 0.9);
      const n = await stretch(ctx, { x: ctx.from.x, y: ctx.from.y + 20 }, end, ART5.tail, 260, 1500);
      boom(ctx, to, '#b44bff', 100); shake(ctx);
      setTimeout(() => fade(ctx, n, 300), 350 * ctx.sp); await wait(200 * ctx.sp);
    },
  },
  hook_staff: {
    desc: 'User flies to the target and strikes them with their hook staff.',
    async play(ctx) {
      const to = ctx.tos[0];
      lunge(ctx, to, 0.55, 640); await wait(160 * ctx.sp);
      const pivot = between(ctx.from, to, 0.35); const a = ang(pivot, to); const sw = ctx.isFoe ? 75 : -75;
      const s = spawn(ctx, ART5.hookStaff(Math.max(80, Math.hypot(to.x - pivot.x, to.y - pivot.y) - 20)), pivot, { life: 1300 });
      s.style.transformOrigin = '0 50%';
      await s.animate([{ transform: `translate(0,-50%) rotate(${a + sw}deg)` }, { transform: `translate(0,-50%) rotate(${a}deg)` }], { duration: 260 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      boom(ctx, to, '#ffffff', 100); scatter(ctx, to, ART2.petal(), 6, 60, 600); shake(ctx); fade(ctx, s, 250);
    },
  },
  human_boulder: {
    desc: 'User turns into a spiky brown ball and rolls into the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const { h } = sizeOf(ctx.userEl);
      ctx.userEl.animate([{ opacity: 1 }, { opacity: 0, offset: 0.12 }, { opacity: 0, offset: 0.88 }, { opacity: 1 }], { duration: 1400 * ctx.sp });
      puff(ctx, ctx.from, '#ffffff', 100);
      const b = spawn(ctx, `<div class="ax-spin" style="animation-duration:.3s">${ART5.spikeBall(h * 0.6)}</div>`, ctx.from, { life: 1800 });
      await grow(ctx, b, 250, 'scale(.2)', 'scale(1)');
      await fly(ctx, b, ctx.from, to, 380, { rotate: 0, ease: 'ease-in' });
      boom(ctx, to, '#d9b38a', 150); shake(ctx);
      await fly(ctx, b, to, ctx.from, 400, { rotate: 0, ease: 'ease-out' });
      b.remove(); puff(ctx, ctx.from, '#ffffff', 90);
    },
  },
  healing_transfer: { desc: 'User moves over to the ally and applies a green healing aura to them.', play: (ctx) => ANIMS.antidote.play(ctx) },
  hydrification: { desc: 'A water shield grows in front of the user.', async play(ctx) { const { h } = sizeOf(ctx.userEl); const f = feetOf(ctx, ctx.userEl); const n = spawn(ctx, ART5.waterShield(Math.max(70, h * 0.4), h * 0.88), { x: f.x + (ctx.isFoe ? -40 : 40), y: f.y + 4 }, { life: 1800 }); await rise(ctx, n, 420); await wait(650 * ctx.sp); fade(ctx, n, 350); } },
  iai_draw: { desc: "The user's afterimage flies at the target at high speed and slashes them with a chakra blade.", play: (ctx) => iaiSlash(ctx, 140) },
  iai_flash: { desc: "The user's afterimage flies at the target at high speed and slashes them with a chakra blade.", play: (ctx) => iaiSlash(ctx, 190) },
  ice_prison: {
    desc: 'An ice pool forms below the target and ice needles spring up and bind them.',
    async play(ctx) {
      const el = ctx.targetEls[0]; const f = feetOf(ctx, el); const { h } = sizeOf(el);
      const pool = spawn(ctx, '<div style="width:160px;height:36px;border-radius:50%;background:radial-gradient(ellipse,#e6f7ffee,#9fd8ffcc 55%,#9fd8ff00 72%);box-shadow:0 0 14px #9fd8ff"></div>', f, { life: 2200, z: 1 });
      await pop(ctx, pool, 300);
      const sp = [];
      for (let i = 0; i < 12; i++) {
        const x = f.x + rnd(-62, 62);
        const n = spawn(ctx, `<svg width="12" height="${h * rnd(0.4, 0.8)}" viewBox="0 0 12 100" preserveAspectRatio="none"><path d="M6 0 12 100H0Z" fill="#d6f2ffdd" stroke="#ffffff" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`, { x, y: f.y + rnd(-6, 8) }, { life: 2000 });
        n.style.transform = 'translate(-50%,-100%) scaleY(0)'; sp.push(n); rise(ctx, n, 200, rnd(0, 150));
      }
      await wait(380 * ctx.sp);
      wrapRing(ctx, el, 'border:3px solid #e6f7ff;box-shadow:0 0 12px #9fd8ff', 600);
      shake(ctx);
      setTimeout(() => { sp.forEach((n) => fade(ctx, n, 300)); fade(ctx, pool, 300); }, 700 * ctx.sp);
    },
  },
  infinite_tsukuyomi: {
    desc: 'A red moon with a Sharingan rises and the sky turns red; a Sharingan marks every enemy caught. The moon and red sky stay for as long as the genjutsu lasts.',
    async play(ctx) {
      const A = ctx.arena.getBoundingClientRect();
      const sky = spawn(ctx, `<div style="width:${A.width}px;height:${A.height * 0.55}px;background:linear-gradient(#5a0008e0,#a0101ab0 60%,#a0101a00)"></div>`, { x: A.width / 2, y: A.height * 0.275 }, { life: 2600, z: 1 });
      sky.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600 * ctx.sp, fill: 'forwards' });
      const moon = spawn(ctx, TSUKUYOMI_MOON(Math.min(160, A.height * 0.32)), { x: A.width * 0.5, y: A.height * 0.16 }, { life: 2600, z: 1 });
      await moon.animate([{ transform: 'translate(-50%,-50%) translateY(60px) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-50%) translateY(0) scale(1)', opacity: 1 }], { duration: 800 * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      ctx.targetEls.forEach((el) => {
        const at = FX.centerOf(el, ctx.arena); const { h } = sizeOf(el);
        const e = spawn(ctx, SHARINGAN(34), { x: at.x, y: at.y - h * 0.32 }, { life: 1600 });
        e.animate([{ transform: 'translate(-50%,-50%) scale(0) rotate(-180deg)' }, { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)' }], { duration: 350 * ctx.sp, fill: 'forwards' });
        FX.ring(ctx.arena, el, 'gen');
        setTimeout(() => fade(ctx, e, 300), 1100 * ctx.sp);
      });
      shake(ctx);
      setTimeout(() => { fade(ctx, sky, 500); fade(ctx, moon, 500); }, 1500 * ctx.sp);
      await wait(500 * ctx.sp);
    },
  },
  ink_bird_recon: {
    desc: 'User sends out a white, thick-outlined ink bird that flies up above them.',
    async play(ctx) {
      const { h } = sizeOf(ctx.userEl);
      const b = spawn(ctx, ART5.inkBird(80), ctx.from, { life: 2200 });
      await fly(ctx, b, ctx.from, { x: ctx.from.x + (ctx.isFoe ? -40 : 40), y: ctx.from.y - h * 0.75 }, 600, { rotate: 0, arc: 30, ease: 'ease-out' });
      await wait(500 * ctx.sp); fade(ctx, b, 300);
    },
  },
  ink_clone: {
    desc: 'When the user is struck, they dissolve into a puddle of black ink.',
    async play(ctx) { FX.ring(ctx.arena, ctx.userEl, 'aura'); await wait(400 * ctx.sp); },
    decoy(ctx, el) {
      const f = feetOf(ctx, el);
      el.animate([{ transform: 'scaleY(1)', filter: 'none', opacity: 1, transformOrigin: '50% 100%' }, { transform: 'scaleY(.05)', filter: 'brightness(0)', opacity: 1, offset: 0.3, transformOrigin: '50% 100%' }, { transform: 'scaleY(.05)', opacity: 0, offset: 0.8, transformOrigin: '50% 100%' }, { transform: 'scaleY(1)', opacity: 1, transformOrigin: '50% 100%' }], { duration: 1500 * ctx.sp });
      const p = spawn(ctx, '<div style="width:140px;height:30px;border-radius:50%;background:radial-gradient(ellipse,#000,#000e 55%,#0000 72%)"></div>', f, { life: 1600, z: 1 });
      p.animate([{ transform: 'translate(-50%,-50%) scale(.2)' }, { transform: 'translate(-50%,-50%) scale(1)', offset: 0.3 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], { duration: 1500 * ctx.sp, fill: 'forwards' });
    },
  },
  ink_creation: {
    desc: 'User sprays black ink at the target, which then pools at their feet.',
    async play(ctx) {
      const el = ctx.targetEls[0]; const f = feetOf(ctx, el); const to = ctx.tos[0];
      await Promise.all(Array.from({ length: 10 }, (_, k) => wait(k * 30 * ctx.sp).then(async () => {
        const d = spawn(ctx, `<div style="width:${rnd(10, 18)}px;height:${rnd(10, 18)}px;border-radius:50%;background:#050505"></div>`, ctx.from, { life: 1200 });
        await fly(ctx, d, ctx.from, { x: to.x + rnd(-24, 24), y: to.y + rnd(-50, 30) }, 360, { rotate: 0, arc: 40 }); d.remove();
      })));
      el.animate([{ filter: 'none' }, { filter: 'brightness(.35)' }, { filter: 'none' }], { duration: 900 * ctx.sp });
      const p = spawn(ctx, '<div style="width:140px;height:32px;border-radius:50%;background:radial-gradient(ellipse,#000,#000e 55%,#0000 72%)"></div>', f, { life: 1800, z: 1 });
      await pop(ctx, p, 300); shake(ctx); setTimeout(() => fade(ctx, p, 400), 700 * ctx.sp);
    },
  },
  ink_snakes: {
    desc: 'User sends a small, thick-outlined ink snake at the target that binds them.',
    async play(ctx) {
      const s = spawn(ctx, ART5.inkSnake(64), ctx.from, { life: 1200 });
      await fly(ctx, s, ctx.from, ctx.tos[0], 420, { ease: 'ease-in-out' }); s.remove();
      wrapRing(ctx, ctx.targetEls[0], 'border:7px solid #fff;box-shadow:0 0 0 3px #000, inset 0 0 0 3px #000', 700);
      shake(ctx); await wait(300 * ctx.sp);
    },
  },
  inner_sakura: {
    desc: "A large shadow of Inner Sakura's head appears behind the user.",
    async play(ctx) {
      const { h } = sizeOf(ctx.userEl);
      const n = spawn(ctx, ART5.innerHead(h * 0.95), { x: ctx.from.x, y: ctx.from.y - h * 0.25 }, { life: 1900, z: 1 });
      await grow(ctx, n, 350, 'scale(.5)', 'scale(1)');
      n.animate([{ translate: '0 0' }, { translate: '-3px 2px' }, { translate: '3px -2px' }, { translate: '0 0' }], { duration: 160 * ctx.sp, iterations: 4 });
      await wait(800 * ctx.sp); await fade(ctx, n, 300);
    },
  },
  insect_clone: {
    desc: 'When the user is struck, they dissolve into a cloud of small black insects.',
    async play(ctx) { FX.ring(ctx.arena, ctx.userEl, 'aura'); await wait(400 * ctx.sp); },
    decoy(ctx, el) {
      const at = FX.centerOf(el, ctx.arena); const { h } = sizeOf(el);
      el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.1 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1400 * ctx.sp });
      for (let i = 0; i < 70; i++) {
        const st = { x: at.x + rnd(-h * 0.2, h * 0.2), y: at.y + rnd(-h * 0.45, h * 0.45) };
        const b = spawn(ctx, `<div style="width:${rnd(3, 5)}px;height:${rnd(3, 4)}px;border-radius:50%;background:#0b0b0b"></div>`, st, { life: 1400 });
        const t = rnd(0, Math.PI * 2);
        fly(ctx, b, st, { x: st.x + Math.cos(t) * rnd(60, 160), y: st.y + Math.sin(t) * rnd(40, 120) }, rnd(700, 1100), { rotate: 0, ease: 'ease-out' }).then(() => b.remove());
      }
    },
  },
  insect_jar: { desc: 'User sends a cloud of small black insects at the target that binds them.', async play(ctx) { const bugs = await swarm(ctx, ctx.tos[0], 'bind'); shake(ctx); wrapRing(ctx, ctx.targetEls[0], 'border:4px dotted #0b0b0b', 700); await wait(500 * ctx.sp); bugs.forEach((b) => fade(ctx, b, 300)); } },
  insect_sphere: { desc: 'User sends a cloud of small black insects at the target that forms a ball around them.', async play(ctx) { const bugs = await swarm(ctx, ctx.tos[0], 'ball'); shake(ctx); await wait(800 * ctx.sp); bugs.forEach((b) => fade(ctx, b, 300)); } },
  insect_tornado: {
    desc: 'User sends clouds of small black insects that whirl into a tornado around each enemy.',
    async play(ctx) {
      const all = await Promise.all(ctx.targetEls.map((el, i) => wait(i * 100 * ctx.sp).then(() => swarm(ctx, ctx.tos[i], 'tornado').then((b) => { shakeEl(el); return b; }))));
      await wait(700 * ctx.sp); all.flat().forEach((b) => fade(ctx, b, 300));
    },
  },
  insect_wall: {
    desc: 'User raises a wall of small black insects in front of them.',
    async play(ctx) {
      const { h } = sizeOf(ctx.userEl); const f = feetOf(ctx, ctx.userEl);
      const x0 = f.x + (ctx.isFoe ? -48 : 48);
      const bugs = [];
      for (let i = 0; i < 160; i++) {
        const st = { x: ctx.from.x + rnd(-10, 10), y: ctx.from.y + rnd(-10, 10) };
        const b = spawn(ctx, `<div style="width:${rnd(3, 5)}px;height:${rnd(3, 4)}px;border-radius:50%;background:#0b0b0b"></div>`, st, { life: 2200 });
        bugs.push(b);
        fly(ctx, b, st, { x: x0 + rnd(-h * 0.14, h * 0.14), y: f.y - rnd(0, h * 0.9) }, rnd(250, 450), { rotate: 0, ease: 'ease-out' });
      }
      await wait(1200 * ctx.sp); bugs.forEach((b) => fade(ctx, b, 300));
    },
  },
  mu_invisibility: {
    desc: 'The user turns transparent.',
    async play(ctx) { await ctx.userEl.animate([{ opacity: 1, filter: 'none' }, { opacity: 0.12, filter: 'blur(1px)', offset: 0.3 }, { opacity: 0.12, filter: 'blur(1px)', offset: 0.85 }, { opacity: 1, filter: 'none' }], { duration: 1600 * ctx.sp }).finished.catch(() => {}); },
  },
  iron_sand_drizzle: {
    desc: 'A solid block of black iron sand forms above the enemies, then fires chaotic spikes that strike them all with a purple glow.',
    async play(ctx) {
      const box = sideBox(ctx); const at = { x: box.c.x, y: Math.max(40, box.y1 - 20) };
      const b = spawn(ctx, ART5.ironBlock(box.w * 0.7, 46), at, { life: 2200 });
      await grow(ctx, b, 400, 'scale(.2)', 'scale(1)');
      for (let i = 0; i < 26; i++) {
        const t = ctx.tos[i % ctx.tos.length]; const st = { x: at.x + rnd(-box.w * 0.3, box.w * 0.3), y: at.y + 14 };
        const s = spawn(ctx, ART.spike(rnd(34, 54), '#16161a'), st, { life: 800 });
        fly(ctx, s, st, { x: t.x + rnd(-30, 30), y: t.y + rnd(-40, 40) }, 200, { ease: 'ease-in' }).then(() => s.remove());
        await wait(18 * ctx.sp);
      }
      await wait(180 * ctx.sp);
      ctx.tos.forEach((t) => boom(ctx, t, '#b44bff', 100)); shake(ctx); fade(ctx, b, 300);
    },
  },
  iron_sand_world_order: {
    desc: 'Chaotic black iron-sand spikes shoot out, strike every enemy and bind them.',
    async play(ctx) {
      for (let i = 0; i < 30; i++) {
        const t = ctx.tos[i % ctx.tos.length]; const st = { x: ctx.from.x + rnd(-30, 30), y: ctx.from.y + rnd(-50, 30) };
        const s = spawn(ctx, ART.spike(rnd(40, 70), '#16161a'), st, { life: 900 });
        fly(ctx, s, st, { x: t.x + rnd(-36, 36), y: t.y + rnd(-50, 40) }, 260, { ease: 'ease-in' }).then(() => s.remove());
        await wait(16 * ctx.sp);
      }
      await wait(250 * ctx.sp);
      ctx.targetEls.forEach((el) => wrapRing(ctx, el, 'border:6px dashed #16161a;box-shadow:0 0 10px #5a3a7a', 700));
      shake(ctx); await wait(300 * ctx.sp);
    },
  },
  isobu_bomb: { desc: 'A black orb with a purple aura and tiny blue and red sparks grows in front of the user, then fires at the enemies.', play: (ctx) => ANIMS.chomei_bomb.play(ctx) },
  jashin_spike: {
    desc: 'User flies in with a black spike and stabs the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const g = ghostOf(ctx, ctx.from, 0.5);
      fly(ctx, g, ctx.from, between(ctx.from, to, 0.8), 240, { rotate: 0 }).then(() => fade(ctx, g, 200));
      const hit = lunge(ctx, to, 0.66, 520);
      const s = spawn(ctx, ART.spike(80, '#0d0d0d'), ctx.from, { life: 1000 });
      await fly(ctx, s, ctx.from, between(hit, to, 0.7), 250, { ease: 'ease-in' });
      boom(ctx, to, '#8a1020', 90); shake(ctx); fade(ctx, s, 200);
    },
  },
  jet_punch: {
    desc: "Blue flame jet boosters appear on the user and blast them at the target for a high-speed punch.",
    async play(ctx) {
      const to = ctx.tos[0]; const back = ctx.isFoe ? 1 : -1;
      const jets = [-14, 14].map((dy) => { const n = spawn(ctx, `<div style="transform:rotate(${back > 0 ? 90 : -90}deg)">${ART.flame(30, '#2f7bff', '#bfe0ff')}</div>`, { x: ctx.from.x + back * 30, y: ctx.from.y + dy }, { life: 1200 }); pop(ctx, n, 150); return n; });
      await wait(250 * ctx.sp);
      const k = 0.72; lunge(ctx, to, k, 420);
      jets.forEach((j, i) => fly(ctx, j, { x: ctx.from.x + back * 30, y: ctx.from.y + (i ? 14 : -14) }, { x: ctx.from.x + (to.x - ctx.from.x) * k * 0.9 + back * 30, y: ctx.from.y + (to.y - ctx.from.y) * k * 0.9 }, 190, { rotate: 0 }));
      await wait(190 * ctx.sp);
      boom(ctx, to, '#ffffff', 120); shake(ctx); jets.forEach((j) => fade(ctx, j, 200));
    },
  },
  kamui: { desc: 'Space warps where the target stands, shrinking them into oblivion.', async play(ctx) { const el = ctx.targetEls[0]; const s = await warpOut(ctx, el, ctx.tos[0]); shake(ctx); await wait(250 * ctx.sp); await warpIn(ctx, el, s); } },
  kamui_absorb: { desc: 'Space warps where the target stands, shrinking them.', async play(ctx) { const el = ctx.targetEls[0]; const s = await warpOut(ctx, el, ctx.tos[0]); shake(ctx); await wait(250 * ctx.sp); await warpIn(ctx, el, s); } },
  kamui_raikiri: {
    desc: 'User charges blue crackling electricity, warps away, reappears in front of the target and strikes with it.',
    async play(ctx) {
      const to = ctx.tos[0]; const u = ctx.userEl; const near = between(ctx.from, to, 0.75);
      const sb = sparkBall(ctx, { x: ctx.from.x + (ctx.isFoe ? -22 : 22), y: ctx.from.y + 10 }, 44, 900);
      await pop(ctx, sb, 250); fade(ctx, sb, 200);
      const s1 = await warpOut(ctx, u, ctx.from);
      const s2 = spawn(ctx, swirl(ctx.userSize.h * 0.8), near, { life: 4000 }); await pop(ctx, s2, 200);
      const g = ghostOf(ctx, near, 0.9);
      const handAt = { x: near.x + (ctx.isFoe ? -22 : 22), y: near.y + 10 };
      const b = sparkBall(ctx, handAt, 46, 1400); await pop(ctx, b, 160);
      await wait(300 * ctx.sp);
      const hit = between(near, to, 0.55);
      await Promise.all([fly(ctx, g, near, hit, 200, { rotate: 0, ease: 'ease-in' }), fly(ctx, b, handAt, between(handAt, to, 0.85), 200, { rotate: 0, ease: 'ease-in' })]);
      boom(ctx, to, '#9fd8ff', 140); for (let i = 0; i < 4; i++) bolt(ctx, to, { x: to.x + rnd(-70, 70), y: to.y + rnd(-70, 70) }, { ms: 220 });
      shake(ctx); fade(ctx, b, 150);
      await wait(250 * ctx.sp); void u; await warpHome(ctx, g, s2, s1);
    },
  },
  kamui_warp_strike: {
    desc: 'User warps away and reappears behind the target to strike them.',
    async play(ctx) {
      const to = ctx.tos[0]; const u = ctx.userEl;
      const behind = { x: to.x + (to.x - ctx.from.x) * 0.18, y: to.y - 10 };
      const s1 = await warpOut(ctx, u, ctx.from);
      const s2 = spawn(ctx, swirl(ctx.userSize.h * 0.8), behind, { life: 4000 }); await pop(ctx, s2, 200);
      const g = ghostOf(ctx, behind, 0.9); if (!ctx.isFoe) g.firstElementChild.style.transform = 'none';
      await wait(120 * ctx.sp);
      boom(ctx, to, '#ffffff', 110); shake(ctx);
      await wait(250 * ctx.sp); void u; await warpHome(ctx, g, s2, s1);
    },
  },
  kamui_phase: {
    desc: 'Space warps in front of the user.',
    async play(ctx) { const { h } = sizeOf(ctx.userEl); const s = spawn(ctx, swirl(h * 0.7), { x: ctx.from.x + (ctx.isFoe ? -40 : 40), y: ctx.from.y }, { life: 1600 }); await pop(ctx, s, 250); ctx.userEl.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 900 * ctx.sp }); await wait(700 * ctx.sp); fade(ctx, s, 300); },
  },
  karin_punch: {
    desc: 'User flies in and punches the target.',
    async play(ctx) { const to = ctx.tos[0]; const g = ghostOf(ctx, ctx.from, 0.5); fly(ctx, g, ctx.from, between(ctx.from, to, 0.82), 240, { rotate: 0 }).then(() => fade(ctx, g, 200)); lunge(ctx, to, 0.7, 480); await wait(230 * ctx.sp); boom(ctx, to, '#ffffff', 110); shake(ctx); },
  },
  kazekage_shield: {
    desc: 'User raises a sand shield in front of every ally.',
    async play(ctx) {
      const ws = ctx.targetEls.map((el) => {
        const { w, h } = sizeOf(el); const f = feetOf(ctx, el);
        const n = spawn(ctx, `<div style="width:${Math.max(60, w * 0.6)}px;height:${h * 0.8}px;border-radius:40% 40% 6px 6px;background:radial-gradient(circle at 30% 30%,#ead7a6,#c9a86b 60%,#a8864e);box-shadow:inset 0 -10px 18px #8a6a3a, 0 0 14px #d9b56a88;opacity:.92"></div>`, { x: f.x + (ctx.isFoe ? -24 : 24), y: f.y + 4 }, { life: 1900, z: 7 });
        rise(ctx, n, 420); return n;
      });
      await wait(1100 * ctx.sp); ws.forEach((n) => fade(ctx, n, 350));
    },
  },
  kirin: {
    desc: 'User raises crackling blue electricity overhead, then a massive lightning strike crashes down on the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const { h } = sizeOf(ctx.userEl);
      const top = { x: ctx.from.x, y: ctx.from.y - h * 0.58 };
      const s = sparkBall(ctx, top, 60, 1400); await pop(ctx, s, 300);
      await wait(400 * ctx.sp);
      const sky = { x: to.x + rnd(-20, 20), y: -20 };
      const A = ctx.arena.getBoundingClientRect();
      const fl = spawn(ctx, `<div style="width:${A.width}px;height:${A.height}px;background:#e6f4ff"></div>`, { x: A.width / 2, y: A.height / 2 }, { life: 600, z: 9 });
      fl.animate([{ opacity: 0.8 }, { opacity: 0 }], { duration: 400 * ctx.sp, fill: 'forwards' });
      for (let i = 0; i < 3; i++) setTimeout(() => bolt(ctx, sky, { x: to.x + rnd(-8, 8), y: to.y + 20 }, { ms: 380, width: 10 - i * 3, color: '#cfeeff', glow: '#4aa3ff' }), i * 50 * ctx.sp);
      boom(ctx, to, '#9fd8ff', 220); crackAt(ctx, ctx.targetEls[0]);
      shake(ctx); fade(ctx, s, 200); await wait(250 * ctx.sp);
    },
  },
});
async function iaiSlash(ctx, size) {
  const to = ctx.tos[0];
  for (let i = 0; i < 3; i++) { const g = ghostOf(ctx, ctx.from, 0.45 - i * 0.1); fly(ctx, g, ctx.from, between(ctx.from, to, 0.85), 140 + i * 30, { rotate: 0, ease: 'ease-in' }).then(() => fade(ctx, g, 200)); }
  await wait(150 * ctx.sp);
  slashArc(ctx, to, { rot: 15, size, ms: 300, color: '#cfeeff', glow: '#4aa3ff' });
  boom(ctx, to, '#cfeeff', 70); shake(ctx);
}

// ---------------------------------------------------------------- batch 6 (sheet rows 191–229) + smoke / log substitution
const ART6 = {
  leaf: () => '<svg width="16" height="10" viewBox="0 0 16 10"><path d="M0 5C4 0 12 0 16 5 12 10 4 10 0 5Z" fill="#5fb84a" stroke="#2f6a24" stroke-width=".8"/><path d="M1 5H15" stroke="#2f6a24" stroke-width=".6"/></svg>',
  hound: (s = 110) => `<svg width="${s}" height="${s * 0.55}" viewBox="0 0 110 60" style="filter:drop-shadow(0 0 10px #4aa3ff)"><path d="M6 34 22 28 30 30 42 22 66 22 80 14 90 4 94 14 108 18 98 26 104 30 90 32 84 40 92 52 82 52 74 42 52 42 46 52 38 52 40 40 26 44 14 44Z" fill="#cfeeff" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/><circle cx="96" cy="18" r="2" fill="#1f5fd6"/></svg>`,
  lavaStar: (s = 34) => `<svg width="${s}" height="${s}" viewBox="-10 -10 20 20" class="ax-spin" style="filter:drop-shadow(0 0 6px #ff6a1a)"><path d="M0-10 2-2 10 0 2 2 0 10-2 2-10 0-2-2Z" fill="#ff7a1a" stroke="#ffd04a" stroke-width=".8"/><circle r="2.5" fill="#ffe9a0"/></svg>`,
  lavaFist: (s = 64) => `<svg width="${s}" height="${s}" viewBox="0 0 64 64" style="filter:drop-shadow(0 0 10px #ff6a1a)"><path d="M6 20 18 6 40 4 58 16 60 40 48 58 22 60 6 46Z" fill="#ff7a1a" stroke="#7a2a0a" stroke-width="3"/><path d="M22 18V32M34 14V30M46 18V32M14 34 28 40 46 40" stroke="#ffd04a" stroke-width="3" stroke-linecap="round"/></svg>`,
};
const lavaBlob = (s) => `<div style="width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffe9a0,#ff7a1a 45%,#b8300a);box-shadow:0 0 10px #ff6a1a"></div>`;

/** A dense white smoke cloud (ninja 'poof'). */
function smokeCloud(ctx, at, r) {
  for (let i = 0; i < 9; i++) {
    const t = (i / 9) * Math.PI * 2; const d = i === 0 ? 0 : r * rnd(0.35, 0.6);
    const p = { x: at.x + Math.cos(t) * d, y: at.y + Math.sin(t) * d * 1.2 };
    const s = r * rnd(0.8, 1.1);
    const n = spawn(ctx, `<div style="width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle at 40% 40%,#ffffff 0%,#f1f1f1 50%,#e2e2e2f0 62%,#e2e2e200 72%)"></div>`, p, { life: 1100 });
    n.style.zIndex = '8';
    n.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.3 }, { transform: `translate(calc(-50% + ${(p.x - at.x) * 0.3}px), calc(-50% + ${(p.y - at.y) * 0.3 - 14}px)) scale(1.15)`, opacity: 0 }], { duration: 850 * ctx.sp, easing: 'ease-out', fill: 'forwards' });
  }
}
/** White smoke poof over a unit (generic clone / substitution vanish). */
export function poof(arena, el, { sp = 1 } = {}) {
  if (!el) return;
  const ctx = { arena, sp };
  const at = FX.centerOf(el, arena); const { h } = sizeOf(el);
  smokeCloud(ctx, at, h * 0.5);
  el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.12 }, { opacity: 0, offset: 0.8 }, { opacity: 1 }], { duration: 1200 * sp });
}
/** Log Substitution: the shinobi vanishes in a poof of smoke and a log is left in their place, then they come back. */
export function logSubstitute(arena, el, { sp = 1 } = {}) {
  if (!el) return;
  const ctx = { arena, sp };
  const f = feetOf(ctx, el); const { h } = sizeOf(el);
  const at = { x: f.x, y: f.y - h * 0.32 };
  smokeCloud(ctx, at, h * 0.5);
  el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.08 }, { opacity: 0, offset: 0.86 }, { opacity: 1 }], { duration: 1500 * sp });
  const lh = h * 0.62;
  const log = spawn(ctx, `<svg width="${lh * 0.42}" height="${lh}" viewBox="0 0 42 100"><rect x="3" y="8" width="36" height="88" rx="6" fill="#8a5a32" stroke="#4a2c16" stroke-width="2.5"/><path d="M12 20 14 60M24 14 22 86M32 30 33 76" stroke="#6b4226" stroke-width="2.5" fill="none"/><ellipse cx="21" cy="8" rx="18" ry="6" fill="#c99a62" stroke="#4a2c16" stroke-width="2"/><ellipse cx="21" cy="8" rx="10" ry="3" fill="none" stroke="#8a5a32" stroke-width="1.5"/><ellipse cx="21" cy="8" rx="4" ry="1.3" fill="#8a5a32"/></svg>`, { x: f.x, y: f.y - lh / 2 }, { life: 1600 * sp + 200 });
  log.animate([{ transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(-4deg)', opacity: 1, offset: 0.1 }, { transform: 'translate(-50%,-50%) rotate(5deg)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-50%) rotate(-2deg)', opacity: 1, offset: 0.4 }, { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1, offset: 0.78 }, { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 0 }], { duration: 1500 * sp, fill: 'forwards' });
  setTimeout(() => smokeCloud(ctx, at, h * 0.42), 1150 * sp);
}

async function flurryIn(ctx, n = 6, color = '#ffffff') {
  const to = ctx.tos[0]; const g = ghostOf(ctx, ctx.from, 0.5);
  fly(ctx, g, ctx.from, between(ctx.from, to, 0.8), 220, { rotate: 0 }).then(() => fade(ctx, g, 200));
  const dx = (to.x - ctx.from.x) * 0.62; const dy = (to.y - ctx.from.y) * 0.62;
  ctx.userEl.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px)`, offset: 0.2 }, { transform: `translate(${dx}px,${dy}px)`, offset: 0.85 }, { transform: 'translate(0,0)' }], { duration: (300 + n * 90) * ctx.sp });
  await wait(220 * ctx.sp);
  for (let i = 0; i < n; i++) { boom(ctx, { x: to.x + rnd(-30, 30), y: to.y + rnd(-45, 30) }, color, 55); shake(ctx); await wait(80 * ctx.sp); }
}
async function spinKick(ctx) {
  const to = ctx.tos[0];
  const dx = (to.x - ctx.from.x) * 0.62; const dy = (to.y - ctx.from.y) * 0.62;
  ctx.userEl.animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${dx}px,${dy}px) rotate(0deg)`, offset: 0.35 }, { transform: `translate(${dx}px,${dy}px) rotate(${ctx.isFoe ? -360 : 360}deg)`, offset: 0.7 }, { transform: 'translate(0,0) rotate(360deg)' }], { duration: 900 * ctx.sp, easing: 'ease-in-out' });
  await wait(450 * ctx.sp);
  boom(ctx, to, '#ffffff', 110);
  scatter(ctx, { x: to.x, y: to.y + 30 }, ART6.leaf(), 16, 120, 1000);
  shake(ctx);
}
function goldSand(ctx, a, b, n = 40, spread = 40, ms = 420) {
  return Promise.all(Array.from({ length: n }, (_, i) => wait(i * 8 * ctx.sp).then(async () => {
    const st = { x: a.x + rnd(-spread, spread) * 0.5, y: a.y + rnd(-spread, spread) * 0.5 };
    const d = spawn(ctx, `<div style="width:${rnd(5, 10)}px;height:${rnd(5, 10)}px;border-radius:50%;background:#e6b422;box-shadow:0 0 4px #ffd65a"></div>`, st, { life: ms + 900 });
    await fly(ctx, d, st, { x: b.x + rnd(-spread, spread), y: b.y + rnd(-spread, spread) }, ms, { rotate: 0, arc: rnd(-30, 50), ease: 'ease-in-out' });
    setTimeout(() => fade(ctx, d, 300), 300 * ctx.sp);
  })));
}
const blueOrb = (s = 30) => `<div style="width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle,#fff,#8fd3ff 40%,#4aa3ff88 65%,#4aa3ff00 72%);box-shadow:0 0 16px #4aa3ff"></div>`;

Object.assign(ANIMS, {
  kokuo_bomb: { desc: 'A black orb with a purple aura and tiny blue and red sparks grows in front of the user, then fires at the enemies.', play: (ctx) => ANIMS.chomei_bomb.play(ctx) },
  matatabi_bomb: { desc: 'A black orb with a purple aura and tiny blue and red sparks grows in front of the user, then fires at the enemies.', play: (ctx) => ANIMS.chomei_bomb.play(ctx) },
  konohamaru_combo: { desc: 'User flies in and strikes the target with a flurry of blows.', play: (ctx) => flurryIn(ctx) },
  lion_combo: { desc: 'User hits the target with a flurry of blows.', play: (ctx) => flurryIn(ctx) },
  connected_fist: { desc: 'User flies in and strikes the target with a flurry of blows.', play: (ctx) => flurryIn(ctx, 8) },
  kotoamatsukami: {
    desc: 'A Sharingan appears over the target.',
    async play(ctx) {
      const el = ctx.targetEls[0]; const at = FX.centerOf(el, ctx.arena); const { h } = sizeOf(el);
      const e = spawn(ctx, SHARINGAN(Math.max(70, h * 0.4)), { x: at.x, y: at.y - h * 0.15 }, { life: 1800 });
      await e.animate([{ transform: 'translate(-50%,-50%) scale(0) rotate(-270deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 0.92 }], { duration: 500 * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      e.firstElementChild.style.filter = 'drop-shadow(0 0 14px #ff2a2a)';
      FX.ring(ctx.arena, el, 'gen'); shake(ctx);
      await wait(600 * ctx.sp); fade(ctx, e, 350);
    },
  },
  kurama_transfer: { desc: 'The ally is covered in an orange aura.', async play(ctx) { glowAura(ctx, ctx.targetEls[0], '#ff9a2a', 1300); await wait(600 * ctx.sp); } },
  mystical_palm: { desc: 'User moves over to the ally and applies a green healing aura to them.', play: (ctx) => ANIMS.antidote.play(ctx) },
  lava_fist: {
    desc: 'User strikes the target with a lava fist.',
    async play(ctx) {
      const to = ctx.tos[0]; const hand = { x: ctx.from.x + (ctx.isFoe ? -26 : 26), y: ctx.from.y };
      const f = spawn(ctx, ART6.lavaFist(66), hand, { life: 1600 }); await pop(ctx, f, 260);
      lunge(ctx, to, 0.72, 520);
      await fly(ctx, f, hand, between(hand, to, 0.88), 240, { rotate: 0 });
      boom(ctx, to, '#ff6a1a', 140); burnAt(ctx, ctx.targetEls[0]); shake(ctx); fade(ctx, f, 200);
    },
  },
  lava_globs: {
    desc: 'User spits globs of lava at every enemy.',
    async play(ctx) {
      const mouth = { x: ctx.from.x, y: ctx.from.y - sizeOf(ctx.userEl).h * 0.3 };
      await Promise.all(ctx.tos.flatMap((t, i) => [0, 1, 2].map((k) => wait((k * 100 + i * 50) * ctx.sp).then(async () => {
        const g = spawn(ctx, lavaBlob(rnd(18, 28)), mouth, { life: 1200 });
        await fly(ctx, g, mouth, { x: t.x + rnd(-20, 20), y: t.y + rnd(-30, 20) }, 420, { rotate: 0, arc: 90 });
        g.remove(); boom(ctx, t, '#ff6a1a', 70); shakeEl(ctx.targetEls[i]);
      }))));
      ctx.targetEls.forEach((el) => burnAt(ctx, el));
    },
  },
  lava_monster: {
    desc: 'User spits a stream of lava at the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const mouth = { x: ctx.from.x, y: ctx.from.y - sizeOf(ctx.userEl).h * 0.3 };
      for (let i = 0; i < 16; i++) {
        const g = spawn(ctx, lavaBlob(rnd(14, 26)), mouth, { life: 1000 });
        fly(ctx, g, mouth, { x: to.x + rnd(-14, 14), y: to.y + rnd(-20, 20) }, 340, { rotate: 0, arc: 40 }).then(() => { g.remove(); });
        await wait(28 * ctx.sp);
      }
      await wait(340 * ctx.sp);
      boom(ctx, to, '#ff6a1a', 150); burnAt(ctx, ctx.targetEls[0]); shake(ctx);
    },
  },
  magma_wall: {
    desc: 'A wall of lava forms in front of the user.',
    async play(ctx) {
      const { w, h } = sizeOf(ctx.userEl); const f = feetOf(ctx, ctx.userEl);
      const wall = spawn(ctx, `<div style="width:${Math.max(80, w * 0.8)}px;height:${h * 0.85}px;border-radius:30px 30px 6px 6px;background:radial-gradient(ellipse at 50% 20%,#ffe9a0,#ff7a1a 40%,#b8300a 75%,#5a1a0a);box-shadow:0 0 22px #ff6a1a, inset 0 -12px 20px #3a0e04"></div>`, { x: f.x + (ctx.isFoe ? -30 : 30), y: f.y + 4 }, { life: 1900 });
      await rise(ctx, wall, 450);
      for (let i = 0; i < 4; i++) puff(ctx, { x: f.x + (ctx.isFoe ? -30 : 30) + rnd(-20, 20), y: f.y - h * 0.8 }, '#c9a9a0', 60);
      await wait(700 * ctx.sp); fade(ctx, wall, 350);
    },
  },
  quicklime: {
    desc: 'User spits lava at the enemy, and it quickly hardens to stone.',
    async play(ctx) {
      const to = ctx.tos[0]; const el = ctx.targetEls[0]; const { w, h } = sizeOf(el);
      const mouth = { x: ctx.from.x, y: ctx.from.y - sizeOf(ctx.userEl).h * 0.3 };
      const g = spawn(ctx, lavaBlob(34), mouth, { life: 1200 });
      await fly(ctx, g, mouth, to, 420, { rotate: 0, arc: 60 }); g.remove();
      const shell = spawn(ctx, `<div style="width:${w * 0.85}px;height:${h * 0.7}px;border-radius:40%;background:radial-gradient(circle at 40% 35%,#ffe9a0,#ff7a1a 45%,#b8300a);box-shadow:0 0 16px #ff6a1a;opacity:.85"></div>`, to, { life: 2000 });
      await grow(ctx, shell, 220, 'scale(.3)', 'scale(1)');
      shake(ctx);
      await wait(250 * ctx.sp);
      shell.firstElementChild.style.transition = `background ${400 * ctx.sp}ms, box-shadow ${400 * ctx.sp}ms`;
      shell.firstElementChild.style.background = 'radial-gradient(circle at 40% 35%,#d8d4cc,#a8a29a 50%,#6e6860)';
      shell.firstElementChild.style.boxShadow = 'inset 0 -8px 14px #4e4840';
      await wait(700 * ctx.sp); fade(ctx, shell, 300);
    },
  },
  lava_shuriken: {
    desc: 'User throws several lava shuriken at every enemy.',
    async play(ctx) {
      await Promise.all(ctx.tos.flatMap((t, i) => [0, 1].map((k) => wait((k * 110 + i * 50) * ctx.sp).then(async () => {
        const s = spawn(ctx, ART6.lavaStar(34), ctx.from, { life: 1200 });
        await fly(ctx, s, ctx.from, { x: t.x + rnd(-16, 16), y: t.y + rnd(-24, 16) }, 400, { rotate: 0, arc: rnd(-30, 50) });
        s.remove(); boom(ctx, t, '#ff6a1a', 80); shakeEl(ctx.targetEls[i]);
      }))));
    },
  },
  leaf_whirlwind: { desc: 'User dashes to the target and spin-kicks them, kicking up leaves.', play: (ctx) => spinKick(ctx) },
  leaf_hurricane: { desc: 'User dashes to the target and spin-kicks them, kicking up leaves.', play: (ctx) => spinKick(ctx) },
  leaf_rising_wind: {
    desc: 'User dashes over and kicks the target straight up into the air.',
    async play(ctx) {
      const to = await dash(ctx, 0.66, 520);
      boom(ctx, { x: to.x, y: to.y + 30 }, '#ffffff', 90);
      ctx.targetEls[0].animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-90px) rotate(-8deg)', offset: 0.4, easing: 'ease-in' }, { transform: 'translateY(0)' }], { duration: 750 * ctx.sp, easing: 'ease-out' });
      await wait(300 * ctx.sp);
    },
  },
  lightning_hound: {
    desc: 'User fires a hound made of crackling blue lightning at the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const d = spawn(ctx, ART6.hound(120), ctx.from, { life: 1200 });
      if (to.x < ctx.from.x) d.firstElementChild.style.transform = 'scaleX(-1)';
      const iv = setInterval(() => { const r = d.getBoundingClientRect(); const a = ctx.arena.getBoundingClientRect(); const c = { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 }; bolt(ctx, c, { x: c.x + rnd(-50, 50), y: c.y + rnd(-30, 30) }, { ms: 90, width: 2 }); }, 50);
      await fly(ctx, d, ctx.from, to, 420, { rotate: 0, ease: 'ease-in' });
      clearInterval(iv); d.remove();
      boom(ctx, to, '#9fd8ff', 140); for (let i = 0; i < 4; i++) bolt(ctx, to, { x: to.x + rnd(-70, 70), y: to.y + rnd(-70, 70) }, { ms: 220 });
      shake(ctx);
    },
  },
  lightning_blade: { desc: 'User produces blue crackling electricity and flies in to strike the target.', play: (ctx) => ANIMS.chidori.play(ctx) },
  lightning_armor: {
    desc: 'The user puts up a wall of crackling blue electricity.',
    async play(ctx) {
      const { h } = sizeOf(ctx.userEl); const f = feetOf(ctx, ctx.userEl); const x = f.x + (ctx.isFoe ? -44 : 44);
      const glow = spawn(ctx, `<div style="width:46px;height:${h * 0.9}px;border-radius:20px;background:radial-gradient(ellipse,#bfe6ff66,#4aa3ff33 60%,#4aa3ff00 72%);box-shadow:0 0 20px #4aa3ff"></div>`, { x, y: f.y - h * 0.45 }, { life: 1500 });
      pop(ctx, glow, 200);
      for (let k = 0; k < 10; k++) { for (let i = 0; i < 3; i++) bolt(ctx, { x: x + rnd(-14, 14), y: f.y }, { x: x + rnd(-14, 14), y: f.y - h * 0.9 }, { ms: 120, width: 2.5 }); await wait(90 * ctx.sp); }
      fade(ctx, glow, 250);
    },
  },
  false_darkness: {
    desc: 'User fires crackling purple electricity at the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      for (let i = 0; i < 4; i++) { bolt(ctx, ctx.from, to, { ms: 260, width: 5 - i, color: '#d9b3ff', glow: '#8a2be2' }); await wait(60 * ctx.sp); }
      boom(ctx, to, '#b44bff', 130); shake(ctx);
    },
  },
  guillotine_drop: {
    desc: 'User flies up, then comes straight down on the target with crackling blue electricity.',
    async play(ctx) {
      const to = ctx.tos[0]; const top = { x: to.x, y: Math.max(30, to.y - 160) };
      ctx.userEl.animate([{ opacity: 1 }, { opacity: 0, offset: 0.12 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1150 * ctx.sp });
      const g = ghostOf(ctx, ctx.from, 0.85);
      await fly(ctx, g, ctx.from, top, 380, { rotate: 0, arc: 40, ease: 'ease-out' });
      const g2 = ghostOf(ctx, top, 0.85); g.remove();
      g2.firstElementChild.style.filter = 'drop-shadow(0 0 12px #4aa3ff)';
      const sp = sparkBall(ctx, { x: top.x, y: top.y + 40 }, 50, 600);
      await wait(150 * ctx.sp);
      fly(ctx, sp, { x: top.x, y: top.y + 40 }, { x: to.x, y: to.y + 20 }, 180, { rotate: 0, ease: 'ease-in' });
      await fly(ctx, g2, top, { x: to.x, y: to.y - 20 }, 180, { rotate: 0, ease: 'ease-in' });
      crackAt(ctx, ctx.targetEls[0]); boom(ctx, to, '#9fd8ff', 160);
      for (let i = 0; i < 4; i++) bolt(ctx, to, { x: to.x + rnd(-80, 80), y: to.y + rnd(-60, 60) }, { ms: 240 });
      shake(ctx); fade(ctx, g2, 250); fade(ctx, sp, 150);
    },
  },
  lariat: {
    desc: 'User charges crackling blue electricity into a sharp point, then lunges and pierces the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const hand = { x: ctx.from.x + (ctx.isFoe ? -24 : 24), y: ctx.from.y };
      const s = sparkBall(ctx, hand, 40, 1500); await pop(ctx, s, 250);
      const tip = (len) => `<svg width="${len}" height="22" viewBox="0 0 ${len} 22" style="filter:drop-shadow(0 0 8px #4aa3ff)"><path d="M0 4 ${len} 11 0 18Z" fill="#cfeeff" stroke="#fff"/></svg>`;
      const pt = await stretch(ctx, hand, { x: hand.x + (to.x > hand.x ? 60 : -60), y: hand.y + (to.y - hand.y) * 0.15 }, tip, 250, 1400);
      await wait(150 * ctx.sp);
      lunge(ctx, to, 0.75, 460);
      await wait(200 * ctx.sp);
      boom(ctx, to, '#9fd8ff', 140); bolt(ctx, ctx.from, to, { ms: 240 });
      shake(ctx); fade(ctx, s, 150); fade(ctx, pt, 150);
    },
  },
  liger_bomb: {
    desc: 'User grabs the target, carries them up and slams them into the ground with crackling blue electricity.',
    async play(ctx) { await lotus(ctx, false); const to = ctx.tos[0]; for (let i = 0; i < 6; i++) bolt(ctx, { x: to.x, y: to.y + 30 }, { x: to.x + rnd(-90, 90), y: to.y + rnd(-60, 40) }, { ms: 260 }); boom(ctx, to, '#9fd8ff', 150); },
  },
  karui_lightning_blade: {
    desc: 'User charges their blade with crackling blue electricity, then slashes the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const hand = { x: ctx.from.x + (ctx.isFoe ? -26 : 26), y: ctx.from.y - 10 };
      for (let i = 0; i < 5; i++) { bolt(ctx, hand, { x: hand.x + rnd(-50, 50), y: hand.y - rnd(20, 60) }, { ms: 110, width: 2 }); await wait(70 * ctx.sp); }
      await dash(ctx, 0.64, 500);
      slashArc(ctx, to, { color: '#cfeeff', glow: '#4aa3ff', size: 140, rot: 60 });
      for (let i = 0; i < 3; i++) bolt(ctx, to, { x: to.x + rnd(-60, 60), y: to.y + rnd(-60, 60) }, { ms: 200 });
      shake(ctx);
    },
  },
  limbo_strike: {
    desc: 'The user sends four white, transparent copies of themselves to surround the target and strike it with a flurry of blows.',
    async play(ctx) {
      const to = ctx.tos[0]; const { h } = sizeOf(ctx.targetEls[0]);
      const spots = [[-0.42, -0.05], [0.42, -0.05], [-0.25, 0.12], [0.25, 0.12]].map(([dx, dy]) => ({ x: to.x + dx * h, y: to.y + dy * h }));
      const gs = await Promise.all(spots.map((p, i) => wait(i * 70 * ctx.sp).then(async () => {
        const g = ghostOf(ctx, ctx.from, 0.45); g.firstElementChild.style.filter = 'brightness(3) saturate(0) drop-shadow(0 0 8px #fff)';
        await fly(ctx, g, ctx.from, p, 300, { rotate: 0 }); return g;
      })));
      for (let i = 0; i < 10; i++) { boom(ctx, { x: to.x + rnd(-36, 36), y: to.y + rnd(-50, 30) }, '#ffffff', 60); shake(ctx); await wait(70 * ctx.sp); }
      gs.forEach((g) => fade(ctx, g, 250));
    },
  },
  gold_avalanche: {
    desc: 'User sends a wave of gold sand that crashes into the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const wv = spawn(ctx, '<div style="width:140px;height:110px;border-radius:50% 50% 20% 20%;background:radial-gradient(ellipse at 50% 30%,#fff3b0,#e6b422 50%,#9a7410);box-shadow:0 0 18px #ffd65a"></div>', ctx.from, { life: 1500 });
      goldSand(ctx, ctx.from, to, 30, 50, 460);
      await fly(ctx, wv, ctx.from, to, 460, { rotate: 0, scale: [0.3, 1.4], ease: 'ease-in' });
      boom(ctx, to, '#ffd65a', 170); shake(ctx); fade(ctx, wv, 250);
    },
  },
  gold_dust_coffin: {
    desc: 'Gold sand gathers around the target and binds them.',
    async play(ctx) {
      const to = ctx.tos[0]; const el = ctx.targetEls[0]; const { w, h } = sizeOf(el);
      await goldSand(ctx, { x: to.x, y: to.y + h * 0.4 }, to, 50, h * 0.45, 400);
      const c = spawn(ctx, `<div style="width:${w * 0.85}px;height:${h * 0.9}px;border-radius:30% 30% 12% 12%;background:repeating-linear-gradient(170deg,#0000 0 12px,#9a741066 12px 14px),radial-gradient(ellipse at 50% 30%,#fff3b0,#e6b422 55%,#9a7410);box-shadow:0 0 16px #ffd65a;opacity:.9"></div>`, to, { life: 1800 });
      await grow(ctx, c, 260, 'scaleY(.2)', 'scaleY(1)');
      shake(ctx); await wait(650 * ctx.sp); fade(ctx, c, 300);
    },
  },
  gold_dust_wall: {
    desc: 'Walls of gold sand rise in front of every ally.',
    async play(ctx) {
      const ws = ctx.targetEls.map((el) => {
        const { w, h } = sizeOf(el); const f = feetOf(ctx, el);
        const n = spawn(ctx, `<div style="width:${Math.max(60, w * 0.6)}px;height:${h * 0.8}px;border-radius:40% 40% 6px 6px;background:radial-gradient(circle at 30% 30%,#fff3b0,#e6b422 60%,#9a7410);box-shadow:inset 0 -10px 18px #7a5a0a, 0 0 14px #ffd65a88;opacity:.92"></div>`, { x: f.x + (ctx.isFoe ? -24 : 24), y: f.y + 4 }, { life: 1900, z: 7 });
        rise(ctx, n, 420); return n;
      });
      await wait(1100 * ctx.sp); ws.forEach((n) => fade(ctx, n, 350));
    },
  },
  gold_dust_wave: {
    desc: 'User sends a massive wave of gold sand that crashes into every enemy.',
    async play(ctx) {
      const box = sideBox(ctx);
      const wv = spawn(ctx, `<div style="width:${box.w + 120}px;height:${box.h * 0.9}px;border-radius:50% 50% 20% 20%;background:radial-gradient(ellipse at 50% 30%,#fff3b0,#e6b422 50%,#9a7410);box-shadow:0 0 22px #ffd65a"></div>`, ctx.from, { life: 1800 });
      goldSand(ctx, ctx.from, box.c, 60, box.w * 0.5, 560);
      await fly(ctx, wv, ctx.from, box.c, 560, { rotate: 0, scale: [0.1, 1], ease: 'ease-in' });
      ctx.tos.forEach((t) => boom(ctx, t, '#ffd65a', 120)); shake(ctx); fade(ctx, wv, 300);
    },
  },
  chain_bind: {
    desc: 'User sends several chains at the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const ns = await Promise.all([-22, -8, 8, 22].map((dy, i) => wait(i * 60 * ctx.sp).then(() => stretch(ctx, { x: ctx.from.x, y: ctx.from.y + dy }, { x: to.x + rnd(-10, 10), y: to.y + dy * 0.8 }, greyChain, 320))));
      wrapRing(ctx, ctx.targetEls[0], 'border:5px dashed #b9c0c8;box-shadow:0 0 6px #000', 700);
      shake(ctx); ns.forEach((n) => setTimeout(() => fade(ctx, n), 450 * ctx.sp)); await wait(300 * ctx.sp);
    },
  },
  mayfly: {
    desc: 'The user disappears into the ground.',
    async play(ctx) {
      const f = feetOf(ctx, ctx.userEl);
      for (let i = 0; i < 3; i++) puff(ctx, { x: f.x + rnd(-30, 30), y: f.y - 10 }, '#a8916e', 70);
      await ctx.userEl.animate([{ clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' }, { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(70px)', offset: 0.3 }, { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(70px)', offset: 0.75 }, { clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' }], { duration: 1500 * ctx.sp }).finished.catch(() => {});
    },
  },
  mind_body_disturbance: {
    desc: 'User sends an orb of blue chakra to the target.',
    async play(ctx) { const o = spawn(ctx, blueOrb(30), ctx.from, { life: 1200 }); await fly(ctx, o, ctx.from, ctx.tos[0], 460, { rotate: 0, arc: 30, ease: 'ease-in-out' }); o.remove(); glowAura(ctx, ctx.targetEls[0], '#8fd3ff', 800); FX.ring(ctx.arena, ctx.targetEls[0], 'gen'); shake(ctx); },
  },
  mind_destruction: {
    desc: 'User sends an orb of blue chakra to the target that explodes.',
    async play(ctx) { const o = spawn(ctx, blueOrb(36), ctx.from, { life: 1200 }); await fly(ctx, o, ctx.from, ctx.tos[0], 460, { rotate: 0, arc: 30, ease: 'ease-in-out' }); o.remove(); boom(ctx, ctx.tos[0], '#6cc4ff', 170); FX.ring(ctx.arena, ctx.targetEls[0], 'gen'); shake(ctx); },
  },
  mind_transfer: {
    desc: 'User sends a blue chakra orb that stays on the target; the user slumps for as long as the effect lasts.',
    async play(ctx) {
      const el = ctx.targetEls[0]; const { h } = sizeOf(el);
      const o = spawn(ctx, blueOrb(30), ctx.from, { life: 1600 });
      await fly(ctx, o, ctx.from, { x: ctx.tos[0].x, y: ctx.tos[0].y - h * 0.3 }, 480, { rotate: 0, arc: 30, ease: 'ease-in-out' });
      ctx.userEl.animate([{ transform: 'translateY(0) rotate(0deg)' }, { transform: `translateY(22px) rotate(${ctx.isFoe ? -5 : 5}deg)` }], { duration: 400 * ctx.sp, fill: 'forwards' });
      FX.ring(ctx.arena, el, 'gen'); shake(ctx);
      await wait(500 * ctx.sp);
      fade(ctx, o, 200);
      setTimeout(() => ctx.userEl.getAnimations().forEach((a) => a.cancel()), 300 * ctx.sp);
    },
  },
  mind_clone_spy: {
    desc: 'User creates a clone of themselves that then dissolves into blue chakra.',
    async play(ctx) {
      const at = { x: ctx.from.x + (ctx.isFoe ? -55 : 55), y: ctx.from.y };
      puff(ctx, at, '#ffffff', 90);
      const g = ghostOf(ctx, at, 0.85); g.firstElementChild.style.filter = 'none';
      await pop(ctx, g, 200); await wait(450 * ctx.sp);
      g.firstElementChild.style.transition = `filter ${250 * ctx.sp}ms`; g.firstElementChild.style.filter = 'brightness(2) sepia(1) hue-rotate(170deg) saturate(4)';
      await wait(250 * ctx.sp);
      scatter(ctx, at, '<div style="width:7px;height:7px;border-radius:50%;background:#8fd3ff;box-shadow:0 0 6px #4aa3ff"></div>', 26, 90, 900);
      fade(ctx, g, 200);
    },
  },
  mind_eye_sensing: { desc: 'The target is highlighted with a blue glow.', async play(ctx) { glowAura(ctx, ctx.targetEls[0], '#4aa3ff', 1300); await wait(700 * ctx.sp); } },
  morning_peacock: {
    desc: 'User flies in and strikes the target many times; every punch sends off a flaming fist.',
    async play(ctx) {
      const to = ctx.tos[0]; const g = ghostOf(ctx, ctx.from, 0.5);
      fly(ctx, g, ctx.from, between(ctx.from, to, 0.6), 220, { rotate: 0 }).then(() => fade(ctx, g, 200));
      const dx = (to.x - ctx.from.x) * 0.5; const dy = (to.y - ctx.from.y) * 0.5;
      ctx.userEl.animate([{ transform: 'translate(0,0)', filter: 'none' }, { transform: `translate(${dx}px,${dy}px)`, filter: 'drop-shadow(0 0 12px #ff7a1a)', offset: 0.15 }, { transform: `translate(${dx}px,${dy}px)`, filter: 'drop-shadow(0 0 12px #ff7a1a)', offset: 0.88 }, { transform: 'translate(0,0)', filter: 'none' }], { duration: 1500 * ctx.sp });
      await wait(240 * ctx.sp);
      const src = { x: ctx.from.x + dx, y: ctx.from.y + dy };
      for (let i = 0; i < 14; i++) { fireball(ctx, { x: src.x + rnd(-20, 20), y: src.y + rnd(-40, 20) }, { x: to.x + rnd(-30, 30), y: to.y + rnd(-45, 30) }, { size: 30, ms: 200, trail: false }).then(() => shake(ctx)); await wait(60 * ctx.sp); }
      await wait(220 * ctx.sp); burnAt(ctx, ctx.targetEls[0]);
    },
  },
  multi_shadow_clone: {
    desc: 'User makes about five clones of themselves in front of them.',
    async play(ctx) {
      const { h } = sizeOf(ctx.userEl); const dir = ctx.isFoe ? -1 : 1;
      const spots = [[0.35, -0.05], [0.6, 0.06], [0.85, -0.02], [0.5, -0.18], [0.75, -0.2]].map(([dx, dy]) => ({ x: ctx.from.x + dir * dx * h, y: ctx.from.y + dy * h }));
      const gs = spots.map((p, i) => { puff(ctx, p, '#ffffff', 90); const g = ghostOf(ctx, p, 0.95); g.firstElementChild.style.filter = 'none'; g.style.opacity = '0'; setTimeout(() => pop(ctx, g, 180), i * 60 * ctx.sp); return g; });
      await wait(1000 * ctx.sp);
      gs.forEach((g, i) => { puff(ctx, spots[i], '#ffffff', 80); fade(ctx, g, 150); });
    },
  },
});

// ---------------------------------------------------------------- batch 7 (sheet rows 230–267) + poison bubbles + curse marks
/** Purple poison bubbles rising off the top of a unit (shown whenever poison lands). */
export function poisonBubbles(arena, el, { sp = 1 } = {}) {
  if (!el) return;
  const ctx = { arena, sp };
  const r = el.getBoundingClientRect(); const a = arena.getBoundingClientRect();
  const top = { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height * 0.12 };
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const s = rnd(10, 22);
      const b = spawn(ctx, `<svg width="${s}" height="${s}" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="#a64bff88" stroke="#e2b8ff" stroke-width="1.4"/><circle cx="7" cy="6.5" r="2" fill="#fff" opacity=".7"/></svg>`, { x: top.x + rnd(-r.width * 0.22, r.width * 0.22), y: top.y + rnd(-6, 14) }, { life: 1300 });
      b.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: `translate(calc(-50% + ${rnd(-14, 14)}px), calc(-50% - ${rnd(40, 70)}px)) scale(1.05)`, opacity: 0.9, offset: 0.85 }, { transform: `translate(calc(-50% + ${rnd(-14, 14)}px), calc(-50% - ${rnd(60, 80)}px)) scale(1.3)`, opacity: 0 }], { duration: rnd(800, 1100) * sp, easing: 'ease-out', fill: 'forwards' });
    }, i * 55 * sp);
  }
}
/** Hidan's ritual mark (circle with an inverted triangle), drawn flat on the ground. */
export const CURSE_MARK = (s = 110, glow = false) => `<svg width="${s}" height="${s * 0.38}" viewBox="0 0 100 38"><g transform="scale(1 .38)" fill="none" stroke="${glow ? '#7a2bd6' : '#111'}" stroke-width="5" stroke-linejoin="round" style="${glow ? 'filter:drop-shadow(0 0 6px #b44bff)' : ''}"><circle cx="50" cy="50" r="44"/><path d="M12 30H88L50 94Z"/></g></svg>`;

const ART7 = {
  tentacle: (h = 110) => `<svg width="${h * 0.5}" height="${h}" viewBox="0 0 50 100"><path d="M18 100C10 80 14 60 22 44 30 28 26 14 34 4 40 0 46 6 42 12 36 22 40 36 36 52 32 68 36 84 40 100Z" fill="#d97a8a" stroke="#8a3a4a" stroke-width="2.5"/>${[20, 34, 48, 62, 76, 90].map((y, i) => `<circle cx="${36 - i * 1.2}" cy="${y}" r="3.4" fill="#f7c2cb" stroke="#8a3a4a"/>`).join('')}</svg>`,
  paperStar: (s = 46) => `<svg width="${s}" height="${s}" viewBox="-10 -10 20 20" class="ax-spin"><path d="M0-10 3-3 10 0 3 3 0 10-3 3-10 0-3-3Z" fill="#fbfbf7" stroke="#bdbdb2" stroke-width=".6"/><path d="M0-10 0 10M-10 0 10 0" stroke="#d8d8cf" stroke-width=".5"/></svg>`,
  shinigami: (s = 70) => `<svg width="${s}" height="${s * 1.1}" viewBox="0 0 60 66" style="filter:drop-shadow(0 0 10px #7a2bd6)"><path d="M8 18C8 6 52 6 52 18L54 44C50 60 10 60 6 44Z" fill="#e8e2f2" stroke="#3a2a4a" stroke-width="2.5"/><path d="M4 18 14 2 22 14M56 18 46 2 38 14" fill="#e8e2f2" stroke="#3a2a4a" stroke-width="2"/><path d="M16 26 26 30 16 32ZM44 26 34 30 44 32Z" fill="#1a0a2a"/><path d="M18 44Q30 52 42 44" stroke="#1a0a2a" stroke-width="2.5" fill="none"/><path d="M22 44v5M27 46v5M32 46v5M37 44v5" stroke="#1a0a2a" stroke-width="1.6"/></svg>`,
  fourSymbols: (s = 90) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100" style="filter:drop-shadow(0 0 6px #000)"><circle cx="50" cy="50" r="44" fill="none" stroke="#111" stroke-width="3"/><circle cx="50" cy="50" r="12" fill="none" stroke="#111" stroke-width="3"/>${[0, 90, 180, 270].map((a) => `<g transform="rotate(${a} 50 50)"><path d="M50 6V38" stroke="#111" stroke-width="2.5"/><path d="M42 18H58M44 26H56" stroke="#111" stroke-width="2"/></g>`).join('')}<path d="M50 38 42 50 50 62 58 50Z" fill="#111"/></svg>`,
  puppetRed: (h = 90) => `<svg width="${h * 0.6}" height="${h}" viewBox="0 0 60 100"><circle cx="30" cy="14" r="10" fill="#e3c39a" stroke="#6b4a2a" stroke-width="2"/><path d="M24 8Q30 2 36 8" stroke="#3a2614" stroke-width="3" fill="none"/><path d="M14 28H46L52 86 42 98H18L8 86Z" fill="#b8202a" stroke="#5a0a10" stroke-width="2"/><path d="M14 30 4 56M46 30 56 56" stroke="#e3c39a" stroke-width="6" stroke-linecap="round"/><path d="M30 28V96" stroke="#7a1018" stroke-width="2"/></svg>`,
  salamander: (w = 220) => `<svg width="${w}" height="${w * 0.55}" viewBox="0 0 200 110"><path d="M20 70C10 50 30 30 60 32 90 20 130 22 160 36 184 44 196 60 190 74 186 90 160 96 130 92L70 94C40 96 26 88 20 70Z" fill="#8c8278" stroke="#4e463e" stroke-width="3"/><path d="M40 92 30 108M70 94 66 110M140 92 146 108M168 88 178 104" stroke="#6e6660" stroke-width="10" stroke-linecap="round"/><ellipse cx="170" cy="56" rx="22" ry="16" fill="#9a9086" stroke="#4e463e" stroke-width="3"/><circle cx="176" cy="50" r="4" fill="#e6b422" stroke="#222"/><path d="M152 66Q168 74 186 64" stroke="#3a322a" stroke-width="2.5" fill="none"/>${[60, 80, 100, 120, 140].map((x) => `<circle cx="${x}" cy="${48 + (x % 40) / 4}" r="5" fill="#6e6660"/>`).join('')}<path d="M24 66C8 70 0 60 4 52" stroke="#8c8278" stroke-width="10" fill="none" stroke-linecap="round"/></svg>`,
  salamanderPuppet: (w = 220) => `<svg width="${w}" height="${w * 0.6}" viewBox="0 0 200 120"><path d="M40 52 56 18 72 40 88 10 104 38 120 12 134 40 150 22 158 50Z" fill="#3e3631" stroke="#1e1a17" stroke-width="2.5" stroke-linejoin="round"/><path d="M56 22V48M88 14V46M120 16V46M150 26V50" stroke="#5a504a" stroke-width="2"/><path d="M20 80C10 60 30 40 60 42 90 30 130 32 160 46 184 54 196 70 190 84 186 100 160 106 130 102L70 104C40 106 26 98 20 80Z" fill="#6e655c" stroke="#4e463e" stroke-width="3"/>${[52, 80, 108, 136, 160].map((x) => `<path d="M${x} ${x < 150 ? 40 : 46}C${x - 6} 70 ${x - 6} 86 ${x} 104" stroke="#4e463e" stroke-width="3" fill="none"/>`).join('')}${[66, 94, 122, 148].map((x) => `<circle cx="${x}" cy="74" r="3" fill="#4e463e"/>`).join('')}<path d="M40 102 30 118M70 104 66 120M140 102 146 118M168 98 178 114" stroke="#564e47" stroke-width="10" stroke-linecap="round"/><path d="M40 102 30 118M70 104 66 120M140 102 146 118M168 98 178 114" stroke="#4e463e" stroke-width="2" stroke-dasharray="3 5"/><ellipse cx="172" cy="66" rx="22" ry="16" fill="#7a7168" stroke="#4e463e" stroke-width="3"/><circle cx="178" cy="60" r="4" fill="#3ddc5a" stroke="#222"/><path d="M154 76Q170 84 188 74" stroke="#3a322a" stroke-width="2.5" fill="none"/><path d="M24 76C8 80 0 70 4 62" stroke="#6e655c" stroke-width="10" fill="none" stroke-linecap="round"/></svg>`,
  samehada: (l = 150) => `<svg width="${l}" height="${l * 0.3}" viewBox="0 0 150 46"><rect x="0" y="19" width="26" height="8" rx="3" fill="#3a3a5a"/><path d="M24 10H140Q150 23 140 36H24Z" fill="#5a6ea8" stroke="#2a3460" stroke-width="2"/>${Array.from({ length: 10 }, (_, i) => `<path d="M${30 + i * 11} 10l5-9 5 9M${30 + i * 11} 36l5 9 5-9" fill="#7a8ed0" stroke="#2a3460"/>`).join('')}</svg>`,
  buddha: (w = 300) => `<svg width="${w}" height="${w * 0.9}" viewBox="0 0 300 270"><g fill="#9b6b3e" stroke="#5a3a1e" stroke-width="3">${Array.from({ length: 12 }, (_, i) => { const a = -170 + i * 14; const r = (a * Math.PI) / 180; return `<path d="M150 120L${150 + Math.cos(r) * 140} ${130 + Math.sin(r) * 120}" stroke-width="12" stroke-linecap="round"/><circle cx="${150 + Math.cos(r) * 140}" cy="${130 + Math.sin(r) * 120}" r="11"/>`; }).join('')}<path d="M90 110C90 70 210 70 210 110L220 260H80Z"/><circle cx="150" cy="70" r="38"/><path d="M120 50Q150 30 180 50" fill="none"/></g><path d="M134 66H144M156 66H166M140 86Q150 92 160 86" stroke="#3a2614" stroke-width="3" fill="none"/><circle cx="150" cy="50" r="5" fill="#3a2614"/></svg>`,
  redDragon: (w = 200) => `<svg width="${w}" height="${w * 0.4}" viewBox="0 0 200 80" style="filter:drop-shadow(0 0 10px #ff2a2a)"><path d="M0 44C20 20 40 64 64 40S104 18 128 38 160 50 172 36" stroke="#ff3a3a99" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M168 24 196 34 176 44 196 50 168 54Z" fill="#ff5a5a99" stroke="#ffb3b3" stroke-width="2"/><path d="M168 24 160 10M176 26 176 12" stroke="#ffb3b3" stroke-width="2.5"/><circle cx="178" cy="34" r="2.5" fill="#fff"/></svg>`,
};

async function reviveAnim(ctx, { samsara = false } = {}) {
  const el = ctx.targetEls[0]; const f = feetOf(ctx, el); const { h } = ctx.userSize;
  const inLab = !el.closest('.mon')?.classList.contains('down');
  if (inLab) el.animate([{ opacity: 1, filter: 'none' }, { opacity: 0.2, filter: 'grayscale(1)' }], { duration: 300 * ctx.sp, fill: 'forwards' });
  let head = null;
  if (samsara) {
    head = spawn(ctx, `<img src="sprites/battle/samsara.webp" style="height:${h * 0.8}px">`, { x: f.x, y: f.y - h * 0.4 }, { life: 3600 });
    await rise(ctx, head, 450);
    head.style.transform = 'translate(-50%,-100%)';
    glowAura(ctx, head, '#5dff8f', 1100); await wait(800 * ctx.sp);
    ctx.userEl.animate([{ filter: 'none' }, { filter: 'drop-shadow(0 0 8px #5dff8f)' }, { filter: 'none' }], { duration: 600 * ctx.sp });
  } else {
    lunge(ctx, ctx.tos[0], 0.8, 900); await wait(380 * ctx.sp);
  }
  glowAura(ctx, el, '#5dff8f', 1100);
  await wait(500 * ctx.sp);
  el.getAnimations().forEach((a) => a.cancel());
  FX.appear(el);
  if (head) { head.style.transformOrigin = '50% 100%'; head.animate([{ transform: 'translate(-50%,-100%) scaleY(1)', opacity: 1 }, { transform: 'translate(-50%,-100%) scaleY(0)', opacity: 0 }], { duration: 400 * ctx.sp, fill: 'forwards' }); }
  await wait(250 * ctx.sp);
  shakeEl(ctx.userEl);
}
async function lunging(ctx, k = 0.66, ms = 500) { const to = ctx.tos[0]; const g = ghostOf(ctx, ctx.from, 0.5); fly(ctx, g, ctx.from, between(ctx.from, to, 0.82), ms * 0.45, { rotate: 0 }).then(() => fade(ctx, g, 200)); lunge(ctx, to, k, ms); await wait(ms * 0.45 * ctx.sp); return to; }
async function rasenganStrike(ctx, size) {
  const to = ctx.tos[0]; const hand = { x: ctx.from.x + (ctx.isFoe ? -24 : 24), y: ctx.from.y };
  const r = spawn(ctx, ART.rasengan(size), hand, { life: 2000 }); await pop(ctx, r, 320);
  lunge(ctx, to, 0.75, 580);
  await fly(ctx, r, hand, between(hand, to, 0.9), 260, { rotate: 0 });
  boom(ctx, to, '#6cb8ff', size * 2.2); shake(ctx); fade(ctx, r, 200);
}
function purpleCloud(ctx, at, w, h) {
  return spawn(ctx, `<div style="width:${w}px;height:${h}px;border-radius:50%;background:radial-gradient(ellipse,#9a3bdccc 0%,#7a2bd699 45%,#7a2bd600 72%);filter:blur(4px)"></div>`, at, { life: 2400 });
}

Object.assign(ANIMS, {
  cell_share: {
    desc: 'User moves over to the ally and applies a light-green healing aura, then flinches as if taking damage.',
    async play(ctx) { if (ctx.targetEls[0] !== ctx.userEl) { lunge(ctx, ctx.tos[0], 0.75, 700); await wait(300 * ctx.sp); } glowAura(ctx, ctx.targetEls[0], '#b8ffc4'); await wait(600 * ctx.sp); shakeEl(ctx.userEl); },
  },
  night_guy: {
    desc: 'User flies in with a kick wrapped in a red dragon-shaped aura.',
    async play(ctx) {
      const to = ctx.tos[0];
      ctx.userEl.animate([{ filter: 'none' }, { filter: 'drop-shadow(0 0 16px #ff1a1a) drop-shadow(0 0 6px #ff6a6a)', offset: 0.3 }, { filter: 'drop-shadow(0 0 16px #ff1a1a)', offset: 0.85 }, { filter: 'none' }], { duration: 1200 * ctx.sp });
      await wait(300 * ctx.sp);
      const d = spawn(ctx, ART7.redDragon(Math.hypot(to.x - ctx.from.x, to.y - ctx.from.y) * 0.9), ctx.from, { life: 1400 });
      d.style.transformOrigin = '0 50%'; d.style.transform = `translate(0,-50%) rotate(${ang(ctx.from, to)}deg)`;
      d.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 300 * ctx.sp, fill: 'forwards' });
      lunge(ctx, to, 0.8, 520); await wait(260 * ctx.sp);
      boom(ctx, to, '#ff3a3a', 200); crackAt(ctx, ctx.targetEls[0]); shake(ctx); fade(ctx, d, 300);
    },
  },
  octopus_clone: {
    desc: 'When the user is struck, they vanish in a puff of smoke and leave an octopus tentacle behind.',
    async play(ctx) { FX.ring(ctx.arena, ctx.userEl, 'aura'); await wait(400 * ctx.sp); },
    decoy(ctx, el) {
      poof(ctx.arena, el, ctx);
      const f = feetOf({ arena: ctx.arena }, el); const { h } = sizeOf(el);
      const t = spawn(ctx, ART7.tentacle(h * 0.65), { x: f.x, y: f.y - h * 0.32 }, { life: 1600 });
      t.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 1300 * ctx.sp, fill: 'forwards' });
    },
  },
  reincarnation: { desc: "User goes to the fallen ally's spot and glows green to bring them back, then flinches as if taking damage.", play: (ctx) => reviveAnim(ctx) },
  samsara_revival: { desc: "The Samsara head rises where the ally fell and glows green; the ally returns and the head sinks away. The user then flinches as if taking damage.", play: (ctx) => reviveAnim(ctx, { samsara: true }) },
  paper_clone: {
    desc: 'When the user is struck, they burst into paper butterflies that scatter.',
    async play(ctx) { FX.ring(ctx.arena, ctx.userEl, 'aura'); await wait(400 * ctx.sp); },
    decoy(ctx, el) {
      const at = FX.centerOf(el, ctx.arena); const { h } = sizeOf(el);
      el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.1 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1400 * ctx.sp });
      for (let i = 0; i < 18; i++) {
        const st = { x: at.x + rnd(-h * 0.2, h * 0.2), y: at.y + rnd(-h * 0.4, h * 0.4) };
        const b = spawn(ctx, ART2.butterfly(rnd(20, 30)), st, { life: 1400 });
        const t = rnd(-Math.PI, 0);
        fly(ctx, b, st, { x: st.x + Math.cos(t) * rnd(80, 200), y: st.y + Math.sin(t) * rnd(60, 160) }, rnd(700, 1100), { rotate: 0, ease: 'ease-out' }).then(() => b.remove());
      }
    },
  },
  paper_shuriken: {
    desc: 'User throws a shuriken made of paper at the target.',
    async play(ctx) { const s = spawn(ctx, ART7.paperStar(46), ctx.from, { life: 1100 }); await fly(ctx, s, ctx.from, ctx.tos[0], 380, { rotate: 0, arc: 20 }); s.remove(); FX.fx(ctx.arena, 'slash', ctx.tos[0]); shake(ctx); },
  },
  paper_spear: {
    desc: 'User fires a spear made of sheets of paper at the target.',
    async play(ctx) {
      const spear = (len) => `<svg width="${len}" height="20" viewBox="0 0 ${len} 20"><path d="M0 7H${len - 26}V13H0Z" fill="#fbfbf7" stroke="#bdbdb2"/>${Array.from({ length: Math.floor(len / 18) }, (_, i) => `<path d="M${i * 18} 7l8-4 0 14-8-4" fill="#efefe6" stroke="#cfcfc4"/>`).join('')}<path d="M${len - 28} 2 ${len} 10 ${len - 28} 18Z" fill="#fbfbf7" stroke="#9a9a90"/></svg>`;
      const n = await stretch(ctx, ctx.from, ctx.tos[0], spear, 240, 1300);
      boom(ctx, ctx.tos[0], '#ffffff', 90); shake(ctx); setTimeout(() => fade(ctx, n, 250), 250 * ctx.sp);
    },
  },
  parasitic_demon: {
    desc: 'User flies over and merges into the target, who is then hit by a purple aura.',
    async play(ctx) {
      const to = ctx.tos[0]; const g = ghostOf(ctx, ctx.from, 0.7);
      ctx.userEl.animate([{ opacity: 1 }, { opacity: 0, offset: 0.15 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1400 * ctx.sp });
      await fly(ctx, g, ctx.from, to, 380, { rotate: 0, scale: [1, 0.6] });
      await g.animate([{ opacity: 0.7 }, { opacity: 0 }], { duration: 250 * ctx.sp, fill: 'forwards' }).finished.catch(() => {}); g.remove();
      glowAura(ctx, ctx.targetEls[0], '#b44bff', 900); boom(ctx, to, '#b44bff', 120); shake(ctx); await wait(300 * ctx.sp);
    },
  },
  insect_swarm: {
    desc: 'User sends a swarm of small black insects that engulfs the target.',
    async play(ctx) { const bugs = await swarm(ctx, ctx.tos[0], 'ball'); shake(ctx); await wait(700 * ctx.sp); bugs.forEach((b) => fade(ctx, b, 300)); },
  },
  partial_expansion: {
    desc: 'User grows a giant arm and strikes the enemies with it.',
    async play(ctx) {
      const box = sideBox(ctx); const tgt = { x: box.c.x, y: box.c.y };
      const arm = (len) => `<svg width="${len + 84}" height="96" viewBox="0 0 ${len + 84} 96"><path d="M0 34Q${len / 2} 24 ${len} 26V70Q${len / 2} 72 0 62Z" fill="#e8b98e" stroke="#7a4a2a" stroke-width="3"/><g transform="translate(${len - 8} 0)" stroke="#7a4a2a" stroke-width="3" stroke-linejoin="round"><path d="M4 22C10 12 30 8 52 10 72 12 86 24 86 48 86 72 72 86 52 88 30 90 10 84 4 74Z" fill="#f0c49a"/><path d="M60 12C74 12 84 20 84 30 84 36 78 38 72 37M62 32C76 32 86 38 86 48 86 54 80 56 74 55M62 51C76 51 86 57 85 66 84 72 78 74 72 73M58 69C70 70 80 76 78 82 76 87 68 88 62 86" fill="#f4caa2"/><path d="M60 12V86" fill="none"/><path d="M20 40C30 34 46 34 56 40 60 44 58 52 50 52 40 52 28 50 20 52Z" fill="#f4caa2"/><path d="M50 40C54 42 56 46 54 50" fill="none" stroke-width="2"/></g></svg>`;
      const n = await stretch(ctx, ctx.from, between(ctx.from, tgt, 0.8), arm, 380, 1500);
      n.animate([{ transform: `translate(0,-50%) rotate(${ang(ctx.from, tgt) - 14}deg)` }, { transform: `translate(0,-50%) rotate(${ang(ctx.from, tgt) + 14}deg)` }], { duration: 300 * ctx.sp, fill: 'forwards' });
      await wait(200 * ctx.sp);
      ctx.tos.forEach((t) => boom(ctx, t, '#ffffff', 100)); shake(ctx);
      setTimeout(() => fade(ctx, n, 300), 250 * ctx.sp);
    },
  },
  passing_fang: {
    desc: 'User flies at high speed and bites the target.',
    async play(ctx) {
      const to = await lunging(ctx, 0.78, 380);
      const bite = spawn(ctx, '<svg width="60" height="44" viewBox="0 0 40 30"><path d="M4 8Q20 0 36 8M4 22Q20 30 36 22" stroke="#fff" stroke-width="3" fill="none"/><path d="M10 7v6M16 5v7M22 5v7M28 6v6M10 23v-6M16 25v-7M22 25v-7M28 24v-6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>', to, { life: 800 });
      bite.animate([{ transform: 'translate(-50%,-50%) scaleY(1.6)', opacity: 0 }, { transform: 'translate(-50%,-50%) scaleY(.6)', opacity: 1, offset: 0.4 }, { transform: 'translate(-50%,-50%) scaleY(.6)', opacity: 0 }], { duration: 500 * ctx.sp, fill: 'forwards' });
      shake(ctx);
    },
  },
  susanoo_sword: {
    desc: 'User swings a giant sword that strikes every enemy at once, with a blue aura on the strike.',
    async play(ctx) {
      const box = sideBox(ctx); const len = Math.hypot(box.c.x - ctx.from.x, box.c.y - ctx.from.y) + box.w * 0.3;
      const sword = `<svg width="${len}" height="34" viewBox="0 0 ${len} 34" style="filter:drop-shadow(0 0 14px #4aa3ff)"><rect x="0" y="12" width="60" height="10" rx="4" fill="#3a5aa8"/><path d="M60 4H${len - 40}L${len} 17 ${len - 40} 30H60Z" fill="#9fd8ffcc" stroke="#e6f6ff" stroke-width="2"/></svg>`;
      const s = spawn(ctx, sword, ctx.from, { life: 1400 }); s.style.transformOrigin = '0 50%';
      const a = ang(ctx.from, box.c); const sw = ctx.isFoe ? 60 : -60;
      await s.animate([{ transform: `translate(0,-50%) rotate(${a + sw}deg)`, opacity: 0 }, { transform: `translate(0,-50%) rotate(${a + sw}deg)`, opacity: 1, offset: 0.35 }, { transform: `translate(0,-50%) rotate(${a - sw * 0.3}deg)`, opacity: 1 }], { duration: 650 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      ctx.tos.forEach((t) => { slashArc(ctx, t, { size: 140, rot: 30 }); boom(ctx, t, '#6cc4ff', 130); }); shake(ctx); fade(ctx, s, 300);
    },
  },
  poison_extraction: { desc: 'User moves over to the ally and applies a green healing aura to them.', play: (ctx) => ANIMS.antidote.play(ctx) },
  hanzo_kusarigama: {
    desc: 'User strikes the target with their sickle; the hit has a purple aura.',
    async play(ctx) {
      const to = ctx.tos[0];
      const sickle = (len) => `<svg width="${len + 30}" height="40" viewBox="0 0 ${len + 30} 40"><path d="M0 20H${len}" stroke="#b9c0c8" stroke-width="3" stroke-dasharray="6 3"/><path d="M${len} 20V8" stroke="#6b4a2a" stroke-width="4"/><path d="M${len} 8C${len + 20} 6 ${len + 30} 18 ${len + 26} 30 ${len + 20} 18 ${len + 12} 12 ${len} 12Z" fill="#c9ced6" stroke="#444" stroke-width="1.5"/></svg>`;
      const n = await stretch(ctx, ctx.from, between(ctx.from, to, 0.9), sickle, 300, 1300);
      slashArc(ctx, to, { color: '#d9b3ff', glow: '#7a2bd6', size: 110, rot: 60 }); boom(ctx, to, '#b44bff', 90); shake(ctx);
      setTimeout(() => fade(ctx, n, 250), 250 * ctx.sp);
    },
  },
  poison_mist: {
    desc: 'User sprays a purple poison cloud over every enemy.',
    async play(ctx) { for (let i = 0; i < 3; i++) puff(ctx, { x: ctx.from.x + (ctx.isFoe ? -30 : 30), y: ctx.from.y - 30 }, '#9a3bdc', 70); const { fog, go } = mistOver(ctx, '#9a3bdc'); await go; shake(ctx); setTimeout(() => fade(ctx, fog, 600), 700 * ctx.sp); },
  },
  poison_bomb: {
    desc: 'User throws a round smoke bomb at the enemies that bursts into a purple poison cloud.',
    async play(ctx) {
      const box = sideBox(ctx);
      const b = spawn(ctx, '<div style="width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#8a8f99,#2a2d33);border:1.5px solid #111"></div>', ctx.from, { life: 1200 });
      await fly(ctx, b, ctx.from, box.c, 480, { rotate: 0, arc: 90, ease: 'ease-in-out' }); b.remove();
      const c = purpleCloud(ctx, box.c, box.w + 140, box.h + 60);
      await grow(ctx, c, 380, 'scale(.1)', 'scale(1)'); shake(ctx); setTimeout(() => fade(ctx, c, 600), 600 * ctx.sp);
    },
  },
  preta_absorb: {
    desc: 'A transparent red ring of aura spreads around the user.',
    async play(ctx) {
      const { h } = ctx.userSize;
      const r = spawn(ctx, `<div style="width:${h * 0.9}px;height:${h * 0.9}px;border-radius:50%;background:radial-gradient(circle,#ff2a2a00 40%,#ff2a2a44 62%,#ff2a2a00 72%);border:3px solid #ff5a5a88;box-shadow:0 0 18px #ff2a2a88"></div>`, ctx.from, { life: 1800 });
      await grow(ctx, r, 450, 'scale(.3)', 'scale(1)');
      for (let i = 0; i < 10; i++) { const st = { x: ctx.tos[0].x + rnd(-30, 30), y: ctx.tos[0].y + rnd(-40, 40) }; const d = spawn(ctx, '<div style="width:8px;height:8px;border-radius:50%;background:#ff8a8a;box-shadow:0 0 6px #ff2a2a"></div>', st, { life: 900 }); fly(ctx, d, st, ctx.from, 500, { rotate: 0, ease: 'ease-in' }).then(() => d.remove()); }
      shake(ctx); await wait(600 * ctx.sp); fade(ctx, r, 300);
    },
  },
  puppet_switch: {
    desc: 'When the user is struck, they turn into a puppet (the grey-brown, four-armed Crow puppet).',
    async play(ctx) { FX.ring(ctx.arena, ctx.userEl, 'aura'); await wait(400 * ctx.sp); },
    decoy(ctx, el) {
      const f = feetOf({ arena: ctx.arena }, el); const { h } = sizeOf(el);
      el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.08 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1500 * ctx.sp });
      const p = spawn(ctx, ART2.puppet().replace('width="125" height="150"', `width="${h * 0.6}" height="${h * 0.72}"`), { x: f.x, y: f.y - h * 0.36 }, { life: 1700 });
      p.animate([{ transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 }, { transform: 'translate(-50%,-50%) rotate(-10deg)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-50%) rotate(6deg)', opacity: 1, offset: 0.4 }, { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1, offset: 0.8 }, { transform: 'translate(-50%,-50%)', opacity: 0 }], { duration: 1400 * ctx.sp, fill: 'forwards' });
    },
  },
  rasengan: { desc: 'User forms a small blue spiraling orb, dashes in and strikes the target with it.', play: (ctx) => rasenganStrike(ctx, 44) },
  massive_rasengan: { desc: 'User forms a massive blue spiraling orb, dashes in and strikes the target with it.', play: (ctx) => rasenganStrike(ctx, 110) },
  thrown_rasenshuriken: {
    desc: "User forms a large blue spiraling orb with four spinning fins and throws it at the enemies' side, where it bursts into an expanding blue dome that hits every enemy.",
    async play(ctx) {
      const box = sideBox(ctx); const hand = { x: ctx.from.x, y: ctx.from.y - ctx.userSize.h * 0.45 };
      const rs = spawn(ctx, `<div style="position:relative;width:140px;height:140px"><div class="ax-spin" style="position:absolute;inset:0;animation-duration:.25s;background:conic-gradient(#e8f6ff 0 8deg,#0000 8deg 90deg,#e8f6ff 90deg 98deg,#0000 98deg 180deg,#e8f6ff 180deg 188deg,#0000 188deg 270deg,#e8f6ff 270deg 278deg,#0000 278deg);-webkit-mask:radial-gradient(circle,#0000 30%,#000 32%,#000 70%,#0000 71%);mask:radial-gradient(circle,#0000 30%,#000 32%,#000 70%,#0000 71%);filter:drop-shadow(0 0 8px #9fd8ff)"></div><div style="position:absolute;left:35px;top:35px">${ART.rasengan(70)}</div></div>`, hand, { life: 2400 });
      await pop(ctx, rs, 400); await wait(200 * ctx.sp);
      await fly(ctx, rs, hand, box.c, 480, { rotate: 0, arc: 40, ease: 'ease-in' }); rs.remove();
      const d = box.w + 160;
      const dome = spawn(ctx, `<div style="width:${d}px;height:${d * 0.7}px;border-radius:50%;background:radial-gradient(ellipse,#ffffff 0%,#cfeeffcc 30%,#6cb8ff88 55%,#6cb8ff00 72%);box-shadow:0 0 30px #6cb8ff"></div>`, box.c, { life: 1600 });
      await grow(ctx, dome, 420, 'scale(.05)', 'scale(1)'); shake(ctx); fade(ctx, dome, 500);
    },
  },
  reaper_death_seal: {
    desc: 'User flies in and strikes the target; a Shinigami mask appears over both of them and both take damage.',
    async play(ctx) {
      const to = await lunging(ctx, 0.7, 500); boom(ctx, to, '#b44bff', 100);
      await wait(300 * ctx.sp); // let the user finish the lunge and settle back
      const masks = [[ctx.userEl, ctx.from, ctx.userSize], [ctx.targetEls[0], ctx.tos[0], sizeOf(ctx.targetEls[0])]].map(([el, c, sz]) => {
        const img = el.querySelector('img'); const ir = img?.getBoundingClientRect(); const a = ctx.arena.getBoundingClientRect();
        const headY = ir && ir.height > 10 ? ir.top - a.top + ir.height * 0.15 : c.y - sz.h * 0.4;
        const m = spawn(ctx, ART7.shinigami(Math.max(56, sz.h * 0.22)), { x: c.x, y: headY }, { life: 1800 }); pop(ctx, m, 300); return m;
      });
      await wait(650 * ctx.sp); shake(ctx); shakeEl(ctx.userEl); await wait(300 * ctx.sp); masks.forEach((m) => fade(ctx, m, 300));
    },
  },
  hundred_puppets: {
    desc: 'A host of human-shaped puppets in red robes, tied to the user by blue chakra threads, appear above the user and fly in one by one to strike every enemy.',
    async play(ctx) {
      const { h } = ctx.userSize; const top = { x: ctx.from.x, y: Math.max(30, ctx.from.y - h * 0.75) };
      const ps = Array.from({ length: 9 }, (_, i) => { const at = { x: top.x + (i - 4) * 26, y: top.y + (i % 2) * 18 }; const p = spawn(ctx, ART7.puppetRed(h * 0.3), at, { life: 4200 }); p.style.opacity = '0'; setTimeout(() => pop(ctx, p, 150), i * 40 * ctx.sp); return [p, at]; });
      await wait(500 * ctx.sp);
      const hands = { x: ctx.from.x, y: ctx.from.y - h * 0.1 };
      for (const [i, [p, at]] of ps.entries()) {
        const ti = i % ctx.tos.length; const t = ctx.tos[ti];
        const th = await stretch(ctx, hands, at, (len) => `<svg width="${len}" height="4" viewBox="0 0 ${len} 4"><path d="M0 2H${len}" stroke="#8fd3ff" stroke-width="1.2" style="filter:drop-shadow(0 0 2px #4aa3ff)"/></svg>`, 60, 1400);
        fly(ctx, p, at, { x: t.x + rnd(-20, 20), y: t.y + rnd(-30, 10) }, 260, { rotate: 0, ease: 'ease-in' }).then(() => { boom(ctx, t, '#ffffff', 60); shakeEl(ctx.targetEls[ti]); fade(ctx, p, 250); fade(ctx, th, 250); });
        await wait(110 * ctx.sp);
      }
      await wait(300 * ctx.sp);
    },
  },
  habanero_fury: {
    desc: 'User flies in and strikes the target with a flurry of red-glowing blows.',
    async play(ctx) { ctx.userEl.animate([{ filter: 'none' }, { filter: 'drop-shadow(0 0 12px #ff2a2a)', offset: 0.2 }, { filter: 'drop-shadow(0 0 12px #ff2a2a)', offset: 0.85 }, { filter: 'none' }], { duration: 1100 * ctx.sp }); await flurryIn(ctx, 7, '#ff4a4a'); },
  },
  reverse_tetragram: {
    desc: 'The Four Symbols Seal appears on the user, then a spray of black aura shoots from it at the target and engulfs them in a semi-transparent black orb.',
    async play(ctx) {
      const to = ctx.tos[0]; const { h } = sizeOf(ctx.targetEls[0]);
      const s = spawn(ctx, ART7.fourSymbols(Math.max(80, ctx.userSize.h * 0.42)), ctx.from, { life: 2600 });
      await s.animate([{ transform: 'translate(-50%,-50%) scale(1.8) rotate(-90deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 }], { duration: 400 * ctx.sp, fill: 'forwards' }).finished.catch(() => {});
      for (let i = 0; i < 18; i++) { const d = spawn(ctx, `<div style="width:${rnd(10, 20)}px;height:${rnd(10, 20)}px;border-radius:50%;background:#050505;box-shadow:0 0 8px #000"></div>`, ctx.from, { life: 900 }); fly(ctx, d, ctx.from, { x: to.x + rnd(-30, 30), y: to.y + rnd(-40, 40) }, 340, { rotate: 0, arc: rnd(-30, 30) }).then(() => d.remove()); await wait(18 * ctx.sp); }
      await wait(300 * ctx.sp);
      const orb = spawn(ctx, `<div style="width:${h * 0.95}px;height:${h * 0.95}px;border-radius:50%;background:radial-gradient(circle,#00000055,#000000aa 65%,#000000cc);box-shadow:0 0 20px #000"></div>`, to, { life: 1800 });
      await grow(ctx, orb, 300, 'scale(.2)', 'scale(1)'); shake(ctx); await wait(450 * ctx.sp); fade(ctx, orb, 300); fade(ctx, s, 300);
    },
  },
  insect_tackle: {
    desc: 'User flies in and strikes the target with their bug wings.',
    async play(ctx) {
      const { h } = ctx.userSize; const ws = [-1, 1].map((side) => { const w = spawn(ctx, `<div class="ax-flap" style="animation-duration:.12s">${ART2.wing(h * 0.42)}</div>`, ctx.from, { life: 1300, z: 5 }); w.style.transformOrigin = '0 50%'; w.style.transform = `translate(0,-50%) rotate(${side < 0 ? 200 : -20}deg)`; return w; });
      await wait(250 * ctx.sp); ws.forEach((w) => fade(ctx, w, 200));
      const to = await lunging(ctx, 0.72, 460); slashArc(ctx, to, { color: '#ffe9a8', glow: '#ffcf5a', size: 120, rot: 20 }); shake(ctx);
    },
  },
  ritual_stab: {
    desc: 'User stabs themself with a black spike.',
    async play(ctx) {
      const { h } = ctx.userSize; const at = { x: ctx.from.x, y: ctx.from.y };
      const s = spawn(ctx, ART.spike(70, '#0d0d0d'), { x: at.x + (ctx.isFoe ? 60 : -60), y: at.y - h * 0.2 }, { life: 1200 });
      await fly(ctx, s, { x: at.x + (ctx.isFoe ? 60 : -60), y: at.y - h * 0.2 }, at, 260, { ease: 'ease-in' });
      boom(ctx, at, '#8a1020', 90); shakeEl(ctx.userEl); await wait(400 * ctx.sp); fade(ctx, s, 250);
    },
  },
  sage_arm_cannon: {
    desc: 'User fires a high-speed volley of blue chakra at the target.',
    async play(ctx) { for (let i = 0; i < 9; i++) { const b = spawn(ctx, '<div style="width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,#fff,#8fd3ff 45%,#4aa3ff00 72%);box-shadow:0 0 12px #4aa3ff"></div>', ctx.from, { life: 600 }); fly(ctx, b, ctx.from, { x: ctx.tos[0].x + rnd(-14, 14), y: ctx.tos[0].y + rnd(-20, 20) }, 180, { rotate: 0, ease: 'linear' }).then(() => { b.remove(); boom(ctx, ctx.tos[0], '#6cc4ff', 60); shake(ctx); }); await wait(55 * ctx.sp); } await wait(200 * ctx.sp); },
  },
  inorganic_animation: {
    desc: 'The ground under the enemies turns into chaotic earth spikes that hit each of them.',
    async play(ctx) {
      ctx.targetEls.forEach((el) => { const f = feetOf(ctx, el); const { h } = sizeOf(el); for (let i = 0; i < 6; i++) { const n = spawn(ctx, `<svg width="22" height="${h * rnd(0.4, 0.8)}" viewBox="0 0 22 100" preserveAspectRatio="none"><path d="M11 0 22 100H0Z" fill="#8a7f72" stroke="#4e463e" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`, { x: f.x + rnd(-50, 50), y: f.y + rnd(-4, 8) }, { life: 1500 }); n.style.transform = `translate(-50%,-100%) rotate(${rnd(-25, 25)}deg) scaleY(0)`; n.style.transformOrigin = '50% 100%'; n.animate([{ transform: `translate(-50%,-100%) rotate(${rnd(-25, 25)}deg) scaleY(0)` }, { transform: `translate(-50%,-100%) rotate(${rnd(-25, 25)}deg) scaleY(1)` }], { duration: 200 * ctx.sp, delay: rnd(0, 200) * ctx.sp, fill: 'both' }); setTimeout(() => fade(ctx, n, 300), 900 * ctx.sp); } });
      await wait(350 * ctx.sp); shake(ctx);
    },
  },
  snake_dragon: {
    desc: 'User fires a red, semi-transparent, wingless long-bodied chakra dragon at the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const d = spawn(ctx, ART7.redDragon(180), ctx.from, { life: 1300 });
      if (to.x < ctx.from.x) d.firstElementChild.style.transform = 'scaleX(-1)';
      d.firstElementChild.animate([{ translate: '0 0' }, { translate: '0 -8px' }, { translate: '0 6px' }, { translate: '0 0' }], { duration: 300 * ctx.sp, iterations: 3 });
      await fly(ctx, d, ctx.from, to, 520, { rotate: 0, ease: 'ease-in' }); d.remove();
      boom(ctx, to, '#ff3a3a', 150); shake(ctx);
    },
  },
  thousand_hands: {
    desc: 'A giant wooden Buddha with many hands appears behind the enemies and strikes each of them many times.',
    async play(ctx) {
      const box = sideBox(ctx);
      const bw = Math.min(box.w * 1.05, (box.y2 - 10) / 0.9 * 1.0); const b = spawn(ctx, ART7.buddha(bw), { x: box.c.x, y: Math.max(bw * 0.45, box.y1 + box.h * 0.2) }, { life: 3200, z: 1 });
      await b.animate([{ transform: 'translate(-50%,-50%) translateY(60px)', opacity: 0 }, { transform: 'translate(-50%,-50%) translateY(0)', opacity: 0.95 }], { duration: 500 * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      for (let i = 0; i < 15; i++) { const ti = i % ctx.tos.length; const t = ctx.tos[ti]; const st = { x: box.c.x + rnd(-box.w * 0.5, box.w * 0.5), y: box.y1 - 20 }; const fist = spawn(ctx, ART3.rockFist(44).replaceAll('#8a7f72', '#9b6b3e').replaceAll('#4e463e', '#5a3a1e').replaceAll('#5f564c', '#6b4626'), st, { life: 700, z: 7 }); fly(ctx, fist, st, { x: t.x + rnd(-20, 20), y: t.y + rnd(-30, 20) }, 180, { rotate: 0, ease: 'ease-in' }).then(() => { fist.remove(); boom(ctx, t, '#d9b38a', 60); shakeEl(ctx.targetEls[ti]); }); await wait(60 * ctx.sp); }
      await wait(250 * ctx.sp); fade(ctx, b, 400);
    },
  },
  white_rage: {
    desc: 'User sends out a sound wave that strikes each enemy.',
    async play(ctx) {
      for (let k = 0; k < 4; k++) { const r = spawn(ctx, '<div style="width:80px;height:80px;border-radius:50%;border:4px solid #ffffffcc;box-shadow:0 0 12px #fff"></div>', ctx.from, { life: 900 }); const far = Math.max(...ctx.tos.map((t) => Math.hypot(t.x - ctx.from.x, t.y - ctx.from.y))) * 2.2 / 80; r.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: `translate(-50%,-50%) scale(${far})`, opacity: 0 }], { duration: 600 * ctx.sp, easing: 'ease-out', fill: 'forwards' }); await wait(110 * ctx.sp); }
      await wait(200 * ctx.sp); shake(ctx);
    },
  },
  saiken_bomb: { desc: 'A black orb with a purple aura and tiny blue and red sparks grows in front of the user, then fires at the enemies.', play: (ctx) => ANIMS.chomei_bomb.play(ctx) },
  salamander_guard: {
    desc: 'A large grey-brown salamander drops down in front of the user.',
    async play(ctx) { const f = feetOf(ctx, ctx.userEl); const at = { x: f.x + (ctx.isFoe ? -60 : 60), y: f.y - 50 }; const s = spawn(ctx, ART7.salamander(200), { x: at.x, y: at.y - 200 }, { life: 2000, z: 7 }); if (ctx.isFoe) s.firstElementChild.style.transform = 'scaleX(-1)'; await fly(ctx, s, { x: at.x, y: at.y - 200 }, at, 300, { rotate: 0, ease: 'ease-in' }); puff(ctx, { x: at.x, y: f.y }, '#b9a689', 120); await wait(800 * ctx.sp); fade(ctx, s, 350); },
  },
  salamander_shield: {
    desc: "Kankuro's Salamander puppet (segmented grey-brown body, dark fin along its back) drops down in front of the whole ally team.",
    async play(ctx) { const box = sideBox(ctx); const at = { x: box.c.x + (ctx.isFoe ? -30 : 30), y: box.y2 - box.h * 0.45 }; const s = spawn(ctx, ART7.salamanderPuppet(Math.min(520, box.w * 0.85)), { x: at.x, y: at.y - 260 }, { life: 2200, z: 7 }); if (ctx.isFoe) s.firstElementChild.style.transform = 'scaleX(-1)'; await fly(ctx, s, { x: at.x, y: at.y - 260 }, at, 340, { rotate: 0, ease: 'ease-in' }); for (let i = 0; i < 4; i++) puff(ctx, { x: at.x + rnd(-box.w / 2, box.w / 2), y: box.y2 }, '#b9a689', 120); await wait(900 * ctx.sp); fade(ctx, s, 350); },
  },
  samehada_shred: {
    desc: 'User dashes in and slashes the target with Samehada.',
    async play(ctx) { const to = ctx.tos[0]; const hit = lunge(ctx, to, 0.62, 560); const b = spawn(ctx, ART7.samehada(160), ctx.from, { life: 1100 }); if (ctx.isFoe) b.firstElementChild.style.transform = 'scaleX(-1)'; await fly(ctx, b, ctx.from, hit, 260, { rotate: ctx.isFoe ? 30 : -30, ease: 'ease-in-out' }); slashArc(ctx, to, { color: '#9fb4ff', glow: '#3a5aa8', size: 150, rot: 40 }); shake(ctx); fade(ctx, b, 250); },
  },
  samurai_stance: { desc: 'The user glows with a silver aura.', async play(ctx) { glowAura(ctx, ctx.userEl, '#dfe6ef', 1200); await wait(600 * ctx.sp); } },
});

// ---------------------------------------------------------------- batch 8 (sheet rows 268–305)
const ART8 = {
  sandStar: (s = 34) => `<svg width="${s}" height="${s}" viewBox="-10 -10 20 20" class="ax-spin"><path d="M0-10 2-2 10 0 2 2 0 10-2 2-10 0-2-2Z" fill="#d9b56a" stroke="#8a6a3a" stroke-width=".8"/><circle r="2" fill="#a8864e"/></svg>`,
  scythe: (s = 90) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100" class="ax-spin" style="animation-duration:.3s"><path d="M50 8V96" stroke="#3a3a3a" stroke-width="5" stroke-linecap="round"/>${[8, 26, 44].map((y, k) => `<path d="M50 ${y}C${66 + k * 2} ${y - 4} ${86 - k * 4} ${y + 4} ${94 - k * 6} ${y + 20 - k * 2} ${80 - k * 4} ${y + 12} ${66} ${y + 10} 50 ${y + 12}Z" fill="#c8202a" stroke="#5a0a10" stroke-width="2"/>`).join('')}</svg>`,
  heart: (s = 34) => `<svg width="${s}" height="${s}" viewBox="0 0 20 20" style="filter:drop-shadow(0 0 6px #ff6fb5)"><path d="M10 18C2 12 0 8 2 4 4 0 9 1 10 5 11 1 16 0 18 4 20 8 18 12 10 18Z" fill="#ff7ec0" stroke="#fff" stroke-width="1"/></svg>`,
  web: (s = 120, c = '#ffd65a') => `<svg width="${s}" height="${s}" viewBox="0 0 100 100" style="filter:drop-shadow(0 0 6px ${c})"><g stroke="${c}" stroke-width="2" fill="none">${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `<path d="M50 50L${50 + Math.cos(a) * 48} ${50 + Math.sin(a) * 48}"/>`; }).join('')}${[12, 24, 36, 47].map((r) => `<path d="${Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return `${i ? 'L' : 'M'}${50 + Math.cos(a) * r} ${50 + Math.sin(a) * r}`; }).join('')}"/>`).join('')}</g></svg>`,
  goldBow: (s = 110) => `<svg width="${s * 0.5}" height="${s}" viewBox="0 0 50 100" style="filter:drop-shadow(0 0 8px #ffd65a)"><path d="M8 4C44 30 44 70 8 96" stroke="#e6b422" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M8 4V96" stroke="#fff3b0" stroke-width="1.4"/></svg>`,
  goldArrow: (l = 90) => `<svg width="${l}" height="16" viewBox="0 0 ${l} 16" style="filter:drop-shadow(0 0 8px #ffd65a)"><path d="M0 8H${l - 18}" stroke="#e6b422" stroke-width="4"/><path d="M${l - 22} 1 ${l} 8 ${l - 22} 15Z" fill="#fff3b0" stroke="#e6b422" stroke-width="2"/><path d="M0 2 10 8 0 14" fill="none" stroke="#e6b422" stroke-width="2"/></svg>`,
  plainBall: (s = 120) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#8b5a32" stroke="#4a2c16" stroke-width="3"/><path d="M14 40Q50 26 86 40M10 58Q50 48 90 60M24 78Q50 70 76 80" stroke="#5a3820" stroke-width="3" fill="none"/></svg>`,
};
const shadowStrip = (len) => `<svg width="${len}" height="22" viewBox="0 0 ${len} 22"><path d="M0 11C${len * 0.3} 4 ${len * 0.6} 18 ${len} 11" stroke="#050505" stroke-width="12" fill="none" stroke-linecap="round" opacity=".88"/></svg>`;

async function boulderRoll(ctx, spiked) {
  const to = ctx.tos[0]; const { h } = ctx.userSize;
  ctx.userEl.animate([{ opacity: 1 }, { opacity: 0, offset: 0.12 }, { opacity: 0, offset: 0.88 }, { opacity: 1 }], { duration: 1400 * ctx.sp });
  puff(ctx, ctx.from, '#ffffff', 100);
  const b = spawn(ctx, `<div class="ax-spin" style="animation-duration:.3s">${(spiked ? ART5.spikeBall : ART8.plainBall)(h * 0.6)}</div>`, ctx.from, { life: 1800 });
  await grow(ctx, b, 250, 'scale(.2)', 'scale(1)');
  await fly(ctx, b, ctx.from, to, 380, { rotate: 0, ease: 'ease-in' });
  boom(ctx, to, '#d9b38a', 150); shake(ctx);
  await fly(ctx, b, to, ctx.from, 400, { rotate: 0, ease: 'ease-out' });
  b.remove(); puff(ctx, ctx.from, '#ffffff', 90);
}
/** A shadow creeping along the ground from the user's feet to a unit's feet. */
function shadowTo(ctx, el, ms = 420) { return stretch(ctx, feetOf(ctx, ctx.userEl), feetOf(ctx, el), shadowStrip, ms, 2400); }
function sandWave(ctx, a, b, w, h, ms = 520) {
  const wv = spawn(ctx, `<div style="width:${w}px;height:${h}px;border-radius:50% 50% 20% 20%;background:radial-gradient(ellipse at 50% 30%,#f2deb0,#d9b56a 50%,#a8864e);box-shadow:0 0 14px #c9a86b"></div>`, a, { life: ms + 1200 });
  return fly(ctx, wv, a, b, ms, { rotate: 0, scale: [0.1, 1], ease: 'ease-in' }).then(() => wv);
}
const sandGrains = (ctx, at, spread, n = 30) => Array.from({ length: n }, () => { const d = spawn(ctx, `<div style="width:${rnd(4, 8)}px;height:${rnd(4, 8)}px;border-radius:50%;background:#d9b56a"></div>`, { x: at.x + rnd(-spread, spread), y: at.y + rnd(-spread * 0.4, spread * 0.4) }, { life: 1200 }); return d; });

Object.assign(ANIMS, {
  human_boulder: { desc: 'User turns into a round brown ball and rolls into the target.', play: (ctx) => boulderRoll(ctx, false) },
  spiked_boulder: { desc: 'User turns into a spiky brown ball and rolls into the target.', play: (ctx) => boulderRoll(ctx, true) },
  sand_burial: {
    desc: 'Sand gathers beneath the target and they sink into it, staying buried until the animation ends.',
    async play(ctx) {
      const el = ctx.targetEls[0]; const f = feetOf(ctx, el); const { h } = sizeOf(el);
      const total = 2100;
      const pool = spawn(ctx, '<div style="width:170px;height:44px;border-radius:50%;background:radial-gradient(ellipse,#e8cf96,#c9a86b 55%,#c9a86b00 72%)"></div>', f, { life: total + 600, z: 1 });
      await pop(ctx, pool, 300);
      const mound = spawn(ctx, `<div style="width:130px;height:${h * 0.42}px;border-radius:50% 50% 10% 10%;background:radial-gradient(ellipse at 50% 30%,#f2deb0,#d9b56a 55%,#a8864e)"></div>`, { x: f.x, y: f.y + 6 }, { life: total + 600, z: 4 });
      rise(ctx, mound, 600);
      el.animate([{ clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' }, { clipPath: 'inset(0 0 100% 0)', transform: `translateY(${h}px)`, offset: 0.3 }, { clipPath: 'inset(0 0 100% 0)', transform: `translateY(${h}px)`, offset: 0.88 }, { clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' }], { duration: total * ctx.sp, easing: 'ease-in-out' });
      await wait(total * 0.4 * ctx.sp);
      for (let i = 0; i < 3; i++) { boom(ctx, { x: f.x + rnd(-30, 30), y: f.y - h * 0.15 }, '#d9b56a', 120); await wait(120 * ctx.sp); }
      shake(ctx); mound.animate([{ translate: '0 0' }, { translate: '0 6px' }, { translate: '0 0' }], { duration: 220 * ctx.sp, iterations: 2 });
      await wait(total * 0.3 * ctx.sp);
      fade(ctx, mound, 300); fade(ctx, pool, 300);
      await wait(total * 0.12 * ctx.sp);
    },
  },
  sand_coffin: {
    desc: 'Sand forms around the target and binds them.',
    async play(ctx) {
      const to = ctx.tos[0]; const el = ctx.targetEls[0]; const { w, h } = sizeOf(el);
      const grains = sandGrains(ctx, { x: to.x, y: to.y + h * 0.4 }, h * 0.5, 40);
      grains.forEach((g) => { const st = { x: parseFloat(g.style.left), y: parseFloat(g.style.top) }; fly(ctx, g, st, { x: to.x + rnd(-w * 0.3, w * 0.3), y: to.y + rnd(-h * 0.4, h * 0.4) }, 380, { rotate: 0, ease: 'ease-in' }).then(() => fade(ctx, g, 300)); });
      await wait(320 * ctx.sp);
      const c = spawn(ctx, `<div style="width:${w * 0.85}px;height:${h * 0.9}px;border-radius:30% 30% 12% 12%;background:repeating-linear-gradient(170deg,#0000 0 12px,#a8864e66 12px 14px),radial-gradient(ellipse at 50% 30%,#f2deb0,#d9b56a 55%,#a8864e);opacity:.92"></div>`, to, { life: 1800 });
      await grow(ctx, c, 260, 'scaleY(.2)', 'scaleY(1)'); shake(ctx); await wait(600 * ctx.sp); fade(ctx, c, 300);
    },
  },
  sand_shuriken: {
    desc: 'User throws shuriken made of sand at every enemy.',
    async play(ctx) {
      await Promise.all(ctx.tos.flatMap((t, i) => [0, 1].map((k) => wait((k * 100 + i * 50) * ctx.sp).then(async () => {
        const s = spawn(ctx, ART8.sandStar(34), ctx.from, { life: 1200 });
        await fly(ctx, s, ctx.from, { x: t.x + rnd(-16, 16), y: t.y + rnd(-24, 16) }, 400, { rotate: 0, arc: rnd(-20, 40) });
        s.remove(); boom(ctx, t, '#d9b56a', 70); shakeEl(ctx.targetEls[i]);
      }))));
    },
  },
  sand_tsunami: {
    desc: 'User sends a massive wave of sand crashing into every enemy.',
    async play(ctx) { const box = sideBox(ctx); const wv = await sandWave(ctx, ctx.from, box.c, box.w + 140, box.h * 1.1, 600); ctx.tos.forEach((t) => boom(ctx, t, '#d9b56a', 120)); shake(ctx); fade(ctx, wv, 400); },
  },
  sand_waterfall_funeral: {
    desc: 'Huge amounts of sand pour down from above onto the enemy team.',
    async play(ctx) {
      const box = sideBox(ctx);
      for (let i = 0; i < 70; i++) {
        const x = rnd(box.x1 - 30, box.x2 + 30); const st = { x, y: -20 };
        const d = spawn(ctx, `<div style="width:${rnd(8, 18)}px;height:${rnd(18, 36)}px;border-radius:40%;background:#d9b56a;box-shadow:0 0 4px #a8864e"></div>`, st, { life: 1000 });
        fly(ctx, d, st, { x, y: rnd(box.y1 + box.h * 0.4, box.y2) }, rnd(300, 420), { rotate: 0, ease: 'ease-in' }).then(() => d.remove());
        await wait(8 * ctx.sp);
      }
      await wait(300 * ctx.sp);
      const pile = spawn(ctx, `<div style="width:${box.w + 120}px;height:${box.h * 0.45}px;border-radius:50% 50% 8px 8px;background:radial-gradient(ellipse at 50% 30%,#f2deb0,#d9b56a 55%,#a8864e)"></div>`, { x: box.c.x, y: box.y2 + 10 }, { life: 1800, z: 7 });
      await rise(ctx, pile, 300); shake(ctx); await wait(500 * ctx.sp); fade(ctx, pile, 350);
    },
  },
  scythe_throw: {
    desc: 'User throws their three-bladed scythe at the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const s = spawn(ctx, ART8.scythe(84), ctx.from, { life: 1600 });
      const cable = (len) => `<svg width="${len}" height="4" viewBox="0 0 ${len} 4"><path d="M0 2H${len}" stroke="#3a3a3a" stroke-width="1.6"/></svg>`;
      stretch(ctx, ctx.from, to, cable, 380, 1400).then((c) => setTimeout(() => fade(ctx, c, 250), 400 * ctx.sp));
      await fly(ctx, s, ctx.from, to, 380, { rotate: 0, arc: 30 });
      FX.fx(ctx.arena, 'slash', to); shake(ctx);
      await fly(ctx, s, to, ctx.from, 360, { rotate: 0, arc: -30 }); s.remove();
    },
  },
  hashirama_regen: { desc: 'User gives off a green healing aura.', async play(ctx) { glowAura(ctx, ctx.userEl, '#5dff8f', 1200); await wait(600 * ctx.sp); } },
  scale_powder: {
    desc: 'User sprays a light-green mist over the enemies.',
    async play(ctx) { const { fog, go } = mistOver(ctx, '#c8f5a8'); await go; ctx.targetEls.forEach((el) => el.animate([{ filter: 'none' }, { filter: 'brightness(1.8)' }, { filter: 'none' }], { duration: 600 * ctx.sp })); shake(ctx); setTimeout(() => fade(ctx, fog, 600), 700 * ctx.sp); },
  },
  haku_shield: {
    desc: 'User moves in front of the ally to take the hit.',
    async play(ctx) {
      const el = ctx.targetEls[0]; if (el === ctx.userEl) { glowAura(ctx, el, '#9fd8ff', 800); return wait(500 * ctx.sp); }
      const t = ctx.tos[0]; const front = { x: t.x + (ctx.isFoe ? -38 : 38), y: t.y + 4 };
      const dx = front.x - ctx.from.x; const dy = front.y - ctx.from.y;
      await ctx.userEl.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px)`, offset: 0.25 }, { transform: `translate(${dx}px,${dy}px)`, offset: 0.8 }, { transform: 'translate(0,0)' }], { duration: 1300 * ctx.sp, easing: 'ease-in-out' }).finished.catch(() => {});
    },
  },
  senbon_volley: {
    desc: 'User throws a volley of needles at the target.',
    async play(ctx) { for (let i = 0; i < 7; i++) { const st = { x: ctx.from.x, y: ctx.from.y + rnd(-14, 14) }; const n = spawn(ctx, ART4.needle(), st, { life: 700 }); fly(ctx, n, st, { x: ctx.tos[0].x + rnd(-14, 14), y: ctx.tos[0].y + rnd(-20, 20) }, 220, { ease: 'linear' }).then(() => n.remove()); await wait(40 * ctx.sp); } await wait(240 * ctx.sp); shake(ctx); },
  },
  seven_swords: {
    desc: 'User holds seven blades and flies in, spinning, to strike the target.',
    async play(ctx) {
      const to = ctx.tos[0];
      const ring = spawn(ctx, `<div class="ax-spin" style="animation-duration:.22s;width:0;height:0">${Array.from({ length: 7 }, (_, k) => `<div style="position:absolute;transform:rotate(${k * (360 / 7)}deg) translateX(26px)">${ART.blade(54)}</div>`).join('')}</div>`, ctx.from, { life: 1500 });
      await pop(ctx, ring, 200);
      ctx.userEl.animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${(to.x - ctx.from.x) * 0.65}px,${(to.y - ctx.from.y) * 0.65}px) rotate(720deg)`, offset: 0.5 }, { transform: 'translate(0,0) rotate(720deg)' }], { duration: 800 * ctx.sp });
      await fly(ctx, ring, ctx.from, between(ctx.from, to, 0.8), 380, { rotate: 0 });
      for (let i = 0; i < 3; i++) { FX.fx(ctx.arena, 'slash', to); shake(ctx); await wait(70 * ctx.sp); }
      fade(ctx, ring, 200);
    },
  },
  sexy_jutsu: { desc: 'User shoots a pink heart at the target.', async play(ctx) { puff(ctx, ctx.from, '#ffffff', 90); const hrt = spawn(ctx, ART8.heart(40), ctx.from, { life: 1200 }); await fly(ctx, hrt, ctx.from, ctx.tos[0], 520, { rotate: 0, arc: 40, ease: 'ease-in-out' }); hrt.remove(); boom(ctx, ctx.tos[0], '#ff7ec0', 90); shake(ctx); } },
  harem_jutsu: {
    desc: 'User shoots several pink hearts at the target.',
    async play(ctx) { puff(ctx, ctx.from, '#ffffff', 100); await Promise.all(Array.from({ length: 6 }, (_, i) => wait(i * 80 * ctx.sp).then(async () => { const st = { x: ctx.from.x + rnd(-30, 30), y: ctx.from.y + rnd(-40, 20) }; const hrt = spawn(ctx, ART8.heart(rnd(26, 40)), st, { life: 1200 }); await fly(ctx, hrt, st, { x: ctx.tos[0].x + rnd(-20, 20), y: ctx.tos[0].y + rnd(-30, 20) }, 520, { rotate: 0, arc: rnd(10, 60), ease: 'ease-in-out' }); hrt.remove(); }))); boom(ctx, ctx.tos[0], '#ff7ec0', 110); FX.ring(ctx.arena, ctx.targetEls[0], 'gen'); shake(ctx); },
  },
  shadow_clone_ambush: {
    desc: 'User creates several clones that attack every enemy.',
    async play(ctx) {
      const gs = ctx.tos.map((t, i) => { const at = { x: ctx.from.x + (i - 1) * 50, y: ctx.from.y + (i % 2) * 14 }; puff(ctx, at, '#ffffff', 90); const g = ghostOf(ctx, at, 0.95); g.firstElementChild.style.filter = 'none'; return [g, at, t, i]; });
      await wait(350 * ctx.sp);
      await Promise.all(gs.map(([g, at, t, i]) => wait(i * 60 * ctx.sp).then(() => fly(ctx, g, at, between(at, t, 0.85), 260, { rotate: 0, ease: 'ease-in' })).then(() => { boom(ctx, t, '#ffffff', 90); shakeEl(ctx.targetEls[i]); puff(ctx, between(at, t, 0.85), '#ffffff', 90); g.remove(); })));
    },
  },
  shadow_clone_scouts: {
    desc: 'User sends a clone to each enemy, each of which vanishes in a puff of smoke.',
    async play(ctx) {
      const box = sideBox(ctx); const foes = [...ctx.arena.querySelectorAll(`.mon.${ctx.isFoe ? 'you' : 'foe'}:not(.down) .spr`)];
      const tos = foes.length ? foes.map((e) => FX.centerOf(e, ctx.arena)) : [box.c];
      puff(ctx, ctx.from, '#ffffff', 100);
      await Promise.all(tos.map((t, i) => wait(i * 80 * ctx.sp).then(async () => { const g = ghostOf(ctx, ctx.from, 0.95); g.firstElementChild.style.filter = 'none'; const end = between(ctx.from, t, 0.85); await fly(ctx, g, ctx.from, end, 380, { rotate: 0 }); await wait(150 * ctx.sp); puff(ctx, end, '#ffffff', 100); puff(ctx, end, '#ffffff', 80); g.remove(); })));
    },
  },
  shadow_gathering: {
    desc: "Shadows stretch from the user's feet to every enemy's feet and bind them.",
    async play(ctx) { const ns = await Promise.all(ctx.targetEls.map((el) => shadowTo(ctx, el))); ctx.targetEls.forEach((el) => { el.animate([{ filter: 'none' }, { filter: 'brightness(.55)' }, { filter: 'none' }], { duration: 800 * ctx.sp }); }); shake(ctx); await wait(500 * ctx.sp); ns.forEach((n) => fade(ctx, n, 300)); },
  },
  shadow_possession: {
    desc: "A shadow stretches from the user's feet to the target's feet and binds them.",
    async play(ctx) { const n = await shadowTo(ctx, ctx.targetEls[0], 480); ctx.targetEls[0].animate([{ filter: 'none' }, { filter: 'brightness(.55)' }, { filter: 'none' }], { duration: 900 * ctx.sp }); shake(ctx); await wait(500 * ctx.sp); fade(ctx, n, 300); },
  },
  shadow_neck_bind: {
    desc: "A shadow stretches from the user's feet to the target, creeps up them and grabs their neck.",
    async play(ctx) {
      const el = ctx.targetEls[0]; const n = await shadowTo(ctx, el, 440); const f = feetOf(ctx, el); const { h } = sizeOf(el);
      const up = spawn(ctx, `<svg width="40" height="${h * 0.8}" viewBox="0 0 40 100" preserveAspectRatio="none"><path d="M20 100C10 80 30 60 18 40 10 26 16 14 20 6" stroke="#050505" stroke-width="10" fill="none" stroke-linecap="round" opacity=".9" vector-effect="non-scaling-stroke"/></svg>`, { x: f.x, y: f.y }, { life: 2000 });
      await rise(ctx, up, 380);
      const hand = spawn(ctx, '<svg width="54" height="34" viewBox="0 0 54 34"><path d="M4 18C10 4 44 4 50 18M8 22C16 30 38 30 46 22" stroke="#050505" stroke-width="6" fill="none" stroke-linecap="round" opacity=".9"/></svg>', { x: f.x, y: f.y - h * 0.82 }, { life: 1400 });
      await pop(ctx, hand, 200); shake(ctx); await wait(500 * ctx.sp); [n, up, hand].forEach((x) => fade(ctx, x, 300));
    },
  },
  shadow_stitching: {
    desc: "Shadows stretch from the user's feet to every enemy's feet, then shadow spikes shoot up and stab them.",
    async play(ctx) {
      const ns = await Promise.all(ctx.targetEls.map((el) => shadowTo(ctx, el)));
      const spikes = ctx.targetEls.flatMap((el) => { const f = feetOf(ctx, el); const { h } = sizeOf(el); return [-16, 0, 16].map((dx) => { const s = spawn(ctx, `<svg width="10" height="${h * 0.7}" viewBox="0 0 10 100" preserveAspectRatio="none"><path d="M5 0 10 100H0Z" fill="#050505"/></svg>`, { x: f.x + dx, y: f.y }, { life: 1600 }); s.style.transform = `translate(-50%,-100%) rotate(${dx}deg) scaleY(0)`; s.style.transformOrigin = '50% 100%'; s.animate([{ transform: `translate(-50%,-100%) rotate(${dx}deg) scaleY(0)` }, { transform: `translate(-50%,-100%) rotate(${dx}deg) scaleY(1)` }], { duration: 180 * ctx.sp, fill: 'forwards' }); return s; }); });
      await wait(200 * ctx.sp); shake(ctx); await wait(450 * ctx.sp); [...ns, ...spikes].forEach((x) => fade(ctx, x, 300));
    },
  },
  shannaro_punch: { desc: 'User flies in and strikes the target with a massive punch.', async play(ctx) { const to = await lunging(ctx, 0.72, 520); boom(ctx, to, '#ffd9a0', 190); boom(ctx, to, '#ffffff', 90); shake(ctx); } },
  sharingan_genjutsu: { desc: 'A Sharingan appears over the target.', play: (ctx) => ANIMS.kotoamatsukami.play(ctx) },
  demonic_illusion: { desc: 'A Sharingan appears over the target.', play: (ctx) => ANIMS.kotoamatsukami.play(ctx) },
  shinra_tensei: {
    desc: 'A light purple circle expands from the user until it reaches and strikes every enemy.',
    async play(ctx) {
      const r = Math.max(...ctx.tos.map((t) => Math.hypot(t.x - ctx.from.x, t.y - ctx.from.y))) * 2;
      const c = spawn(ctx, `<div style="width:${r}px;height:${r}px;border-radius:50%;border:5px solid #d6c4ff;background:radial-gradient(circle,#c9b3ff00 55%,#c9b3ff55 70%,#c9b3ff00 72%);box-shadow:0 0 24px #b99cff"></div>`, ctx.from, { life: 1400 });
      await c.animate([{ transform: 'translate(-50%,-50%) scale(.05)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0.9 }], { duration: 600 * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      shake(ctx); fade(ctx, c, 250);
    },
  },
  shuriken_shadow_clone: {
    desc: 'User throws a huge shuriken that bursts in a puff of smoke into many smaller shuriken, which strike every enemy.',
    async play(ctx) {
      const box = sideBox(ctx); const mid = between(ctx.from, box.c, 0.5);
      const big = spawn(ctx, ART.star(80), ctx.from, { life: 1000 }); await fly(ctx, big, ctx.from, mid, 320, { rotate: 0, arc: 20 }); big.remove();
      puff(ctx, mid, '#ffffff', 120); puff(ctx, mid, '#ffffff', 90);
      await Promise.all(Array.from({ length: 14 }, (_, i) => { const ti = i % ctx.tos.length; const t = ctx.tos[ti]; const s = spawn(ctx, ART.star(22), mid, { life: 900 }); return fly(ctx, s, mid, { x: t.x + rnd(-24, 24), y: t.y + rnd(-34, 24) }, rnd(220, 320), { rotate: 0 }).then(() => { s.remove(); shakeEl(ctx.targetEls[ti]); }); }));
    },
  },
  shuriken_volley: {
    desc: 'User throws a flurry of shuriken at the target.',
    async play(ctx) { const to = ctx.tos[0]; for (let i = 0; i < 6; i++) { const st = { x: ctx.from.x, y: ctx.from.y + rnd(-14, 14) }; const s = spawn(ctx, ART.star(22), st, { life: 1000 }); fly(ctx, s, st, { x: to.x + rnd(-16, 16), y: to.y + rnd(-22, 22) }, 300, { rotate: 0, arc: rnd(-20, 30) }).then(() => s.remove()); await wait(60 * ctx.sp); } await wait(300 * ctx.sp); shake(ctx); },
  },
  paper_ocean: {
    desc: "User sends a mass of paper explosive tags to the enemies' side, and they all explode.",
    async play(ctx) {
      const box = sideBox(ctx);
      const tags = [];
      await Promise.all(Array.from({ length: 36 }, (_, i) => wait(i * 10 * ctx.sp).then(async () => { const st = { x: ctx.from.x + rnd(-30, 30), y: ctx.from.y + rnd(-40, 20) }; const end = { x: rnd(box.x1 - 20, box.x2 + 20), y: rnd(box.y1, box.y2) }; const t = spawn(ctx, ART3.tag(), st, { life: 2200 }); await fly(ctx, t, st, end, rnd(380, 520), { rotate: rnd(-40, 40), arc: rnd(-30, 60) }); tags.push([t, end]); })));
      await wait(200 * ctx.sp);
      for (const [i, [t, end]] of tags.entries()) { t.remove(); if (i % 2 === 0) boom(ctx, end, '#ff8a2a', rnd(80, 130)); if (i % 6 === 0) await wait(30 * ctx.sp); }
      shake(ctx);
    },
  },
  six_paths_chibaku: { desc: 'Stones fly up from the ground and stick to each target until they are encased in a stony ball.', play: (ctx) => ANIMS.chibaku_tensei.play(ctx) },
  sly_mind_affect: {
    desc: 'User sprays a pink mist at the target that leaves them dazed.',
    async play(ctx) {
      const to = ctx.tos[0];
      const m = spawn(ctx, '<div style="width:120px;height:90px;border-radius:50%;background:radial-gradient(ellipse,#ffb3dccc,#ffb3dc66 50%,#ffb3dc00 72%);filter:blur(3px)"></div>', ctx.from, { life: 2200 });
      await fly(ctx, m, ctx.from, to, 450, { rotate: 0, scale: [0.3, 1.4], ease: 'ease-out' });
      ctx.targetEls[0].animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(0deg)' }], { duration: 900 * ctx.sp });
      const { h } = sizeOf(ctx.targetEls[0]);
      const stars = spawn(ctx, `<div class="ax-spin" style="animation-duration:.8s;width:0;height:0">${[0, 120, 240].map((a) => `<div style="position:absolute;transform:rotate(${a}deg) translateX(22px)">${ART.star(14, '#ffe066')}</div>`).join('')}</div>`, { x: to.x, y: to.y - h * 0.42 }, { life: 1300 });
      FX.ring(ctx.arena, ctx.targetEls[0], 'gen'); await wait(700 * ctx.sp); fade(ctx, stars, 250); fade(ctx, m, 300);
    },
  },
  smoke_bomb: {
    desc: 'User throws a round smoke bomb at the enemies that bursts into a white smoke cloud.',
    async play(ctx) { const box = sideBox(ctx); const b = spawn(ctx, '<div style="width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#8a8f99,#2a2d33);border:1.5px solid #111"></div>', ctx.from, { life: 1200 }); await fly(ctx, b, ctx.from, box.c, 480, { rotate: 0, arc: 90, ease: 'ease-in-out' }); b.remove(); const c = spawn(ctx, `<div style="width:${box.w + 140}px;height:${box.h + 60}px;border-radius:50%;background:radial-gradient(ellipse,#f4f4f4ee 0%,#e6e6e6cc 45%,#e6e6e600 72%);filter:blur(4px)"></div>`, box.c, { life: 2400 }); await grow(ctx, c, 380, 'scale(.1)', 'scale(1)'); shake(ctx); setTimeout(() => fade(ctx, c, 600), 700 * ctx.sp); },
  },
  son_goku_bomb: { desc: 'A black orb with a purple aura and tiny blue and red sparks grows in front of the user, then fires at the enemies.', play: (ctx) => ANIMS.chomei_bomb.play(ctx) },
  ftg_barrier: {
    desc: "User throws several three-pronged kunai into the ground at their feet.",
    async play(ctx) {
      const f = feetOf(ctx, ctx.userEl); const top = { x: ctx.from.x, y: ctx.from.y - ctx.userSize.h * 0.3 };
      await Promise.all([-46, -22, 22, 46].map((dx, i) => wait(i * 70 * ctx.sp).then(async () => { const k = spawn(ctx, ART4.tripleKunai(), top, { life: 1800 }); await fly(ctx, k, top, { x: f.x + dx, y: f.y - 6 }, 260, { rotate: 70 + dx / 3, arc: 30 }); puff(ctx, { x: f.x + dx, y: f.y }, '#c9a86b', 40); setTimeout(() => fade(ctx, k, 300), 600 * ctx.sp); })));
      yellowFlash(ctx, ctx.from); await wait(300 * ctx.sp);
    },
  },
  spider_bow: {
    desc: 'User draws a golden bow and fires a golden arrow at the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const at = { x: ctx.from.x + (to.x > ctx.from.x ? 30 : -30), y: ctx.from.y - 10 };
      const bow = spawn(ctx, ART8.goldBow(ctx.userSize.h * 0.6), at, { life: 1800 }); bow.firstElementChild.style.transform = `rotate(${ang(at, to) + (to.x > ctx.from.x ? 0 : 180)}deg) ${to.x > ctx.from.x ? '' : 'scaleX(-1)'}`;
      await pop(ctx, bow, 250); await wait(350 * ctx.sp);
      const a = spawn(ctx, ART8.goldArrow(90), at, { life: 900 }); await fly(ctx, a, at, to, 200, { ease: 'linear' }); a.remove();
      boom(ctx, to, '#ffd65a', 140); shake(ctx); fade(ctx, bow, 250);
    },
  },
  spider_armor: { desc: 'User spins a golden spider web in front of themself.', async play(ctx) { const w = spawn(ctx, ART8.web(ctx.userSize.h * 0.75), { x: ctx.from.x + (ctx.isFoe ? -44 : 44), y: ctx.from.y }, { life: 1700 }); await grow(ctx, w, 380, 'scale(.1) rotate(-90deg)', 'scale(1) rotate(0deg)'); await wait(650 * ctx.sp); fade(ctx, w, 300); } },
  spider_web_area: {
    desc: 'User sprays a golden spider web over every enemy.',
    async play(ctx) {
      await Promise.all(ctx.tos.map((t, i) => wait(i * 80 * ctx.sp).then(async () => { const { h } = sizeOf(ctx.targetEls[i]); const w = spawn(ctx, ART8.web(h * 0.8), ctx.from, { life: 2000 }); await fly(ctx, w, ctx.from, t, 380, { rotate: 0, scale: [0.2, 1], ease: 'ease-out' }); shakeEl(ctx.targetEls[i]); setTimeout(() => fade(ctx, w, 300), 600 * ctx.sp); })));
    },
  },
  mu_split: {
    desc: 'When the user is hit, they split into two copies of themselves and one vanishes in a puff of smoke.',
    async play(ctx) { FX.ring(ctx.arena, ctx.userEl, 'aura'); await wait(400 * ctx.sp); },
    decoy(ctx, el) {
      const at = FX.centerOf(el, ctx.arena);
      const img = el.querySelector('img'); if (!img) return poof(ctx.arena, el, ctx);
      const { h } = sizeOf(el);
      const mk = (dx) => spawn(ctx, `<img src="${img.getAttribute('src')}" style="height:${h}px;${img.style.transform ? `transform:${img.style.transform};` : ''}">`, at, { life: 1500 });
      el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.05 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1400 * ctx.sp });
      const a = mk(); const b = mk();
      a.animate([{ translate: '0 0' }, { translate: '-40px 0', offset: 0.3 }, { translate: '-40px 0', offset: 0.75 }, { translate: '0 0', opacity: 0 }], { duration: 1300 * ctx.sp, fill: 'forwards' });
      b.animate([{ translate: '0 0' }, { translate: '40px 0', offset: 0.3 }], { duration: 1300 * ctx.sp, fill: 'forwards' });
      setTimeout(() => { const p = { x: at.x + 40, y: at.y }; smokeCloud(ctx, p, h * 0.45); b.remove(); }, 450 * ctx.sp);
    },
  },
  spore_grab: {
    desc: 'User sinks into the ground, then pops up under the target and latches on to them.',
    async play(ctx) {
      const u = ctx.userEl; const fu = feetOf(ctx, u); const ft = feetOf(ctx, ctx.targetEls[0]);
      for (let i = 0; i < 3; i++) puff(ctx, { x: fu.x + rnd(-30, 30), y: fu.y - 10 }, '#a8916e', 80);
      u.animate([{ clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' }, { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(60px)', offset: 0.2 }, { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(60px)', offset: 0.85 }, { clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' }], { duration: 1700 * ctx.sp });
      await wait(450 * ctx.sp);
      for (let i = 0; i < 3; i++) puff(ctx, { x: ft.x + rnd(-30, 30), y: ft.y - 10 }, '#a8916e', 80);
      const g = ghostOf(ctx, { x: ft.x - 16, y: ft.y }, 0.85); g.style.clipPath = 'inset(0 0 30% 0)';
      await fly(ctx, g, { x: ft.x - 16, y: ft.y + 40 }, { x: ft.x - 16, y: ctx.tos[0].y + 10 }, 220, { rotate: 0, ease: 'ease-out' });
      shake(ctx); ctx.targetEls[0].animate([{ filter: 'none' }, { filter: 'drop-shadow(0 0 8px #dfe8d0)' }, { filter: 'none' }], { duration: 700 * ctx.sp });
      await wait(500 * ctx.sp); fade(ctx, g, 300);
    },
  },
  spore_clone: {
    desc: 'When the user takes damage, they burst into a puff of green spores.',
    async play(ctx) { FX.ring(ctx.arena, ctx.userEl, 'aura'); await wait(400 * ctx.sp); },
    decoy(ctx, el) { const at = FX.centerOf(el, ctx.arena); const { h } = sizeOf(el); el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.1 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1300 * ctx.sp }); for (let i = 0; i < 8; i++) puff(ctx, { x: at.x + rnd(-h * 0.2, h * 0.2), y: at.y + rnd(-h * 0.35, h * 0.35) }, '#9be36a', rnd(60, 100)); scatter(ctx, at, '<div style="width:6px;height:6px;border-radius:50%;background:#b7f07a;box-shadow:0 0 4px #6fc23a"></div>', 30, 110, 1000); },
  },
});

// ---------------------------------------------------------------- batch 9 (sheet rows 306–343)
/** The shared Tailed Beast Bomb orb. Grows in front of the user; fires at one target, the enemy side, or (keep) is returned for the caller. */
async function beastBomb(ctx, { size = 90, single = false, keep = false } = {}) {
  const at = { x: ctx.from.x + (ctx.isFoe ? -1 : 1) * (40 + size * 0.25), y: ctx.from.y - 20 };
  const orb = spawn(ctx, `<div style="width:${size}px;height:${size}px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#2a2235,#000 60%);box-shadow:0 0 0 4px #7a3cff66,0 0 ${size / 3}px ${size / 7}px #8a4bffaa"></div>`, at, { life: 4000 });
  const sparks = setInterval(() => {
    const r = orb.getBoundingClientRect(); const a = ctx.arena.getBoundingClientRect();
    const c = { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 };
    const p = spawn(ctx, `<div style="width:7px;height:7px;border-radius:50%;background:${Math.random() < 0.5 ? '#4ab0ff' : '#ff4a4a'}"></div>`, c, { life: 600 });
    const t = rnd(0, Math.PI * 2);
    fly(ctx, p, c, { x: c.x + Math.cos(t) * size * 0.66, y: c.y + Math.sin(t) * size * 0.66 }, 400, { rotate: 0, ease: 'ease-out' }).then(() => p.remove());
  }, 40);
  await grow(ctx, orb, 650 + size * 1.5, 'scale(.1)', 'scale(1)');
  if (keep) return { orb, at, stop: () => clearInterval(sparks) };
  const dest = single ? ctx.tos[0] : sideBox(ctx).c;
  await fly(ctx, orb, at, dest, 330, { rotate: 0, scale: [1, single ? 0.9 : 1.2], ease: 'ease-in' });
  clearInterval(sparks); orb.remove();
  for (const t of ctx.tos) boom(ctx, t, '#8a4bff', 170 + size * 0.4);
  boom(ctx, dest, '#ffffff', 220 + size); shake(ctx);
}
const ART9 = {
  baku: (w = 200) => `<svg width="${w}" height="${w * 0.8}" viewBox="0 0 200 160"><path d="M30 150C10 120 20 60 70 50 110 40 160 60 170 100 176 130 160 150 150 150Z" fill="#6e5a4a" stroke="#3a2a1e" stroke-width="3"/><path d="M160 92C178 84 190 96 186 112 182 128 196 140 192 150" stroke="#6e5a4a" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M160 92C178 84 190 96 186 112 182 128 196 140 192 150" stroke="#3a2a1e" stroke-width="2" fill="none"/><circle cx="140" cy="80" r="5" fill="#111"/><path d="M110 56 100 34 126 50" fill="#5a4838" stroke="#3a2a1e" stroke-width="2"/><path d="M40 150V160M80 150V160M130 150V160" stroke="#3a2a1e" stroke-width="10"/></svg>`,
  toad: (w = 260) => `<svg width="${w}" height="${w * 0.75}" viewBox="0 0 260 195"><path d="M20 160C10 110 40 60 90 50 110 20 150 20 170 50 220 60 250 110 240 160Z" fill="#c8402a" stroke="#6a1a10" stroke-width="4"/><circle cx="100" cy="50" r="20" fill="#e8b422" stroke="#6a1a10" stroke-width="3"/><circle cx="160" cy="50" r="20" fill="#e8b422" stroke="#6a1a10" stroke-width="3"/><path d="M92 50h16M152 50h16" stroke="#111" stroke-width="4"/><path d="M60 110Q130 140 200 110" stroke="#6a1a10" stroke-width="4" fill="none"/><path d="M110 70 150 90M150 70 110 90" stroke="#3a3a8a" stroke-width="4"/><path d="M20 160 10 190H70L60 160M240 160 250 190H190L200 160" fill="#c8402a" stroke="#6a1a10" stroke-width="3"/></svg>`,
  weasel: (w = 90) => `<svg width="${w}" height="${w * 0.6}" viewBox="0 0 90 54"><path d="M6 34C14 20 34 18 50 22 62 14 76 16 84 26 78 30 70 32 64 32 56 40 34 44 18 40Z" fill="#fbfbf7" stroke="#9a9a90" stroke-width="2"/><path d="M6 34C0 30 2 22 10 24" stroke="#fbfbf7" stroke-width="6" fill="none"/><circle cx="74" cy="24" r="2" fill="#111"/><path d="M74 20 72 14M78 20 80 14" stroke="#9a9a90" stroke-width="2"/><path d="M60 30 88 50" stroke="#6b4a2a" stroke-width="3"/><path d="M84 46C90 38 90 28 82 24 84 34 82 42 76 48Z" fill="#c9ced6" stroke="#444"/></svg>`,
  slug: (w = 140) => `<svg width="${w}" height="${w * 0.6}" viewBox="0 0 140 84"><path d="M10 78C10 50 30 30 60 26 80 10 110 14 120 30 132 46 130 70 124 78Z" fill="#f4f4ef" stroke="#a8b8c8" stroke-width="3"/><path d="M60 26C80 22 104 26 120 40" stroke="#4a7ad8" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M100 18 96 4M112 20 114 6" stroke="#a8b8c8" stroke-width="3"/><circle cx="96" cy="4" r="3" fill="#333"/><circle cx="114" cy="6" r="3" fill="#333"/></svg>`,
  bigSpider: (w = 170) => `<svg width="${w}" height="${w * 0.7}" viewBox="0 0 170 120"><g stroke="#111" stroke-width="7" fill="none" stroke-linecap="round"><path d="M70 60 30 30 8 50M70 66 20 66 4 90M74 74 36 96 24 118M100 60 140 30 162 50M100 66 150 66 166 90M96 74 134 96 146 118"/></g><ellipse cx="85" cy="68" rx="36" ry="30" fill="#151515" stroke="#000" stroke-width="2"/><path d="M68 46Q85 70 70 94M102 46Q85 70 100 94" stroke="#e8622a" stroke-width="6" fill="none"/><ellipse cx="85" cy="34" rx="18" ry="14" fill="#202020"/><circle cx="79" cy="32" r="3" fill="#ff3a3a"/><circle cx="91" cy="32" r="3" fill="#ff3a3a"/></svg>`,
  dog: (s = 48) => `<svg width="${s}" height="${s * 0.75}" viewBox="0 0 48 36"><path d="M4 24C4 14 14 10 24 12 30 4 40 4 44 12 46 18 42 22 36 22 34 30 24 34 14 32 8 32 4 28 4 24Z" fill="#c8a06a" stroke="#6a4a2a" stroke-width="2"/><path d="M28 10 40 9" stroke="#2a5ad8" stroke-width="4"/><circle cx="38" cy="15" r="1.8" fill="#111"/><path d="M44 16h3" stroke="#111" stroke-width="2"/><path d="M10 32V36M20 33V36" stroke="#6a4a2a" stroke-width="3"/></svg>`,
  gate: (w = 260) => `<svg width="${w}" height="${w * 0.9}" viewBox="0 0 260 234"><path d="M10 40H250L230 10H30Z" fill="#5a2a5a" stroke="#2a0a2a" stroke-width="3"/><rect x="20" y="40" width="220" height="190" fill="#7a4a3a" stroke="#2a0a2a" stroke-width="3"/><rect x="40" y="60" width="80" height="170" fill="#5a3022" stroke="#2a0a2a" stroke-width="2"/><rect x="140" y="60" width="80" height="170" fill="#5a3022" stroke="#2a0a2a" stroke-width="2"/><circle cx="80" cy="150" r="16" fill="#3a1a1a" stroke="#c8a24a" stroke-width="3"/><circle cx="180" cy="150" r="16" fill="#3a1a1a" stroke="#c8a24a" stroke-width="3"/><path d="M110 30 130 18 150 30" stroke="#c8a24a" stroke-width="4" fill="none"/><circle cx="130" cy="28" r="8" fill="#c8202a"/></svg>`,
  komainu: (s = 90) => `<svg width="${s}" height="${s * 0.7}" viewBox="0 0 90 63"><path d="M6 46C6 30 18 20 34 22 44 8 64 6 76 18 84 26 86 38 80 44 74 50 64 50 60 46 52 56 30 58 16 56 10 54 6 50 6 46Z" fill="#fff" stroke="#000" stroke-width="4" stroke-linejoin="round"/><path d="M64 14 60 4 70 12M76 20 82 10 80 22" fill="#fff" stroke="#000" stroke-width="3"/><circle cx="72" cy="28" r="3" fill="#000"/><path d="M80 38 70 40 76 44" fill="none" stroke="#000" stroke-width="3"/><path d="M14 56 12 63M30 58 30 63M50 56 52 63" stroke="#000" stroke-width="4"/></svg>`,
  arrow: (l = 110, c = '#5dff8f', g = '#2ad25a') => `<svg width="${l}" height="18" viewBox="0 0 ${l} 18" style="filter:drop-shadow(0 0 8px ${g})"><path d="M0 9H${l - 20}" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M${l - 26} 1 ${l} 9 ${l - 26} 17Z" fill="${c}"/></svg>`,
  feather: () => '<svg width="16" height="34" viewBox="0 0 16 34"><path d="M8 0C16 10 14 26 8 34 2 26 0 10 8 0Z" fill="#fafafa" stroke="#d8d8e0" stroke-width="1"/><path d="M8 4V32" stroke="#c8c8d0" stroke-width="1"/></svg>',
  puppetWhite: (h = 90) => `<svg width="${h * 0.6}" height="${h}" viewBox="0 0 60 100"><circle cx="30" cy="14" r="10" fill="#f6f2ea" stroke="#8a8478" stroke-width="2"/><path d="M14 28H46L52 86 42 98H18L8 86Z" fill="#fafafa" stroke="#9a9a90" stroke-width="2"/><path d="M14 30 4 56M46 30 56 56" stroke="#f6f2ea" stroke-width="6" stroke-linecap="round"/><path d="M30 28V96" stroke="#d8d8d0" stroke-width="2"/></svg>`,
  meteor: (s = 260) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100" style="filter:drop-shadow(0 0 20px #ff7a1a)"><path d="M50 4C76 6 96 24 96 50 96 76 76 96 50 96 24 96 4 76 6 50 8 24 26 4 50 4Z" fill="#6e6258" stroke="#3a322a" stroke-width="3"/><circle cx="34" cy="34" r="9" fill="#54493f"/><circle cx="64" cy="56" r="12" fill="#54493f"/><circle cx="40" cy="70" r="6" fill="#54493f"/><path d="M8 70C20 90 40 98 60 96" stroke="#ff7a1a" stroke-width="6" fill="none" opacity=".7"/></svg>`,
  totsuka: (l = 200) => `<svg width="${l}" height="30" viewBox="0 0 ${l} 30" style="filter:drop-shadow(0 0 14px #ff9a2a)"><path d="M0 15C${l * 0.3} 6 ${l * 0.7} 4 ${l} 15 ${l * 0.7} 26 ${l * 0.3} 24 0 15Z" fill="#ffb84add" stroke="#fff3c2" stroke-width="2"/></svg>`,
  staffBlack: (len) => `<svg width="${len}" height="14" viewBox="0 0 ${len} 14"><rect x="0" y="4" width="${len}" height="6" rx="3" fill="#0a0a0a" stroke="#4a3a6a"/><circle cx="${len - 6}" cy="7" r="7" fill="#0a0a0a" stroke="#6b4bd6" stroke-width="1.5"/></svg>`,
  smokeDragon: (h = 220) => `<svg width="${h * 0.4}" height="${h}" viewBox="0 0 40 100"><path d="M20 100C6 80 34 70 20 50S8 22 20 8" stroke="#e6e6e6" stroke-width="14" fill="none" stroke-linecap="round" opacity=".85"/><path d="M14 10 20 0 28 8 22 14Z" fill="#f4f4f4"/></svg>`,
};
const blueThread = (len) => `<svg width="${len}" height="4" viewBox="0 0 ${len} 4"><path d="M0 2H${len}" stroke="#8fd3ff" stroke-width="1.2" style="filter:drop-shadow(0 0 2px #4aa3ff)"/></svg>`;
async function summonPuff(ctx, at, html, { life = 3000, z = 6 } = {}) {
  smokeCloud(ctx, at, 120);
  const n = spawn(ctx, html, at, { life, z }); n.style.opacity = '0';
  await wait(160 * ctx.sp); n.style.opacity = ''; await pop(ctx, n, 200); return n;
}
async function puppetHost(ctx, artFn, n) {
  const { h } = ctx.userSize; const top = { x: ctx.from.x, y: Math.max(30, ctx.from.y - h * 0.75) };
  const ps = Array.from({ length: n }, (_, i) => { const at = { x: top.x + (i - (n - 1) / 2) * 24, y: top.y + (i % 2) * 18 }; const p = spawn(ctx, artFn(h * 0.3), at, { life: 4200 }); p.style.opacity = '0'; setTimeout(() => pop(ctx, p, 150), i * 40 * ctx.sp); return [p, at]; });
  await wait(500 * ctx.sp);
  const hands = { x: ctx.from.x, y: ctx.from.y - h * 0.1 };
  for (const [i, [p, at]] of ps.entries()) {
    const ti = i % ctx.tos.length; const t = ctx.tos[ti];
    const th = await stretch(ctx, hands, at, blueThread, 60, 1400);
    fly(ctx, p, at, { x: t.x + rnd(-20, 20), y: t.y + rnd(-30, 10) }, 260, { rotate: 0, ease: 'ease-in' }).then(() => { boom(ctx, t, '#ffffff', 60); shakeEl(ctx.targetEls[ti]); fade(ctx, p, 250); fade(ctx, th, 250); });
    await wait(100 * ctx.sp);
  }
  await wait(300 * ctx.sp);
}
async function risingDragons(ctx, explode) {
  const box = sideBox(ctx); const { h } = sizeOf(ctx.targetEls[0]);
  const ds = [box.x1 - 30, box.x2 + 30].map((x) => { const d = spawn(ctx, ART9.smokeDragon(h * 1.3), { x, y: box.y2 + 10 }, { life: 2600 }); rise(ctx, d, 450); return d; });
  await wait(500 * ctx.sp);
  const weapons = [() => ART.star(22), () => ART3.kunai(), () => '<div style="width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#8a8f99,#2a2d33)"></div>'];
  for (let i = 0; i < 26; i++) {
    const ti = i % ctx.tos.length; const t = ctx.tos[ti]; const st = { x: rnd(box.x1 - 40, box.x2 + 40), y: -20 };
    const w = spawn(ctx, weapons[i % 3](), st, { life: 900 });
    fly(ctx, w, st, { x: t.x + rnd(-30, 30), y: t.y + rnd(-40, 30) }, 280, { rotate: i % 3 === 1 ? 90 : 0, ease: 'ease-in' }).then(() => { w.remove(); if (explode) boom(ctx, t, '#ff8a2a', rnd(60, 100)); else if (i % 3 === 2) puff(ctx, t, '#e6e6e6', 70); shakeEl(ctx.targetEls[ti]); });
    await wait(30 * ctx.sp);
  }
  await wait(350 * ctx.sp); ds.forEach((d) => fade(ctx, d, 300));
}

Object.assign(ANIMS, {
  chomei_bomb: { desc: 'A black orb with a purple aura and tiny blue and red sparks grows in front of the user, then fires at the enemies.', play: (ctx) => beastBomb(ctx) },
  tailed_beast_bomb: { desc: 'A black orb with a purple aura and tiny blue and red sparks grows in front of the user, then fires at the target.', play: (ctx) => beastBomb(ctx, { single: true }) },
  ten_tails_bomb: { desc: 'A massive black orb with a purple aura and tiny blue and red sparks grows in front of the user, then fires at the enemies.', play: (ctx) => beastBomb(ctx, { size: 170 }) },
  kurama_rasengan: {
    desc: 'User forms a Tailed Beast Bomb, then the orange chakra arm thrusts it into the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const { orb, at, stop } = await beastBomb(ctx, { size: 80, keep: true });
      const end = between(at, to, 0.88);
      const [arm] = await Promise.all([stretch(ctx, ctx.from, between(ctx.from, end, 0.8), armSvg, 260, 1600), fly(ctx, orb, at, end, 260, { rotate: 0, ease: 'ease-in' })]);
      stop(); orb.remove(); boom(ctx, to, '#8a4bff', 200); boom(ctx, to, '#ffffff', 140); shake(ctx);
      fade(ctx, arm, 300);
    },
  },
  laser_circus: {
    desc: 'User fires blue laser beams at every enemy.',
    async play(ctx) {
      const beam = (len) => `<svg width="${len}" height="14" viewBox="0 0 ${len} 14" style="filter:drop-shadow(0 0 8px #4ab0ff)"><path d="M0 7H${len}" stroke="#bfe6ff" stroke-width="6" stroke-linecap="round"/><path d="M0 7H${len}" stroke="#fff" stroke-width="2"/></svg>`;
      const ns = [];
      for (const [i, t] of ctx.tos.entries()) for (let k = 0; k < 2; k++) { ns.push(await stretch(ctx, { x: ctx.from.x, y: ctx.from.y - 20 + k * 10 }, { x: t.x + rnd(-12, 12), y: t.y + rnd(-16, 16) }, beam, 120, 900)); boom(ctx, t, '#9fd8ff', 70); shakeEl(ctx.targetEls[i]); }
      await wait(200 * ctx.sp); ns.forEach((n) => fade(ctx, n, 200));
    },
  },
  shadow_snakes: { desc: 'Three brownish snakes shoot from the user and strike the target; the bite glows purple.', async play(ctx) { lunge(ctx, ctx.tos[0], 0.25, 600); await wait(150 * ctx.sp); await snakeStrike(ctx, 3); } },
  twin_snakes: { desc: 'User shoots a brownish snake at the target, then flinches from the recoil damage.', async play(ctx) { await snakeStrike(ctx, 1); await wait(250 * ctx.sp); shakeEl(ctx.userEl); } },
  summon_baku: {
    desc: 'User summons a giant mole with an elephant trunk in front of them, which inhales the enemies’ chakra.',
    async play(ctx) {
      const at = { x: ctx.from.x + (ctx.isFoe ? -90 : 90), y: ctx.from.y - 20 };
      const b = await summonPuff(ctx, at, ART9.baku(200)); if (ctx.isFoe) b.firstElementChild.style.transform = 'scaleX(-1)';
      const mouth = { x: at.x + (ctx.isFoe ? -80 : 80), y: at.y + 40 };
      for (let i = 0; i < 30; i++) { const ti = i % ctx.tos.length; const t = ctx.tos[ti]; const st = { x: t.x + rnd(-30, 30), y: t.y + rnd(-40, 40) }; const d = spawn(ctx, '<div style="width:8px;height:8px;border-radius:50%;background:#8fd3ff;box-shadow:0 0 6px #4aa3ff"></div>', st, { life: 900 }); fly(ctx, d, st, mouth, 600, { rotate: 0, ease: 'ease-in' }).then(() => d.remove()); if (i % 6 === 0) shakeEl(ctx.targetEls[ti]); await wait(25 * ctx.sp); }
      await wait(600 * ctx.sp); smokeCloud(ctx, at, 120); b.remove();
    },
  },
  summon_doki: { desc: 'Giant bald, shirtless, fair-skinned ogres with white blindfolds appear near each enemy and strike them.', play: (ctx) => ANIMS.spirit_eaters.play(ctx) },
  summon_gamabunta: {
    desc: 'User summons a giant red toad that drops onto the enemies.',
    async play(ctx) {
      const box = sideBox(ctx); const w = Math.max(240, box.w * 0.9); const dest = { x: box.c.x, y: box.c.y };
      smokeCloud(ctx, { x: dest.x, y: 40 }, 140);
      const t = spawn(ctx, ART9.toad(w), { x: dest.x, y: -w * 0.4 }, { life: 2200, z: 7 });
      await fly(ctx, t, { x: dest.x, y: -w * 0.4 }, dest, 420, { rotate: 0, ease: 'ease-in' });
      for (let i = 0; i < 6; i++) puff(ctx, { x: rnd(box.x1, box.x2), y: box.y2 }, '#b9a689', 120);
      ctx.tos.forEach((p) => boom(ctx, p, '#ffffff', 100)); shake(ctx);
      await wait(600 * ctx.sp); smokeCloud(ctx, dest, 160); t.remove();
    },
  },
  summon_ibuse: {
    desc: 'User summons a giant salamander in front of them, which sprays poison mist on every enemy.',
    async play(ctx) {
      const at = { x: ctx.from.x + (ctx.isFoe ? -90 : 90), y: ctx.from.y };
      const s = await summonPuff(ctx, at, ART7.salamander(220)); if (ctx.isFoe) s.firstElementChild.style.transform = 'scaleX(-1)';
      const { fog, go } = mistOver(ctx, '#9a3bdc'); await go; shake(ctx);
      setTimeout(() => fade(ctx, fog, 600), 600 * ctx.sp); await wait(400 * ctx.sp); smokeCloud(ctx, at, 120); s.remove();
    },
  },
  summon_kamatari: {
    desc: 'User summons a white weasel holding a scythe in its mouth, which flies around slashing every enemy.',
    async play(ctx) {
      const w = await summonPuff(ctx, ctx.from, ART9.weasel(96));
      let at = ctx.from;
      for (const [i, t] of ctx.tos.entries()) { if (t.x < at.x) w.firstElementChild.style.transform = 'scaleX(-1)'; else w.firstElementChild.style.transform = ''; await fly(ctx, w, at, t, 200, { rotate: 0, arc: 40, ease: 'ease-in-out' }); w.getAnimations().forEach((a) => a.cancel()); w.style.left = `${t.x}px`; w.style.top = `${t.y}px`; at = t; slashArc(ctx, t, { color: '#f4fcff', glow: '#bfe9ff', size: 130, rot: 30 + i * 40 }); shakeEl(ctx.targetEls[i]); }
      await wait(200 * ctx.sp); smokeCloud(ctx, at, 80); w.remove();
    },
  },
  katsuyu: {
    desc: 'User summons a white slug with a blue stripe down its back, which gives off a green healing aura that reaches every ally.',
    async play(ctx) {
      const at = { x: ctx.from.x + (ctx.isFoe ? -80 : 80), y: ctx.from.y + 20 };
      const s = await summonPuff(ctx, at, ART9.slug(150)); if (ctx.isFoe) s.firstElementChild.style.transform = 'scaleX(-1)';
      glowAura(ctx, s, '#5dff8f', 900); await wait(300 * ctx.sp);
      ctx.targetEls.forEach((el) => glowAura(ctx, el, '#5dff8f', 1100)); await wait(800 * ctx.sp); smokeCloud(ctx, at, 110); s.remove();
    },
  },
  summon_spider: {
    desc: 'User summons a giant black spider with two red-orange stripes down its back, which sprays baby spiders onto every enemy.',
    async play(ctx) {
      const at = { x: ctx.from.x + (ctx.isFoe ? -90 : 90), y: ctx.from.y };
      const sp = await summonPuff(ctx, at, ART9.bigSpider(180));
      await Promise.all(ctx.tos.flatMap((t, i) => [0, 1, 2].map((k) => wait((k * 80 + i * 40) * ctx.sp).then(async () => { const s = spawn(ctx, ART.spider().replaceAll('#fafafa', '#222').replaceAll('#f4f4f4', '#222').replace('#bbb', '#000'), at, { life: 1200 }); await fly(ctx, s, at, { x: t.x + rnd(-24, 24), y: t.y + rnd(-30, 30) }, 420, { rotate: 0, arc: 60 }); setTimeout(() => fade(ctx, s, 250), 300 * ctx.sp); shakeEl(ctx.targetEls[i]); }))));
      await wait(300 * ctx.sp); smokeCloud(ctx, at, 120); sp.remove();
    },
  },
  summon_manda: {
    desc: 'User summons a giant purple snake in front of them, which lunges and strikes the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const at = { x: ctx.from.x + (ctx.isFoe ? -60 : 60), y: ctx.from.y };
      smokeCloud(ctx, at, 140); await wait(150 * ctx.sp);
      const body = await stretch(ctx, at, between(at, to, 0.86), (len) => `<svg width="${len}" height="44" viewBox="0 0 ${len} 44" style="filter:drop-shadow(0 0 4px #000)"><path d="M0 22H${len}" stroke="#6a3a9a" stroke-width="36" stroke-linecap="round"/><path d="M0 22H${len}" stroke="#4a2070" stroke-width="12" stroke-dasharray="14 10"/></svg>`, 340, 1800);
      const head = spawn(ctx, ART3.snake(130).replaceAll('#e8e6dc', '#7a4aaa').replaceAll('#dcd8c8', '#5a3a8a'), between(at, to, 0.86), { life: 1600 });
      head.style.transform = `translate(-20%,-50%) rotate(${ang(at, to)}deg)`; head.style.transformOrigin = '20% 50%';
      boom(ctx, to, '#b44bff', 160); shake(ctx);
      setTimeout(() => { fade(ctx, body, 300); fade(ctx, head, 300); smokeCloud(ctx, at, 110); }, 500 * ctx.sp); await wait(400 * ctx.sp);
    },
  },
  ninja_hounds: {
    desc: 'User summons a pack of dogs in blue headbands that leap on the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const f = feetOf(ctx, ctx.userEl);
      await Promise.all(Array.from({ length: 6 }, (_, i) => wait(i * 70 * ctx.sp).then(async () => { const st = { x: f.x + (i - 2.5) * 22, y: f.y - 20 }; puff(ctx, st, '#ffffff', 60); const d = spawn(ctx, ART9.dog(48), st, { life: 1800 }); if (to.x < st.x) d.firstElementChild.style.transform = 'scaleX(-1)'; await fly(ctx, d, st, { x: to.x + rnd(-30, 30), y: to.y + rnd(-40, 30) }, 420, { rotate: 0, arc: 80 }); setTimeout(() => fade(ctx, d, 300), 500 * ctx.sp); })));
      shake(ctx); wrapRing(ctx, ctx.targetEls[0], 'border:3px dashed #2a5ad8', 600); await wait(300 * ctx.sp);
    },
  },
  rashomon: {
    desc: "User summons a giant demon gate in front of the allies' side.",
    async play(ctx) { const box = sideBox(ctx); const at = { x: box.c.x + (ctx.isFoe ? -40 : 40), y: box.y2 + 10 }; smokeCloud(ctx, { x: at.x, y: at.y - 80 }, 160); const g = spawn(ctx, ART9.gate(Math.min(260, box.h * 0.9)), at, { life: 2200, z: 7 }); await rise(ctx, g, 420); await wait(900 * ctx.sp); fade(ctx, g, 350); },
  },
  super_beast_scroll: {
    desc: 'User sends three white, thick-outlined ink komainu at the enemy.',
    async play(ctx) { const to = ctx.tos[0]; await Promise.all([0, 1, 2].map((i) => wait(i * 110 * ctx.sp).then(async () => { const st = { x: ctx.from.x, y: ctx.from.y + (i - 1) * 24 }; const k = spawn(ctx, ART9.komainu(80), st, { life: 1300 }); if (to.x < st.x) k.firstElementChild.style.transform = 'scaleX(-1)'; await fly(ctx, k, st, { x: to.x + rnd(-14, 14), y: to.y + (i - 1) * 16 }, 380, { rotate: 0, arc: 30 }); k.remove(); boom(ctx, to, '#ffffff', 80); shake(ctx); }))); },
  },
  super_expansion: {
    desc: 'User grows massive, then slams down on the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const g = ghostOf(ctx, ctx.from, 1); g.firstElementChild.style.filter = 'none';
      ctx.userEl.animate([{ opacity: 1 }, { opacity: 0, offset: 0.05 }, { opacity: 0, offset: 0.9 }, { opacity: 1 }], { duration: 1500 * ctx.sp });
      await g.animate([{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-80%) scale(2.6)' }], { duration: 450 * ctx.sp, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      await g.animate([{ transform: 'translate(-50%,-80%) scale(2.6)' }, { transform: `translate(calc(-50% + ${to.x - ctx.from.x}px), calc(-50% + ${to.y - ctx.from.y - 30}px)) scale(2.4)` }], { duration: 300 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      boom(ctx, to, '#ffd9a0', 220); crackAt(ctx, ctx.targetEls[0]); shake(ctx);
      await wait(250 * ctx.sp); smokeCloud(ctx, to, 140); g.remove();
    },
  },
  shisui_arrows: {
    desc: 'User fires a volley of green arrows at the target.',
    async play(ctx) { const to = ctx.tos[0]; for (let i = 0; i < 6; i++) { const st = { x: ctx.from.x + rnd(-20, 20), y: ctx.from.y - 40 + rnd(-20, 20) }; const a = spawn(ctx, ART9.arrow(100), st, { life: 700 }); fly(ctx, a, st, { x: to.x + rnd(-16, 16), y: to.y + rnd(-24, 24) }, 220, { ease: 'linear' }).then(() => { a.remove(); boom(ctx, to, '#5dff8f', 70); shake(ctx); }); await wait(70 * ctx.sp); } await wait(260 * ctx.sp); },
  },
  susanoo_arrow: {
    desc: 'User fires a giant purple flame arrow at the target.',
    async play(ctx) { const to = ctx.tos[0]; const a = spawn(ctx, ART9.arrow(170, '#c78bff', '#7a2bd6'), { x: ctx.from.x, y: ctx.from.y - 40 }, { life: 900 }); const iv = setInterval(() => { const r = a.getBoundingClientRect(); const ar = ctx.arena.getBoundingClientRect(); const fl = spawn(ctx, ART.flame(24, '#7a2bd6', '#e2b8ff'), { x: r.left - ar.left + r.width / 2, y: r.top - ar.top + r.height / 2 }, { life: 600 }); fade(ctx, fl, 400); }, 35); await fly(ctx, a, { x: ctx.from.x, y: ctx.from.y - 40 }, to, 320, { ease: 'ease-in' }); clearInterval(iv); a.remove(); boom(ctx, to, '#b44bff', 200); shake(ctx); },
  },
  kamui_shuriken: {
    desc: 'User throws three giant shuriken that warp out of reality, then reappear to strike the enemy.',
    async play(ctx) {
      const to = ctx.tos[0];
      const stars = [0, 1, 2].map((i) => { const st = { x: ctx.from.x + (ctx.isFoe ? -30 : 30), y: ctx.from.y - 40 + (i - 1) * 40 }; const s = spawn(ctx, `<div style="filter:drop-shadow(0 0 8px #b44bff)">${ART.star(70, '#c9b3ff')}</div>`, st, { life: 3000 }); return [s, st]; });
      await Promise.all(stars.map(([s, st]) => pop(ctx, s, 200)));
      const swirls = stars.map(([s, st]) => { const sw = spawn(ctx, swirl(80), st, { life: 1200 }); pop(ctx, sw, 200); return sw; });
      await Promise.all(stars.map(([s]) => s.animate([{ transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(.05) rotate(540deg)', opacity: 0 }], { duration: 380 * ctx.sp, fill: 'forwards' }).finished.catch(() => {})));
      swirls.forEach((sw) => fade(ctx, sw, 200));
      const near = [-1, 0, 1].map((k) => ({ x: to.x + k * 50, y: to.y - 60 }));
      const sw2 = near.map((p) => { const sw = spawn(ctx, swirl(70), p, { life: 1200 }); pop(ctx, sw, 150); return sw; });
      await wait(150 * ctx.sp);
      await Promise.all(near.map((p, i) => { const s = spawn(ctx, `<div style="filter:drop-shadow(0 0 8px #b44bff)">${ART.star(70, '#c9b3ff')}</div>`, p, { life: 900 }); return fly(ctx, s, p, to, 200, { rotate: 0, ease: 'ease-in' }).then(() => s.remove()); }));
      stars.forEach(([s]) => s.remove()); sw2.forEach((sw) => fade(ctx, sw, 200)); FX.fx(ctx.arena, 'slash', to); boom(ctx, to, '#b44bff', 150); shake(ctx);
    },
  },
  kusanagi: {
    desc: 'User flies in and jabs the target.',
    async play(ctx) { const to = ctx.tos[0]; const hit = lunge(ctx, to, 0.66, 480); const b = spawn(ctx, ART.blade(90), ctx.from, { life: 900 }); await fly(ctx, b, ctx.from, between(hit, to, 0.6), 230, { ease: 'ease-in' }); boom(ctx, to, '#ffffff', 80); shake(ctx); fade(ctx, b, 200); },
  },
  tanto_strike: { desc: 'User slashes the target with a small blade.', async play(ctx) { const to = await lunging(ctx, 0.66, 480); slashArc(ctx, to, { color: '#f2f4f7', glow: '#9aa3ad', size: 90, rot: 30 }); shake(ctx); } },
  iruka_cover: { desc: 'User moves in front of the ally to take the hit.', play: (ctx) => ANIMS.haku_shield.play(ctx) },
  temple_of_nirvana: {
    desc: 'Feathers rain from the sky over every enemy.',
    async play(ctx) {
      const box = sideBox(ctx);
      for (let i = 0; i < 26; i++) { const x = rnd(box.x1 - 30, box.x2 + 30); const st = { x, y: -20 }; const f = spawn(ctx, ART9.feather(), st, { life: 1800 }); f.animate([{ transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 }, { transform: `translate(calc(-50% + ${rnd(-30, 30)}px), calc(-50% + ${rnd(box.y1, box.y2) + 20}px)) rotate(${rnd(-200, 200)}deg)`, opacity: 1, offset: 0.85 }, { transform: `translate(calc(-50% + ${rnd(-30, 30)}px), calc(-50% + ${box.y2 + 20}px)) rotate(${rnd(-200, 200)}deg)`, opacity: 0 }], { duration: rnd(1100, 1500) * ctx.sp, easing: 'ease-in', fill: 'forwards' }); await wait(30 * ctx.sp); }
      await wait(500 * ctx.sp); ctx.targetEls.forEach((t) => FX.ring(ctx.arena, t, 'gen'));
    },
  },
  ten_puppets: { desc: 'User summons ten puppets with white skin and white robes, tied to them by blue chakra threads, which fly out one by one to strike each enemy.', play: (ctx) => puppetHost(ctx, ART9.puppetWhite, 10) },
  finger_bullets: {
    desc: 'User fires a stream of tiny bone fragments at the target.',
    async play(ctx) { const to = ctx.tos[0]; for (let i = 0; i < 10; i++) { const st = { x: ctx.from.x + (ctx.isFoe ? -20 : 20), y: ctx.from.y + rnd(-6, 6) }; const b = spawn(ctx, '<svg width="14" height="6" viewBox="0 0 14 6"><path d="M0 3 14 1V5Z" fill="#f4f1e8" stroke="#bfb7a2"/></svg>', st, { life: 600 }); fly(ctx, b, st, { x: to.x + rnd(-14, 14), y: to.y + rnd(-20, 20) }, 180, { ease: 'linear' }).then(() => { b.remove(); shake(ctx); }); await wait(45 * ctx.sp); } await wait(220 * ctx.sp); },
  },
  tengai_shinsei: {
    desc: 'User glows blue, then drops a giant meteor on the enemies, followed by a second one.',
    async play(ctx) {
      glowAura(ctx, ctx.userEl, '#4aa3ff', 1200); await wait(500 * ctx.sp);
      const box = sideBox(ctx); const s = Math.max(220, box.w * 0.75);
      for (let k = 0; k < 2; k++) {
        const st = { x: box.c.x + (k ? 120 : -120), y: -s * 0.6 }; const dest = { x: box.c.x + (k ? 30 : -30), y: box.c.y };
        const m = spawn(ctx, ART9.meteor(s), st, { life: 1600, z: 7 });
        await fly(ctx, m, st, dest, 520, { rotate: 0, ease: 'ease-in' }); m.remove();
        boom(ctx, dest, '#ff7a1a', box.w + 120); ctx.targetEls.forEach((el) => crackAt(ctx, el)); shake(ctx); await wait(250 * ctx.sp);
      }
    },
  },
  thousand_needles: {
    desc: 'Ice needles form around every enemy, then fire at them in volleys.',
    async play(ctx) {
      const sets = ctx.targetEls.map((el, i) => { const to = ctx.tos[i]; const { h } = sizeOf(el); return Array.from({ length: 10 }, (_, k) => { const t = (k / 10) * Math.PI * 2; const p = { x: to.x + Math.cos(t) * h * 0.5, y: to.y + Math.sin(t) * h * 0.45 }; const n = spawn(ctx, ART3.needle(), p, { life: 2000 }); n.style.transform = `translate(-50%,-50%) rotate(${(t * 180) / Math.PI + 180}deg)`; n.style.opacity = '0'; setTimeout(() => { n.style.opacity = '1'; }, k * 30 * ctx.sp); return [n, p, to, i]; }); });
      await wait(450 * ctx.sp);
      for (let r = 0; r < 2; r++) { sets.flat().forEach(([n, p, to]) => { const nd = spawn(ctx, ART3.needle(), p, { life: 500 }); fly(ctx, nd, p, to, 150, { ease: 'linear' }).then(() => nd.remove()); }); await wait(170 * ctx.sp); shake(ctx); }
      sets.flat().forEach(([n]) => fade(ctx, n, 250));
    },
  },
  toad_mouth_trap: {
    desc: 'User summons a red toad that bites the target.',
    async play(ctx) {
      const to = ctx.tos[0]; const { h } = sizeOf(ctx.targetEls[0]); const at = { x: to.x, y: to.y - 10 };
      const t = await summonPuff(ctx, at, ART9.toad(h * 0.9));
      await t.animate([{ transform: 'translate(-50%,-50%) scaleY(1)' }, { transform: 'translate(-50%,-50%) scaleY(.7)' }, { transform: 'translate(-50%,-50%) scaleY(1)' }], { duration: 300 * ctx.sp }).finished.catch(() => {});
      shake(ctx); await wait(500 * ctx.sp); smokeCloud(ctx, at, 100); t.remove();
    },
  },
  tobi_antics: {
    desc: 'User dances around.',
    async play(ctx) { await ctx.userEl.animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: 'translate(-12px,-16px) rotate(-12deg)' }, { transform: 'translate(12px,0) rotate(10deg)' }, { transform: 'translate(-8px,-18px) rotate(-8deg)' }, { transform: 'translate(10px,0) rotate(12deg)' }, { transform: 'translate(0,-10px) rotate(-6deg)' }, { transform: 'translate(0,0) rotate(0deg)' }], { duration: 1300 * ctx.sp, easing: 'ease-in-out' }).finished.catch(() => {}); FX.ring(ctx.arena, ctx.targetEls[0], 'gen'); },
  },
  totsuka_blade: {
    desc: 'User slashes the target with a giant orange blade that seals them away.',
    async play(ctx) {
      const to = ctx.tos[0]; const len = Math.hypot(to.x - ctx.from.x, to.y - ctx.from.y) * 1.05;
      const b = spawn(ctx, ART9.totsuka(len), { x: ctx.from.x, y: ctx.from.y - 40 }, { life: 1500 }); b.style.transformOrigin = '0 50%';
      const a = ang({ x: ctx.from.x, y: ctx.from.y - 40 }, to); const sw = ctx.isFoe ? 50 : -50;
      await b.animate([{ transform: `translate(0,-50%) rotate(${a + sw}deg)`, opacity: 0 }, { transform: `translate(0,-50%) rotate(${a + sw}deg)`, opacity: 1, offset: 0.3 }, { transform: `translate(0,-50%) rotate(${a}deg)`, opacity: 1 }], { duration: 520 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      const el = ctx.targetEls[0];
      el.animate([{ transform: 'scale(1)', filter: 'none', opacity: 1 }, { transform: 'scale(.4) translateY(-30px)', filter: 'brightness(2) sepia(1) hue-rotate(-10deg) saturate(4)', opacity: 0.2, offset: 0.6 }, { transform: 'scale(1)', filter: 'none', opacity: 1 }], { duration: 1000 * ctx.sp });
      boom(ctx, to, '#ffb84a', 160); shake(ctx); await wait(500 * ctx.sp); fade(ctx, b, 300);
    },
  },
  triple_scythe: {
    desc: "User slashes the target with Hidan's three-bladed scythe.",
    async play(ctx) {
      const to = ctx.tos[0]; lunge(ctx, to, 0.55, 600); await wait(150 * ctx.sp);
      const s = spawn(ctx, ART8.scythe(110).replace('class="ax-spin"', ''), between(ctx.from, to, 0.45), { life: 1200 });
      await s.animate([{ transform: `translate(-50%,-50%) rotate(${ctx.isFoe ? 80 : -80}deg)` }, { transform: `translate(-50%,-50%) rotate(${ctx.isFoe ? -60 : 60}deg)` }], { duration: 260 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      slashArc(ctx, to, { color: '#ff6a6a', glow: '#c8202a', size: 140, rot: 40 }); shake(ctx); fade(ctx, s, 250);
    },
  },
  madara_tsb: {
    desc: 'User strikes the target with a black staff.',
    async play(ctx) {
      const to = ctx.tos[0]; lunge(ctx, to, 0.55, 640); await wait(160 * ctx.sp);
      const pivot = between(ctx.from, to, 0.35); const a = ang(pivot, to); const sw = ctx.isFoe ? 75 : -75;
      const s = spawn(ctx, ART9.staffBlack(Math.max(80, Math.hypot(to.x - pivot.x, to.y - pivot.y))), pivot, { life: 1300 }); s.style.transformOrigin = '0 50%';
      await s.animate([{ transform: `translate(0,-50%) rotate(${a + sw}deg)` }, { transform: `translate(0,-50%) rotate(${a}deg)` }], { duration: 260 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      boom(ctx, to, '#6b4bd6', 120); shake(ctx); fade(ctx, s, 250);
    },
  },
  truth_seeking_balls: {
    desc: 'Six black orbs form in front of the user and shoot out at every enemy.',
    async play(ctx) {
      const orbs = Array.from({ length: 6 }, (_, i) => { const t = (i / 6) * Math.PI * 2; const p = { x: ctx.from.x + (ctx.isFoe ? -50 : 50) + Math.cos(t) * 34, y: ctx.from.y - 30 + Math.sin(t) * 34 }; const o = spawn(ctx, '<div style="width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 38% 32%,#3a3a44,#050507 60%);box-shadow:0 0 10px #000"></div>', p, { life: 2200 }); o.style.opacity = '0'; setTimeout(() => pop(ctx, o, 150), i * 60 * ctx.sp); return [o, p]; });
      await wait(550 * ctx.sp);
      await Promise.all(orbs.map(([o, p], i) => { const ti = i % ctx.tos.length; return wait(i * 50 * ctx.sp).then(() => fly(ctx, o, p, ctx.tos[ti], 260, { rotate: 0, ease: 'ease-in' })).then(() => { o.remove(); boom(ctx, ctx.tos[ti], '#3a3a44', 110); shakeEl(ctx.targetEls[ti]); }); }));
    },
  },
  tsukuyomi: { desc: 'A Sharingan appears over the target.', play: (ctx) => ANIMS.kotoamatsukami.play(ctx) },
  twin_rising_dragons: { desc: "Two smoke dragons rise from the ground on either side of the enemies, then shuriken, kunai and smoke bombs rain down on them all.", play: (ctx) => risingDragons(ctx, false) },
  rising_dragons_explosion: { desc: 'Like Twin Rising Dragons, but every weapon carries an explosive tag and blows up on impact.', play: (ctx) => risingDragons(ctx, true) },
});

// ---------------------------------------------------------------- batch 10 (sheet rows 344–383): the last of them
const ART10 = {
  gunbai: (h = 150) => `<div style="position:relative;width:${h * 0.5}px;height:${h}px"><svg width="${h * 0.5}" height="${h}" viewBox="0 0 50 100" style="position:absolute;inset:0;filter:drop-shadow(0 4px 4px #0008)"><rect x="22" y="60" width="6" height="40" rx="2" fill="#5a3a1e" stroke="#2a1a0e" stroke-width="1.5"/><path d="M25 3A15.5 15.5 0 0 1 36.5 29 16.5 16.5 0 1 1 13.5 29 15.5 15.5 0 0 1 25 3Z" fill="#ece6d6" stroke="#1e1a17" stroke-width="2.5" stroke-linejoin="round"/><path d="M14.5 30.5Q25 26 35.5 30.5" stroke="#1e1a17" stroke-width="1.6" fill="none"/></svg><img src="sprites/battle/uchiha-logo.webp" style="position:absolute;left:50%;top:${h * 0.455}px;height:${h * 0.24}px;transform:translate(-50%,-50%)"></div>`,
  knife: () => '<svg width="64" height="18" viewBox="0 0 64 18"><rect x="0" y="6" width="20" height="7" rx="2" fill="#5a3a1e"/><path d="M20 4H54C60 4 64 8 62 12L20 14Z" fill="#e6eaef" stroke="#7a8088" stroke-width="1.5"/></svg>',
  shark: (s = 70) => `<svg width="${s}" height="${s * 0.5}" viewBox="0 0 70 35" style="filter:drop-shadow(0 0 6px #4ab0ff)"><path d="M2 18C14 6 40 4 56 12L68 18 56 24C40 30 14 30 2 18Z" fill="#7ec8ffcc" stroke="#e6f7ff" stroke-width="2"/><path d="M30 8 36 0 40 10Z" fill="#7ec8ffcc" stroke="#e6f7ff" stroke-width="1.5"/><path d="M2 18 0 8 8 16 0 28Z" fill="#7ec8ffcc" stroke="#e6f7ff" stroke-width="1.5"/><circle cx="56" cy="15" r="1.8" fill="#0a2a4a"/><path d="M52 22 56 20 60 22 64 20" stroke="#fff" stroke-width="1.5" fill="none"/></svg>`,
  waterDragon: (w = 220, c = '#7ec8ff', g = '#4ab0ff') => `<svg width="${w}" height="${w * 0.4}" viewBox="0 0 200 80" style="filter:drop-shadow(0 0 10px ${g})"><path d="M0 44C20 20 40 64 64 40S104 18 128 38 160 50 172 36" stroke="${c}cc" stroke-width="18" fill="none" stroke-linecap="round"/><path d="M0 44C20 20 40 64 64 40S104 18 128 38 160 50 172 36" stroke="#ffffff88" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="6 10"/><path d="M166 22 198 34 176 44 198 52 166 56Z" fill="${c}dd" stroke="#ffffff" stroke-width="2"/><path d="M168 24 160 8M178 26 180 10" stroke="#ffffff" stroke-width="2.5"/><circle cx="180" cy="34" r="2.5" fill="#0a2a4a"/></svg>`,
  coral: (h = 90) => `<svg width="${h * 0.6}" height="${h}" viewBox="0 0 60 100"><path d="M30 100V60M30 70 14 44 10 24M30 64 44 40 50 18M14 44 4 34M44 40 56 34M30 60 28 30 32 8" stroke="#ff8a9a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M30 100V60M30 70 14 44 10 24M30 64 44 40 50 18M28 30 32 8" stroke="#ffc2ca" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  puppetMan: (h = 100) => `<svg width="${h * 0.6}" height="${h}" viewBox="0 0 60 100"><circle cx="30" cy="16" r="11" fill="#d9b38a" stroke="#6b4a2a" stroke-width="2"/><path d="M19 12Q30 0 41 12L40 8Q30 -2 20 8Z" fill="#c8302a"/><path d="M12 30H48L54 88 44 100H16L6 88Z" fill="#1a1a1e" stroke="#000" stroke-width="2"/><path d="M12 32 2 58M48 32 58 58" stroke="#d9b38a" stroke-width="6" stroke-linecap="round"/></svg>`,
  puppetWoman: (h = 100) => `<svg width="${h * 0.6}" height="${h}" viewBox="0 0 60 100"><path d="M18 12C14 30 16 50 20 58M42 12C46 30 44 50 40 58" stroke="#6b3a1e" stroke-width="7" fill="none"/><circle cx="30" cy="16" r="11" fill="#d9b38a" stroke="#6b4a2a" stroke-width="2"/><path d="M19 14Q30 0 41 14Q30 6 19 14Z" fill="#6b3a1e"/><path d="M12 30H48L54 88 44 100H16L6 88Z" fill="#2f7a3a" stroke="#14401a" stroke-width="2"/><path d="M12 32 2 58M48 32 58 58" stroke="#d9b38a" stroke-width="6" stroke-linecap="round"/></svg>`,
  airBlade: (s = 90) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100" style="filter:drop-shadow(0 0 8px #bfe9ff)"><path d="M10 80C30 30 70 10 95 12 70 22 42 44 22 86Z" fill="#e8f8ffcc" stroke="#ffffff" stroke-width="2"/></svg>`,
  tree: (h = 140) => `<svg width="${h * 0.6}" height="${h}" viewBox="0 0 60 100"><path d="M30 100V40M30 60 14 40M30 52 46 34" stroke="#7a4e2a" stroke-width="9" stroke-linecap="round"/><g fill="#3f7a3a" stroke="#2c5a28" stroke-width="2"><circle cx="30" cy="26" r="18"/><circle cx="14" cy="38" r="12"/><circle cx="46" cy="32" r="13"/></g></svg>`,
  woodGolem: (h = 220) => ART3.golem(h).replaceAll('#8a7f72', '#9b6b3e').replaceAll('#4e463e', '#5a3a1e').replaceAll('#5f564c', '#6b4626').replace('stroke="#ffcf5a"', 'stroke="#ff9a3a"'),
  bone: (l = 70) => `<svg width="${l}" height="14" viewBox="0 0 ${l} 14"><path d="M0 7 10 2H${l - 14}L${l} 7 ${l - 14} 12H10Z" fill="#f4f1e8" stroke="#bfb7a2" stroke-width="1.5"/></svg>`,
};
const glitch = (h) => `<div class="ax-glitch" style="width:${h * 0.5}px;height:${h * 0.78}px;background:repeating-linear-gradient(0deg,#000 0 10px,#1b1630 10px 13px,#000 13px 22px);box-shadow:0 0 18px #6b4bd6, inset 0 0 0 2px #2a2050"></div>`;
const waterBall = (s = 30) => `<div style="width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,#bfe8ff 30%,#4ab0ff 70%);box-shadow:0 0 10px #4ab0ff"></div>`;
const splash = (ctx, at, n = 10, r = 70) => { for (let i = 0; i < n; i++) { const d = spawn(ctx, '<div style="width:8px;height:8px;border-radius:50%;background:#bfe8ff"></div>', at, { life: 700 }); const t = rnd(0, Math.PI * 2); fly(ctx, d, at, { x: at.x + Math.cos(t) * r, y: at.y + Math.sin(t) * r * 0.8 }, 400, { rotate: 0, ease: 'ease-out' }).then(() => d.remove()); } };
function waterWave(ctx, h = 0.9) { const box = sideBox(ctx); return sandWave(ctx, ctx.from, box.c, box.w + 140, box.h * h, 560).then((wv) => { wv.firstElementChild.style.background = 'radial-gradient(ellipse at 50% 30%,#e6f7ff,#7ec8ff 50%,#2a7ad8)'; wv.firstElementChild.style.boxShadow = '0 0 16px #4ab0ff'; return wv; }); }
async function waterSphere(ctx, sharks) {
  const to = ctx.tos[0]; const el = ctx.targetEls[0]; const { h } = sizeOf(el);
  lunge(ctx, to, 0.6, 600); await wait(280 * ctx.sp);
  const s = spawn(ctx, `<div style="width:${h * 0.95}px;height:${h * 0.95}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffffff88,#7ec8ff66 40%,#2a7ad888);border:3px solid #bfe8ffcc;box-shadow:0 0 18px #4ab0ff"></div>`, to, { life: 2600 });
  await grow(ctx, s, 300, 'scale(.2)', 'scale(1)'); splash(ctx, to, 10, h * 0.5);
  if (sharks) for (let i = 0; i < 4; i++) { const t = rnd(0, Math.PI * 2); const st = { x: to.x + Math.cos(t) * h * 0.35, y: to.y + Math.sin(t) * h * 0.35 }; const sh = spawn(ctx, ART10.shark(46), st, { life: 900 }); fly(ctx, sh, st, to, 260, { rotate: 0 }).then(() => { sh.remove(); boom(ctx, to, '#7ec8ff', 60); shakeEl(el); }); await wait(140 * ctx.sp); }
  shake(ctx); await wait(500 * ctx.sp); fade(ctx, s, 300);
}
async function windBlades(ctx, { size = 90, perTarget = 1, single = false } = {}) {
  ctx.userEl.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${ctx.isFoe ? 12 : -12}px,0)`, offset: 0.3 }, { transform: 'translate(0,0)' }], { duration: 420 * ctx.sp });
  const tos = single ? [ctx.tos[0]] : ctx.tos;
  await Promise.all(tos.flatMap((t, i) => Array.from({ length: perTarget }, (_, k) => wait(k * 90 * ctx.sp).then(async () => { const b = spawn(ctx, ART10.airBlade(size), ctx.from, { life: 1000 }); if (t.x < ctx.from.x) b.firstElementChild.style.transform = 'scaleX(-1)'; await fly(ctx, b, ctx.from, { x: t.x + rnd(-10, 10), y: t.y + rnd(-14, 14) }, 340, { rotate: 0, ease: 'ease-in' }); b.remove(); FX.fx(ctx.arena, 'slash', t); shakeEl(ctx.targetEls[i]); }))));
}

Object.assign(ANIMS, {
  uchiha_gunbai: {
    desc: 'User sets the Uchiha war fan down in front of them.',
    async play(ctx) { const { h } = ctx.userSize; const f = feetOf(ctx, ctx.userEl); const g = spawn(ctx, ART10.gunbai(h * 0.85), { x: f.x + (ctx.isFoe ? -50 : 50), y: f.y + 4 }, { life: 1900 }); await rise(ctx, g, 380); puff(ctx, { x: f.x + (ctx.isFoe ? -50 : 50), y: f.y }, '#b9a689', 70); await wait(800 * ctx.sp); fade(ctx, g, 300); },
  },
  madara_taijutsu: { desc: 'User hits the target with a flurry of blows.', play: (ctx) => flurryIn(ctx, 8) },
  universal_pull: {
    desc: 'The opposite of Almighty Push: a purple ring closes in and drags the target toward the user.',
    async play(ctx) {
      const to = ctx.tos[0]; const el = ctx.targetEls[0]; const { h } = sizeOf(el);
      const r = spawn(ctx, `<div style="width:${h}px;height:${h}px;border-radius:50%;border:5px solid #d6c4ff;box-shadow:0 0 18px #b99cff"></div>`, to, { life: 1200 });
      r.animate([{ transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }], { duration: 450 * ctx.sp, easing: 'ease-in', fill: 'forwards' });
      await wait(350 * ctx.sp);
      const dx = (ctx.from.x - to.x) * 0.4; const dy = (ctx.from.y - to.y) * 0.4;
      el.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px)`, offset: 0.4 }, { transform: `translate(${dx}px,${dy}px)`, offset: 0.7 }, { transform: 'translate(0,0)' }], { duration: 1000 * ctx.sp, easing: 'ease-in-out' });
      await wait(400 * ctx.sp); shake(ctx); wrapRing(ctx, el, 'border:4px solid #d6c4ff;box-shadow:0 0 10px #b99cff', 500); await wait(500 * ctx.sp); fade(ctx, r, 200);
    },
  },
  shadow_clone_barrage: {
    desc: 'User and four clones strike the enemy with a flurry of blows.',
    async play(ctx) {
      const to = ctx.tos[0]; const { h } = sizeOf(ctx.targetEls[0]);
      const spots = [[-0.45, 0], [0.45, 0], [-0.3, -0.25], [0.3, -0.25]].map(([dx, dy]) => ({ x: to.x + dx * h, y: to.y + dy * h }));
      const gs = await Promise.all(spots.map((p, i) => wait(i * 60 * ctx.sp).then(async () => { const st = { x: ctx.from.x + (i - 1.5) * 30, y: ctx.from.y }; smokeCloud(ctx, st, 50); const g = ghostOf(ctx, st, 0.95); g.firstElementChild.style.filter = 'none'; await fly(ctx, g, st, p, 280, { rotate: 0 }); return g; })));
      lunge(ctx, to, 0.65, 1100);
      for (let i = 0; i < 10; i++) { boom(ctx, { x: to.x + rnd(-36, 36), y: to.y + rnd(-50, 30) }, '#ffffff', 60); shake(ctx); await wait(70 * ctx.sp); }
      gs.forEach((g, i) => { smokeCloud(ctx, spots[i], 50); g.remove(); });
    },
  },
  kushina_blade: { desc: 'User slashes the target with a kitchen knife.', async play(ctx) { const to = ctx.tos[0]; const hit = lunge(ctx, to, 0.66, 500); const k = spawn(ctx, ART10.knife(), ctx.from, { life: 900 }); if (ctx.isFoe) k.firstElementChild.style.transform = 'scaleX(-1)'; await fly(ctx, k, ctx.from, hit, 230, { rotate: ctx.isFoe ? 30 : -30 }); slashArc(ctx, to, { color: '#f2f4f7', glow: '#9aa3ad', size: 100, rot: 30 }); shake(ctx); fade(ctx, k, 200); } },
  water_mirror: {
    desc: 'User creates a clone that stands in front of them; when it is hit, it dissolves into a puddle of water.',
    play: (ctx) => ANIMS.clone_feint.play(ctx),
    decoy(ctx, el) {
      const f = feetOf({ arena: ctx.arena }, el);
      el.animate([{ transform: 'scaleY(1)', filter: 'none', opacity: 1, transformOrigin: '50% 100%' }, { transform: 'scaleY(.05)', filter: 'brightness(1.4) sepia(1) hue-rotate(170deg) saturate(3)', opacity: 1, offset: 0.3, transformOrigin: '50% 100%' }, { transform: 'scaleY(.05)', opacity: 0, offset: 0.8, transformOrigin: '50% 100%' }, { transform: 'scaleY(1)', opacity: 1, transformOrigin: '50% 100%' }], { duration: 1500 * ctx.sp });
      const p = spawn(ctx, '<div style="width:150px;height:30px;border-radius:50%;background:radial-gradient(ellipse,#bfe8ffee,#4ab0ffbb 55%,#4ab0ff00 72%)"></div>', f, { life: 1600, z: 1 });
      p.animate([{ transform: 'translate(-50%,-50%) scale(.2)' }, { transform: 'translate(-50%,-50%) scale(1)', offset: 0.3 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], { duration: 1500 * ctx.sp, fill: 'forwards' });
      splash({ arena: ctx.arena, sp: ctx.sp }, { x: f.x, y: f.y - 20 }, 10, 60);
    },
  },
  shark_dance: { desc: 'User dashes at the target and traps them in a sphere of water full of water sharks that strike them.', play: (ctx) => waterSphere(ctx, true) },
  water_prison: { desc: 'User dashes at the target and traps them in a sphere of water.', play: (ctx) => waterSphere(ctx, false) },
  coral_palm: {
    desc: 'Corals sprout from the ground, striking and binding the target.',
    async play(ctx) { const el = ctx.targetEls[0]; const f = feetOf(ctx, el); const { h } = sizeOf(el); const cs = [-36, -14, 10, 32].map((dx, i) => { const c = spawn(ctx, ART10.coral(h * rnd(0.5, 0.8)), { x: f.x + dx, y: f.y + 6 }, { life: 1800 }); rise(ctx, c, 280, i * 60); return c; }); await wait(450 * ctx.sp); wrapRing(ctx, el, 'border:4px solid #ff8a9a;box-shadow:0 0 8px #ffc2ca', 600); shake(ctx); await wait(600 * ctx.sp); cs.forEach((c) => fade(ctx, c, 300)); },
  },
  water_shockwave: { desc: 'User spits a wall of water that crashes into every enemy.', async play(ctx) { const wv = await waterWave(ctx, 1.1); ctx.tos.forEach((t) => { boom(ctx, t, '#7ec8ff', 120); splash(ctx, t); }); shake(ctx); fade(ctx, wv, 400); } },
  raging_waves: { desc: 'User spits a wave of water that crashes into every enemy.', async play(ctx) { const wv = await waterWave(ctx, 0.8); ctx.tos.forEach((t) => { boom(ctx, t, '#7ec8ff', 110); splash(ctx, t); }); shake(ctx); fade(ctx, wv, 400); } },
  great_waterfall: {
    desc: 'Water pours down from above, dousing the enemy team.',
    async play(ctx) {
      const box = sideBox(ctx);
      for (let i = 0; i < 60; i++) { const x = rnd(box.x1 - 30, box.x2 + 30); const st = { x, y: -20 }; const d = spawn(ctx, `<div style="width:${rnd(6, 12)}px;height:${rnd(22, 40)}px;border-radius:40%;background:#7ec8ffdd;box-shadow:0 0 4px #4ab0ff"></div>`, st, { life: 900 }); fly(ctx, d, st, { x, y: rnd(box.y1 + box.h * 0.4, box.y2) }, rnd(280, 380), { rotate: 0, ease: 'ease-in' }).then(() => d.remove()); await wait(8 * ctx.sp); }
      await wait(250 * ctx.sp); ctx.tos.forEach((t) => splash(ctx, t, 12, 80)); shake(ctx);
    },
  },
  shark_bomb: { desc: 'User forms a shark of water and fires it at the target.', async play(ctx) { const to = ctx.tos[0]; const s = spawn(ctx, ART10.shark(110), ctx.from, { life: 1200 }); if (to.x < ctx.from.x) s.firstElementChild.style.transform = 'scaleX(-1)'; await pop(ctx, s, 200); await fly(ctx, s, ctx.from, to, 420, { rotate: 0, ease: 'ease-in' }); s.remove(); boom(ctx, to, '#7ec8ff', 150); splash(ctx, to, 14, 90); shake(ctx); } },
  thousand_sharks: {
    desc: 'User sends a swarm of water sharks to strike each enemy.',
    async play(ctx) { await Promise.all(Array.from({ length: 14 }, (_, i) => { const ti = i % ctx.tos.length; const t = ctx.tos[ti]; const st = { x: ctx.from.x + rnd(-30, 30), y: ctx.from.y + rnd(-40, 30) }; return wait(i * 40 * ctx.sp).then(async () => { const s = spawn(ctx, ART10.shark(54), st, { life: 1000 }); if (t.x < st.x) s.firstElementChild.style.transform = 'scaleX(-1)'; await fly(ctx, s, st, { x: t.x + rnd(-20, 20), y: t.y + rnd(-30, 20) }, 380, { rotate: 0, arc: rnd(-30, 40) }); s.remove(); splash(ctx, t, 5, 50); shakeEl(ctx.targetEls[ti]); }); })); },
  },
  water_dragon: { desc: 'User fires a water dragon at the target.', async play(ctx) { const to = ctx.tos[0]; const d = spawn(ctx, ART10.waterDragon(200), ctx.from, { life: 1300 }); if (to.x < ctx.from.x) d.firstElementChild.style.transform = 'scaleX(-1)'; await fly(ctx, d, ctx.from, to, 520, { rotate: 0, ease: 'ease-in', arc: 40 }); d.remove(); boom(ctx, to, '#7ec8ff', 170); splash(ctx, to, 14, 90); shake(ctx); } },
  water_dragon_mist: { desc: 'User fires a water dragon that hits the target at high speed.', async play(ctx) { const to = ctx.tos[0]; const d = spawn(ctx, ART10.waterDragon(200), ctx.from, { life: 900 }); if (to.x < ctx.from.x) d.firstElementChild.style.transform = 'scaleX(-1)'; await fly(ctx, d, ctx.from, to, 240, { rotate: 0, ease: 'ease-in' }); d.remove(); boom(ctx, to, '#7ec8ff', 170); splash(ctx, to, 14, 90); shake(ctx); } },
  steaming_tyrant: {
    desc: 'User shoots a stream of hot water at the target that bursts into steam.',
    async play(ctx) { const to = ctx.tos[0]; for (let i = 0; i < 12; i++) { const b = spawn(ctx, waterBall(rnd(14, 22)), ctx.from, { life: 700 }); fly(ctx, b, ctx.from, { x: to.x + rnd(-10, 10), y: to.y + rnd(-14, 14) }, 300, { rotate: 0, ease: 'linear' }).then(() => b.remove()); await wait(25 * ctx.sp); } await wait(300 * ctx.sp); boom(ctx, to, '#ffb37a', 150); for (let i = 0; i < 8; i++) puff(ctx, { x: to.x + rnd(-40, 40), y: to.y + rnd(-50, 30) }, '#f4f4f4', 90); shake(ctx); },
  },
  water_formation_wall: {
    desc: 'User raises a wall of water in front of every ally.',
    async play(ctx) { const box = sideBox(ctx); const wall = spawn(ctx, ART5.waterShield(box.w + 60, box.h * 0.7).replace('border-radius:44% 44% 10px 10px', 'border-radius:30px 30px 6px 6px'), { x: box.c.x + (ctx.isFoe ? -30 : 30), y: box.y2 + 10 }, { life: 2000, z: 7 }); await rise(ctx, wall, 480); await wait(700 * ctx.sp); fade(ctx, wall, 350); },
  },
  water_gun: { desc: 'User fires a ball of water at the target at high speed.', async play(ctx) { const to = ctx.tos[0]; const b = spawn(ctx, waterBall(26), ctx.from, { life: 700 }); await fly(ctx, b, ctx.from, to, 180, { rotate: 0, ease: 'linear' }); b.remove(); boom(ctx, to, '#7ec8ff', 90); splash(ctx, to); shake(ctx); } },
  mother_father: {
    desc: "A man puppet (light-brown skin, short red hair, black cloak) and a woman puppet (light-brown skin, long brown hair, green cloak) appear by the user on chakra threads, then fly to the target and grab them.",
    async play(ctx) {
      const to = ctx.tos[0]; const { h } = ctx.userSize; const hands = { x: ctx.from.x, y: ctx.from.y - h * 0.1 };
      const ps = [[ART10.puppetMan, -1], [ART10.puppetWoman, 1]].map(([fn, s]) => { const at = { x: ctx.from.x + s * 50, y: ctx.from.y - h * 0.15 }; const p = spawn(ctx, fn(h * 0.5), at, { life: 2400 }); pop(ctx, p, 200); return [p, at, s]; });
      const ths = await Promise.all(ps.map(([p, at]) => stretch(ctx, hands, at, blueThread, 100, 2400)));
      await wait(250 * ctx.sp);
      await Promise.all(ps.map(([p, at, s]) => fly(ctx, p, at, { x: to.x + s * 24, y: to.y }, 360, { rotate: 0, ease: 'ease-in' })));
      wrapRing(ctx, ctx.targetEls[0], 'border:3px solid #8fd3ff;box-shadow:0 0 8px #4aa3ff', 600); boom(ctx, to, '#ffffff', 90); shake(ctx);
      await wait(500 * ctx.sp); ps.forEach(([p]) => fade(ctx, p, 300)); ths.forEach((t) => fade(ctx, t, 300));
    },
  },
  needle_jizo: {
    desc: 'Spiky white hair wraps around the user.',
    async play(ctx) { const { w, h } = ctx.userSize; const n = spawn(ctx, `<svg width="${w * 1.1}" height="${h}" viewBox="0 0 100 100" preserveAspectRatio="none">${Array.from({ length: 22 }, (_, i) => { const a = (i / 22) * Math.PI * 2; return `<path d="M50 50L${50 + Math.cos(a) * 48} ${50 + Math.sin(a) * 48}" stroke="#f4f4f4" stroke-width="5" stroke-linecap="round"/>`; }).join('')}<ellipse cx="50" cy="50" rx="34" ry="40" fill="#e8e8e8ee" stroke="#bdbdbd" stroke-width="2"/></svg>`, ctx.from, { life: 1800 }); await grow(ctx, n, 380, 'scale(.2)', 'scale(1)'); await wait(700 * ctx.sp); fade(ctx, n, 300); },
  },
  cutting_whirlwind: { desc: 'User swings their giant fan and sends wind blades at every enemy.', play: (ctx) => windBlades(ctx, { size: 90 }) },
  great_sickle_weasel: { desc: 'User swings their giant fan and sends one wind blade at each enemy at the same time.', play: (ctx) => windBlades(ctx, { size: 120 }) },
  great_breakthrough: {
    desc: 'User swings their giant fan and sends a giant wind blade that strikes every enemy.',
    async play(ctx) { const box = sideBox(ctx); const b = spawn(ctx, ART10.airBlade(Math.max(180, box.w * 0.7)), ctx.from, { life: 1200 }); if (box.c.x < ctx.from.x) b.firstElementChild.style.transform = 'scaleX(-1)'; await fly(ctx, b, ctx.from, box.c, 420, { rotate: 0, scale: [0.4, 1], ease: 'ease-in' }); ctx.tos.forEach((t) => FX.fx(ctx.arena, 'slash', t)); shake(ctx); fade(ctx, b, 250); },
  },
  dust_wind: {
    desc: 'User swings their giant fan and blows a ball of air at the target.',
    async play(ctx) { const to = ctx.tos[0]; const b = spawn(ctx, '<div style="width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,#ffffff44,#e8f8ff88 60%,#e8f8ff00 72%);border:3px solid #f4fcffcc;box-shadow:0 0 16px #bfe9ff"></div>', ctx.from, { life: 1100 }); await fly(ctx, b, ctx.from, to, 380, { rotate: 0, scale: [0.4, 1.3], ease: 'ease-in' }); b.remove(); boom(ctx, to, '#f4fcff', 150); puff(ctx, to, '#ffffff', 100); shake(ctx); },
  },
  wind_blade_dust: { desc: 'User blows a cloud of dust at the enemies.', async play(ctx) { const { fog, go } = mistOver(ctx, '#c9b48a'); await go; ctx.targetEls.forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }], { duration: 900 * ctx.sp })); setTimeout(() => fade(ctx, fog, 600), 600 * ctx.sp); await wait(300 * ctx.sp); } },
  pressure_damage: {
    desc: 'User blows a gale at the enemies that whirls them in a vortex.',
    async play(ctx) { const vs = ctx.tos.map((t, i) => { const { w, h } = sizeOf(ctx.targetEls[i]); const v = vortex(ctx, t, w * 0.9, h * 0.9, '#e8f8ff'); v.style.opacity = '0'; return v; }); await wait(150 * ctx.sp); vs.forEach((v) => pop(ctx, v, 250)); ctx.targetEls.forEach((el) => el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(0deg)' }], { duration: 300 * ctx.sp, iterations: 3 })); await wait(800 * ctx.sp); shake(ctx); vs.forEach((v) => fade(ctx, v, 300)); },
  },
  rasenshuriken: {
    desc: 'User forms a Rasenshuriken, flies at the target and strikes them with it; on impact it bursts into a blue dome.',
    async play(ctx) {
      const to = ctx.tos[0]; const hand = { x: ctx.from.x, y: ctx.from.y - ctx.userSize.h * 0.45 };
      const rs = spawn(ctx, `<div style="position:relative;width:120px;height:120px"><div class="ax-spin" style="position:absolute;inset:0;animation-duration:.25s;background:conic-gradient(#e8f6ff 0 8deg,#0000 8deg 90deg,#e8f6ff 90deg 98deg,#0000 98deg 180deg,#e8f6ff 180deg 188deg,#0000 188deg 270deg,#e8f6ff 270deg 278deg,#0000 278deg);-webkit-mask:radial-gradient(circle,#0000 30%,#000 32%,#000 70%,#0000 71%);mask:radial-gradient(circle,#0000 30%,#000 32%,#000 70%,#0000 71%);filter:drop-shadow(0 0 8px #9fd8ff)"></div><div style="position:absolute;left:30px;top:30px">${ART.rasengan(60)}</div></div>`, hand, { life: 2400 });
      await pop(ctx, rs, 400); await wait(150 * ctx.sp);
      lunge(ctx, to, 0.72, 600); await fly(ctx, rs, hand, to, 300, { rotate: 0, ease: 'ease-in' }); rs.remove();
      const { h } = sizeOf(ctx.targetEls[0]); const dome = spawn(ctx, `<div style="width:${h * 1.4}px;height:${h * 1.2}px;border-radius:50%;background:radial-gradient(ellipse,#ffffff 0%,#cfeeffcc 30%,#6cb8ff88 55%,#6cb8ff00 72%);box-shadow:0 0 30px #6cb8ff"></div>`, to, { life: 1500 });
      await grow(ctx, dome, 380, 'scale(.05)', 'scale(1)'); shake(ctx); await wait(250 * ctx.sp); fade(ctx, dome, 400); shakeEl(ctx.userEl);
    },
  },
  vacuum_blade: {
    desc: 'User fires wind blades in the shape of an X at the target.',
    async play(ctx) { const to = ctx.tos[0]; await Promise.all([0, 1].map((k) => wait(k * 70 * ctx.sp).then(async () => { const b = spawn(ctx, ART10.airBlade(90), ctx.from, { life: 900 }); await fly(ctx, b, ctx.from, to, 300, { rotate: 0, ease: 'ease-in' }); b.remove(); }))); slashArc(ctx, to, { color: '#f4fcff', glow: '#bfe9ff', rot: 0, size: 120 }); slashArc(ctx, to, { color: '#f4fcff', glow: '#bfe9ff', rot: 90, size: 120 }); shake(ctx); },
  },
  vacuum_sphere: {
    desc: 'User fires a volley of small wind balls at every enemy.',
    async play(ctx) { await Promise.all(Array.from({ length: 12 }, (_, i) => { const ti = i % ctx.tos.length; const t = ctx.tos[ti]; return wait(i * 45 * ctx.sp).then(async () => { const b = spawn(ctx, '<div style="width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,#ffffff,#e8f8ff88 60%,#e8f8ff00 72%);border:2px solid #f4fcffcc"></div>', ctx.from, { life: 700 }); await fly(ctx, b, ctx.from, { x: t.x + rnd(-20, 20), y: t.y + rnd(-30, 20) }, 260, { rotate: 0, ease: 'linear' }); b.remove(); puff(ctx, t, '#ffffff', 50); shakeEl(ctx.targetEls[ti]); }); })); },
  },
  wind_barrier: {
    desc: 'User raises a wall of wind in front of them.',
    async play(ctx) { const { h } = ctx.userSize; const f = feetOf(ctx, ctx.userEl); const x = f.x + (ctx.isFoe ? -48 : 48); const wall = spawn(ctx, `<div style="width:56px;height:${h * 0.95}px;border-radius:24px;background:repeating-linear-gradient(170deg,#ffffff00 0 8px,#f4fcff88 8px 11px);box-shadow:0 0 18px #bfe9ff;animation:ax-flicker .3s infinite"></div>`, { x, y: f.y + 4 }, { life: 1800 }); await rise(ctx, wall, 350); for (let i = 0; i < 6; i++) puff(ctx, { x: x + rnd(-14, 14), y: f.y - rnd(0, h * 0.9) }, '#f4fcff', 40); await wait(700 * ctx.sp); fade(ctx, wall, 300); },
  },
  wood_clone: {
    desc: 'When the user is struck, they turn into a wooden mannequin.',
    async play(ctx) { FX.ring(ctx.arena, ctx.userEl, 'aura'); await wait(400 * ctx.sp); },
    decoy(ctx, el) { const f = feetOf({ arena: ctx.arena }, el); const { h } = sizeOf(el); el.animate([{ opacity: 1 }, { opacity: 0, offset: 0.08 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1500 * ctx.sp }); const m = spawn(ctx, ART2.mannequin(h * 0.9).replaceAll('#e8ddd0', '#b07a46').replaceAll('#9a8c7e', '#5a3a1e').replaceAll('#b9a996', '#7a4e2a'), { x: f.x, y: f.y - h * 0.45 }, { life: 1700 }); m.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1400 * ctx.sp, fill: 'forwards' }); },
  },
  deep_forest: {
    desc: 'Large trees burst up at every enemy’s feet.',
    async play(ctx) { const ts = []; ctx.targetEls.forEach((el, i) => { const f = feetOf(ctx, el); const { h } = sizeOf(el); [-40, 0, 40].forEach((dx, k) => { const t = spawn(ctx, ART10.tree(h * rnd(0.8, 1.1)), { x: f.x + dx, y: f.y + 6 }, { life: 1900 }); rise(ctx, t, 350, k * 70 + i * 40); ts.push(t); }); }); await wait(450 * ctx.sp); shake(ctx); await wait(700 * ctx.sp); ts.forEach((t) => fade(ctx, t, 300)); },
  },
  wood_prison: {
    desc: 'User shoots wooden beams at the target that lock them in a wooden prison.',
    async play(ctx) {
      const to = ctx.tos[0]; const el = ctx.targetEls[0]; const { w, h } = sizeOf(el);
      const beam = (len) => `<svg width="${len}" height="14" viewBox="0 0 ${len} 14"><rect x="0" y="2" width="${len}" height="10" rx="4" fill="#9b6b3e" stroke="#5a3a1e" stroke-width="2"/></svg>`;
      const bs = await Promise.all([-14, 0, 14].map((dy, i) => wait(i * 60 * ctx.sp).then(() => stretch(ctx, { x: ctx.from.x, y: ctx.from.y + dy }, { x: to.x, y: to.y + dy }, beam, 300, 1600))));
      bs.forEach((b) => fade(ctx, b, 250));
      const cage = spawn(ctx, `<div style="width:${w * 0.95}px;height:${h * 0.95}px;border:6px solid #8b5a32;border-radius:8px;background:repeating-linear-gradient(90deg,#0000 0 18px,#9b6b3e 18px 26px);box-shadow:0 0 8px #000"></div>`, to, { life: 1800 });
      await grow(ctx, cage, 280, 'scaleY(.1)', 'scaleY(1)'); shake(ctx); await wait(650 * ctx.sp); fade(ctx, cage, 300);
    },
  },
  wood_spikes: {
    desc: 'Chaotic spikes of wood burst out at the target’s feet.',
    async play(ctx) { const el = ctx.targetEls[0]; const f = feetOf(ctx, el); const { h } = sizeOf(el); const ss = Array.from({ length: 7 }, (_, i) => { const a = rnd(-30, 30); const n = spawn(ctx, `<svg width="16" height="${h * rnd(0.4, 0.8)}" viewBox="0 0 16 100" preserveAspectRatio="none"><path d="M8 0 16 100H0Z" fill="#9b6b3e" stroke="#5a3a1e" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`, { x: f.x + rnd(-45, 45), y: f.y + 6 }, { life: 1500 }); n.style.transformOrigin = '50% 100%'; n.animate([{ transform: `translate(-50%,-100%) rotate(${a}deg) scaleY(0)` }, { transform: `translate(-50%,-100%) rotate(${a}deg) scaleY(1)` }], { duration: 180 * ctx.sp, delay: i * 30 * ctx.sp, fill: 'both' }); return n; }); await wait(350 * ctx.sp); shake(ctx); await wait(500 * ctx.sp); ss.forEach((n) => fade(ctx, n, 300)); },
  },
  wood_dragon: { desc: 'User fires a wooden dragon at the target.', async play(ctx) { const to = ctx.tos[0]; const d = spawn(ctx, ART10.waterDragon(210, '#9b6b3e', '#5a3a1e').replace('#ffffff88', '#6b4626'), ctx.from, { life: 1300 }); if (to.x < ctx.from.x) d.firstElementChild.style.transform = 'scaleX(-1)'; await fly(ctx, d, ctx.from, to, 520, { rotate: 0, ease: 'ease-in', arc: 30 }); d.remove(); boom(ctx, to, '#d9b38a', 160); shake(ctx); } },
  wood_golem: {
    desc: 'User creates a wooden golem that appears beside the target and strikes them.',
    async play(ctx) { const el = ctx.targetEls[0]; const f = feetOf(ctx, el); const { h } = sizeOf(el); const side = ctx.isFoe ? 1 : -1; const at = { x: f.x + side * h * 0.42, y: f.y + 4 }; const g = spawn(ctx, ART10.woodGolem(h * 1.2), at, { life: 2200, z: 5 }); if (side > 0) g.firstElementChild.style.transform = 'scaleX(-1)'; await rise(ctx, g, 450); await g.animate([{ transform: 'translate(-50%,-100%) rotate(0deg)' }, { transform: `translate(-50%,-100%) rotate(${-side * 12}deg)`, offset: 0.4 }, { transform: `translate(-50%,-100%) translateX(${-side * 26}px) rotate(${side * 8}deg)` }], { duration: 300 * ctx.sp, fill: 'forwards' }).finished.catch(() => {}); boom(ctx, ctx.tos[0], '#d9b38a', 120); shake(ctx); setTimeout(() => fade(ctx, g, 350), 300 * ctx.sp); },
  },
  wood_wall: {
    desc: "User raises a domed wooden wall in front of the allies' side.",
    async play(ctx) { const box = sideBox(ctx); const d = spawn(ctx, `<div style="width:${box.w + 100}px;height:${box.h * 0.8}px;border-radius:50% 50% 8px 8px / 90% 90% 8px 8px;background:repeating-linear-gradient(90deg,#0000 0 22px,#5a3a1e99 22px 25px),radial-gradient(ellipse at 50% 30%,#c08a54,#9b6b3e 55%,#6b4626);box-shadow:0 0 10px #000a;opacity:.94"></div>`, { x: box.c.x + (ctx.isFoe ? -30 : 30), y: box.y2 + 8 }, { life: 1900, z: 7 }); await rise(ctx, d, 500); await wait(700 * ctx.sp); fade(ctx, d, 400); },
  },
  kurama_bomb_minato: { desc: 'A black orb with a purple aura and tiny blue and red sparks grows in front of the user, then fires at the enemies.', play: (ctx) => beastBomb(ctx) },
  yomotsu_hirasaka: {
    desc: 'User steps into a black, blocky, glitching portal, comes out of another one behind the target and strikes with a bone blade.',
    async play(ctx) {
      const to = ctx.tos[0]; const { h } = ctx.userSize; const behind = { x: to.x + (to.x - ctx.from.x) * 0.2, y: to.y - 10 };
      const p1 = spawn(ctx, glitch(h), { x: ctx.from.x + (ctx.isFoe ? -20 : 20), y: ctx.from.y }, { life: 2400 }); await pop(ctx, p1, 160);
      ctx.userEl.animate([{ opacity: 1 }, { opacity: 0, offset: 0.15 }, { opacity: 0, offset: 0.85 }, { opacity: 1 }], { duration: 1600 * ctx.sp });
      await wait(300 * ctx.sp);
      const p2 = spawn(ctx, glitch(h * 0.85), behind, { life: 1800 }); await pop(ctx, p2, 160);
      const g = ghostOf(ctx, behind, 0.9); const b = spawn(ctx, ART10.bone(80), behind, { life: 900 });
      await fly(ctx, b, behind, to, 160, { ease: 'ease-in' }); FX.fx(ctx.arena, 'slash', to); slashArc(ctx, to, { color: '#f4f1e8', glow: '#bfb7a2', size: 110, rot: 30 }); shake(ctx);
      await wait(400 * ctx.sp); [g, b, p2, p1].forEach((n) => fade(ctx, n, 250));
    },
  },
});

// ---------------------------------------------------------------- generic fallback (what every other jutsu does)
export function genericPlay(ctx) {
  const { j, arena, userEl, targetEls, from, sp } = ctx;
  const color = FX.jutsuColor(j);
  if (j.category === 'taijutsu' && targetEls.length && j.id !== 'kunai') {
    FX.lunge(userEl, from, ctx.tos[0], sp);
    setTimeout(() => targetEls.forEach((t) => FX.fx(arena, 'slash', FX.centerOf(t, arena))), 230 * sp);
  } else if (j.category === 'genjutsu') {
    FX.ring(arena, userEl, 'gen');
    targetEls.forEach((t) => setTimeout(() => FX.ring(arena, t, 'gen'), 250 * sp));
  } else if (j.target === 'self' || j.target === 'ally' || j.target === 'allAllies') {
    targetEls.forEach((t) => FX.ring(arena, t, j.category === 'medical' ? 'heal' : 'aura'));
  } else {
    targetEls.forEach((t) => FX.orb(arena, from, FX.centerOf(t, arena), color, { small: j.id === 'kunai', sp }));
  }
  return wait(450 * sp);
}

/**
 * Play a jutsu's animation. userEl / targetEls are the `.spr` elements; sideEls are all sprites on the targets' side.
 * Resolves when the hit lands. Returns true if a custom animation ran.
 */
export async function playJutsu(arena, j, userEl, targetEls, { sp = 1, sideEls = [], isFoe = false } = {}) {
  const ctx = { arena, j, userEl, targetEls, sideEls, sp, isFoe, from: FX.centerOf(userEl, arena), tos: targetEls.map((t) => FX.centerOf(t, arena)) };
  ctx.userSize = sizeOf(userEl);
  const a = ANIMS[j.id];
  if (a && targetEls.length) {
    try { await a.play(ctx); return true; } catch (err) { console.error('anim', j.id, err); }
  }
  await genericPlay(ctx);
  return false;
}

/** Play a jutsu-specific Decoy pop (e.g. Bubble Clone), if any. Returns true if it handled it. */
export function playDecoy(arena, jutsuId, el, { sp = 1 } = {}) {
  const a = ANIMS[jutsuId];
  if (!a?.decoy || !el) return false;
  a.decoy({ arena, sp }, el);
  return true;
}
