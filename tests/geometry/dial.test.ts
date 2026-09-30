import { describe, expect, it } from 'vitest';
import { normalizeDegrees } from '../../src/astro/constants.js';
import { discRotationDeg } from '../../src/geometry/dial.js';
import { apparentSolarRaDeg, julianDayFromDate, meanSunRaDeg } from '../../src/geometry/sun.js';

/**
 * Local sidereal time from an independent formula: Greenwich mean sidereal
 * time (IAU 1982, Meeus eq. 12.4) at the UT matching a local mean time,
 * plus the longitude.
 */
function trueLstDeg(dateUtcMidnight: Date, localMeanHour: number, lonDegEast: number): number {
  const ut = new Date(dateUtcMidnight.getTime() + (localMeanHour - lonDegEast / 15) * 3_600_000);
  const d = julianDayFromDate(ut) - 2451545.0;
  const t = d / 36525;
  const gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38710000;
  return normalizeDegrees(gmst + lonDegEast);
}

function angleDiff(a: number, b: number): number {
  const x = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  return Math.min(x, 360 - x);
}

// The Sun's mean motion, degrees per day. A date mark stands for one instant
// (0h UT on that date), so a reading d days away from it lags the true sky by
// 0.98565 * d degrees: at most about a degree (4 minutes) within a day, the
// usual granularity of a date ring.
const MEAN_SUN_DEG_PER_DAY = 0.98565;

describe('disc rotation reads local mean time', () => {
  it("matches the true local sidereal time, less the Sun's motion since the date mark, all year, at any longitude", () => {
    let worst = 0;
    for (let day = 0; day < 365; day += 4) {
      const date = new Date(Date.UTC(2026, 0, 1 + day));
      for (const hour of [0, 6, 21.5]) {
        for (const lon of [0, 44.42, -122.42]) {
          const daysSinceMark = (hour - lon / 15) / 24;
          const expected = trueLstDeg(date, hour, lon) - MEAN_SUN_DEG_PER_DAY * daysSinceMark;
          worst = Math.max(worst, angleDiff(discRotationDeg(date, hour), expected));
        }
      }
    }
    // The apparent Sun used before put this at up to ~4 deg (the equation of time).
    expect(worst).toBeLessThan(0.02);
  });

  it('differs from the apparent Sun by the equation of time (about 4 deg in early November)', () => {
    const nov3 = new Date(Date.UTC(2026, 10, 3));
    // Equation of time near +16.4 min on 3 November: the apparent Sun is that far ahead in hour angle.
    const eotMinutes =
      (normalizeDegrees(meanSunRaDeg(nov3) - apparentSolarRaDeg(nov3) + 180) - 180) * 4;
    expect(eotMinutes).toBeGreaterThan(16);
    expect(eotMinutes).toBeLessThan(16.6);
  });
});
