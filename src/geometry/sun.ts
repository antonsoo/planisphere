import { DEG_PER_RAD, normalizeDegrees, RAD_PER_DEG } from '../astro/constants.js';

/** Julian Day (UT) for a JavaScript Date, via the standard Gregorian-calendar algorithm. */
export function julianDayFromDate(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d =
    date.getUTCDate() +
    (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;

  let year = y;
  let month = m;
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + d + B - 1524.5;
}

/**
 * Right ascension of the *mean* Sun, degrees: the fictitious sun that moves
 * uniformly along the equator and keeps local mean time. Its RA is the Sun's
 * geometric mean longitude L0 (Meeus, "Astronomical Algorithms" 2nd ed.,
 * ch. 25), to within the 20" aberration constant. This places the date ring
 * (see dial.ts): with it, the rings read local mean time, as the docs say.
 */
export function meanSunRaDeg(date: Date): number {
  const T = (julianDayFromDate(date) - 2451545.0) / 36525;
  return normalizeDegrees(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
}

/**
 * Low-accuracy apparent right ascension of the Sun, good to about 0.01
 * degree -- the standard simplified solar position algorithm given in
 * Meeus, "Astronomical Algorithms" 2nd ed., ch. 25 ("Solar Coordinates,
 * Low Accuracy"), itself following the Astronomical Almanac's low-precision
 * formula. The apparent Sun keeps apparent (sundial) time; it runs up to
 * about 4 degrees (16 minutes, the equation of time) from the mean Sun, so
 * it is not what the rings use.
 */
export function apparentSolarRaDeg(date: Date): number {
  const jd = julianDayFromDate(date);
  const T = (jd - 2451545.0) / 36525;

  const L0 = normalizeDegrees(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = normalizeDegrees(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mrad = M * RAD_PER_DEG;

  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);

  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const apparentLong = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD_PER_DEG);

  const eps0 = 23.439291 - 0.0130042 * T;
  const epsilon = eps0 + 0.00256 * Math.cos(omega * RAD_PER_DEG);

  const lambdaRad = apparentLong * RAD_PER_DEG;
  const epsRad = epsilon * RAD_PER_DEG;

  const ra = Math.atan2(Math.cos(epsRad) * Math.sin(lambdaRad), Math.cos(lambdaRad));
  return normalizeDegrees(ra * DEG_PER_RAD);
}
