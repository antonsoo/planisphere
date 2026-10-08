import type { CatalogueStar } from '../astro/starPosition.js';
import type { ConstellationData } from '../render/types.js';

export interface Catalogue {
  stars: CatalogueStar[];
  constellations: ConstellationData[];
  provenance: Record<string, string | number | null>;
}
const MAX_BYTES = 2_000_000;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const shortText = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= 100 &&
  Array.from(value).every((character) => {
    const cp = character.codePointAt(0) ?? 0;
    return cp >= 32 && !(cp >= 0xd800 && cp <= 0xdfff) && cp !== 0xfffe && cp !== 0xffff;
  });
const nullableNumber = (value: unknown) => value === null || finite(value);
const nullableText = (value: unknown) => value === null || shortText(value);

export function validateCatalogue(starFile: unknown, constellationFile: unknown): Catalogue {
  if (
    !record(starFile) ||
    !Array.isArray(starFile.stars) ||
    starFile.stars.length === 0 ||
    starFile.stars.length > 10_000
  )
    throw new Error('Invalid star catalogue.');
  if (
    (starFile.epoch !== undefined && starFile.epoch !== 2000) ||
    (starFile.equinox !== undefined && starFile.equinox !== 2000)
  )
    throw new Error('The star catalogue must use epoch and equinox J2000.0.');
  const ids = new Set<number>();
  for (const star of starFile.stars) {
    if (
      !record(star) ||
      !Number.isSafeInteger(star.id) ||
      (star.id as number) < 0 ||
      ids.has(star.id as number) ||
      !finite(star.ra) ||
      star.ra < 0 ||
      star.ra >= 360 ||
      !finite(star.dec) ||
      Math.abs(star.dec) > 90 ||
      !finite(star.pmRa) ||
      Math.abs(star.pmRa) > 1_000_000 ||
      !finite(star.pmDec) ||
      Math.abs(star.pmDec) > 1_000_000 ||
      (star.distancePc !== undefined &&
        star.distancePc !== null &&
        (!finite(star.distancePc) || star.distancePc <= 0 || star.distancePc >= 100000)) ||
      (star.radialVelocityKmSec !== undefined &&
        star.radialVelocityKmSec !== null &&
        (!finite(star.radialVelocityKmSec) || Math.abs(star.radialVelocityKmSec) > 10000)) ||
      !finite(star.mag) ||
      star.mag < -10 ||
      star.mag > 20 ||
      !nullableText(star.name) ||
      !nullableText(star.bayer) ||
      !shortText(star.con) ||
      !nullableNumber(star.hip) ||
      !nullableNumber(star.flam) ||
      !nullableNumber(star.bv)
    )
      throw new Error('Invalid star catalogue.');
    ids.add(star.id as number);
  }
  if (
    !record(constellationFile) ||
    !Array.isArray(constellationFile.constellations) ||
    constellationFile.constellations.length > 100
  )
    throw new Error('Invalid constellation catalogue.');
  let endpoints = 0;
  for (const constellation of constellationFile.constellations) {
    if (
      !record(constellation) ||
      !shortText(constellation.abbr) ||
      !shortText(constellation.name) ||
      !Array.isArray(constellation.lines) ||
      constellation.lines.length > 100
    )
      throw new Error('Invalid constellation catalogue.');
    for (const line of constellation.lines) {
      if (
        !Array.isArray(line) ||
        line.length < 2 ||
        line.length > 100 ||
        line.some((id: unknown) => !Number.isSafeInteger(id) || !ids.has(id as number))
      )
        throw new Error('Invalid constellation endpoints.');
      endpoints += line.length;
      if (endpoints > 20_000) throw new Error('Constellation catalogue exceeds the size limit.');
    }
  }
  return {
    stars: starFile.stars as CatalogueStar[],
    constellations: constellationFile.constellations as ConstellationData[],
    provenance: {
      name: shortText(starFile.catalogue) ? starFile.catalogue : 'Unspecified catalogue',
      license: shortText(starFile.catalogueLicense) ? starFile.catalogueLicense : null,
      referenceEpoch: 2000,
      referenceEquinox: 2000,
      sourceCommit:
        typeof starFile.sourceCommit === 'string' && /^[a-f0-9]{40}$/.test(starFile.sourceCommit)
          ? starFile.sourceCommit
          : null,
      sourceSha256:
        typeof starFile.sourceSha256 === 'string' && /^[a-f0-9]{64}$/.test(starFile.sourceSha256)
          ? starFile.sourceSha256
          : null,
    },
  };
}

async function readJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Catalogue request failed (HTTP ${response.status}).`);
  if (Number(response.headers.get('content-length')) > MAX_BYTES)
    throw new Error('Catalogue exceeds the size limit.');
  // Bound streamed bytes too, including compressed responses and missing headers.
  if (!response.body) throw new Error('Catalogue response is empty.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) throw new Error('Catalogue exceeds the size limit.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('Catalogue is not valid UTF-8 JSON.');
  }
}

export async function loadCatalogue(base: string, signal: AbortSignal): Promise<Catalogue> {
  const [stars, constellations] = await Promise.all([
    readJson(`${base}data/stars.json`, signal),
    readJson(`${base}data/constellations.json`, signal),
  ]);
  return validateCatalogue(stars, constellations);
}
