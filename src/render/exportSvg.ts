import type { CatalogueStar } from '../astro/starPosition.js';
import { HOLDER_RADIUS_MM, SKY_RADIUS_MM, WHEEL_RADIUS_MM } from '../geometry/cutouts.js';
import { buildDiscArtwork, buildHolderArtwork } from './artwork.js';
import type { ConstellationData, PlanisphereConfig } from './types.js';

export const PAPER_MM = { a4: { w: 210, h: 297 }, letter: { w: 215.9, h: 279.4 } };
export const DISC_RADIUS_MM = WHEEL_RADIUS_MM;
export { HOLDER_RADIUS_MM, SKY_RADIUS_MM };

function download(filename: string, markup: string) {
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function page(paper: 'a4' | 'letter', artwork: string, caption: string): string {
  const { w, h } = PAPER_MM[paper];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
  <title>${caption}</title>
  <desc>Print at 100 percent scale. Red strokes are cut outlines; black marks are engraved or printed. Check the 50 millimetre scale bar.</desc>
  <metadata>Star data: HYG v4.1, David Nash / AstroNexus, https://github.com/astronexus/HYG-Database, CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Coordinates transformed with proper motion and precession. Instrument design and code: Anton Soloviev, MIT, https://github.com/antonsoo/planisphere.</metadata>
  <g font-family="Georgia, serif">
    <g class="piece" transform="translate(${w / 2},${h / 2}) scale(1,-1)">${artwork}</g>
    <g class="page-notes" fill="black" font-size="3" text-anchor="middle">
      <text x="${w / 2}" y="${h - 23}">${caption}</text>
      <text x="${w / 2}" y="${h - 17}">Print at 100%. Red = cut; black = engrave.</text>
      <path d="M ${w / 2 - 25} ${h - 11} h 50 m -50 -2 v 4 m 50 -4 v 4" fill="none" stroke="black" stroke-width="0.2"/>
      <text x="${w / 2}" y="${h - 4}">Check this line measures 50 mm</text>
    </g>
  </g>
</svg>`;
}

export function buildDiscSvgMarkup(
  stars: CatalogueStar[],
  constellations: ConstellationData[],
  config: PlanisphereConfig,
  paper: 'a4' | 'letter',
): string {
  const epoch = config.epochYear <= 0 ? `${1 - config.epochYear} BCE` : `${config.epochYear} CE`;
  return page(
    paper,
    buildDiscArtwork(stars, constellations, config),
    `Star wheel · ${Math.abs(config.latDeg).toFixed(1)}°${config.latDeg < 0 ? 'S' : 'N'} · epoch ${epoch} · date scale ${config.date.getUTCFullYear()}`,
  );
}

export function buildHolderSvgMarkup(config: PlanisphereConfig, paper: 'a4' | 'letter'): string {
  return page(
    paper,
    buildHolderArtwork(config),
    `Holder · ${Math.abs(config.latDeg).toFixed(1)}°${config.latDeg < 0 ? 'S' : 'N'} · retain both supports and the centre hub`,
  );
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

export function exportHolderSvg(config: PlanisphereConfig, paper: 'a4' | 'letter') {
  download(`planisphere-holder-${paper}.svg`, buildHolderSvgMarkup(config, paper));
}
