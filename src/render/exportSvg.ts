import type { CatalogueStar } from '../astro/starPosition.js';
import { positionAtEpoch } from '../astro/starPosition.js';
import { dateRingAngleDeg, hourRingAngleDeg } from '../geometry/dial.js';
import { buildHorizonWindowPolygon } from '../geometry/horizonWindow.js';
import type { HemisphereSign } from '../geometry/projection.js';
import { projectStar, rhoForDeclination } from '../geometry/projection.js';
import type { ConstellationData, PlanisphereConfig } from './buildPlanisphereSvg.js';
import { pathFromPoints } from './svgUtil.js';

/** Physical page sizes in millimetres. */
export const PAPER_MM: Record<'a4' | 'letter', { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  letter: { w: 215.9, h: 279.4 },
};

/**
 * Radius, in millimetres, of the printed star disc's outer edge (the
 * declination limit). Chosen so the disc plus its hour-ring extension
 * (see buildPlanisphereSvg's +34mm of ticks/labels) fits inside the
 * narrower of A4/US Letter with a margin: 60 + 34 = 94mm radius, 188mm
 * diameter, vs. a 210mm-wide A4 page -- 11mm of margin on each side.
 * Verified numerically in tests/render/export.test.ts.
 */
export const DISC_RADIUS_MM = 60;
export const RING_EXTENT_MM = 34;

const CUT = 'red';
const ENGRAVE = 'black';

function download(filename: string, svgMarkup: string) {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function page(paper: 'a4' | 'letter', body: string): string {
  const { w, h } = PAPER_MM[paper];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
<g font-family="Georgia, serif">
${body}
</g>
</svg>`;
}

/** Pure markup builder (no DOM/Blob side effects), so it's directly testable. */
export function buildDiscSvgMarkup(
  stars: CatalogueStar[],
  constellations: ConstellationData[],
  config: PlanisphereConfig,
  paper: 'a4' | 'letter',
): string {
  const { w, h } = PAPER_MM[paper];
  const cx = w / 2;
  const cy = h / 2;
  const hemisphereSign: HemisphereSign = config.latDeg >= 0 ? 1 : -1;
  const rhoEdge = 180 - Math.abs(config.latDeg);
  const scale = DISC_RADIUS_MM / rhoEdge;

  const parts: string[] = [];
  parts.push(`<g transform="translate(${cx},${cy}) scale(1,-1)">`);
  parts.push(`<circle r="${DISC_RADIUS_MM}" fill="none" stroke="${CUT}" stroke-width="0.2"/>`);
  parts.push(`<circle r="0.8" fill="none" stroke="${CUT}" stroke-width="0.2"/>`); // pivot hole

  // Date ring (engraved)
  for (let m = 0; m < 12; m++) {
    const d = new Date(Date.UTC(2026, m, 1));
    const theta = (dateRingAngleDeg(d) * Math.PI) / 180;
    const rOuter = DISC_RADIUS_MM;
    const rInner = DISC_RADIUS_MM - 3;
    parts.push(
      `<line x1="${(rInner * Math.cos(theta)).toFixed(2)}" y1="${(rInner * Math.sin(theta)).toFixed(2)}" x2="${(rOuter * Math.cos(theta)).toFixed(2)}" y2="${(rOuter * Math.sin(theta)).toFixed(2)}" stroke="${ENGRAVE}" stroke-width="0.15"/>`,
    );
  }

  if (config.showConstellations) {
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
          parts.push(
            `<path d="${pathFromPoints(pts, false)}" fill="none" stroke="${ENGRAVE}" stroke-width="0.1" opacity="0.8"/>`,
          );
        }
      }
    }
  }

  for (const s of stars) {
    if (s.mag > config.magLimit) continue;
    const pos = positionAtEpoch(s, config.epochYear);
    const rho = rhoForDeclination(pos.dec, hemisphereSign);
    if (rho > rhoEdge) continue;
    const { x, y } = projectStar(pos.dec, pos.ra, hemisphereSign, scale);
    const r = Math.max(0.15, 0.14 + (5.5 - Math.max(-1.5, Math.min(5.5, s.mag))) * 0.09);
    parts.push(
      `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="${ENGRAVE}"/>`,
    );
  }
  parts.push('</g>');

  const label = `<text x="${cx}" y="${h - 6}" text-anchor="middle" font-size="3" fill="${ENGRAVE}">Planisphere star disc — lat ${config.latDeg.toFixed(1)}°, epoch ${config.epochYear <= 0 ? `${1 - config.epochYear} BCE` : `${config.epochYear} CE`}. Red = cut, black = engrave.</text>`;

  return page(paper, parts.join('\n') + label);
}

export function exportDiscSvg(
  stars: CatalogueStar[],
  constellations: ConstellationData[],
  config: PlanisphereConfig,
  paper: 'a4' | 'letter',
) {
  download(
    `planisphere-disc-${paper}.svg`,
    buildDiscSvgMarkup(stars, constellations, config, paper),
  );
}

/** Pure markup builder (no DOM/Blob side effects), so it's directly testable. */
export function buildHolderSvgMarkup(config: PlanisphereConfig, paper: 'a4' | 'letter'): string {
  const { w, h } = PAPER_MM[paper];
  const cx = w / 2;
  const cy = h / 2;
  const hemisphereSign: HemisphereSign = config.latDeg >= 0 ? 1 : -1;
  const rhoEdge = 180 - Math.abs(config.latDeg);
  const scale = DISC_RADIUS_MM / rhoEdge;

  const windowPolygon = buildHorizonWindowPolygon(config.latDeg, hemisphereSign, scale, 720);

  const parts: string[] = [];
  parts.push(`<g transform="translate(${cx},${cy}) scale(1,-1)">`);
  // Outer holder boundary: a circle just beyond the hour ring.
  const outerR = DISC_RADIUS_MM + RING_EXTENT_MM;
  parts.push(`<circle r="${outerR}" fill="none" stroke="${CUT}" stroke-width="0.2"/>`);
  parts.push(`<circle r="0.8" fill="none" stroke="${CUT}" stroke-width="0.2"/>`); // pivot hole
  // Horizon window: cut this shape out of the holder.
  parts.push(
    `<path d="${pathFromPoints(windowPolygon)}" fill="none" stroke="${CUT}" stroke-width="0.2"/>`,
  );

  // Hour ring (engraved, fixed frame).
  for (let hh = 0; hh < 24; hh++) {
    const theta = (hourRingAngleDeg(hh) * Math.PI) / 180;
    const rInner = DISC_RADIUS_MM + (hh % 6 === 0 ? 2 : 6);
    const rOuter = DISC_RADIUS_MM + RING_EXTENT_MM - 4;
    parts.push(
      `<line x1="${(rInner * Math.cos(theta)).toFixed(2)}" y1="${(rInner * Math.sin(theta)).toFixed(2)}" x2="${(rOuter * Math.cos(theta)).toFixed(2)}" y2="${(rOuter * Math.sin(theta)).toFixed(2)}" stroke="${ENGRAVE}" stroke-width="0.15"/>`,
    );
    if (hh % 3 === 0) {
      const rLabel = DISC_RADIUS_MM + RING_EXTENT_MM - 8;
      const lx = rLabel * Math.cos(theta);
      const ly = rLabel * Math.sin(theta);
      parts.push(
        `<text transform="translate(${lx.toFixed(2)},${ly.toFixed(2)}) scale(1,-1)" text-anchor="middle" font-size="3" fill="${ENGRAVE}">${String(hh).padStart(2, '0')}</text>`,
      );
    }
  }
  parts.push('</g>');

  const label = `<text x="${cx}" y="${h - 6}" text-anchor="middle" font-size="3" fill="${ENGRAVE}">Planisphere holder — lat ${config.latDeg.toFixed(1)}°. Cut the outer circle and the horizon window; pin through the centre hole. Red = cut, black = engrave.</text>`;

  return page(paper, parts.join('\n') + label);
}

export function exportHolderSvg(config: PlanisphereConfig, paper: 'a4' | 'letter') {
  download(`planisphere-holder-${paper}.svg`, buildHolderSvgMarkup(config, paper));
}
