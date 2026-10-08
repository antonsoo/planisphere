"""Compare exported TypeScript star positions with ERFA, without importing app math.

node scripts/export-star-positions.mjs > /tmp/planisphere-positions.json
uv run --with numpy --with pyerfa --no-project python scripts/verify-space-motion.py /tmp/planisphere-positions.json
"""

import argparse
import hashlib
import json
import math
import warnings
from pathlib import Path

import erfa
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RAD = math.pi / 180
MAS = RAD / 3600000


def unit(ra, dec):
    return erfa.s2c(ra, dec)


def sep_arcsec(a, b):
    return float(erfa.sepp(a, b) / RAD * 3600)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("positions", type=Path)
    parser.add_argument("--fixtures", type=Path)
    args = parser.parse_args()
    catalogue_bytes = (ROOT / "public/data/stars.json").read_bytes()
    catalogue = json.loads(catalogue_bytes)
    exported = json.loads(args.positions.read_text())
    assert exported["sourceSha256"] == catalogue["sourceSha256"]
    stars = {star["id"]: star for star in catalogue["stars"]}
    assert len(exported["positions"]) == len(stars)
    checked_ids = set()
    outcomes = []
    fixtures = []
    no_distance = 0
    max_fallback_arcsec = 0
    for item in exported["positions"]:
        assert item["id"] not in checked_ids
        checked_ids.add(item["id"])
        star = stars[item["id"]]
        a = star["ra"] * RAD
        d = star["dec"] * RAD
        distance = star["distancePc"]
        if distance is None:
            no_distance += 1
        assert [entry["year"] for entry in item["epochs"]] == [
            -2999,
            -699,
            1,
            1500,
            2000,
            2026,
            3000,
        ]
        for entry in item["epochs"]:
            years = entry["year"] - 2000
            # With unknown distance, use ERFA's safe zero-parallax path, zero RV.
            # It supplies an artificial large distance; this checks only the
            # tangential fallback and does not verify physical perspective.
            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore",
                    message=".*distance overridden.*",
                    category=erfa.ErfaWarning,
                )
                ref = erfa.pmsafe(
                    a,
                    d,
                    star["pmRa"] * MAS / math.cos(d),
                    star["pmDec"] * MAS,
                    0 if distance is None else 1 / distance,
                    0 if distance is None else (star["radialVelocityKmSec"] or 0),
                    2451545,
                    0,
                    2451545,
                    years * 365.25,
                )
            moved = unit(ref[0], ref[1])
            motion_error = sep_arcsec(
                unit(entry["motion"]["ra"] * RAD, entry["motion"]["dec"] * RAD), moved
            )
            # ERFA supplies the P03 angles and the matrix operations. The app
            # uses explicit RA/Dec trigonometry, so this also checks composition.
            angles = erfa.p06e(2451545, years * 365.25)
            matrix = erfa.rz(
                -angles[9], erfa.ry(angles[11], erfa.rz(-angles[10], np.eye(3)))
            )
            mean = matrix @ moved
            actual_mean = unit(entry["mean"]["ra"] * RAD, entry["mean"]["dec"] * RAD)
            mean_error = sep_arcsec(actual_mean, mean)
            # Separately quantify the different truncated precession series in
            # ERFA's Fukushima-Williams implementation, removing its frame bias.
            fw = erfa.pmat06(2451545, years * 365.25) @ erfa.pmat06(2451545, 0).T
            fw_error = sep_arcsec(actual_mean, fw @ moved)
            old = unit(
                a + star["pmRa"] * MAS * years / math.cos(d),
                max(-math.pi / 2, min(math.pi / 2, d + star["pmDec"] * MAS * years)),
            )
            label = (
                star["name"]
                or f"{star['flam'] or star['bayer'] or star['hip']} {star['con']}"
            )
            outcomes.append(
                {
                    "id": star["id"],
                    "name": label,
                    "year": entry["year"],
                    "distanceKnown": distance is not None,
                    "oldMotionErrorArcsec": sep_arcsec(old, moved),
                    "motionErrorArcsec": motion_error,
                    "meanErrorArcsec": mean_error,
                    "fukushimaWilliamsErrorArcsec": fw_error,
                }
            )
            if distance is None:
                max_fallback_arcsec = max(max_fallback_arcsec, motion_error)
            assert motion_error < 0.35, (label, entry, motion_error)
            assert mean_error < 0.35, (label, entry, mean_error)
            if star["hip"] in (104214, 108870, 71681, 69673, 32349, 11767, 27989):
                fixtures.append(
                    {
                        "star": star,
                        "year": entry["year"],
                        "motionRa": math.degrees(ref[0]) % 360,
                        "motionDec": math.degrees(ref[1]),
                        "meanRa": math.degrees(math.atan2(mean[1], mean[0])) % 360,
                        "meanDec": math.degrees(
                            math.atan2(mean[2], math.hypot(mean[0], mean[1]))
                        ),
                    }
                )
    metadata = {
        "pyerfa": erfa.__version__,
        "numpy": np.__version__,
        "catalogueSha256": hashlib.sha256(catalogue_bytes).hexdigest(),
        "catalogueSourceSha256": catalogue["sourceSha256"],
    }
    if args.fixtures:
        args.fixtures.write_text(
            json.dumps({**metadata, "cases": fixtures}, indent=2) + "\n"
        )
    print(
        json.dumps(
            {
                **metadata,
                "stars": len(stars),
                "positions": len(outcomes),
                "unknownDistances": no_distance,
                "maxMotionErrorArcsec": max(x["motionErrorArcsec"] for x in outcomes),
                "maxMeanErrorArcsec": max(x["meanErrorArcsec"] for x in outcomes),
                "maxFukushimaWilliamsErrorArcsec": max(
                    x["fukushimaWilliamsErrorArcsec"] for x in outcomes
                ),
                "maxTangentialFallbackErrorArcsec": max_fallback_arcsec,
                "worstPriorApproximation": sorted(
                    outcomes, key=lambda x: x["oldMotionErrorArcsec"], reverse=True
                )[:10],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
