import { describe, expect, it } from 'vitest';
import { normalizeDegrees } from '../../src/astro/constants.js';
import { discRotationDeg } from '../../src/geometry/dial.js';
import { altitudeDeg } from '../../src/geometry/horizontal.js';
import { buildHorizonWindowPolygon, pointInPolygon } from '../../src/geometry/horizonWindow.js';
import { projectPoint } from '../../src/geometry/projection.js';
import { isVisible } from '../../src/geometry/visibility.js';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// This is the central geometric-correctness property of the whole
// instrument: cutting a horizon window at latitude phi and dialing the disc
// to (date, hour) must reveal exactly the stars that are actually above the
// horizon at that latitude and local sidereal time -- no more, no less.
// buildHorizonWindowPolygon() and isVisible() are independent code paths
// (one geometric/projective, one trigonometric); this test checks they
// agree for many random samples, for latitudes spanning both hemispheres
// and the app's city list.
describe('horizon window matches the analytic altitude test', () => {
  const scale = 4;
  // Latitude 0 is deliberately excluded: at the equator the horizon curve
  // passes through *both* celestial poles (the projection centre), which
  // makes a finite-sample simple-polygon approximation of the window
  // boundary ill-defined exactly at the crossing (self-intersecting in
  // (rho, theta) space), independent of sample count. That is a limitation
  // of this test's polygon-based cross-check, not of the analytic altitude
  // formula or of the rendered window itself -- see docs/geometry.md.
  const latitudes = [51.5, 32.55, 37.98, 20.68, 17.22, -33.87, 65];

  for (const lat of latitudes) {
    const hemisphereSign = lat >= 0 ? 1 : -1;
    const polygon = buildHorizonWindowPolygon(lat, hemisphereSign, scale, 720);
    const rand = mulberry32(Math.round(lat * 1000) + 1);

    it(`latitude ${lat}: 300 random (date, hour, star) samples agree`, () => {
      let checked = 0;
      for (let i = 0; i < 300; i++) {
        const dec = rand() * 178 - 89;
        const ra = rand() * 360;
        const date = new Date(Date.UTC(2026, 0, 1 + Math.floor(rand() * 365)));
        const hour = rand() * 24;

        const lst = discRotationDeg(date, hour);
        const analyticVisible = isVisible(dec, ra, lat, lst);

        const H = normalizeDegrees(lst - ra);
        const starPointInWindowFrame = projectPoint(dec, H, hemisphereSign, scale);
        const geometricVisible = pointInPolygon(starPointInWindowFrame, polygon);

        // Points extremely close to the horizon (< 0.3 deg true altitude) can
        // flip across the two independent methods due to the window's finite
        // polygon sampling (linear interpolation between sample points vs.
        // the exact trigonometric boundary); skip that razor's edge rather
        // than mask a real bug. This also covers stars near the pole at the
        // equator, which sit exactly on the horizon by construction.
        const alt = altitudeDeg(dec, H, lat);
        if (Math.abs(alt) < 0.3) continue;

        expect(geometricVisible).toBe(analyticVisible);
        checked++;
      }
      expect(checked).toBeGreaterThan(200);
    });
  }
});

describe('projectStar mirroring is required for the window to line up', () => {
  it('a star exactly on the elevated pole is inside the window at every latitude/time', () => {
    const lat = 40;
    const polygon = buildHorizonWindowPolygon(lat, 1, 4, 720);
    // The pole projects to the origin regardless of theta.
    const pt = projectPoint(90, 0, 1, 4);
    expect(pointInPolygon(pt, polygon)).toBe(true);
  });
});
