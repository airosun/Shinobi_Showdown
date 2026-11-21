// Builds tools/studio/sprites.json (every drawn piece: name, size, preview markup, which jutsu use it)
// from a lab capture (see tools/sprites/README.md).
import { readFileSync, writeFileSync } from 'node:fs';
import { JUTSU } from '../../public/data/jutsu.js';
const cap = JSON.parse(readFileSync(process.argv[2] || '/tmp/spr/cap2.json', 'utf8'));
const by = new Map();
for (const c of cap) {
  let name = c.sp;
  if (name.startsWith('fx-')) { const m = /class="fx ([^"]+)"/.exec(c.html); if (m) name = `fx-${m[1].trim().split(/\s+/).join('-')}`; }
  if (name === 'fx-log') continue;
  const e = by.get(name) || { name, uses: new Set(), w: parseFloat(c.w) || c.bw || 60, h: parseFloat(c.h) || c.bh || 60, html: c.html.replace(/ data-ovr="1"/g, '') };
  e.uses.add(c.cur);
  by.set(name, e);
}
const owner = (name) => Object.keys(JUTSU).find((id) => name === id || name.startsWith(`${id}-`)) || null;
const items = [...by.values()].map((e) => ({ name: e.name, own: owner(e.name), uses: [...e.uses], w: Math.round(e.w), h: Math.round(e.h), html: e.html }));
writeFileSync(new URL('./sprites.json', import.meta.url), JSON.stringify(items));
console.log(items.length, 'pieces', Math.round(JSON.stringify(items).length / 1024), 'KB');
