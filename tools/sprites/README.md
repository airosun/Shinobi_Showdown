# Animation sprites

Every piece drawn for the jutsu animations (each `<svg>` and drawn `<div>` in `public/anim.js`, plus the
`fx-*` effects from `public/fx.js`) carries a `data-sp="<name>"`. Put an image named `<name>.png`
(or .webp/.svg/.gif/.jpg) in `public/img/` and it replaces that piece everywhere. `<jutsu_id>__<name>.png`
replaces it for one jutsu only. The server lists `public/img` at `/img/index.json` for the client.

`index.html` here is the catalogue of every piece. To rebuild it after animation changes:
1. serve `public/` plus `tools/lab/lab.html` + `lab.js` on port 8099 and run `node capture.cjs`
   (needs puppeteer-core + Chrome; writes /tmp/spr/cap.json),
2. `node build.mjs /tmp/spr/cap.json <names.json>` (names list: every `data-sp` value in anim.js).
`tag.py` is the one-off script that added the `data-sp` names; new drawings need a `data-sp` added by hand.
