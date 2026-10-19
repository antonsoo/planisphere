import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const [output, source = process.cwd()] = process.argv.slice(2);
assert(output, 'Usage: node studies/sky-handedness/replay.mjs OUTPUT_DIR [SOURCE_ROOT]');
await mkdir(output, { recursive: true });
const oracle = JSON.parse(await readFile(new URL('./cache/oracle.json', import.meta.url)));
const catalogueBytes = await readFile(path.join(source, 'public/data/stars.json'));
assert.equal(createHash('sha256').update(catalogueBytes).digest('hex'), oracle.catalogueSha256);
const { stars } = JSON.parse(catalogueBytes);
const server = await createServer({
  root: source,
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});
const results = [];
try {
  const { buildDiscSvgMarkup, buildHolderSvgMarkup } = await server.ssrLoadModule(
    '/src/render/exportSvg.ts',
  );
  const { localSiderealTimeDeg, discRotationDeg } =
    await server.ssrLoadModule('/src/geometry/dial.ts');
  const { cardinalMarkers } = await server.ssrLoadModule('/src/geometry/cardinals.ts');
  const date = new Date('2026-05-17T00:00:00Z');
  for (const row of oracle.cases) {
    const sign = row.latitudeDeg >= 0 ? 1 : -1;
    const hour = ((row.lstDeg - localSiderealTimeDeg(date, 12)) / 15 + 36) % 24;
    const config = {
      latDeg: row.latitudeDeg,
      epochYear: 2000,
      magLimit: 5.5,
      showNames: true,
      showConstellations: false,
      date,
      localHour: hour,
    };
    const markup = buildDiscSvgMarkup(stars, [], config, 'a4');
    const dots = new Map(
      [...markup.matchAll(/class="star" data-star="(\d+)" cx="([\d.-]+)" cy="([\d.-]+)"/g)].map(
        (m) => [Number(m[1]), { x: Number(m[2]), y: Number(m[3]) }],
      ),
    );
    const theta = (discRotationDeg(date, hour, sign) * Math.PI) / 180;
    let maxErrorMm = 0,
      checked = 0,
      incorrect = 0;
    for (const star of row.stars) {
      const dot = dots.get(star.id);
      if (!dot) continue;
      const actual = {
        x: dot.x * Math.cos(theta) - dot.y * Math.sin(theta),
        y: dot.x * Math.sin(theta) + dot.y * Math.cos(theta),
      };
      const error = Math.hypot(actual.x - star.pointMm.x, actual.y - star.pointMm.y);
      maxErrorMm = Math.max(maxErrorMm, error);
      checked++;
      if (error > 0.002) incorrect++;
    }
    const cardinal = cardinalMarkers(row.latitudeDeg);
    const area =
      cardinal.reduce((area, p, i) => {
        const next = cardinal[(i + 1) % cardinal.length];
        return area + p.x * next.y - next.x * p.y;
      }, 0) / 2;
    results.push({
      latitudeDeg: row.latitudeDeg,
      lstDeg: row.lstDeg,
      checked,
      incorrect,
      maxErrorMm,
      cardinalAreaMm2: area,
      overheadCompass: area > 0,
    });
    if (row.lstDeg === 73 && [-33.9, 32.5].includes(row.latitudeDeg)) {
      const label = row.latitudeDeg < 0 ? 'south' : 'north';
      await writeFile(path.join(output, `${label}-disc.svg`), markup);
      await writeFile(path.join(output, `${label}-holder.svg`), buildHolderSvgMarkup(config, 'a4'));
    }
  }
} finally {
  await server.close();
}
const summary = {
  catalogueSha256: oracle.catalogueSha256,
  toleranceMm: 0.002,
  checked: results.reduce((n, r) => n + r.checked, 0),
  incorrect: results.reduce((n, r) => n + r.incorrect, 0),
  maxErrorMm: Math.max(...results.map((r) => r.maxErrorMm)),
  wrongCompasses: results.filter((r) => !r.overheadCompass).length,
  cases: results,
};
await writeFile(path.join(output, 'replay.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(
  JSON.stringify({
    checked: summary.checked,
    incorrect: summary.incorrect,
    maxErrorMm: summary.maxErrorMm,
    wrongCompasses: summary.wrongCompasses,
  }),
);
