import { clampDeclination, normalizeDegrees, RAD_PER_DEG } from './constants.js';
import type { EquatorialCoord } from './precession.js';

/**
 * Applies linear proper motion to a J2000.0 position, using the Hipparcos/
 * HYG convention: `pmRaMasPerYear` is mu_alpha* = (d(alpha)/dt) * cos(dec),
 * i.e. it is already the star's actual angular rate across the sky in the
 * RA direction, not the raw rate of change of the RA coordinate. Both
 * components are in milliarcseconds/year.
 *
 * This is a flat tangent-plane approximation (add mu * dt, undoing the
 * cos(dec) projection for RA), not the rigorous great-circle propagation
 * used by professional astrometry pipelines. Over the multi-millennial
 * spans this app allows, that approximation grows visibly wrong for the
 * rare, very-high-proper-motion stars (e.g. Barnard's Star, ~10.3"/yr) --
 * see README "Accuracy and limitations". For the vast majority of stars in
 * the bundled catalogue (proper motion a few tens of mas/yr) the resulting
 * position error over 5000 years is well under the disc's plotting
 * precision.
 */
export function applyProperMotion(
  coord: EquatorialCoord,
  pmRaMasPerYear: number,
  pmDecMasPerYear: number,
  years: number,
): EquatorialCoord {
  const decRad = clampDeclination(coord.dec) * RAD_PER_DEG;
  const cosDec = Math.cos(decRad);

  const deltaDecDeg = (pmDecMasPerYear * years) / 3_600_000;
  const newDec = clampDeclination(coord.dec + deltaDecDeg);

  // Guard the pole: mu_alpha* / cos(dec) diverges as dec -> +/-90. No star in
  // the bundled catalogue is within a fraction of a degree of the pole with
  // non-negligible proper motion, but clamp defensively rather than emit NaN.
  const safeCosDec = Math.abs(cosDec) < 1e-6 ? Math.sign(cosDec || 1) * 1e-6 : cosDec;
  const deltaRaDeg = (pmRaMasPerYear * years) / 3_600_000 / safeCosDec;
  const newRa = normalizeDegrees(coord.ra + deltaRaDeg);

  return { ra: newRa, dec: newDec };
}
