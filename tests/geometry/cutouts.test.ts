import { describe, expect, it } from 'vitest';
import { cardinalMarkers } from '../../src/geometry/cardinals.js';
import {
  BRIDGE_HALF_WIDTH_MM,
  buildHolderCutouts,
  clipSegmentToCircle,
  HUB_RADIUS_MM,
  SKY_RADIUS_MM,
} from '../../src/geometry/cutouts.js';
import { altitudeDeg } from '../../src/geometry/horizontal.js';
import { pointInPolygon } from '../../src/geometry/horizonWindow.js';

describe('manufacturable opaque holder', () => {
  for (const lat of [0, 0.1, -0.1, 5, -5, 32.5, -33.9, 65, -65, 89, -89]) {
    it(`latitude ${lat}: two holes expose the analytic sky except the retained supports`, () => {
      const cutouts = buildHolderCutouts(lat);
      expect(cutouts).toHaveLength(2);
      const inHole = (x: number, y: number) =>
        cutouts.some((polygon) => pointInPolygon({ x, y }, polygon));
      const sign = lat >= 0 ? 1 : -1;
      const scale = SKY_RADIUS_MM / (180 - Math.abs(lat));
      let checks = 0;
      for (let x = -59.3; x < 60; x += 2.37) {
        for (let y = -59.1; y < 60; y += 2.31) {
          const r = Math.hypot(x, y);
          if (
            r > SKY_RADIUS_MM ||
            Math.abs(r - HUB_RADIUS_MM) < 0.03 ||
            Math.abs(Math.abs(y) - BRIDGE_HALF_WIDTH_MM) < 0.03
          )
            continue;
          const dec = sign * (90 - r / scale);
          const altitude = altitudeDeg(dec, (Math.atan2(y, x) * 180) / Math.PI, lat);
          if (Math.abs(altitude) < 0.3) continue;
          const retained = r <= HUB_RADIUS_MM || Math.abs(y) <= BRIDGE_HALF_WIDTH_MM;
          expect(inHole(x, y), `x=${x}, y=${y}, alt=${altitude}`).toBe(altitude > 0 && !retained);
          checks++;
        }
      }
      expect(checks).toBeGreaterThan(1500);
      // A continuous strip connects the pivot to both sides of the holder.
      for (let x = -79; x < 80; x++) expect(inHole(x, 0)).toBe(false);
      for (const polygon of cutouts)
        for (const { x, y } of polygon) {
          expect(Math.hypot(x, y)).toBeLessThanOrEqual(SKY_RADIUS_MM + 1e-8);
          expect(Math.abs(y)).toBeGreaterThanOrEqual(BRIDGE_HALF_WIDTH_MM - 1e-8);
          expect(Math.hypot(x, y)).toBeGreaterThanOrEqual(HUB_RADIUS_MM - 1e-8);
        }
      for (const marker of cardinalMarkers(lat)) {
        expect(Number.isFinite(marker.x) && Number.isFinite(marker.y)).toBe(true);
        expect(inHole(marker.x, marker.y)).toBe(false);
        expect(Math.hypot(marker.x, marker.y)).toBeLessThan(70);
      }
    });
  }
});

describe('geometric clipping for laser paths', () => {
  it('clips both ends of a segment that crosses from outside to outside', () => {
    expect(clipSegmentToCircle({ x: -100, y: 0 }, { x: 100, y: 0 }, 60)).toEqual([
      { x: -60, y: 0 },
      { x: 60, y: 0 },
    ]);
  });
  it('keeps interior segments and clips a single exterior end', () => {
    expect(clipSegmentToCircle({ x: 0, y: 0 }, { x: 100, y: 0 }, 60)).toEqual([
      { x: 0, y: 0 },
      { x: 60, y: 0 },
    ]);
    expect(clipSegmentToCircle({ x: 3, y: 4 }, { x: 6, y: 8 }, 60)).toEqual([
      { x: 3, y: 4 },
      { x: 6, y: 8 },
    ]);
  });
  it('drops disjoint, tangent and degenerate exterior segments', () => {
    expect(clipSegmentToCircle({ x: -100, y: 61 }, { x: 100, y: 61 }, 60)).toBeNull();
    expect(clipSegmentToCircle({ x: -100, y: 60 }, { x: 100, y: 60 }, 60)).toBeNull();
    expect(clipSegmentToCircle({ x: 100, y: 0 }, { x: 100, y: 0 }, 60)).toBeNull();
  });
});
