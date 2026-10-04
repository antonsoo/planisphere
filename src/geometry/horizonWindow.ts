import type { HemisphereSign, Point } from './projection.js';

/** Solve altitude = 0 for the radius in an elevated-pole projection. */
export function horizonRadius(theta: number, latDeg: number, scale: number): number {
  const phi = (Math.abs(latDeg) * Math.PI) / 180;
  if (phi === 0) return Math.cos(theta) >= 0 ? 180 * scale : 0;
  return (
    scale * (90 + (Math.atan2(Math.cos(phi) * Math.cos(theta), Math.sin(phi)) * 180) / Math.PI)
  );
}

/**
 * The horizon window's boundary, in the *holder's* fixed frame (hour angle
 * as the angular coordinate, not RA) -- this shape does not depend on date
 * or time, only on latitude. See projection.ts's projectStar() docstring
 * for why the star disc must be mirrored for this fixed-window / rotating-
 * disc split to work.
 */
export function buildHorizonWindowPolygon(
  latDeg: number,
  _hemisphereSign: HemisphereSign,
  scale: number,
  samples = 360,
): Point[] {
  if (latDeg === 0) {
    // At the equator use a semicircle and its diameter, not a degenerate
    // horizontal-to-equatorial inversion at the celestial poles.
    return Array.from({ length: samples + 1 }, (_, i) => {
      const theta = -Math.PI / 2 + (Math.PI * i) / samples;
      return { x: 180 * scale * Math.cos(theta), y: 180 * scale * Math.sin(theta) };
    });
  }
  return Array.from({ length: samples }, (_, i) => {
    const theta = (2 * Math.PI * i) / samples;
    const r = horizonRadius(theta, latDeg, scale);
    return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
  });
}

/** Standard ray-casting point-in-polygon test. */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (!pi || !pj) continue;
    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
