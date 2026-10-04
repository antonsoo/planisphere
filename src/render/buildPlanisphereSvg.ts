import type { CatalogueStar } from '../astro/starPosition.js';
import { WHEEL_RADIUS_MM } from '../geometry/cutouts.js';
import { discRotationDeg } from '../geometry/dial.js';
import { buildDiscArtwork, buildHolderArtwork, holderMaterialPath } from './artwork.js';
import type { ConstellationData, PlanisphereConfig } from './types.js';

export type { ConstellationData, PlanisphereConfig } from './types.js';

export function buildPlanisphereSvg(
  svg: SVGSVGElement,
  stars: CatalogueStar[],
  constellations: ConstellationData[],
  config: PlanisphereConfig,
): { discRotator: SVGGElement; bakedRotationDeg: number } {
  const bakedRotationDeg = discRotationDeg(config.date, config.localHour);
  svg.setAttribute('viewBox', '-100 -100 200 200');
  // Only numeric attributes and XML-escaped catalogue labels enter this markup.
  // The layer order matches an opaque-paper assembly.
  svg.innerHTML = `<title>Assembled planisphere at latitude ${config.latDeg.toFixed(1)} degrees</title>
    <g transform="scale(1,-1)" font-family="Georgia, serif">
      <g class="disc-rotator" transform="rotate(${bakedRotationDeg.toFixed(4)})">
        <circle class="disc-paper" r="${WHEEL_RADIUS_MM}"/>
        ${buildDiscArtwork(stars, constellations, config)}
      </g>
      <g class="holder">
        <path class="holder-face" d="${holderMaterialPath(config.latDeg)}" fill-rule="evenodd"/>
        ${buildHolderArtwork(config)}
        <circle class="pivot" r="0.8"/>
      </g>
      <line class="alignment-guide" x1="75.5" y1="0" x2="86.5" y2="0"/>
    </g>`;
  const discRotator = svg.querySelector<SVGGElement>('.disc-rotator');
  if (!discRotator) throw new Error('Missing star wheel');
  return { discRotator, bakedRotationDeg };
}
