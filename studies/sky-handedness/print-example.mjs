import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const [baseURL, output] = process.argv.slice(2);
assert(baseURL && output, 'Usage: node studies/sky-handedness/print-example.mjs URL OUTPUT_DIR');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await context.newPage();
  await page.goto(baseURL);
  await page.waitForFunction(() => !document.querySelector('#export-disc').disabled);
  await context.setOffline(true);
  for (const [selector, value] of [
    ['#lat', -33.9],
    ['#epoch', 2026],
    ['#hour', 21],
  ]) {
    await page.locator(selector).evaluate((n, value) => {
      n.value = String(value);
      n.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }
  await page.locator('#date').fill('2024-02-29');
  await page.selectOption('#paper-size', 'letter');
  const files = [];
  const parts = {};
  for (const part of ['disc', 'holder']) {
    const pending = page.waitForEvent('download');
    await page.locator(`#export-${part}`).click();
    const download = await pending;
    const name = `print-southern-${part}-letter.svg`;
    await download.saveAs(path.join(output, name));
    const bytes = await readFile(path.join(output, name));
    parts[part] = bytes.toString();
    files.push({
      name,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  const rotation = await page.locator('.disc-rotator').getAttribute('transform');
  const assembled = await page.evaluate(
    ({ parts, rotation }) => {
      const parser = new DOMParser();
      const disc = parser.parseFromString(parts.disc, 'image/svg+xml').querySelector('.piece');
      const holder = parser.parseFromString(parts.holder, 'image/svg+xml').querySelector('.piece');
      const cuts = [...holder.querySelectorAll('.window-cut')]
        .map((p) => p.getAttribute('d'))
        .join(' ');
      const outer = 'M 80 0 A 80 80 0 1 0 -80 0 A 80 80 0 1 0 80 0 Z';
      return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="-100 -100 200 200">
      <rect x="-100" y="-100" width="200" height="200" fill="white"/>
      <g transform="scale(1,-1)" font-family="Georgia,serif">
        <g transform="${rotation}">${disc.innerHTML}</g>
        <path d="${outer} ${cuts}" fill="#f4edda" fill-rule="evenodd"/>
        ${holder.innerHTML}
      </g></svg>`;
    },
    { parts, rotation },
  );
  await page.setContent(`<body style="margin:0;background:white">${assembled}</body>`);
  await page.locator('svg').screenshot({ path: path.join(output, 'print-southern-assembled.png') });
  await writeFile(
    new URL('./print-example.json', import.meta.url),
    `${JSON.stringify(
      {
        settings: {
          latitudeDeg: -33.9,
          epoch: 2026,
          date: '2024-02-29',
          localMeanHour: 21,
          paper: 'letter',
        },
        rotation,
        files,
      },
      null,
      2,
    )}\n`,
  );
  await context.close();
} finally {
  await browser.close();
}
