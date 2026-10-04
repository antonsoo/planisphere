import { SKY_RADIUS_MM } from './cutouts.js';
import { altitudeDeg, horizontalToEquatorial } from './horizontal.js';
import { type Point, projectPoint } from './projection.js';

/** Put compass letters on retained material, along the outward altitude
 * normal rather than radially (the equatorial horizon includes a diameter).
 */
export function cardinalMarkers(lat: number): (Point & { label: string })[] {
  const sign = lat >= 0 ? 1 : -1;
  const scale = SKY_RADIUS_MM / (180 - Math.abs(lat));
  const altitude = ({ x, y }: Point) =>
    altitudeDeg(sign * (90 - Math.hypot(x, y) / scale), (Math.atan2(y, x) * 180) / Math.PI, lat);
  return ['N', 'E', 'S', 'W'].map((label, index) => {
    const { decDeg, hourAngleDeg } = horizontalToEquatorial(0, index * 90, lat);
    // The opposite pole at the equator maps to the whole outer semicircle;
    // mark its meridian point, using the limit from northern latitudes.
    const p =
      lat === 0 && label === 'S'
        ? { x: SKY_RADIUS_MM, y: 0 }
        : projectPoint(decDeg, hourAngleDeg, sign, scale);
    const dx = altitude({ x: p.x + 0.01, y: p.y }) - altitude({ x: p.x - 0.01, y: p.y });
    const dy = altitude({ x: p.x, y: p.y + 0.01 }) - altitude({ x: p.x, y: p.y - 0.01 });
    const norm = Math.hypot(dx, dy);
    return { label, x: p.x - (4.5 * dx) / norm, y: p.y - (4.5 * dy) / norm };
  });
}
