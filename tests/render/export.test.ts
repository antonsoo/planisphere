import { describe, expect, it } from 'vitest';

// Mirrors the constants in src/render/exportSvg.ts (kept independent rather
// than imported, since that module touches `document`/Blob/URL, which this
// test intentionally does not need -- it only checks the physical-size
// arithmetic that governs whether the exported pieces fit on paper).
const DISC_RADIUS_MM = 60;
const RING_EXTENT_MM = 34;
const PAPER_MM = {
  a4: { w: 210, h: 297 },
  letter: { w: 215.9, h: 279.4 },
};

describe('export physical dimensions', () => {
  it('the printed star disc (radius = DISC_RADIUS_MM) fits inside both paper sizes with margin', () => {
    for (const { w, h } of Object.values(PAPER_MM)) {
      const discDiameter = DISC_RADIUS_MM * 2;
      expect(discDiameter).toBeLessThan(Math.min(w, h));
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

  it('DISC_RADIUS_MM matches src/render/exportSvg.ts (regression guard against silent drift)', async () => {
    const src = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../src/render/exportSvg.ts', import.meta.url), 'utf8'),
    );
    expect(src).toMatch(/DISC_RADIUS_MM = 60/);
    expect(src).toMatch(/RING_EXTENT_MM = 34/);
  });
});
