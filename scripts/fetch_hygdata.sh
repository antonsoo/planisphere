#!/usr/bin/env bash
# Downloads the HYG v4.1 star database (David Nash / astronexus, CC BY-SA 4.0)
# into scripts/vendor/, where build_catalogue.py reads it. Not committed to the
# repo (see .gitignore) because it is a 34 MB source file that reduces to a
# ~200 KB JSON asset; re-run this script to reproduce that asset from scratch.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p vendor
curl -sfL -o vendor/hygdata_v41.csv \
  "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv"
curl -sfL -o vendor/HYG_LICENSE.txt \
  "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/LICENSE"
echo "Fetched $(wc -l < vendor/hygdata_v41.csv) rows into scripts/vendor/hygdata_v41.csv"
