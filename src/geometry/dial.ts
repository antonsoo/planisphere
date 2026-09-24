import { normalizeDegrees } from '../astro/constants.js';
import { meanSolarRaDeg } from './sun.js';

/**
 * Local Sidereal Time, as an angle, from a calendar date and a *local mean
 * solar time* hour (0-24, no timezone/DST/equation-of-time correction --
 * exactly the simplification every paper planisphere makes, because a
 * printed ring cannot encode the equation of time). LST = RA_sun(date) +
 * hour-angle-of-the-mean-sun, and the mean sun's hour angle is
 * (hour - 12) * 15 deg by definition of local mean time. See
 * docs/geometry.md for the derivation and its ~16-minute-of-time accuracy
 * bound (the size of the equation of time).
 */
export function localSiderealTimeDeg(date: Date, localHour: number): number {
  return normalizeDegrees(meanSolarRaDeg(date) + (localHour - 12) * 15);
}

/** Native (mirrored, disc-frame) angle of a calendar date's mark on the date ring. */
export function dateRingAngleDeg(date: Date): number {
  return normalizeDegrees(-meanSolarRaDeg(date));
}

/** Fixed holder-frame angle of an hour mark (0-24h local mean time) on the hour ring. */
export function hourRingAngleDeg(localHour: number): number {
  return normalizeDegrees((localHour - 12) * 15);
}

/** The disc rotation (degrees, same sense as projectStar's mirrored theta) for a date+hour. */
export function discRotationDeg(date: Date, localHour: number): number {
  return localSiderealTimeDeg(date, localHour);
}
