import { describe, expect, it } from 'vitest';
import { cardinalMarkers } from '../../src/geometry/cardinals.js';
import { dateRingAngleDeg, discRotationDeg, hourRingAngleDeg } from '../../src/geometry/dial.js';
import { projectStar } from '../../src/geometry/projection.js';
import oracle from '../fixtures/sky-handedness.oracle.json';

describe('charts look out from inside the celestial sphere in both hemispheres', () => {
  for (const row of oracle.cases) {
    it(`matches the independent ENU camera at latitude ${row.latitudeDeg}`, () => {
      const sign = row.latitudeDeg >= 0 ? 1 : -1;
      const scale = 60 / (180 - Math.abs(row.latitudeDeg));
      const theta = (sign * row.lstDeg * Math.PI) / 180;
      for (const star of row.stars) {
        const point = projectStar(star.dec, star.ra, sign, scale);
        expect(point.x * Math.cos(theta) - point.y * Math.sin(theta)).toBeCloseTo(
          star.pointMm.x,
          9,
        );
        expect(point.x * Math.sin(theta) + point.y * Math.cos(theta)).toBeCloseTo(
          star.pointMm.y,
          9,
        );
      }
    });
  }

  for (const lat of [-89, -65, -33.9, -0.1, 0, 0.1, 32.5, 65, 89]) {
    it(`keeps N/E/S/W counterclockwise in y-up sky artwork at latitude ${lat}`, () => {
      const points = cardinalMarkers(lat);
      const twiceArea = points.reduce((area, p, i) => {
        const next = points[(i + 1) % points.length];
        if (!next) throw new Error('Missing cardinal');
        return area + p.x * next.y - next.x * p.y;
      }, 0);
      // Overhead sky maps reverse the handedness of maps viewed from above
      // the ground. Cardinal visibility alone cannot distinguish the two.
      expect(twiceArea).toBeGreaterThan(0);
    });
  }
});

it('aligns southern date and hour ticks with the reversed physical wheel rotation', () => {
  for (const sign of [1, -1] as const) {
    for (const date of [new Date('2024-02-29'), new Date('2026-12-31')]) {
      for (const hour of [0, 6, 12, 21.25, 23.75]) {
        const angle = dateRingAngleDeg(date, sign) + discRotationDeg(date, hour, sign);
        const difference = ((angle - hourRingAngleDeg(hour, sign) + 540) % 360) - 180;
        expect(difference).toBeCloseTo(0, 9);
      }
    }
  }
});
