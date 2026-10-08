"""Parse the four CDS machine-readable catalogues into one JSON list.

Fixed-width columns follow the byte-by-byte tables in each ReadMe
(1-based, inclusive). Run as: python3 -I parse.py <cache-dir> <out.json>
"""

import json
import sys
from pathlib import Path


def col(line: str, a: int, b: int) -> str:
    return line[a - 1 : b].strip()


def num(s: str, default=None):
    return float(s) if s else default


def sgn(c: str) -> int:
    return 1 if c == "B" else -1 if c == "A" else 0


def ptolemy(line):
    return dict(
        id=int(col(line, 1, 4)), cst=col(line, 9, 12),
        lon=(int(col(line, 19, 20)) - 1) * 30 + int(col(line, 22, 23)) + int(col(line, 25, 26)) / 60,
        lat=sgn(col(line, 35, 35)) * (int(col(line, 29, 30)) + int(col(line, 32, 33)) / 60),
        hip=int(col(line, 41, 46) or 0), q=int(col(line, 48, 48) or 0),
        vmag=num(col(line, 52, 55)), dl=num(col(line, 57, 62)), db=num(col(line, 64, 69)),
    )


def ulugh(line):
    return dict(
        id=int(col(line, 1, 4)), cst=col(line, 16, 19),
        derived=col(line, 5, 5) == "c",
        lon=int(col(line, 26, 27)) * 30 + int(col(line, 29, 30)) + int(col(line, 32, 33)) / 60,
        lat=sgn(col(line, 43, 43)) * (int(col(line, 37, 38)) + int(col(line, 40, 41)) / 60),
        hip=int(col(line, 49, 54) or 0), q=int(col(line, 56, 56) or 0),
        vmag=num(col(line, 62, 65)), dl=num(col(line, 67, 72)), db=num(col(line, 74, 79)),
    )


def tycho(line):
    return dict(
        id=int(col(line, 10, 13) or 0), cst=col(line, 19, 21),
        lon=(int(col(line, 26, 27)) - 1) * 30 + int(col(line, 29, 30)) + float(col(line, 32, 35)) / 60,
        lat=sgn(col(line, 45, 45)) * (int(col(line, 37, 38)) + float(col(line, 40, 43)) / 60),
        hip=int(col(line, 50, 55) or 0), q=int(col(line, 58, 58) or 0),
        rawlins=int(col(line, 63, 63) or 0),
        vmag=num(col(line, 65, 68)), dl=num(col(line, 70, 75)), db=num(col(line, 77, 82)),
    )


def hevelius(line):
    if not col(line, 30, 31) or not col(line, 43, 44):
        return dict(id=int(col(line, 1, 4)), cst=col(line, 15, 17), lon=None, lat=None,
                    hip=int(col(line, 54, 59) or 0), q=int(col(line, 62, 62) or 0),
                    vmag=None, dl=None, db=None)
    return dict(
        id=int(col(line, 1, 4)), cst=col(line, 15, 17),
        lon=(int(col(line, 30, 31)) - 1) * 30 + int(col(line, 33, 34))
        + int(col(line, 36, 37)) / 60 + int(col(line, 39, 40)) / 3600,
        lat=sgn(col(line, 52, 52)) * (int(col(line, 43, 44)) + int(col(line, 46, 47)) / 60
                                       + int(col(line, 49, 50)) / 3600),
        hip=int(col(line, 54, 59) or 0), q=int(col(line, 62, 62) or 0),
        vmag=num(col(line, 68, 71)), dl=num(col(line, 73, 78)), db=num(col(line, 80, 85)),
    )


# epoch: equinox the catalogue's coordinates refer to, per each ReadMe.
SPEC = {
    # Raw longitudes as printed in the file; the epoch stated by Ptolemy is
    # AD 137 (Verbunt & van Gent 2012, sect. 2.1).
    "ptolemy_137": ("ptolemy_ulugh/ptolema.dat", ptolemy, 137.0),  # JD 1771298 = 137 Jul 20
    "ulugh_beg": ("ptolemy_ulugh/ulughbeg.dat", ulugh, 2000 + (2246108 - 2451545) / 365.25),  # JD 2246108
    "tycho": ("tycho/keplere.dat", tycho, 1601.0),
    "hevelius": ("hevelius/hevelius.dat", hevelius, 1661.0),
}


def hipparchos(row):
    """The editors' convention: subtract 2 deg 40 arcmin to move Ptolemy's
    longitudes from AD 137 to the equinox of Hipparchos, -128 (sect. 3)."""
    return {**row, "lon": (row["lon"] - 160 / 60) % 360}


cache = Path(sys.argv[1])
out = {}
for name, (path, fn, epoch) in SPEC.items():
    rows = []
    for line in (cache / path).read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(fn(line))
    out[name] = {"epoch": epoch, "rows": rows}
    if name == "ptolemy_137":
        # JD 1674573 (24 Sept -128), the editors' equinox, as a Julian-year epoch.
        out["ptolemy_128"] = {"epoch": 2000 + (1674573 - 2451545) / 365.25, "rows": [hipparchos(r) for r in rows]}
    print(name, len(rows), "rows")
Path(sys.argv[2]).write_text(json.dumps(out))
