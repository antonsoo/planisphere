#!/usr/bin/env bash
# Pinned HYG v4.1 source, David Nash / AstroNexus, CC BY-SA 4.0.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p vendor
hyg_commit=c7f7f883fe678cc7680169a50ccd7dcc49b060ce
hyg_csv_tmp="$(mktemp vendor/hygdata_v41.csv.XXXXXX)"
hyg_license_tmp="$(mktemp vendor/HYG_LICENSE.txt.XXXXXX)"
trap 'rm -f "$hyg_csv_tmp" "$hyg_license_tmp"' EXIT
curl -sfL -o "$hyg_csv_tmp" \
  "https://raw.githubusercontent.com/astronexus/HYG-Database/$hyg_commit/hyg/CURRENT/hygdata_v41.csv"
printf '%s  %s\n' d9f69fd86bbf90a4e4d52b4c5c53eacfa6dfc0bfdef85bfd94f095e0bebe4ebd "$hyg_csv_tmp" | sha256sum --check
curl -sfL -o "$hyg_license_tmp" \
  "https://raw.githubusercontent.com/astronexus/HYG-Database/$hyg_commit/hyg/CURRENT/LICENSE"
mv "$hyg_csv_tmp" vendor/hygdata_v41.csv
mv "$hyg_license_tmp" vendor/HYG_LICENSE.txt
printf 'Fetched verified HYG v4.1 at %s\n' "$hyg_commit"
