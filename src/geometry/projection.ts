import { RAD_PER_DEG } from '../astro/constants.js';

export interface Point {
  x: number;
  y: number;
}

/** +1 for a northern-hemisphere disc (centred on the north celestial pole), -1 for southern. */
export type HemisphereSign = 1 | -1;

/**
 * Polar azimuthal-equidistant projection centred on the observer's
 * elevated celestial pole. `thetaDeg` is a generic angular coordinate
 * (radians measured counterclockwise from the +x axis once converted); the
 * star disc and the horizon window both use this function, but with
 * different meanings for theta -- see projectStar() and buildHorizonWindow().
 *
 * rho(dec) = 90 - hemisphereSign * dec is the angular distance from the
 * elevated pole, in degrees, which this projection maps linearly to radial
 * distance (the defining property of an equidistant azimuthal projection).
 */
export function projectPoint(
  decDeg: number,
  thetaDeg: number,
  hemisphereSign: HemisphereSign,
  scale: number,
): Point {
  const rho = 90 - hemisphereSign * decDeg;
  const theta = thetaDeg * RAD_PER_DEG;
  return {
    x: scale * rho * Math.cos(theta),
    y: scale * rho * Math.sin(theta),
  };
}

export function rhoForDeclination(decDeg: number, hemisphereSign: HemisphereSign): number {
  return 90 - hemisphereSign * decDeg;
}

/**
 * Projects a star onto the rotating disc. The disc plots RA *mirrored*
 * (theta = -RA), not RA directly. This is not a stylistic choice: turning
 * the physical disc by a single rigid rotation R can only add a constant to
 * every plotted angle, but the displayed angle a star needs in order to
 * line up with the (fixed-shape) horizon window is the hour angle
 * H = LST - RA, which *subtracts* RA. Only a mirrored disc (theta = R - RA)
 * can reproduce H for every star at once with one rotation (R = LST). See
 * docs/geometry.md and tests/geometry/window.test.ts, which checks this
 * against the horizon window built independently in horizonWindow.ts.
 */
export function projectStar(
  decDeg: number,
  raDeg: number,
  hemisphereSign: HemisphereSign,
  scale: number,
): Point {
  return projectPoint(decDeg, -raDeg, hemisphereSign, scale);
}
