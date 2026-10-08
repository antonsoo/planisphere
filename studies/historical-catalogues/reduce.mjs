// Computes each identified star's ecliptic longitude/latitude of date at the
// catalogue's epoch, using planisphere's own pipeline (stellar space motion,
// then P03 precession, then the mean obliquity of date). Run twice per star:
// with HYG proper motion, distance and radial velocity (planisphere's default),
// with proper motion only (no perspective term), and with motion removed
// (precession of the J2000 position only).
//
// usage: node reduce.mjs <compiled-astro-dir> <catalogues.json> <stars.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [libDir, cataloguesPath, starsPath, outPath] = process.argv.slice(2);
const load = (name) => import(pathToFileURL(resolve(libDir, name)).href);
const { positionAtEpoch } = await load('starPosition.js');
const { equatorialToEcliptic } = await load('ecliptic.js');
const { epochYearToJulianCenturies } = await load('time.js');

const catalogues = JSON.parse(readFileSync(cataloguesPath, 'utf8'));
const stars = JSON.parse(readFileSync(starsPath, 'utf8')).stars;
const byHip = new Map(stars.filter((s) => s.hip).map((s) => [s.hip, s]));

const out = {};
for (const [name, cat] of Object.entries(catalogues)) {
  const t = epochYearToJulianCenturies(cat.epoch);
  const rows = [];
  for (const row of cat.rows) {
    const star = row.hip ? byHip.get(row.hip) : undefined;
    if (!star) {
      rows.push({ ...row, inPlanisphere: false });
      continue;
    }
    const still = { ...star, pmRa: 0, pmDec: 0, distancePc: null, radialVelocityKmSec: null };
    const withMotion = equatorialToEcliptic(positionAtEpoch(star, cat.epoch), t);
    const noMotion = equatorialToEcliptic(positionAtEpoch(still, cat.epoch), t);
    const flat = { ...star, distancePc: null, radialVelocityKmSec: null };
    const pmOnly = equatorialToEcliptic(positionAtEpoch(flat, cat.epoch), t);
    const pm = Math.hypot(star.pmRa, star.pmDec);
    rows.push({
      ...row,
      inPlanisphere: true,
      hygMag: star.mag,
      pmMasYr: pm,
      lonMotion: withMotion.lon,
      latMotion: withMotion.lat,
      lonPmOnly: pmOnly.lon,
      latPmOnly: pmOnly.lat,
      distancePc: star.distancePc ?? null,
      lonStatic: noMotion.lon,
      latStatic: noMotion.lat,
    });
  }
  out[name] = { epoch: cat.epoch, rows };
}
writeFileSync(outPath, JSON.stringify(out));
console.log(
  Object.entries(out)
    .map(
      ([k, v]) =>
        `${k}: ${v.rows.filter((r) => r.inPlanisphere).length}/${v.rows.length} in planisphere catalogue`,
    )
    .join('\n'),
);
