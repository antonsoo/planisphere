import { normalizeDegrees } from '../astro/constants.js';
import type { HemisphereSign } from './projection.js';
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

/** Native disc-frame angle of a date mark; reversed around the southern pole. */
export function dateRingAngleDeg(date: Date, hemisphereSign: HemisphereSign = 1): number {
  return normalizeDegrees(-hemisphereSign * meanSunRaDeg(date));
}

/** Fixed holder-frame angle of an hour mark (0-24h local mean time) on the hour ring. */
export function hourRingAngleDeg(localHour: number, hemisphereSign: HemisphereSign = 1): number {
  return normalizeDegrees(hemisphereSign * (localHour - 12) * 15);
}

/** Physical rotation in the y-up artwork frame; LST itself is hemisphere-independent. */
export function discRotationDeg(
  date: Date,
  localHour: number,
  hemisphereSign: HemisphereSign = 1,
): number {
  return normalizeDegrees(hemisphereSign * localSiderealTimeDeg(date, localHour));
}
