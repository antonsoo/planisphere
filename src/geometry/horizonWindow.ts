import { horizontalToEquatorial } from './horizontal.js';
import type { HemisphereSign, Point } from './projection.js';
import { projectPoint } from './projection.js';

/**
 * The horizon window's boundary, in the *holder's* fixed frame (hour angle
 * as the angular coordinate, not RA) -- this shape does not depend on date
 * or time, only on latitude. See projection.ts's projectStar() docstring
 * for why the star disc must be mirrored for this fixed-window / rotating-
 * disc split to work.
 */
export function buildHorizonWindowPolygon(
  latDeg: number,
  hemisphereSign: HemisphereSign,
  scale: number,
  samples = 360,
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < samples; i++) {
    const az = (360 * i) / samples;
    const { decDeg, hourAngleDeg } = horizontalToEquatorial(0, az, latDeg);
    points.push(projectPoint(decDeg, hourAngleDeg, hemisphereSign, scale));
  }
  return points;
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
