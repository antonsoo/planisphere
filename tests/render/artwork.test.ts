import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HOLDER_RADIUS_MM, SKY_RADIUS_MM } from '../../src/geometry/cutouts.js';
import { buildDateScale, buildDiscArtwork, DATE_INNER_MM } from '../../src/render/artwork.js';
import type { PlanisphereConfig } from '../../src/render/types.js';

const { stars } = JSON.parse(
  readFileSync(new URL('../../public/data/stars.json', import.meta.url), 'utf8'),
);
const { constellations } = JSON.parse(
  readFileSync(new URL('../../public/data/constellations.json', import.meta.url), 'utf8'),
);
const config: PlanisphereConfig = {
  latDeg: 32.5,
  epochYear: 2026,
  magLimit: 5.5,
  showNames: true,
  showConstellations: true,
  date: new Date('2026-06-01'),
  localHour: 22,
};

describe('date scale remains physically exposed', () => {
  it('places all 365 labelled day ticks beyond the holder, with twelve month names', () => {
    const markup = buildDateScale(2026);
    expect(DATE_INNER_MM).toBeGreaterThan(HOLDER_RADIUS_MM + 1);
    expect([...markup.matchAll(/data-date="/g)]).toHaveLength(365);
    expect([...markup.matchAll(/class="month-label"/g)]).toHaveLength(12);
    expect([...markup.matchAll(/class="day-label"/g)].length).toBeGreaterThan(70);
  });
  it('calibrates leap years and years below 100 without Date.UTC aliases', () => {
    expect([...buildDateScale(2024).matchAll(/data-date="/g)]).toHaveLength(366);
    expect(buildDateScale(2024)).toContain('2024-02-29');
    expect(buildDateScale(99)).toContain('0099-01-01');
    expect(buildDateScale(1900)).not.toContain('1900-02-29');
  });
});
describe('bounded engraved artwork', () => {
  for (const latDeg of [0, 32.5, -33.9, 80, -80, 89, -89])
    for (const epochYear of [-3000, 2000, 3000]) {
      it(`keeps line strokes and star discs inside the sky field at latitude ${latDeg}, epoch ${epochYear}`, () => {
        const markup = buildDiscArtwork(stars, constellations, { ...config, latDeg, epochYear });
        for (const match of markup.matchAll(
          /class="constellation-line" d="M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)"/g,
        )) {
          expect(Math.hypot(Number(match[1]), Number(match[2])) + 0.05).toBeLessThan(SKY_RADIUS_MM);
          expect(Math.hypot(Number(match[3]), Number(match[4])) + 0.05).toBeLessThan(SKY_RADIUS_MM);
        }
        for (const match of markup.matchAll(
          /class="star"[^>]+cx="([\d.-]+)" cy="([\d.-]+)" r="([\d.-]+)"/g,
        ))
          expect(Math.hypot(Number(match[1]), Number(match[2])) + Number(match[3])).toBeLessThan(
            SKY_RADIUS_MM,
          );
      });
    }
  it('includes escaped names only when enabled and does not bridge missing endpoints', () => {
    const star = { ...stars[0], id: 1, ra: 0, dec: 80, mag: 1, name: '<&"\'>' };
    const a = buildDiscArtwork([star], [{ abbr: 'test', name: 'test', lines: [[1, 999, 1]] }], {
      ...config,
      epochYear: 2000,
    });
    expect(a).toContain('&lt;&amp;&quot;&apos;&gt;');
    expect(a).not.toContain('class="constellation-line"');
    expect(buildDiscArtwork([star], [], { ...config, showNames: false })).not.toContain(
      'class="star-label"',
    );
  });
});
