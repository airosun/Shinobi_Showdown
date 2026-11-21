#!/bin/sh
# Stage the studio as a static site (for publishing as an artifact or local testing): sh tools/studio/stage.sh <outdir>
set -e
OUT=${1:-/home/claude/studiopub}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
rm -rf "$OUT"; mkdir -p "$OUT/vendor" "$OUT/data" "$OUT/img"
cp "$ROOT/public/anim.js" "$ROOT/public/fx.js" "$ROOT/public/style.css" "$OUT/"
cp "$ROOT/public/data/"*.js "$ROOT/public/data/anim_tweaks.json" "$OUT/data/"
cp -r "$ROOT/public/fonts" "$ROOT/public/sprites" "$OUT/"
cp "$ROOT/public/img/"* "$OUT/img/"
python3 -c "import os,json,sys;d=sys.argv[1];json.dump(sorted(f for f in os.listdir(d) if os.path.isfile(os.path.join(d,f)) and f!='index.json'),open(os.path.join(d,'index.json'),'w'))" "$OUT/img"
cp "$ROOT/tools/studio/studio.html" "$OUT/index.html"
cp "$ROOT/tools/studio/studio.js" "$ROOT/tools/studio/studio.css" "$ROOT/tools/studio/sprites.json" "$OUT/"
cp "$ROOT/tools/studio/vendor/"*.js "$OUT/vendor/"
