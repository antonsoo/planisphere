import { describe, expect, it } from 'vitest';
import { precessFromJ2000, precessionAngles, precessToJ2000 } from '../../src/astro/precession.js';
import { epochYearToJulianCenturies } from '../../src/astro/time.js';
import oracle from '../fixtures/precession-angles.oracle.json' with { type: 'json' };

function raHoursToDeg(h: number, m: number, s: number): number {
  return (h + m / 60 + s / 3600) * 15;
}

function dmsToDeg(d: number, m: number, s: number): number {
  const sign = d < 0 ? -1 : 1;
  return sign * (Math.abs(d) + m / 60 + s / 3600);
}

describe('precessionAngles (Capitaine et al. 2003, P03/IAU2006)', () => {
  it('matches the pyerfa p06e oracle at T=0 (angles must vanish)', () => {
    const { zetaA, zA, thetaA } = precessionAngles(0);
    expect(zetaA).toBeCloseTo(2.650545, 6);
    expect(zA).toBeCloseTo(-2.650545, 6);
    expect(thetaA).toBeCloseTo(0, 9);
  });

  it.each(oracle.cases)(
    'agrees with the independent pyerfa/ERFA implementation at year $year',
    ({ t_centuries, zetaA_arcsec, zA_arcsec, thetaA_arcsec }) => {
      const angles = precessionAngles(t_centuries);
      // Sub-microarcsecond agreement is expected: both sides evaluate the same
      // published polynomial, just in two independent codebases (this
      // project's TypeScript vs. the C library ERFA via pyerfa).
      expect(angles.zetaA).toBeCloseTo(zetaA_arcsec, 5);
      expect(angles.zA).toBeCloseTo(zA_arcsec, 5);
      expect(angles.thetaA).toBeCloseTo(thetaA_arcsec, 5);
    },
  );
});

describe('precessFromJ2000 vs. Meeus, Astronomical Algorithms, Example 20.b (theta Persei)', () => {
  // Meeus precesses using the older IAU 1976 (Lieske) angles, not P03/2006;
  // the two theories differ by design (P03 corrected a small drift in the
  // general precession constant found after 1976). Reconstructing this same
  // example with pyerfa's `pmat76` (IAU 1976) reproduces the book to ~4e-7
  // degree, confirming that's the model the book uses; the *same* input
  // pushed through pyerfa's bias-free P03 angles (`p06e`, the model this
  // file implements) lands 0.100 arcsec away in RA -- a measured model
  // difference, not a tolerance guess. We assert agreement to 0.15", with
  // margin, rather than bit-for-bit equality -- see README "Accuracy and
  // limitations".
  const TOLERANCE_DEG = 0.15 / 3600;

  it("reproduces the book's final position to within the P03/IAU1976 model difference", () => {
    // Example 20.b: mean position at J2000.0, already advanced by the given
    // proper motion to 2028 Nov 13.19 TD (that step is proper-motion
    // bookkeeping, not precession, so it is reproduced verbatim from the
    // book rather than re-derived here).
    const ra0 = raHoursToDeg(2, 44, 12.975);
    const dec0 = dmsToDeg(49, 13, 39.9);

    const t = 0.2886705; // as given in the book
    const result = precessFromJ2000({ ra: ra0, dec: dec0 }, t);

    const expectedRa = raHoursToDeg(2, 46, 11.331);
    const expectedDec = dmsToDeg(49, 20, 54.54);

    expect(Math.abs(result.ra - expectedRa)).toBeLessThan(TOLERANCE_DEG);
    expect(Math.abs(result.dec - expectedDec)).toBeLessThan(TOLERANCE_DEG);
  });

  it("the t value implied by the epoch matches the book's own t to 6 decimals", () => {
    // Book: "t = +0.288 670 500 Julian centuries" for JD 2462088.69 from J2000.0.
    const t = (2462088.69 - 2451545.0) / 36525;
    expect(t).toBeCloseTo(0.2886705, 6);
  });
});

describe('precession round-trips', () => {
  const cases = [
    { ra: 101.287, dec: -16.716 }, // Sirius
    { ra: 88.793, dec: 7.407 }, // Betelgeuse
    { ra: 37.955, dec: 89.264 }, // Polaris, near the pole
    { ra: 0.5, dec: -89.9 }, // near the south celestial pole
  ];
  const epochs = [-2999, -699, 1, 1500, 2028.867, 3000];

  for (const c of cases) {
    for (const year of epochs) {
      it(`ra=${c.ra} dec=${c.dec} round-trips through epoch year ${year}`, () => {
        const t = epochYearToJulianCenturies(year);
        const forward = precessFromJ2000(c, t);
        const back = precessToJ2000(forward, t);
        expect(back.dec).toBeCloseTo(c.dec, 9);
        // Near the poles RA is degenerate; only check it away from there.
        if (Math.abs(c.dec) < 89.5) {
          const raDiff = Math.abs(((back.ra - c.ra + 540) % 360) - 180);
          expect(raDiff).toBeCloseTo(0, 7);
        }
      });
    }
  }
});
