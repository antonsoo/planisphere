# Planisphere geometry

This is the derivation behind `src/geometry/`. It explains three things a
reader can't get from the code comments alone: why the star disc is
mirrored, where the date/hour rings come from, and why the horizon window is
a fixed shape.

## Projection

The star disc uses a polar azimuthal-equidistant projection centred on the
observer's elevated celestial pole (north for `lat >= 0`, south otherwise).
For a star at declination `dec`, the angular distance from that pole is

```
rho(dec) = 90 - hemisphereSign * dec
```

and the projection maps `rho` linearly to radial distance — the defining
property of "equidistant". A star at the pole (`rho=0`) sits at the disc
centre; a star at the opposite pole (`rho=180`) would sit at radius
`180 * scale`, off any practical disc.

The disc only needs to go out to the faintest declination that ever rises at
latitude `phi`: `dec_min = -(90 - |phi|)`, i.e. `rho_max = 180 - |phi|`. That
edge is where `scale = discRadius / rho_max` comes from
(`src/render/buildPlanisphereSvg.ts`).

## Why the star disc is mirrored

A real planisphere is two rigid pieces: a star disc that rotates, and a
holder with a horizon-shaped window cut into it, which stays still. Turning
the disc to "now" must make exactly the stars above the horizon appear in
the window.

A star's position on the sky, relative to the local meridian, is its **hour
angle** `H = LST - RA` (LST = local sidereal time, which advances as time
passes). For the window to expose the right stars, a star's angle on the
*assembled* instrument must equal `H`.

Rotating the physical disc by some angle `R` can only *add* `R` to every
star's plotted angle — a single rigid rotation cannot depend on each star
individually. If the disc plotted angle = RA directly, the displayed angle
after turning it by `R` would be `RA + R`, which can never equal
`LST - RA` for every star at once (the RA term has the wrong sign). If
instead the disc plots angle = `-RA` (mirrored), turning it by `R = LST`
gives displayed angle `LST - RA = H` for *every* star simultaneously. That's
`projectStar()` in `src/geometry/projection.ts`, and it's why the printed
disc looks left-right flipped compared to a normal star atlas.

Because the mirroring falls out of "one rotation must work for every star",
the holder's window can be built once, in the fixed `H` coordinate, and
never needs to change with time — see `buildHorizonWindowPolygon()` in
`src/geometry/horizonWindow.ts`. `tests/geometry/window.test.ts` checks that
this construction agrees with the direct trigonometric altitude formula
(`sin(alt) = sin(dec)sin(lat) + cos(dec)cos(lat)cos(H)`) for thousands of
random (date, hour, star, latitude) combinations.

## Date ring and hour ring

The hour ring is on the fixed holder. By definition of local mean solar
time, the mean Sun's hour angle is `(hour - 12) * 15` degrees (0 at local
noon, 180 at local midnight), so the hour ring is a plain linear scale,
independent of date: `hourRingAngleDeg(hour) = (hour - 12) * 15`.

The date ring is on the rotating disc, alongside the stars, so it uses the
same mirrored convention. At local midnight on a given date, the Sun's hour
angle is 180 degrees, so `LST(midnight) = RA_sun(date) + 180`. Requiring
that turning the disc by `R = LST(midnight)` aligns that date's mark with
the holder's `hour = 0` mark gives:

```
dateRingAngleDeg(date) = -RA_sun(date)        (mod 360)
```

`RA_sun(date)` comes from the low-accuracy solar-position formula in Meeus,
*Astronomical Algorithms* 2nd ed., ch. 25 (`src/geometry/sun.ts`), good to
about 0.01 degree — far tighter than this ring needs.

Combining the two: `discRotationDeg(date, hour) = RA_sun(date) + (hour - 12) * 15`,
which is exactly the LST used everywhere else. `tests/geometry/window.test.ts`
exercises this same function, so the rendered rings and the visibility test
are provably using the same rotation.

## What this ignores

- **The equation of time.** A paper (or SVG) ring can't encode the few
  minutes of difference between local mean time and true solar time; enter
  local *mean* time, not your clock's civil/DST time. Commercial paper
  planispheres make the same simplification.
- **Longitude.** The geometry depends only on latitude. Longitude only
  matters for converting a civil clock reading to local mean time, which
  this app leaves to the user (enter your own local time directly).
- **Atmospheric refraction.** The horizon is geometric (altitude = 0
  exactly), not the ~34 arcminutes higher apparent horizon caused by
  refraction. That's smaller than the width of the drawn window line at
  this disc's scale.
