#!/usr/bin/env python3
"""Resolve CONSTELLATION_LINES (self-authored stick figures) against the HYG
v4.1 CSV and write public/data/constellations.json.

Every point in every chain is resolved to a star `id` by looking it up
within that constellation's `con` field, via bayer letter, Flamsteed number,
or proper name. If a point cannot be resolved, or resolves to a star not
present in the mag<=5.5 filtered public/data/stars.json, the whole
constellation is dropped with a loud message on stderr rather than emitting
a dangling reference.

Usage (from repo root):
    python3 scripts/build_constellations.py
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CSV = REPO_ROOT / "scripts" / "vendor" / "hygdata_v41.csv"
DEFAULT_STARS_JSON = REPO_ROOT / "public" / "data" / "stars.json"
DEFAULT_OUTPUT = REPO_ROOT / "public" / "data" / "constellations.json"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from constellation_lines import CONSTELLATION_LINES  # noqa: E402

SOURCE_NOTE = (
    "Self-authored simplified stick figures compiled from each "
    "constellation's classical bright named stars; see docs/constellations.md"
)


def _blank(value: str | None) -> bool:
    return value is None or value.strip() == ""


def load_index(csv_path: Path):
    """Build lookup tables keyed by (con, bayer), (con, flam), proper name."""
    by_con_bayer: dict[tuple[str, str], list[dict]] = {}
    by_con_flam: dict[tuple[str, int], list[dict]] = {}
    by_name: dict[str, dict] = {}

    with csv_path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            con = (row.get("con") or "").strip()
            bayer = (row.get("bayer") or "").strip()
            flam = (row.get("flam") or "").strip()
            proper = (row.get("proper") or "").strip()

            if con and bayer:
                by_con_bayer.setdefault((con, bayer), []).append(row)
            if con and flam:
                by_con_flam.setdefault((con, int(float(flam))), []).append(row)
            if proper:
                by_name[proper] = row

    return by_con_bayer, by_con_flam, by_name


def resolve_point(point, con: str, by_con_bayer, by_con_flam, by_name) -> int:
    """Resolve a chain point to a HYG `id` int. Raises KeyError if not found."""
    if isinstance(point, tuple):
        kind, value = point
        if kind == "flam":
            rows = by_con_flam.get((con, int(value)))
            if not rows:
                raise KeyError(f"flam={value} not found in con={con}")
            rows = sorted(rows, key=lambda r: float(r["mag"]))
            return int(rows[0]["id"])
        raise KeyError(f"unknown tuple identifier kind: {kind!r}")

    if isinstance(point, str) and point.startswith("name:"):
        name = point[len("name:"):]
        row = by_name.get(name)
        if row is None:
            raise KeyError(f"proper name {name!r} not found")
        if (row.get("con") or "").strip() != con:
            raise KeyError(
                f"proper name {name!r} found but con={row.get('con')!r} != {con!r}"
            )
        return int(row["id"])

    # Plain bayer-letter lookup.
    rows = by_con_bayer.get((con, point))
    if not rows:
        raise KeyError(f"bayer={point!r} not found in con={con}")
    rows = sorted(rows, key=lambda r: float(r["mag"]))
    return int(rows[0]["id"])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--stars-json", type=Path, default=DEFAULT_STARS_JSON)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if not args.stars_json.exists():
        print(
            f"error: {args.stars_json} does not exist; run build_catalogue.py first",
            file=sys.stderr,
        )
        raise SystemExit(1)

    with args.stars_json.open(encoding="utf-8") as f:
        stars_data = json.load(f)
    valid_ids = {s["id"] for s in stars_data["stars"]}

    by_con_bayer, by_con_flam, by_name = load_index(args.csv)

    resolved_constellations = []
    dropped = []
    total_chains = 0
    total_segments = 0

    for abbr, entry in CONSTELLATION_LINES.items():
        name = entry["name"]
        chains = entry["chains"]
        try:
            resolved_lines = []
            for chain in chains:
                ids = [
                    resolve_point(point, abbr, by_con_bayer, by_con_flam, by_name)
                    for point in chain
                ]
                for star_id, point in zip(ids, chain):
                    if star_id not in valid_ids:
                        raise KeyError(
                            f"resolved id={star_id} (point={point!r}) is not present "
                            f"in {args.stars_json.name} (mag<=5.5 filter)"
                        )
                resolved_lines.append(ids)
        except KeyError as exc:
            dropped.append((abbr, name, str(exc)))
            continue

        total_chains += len(resolved_lines)
        total_segments += sum(max(0, len(line) - 1) for line in resolved_lines)
        resolved_constellations.append(
            {
                "abbr": abbr,
                "name": name,
                "lines": resolved_lines,
            }
        )

    output = {
        "source": SOURCE_NOTE,
        "count": len(resolved_constellations),
        "constellations": resolved_constellations,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as f:
        json.dump(output, f, separators=(",", ":"))

    print(f"constellations resolved: {len(resolved_constellations)}")
    print(f"total chains (lines):    {total_chains}")
    print(f"total segments:          {total_segments}")
    print(f"wrote:                   {args.output}")

    if dropped:
        print("", file=sys.stderr)
        print(f"DROPPED {len(dropped)} constellation(s):", file=sys.stderr)
        for abbr, name, reason in dropped:
            print(f"  {abbr} ({name}): {reason}", file=sys.stderr)


if __name__ == "__main__":
    main()
