// Capture real production UI and downloads. Start a local preview on port 4205 first.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';

const baseURL = process.argv[2] ?? 'http://127.0.0.1:4205/planisphere/';
const origin = new URL(baseURL).origin;
const output = new URL('../docs/assets/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const errors = [];
const requests = [];
const captures = [];
const audits = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('request', (request) => {
  if (new URL(request.url()).origin !== origin) requests.push(request.url());
});
await page.addInitScript(() => {
  window.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', (event) =>
    window.__cspViolations.push(event.violatedDirective),
  );
});
async function range(id, value) {
  await page.locator(`#${id}`).evaluate((input, value) => {
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
async function capture(name, selector) {
  await page.evaluate(() => document.fonts.ready);
  const path = fileURLToPath(new URL(name, output));
  if (selector) await page.locator(selector).screenshot({ path });
  else {
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path, fullPage: true });
  }
  captures.push(name);
}
async function download(selector, name) {
  const pending = page.waitForEvent('download');
  await page.locator(selector).click();
  const result = await pending;
  await result.saveAs(fileURLToPath(new URL(name, output)));
  captures.push(name);
}
try {
  await page.goto(baseURL);
  await page.waitForFunction(() => !document.querySelector('#export-disc').disabled);
  await page.locator('#date').fill('2026-10-07');
  await range('hour', 21);
  await page.locator('#theme-ink').click();
  await page.locator('#lift-holder').click();
  for (const [year, name] of [
    [-699, '700bce'],
    [2026, 'today'],
  ]) {
    await range('epoch', year);
    await capture(`hero-babylon-${name}.png`, '#disc-svg');
  }
  await range('epoch', -2999);
  await page.locator('#star-search').fill('HIP 104214');
  await page.locator('.star-results button').click();
  await page.locator('#star-window-time').click();
  await page.locator('#locate-star').click();
  await page.locator('.star-assumptions summary').click();
  await capture('star-finder-paper.png');
  await capture('star-finder-register.png', '#star-finder');
  await download('#export-star', 'star-61-cyg-3000bce.json');
  await download('#export-disc', 'star-61-cyg-3000bce-disc.svg');
  await download('#export-holder', 'star-61-cyg-holder.svg');
  for (const width of [1440, 375, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    for (const theme of ['ink', 'night']) {
      await page.locator(`#theme-${theme}`).click();
      const result = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(result.violations, []);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      audits.push({ width, theme, violations: result.violations.length });
      if (width === 1440 && theme === 'night')
        await capture('star-finder-night.png', '#star-finder');
      if (width === 375 && theme === 'ink') await capture('star-finder-mobile.png', '#star-finder');
    }
  }
  // Measure the actual time-control handler with a selected, expanded star.
  const samples = await page.locator('#hour').evaluate((input) => {
    const timings = [];
    for (let step = 0; step < 96; step++) {
      const start = performance.now();
      input.value = String(step / 4);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('.star-detail').getBoundingClientRect();
      timings.push(performance.now() - start);
    }
    return timings.sort((a, b) => a - b);
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  assert.deepEqual(await page.evaluate(() => window.__cspViolations), []);
  const files = await Promise.all(
    captures.map(async (name) => {
      const bytes = await readFile(new URL(name, output));
      return {
        name,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      };
    }),
  );
  const report = {
    browser: `Chromium ${browser.version()}`,
    files,
    accessibility: audits,
    runtimeErrors: errors,
    offOriginRequests: requests,
    cspViolations: [],
    timeControlWithInspection: {
      samples: samples.length,
      includesSynchronousLayout: true,
      medianMs: samples[Math.floor(samples.length / 2)],
      p95Ms: samples[Math.floor(samples.length * 0.95)],
      maxMs: samples.at(-1),
      viewport: { width: 320, height: 1100 },
    },
  };
  await writeFile(
    new URL('../star-finder-capture.json', output),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
