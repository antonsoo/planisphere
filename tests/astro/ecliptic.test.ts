import { describe, expect, it } from 'vitest';
import { equatorialToEcliptic, meanObliquityArcsec } from '../../src/astro/ecliptic.js';
import { precessFromJ2000 } from '../../src/astro/precession.js';
import { epochYearToJulianCenturies } from '../../src/astro/time.js';
import oracle from '../fixtures/ecliptic.oracle.json' with { type: 'json' };

describe('ecliptic of date', () => {
  it('has the IAU 2006 obliquity at J2000.0', () => {
    expect(meanObliquityArcsec(0)).toBe(84381.406);
  });

  it.each(oracle.cases)(
    'matches pyerfa obliquity and ecliptic position at year $year ($star)',
    ({ year, ra, dec, epsArcsec, lon, lat }) => {
      const t = epochYearToJulianCenturies(year);
      expect(meanObliquityArcsec(t)).toBeCloseTo(epsArcsec, 4);
      const e = equatorialToEcliptic(precessFromJ2000({ ra, dec }, t), t);
      // The oracle includes the ~20 mas ICRS frame bias that planisphere drops;
      // 1e-4 degrees is 0.36 arcsecond.
      const dLon = ((e.lon - lon + 540) % 360) - 180;
      expect(Math.abs(dLon) * Math.cos((lat * Math.PI) / 180)).toBeLessThan(1e-4);
      expect(Math.abs(e.lat - lat)).toBeLessThan(1e-4);
    },
  );

  it('leaves the pole of the ecliptic at latitude 90', () => {
    const t = 0;
    const e = equatorialToEcliptic({ ra: 270, dec: 90 - meanObliquityArcsec(t) / 3600 }, t);
    expect(e.lat).toBeCloseTo(90, 9);
  });
});
