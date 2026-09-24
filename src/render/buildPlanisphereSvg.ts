import { type CatalogueStar, positionAtEpoch } from '../astro/starPosition.js';
import { dateRingAngleDeg, discRotationDeg, hourRingAngleDeg } from '../geometry/dial.js';
import { buildHorizonWindowPolygon } from '../geometry/horizonWindow.js';
import type { HemisphereSign } from '../geometry/projection.js';
import { projectStar, rhoForDeclination } from '../geometry/projection.js';
import { pathFromPoints, svgEl } from './svgUtil.js';

export interface ConstellationData {
  abbr: string;
  name: string;
  lines: number[][];
}

export interface PlanisphereConfig {
  latDeg: number;
  epochYear: number;
  magLimit: number;
  showConstellations: boolean;
  showNames: boolean;
  date: Date;
  localHour: number;
  /** Radius, in SVG user units, of the disc edge (dec = -(90-|lat|), the limiting declination). */
  discRadius: number;
}

export interface BuiltPlanisphere {
  /** The group that should receive live drag rotation on top of the baked date/hour rotation. */
  discRotator: SVGGElement;
  bakedRotationDeg: number;
}

const MONTH_STARTS = [
  'Jan 1',
  'Feb 1',
  'Mar 1',
  'Apr 1',
  'May 1',
  'Jun 1',
  'Jul 1',
  'Aug 1',
  'Sep 1',
  'Oct 1',
  'Nov 1',
  'Dec 1',
];

function starRadius(mag: number): number {
  // Brighter (numerically smaller/negative) magnitude -> bigger disc. Clamp so
  // mag 5.5 stars are still a visible dot and Sirius doesn't dominate the page.
  const clamped = Math.max(-1.5, Math.min(5.5, mag));
  return 0.55 + (5.5 - clamped) * 0.34;
}

export function buildPlanisphereSvg(
  svg: SVGSVGElement,
  stars: CatalogueStar[],
  constellations: ConstellationData[],
  config: PlanisphereConfig,
): BuiltPlanisphere {
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const hemisphereSign: HemisphereSign = config.latDeg >= 0 ? 1 : -1;
  // rho at the disc edge = 90 - hemisphereSign*decLimit = 180 - |lat| (see
  // src/geometry/projection.ts docstring / README "How it works").
  const rhoEdge = 180 - Math.abs(config.latDeg);
  const scale = config.discRadius / rhoEdge;

  // One global flip from this project's math convention (y up, angles
  // counterclockwise) to SVG's (y down): everything else is written in the
  // math convention and just works inside this wrapper.
  const root = svgEl('g', { transform: 'scale(1,-1)' });
  svg.appendChild(root);

  // ---- Fixed holder: horizon window, hour ring, bezel ----
  const holder = svgEl('g', { class: 'holder' });
  root.appendChild(holder);

  holder.appendChild(
    svgEl('circle', { class: 'bezel', cx: 0, cy: 0, r: config.discRadius + 14, fill: 'none' }),
  );

  const windowPolygon = buildHorizonWindowPolygon(config.latDeg, hemisphereSign, scale, 720);
  holder.appendChild(
    svgEl('path', {
      class: 'horizon-window',
      d: pathFromPoints(windowPolygon),
      fill: 'none',
    }),
  );
  const maskId = 'horizonMask';
  const mask = svgEl('mask', { id: maskId });
  mask.appendChild(
    svgEl('rect', { x: -9999, y: -9999, width: 19998, height: 19998, fill: 'black' }),
  );
  mask.appendChild(svgEl('path', { d: pathFromPoints(windowPolygon), fill: 'white' }));
  root.appendChild(mask);

  const hourRing = svgEl('g', { class: 'hour-ring' });
  holder.appendChild(hourRing);
  for (let h = 0; h < 24; h++) {
    const theta = (hourRingAngleDeg(h) * Math.PI) / 180;
    const rOuter = config.discRadius + 12;
    const rInner = config.discRadius + (h % 6 === 0 ? 2 : 6);
    const x1 = rInner * Math.cos(theta);
    const y1 = rInner * Math.sin(theta);
    const x2 = rOuter * Math.cos(theta);
    const y2 = rOuter * Math.sin(theta);
    hourRing.appendChild(svgEl('line', { x1, y1, x2, y2, class: 'tick' }));
    if (h % 3 === 0) {
      const rLabel = config.discRadius + 19;
      const lx = rLabel * Math.cos(theta);
      const ly = rLabel * Math.sin(theta);
      // Text is positioned via `transform`, not x/y, so the scale(1,-1) that
      // un-mirrors it (vs. the geometry's global y-flip) doesn't also flip
      // its position back to the origin.
      const label = svgEl('text', {
        class: 'hour-label',
        'text-anchor': 'middle',
        transform: `translate(${lx},${ly}) scale(1,-1)`,
      });
      label.textContent = String(h).padStart(2, '0');
      hourRing.appendChild(label);
    }
  }

  // ---- Rotating star disc ----
  const maskedGroup = svgEl('g', { mask: `url(#${maskId})` });
  root.appendChild(maskedGroup);
  const bakedRotationDeg = discRotationDeg(config.date, config.localHour);
  const discRotator = svgEl('g', {
    class: 'disc-rotator',
    transform: `rotate(${bakedRotationDeg.toFixed(4)})`,
  });
  maskedGroup.appendChild(discRotator);

  const dateRing = svgEl('g', { class: 'date-ring' });
  discRotator.appendChild(dateRing);
  for (let m = 0; m < 12; m++) {
    const d = new Date(Date.UTC(2026, m, 1));
    const theta = (dateRingAngleDeg(d) * Math.PI) / 180;
    const rOuter = config.discRadius;
    const rInner = config.discRadius - 6;
    const x1 = rInner * Math.cos(theta);
    const y1 = rInner * Math.sin(theta);
    const x2 = rOuter * Math.cos(theta);
    const y2 = rOuter * Math.sin(theta);
    dateRing.appendChild(svgEl('line', { x1, y1, x2, y2, class: 'tick' }));
    const rLabel = config.discRadius - 12;
    const lx = rLabel * Math.cos(theta);
    const ly = rLabel * Math.sin(theta);
    const label = svgEl('text', { class: 'date-label', 'text-anchor': 'middle' });
    label.textContent = MONTH_STARTS[m] ?? '';
    label.setAttribute(
      'transform',
      `translate(${lx},${ly}) rotate(${-dateRingAngleDeg(d) + 90}) scale(1,-1)`,
    );
    dateRing.appendChild(label);
  }

  if (config.showConstellations) {
    const cGroup = svgEl('g', { class: 'constellations' });
    discRotator.appendChild(cGroup);
    const byId = new Map(stars.map((s) => [s.id, s]));
    for (const c of constellations) {
      for (const chain of c.lines) {
        const pts = chain
          .map((id) => byId.get(id))
          .filter((s): s is CatalogueStar => Boolean(s))
          .map((s) => {
            const pos = positionAtEpoch(s, config.epochYear);
            return projectStar(pos.dec, pos.ra, hemisphereSign, scale);
          });
        if (pts.length >= 2) {
          cGroup.appendChild(
            svgEl('path', {
              class: 'constellation-line',
              d: pathFromPoints(pts, false),
              fill: 'none',
            }),
          );
        }
      }
    }
  }

  const starGroup = svgEl('g', { class: 'stars' });
  discRotator.appendChild(starGroup);
  for (const s of stars) {
    if (s.mag > config.magLimit) continue;
    const pos = positionAtEpoch(s, config.epochYear);
    const rho = rhoForDeclination(pos.dec, hemisphereSign);
    if (rho > rhoEdge) continue; // never rises at this latitude, any epoch
    const { x, y } = projectStar(pos.dec, pos.ra, hemisphereSign, scale);
    const r = starRadius(s.mag);
    starGroup.appendChild(svgEl('circle', { cx: x, cy: y, r, class: 'star' }));
    if (config.showNames && s.name && s.mag < 2.0) {
      const label = svgEl('text', { class: 'star-label' });
      label.textContent = s.name;
      label.setAttribute('transform', `translate(${x + r + 2},${y}) scale(1,-1)`);
      starGroup.appendChild(label);
    }
  }

  return { discRotator, bakedRotationDeg };
}
