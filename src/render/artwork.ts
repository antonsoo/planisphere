import { type CatalogueStar, positionAtEpoch } from '../astro/starPosition.js';
import { cardinalMarkers } from '../geometry/cardinals.js';
import {
  buildHolderCutouts,
  clipSegmentToCircle,
  HOLDER_RADIUS_MM,
  PIVOT_RADIUS_MM,
  SKY_RADIUS_MM,
  WHEEL_RADIUS_MM,
} from '../geometry/cutouts.js';
import { dateRingAngleDeg, hourRingAngleDeg } from '../geometry/dial.js';
import { printedStarRadius } from '../geometry/printedStar.js';
import { projectStar } from '../geometry/projection.js';
import { pathFromPoints } from './svgUtil.js';
import type { ConstellationData, PlanisphereConfig } from './types.js';

export const DATE_INNER_MM = 82;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const f = (n: number) => n.toFixed(3);

export function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] ?? c,
  );
}

function tick(thetaDeg: number, inner: number, outer: number, attrs: string): string {
  const t = (thetaDeg * Math.PI) / 180;
  return `<line x1="${f(inner * Math.cos(t))}" y1="${f(inner * Math.sin(t))}" x2="${f(outer * Math.cos(t))}" y2="${f(outer * Math.sin(t))}" ${attrs}/>`;
}

function label(
  text: string,
  thetaDeg: number,
  radius: number,
  fontSize: number,
  attrs: string,
): string {
  const t = (thetaDeg * Math.PI) / 180;
  return `<text transform="translate(${f(radius * Math.cos(t))},${f(radius * Math.sin(t))}) scale(1,-1)" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" fill="black" ${attrs}>${escapeXml(text)}</text>`;
}

export function gregorianDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  return date;
}

export function buildDateScale(year: number): string {
  const parts = ['<g class="date-ring">'];
  for (let month = 0; month < 12; month++) {
    const days = gregorianDate(year, month + 1, 0).getUTCDate();
    for (let day = 1; day <= days; day++) {
      const date = gregorianDate(year, month, day);
      const major = day === 1 || day % 5 === 0;
      const angle = dateRingAngleDeg(date);
      parts.push(
        tick(
          angle,
          DATE_INNER_MM,
          day === 1 ? 86.5 : major ? 85.5 : 84,
          `class="date-tick" data-date="${date.toISOString().slice(0, 10)}" stroke="black" stroke-width="0.12"`,
        ),
      );
      // A last-day 30 label collides with the next month's 1, especially on
      // the vertical sides. Keep its long tick, with numbers through day 25.
      if (major && day < 30) parts.push(label(String(day), angle, 88.5, 2, 'class="day-label"'));
    }
    parts.push(
      label(
        MONTHS[month] ?? '',
        dateRingAngleDeg(gregorianDate(year, month, 16)),
        93,
        2.2,
        'class="month-label"',
      ),
    );
  }
  parts.push('</g>');
  return parts.join('\n');
}

/** Shared physical artwork for the preview and both page exports. */
export function buildDiscArtwork(
  stars: CatalogueStar[],
  constellations: ConstellationData[],
  config: PlanisphereConfig,
): string {
  const sign = config.latDeg >= 0 ? 1 : -1;
  const scale = SKY_RADIUS_MM / (180 - Math.abs(config.latDeg));
  const positions = new Map(
    stars.map((star) => {
      const position = positionAtEpoch(star, config.epochYear);
      return [star.id, projectStar(position.dec, position.ra, sign, scale)] as const;
    }),
  );
  const parts = [buildDateScale(config.date.getUTCFullYear())];
  if (config.showConstellations) {
    for (const constellation of constellations) {
      for (const chain of constellation.lines) {
        // Missing IDs break a chain, rather than connecting separate stars.
        for (let i = 1; i < chain.length; i++) {
          const a = positions.get(chain[i - 1] ?? -1);
          const b = positions.get(chain[i] ?? -1);
          if (!a || !b) continue;
          const segment = clipSegmentToCircle(a, b, SKY_RADIUS_MM - 0.08);
          if (segment)
            parts.push(
              `<path class="constellation-line" d="${pathFromPoints(segment, false)}" fill="none" stroke="black" stroke-width="0.1"/>`,
            );
        }
      }
    }
  }
  for (const star of stars) {
    if (star.mag > config.magLimit) continue;
    const point = positions.get(star.id);
    if (!point) continue;
    const { x, y } = point;
    const r = printedStarRadius(star.mag, point);
    if (r === null) continue;
    parts.push(
      `<circle class="star" data-star="${star.id}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="black"/>`,
    );
    if (config.showNames && star.name && star.mag < 2) {
      const lx = x + r + 0.8;
      // Conservative Georgia 2mm text rectangle, including ascenders and
      // descenders. Omit labels that would engrave beyond the sky field.
      const width = star.name.length * 2.2;
      const maxX = Math.max(Math.abs(lx), Math.abs(lx + width));
      const maxY = Math.abs(y) + 2.5;
      if (Math.hypot(maxX, maxY) < SKY_RADIUS_MM - 0.1) {
        parts.push(
          `<text class="star-label" transform="translate(${f(lx)},${f(y)}) scale(1,-1)" font-size="2" fill="black">${escapeXml(star.name)}</text>`,
        );
      }
    }
  }
  parts.push(
    `<circle class="wheel-edge" r="${WHEEL_RADIUS_MM}" fill="none" stroke="red" stroke-width="0.2"/>`,
  );
  parts.push(
    `<circle class="pivot-cut" r="${PIVOT_RADIUS_MM}" fill="none" stroke="red" stroke-width="0.2"/>`,
  );
  parts.push(
    '<text class="catalogue-credit" transform="translate(0,-67) scale(1,-1)" text-anchor="middle" font-size="2" fill="black">Stars: HYG v4.1 · CC BY-SA 4.0</text>',
  );
  return parts.join('\n');
}

export function holderMaterialPath(latDeg: number): string {
  const r = HOLDER_RADIUS_MM;
  const circle = `M ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 Z`;
  return `${circle} ${buildHolderCutouts(latDeg)
    .map((points) => pathFromPoints(points))
    .join(' ')}`;
}

export function buildHolderArtwork(config: PlanisphereConfig): string {
  const parts = [
    `<circle class="holder-edge" r="${HOLDER_RADIUS_MM}" fill="none" stroke="red" stroke-width="0.2"/>`,
    `<circle class="pivot-cut" r="${PIVOT_RADIUS_MM}" fill="none" stroke="red" stroke-width="0.2"/>`,
    ...buildHolderCutouts(config.latDeg).map(
      (points) =>
        `<path class="window-cut" d="${pathFromPoints(points)}" fill="none" stroke="red" stroke-width="0.2"/>`,
    ),
  ];
  for (let quarter = 0; quarter < 96; quarter++) {
    const hour = quarter / 4;
    parts.push(
      tick(
        hourRingAngleDeg(hour),
        quarter % 4 === 0 ? 75.5 : quarter % 2 === 0 ? 77.2 : 78.4,
        79.5,
        'class="hour-tick" stroke="black" stroke-width="0.12"',
      ),
    );
    if (quarter % 4 === 0)
      parts.push(
        label(String(hour).padStart(2, '0'), hourRingAngleDeg(hour), 72.5, 3, 'class="hour-label"'),
      );
  }
  parts.push(
    '<text class="instrument-label" transform="translate(-65.5,0) rotate(90) scale(1,-1)" text-anchor="middle" dominant-baseline="middle" font-size="1.7" fill="black">LOCAL MEAN TIME</text>',
  );
  for (const marker of cardinalMarkers(config.latDeg))
    parts.push(
      `<text class="cardinal-label" transform="translate(${f(marker.x)},${f(marker.y)}) scale(1,-1)" text-anchor="middle" dominant-baseline="middle" font-size="2.2" font-weight="bold" fill="black">${marker.label}</text>`,
    );
  return parts.join('\n');
}
