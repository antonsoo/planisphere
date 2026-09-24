import { describe, expect, it } from 'vitest';
import { applyProperMotion } from '../../src/astro/properMotion.js';

describe('applyProperMotion', () => {
  it('is a no-op over zero years', () => {
    const r = applyProperMotion({ ra: 123.4, dec: -12.3 }, 500, -300, 0);
    expect(r.ra).toBeCloseTo(123.4, 10);
    expect(r.dec).toBeCloseTo(-12.3, 10);
  });

  it('moves declination linearly with pmDec', () => {
    const r = applyProperMotion({ ra: 10, dec: 0 }, 0, 1000, 100);
    // 1000 mas/yr * 100 yr = 100,000 mas = 100 arcsec = 100/3600 deg
    expect(r.dec).toBeCloseTo(100 / 3600, 9);
  });

  it('divides pmRa by cos(dec) to get the RA coordinate rate (Hipparcos convention)', () => {
    const r = applyProperMotion({ ra: 10, dec: 60 }, 1000, 0, 100);
    const deltaRaDeg = (1000 * 100) / 3_600_000 / Math.cos((60 * Math.PI) / 180);
    expect(r.ra).toBeCloseTo(10 + deltaRaDeg, 9);
  });

  it("matches Barnard's Star's well-known ~10.3\"/yr total proper motion over one year", () => {
    // Barnard's Star: pmRA*cos(dec) ~ -798.71 mas/yr, pmDec ~ 10337.77 mas/yr
    // (values as commonly tabulated, e.g. Hipparcos catalogue).
    const start = { ra: 269.452, dec: 4.6933 };
    const r = applyProperMotion(start, -798.71, 10337.77, 1);
    const totalArcsec = Math.sqrt((-798.71 / 1000) ** 2 + (10337.77 / 1000) ** 2);
    expect(totalArcsec).toBeCloseTo(10.38, 1);
    expect(r.dec).toBeGreaterThan(start.dec);
  });

  it('clamps declination at the pole instead of overshooting', () => {
    const r = applyProperMotion({ ra: 0, dec: 89.999 }, 0, 100_000_000, 1);
    expect(r.dec).toBeLessThanOrEqual(90);
  });
});
