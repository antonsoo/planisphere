"""Independent interior-sky projection in local East/North/Up coordinates.

No Planisphere geometry imports. Catalogue J2000 positions, geometric horizon,
no space motion/precession (epoch 2000). Outputs a fixture for real SVG checks.
"""

import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOGUE = ROOT / "public/data/stars.json"
stars = json.loads(CATALOGUE.read_text())["stars"]
RADIUS_MM = 60


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def project(dec_deg, hour_angle_deg, lat_deg):
    phi, dec, h = map(math.radians, [lat_deg, dec_deg, hour_angle_deg])
    sign = 1 if lat_deg >= 0 else -1
    # Local direction to the star; east, north, up.
    sky = [
        -math.cos(dec) * math.sin(h),
        math.sin(dec) * math.cos(phi) - math.cos(dec) * math.cos(h) * math.sin(phi),
        math.sin(dec) * math.sin(phi) + math.cos(dec) * math.cos(h) * math.cos(phi),
    ]
    pole = [0, sign * math.cos(phi), sign * math.sin(phi)]
    right = [0, -math.sin(phi), math.cos(phi)]
    up = [-sign, 0, 0]
    # right x up = -pole: a camera looking OUT from inside the celestial sphere.
    # This test is independent of the hour-angle/RA plot convention.
    angular_distance = math.acos(max(-1, min(1, dot(sky, pole))))
    theta = math.atan2(dot(sky, up), dot(sky, right))
    radius = math.degrees(angular_distance) * RADIUS_MM / (180 - abs(lat_deg))
    return {"x": radius * math.cos(theta), "y": radius * math.sin(theta)}


# Include near-equator and high-latitude cameras, plus familiar asymmetric
# constellations. Values are catalogue inputs, not invented observations.
cases = []
for lat in [-89, -65, -33.9, -0.1, 0, 0.1, 32.5, 65, 89]:
    for lst in [0, 73, 181, 299]:
        entries = []
        for star in stars:
            if star["mag"] > 2.5:
                continue
            entries.append(
                {
                    "id": star["id"],
                    "name": star["name"],
                    "ra": star["ra"],
                    "dec": star["dec"],
                    "pointMm": project(star["dec"], lst - star["ra"], lat),
                }
            )
        cases.append({"latitudeDeg": lat, "lstDeg": lst, "stars": entries})
result = {
    "model": "local ENU camera looking outward, azimuthal equidistant from elevated pole",
    "epoch": 2000,
    "skyRadiusMm": RADIUS_MM,
    "catalogueSha256": hashlib.sha256(CATALOGUE.read_bytes()).hexdigest(),
    "cases": cases,
}
output = Path(__file__).with_name("cache") / "oracle.json"
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(result, indent=2) + "\n")
print(
    json.dumps(
        {
            "cameras": len(cases),
            "starProjections": sum(len(c["stars"]) for c in cases),
            "output": str(output.relative_to(ROOT)),
        }
    )
)

fixture = {
    "model": result["model"],
    "cases": [
        {
            **c,
            "stars": [
                s
                for s in c["stars"]
                if s["name"]
                in [
                    "Acrux",
                    "Mimosa",
                    "Gacrux",
                    "Rigel",
                    "Betelgeuse",
                    "Sirius",
                    "Polaris",
                ]
            ],
        }
        for c in cases
        if c["lstDeg"] == 73
    ],
}
(ROOT / "tests/fixtures/sky-handedness.oracle.json").write_text(
    json.dumps(fixture, indent=2) + "\n"
)
