import { horizonRadius } from './horizonWindow.js';
import type { Point } from './projection.js';

export const SKY_RADIUS_MM = 60;
export const WHEEL_RADIUS_MM = 96;
export const HOLDER_RADIUS_MM = 80;
export const HUB_RADIUS_MM = 3.2;
export const BRIDGE_HALF_WIDTH_MM = 1.2;
export const PIVOT_RADIUS_MM = 0.8;

/** Actual cutting outlines retaining a hub and two connected horizontal
 * supports. No overlapping cut loops or clipPaths are required by a cutter.
 */
export function buildHolderCutouts(latDeg: number): Point[][] {
  const scale = SKY_RADIUS_MM / (180 - Math.abs(latDeg));
  const inner = (theta: number) => Math.max(HUB_RADIUS_MM, BRIDGE_HALF_WIDTH_MM / Math.sin(theta));
  const gap = (theta: number) => horizonRadius(theta, latDeg, scale) - inner(theta);
  const n = 1440;
  const intervals: [number, number][] = [];
  let start: number | null = null;
  let previous = 1e-9;
  let previousInside = false;
  // Keep the inside endpoint at a transition, including the equatorial jump.
  function boundary(a: number, b: number, entering: boolean): number {
    for (let j = 0; j < 40; j++) {
      const mid = (a + b) / 2;
      if (gap(mid) > 0 === entering) b = mid;
      else a = mid;
    }
    return entering ? b : a;
  }
  for (let i = 1; i <= n; i++) {
    const theta = Math.min(Math.PI - 1e-9, (Math.PI * i) / n);
    const inside = gap(theta) > 0;
    if (inside && !previousInside) start = boundary(previous, theta, true);
    if (!inside && previousInside && start !== null) {
      intervals.push([start, boundary(previous, theta, false)]);
      start = null;
    }
    previous = theta;
    previousInside = inside;
  }
  const upper = intervals.map(([a, b]) => {
    const steps = Math.max(2, Math.ceil(((b - a) * n) / Math.PI));
    const angles = Array.from({ length: steps + 1 }, (_, i) => a + ((b - a) * i) / steps);
    const at = (theta: number, r: number): Point => ({
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
    });
    return [
      ...angles.map((theta) => at(theta, horizonRadius(theta, latDeg, scale))),
      ...angles.reverse().map((theta) => at(theta, inner(theta))),
    ];
  });
  return [...upper, ...upper.map((points) => points.map(({ x, y }) => ({ x, y: -y })).reverse())];
}

/** Clip coordinates themselves, including outside-to-outside crossings. */
export function clipSegmentToCircle(a: Point, b: Point, radius: number): [Point, Point] | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const aa = dx * dx + dy * dy;
  if (aa === 0) return Math.hypot(a.x, a.y) <= radius ? [a, b] : null;
  const bb = 2 * (a.x * dx + a.y * dy);
  const cc = a.x * a.x + a.y * a.y - radius * radius;
  const discriminant = bb * bb - 4 * aa * cc;
  if (discriminant <= 0) return null;
  const root = Math.sqrt(discriminant);
  const low = Math.max(0, (-bb - root) / (2 * aa));
  const high = Math.min(1, (-bb + root) / (2 * aa));
  if (high <= low) return null;
  return [
    { x: a.x + low * dx, y: a.y + low * dy },
    { x: a.x + high * dx, y: a.y + high * dy },
  ];
}
