import { DEG_PER_RAD, normalizeDegrees, RAD_PER_DEG } from '../astro/constants.js';

export interface Horizontal {
  altDeg: number;
  azDeg: number;
}

export interface HourAngleEquatorial {
  decDeg: number;
  hourAngleDeg: number;
}

/**
 * sin(alt) = sin(dec)sin(lat) + cos(dec)cos(lat)cos(H), the standard
 * altitude formula for hour angle H (H = LST - RA, positive west of the
 * meridian) and declination dec at observer latitude lat. Ubiquitous in
 * spherical astronomy texts (e.g. Meeus, "Astronomical Algorithms", eq.
 * 13.6, in its cos(alt) form).
 */
export function altitudeDeg(decDeg: number, hourAngleDeg: number, latDeg: number): number {
  const dec = decDeg * RAD_PER_DEG;
  const lat = latDeg * RAD_PER_DEG;
  const H = hourAngleDeg * RAD_PER_DEG;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * DEG_PER_RAD;
}

/**
 * Converts hour-angle/declination to altitude/azimuth (azimuth measured
 * from North, clockwise through East -- the compass convention).
 * Implemented and inverted (see horizontalToEquatorial) from the same pair
 * of formulas so the two are guaranteed consistent; validated by the
 * round-trip tests in tests/geometry/horizontal.test.ts rather than by
 * trusting a single remembered textbook sign convention.
 */
export function equatorialToHorizontal(
  decDeg: number,
  hourAngleDeg: number,
  latDeg: number,
): Horizontal {
  const dec = decDeg * RAD_PER_DEG;
  const lat = latDeg * RAD_PER_DEG;
  const H = hourAngleDeg * RAD_PER_DEG;

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const sinAz = -Math.cos(dec) * Math.sin(H);
  const cosAz = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(H) * Math.sin(lat);
  const az = Math.atan2(sinAz, cosAz);

  return {
    altDeg: alt * DEG_PER_RAD,
    azDeg: normalizeDegrees(az * DEG_PER_RAD),
  };
}

/** Inverse of {@link equatorialToHorizontal}: altitude/azimuth to hour-angle/declination. */
export function horizontalToEquatorial(
  altDeg: number,
  azDeg: number,
  latDeg: number,
): HourAngleEquatorial {
  const alt = altDeg * RAD_PER_DEG;
  const lat = latDeg * RAD_PER_DEG;
  const az = azDeg * RAD_PER_DEG;

  const sinDec = Math.sin(alt) * Math.sin(lat) + Math.cos(alt) * Math.cos(lat) * Math.cos(az);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));

  const sinH = -Math.cos(alt) * Math.sin(az);
  const cosH = Math.sin(alt) * Math.cos(lat) - Math.cos(alt) * Math.cos(az) * Math.sin(lat);
  const H = Math.atan2(sinH, cosH);

  return {
    decDeg: dec * DEG_PER_RAD,
    hourAngleDeg: normalizeDegrees(H * DEG_PER_RAD),
  };
}
