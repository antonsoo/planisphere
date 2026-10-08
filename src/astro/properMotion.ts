import { DEG_PER_RAD, normalizeDegrees, RAD_PER_DEG } from './constants.js';
import type { EquatorialCoord } from './precession.js';

const RADIANS_PER_MAS = RAD_PER_DEG / 3_600_000;
// Julian year, exact IAU astronomical unit, and parsec = 648000/pi AU.
const KM_S_TO_PC_YEAR = (365.25 * 86400) / ((149597870.7 * 648000) / Math.PI);

export interface SpaceMotion {
  /** Missing/dubious parallax must be null, not HYG's 100000 pc sentinel. */
  distancePc: number | null;
  /** Positive is receding. Null assumes zero radial velocity. */
  radialVelocityKmSec: number | null;
}

/**
 * Rectilinear space motion in the J2000 Cartesian frame, projected back onto
 * the celestial sphere. pmRa is mu_alpha* (already includes cos(dec)), in
 * mas per Julian year. Tangent basis vectors avoid division at either pole.
 *
 * Dividing the space vector by its initial distance leaves a unit direction
 * plus tangential angular velocity and (rv/distance) along that direction.
 * When distance is unknown, omit the perspective term. This is geometric,
 * constant-velocity propagation, without light-time/relativistic or orbital
 * corrections; docs/stellar-motion.md quantifies comparison with ERFA.
 */
export function applyProperMotion(
  coord: EquatorialCoord,
  pmRaMasPerYear: number,
  pmDecMasPerYear: number,
  years: number,
  space: SpaceMotion = { distancePc: null, radialVelocityKmSec: null },
): EquatorialCoord {
  if (
    ![coord.ra, coord.dec, pmRaMasPerYear, pmDecMasPerYear, years].every(Number.isFinite) ||
    Math.abs(coord.dec) > 90 ||
    (space.distancePc !== null &&
      (!Number.isFinite(space.distancePc) ||
        space.distancePc <= 0 ||
        space.distancePc >= 100000)) ||
    (space.radialVelocityKmSec !== null && !Number.isFinite(space.radialVelocityKmSec))
  )
    throw new RangeError(
      'Stellar motion requires finite coordinates, rates, and a usable distance or null.',
    );

  if (years === 0)
    return {
      ra: coord.ra >= 0 && coord.ra < 360 ? coord.ra : normalizeDegrees(coord.ra),
      dec: coord.dec,
    };
  const a = coord.ra * RAD_PER_DEG;
  const d = coord.dec * RAD_PER_DEG;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const cd = Math.cos(d);
  const sd = Math.sin(d);
  const east = pmRaMasPerYear * RADIANS_PER_MAS * years;
  const north = pmDecMasPerYear * RADIANS_PER_MAS * years;
  const radial =
    space.distancePc === null || space.radialVelocityKmSec === null
      ? 0
      : ((space.radialVelocityKmSec * KM_S_TO_PC_YEAR) / space.distancePc) * years;
  const x = (1 + radial) * cd * ca - east * sa - north * sd * ca;
  const y = (1 + radial) * cd * sa + east * ca - north * sd * sa;
  const z = (1 + radial) * sd + north * cd;
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length === 0)
    throw new RangeError('Stellar propagation reaches an undefined position.');
  return {
    ra: normalizeDegrees(Math.atan2(y, x) * DEG_PER_RAD),
    dec: Math.atan2(z, Math.hypot(x, y)) * DEG_PER_RAD,
  };
}
