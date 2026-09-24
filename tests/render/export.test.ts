import { describe, expect, it } from 'vitest';
import type { CatalogueStar } from '../../src/astro/starPosition.js';
import type { PlanisphereConfig } from '../../src/render/buildPlanisphereSvg.js';
import {
  buildDiscSvgMarkup,
  buildHolderSvgMarkup,
  DISC_RADIUS_MM,
  PAPER_MM,
  RING_EXTENT_MM,
} from '../../src/render/exportSvg.js';

describe('export physical dimensions', () => {
  it('the printed star disc (radius = DISC_RADIUS_MM) fits inside both paper sizes with margin', () => {
    for (const { w, h } of Object.values(PAPER_MM)) {
      expect(DISC_RADIUS_MM * 2).toBeLessThan(Math.min(w, h));
    }
  });

  it('the holder (radius = DISC_RADIUS_MM + RING_EXTENT_MM, incl. hour ring) fits inside both paper sizes', () => {
    const holderRadius = DISC_RADIUS_MM + RING_EXTENT_MM;
    for (const { w, h } of Object.values(PAPER_MM)) {
      const holderDiameter = holderRadius * 2;
      expect(holderDiameter).toBeLessThan(Math.min(w, h));
      const marginMm = (Math.min(w, h) - holderDiameter) / 2;
      expect(marginMm).toBeGreaterThan(5); // enough to cut without touching the page edge
    }
  });
});

// A handful of real bright stars (Sirius, Betelgeuse, Polaris) plus a
// two-star constellation chain, enough to exercise every branch of the
// markup builders without needing the full 2,865-star catalogue file.
const FIXTURE_STARS: CatalogueStar[] = [
  {
    id: 1,
    hip: 32349,
    name: 'Sirius',
    bayer: 'Alp',
    flam: 9,
    con: 'CMa',
    ra: 101.287,
    dec: -16.716,
    pmRa: -546.01,
    pmDec: -1223.08,
    mag: -1.44,
    bv: 0.009,
  },
  {
    id: 2,
    hip: 27989,
    name: 'Betelgeuse',
    bayer: 'Alp',
    flam: 58,
    con: 'Ori',
    ra: 88.793,
    dec: 7.407,
    pmRa: 27.54,
    pmDec: 11.3,
    mag: 0.45,
    bv: 1.85,
  },
  {
    id: 3,
    hip: 11767,
    name: 'Polaris',
    bayer: 'Alp',
    flam: 1,
    con: 'UMi',
    ra: 37.955,
    dec: 89.264,
    pmRa: 44.48,
    pmDec: -11.85,
    mag: 1.97,
    bv: 0.636,
  },
];

const FIXTURE_CONSTELLATIONS = [{ abbr: 'CMa', name: 'Canis Major', lines: [[1, 2]] }];

const BASE_CONFIG: PlanisphereConfig = {
  latDeg: 32.5,
  epochYear: -700,
  magLimit: 5.5,
  showConstellations: true,
  showNames: true,
  date: new Date('2026-06-01T00:00:00Z'),
  localHour: 22,
  discRadius: 220,
};

describe('buildDiscSvgMarkup', () => {
  const markup = buildDiscSvgMarkup(FIXTURE_STARS, FIXTURE_CONSTELLATIONS, BASE_CONFIG, 'a4');

  it('is well-formed enough to parse as XML (balanced svg tag, valid header)', () => {
    expect(markup.startsWith('<?xml')).toBe(true);
    expect(markup.match(/<svg/g)?.length).toBe(1);
    expect(markup.trim().endsWith('</svg>')).toBe(true);
  });

  it('is sized in real millimetres matching the A4 page', () => {
    expect(markup).toContain('width="210mm"');
    expect(markup).toContain('height="297mm"');
    expect(markup).toContain('viewBox="0 0 210 297"');
  });

  it('draws the cut circle in red and star/date-ring marks in black', () => {
    expect(markup).toMatch(new RegExp(`r="${DISC_RADIUS_MM}"[^>]*stroke="red"`));
    expect(markup).toContain('fill="black"'); // at least one engraved star
  });

  it('includes a plotted circle for every star within the magnitude limit and declination range', () => {
    // All three fixture stars are bright enough and far enough from the
    // opposite pole to be plotted at latitude 32.5.
    const starCircles =
      markup.match(/<circle cx="[^"]+" cy="[^"]+" r="[^"]+" fill="black"\/>/g) ?? [];
    expect(starCircles.length).toBe(FIXTURE_STARS.length);
  });

  it('omits stars below the magnitude limit', () => {
    const dim = buildDiscSvgMarkup(
      FIXTURE_STARS,
      FIXTURE_CONSTELLATIONS,
      { ...BASE_CONFIG, magLimit: 0 },
      'a4',
    );
    const starCircles = dim.match(/<circle cx="[^"]+" cy="[^"]+" r="[^"]+" fill="black"\/>/g) ?? [];
    // Only Sirius (mag -1.44) is brighter than magLimit=0.
    expect(starCircles.length).toBe(1);
  });

  it('draws the Canis Major constellation line when enabled, omits it when disabled', () => {
    expect(markup).toContain('<path d="M');
    const withoutLines = buildDiscSvgMarkup(
      FIXTURE_STARS,
      FIXTURE_CONSTELLATIONS,
      { ...BASE_CONFIG, showConstellations: false },
      'a4',
    );
    expect(withoutLines).not.toContain('<path d="M');
  });
});

describe('buildHolderSvgMarkup', () => {
  it('is sized for US Letter and draws the horizon window as a closed red path', () => {
    const markup = buildHolderSvgMarkup(BASE_CONFIG, 'letter');
    expect(markup).toContain('width="215.9mm"');
    expect(markup).toContain('height="279.4mm"');
    const windowPath = markup.match(/<path d="M[^"]+Z" fill="none" stroke="red"/);
    expect(windowPath).not.toBeNull();
  });

  it('places the outer cut circle at DISC_RADIUS_MM + RING_EXTENT_MM', () => {
    const markup = buildHolderSvgMarkup(BASE_CONFIG, 'a4');
    expect(markup).toContain(`r="${DISC_RADIUS_MM + RING_EXTENT_MM}"`);
  });
});
