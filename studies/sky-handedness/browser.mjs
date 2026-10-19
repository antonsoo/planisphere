import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, firefox } from '@playwright/test';

const [baseURL, output, expectation = 'overhead'] = process.argv.slice(2);
assert(
  baseURL && output,
  'Usage: node studies/sky-handedness/browser.mjs URL OUTPUT_DIR [reflected|overhead]',
);
await mkdir(output, { recursive: true });
const fixture = JSON.parse(await readFile(new URL('./cache/oracle.json', import.meta.url)));
const triangleIds = [60530, 62239, 60893]; // Acrux, Mimosa, Gacrux, in that order.
const area = (points) =>
  points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length];
    return sum + p.x * next.y - next.x * p.y;
  }, 0) / 2;
const reference = fixture.cases.find((c) => c.latitudeDeg === -33.9 && c.lstDeg === 73);
const expectedTriangleSign = Math.sign(
  area(triangleIds.map((id) => reference.stars.find((s) => s.id === id).pointMm)),
);
const hash = (b) => createHash('sha256').update(b).digest('hex');
const workflows = [];
for (const [engine, browserType] of [
  ['chromium', chromium],
  ['firefox', firefox],
]) {
  const browser = await browserType.launch();
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      const page = await context.newPage();
      const errors = [],
        external = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('request', (r) => {
        if (new URL(r.url()).origin !== new URL(baseURL).origin) external.push(r.url());
      });
      await page.addInitScript(() => {
        window.csp = [];
        document.addEventListener('securitypolicyviolation', (e) =>
          window.csp.push(e.violatedDirective),
        );
      });
      await page.goto(baseURL);
      await page.waitForFunction(() => !document.querySelector('#export-disc').disabled);
      await page.evaluate(() => document.fonts.ready);
      await context.setOffline(true);
      async function range(selector, value) {
        await page.locator(selector).evaluate((node, value) => {
          node.value = String(value);
          node.dispatchEvent(new Event('input', { bubbles: true }));
        }, value);
      }
      await range('#lat', -33.9);
      await range('#epoch', 2000);
      await page.locator('#date').fill('2026-05-17');
      await range('#hour', 21);
      await page.locator(width === 1440 ? '#theme-night' : '#theme-ink').click();
      const state = await page.evaluate((ids) => {
        const points = [...document.querySelectorAll('.cardinal-label')].map((node) => {
          const m = node.transform.baseVal.consolidate().matrix;
          return { label: node.textContent, x: m.e, y: m.f };
        });
        const stars = ids.map((id) => {
          const node = document.querySelector(`.star[data-star="${id}"]`);
          return { id, x: Number(node.getAttribute('cx')), y: Number(node.getAttribute('cy')) };
        });
        return {
          points,
          stars,
          rotation: document.querySelector('.disc-rotator').getAttribute('transform'),
          sidereal: document.querySelector('#readout-lst').textContent,
          setting: document.querySelector('#preview-setting').textContent,
        };
      }, triangleIds);
      const compassAreaMm2 = area(state.points);
      const triangleAreaMm2 = area(state.stars);
      assert.equal(compassAreaMm2 > 0, expectation === 'overhead');
      assert.equal(Math.sign(triangleAreaMm2) === expectedTriangleSign, expectation === 'overhead');
      const downloads = [];
      for (const part of ['disc', 'holder']) {
        const pending = page.waitForEvent('download');
        await page.locator(`#export-${part}`).click();
        const download = await pending;
        const file = `${engine}-${width}-${part}.svg`;
        const retained = engine === 'chromium' && width === 1440;
        if (retained) await download.saveAs(path.join(output, file));
        const bytes = await readFile(await download.path());
        const markup = bytes.toString();
        const checked = await page.evaluate(
          ({ markup, part, ids }) => {
            const document = new DOMParser().parseFromString(markup, 'image/svg+xml');
            const nodes =
              part === 'holder'
                ? [...document.querySelectorAll('.cardinal-label')]
                : ids.map((id) => document.querySelector(`.star[data-star="${id}"]`));
            return {
              valid: !document.querySelector('parsererror'),
              width: document.documentElement.getAttribute('width'),
              points: nodes.map((n) => {
                if (part === 'disc')
                  return { x: Number(n.getAttribute('cx')), y: Number(n.getAttribute('cy')) };
                const [x, y] = /translate\(([^,]+),([^)]+)/
                  .exec(n.getAttribute('transform'))
                  .slice(1)
                  .map(Number);
                return { x, y };
              }),
            };
          },
          { markup, part, ids: triangleIds },
        );
        assert(checked.valid);
        assert.equal(checked.width, '210mm');
        assert.equal(
          area(checked.points) > 0,
          (part === 'holder' ? compassAreaMm2 : triangleAreaMm2) > 0,
        );
        downloads.push({
          file: retained ? file : null,
          bytes: bytes.length,
          sha256: hash(bytes),
          ...checked,
        });
      }
      // A real mouse drag must turn the physical wheel with the pointer in BOTH
      // hemispheres, while the time direction reverses in the south.
      await page.locator('#disc-svg').scrollIntoViewIfNeeded();
      const dragPoints = await page
        .locator('#disc-svg')
        .evaluate((svg) =>
          [
            new DOMPoint(60, 0).matrixTransform(svg.getScreenCTM()),
            new DOMPoint(0, 60).matrixTransform(svg.getScreenCTM()),
          ].map(({ x, y }) => ({ x, y })),
        );
      await page.mouse.move(dragPoints[0].x, dragPoints[0].y);
      await page.mouse.down();
      await page.mouse.move(dragPoints[1].x, dragPoints[1].y, { steps: 12 });
      await page.mouse.up();
      const dragHour = Number(await page.locator('#hour').inputValue());
      assert.equal(dragHour, expectation === 'overhead' ? 3 : 15);
      await range('#hour', 21);
      if (engine === 'chromium' && width === 1440) {
        await page.locator('#disc-svg').screenshot({ path: path.join(output, 'assembled.png') });
      }
      // Show the Southern Cross selected and the full physical disc.
      await page.locator('#star-search').fill('Acrux');
      const candidate = page.getByRole('button', { name: /Acrux/ }).first();
      if (await candidate.count()) await candidate.click();
      await page.locator('#lift-holder').click();
      await page.locator('#disc-svg').scrollIntoViewIfNeeded();
      if (engine === 'firefox' && width === 375) {
        await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true });
      }
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        true,
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      assert.deepEqual(await page.evaluate(() => window.csp), []);
      workflows.push({
        engine,
        version: browser.version(),
        width,
        offline: true,
        ...state,
        compassAreaMm2,
        triangleAreaMm2,
        expectedTriangleSign,
        dragHour,
        downloads,
        pageErrors: errors,
        externalRequests: external,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(
  path.join(output, 'browser.json'),
  `${JSON.stringify({ expectation, workflows }, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    workflows: workflows.length,
    downloads: workflows.reduce((n, w) => n + w.downloads.length, 0),
    expectation,
  }),
);
