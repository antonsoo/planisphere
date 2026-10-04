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
(`src/render/artwork.ts`).

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
same mirrored convention. At local mean midnight on a given date, the mean
Sun's hour angle is 180 degrees, so `LST(midnight) = RA_meanSun(date) + 180`.
Requiring that turning the disc by `R = LST(midnight)` aligns that date's
mark with the holder's `hour = 0` mark gives:

```
dateRingAngleDeg(date) = -RA_meanSun(date)        (mod 360)
```

`RA_meanSun(date)` is the Sun's geometric mean longitude L0 (Meeus,
*Astronomical Algorithms* 2nd ed., ch. 25; `meanSunRaDeg` in
`src/geometry/sun.ts`): the fictitious mean Sun moves uniformly along the
equator, and it is the mean Sun, not the real one, that keeps mean time.
Using the real (apparent) Sun's RA here instead would put the rings on
apparent solar time and make them read up to 16 minutes (4 degrees of
rotation) off the local mean time the user is told to enter; that was this
app's behaviour before 0.2.0.

Combining the two: `discRotationDeg(date, hour) = RA_meanSun(date) + (hour - 12) * 15`,
which is exactly the LST used everywhere else. A date mark stands for one
instant (0h UT that day), and the Sun moves about 0.99 degrees a day, so a
reading late in the day trails the true sidereal time by up to about a
degree (4 minutes); `tests/geometry/dial.test.ts` checks the rotation
against an independent sidereal-time formula to 0.02 degrees once that is
accounted for. `tests/geometry/window.test.ts`
exercises this same function, so the rendered rings and the visibility test
are provably using the same rotation.

## Horizon and retained material

For the elevated-pole projection, let `a = abs(latitude)` and let `theta`
be the fixed frame's hour angle. Solving the altitude-zero equation gives

```text
rho_horizon(theta) = 90 + atan2(cos(a) * cos(theta), sin(a))
r_horizon(theta)   = scale * rho_horizon(theta)
```

Angles on the right are in degrees after converting `atan2`'s result.
This radial curve agrees with the independent altitude formula in
`tests/geometry/window.test.ts`, including latitudes close to zero and both
hemispheres. The [USNO altitude/azimuth reference](https://aa.usno.navy.mil/faq/alt_az)
provides the underlying hour-angle equation.

At latitude exactly zero, altitude is positive precisely when `cos(H) > 0`
away from the poles. The projected window is therefore a half-disc with a
straight diameter. Constructing that semicircle explicitly avoids the
pole singularities of horizontal-coordinate inversion; equator tests are
included rather than excluded.

A full horizon cutout contains the elevated pole and would remove the
holder's pivot. The printable holder instead has two closed cutouts that
retain a 3.2 mm radius hub and a 2.4 mm wide horizontal strip. For an upper
half angle, the inner cutting radius is

```text
r_inner(theta) = max(3.2 mm, 1.2 mm / sin(theta))
```

A cut exists only where `r_horizon > r_inner`. The lower half is mirrored.
The browser and export share these actual polygon paths; the preview's
holder is opaque. Tests compare the cutouts to the altitude test minus the
retained hub/strip and verify a continuous connection from the pivot to both
sides. Compass letters are placed outside the horizon along its altitude
normal, including the equatorial straight edge.

## Physical scales and bounded engraving

The 60 mm radius sky field belongs to a 96 mm radius wheel. All daily ticks
start at radius 82 mm, outside the fixed 80 mm radius holder. The date scale
therefore stays visible through a full rotation. The holder has 24 hour
labels and 96 quarter-hour ticks. Both page formats leave at least 9 mm
horizontal margin around the larger wheel.

Constellation **segments** are clipped to the sky-field circle, including
outside-to-outside crossings. The exported path coordinates are clipped
geometrically; this does not depend on a cutter honoring SVG `clipPath`.
Star discs retain a small edge clearance. Bright-star names are XML-escaped
and omitted when a conservative text rectangle would cross the sky-field
edge. Browser tests also measure the actual exported text's glyph bounds.

## Approximation and calendar limits

- The rings read local **mean** time. Convert your civil/DST clock using
  your east-positive longitude; do not enter apparent sundial time. See
  [assembly and time setting](assembly.md).
- The date ring is calibrated from the **selected Gregorian year**, with
  every day represented, including leap day. It is not a perpetual scale.
  The star-position epoch is independent of this annual calibration.
- A date mark stands for 00:00 UTC. The mean Sun's motion later that day
  adds up to about a degree of alignment error. The existing independent
  Greenwich sidereal-time cross-check retains its 0.02-degree tolerance
  after accounting for that motion. [USNO's sidereal-time reference](https://aa.usno.navy.mil/faq/GAST)
  explains the relation between Greenwich and east-positive local time.
- The horizon is geometric rather than refracted. The center hub and
  supports obscure part of the otherwise visible sky, including the pole.
- The UI offers latitudes from 89 degrees south to 89 degrees north and
  Gregorian date years 0001 through 9999. Epochs run from astronomical year
  -2999 (3000 BCE) through 3000 CE; year 0 represents 1 BCE.
