const p = require('puppeteer-core');
const fs = require('fs');
(async () => {
  const b = await p.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'], headless: 'new' });
  const pg = await b.newPage(); await pg.setViewport({ width: 1366, height: 860 });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  const w = (ms) => new Promise(r => setTimeout(r, ms));
  await pg.goto('http://localhost:8099/lab.html', { waitUntil: 'networkidle0' }); await w(1500);
  await pg.evaluate(() => {
    window.__cur = 'misc'; window.__cap = [];
    const seen = new Set();
    const grab = (el) => {
      const sp = el.dataset.sp; const key = window.__cur + '|' + sp;
      if (seen.has(key)) return; seen.add(key);
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      window.__cap.push({ cur: window.__cur, sp, html: el.outerHTML, w: el.getAttribute('width') || el.style.width || cs.width, h: el.getAttribute('height') || el.style.height || cs.height, cls: el.className?.baseVal ?? el.className, bw: r.width, bh: r.height, bg: el.tagName === 'DIV' ? cs.background : '' , br: cs.borderRadius, bd: cs.border, bs: cs.boxShadow });
    };
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType !== 1) continue; if (n.dataset?.sp) grab(n); n.querySelectorAll?.('[data-sp]').forEach(grab); } }).observe(document.body, { childList: true, subtree: true });
  });
  const ids = await pg.evaluate(async () => Object.keys((await import('./anim.js')).ANIMS));
  console.log('anims', ids.length);
  await pg.evaluate(() => { const s = document.getElementById('speed'); s.value = '0.5'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  for (const id of ids) {
    await pg.evaluate((id) => { window.__cur = id; const e = document.querySelector(`[data-act="pick"][data-arg="${id}"]`); if (e) e.click(); else window.__miss = (window.__miss || []).concat(id); }, id);
    await w(2300);
    const hasDecoy = await pg.evaluate(() => !!document.querySelector('[data-act=decoy]'));
    if (hasDecoy) { await pg.evaluate(() => document.querySelector('[data-act=decoy]').click()); await w(900); }
  }
  for (const a of ['poof', 'logsub']) { await pg.evaluate((a) => { window.__cur = a === 'poof' ? 'clone_poof' : 'log_substitution'; document.querySelector(`[data-act=${a}]`).click(); }, a); await w(1500); }
  const cap = await pg.evaluate(() => window.__cap);
  const miss = await pg.evaluate(() => window.__miss || []);
  fs.writeFileSync('/tmp/spr/cap.json', JSON.stringify(cap));
  console.log('captured', cap.length, 'unique sp', new Set(cap.map((c) => c.sp)).size, 'missing ids', miss.length, miss.slice(0, 10), 'errs', errs.slice(0, 5));
  await b.close();
})();
