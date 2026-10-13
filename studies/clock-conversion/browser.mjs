import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium, firefox } from '@playwright/test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const [baseURL, output] = process.argv.slice(2);
assert(baseURL && output, 'Usage: node studies/clock-conversion/browser.mjs BASE_URL OUTPUT_DIR');
await mkdir(output, { recursive: true });
const hash = (data) => createHash('sha256').update(data).digest('hex');
const oracle = JSON.parse(await readFile(new URL('./oracle.json', import.meta.url)));
const cases = oracle.cases.filter((row) =>
  ['west-midnight', 'dateline', 'round-next-year'].includes(row.name),
);
const files = [];
async function servedFiles(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) await servedFiles(path.join(directory, entry.name), `${relative}/`);
    else {
      const response = await fetch(new URL(relative, baseURL));
      assert(response.ok, relative);
      const bytes = await readFile(path.join(directory, entry.name));
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes, relative);
      files.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) });
    }
  }
}
await servedFiles(path.join(root, 'dist'));
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
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('request', (request) => {
        if (!request.url().startsWith(new URL(baseURL).origin)) external.push(request.url());
      });
      await page.addInitScript(() => {
        window.clockCsp = [];
        document.addEventListener('securitypolicyviolation', (event) =>
          window.clockCsp.push(event.violatedDirective),
        );
      });
      await page.goto(baseURL);
      await page.waitForFunction(() => !document.querySelector('#export-disc').disabled);
      await page.evaluate(() => document.fonts.ready);
      await context.setOffline(true);
      await page.selectOption('#city', 'san-francisco');
      await page.locator(width === 1440 ? '#theme-night' : '#theme-ink').click();
      await page.locator('#clock-converter summary').click();
      const observations = [];
      for (const row of cases) {
        const previous = await page.locator('#preview-setting').textContent();
        await page.locator('#civil-clock').fill(row.civil);
        await page.locator('#civil-offset').fill(row.offset);
        await page.locator('#civil-longitude').fill(row.longitude);
        assert.equal(await page.locator('#preview-setting').textContent(), previous);
        assert(
          (await page.locator('#clock-result').textContent()).includes(
            row.meanTime.replace('T', ' ').replace(/(?:\.000)?Z$/, ''),
          ),
        );
        await page.locator('#clock-apply').focus();
        const started = performance.now();
        await page.keyboard.press('Enter');
        await page.waitForFunction(
          ({ date, hour }) =>
            document.querySelector('#date').value === date &&
            document.querySelector('#hour').value === String(hour),
          { date: row.wheelDate, hour: row.wheelHour },
        );
        const applyMs = performance.now() - started;
        const state = await page.evaluate(() => {
          const date = document.querySelector('#date').value;
          const hour = Number(document.querySelector('#hour').value);
          const tick = document.querySelector(`[data-date="${date}"]`);
          const angle =
            (Math.atan2(Number(tick.getAttribute('y1')), Number(tick.getAttribute('x1'))) * 180) /
            Math.PI;
          const rotation = Number(
            /rotate\(([^)]+)/.exec(
              document.querySelector('.disc-rotator').getAttribute('transform'),
            )[1],
          );
          return {
            date,
            hour,
            setting: document.querySelector('#preview-setting').textContent,
            rotation,
            alignmentErrorDeg: ((angle + rotation - (hour - 12) * 15 + 540) % 360) - 180,
            pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
          };
        });
        assert(Math.abs(state.alignmentErrorDeg) < 0.002);
        assert(!state.pageOverflow);
        const downloads = [];
        for (const part of ['disc', 'holder']) {
          const pending = page.waitForEvent('download');
          await page.locator(`#export-${part}`).click();
          const download = await pending;
          const file = `${engine}-${width}-${row.name}-${part}.svg`;
          await download.saveAs(path.join(output, file));
          const bytes = await readFile(path.join(output, file));
          const inspected = await page.evaluate(
            ({ svg, date, part }) => {
              const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
              return {
                parseError: Boolean(document.querySelector('parsererror')),
                width: document.documentElement.getAttribute('width'),
                height: document.documentElement.getAttribute('height'),
                title: document.querySelector('title')?.textContent,
                days: document.querySelectorAll('[data-date]').length,
                hasSelectedDate: Boolean(document.querySelector(`[data-date="${date}"]`)),
                part,
              };
            },
            { svg: bytes.toString(), date: row.wheelDate, part },
          );
          assert(!inspected.parseError);
          assert.equal(inspected.width, '210mm');
          assert.equal(inspected.height, '297mm');
          if (part === 'disc') {
            assert(inspected.title.includes(`date scale ${row.wheelDate.slice(0, 4)}`));
            assert(inspected.hasSelectedDate);
            assert.equal(inspected.days, 365);
          }
          downloads.push({ file, bytes: bytes.length, sha256: hash(bytes), inspected });
        }
        observations.push({
          input: { civil: row.civil, offset: row.offset, longitude: row.longitude },
          name: row.name,
          ...state,
          applyMs,
          downloads,
        });
        if (row.name === 'west-midnight') {
          // Keep the sticky sidebar at a reproducible position in full-page captures.
          await page.evaluate(() => {
            window.scrollTo(0, 0);
            if (innerWidth > 820) {
              const controls = document.querySelector('.controls');
              const converter = document.querySelector('#clock-converter');
              controls.scrollTop +=
                converter.getBoundingClientRect().top - controls.getBoundingClientRect().top - 100;
            }
          });
          assert.deepEqual((await new AxeBuilder({ page }).analyze()).violations, []);
          await page.screenshot({
            path: path.join(output, `${engine}-${width}.png`),
            fullPage: true,
          });
        }
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      assert.deepEqual(await page.evaluate(() => window.clockCsp), []);
      workflows.push({
        engine,
        browser: browser.version(),
        width,
        offline: true,
        observations,
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
  `${JSON.stringify({ servedFiles: files, workflows }, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    servedFilesMatch: files.length,
    workflows: workflows.length,
    conversions: workflows.reduce((n, w) => n + w.observations.length, 0),
    downloads: 24,
  }),
);
