import { describe, expect, it } from 'vitest';
import {
  altitudeDeg,
  equatorialToHorizontal,
  horizontalToEquatorial,
} from '../../src/geometry/horizontal.js';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('equatorialToHorizontal / horizontalToEquatorial round-trip', () => {
  const rand = mulberry32(42);
  for (let i = 0; i < 200; i++) {
    const dec = rand() * 180 - 90;
    const H = rand() * 360;
    const lat = rand() * 178 - 89; // avoid the exact poles, where azimuth is undefined

    it(`dec=${dec.toFixed(2)} H=${H.toFixed(2)} lat=${lat.toFixed(2)}`, () => {
      const { altDeg, azDeg } = equatorialToHorizontal(dec, H, lat);
      const back = horizontalToEquatorial(altDeg, azDeg, lat);
      expect(back.decDeg).toBeCloseTo(dec, 6);

      // Hour angle is degenerate at the zenith/nadir (az undefined); skip there.
      if (Math.abs(altDeg) < 89.9) {
        const hDiff = Math.abs(((back.hourAngleDeg - H + 540) % 360) - 180);
        expect(hDiff).toBeCloseTo(0, 6);
      }
    });
  }
});

describe('equatorialToHorizontal known cases', () => {
  it('at the equator, an object on the meridian has altitude = 90 - |dec|', () => {
    for (const dec of [0, 10, 45, -30, 89]) {
      const { altDeg, azDeg } = equatorialToHorizontal(dec, 0, 0);
      expect(altDeg).toBeCloseTo(90 - Math.abs(dec), 6);
      expect(azDeg).toBeCloseTo(dec >= 0 ? 0 : 180, 6);
    }
  });

  it('at latitude 90 (north pole), altitude equals declination for any hour angle', () => {
    for (const H of [0, 90, 200, 300]) {
      const { altDeg } = equatorialToHorizontal(37, H, 90);
      expect(altDeg).toBeCloseTo(37, 6);
    }
  });

  it('the celestial pole is always at altitude = latitude, due north', () => {
    for (const lat of [10, 32.5, 51.5, 89]) {
      const { altDeg, azDeg } = equatorialToHorizontal(90, 123, lat);
      expect(altDeg).toBeCloseTo(lat, 6);
      // Circular distance to 0: atan2 can round to exactly 360 instead of 0
      // at this near-degenerate azimuth (dec close to 90 makes cos(alt) tiny).
      expect(Math.min(azDeg, 360 - azDeg)).toBeCloseTo(0, 2);
    }
  });
});

describe('altitudeDeg matches the alt component of equatorialToHorizontal', () => {
  const rand = mulberry32(7);
  for (let i = 0; i < 50; i++) {
    const dec = rand() * 180 - 90;
    const H = rand() * 360;
    const lat = rand() * 178 - 89;
    it(`dec=${dec.toFixed(1)} H=${H.toFixed(1)} lat=${lat.toFixed(1)}`, () => {
      expect(altitudeDeg(dec, H, lat)).toBeCloseTo(equatorialToHorizontal(dec, H, lat).altDeg, 9);
    });
  }
});
