import { normalizeDegrees } from '../astro/constants.js';
import { meanSunRaDeg } from './sun.js';

/**
 * Local Sidereal Time, as an angle, from a calendar date and a *local mean
 * solar time* hour (0-24, no timezone/DST correction -- enter local mean
 * time, which a printed ring can't convert to for you). LST = RA of the
 * mean Sun + the mean Sun's hour angle, which is (hour - 12) * 15 deg by
 * definition of local mean time. See docs/geometry.md for the derivation.
 */
export function localSiderealTimeDeg(date: Date, localHour: number): number {
  return normalizeDegrees(meanSunRaDeg(date) + (localHour - 12) * 15);
}

/** Native (mirrored, disc-frame) angle of a calendar date's mark on the date ring. */
export function dateRingAngleDeg(date: Date): number {
  return normalizeDegrees(-meanSunRaDeg(date));
}

/** Fixed holder-frame angle of an hour mark (0-24h local mean time) on the hour ring. */
export function hourRingAngleDeg(localHour: number): number {
  return normalizeDegrees((localHour - 12) * 15);
}

/** The disc rotation (degrees, same sense as projectStar's mirrored theta) for a date+hour. */
export function discRotationDeg(date: Date, localHour: number): number {
  return localSiderealTimeDeg(date, localHour);
}
