import { DEG_PER_RAD, normalizeDegrees, RAD_PER_DEG } from './constants.js';
import type { EquatorialCoord } from './precession.js';

/**
 * Mean obliquity of the ecliptic of date, in arcseconds, from the P03
 * polynomial (Capitaine, Wallace & Chapront 2003, A&A 412, 567, eq. 39),
 * adopted by IAU 2006. Cross-checked against pyerfa's `obl06` in
 * studies/historical-catalogues/.
 *
 * @param t Julian centuries from J2000.0 TT.
 */
export function meanObliquityArcsec(t: number): number {
  return (
    84381.406 +
    t * (-46.836769 + t * (-0.0001831 + t * (0.0020034 + t * (-0.000000576 + t * -0.0000000434))))
  );
}

export interface EclipticCoord {
  /** Ecliptic longitude in degrees, [0, 360). */
  lon: number;
  /** Ecliptic latitude in degrees, [-90, 90]. */
  lat: number;
}

/**
 * Rotates a mean equatorial position of date (already precessed to `t`) into
 * the mean ecliptic and equinox of the same date, which is the frame in
 * which the historical star catalogues record longitude and latitude.
 */
export function equatorialToEcliptic(coord: EquatorialCoord, t: number): EclipticCoord {
  const eps = (meanObliquityArcsec(t) / 3600) * RAD_PER_DEG;
  const a = coord.ra * RAD_PER_DEG;
  const d = coord.dec * RAD_PER_DEG;
  const sinLat = Math.sin(d) * Math.cos(eps) - Math.cos(d) * Math.sin(eps) * Math.sin(a);
  const lon = Math.atan2(
    Math.sin(a) * Math.cos(d) * Math.cos(eps) + Math.sin(d) * Math.sin(eps),
    Math.cos(a) * Math.cos(d),
  );
  return {
    lon: normalizeDegrees(lon * DEG_PER_RAD),
    lat: Math.asin(Math.max(-1, Math.min(1, sinLat))) * DEG_PER_RAD,
  };
}
