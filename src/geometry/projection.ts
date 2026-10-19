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
 * Projects a star onto the rotating disc as viewed from inside the sky.
 * The north-pole chart plots theta = -RA; the south-pole chart plots +RA.
 * Both the pole and the angular direction change between hemispheres:
 * theta = -hemisphereSign * RA. Keeping -RA at the south pole reflects
 * constellation shapes even though the horizon still exposes the right stars.
 * Turning the physical disc by a rigid rotation R can only add a constant to
 * every plotted angle, but the displayed angle a star needs in order to
 * line up with the (fixed-shape) horizon window is hemisphereSign * H,
 * where H = LST - RA. Rotation R = hemisphereSign * LST then works for
 * every star at once. See docs/geometry.md and tests/geometry/window.test.ts,
 * which checks this
 * against the horizon window built independently in horizonWindow.ts.
 */
export function projectStar(
  decDeg: number,
  raDeg: number,
  hemisphereSign: HemisphereSign,
  scale: number,
): Point {
  return projectPoint(decDeg, -hemisphereSign * raDeg, hemisphereSign, scale);
}
