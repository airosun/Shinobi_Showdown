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
  .ax-glitch { animation: ax-glitch .18s steps(2) infinite; }`;
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
  const { w, h } = sizeOf(ctx.userEl);
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
  ant: () => `<svg width="140" height="124" viewBox="0 0 90 80"><g stroke="#3a2a22" stroke-width="2"><path d="M20 30 4 18M20 40 2 40M20 50 4 62M70 30 86 18M70 40 88 40M70 50 86 62" stroke="#5e4a3e" stroke-width="5" stroke-linecap="round"/><ellipse cx="45" cy="42" rx="26" ry="30" fill="#7a6a5c"/><ellipse cx="45" cy="18" rx="13" ry="11" fill="#8c7b6c"/></g><path d="M37 9 31-2M53 9 59-2" stroke="#c8202a" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="18" r="2" fill="#111"/><circle cx="50" cy="18" r="2" fill="#111"/><path d="M33 40h24M33 50h24" stroke="#4a3a30" stroke-width="2"/></svg>`,
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
    desc: "Kankuro's Black Ant puppet (six-armed, gray-brown, red horns) flies to the target and grabs them.",
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
    desc: 'The puppet body engulfs the target, then its limbs fly in and stab them.',
    async play(ctx) {
      const el = ctx.targetEls[0]; const to = ctx.tos[0];
      const { h } = sizeOf(el);
      const body = spawn(ctx, ART.crowBody(h * 0.95), to, { life: 2200 });
      await body.animate([{ transform: 'translate(-50%,-50%) scale(1.8)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0.92 }], { duration: 380 * ctx.sp, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      const dirs = [0, 60, 120, 180, 240, 300];
      await Promise.all(dirs.map((d, i) => {
        const rad = (d * Math.PI) / 180;
        const start = { x: to.x + Math.cos(rad) * 110, y: to.y + Math.sin(rad) * 80 };
        const bl = spawn(ctx, ART.blade(46), start, { life: 900 });
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
