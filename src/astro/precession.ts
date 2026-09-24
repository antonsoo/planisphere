import { clampDeclination, DEG_PER_RAD, normalizeDegrees, RAD_PER_DEG } from './constants.js';

/**
 * The classical equatorial precession angles zeta_A, z_A and theta_A of the
 * P03 precession model (Capitaine, Wallace & Chapront 2003, A&A 412,
 * 567-586, eq. 40), adopted by IAU 2006 Resolution B1 to replace the older
 * IAU 1976 (Lieske) model. Coefficients transcribed from the paper and
 * cross-checked against pyerfa's `erfa.p06e` (see
 * tests/fixtures/precession-angles.oracle.json and
 * scripts/generate_precession_fixtures.py).
 *
 * Valid "for a span of several millennia" per Capitaine et al. (2003);
 * accuracy degrades gracefully outside that -- see README "Accuracy and
 * limitations" for the stated bound used in this project (a few arcminutes
 * at the ends of the +/-5000 year range offered by the UI).
 *
 * @param t Julian centuries from J2000.0 TT (see src/astro/time.ts).
 * @returns zeta_A, z_A, theta_A in arcseconds.
 */
export function precessionAngles(t: number): { zetaA: number; zA: number; thetaA: number } {
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;

  const zetaA =
    2.650545 +
    2306.083227 * t +
    0.2988499 * t2 +
    0.01801828 * t3 -
    0.000005971 * t4 -
    0.0000003173 * t5;

  const zA =
    -2.650545 +
    2306.077181 * t +
    1.0927348 * t2 +
    0.01826837 * t3 -
    0.000028596 * t4 -
    0.0000002904 * t5;

  const thetaA =
    2004.191903 * t - 0.4294934 * t2 - 0.04182264 * t3 - 0.000007089 * t4 - 0.0000001274 * t5;

  return { zetaA, zA, thetaA };
}

export interface EquatorialCoord {
  /** Right ascension in degrees, [0, 360). */
  ra: number;
  /** Declination in degrees, [-90, 90]. */
  dec: number;
}

/**
 * Precesses J2000.0 mean equatorial coordinates to the mean equator and
 * equinox of the date corresponding to Julian centuries `t`, using the
 * rigorous rotation formula built from zeta_A/z_A/theta_A (the same
 * three-angle construction as Meeus, "Astronomical Algorithms" 2nd ed.,
 * ch. 21, eq. 21.4, generalized here to the P03 angles rather than his
 * IAU-1976-based ones). See tests/astro/precession.test.ts for a
 * cross-check against the book's own worked example.
 *
 * Does not include frame bias (the ~20 mas fixed rotation between the ICRS
 * and the J2000.0 dynamical equator/equinox): irrelevant at the accuracy
 * this app targets, and dropping it keeps the transform exactly invertible.
 */
export function precessFromJ2000(coord: EquatorialCoord, t: number): EquatorialCoord {
  const { zetaA, zA, thetaA } = precessionAngles(t);
  return applyPrecessionAngles(coord, zetaA, zA, thetaA);
}

/** Inverse of {@link precessFromJ2000}: brings a date-of-epoch position back to J2000.0. */
export function precessToJ2000(coord: EquatorialCoord, t: number): EquatorialCoord {
  const { zetaA, zA, thetaA } = precessionAngles(t);
  // The inverse rotation swaps the roles of zeta_A and z_A and negates theta_A.
  return applyPrecessionAngles(coord, -zA, -zetaA, -thetaA);
}

function applyPrecessionAngles(
  coord: EquatorialCoord,
  zetaArcsec: number,
  zArcsec: number,
  thetaArcsec: number,
): EquatorialCoord {
  const zeta = (zetaArcsec / 3600) * RAD_PER_DEG;
  const z = (zArcsec / 3600) * RAD_PER_DEG;
  const theta = (thetaArcsec / 3600) * RAD_PER_DEG;

  const ra0 = coord.ra * RAD_PER_DEG;
  const dec0 = clampDeclination(coord.dec) * RAD_PER_DEG;

  const cosDec0 = Math.cos(dec0);
  const sinDec0 = Math.sin(dec0);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  const A = cosDec0 * Math.sin(ra0 + zeta);
  const B = cosTheta * cosDec0 * Math.cos(ra0 + zeta) - sinTheta * sinDec0;
  const C = sinTheta * cosDec0 * Math.cos(ra0 + zeta) + cosTheta * sinDec0;

  const ra = Math.atan2(A, B) + z;
  const dec = Math.asin(Math.max(-1, Math.min(1, C)));

  return {
    ra: normalizeDegrees(ra * DEG_PER_RAD),
    dec: dec * DEG_PER_RAD,
  };
}
