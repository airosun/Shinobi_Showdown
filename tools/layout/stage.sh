#!/bin/sh
# Stage the Character Layout module as a static site: sh tools/layout/stage.sh <outdir>
set -e
OUT=${1:-/home/claude/layoutpub}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
rm -rf "$OUT"; mkdir -p "$OUT/data" "$OUT/img" "$OUT/sprites/battle"
cp "$ROOT/public/style.css" "$OUT/"
cp "$ROOT/public/data/shinobi.js" "$ROOT/public/data/layout.json" "$OUT/data/"
cp -r "$ROOT/public/fonts" "$OUT/"
cp "$ROOT/public/img/favicon-32.png" "$ROOT/public/img/konoha-orange.png" "$OUT/img/"
cp "$ROOT/public/sprites/manifest.json" "$OUT/sprites/"
python3 - "$ROOT/public/sprites" "$OUT/sprites" <<'PY'
import json, shutil, sys, os
src, out = sys.argv[1], sys.argv[2]
m = json.load(open(os.path.join(src, 'manifest.json')))
for a in m['sprites'].values():
    for k in ('front', 'face', 'transform', 'transformFace'):
        f = a.get(k)
        if f and os.path.exists(os.path.join(src, f)): shutil.copy(os.path.join(src, f), os.path.join(out, f))
PY
cp "$ROOT/tools/layout/layout.html" "$OUT/index.html"
cp "$ROOT/tools/layout/layout.js" "$ROOT/tools/layout/layout.css" "$OUT/"
