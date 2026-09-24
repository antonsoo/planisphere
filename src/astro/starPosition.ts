import { type EquatorialCoord, precessFromJ2000 } from './precession.js';
import { applyProperMotion } from './properMotion.js';
import { epochYearToJulianCenturies } from './time.js';

export interface CatalogueStar {
  id: number;
  hip: number | null;
  name: string | null;
  bayer: string | null;
  flam: number | null;
  con: string;
  ra: number;
  dec: number;
  pmRa: number;
  pmDec: number;
  mag: number;
  bv: number | null;
}

/**
 * Computes a star's apparent mean position for a given epoch: apply proper
 * motion first (from J2000.0 to the target date), then precess the result
 * (also from J2000.0 to the target date). This ordering matches Meeus's
 * worked example (ch. 20/21): proper motion is applied at the *starting*
 * equinox before precessing, not after.
 */
export function positionAtEpoch(star: CatalogueStar, epochYear: number): EquatorialCoord {
  const years = epochYear - 2000;
  const moved = applyProperMotion({ ra: star.ra, dec: star.dec }, star.pmRa, star.pmDec, years);
  const t = epochYearToJulianCenturies(epochYear);
  return precessFromJ2000(moved, t);
}
