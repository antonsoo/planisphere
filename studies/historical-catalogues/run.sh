#!/bin/sh
# Reproduces results.json and the figures from the pinned catalogues.
# usage: studies/historical-catalogues/run.sh <scratch-dir> <python-with-numpy-and-scipy>
set -eu
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../.." && pwd)
scratch=$1
py=$2
mkdir -p "$scratch/js"
echo '{"type":"module"}' > "$scratch/js/package.json"
(cd "$root" && npx tsc --outDir "$scratch/js" --module nodenext --moduleResolution nodenext \
  --target es2022 --skipLibCheck src/astro/*.ts)
python3 -I "$here/parse.py" "$here/cache" "$scratch/catalogues.json"
node "$here/reduce.mjs" "$scratch/js/astro" "$scratch/catalogues.json" "$root/public/data/stars.json" "$scratch/reduced.json"
"$py" "$here/analyze.py" "$scratch/reduced.json" "$here/results.json"
python3 -I "$here/plot.py" "$here/results.json" "$root/docs/assets"
