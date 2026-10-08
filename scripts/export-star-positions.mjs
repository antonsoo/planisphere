// Export actual TypeScript results for the independent ERFA verifier.
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const { applyProperMotion } = await server.ssrLoadModule('/src/astro/properMotion.ts');
  const { positionAtEpoch } = await server.ssrLoadModule('/src/astro/starPosition.ts');
  const catalogue = JSON.parse(
    await readFile(new URL('../public/data/stars.json', import.meta.url), 'utf8'),
  );
  const years = [-2999, -699, 1, 1500, 2000, 2026, 3000];
  const positions = catalogue.stars.map((star) => ({
    id: star.id,
    epochs: years.map((year) => ({
      year,
      motion: applyProperMotion(
        { ra: star.ra, dec: star.dec },
        star.pmRa,
        star.pmDec,
        year - 2000,
        {
          distancePc: star.distancePc ?? null,
          radialVelocityKmSec: star.radialVelocityKmSec ?? null,
        },
      ),
      mean: positionAtEpoch(star, year),
    })),
  }));
  process.stdout.write(`${JSON.stringify({ sourceSha256: catalogue.sourceSha256, positions })}\n`);
} finally {
  await server.close();
}
