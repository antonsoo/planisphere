#!/usr/bin/env python3
"""Reduce the HYG v4.1 star database to a small JSON catalogue for the
planisphere frontend.

Reads scripts/vendor/hygdata_v41.csv, filters to stars with mag <= 5.5
(excluding the Sun), and writes public/data/stars.json with a compact,
frontend-friendly schema. Stdlib only.

Usage (from repo root):
    python3 scripts/build_catalogue.py
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = REPO_ROOT / "scripts" / "vendor" / "hygdata_v41.csv"
DEFAULT_OUTPUT = REPO_ROOT / "public" / "data" / "stars.json"

MAGNITUDE_LIMIT = 5.5
GENERATED_AT = "2026-09-24"


def _blank(value: str | None) -> bool:
    return value is None or value.strip() == ""


def _parse_float(value: str | None) -> float | None:
    if _blank(value):
        return None
    return float(value)


def _parse_int(value: str | None) -> int | None:
    if _blank(value):
        return None
    return int(float(value))


def build_star_records(rows: list[dict]) -> list[dict]:
    stars: list[dict] = []
    for row in rows:
        mag = _parse_float(row.get("mag"))
        if mag is None or mag > MAGNITUDE_LIMIT:
            continue

        proper = row.get("proper") or ""
        if proper.strip() == "Sol":
            # The Sun: id 0, ra=dec=0, not a real catalogue position.
            continue

        ra_hours = _parse_float(row.get("ra"))
        dec_deg = _parse_float(row.get("dec"))
        if ra_hours is None or dec_deg is None:
            # No usable position; cannot place on the wheel.
            continue

        pmra = _parse_float(row.get("pmra")) or 0.0
        pmdec = _parse_float(row.get("pmdec")) or 0.0

        star = {
            "id": int(row["id"]),
            "hip": _parse_int(row.get("hip")),
            "name": proper.strip() if proper.strip() else None,
            "bayer": row.get("bayer").strip() if not _blank(row.get("bayer")) else None,
            "flam": _parse_int(row.get("flam")),
            "con": row.get("con").strip() if not _blank(row.get("con")) else "",
            "ra": round(ra_hours * 15.0, 6),
            "dec": round(dec_deg, 6),
            "pmRa": round(pmra, 3),
            "pmDec": round(pmdec, 3),
            "mag": round(mag, 3),
            "bv": (lambda v: round(v, 3) if v is not None else None)(_parse_float(row.get("ci"))),
        }
        stars.append(star)
    return stars


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    with args.input.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total_rows = len(rows)
    stars = build_star_records(rows)
    stars.sort(key=lambda s: s["id"])

    mags = [s["mag"] for s in stars]
    named = sum(1 for s in stars if s["name"] is not None)
    with_hip = sum(1 for s in stars if s["hip"] is not None)

    output = {
        "catalogue": "HYG v4.1",
        "catalogueUrl": "https://github.com/astronexus/HYG-Database",
        "catalogueLicense": "CC BY-SA 4.0",
        "epoch": 2000.0,
        "equinox": 2000.0,
        "magnitudeLimit": MAGNITUDE_LIMIT,
        "generatedAt": GENERATED_AT,
        "count": len(stars),
        "stars": stars,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as f:
        json.dump(output, f, separators=(",", ":"))

    print(f"rows read:        {total_rows}")
    print(f"rows kept:        {len(stars)}")
    if mags:
        print(f"magnitude range:  {min(mags):.3f} .. {max(mags):.3f}")
    print(f"with proper name: {named}")
    print(f"with hip:         {with_hip}")
    print(f"wrote:            {args.output}")


if __name__ == "__main__":
    main()
