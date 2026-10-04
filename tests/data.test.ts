import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateCatalogue } from '../src/data/loadCatalogue.js';

const stars = JSON.parse(
  readFileSync(new URL('../public/data/stars.json', import.meta.url), 'utf8'),
);
const constellations = JSON.parse(
  readFileSync(new URL('../public/data/constellations.json', import.meta.url), 'utf8'),
);
describe('catalogue boundaries', () => {
  it('validates the actual shipped star data and every line endpoint', () =>
    expect(validateCatalogue(stars, constellations).stars).toHaveLength(2865));
  it.each(['ra', 'dec', 'pmRa', 'pmDec', 'mag'])('rejects non-finite %s', (field) => {
    const data = structuredClone(stars);
    data.stars[0][field] = Infinity;
    expect(() => validateCatalogue(data, constellations)).toThrow('Invalid star');
  });
  it('rejects duplicate IDs, wrong schema, oversized arrays and broken endpoints', () => {
    expect(() =>
      validateCatalogue({ stars: [stars.stars[0], stars.stars[0]] }, constellations),
    ).toThrow();
    expect(() => validateCatalogue({}, constellations)).toThrow();
    expect(() =>
      validateCatalogue({ stars: Array(10001).fill(stars.stars[0]) }, constellations),
    ).toThrow();
    expect(() =>
      validateCatalogue(stars, {
        constellations: [{ abbr: 'bad', name: 'bad', lines: [[stars.stars[0].id, -1]] }],
      }),
    ).toThrow('endpoints');
  });
});
