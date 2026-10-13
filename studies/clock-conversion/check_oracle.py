"""Recompute the retained controlled cases with independent calendar arithmetic.

Run with Python 3.10+: python3 studies/clock-conversion/check_oracle.py
Only the three input fields are used to compute each expected result.
"""

import datetime as dt
import json
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


def stamp(value):
    return (
        f"{value.year:04d}-{value.month:02d}-{value.day:02d}T"
        f"{value.hour:02d}:{value.minute:02d}:{value.second:02d}."
        f"{value.microsecond // 1000:03d}Z"
    )


data = json.loads(Path(__file__).with_name("oracle.json").read_text())
for case in data["cases"]:
    clock = dt.datetime.fromisoformat(case["civil"])
    offset = case["offset"]
    minutes = (int(offset[1:3]) * 60 + int(offset[4:])) * (-1 if offset[0] == "-" else 1)
    utc = clock - dt.timedelta(minutes=minutes)
    longitude_ms = int((Decimal(case["longitude"]) * 240000).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    mean = utc + dt.timedelta(milliseconds=longitude_ms)
    midnight = mean.replace(hour=0, minute=0, second=0, microsecond=0)
    quarters = int(((mean - midnight).total_seconds() + 450) // 900)
    rounded = midnight + dt.timedelta(seconds=quarters * 900)
    actual = {
        "utc": stamp(utc), "meanTime": stamp(mean), "wheelDate": stamp(rounded)[:10],
        "wheelHour": rounded.hour + rounded.minute / 60,
        "roundingSeconds": (rounded - mean).total_seconds(),
    }
    for key, value in actual.items():
        assert case[key] == value, (case["name"], key, case[key], value)
print(f'{len(data["cases"])} independent calendar conversions match')
