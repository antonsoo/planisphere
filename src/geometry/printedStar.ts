import { SKY_RADIUS_MM } from './cutouts.js';
import type { Point } from './projection.js';

/** Radius of the printed glyph; null when it cannot fit inside the sky field. */
export function printedStarRadius(magnitude: number, point: Point): number | null {
  const clearance = SKY_RADIUS_MM - Math.hypot(point.x, point.y) - 0.02;
  const radius = Math.min(
    clearance,
    Math.max(0.15, 0.14 + (5.5 - Math.max(-1.5, Math.min(5.5, magnitude))) * 0.09),
  );
  return radius >= 0.06 ? radius : null;
}
