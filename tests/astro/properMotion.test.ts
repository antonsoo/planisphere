import { describe, expect, it } from 'vitest';
import { applyProperMotion } from '../../src/astro/properMotion.js';
import { positionAtEpoch } from '../../src/astro/starPosition.js';
import oracle from '../fixtures/space-motion.oracle.json' with { type: 'json' };

function separationArcsec(a: { ra: number; dec: number }, b: { ra: number; dec: number }): number {
  const rad = Math.PI / 180;
  const halfChord =
    Math.sin(((a.dec - b.dec) * rad) / 2) ** 2 +
    Math.cos(a.dec * rad) * Math.cos(b.dec * rad) * Math.sin(((a.ra - b.ra) * rad) / 2) ** 2;
  return ((2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, halfChord))))) / rad) * 3600;
}

describe('Cartesian stellar propagation', () => {
  it('keeps the catalogue coordinates at J2000 without rounding them', () => {
    expect(applyProperMotion({ ra: 123.4, dec: -12.3 }, 500, -300, 0)).toEqual({
      ra: 123.4,
      dec: -12.3,
    });
  });
  it('crosses the north pole rather than pinning the star at declination 90', () => {
    const result = applyProperMotion({ ra: 10, dec: 89.5 }, 0, 3_600_000, 1);
    expect(result.ra).toBeCloseTo(190, 9);
    expect(result.dec).toBeCloseTo(89.50010152, 7);
    expect(applyProperMotion({ ra: 10, dec: -89.5 }, 0, -3_600_000, 1).dec).toBeCloseTo(
      -result.dec,
      10,
    );
  });
  it('defines a finite tangent direction even when the starting coordinate is exactly a pole', () => {
    const atPole = applyProperMotion({ ra: 0, dec: 90 }, 3_600_000, 0, 1);
    expect(atPole.ra).toBeCloseTo(90, 9);
    expect(atPole.dec).toBeLessThan(90);
    expect(separationArcsec(atPole, { ra: 0, dec: 90 })).toBeCloseTo(3599.63453, 4);
  });
  it('does not fabricate perspective when distance is unavailable', () => {
    const a = applyProperMotion({ ra: 30, dec: 40 }, 5000, 4000, -4999);
    const b = applyProperMotion({ ra: 30, dec: 40 }, 5000, 4000, -4999, {
      distancePc: null,
      radialVelocityKmSec: 300,
    });
    expect(b).toEqual(a);
  });
  it('rejects non-finite motion and HYG sentinel distances instead of emitting coordinates', () => {
    expect(() => applyProperMotion({ ra: 0, dec: 91 }, 0, 0, 1)).toThrow(RangeError);
    expect(() => applyProperMotion({ ra: 0, dec: 0 }, Infinity, 0, 1)).toThrow(RangeError);
    expect(() =>
      applyProperMotion({ ra: 0, dec: 0 }, 0, 0, 1, { distancePc: 100000, radialVelocityKmSec: 0 }),
    ).toThrow(RangeError);
  });
  it.each(oracle.cases)(
    'agrees with independent ERFA for HIP $star.hip, epoch $year',
    ({ star, year, motionRa, motionDec, meanRa, meanDec }) => {
      const moved = applyProperMotion(
        { ra: star.ra, dec: star.dec },
        star.pmRa,
        star.pmDec,
        year - 2000,
        {
          distancePc: star.distancePc,
          radialVelocityKmSec: star.radialVelocityKmSec,
        },
      );
      expect(separationArcsec(moved, { ra: motionRa, dec: motionDec })).toBeLessThan(0.35);
      expect(
        separationArcsec(positionAtEpoch(star, year), { ra: meanRa, dec: meanDec }),
      ).toBeLessThan(0.35);
    },
  );
});
