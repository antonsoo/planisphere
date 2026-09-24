import { normalizeDegrees } from '../astro/constants.js';
import { altitudeDeg } from './horizontal.js';

/** True when a star at (decDeg, raDeg) is above the horizon at the given latitude and LST. */
export function isVisible(decDeg: number, raDeg: number, latDeg: number, lstDeg: number): boolean {
  const hourAngle = normalizeDegrees(lstDeg - raDeg);
  return altitudeDeg(decDeg, hourAngle, latDeg) > 0;
}
