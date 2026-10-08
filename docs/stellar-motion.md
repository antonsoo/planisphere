# Following a star from catalogue to paper

The finder makes a star on the wheel inspectable. Search for **HIP 104214**
(61 Cyg), choose **3000 BCE**, and compare the three coordinate rows. The
first change is the star's motion through space. The second rotates the
coordinate axes for precession. **Locate on uncovered disc** lifts the
opaque holder and marks the resulting point. **Replace holder** restores
the paper assembly. The marker never enters a cutting or engraving file.

61 Cyg is a useful check because its motion is large enough to expose a bad
propagator. The old implementation divided RA motion by `cos(dec)`, added
the resulting angular rates for thousands of years, and clamped declination
at the poles. Against ERFA, its 3000 BCE position missed by **3199.024
arcseconds** (about **0.89 degrees**). The new Cartesian propagation misses
by **0.259403 arcsecond** with the same catalogue inputs. This is numerical
agreement between models, not a claim that we know the ancient star's
position that accurately.

## Reading the instrument

| Finder state | Meaning | Available action |
| --- | --- | --- |
| Outside the printed sky field | The star glyph does not fit this latitude's disc | Change latitude or epoch |
| Fainter than the limit | The catalogue contains the star but the magnitude filter omits it | Include this magnitude |
| At or below the horizon | Its geometric altitude is nonpositive at this date/time setting | Set a visible time, if one exists |
| Hidden by the center hub | Above the horizon, but behind the retained pivot material | Lift the holder to locate it |
| Hidden by a paper support | Above the horizon, but behind the horizontal connecting strip | Try another time or lift the holder |
| Visible through the holder | The star center clears the geometric horizon, hub and supports | Inspect it in the assembled view |

These checks refer to the **star center**, not the entire finite-sized
printed glyph. The cutout polygons approximate the horizon; a point extremely
close to an edge can differ at the polygon's discretization scale. Neither
the finder nor the paper wheel models daylight, clouds, extinction, seeing,
or atmospheric refraction.

**Set a visible time** searches the 96 quarter-hour settings, choosing the
highest geometric altitude whose star center clears the window. It changes
mean time only. A star excluded by magnitude still needs **Include this
magnitude**. Some stars have no such setting: for example, Polaris at J2000
is always behind the northern holder's hub. The action then stays disabled.

Search includes proper names, Flamsteed/Bayer designations, constellation
abbreviations, HIP numbers and HYG IDs. It ignores case and accents, matches
all entered terms, and shows at most 12 results. Selecting a new search term
does not erase the last inspected star. Calculations and downloads work
after the page and its catalogue have loaded, even without a connection;
there is no service worker or promise of an offline cold start.

## Data and provenance

The source is David Nash / AstroNexus's **HYG v4.1**, at commit
[`c7f7f883fe678cc7680169a50ccd7dcc49b060ce`](https://github.com/astronexus/HYG-Database/tree/c7f7f883fe678cc7680169a50ccd7dcc49b060ce/hyg).
Its [field documentation](https://github.com/astronexus/HYG-Database/blob/c7f7f883fe678cc7680169a50ccd7dcc49b060ce/hyg/README.md)
defines the input units and the large-distance sentinel. The reduced
catalogue and exported records retain the **CC BY-SA 4.0** data license.

| HYG field | App field | Interpretation |
| --- | --- | --- |
| `ra`, `dec` | `ra`, `dec` | J2000 position; RA converted from hours to degrees |
| `pmra`, `pmdec` | `pmRa`, `pmDec` | Milliarcseconds per year; RA motion already includes `cos(dec)` |
| `dist` | `distancePc` | Parsecs; missing, nonpositive, or at least 100000 becomes `null` |
| `rv` | `radialVelocityKmSec` | Kilometres per second, positive away from the observer; blank becomes `null` |
| `mag` | `mag` | Catalogue apparent magnitude; unchanged across epochs |

There are **2865** retained stars, of which **54** have no usable distance.
For these, radial perspective is omitted. With known distance but absent
radial velocity, the model assumes zero radial velocity. A supplied numeric
zero is preserved: the HYG record does not establish whether that zero is
a measurement or a missing-value convention. The finder says so explicitly.
Absent proper-motion components retain the builder's existing zero-motion
fallback; this is another reason not to interpret the output as a precision
historical catalogue.

The fetch script checks the raw CSV's SHA-256 before replacing a local copy:

```text
d9f69fd86bbf90a4e4d52b4c5c53eacfa6dfc0bfdef85bfd94f095e0bebe4ebd
```

The reduced JSON records that digest and the pinned commit. If the builder
is given a different CSV with `--input`, it records the actual digest and
leaves `sourceCommit` null. At load time, explicitly supplied reference
epochs/equinoxes other than J2000 are rejected. Legacy records without the
new distance/velocity fields use the tangential fallback.

## Motion model

Work in a fixed J2000 Cartesian frame. For right ascension `a` and declination
`d`, form a unit position vector and two tangent directions:

```text
u = (cos(d) cos(a), cos(d) sin(a), sin(d))
e = (-sin(a),       cos(a),       0)
n = (-sin(d) cos(a), -sin(d) sin(a), cos(d))

w = (1 + v_r * dt / distance) * u
    + mu_alpha_star * dt * e
    + mu_delta      * dt * n

RA  = atan2(w_y, w_x)
Dec = atan2(w_z, hypot(w_x, w_y))
```

Angular rates are converted to radians per Julian year. Radial velocity is
converted to parsecs per Julian year using 365.25 days/year, 86400 seconds/day,
the exact astronomical unit of 149597870.7 km, and `parsec = 648000/pi AU`.
Without usable distance, the radial term is omitted. Equivalently, this propagates
Cartesian position and velocity vectors divided by the initial distance.
It avoids unnecessarily large coordinates and does not divide by `cos(dec)`.

The star can cross a coordinate pole continuously. RA changes branch at the
pole instead of declination sticking at 90 degrees. Degenerate zero-length
or non-finite propagated positions are rejected.

The result is then precessed using the existing P03 classical Euler-angle
model. Epoch `Y` means `JD 2451545.0 + (Y - 2000) * 365.25`, with astronomical
year numbering (`0 = 1 BCE`, `-2999 = 3000 BCE`). It is a Julian epoch, not
January 1 of each Gregorian year. The coordinate table displays RA in hours
and declination in degrees; the JSON uses degrees for both.

## What the independent comparison establishes

[`export-star-positions.mjs`](../scripts/export-star-positions.mjs) loads the
actual TypeScript functions and emits every bundled star at seven epochs:
`-2999, -699, 1, 1500, 2000, 2026, 3000`. The separate
[`verify-space-motion.py`](../scripts/verify-space-motion.py) uses the C
ERFA library through pyerfa, without importing the app's astronomy formulas.
It compares angular separation on the sphere, avoiding the RA wrap and
pole singularities.

ERFA's [`pmsafe`](https://github.com/liberfa/erfa/blob/v2.0.1/src/pmsafe.c)
and [`starpm`](https://github.com/liberfa/erfa/blob/v2.0.1/src/starpm.c)
also account for light travel time and relativistic effects. The app's
simpler geometric propagation does not. ERFA supplies both the precession
angles (`p06e`) and the matrix operations for the mean-coordinate comparison.

| Comparison across 20,055 positions | Largest angular difference |
| --- | ---: |
| App motion versus ERFA `pmsafe` | 0.259403 arcsecond |
| App final coordinates versus ERFA motion + matching P03 Euler rotation | 0.259403 arcsecond |
| Unknown-distance tangential fallback versus ERFA's safe zero-parallax path | less than 0.000001 arcsecond |
| App final coordinates versus ERFA motion + bias-removed Fukushima-Williams precession | 9.419407 arcseconds |

The last row is deliberately separate. ERFA's `pmat06` uses a different
truncated representation of precession from the app's classical P03 angles;
these diverge over millennia. Matching `p06e` does not imply identical
coordinates to every IAU 2006 implementation at 3000 BCE. Neither comparison
proves the physical validity of a polynomial precession model or constant
stellar velocity five thousand years from the catalogue epoch.

The 54 unknown-distance stars use ERFA's artificial-distance safety path
with zero radial velocity in this check. Agreement verifies the tangential
calculation, **not** the unknown physical perspective. Seven selected stars
at all seven epochs are retained in the 49-case regression fixture, including
61 Cyg, Arcturus, Sirius, Polaris, Betelgeuse, Toliman and Epsilon Indi.

Reproduce from the repository root after `npm ci` (Python with NumPy and
pyerfa is needed only for this development audit):

```sh
node scripts/export-star-positions.mjs > /tmp/planisphere-positions.json
uv run --with numpy==2.5.3 --with pyerfa==2.0.1.5 --no-project python scripts/verify-space-motion.py /tmp/planisphere-positions.json
```

Add `--fixtures tests/fixtures/space-motion.oracle.json` to the second command
to regenerate the retained reference cases. The verifier requires every star
and all seven epochs, checks the input-source digest, and fails if either
motion or matching-angle mean-coordinate separation reaches 0.35 arcsecond.

## Saving an inspectable result

**Download star evidence** saves JSON schema version 1 with the catalogue
record, source revision/digest, data license, chart settings, explicit units,
motion assumptions, intermediate/final coordinates, altitude/azimuth,
disc/holder coordinates in millimetres, and each visibility condition.
An invalid date draft pauses actions and preserves the last valid result.

The evidence describes the selected star's center at the current settings.
It is not a saved project format or a claim about real observing conditions.
Numbers are serialized at calculation precision, not measurement precision.
Binary orbits, acceleration, nutation, aberration, frame bias, atmospheric
refraction, time-varying brightness and uncertainty propagation are absent.
The date ring remains an independent modern Gregorian seasonal scale;
selecting an ancient stellar epoch does not reconstruct an ancient calendar.

The [local verification record](verification-2026-10-08.md) links reviewed
screenshots and real browser downloads. Printing and physical assembly still
need a hands-on trial; the checks here establish digital geometry and model
agreement.
