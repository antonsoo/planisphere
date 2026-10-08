import { readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { load, range, test } from './helpers.mjs';

const oracle = JSON.parse(
  await readFile(new URL('../fixtures/space-motion.oracle.json', import.meta.url), 'utf8'),
);

async function download(page, selector, testInfo) {
  const pending = page.waitForEvent('download');
  await page.locator(selector).click();
  const result = await pending;
  const path = testInfo.outputPath(result.suggestedFilename());
  await result.saveAs(path);
  return readFile(path, 'utf8');
}
async function evidence(page, testInfo) {
  return JSON.parse(await download(page, '#export-star', testInfo));
}
async function holderCovers(page, point) {
  return page
    .locator('.holder-face')
    .evaluate((face, { x, y }) => face.isPointInFill(new DOMPoint(x, y)), point);
}

test('desktop epoch controls stay beside the inspected coordinates while scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await load(page);
  await page.getByRole('button', { name: '61 Cyg', exact: true }).click();
  await page.locator('.star-coordinates').scrollIntoViewIfNeeded();
  const before = await page.locator('.star-coordinates').textContent();
  await page.locator('#epoch').focus();
  await page.locator('#epoch').press('Home');
  await expect(page.locator('.star-epoch')).toContainText('3000 BCE');
  expect(await page.locator('.star-coordinates').textContent()).not.toBe(before);
  const visible = await page.evaluate(() => {
    const table = document.querySelector('.star-coordinates').getBoundingClientRect();
    const control = document.querySelector('#epoch').getBoundingClientRect();
    return [table, control].every((box) => box.top >= 0 && box.bottom <= innerHeight);
  });
  expect(visible).toBe(true);
});

test('61 Cyg evidence reaches the independently checked SVG point and leaves print files unmarked', async ({
  page,
}, testInfo) => {
  await load(page);
  await range(page, '#epoch', -2999);
  await page.locator('#star-search').fill('HIP 104214');
  await expect(page.locator('.star-results button')).toHaveCount(1);
  await page.locator('.star-results button').click();
  await expect(page.locator('.star-detail h3')).toHaveText('61 Cyg');
  const report = await evidence(page, testInfo);
  expect(report.settings.epochYear).toBe(-2999);
  expect(report.catalogue.record.hip).toBe(104214);
  expect(report.catalogue.sourceCommit).toBe('c7f7f883fe678cc7680169a50ccd7dcc49b060ce');
  expect(report.catalogue.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
  const reference = oracle.cases.find((item) => item.star.hip === 104214 && item.year === -2999);
  expect(Math.abs(report.result.position.ra - reference.meanRa) * 3600).toBeLessThan(0.35);
  expect(Math.abs(report.result.position.dec - reference.meanDec) * 3600).toBeLessThan(0.35);
  await page.locator('#locate-star').click();
  await expect(page.locator('.holder')).toBeHidden();
  await expect(page.locator('#preview')).toBeFocused();
  await expect(page.locator('#preview-view')).toHaveText('Uncovered disc');
  const point = await page
    .locator(`circle.star[data-star="${report.catalogue.record.id}"]`)
    .evaluate((node) => ({
      x: Number(node.getAttribute('cx')),
      y: Number(node.getAttribute('cy')),
    }));
  // Project the C-library reference independently of the finder and renderer.
  const r = ((90 - reference.meanDec) * 60) / (180 - Math.abs(report.settings.latDeg));
  const x = r * Math.cos((reference.meanRa * Math.PI) / 180);
  const y = -r * Math.sin((reference.meanRa * Math.PI) / 180);
  expect(Math.hypot(point.x - x, point.y - y)).toBeLessThan(0.001);
  expect(
    Math.hypot(point.x - report.result.discPointMm.x, point.y - report.result.discPointMm.y),
  ).toBeLessThan(0.001);
  const marker = await page.locator('.star-locator').getAttribute('transform');
  expect(marker).toBe(`translate(${report.result.discPointMm.x},${report.result.discPointMm.y})`);
  const print = await download(page, '#export-disc', testInfo);
  expect(print).not.toContain('star-locator');
  expect(print).not.toContain('data-preview-only');
  const printedPoint = await page.evaluate(
    ({ print, id }) => {
      const doc = new DOMParser().parseFromString(print, 'image/svg+xml');
      const star = doc.querySelector(`circle.star[data-star="${id}"]`);
      return { x: Number(star.getAttribute('cx')), y: Number(star.getAttribute('cy')) };
    },
    { print, id: report.catalogue.record.id },
  );
  expect(printedPoint).toEqual(point);
});

test('Polaris is above the horizon but behind the hub, and outside a southern disc', async ({
  page,
}, testInfo) => {
  await load(page);
  await range(page, '#epoch', 2000);
  await page.getByRole('button', { name: 'Polaris', exact: true }).click();
  await expect(page.locator('.star-visibility')).toContainText('hidden by the center hub');
  await expect(page.locator('#star-window-time')).toBeDisabled();
  let report = await evidence(page, testInfo);
  expect(report.result.altitudeDeg).toBeGreaterThan(30);
  expect(await holderCovers(page, report.result.holderPointMm)).toBe(true);
  await page.locator('#locate-star').click();
  await expect(page.locator('.star-locator')).toBeVisible();
  await page.locator('#lift-holder').click();
  await expect(page.locator('#preview-view')).toHaveText('Assembled view');
  await range(page, '#lat', -33.9);
  await expect(page.locator('.star-visibility')).toContainText('Outside this latitude');
  await expect(page.locator('#locate-star')).toBeDisabled();
  await expect(page.locator('#star-window-time')).toBeDisabled();
  await expect(page.locator('.star-locator')).toHaveCount(0);
  report = await evidence(page, testInfo);
  expect(report.result.onDisc).toBe(false);
});

test('magnitude recovery and a visible time expose the actual point through the cutout', async ({
  page,
}, testInfo) => {
  await load(page);
  await range(page, '#epoch', -2999);
  await range(page, '#mag', 2);
  await page.getByRole('button', { name: '61 Cyg', exact: true }).click();
  await expect(page.locator('.star-visibility')).toContainText('Fainter than');
  await expect(page.locator('circle.star[data-star="103879"]')).toHaveCount(0);
  await page.locator('#include-star').focus();
  await page.locator('#include-star').press('Enter');
  await expect(page.locator('#locate-star')).toBeFocused();
  await expect(page.locator('#mag')).toHaveValue('5.2');
  await expect(page.locator('circle.star[data-star="103879"]')).toBeAttached();
  await page.locator('#star-window-time').focus();
  await page.locator('#star-window-time').press('Enter');
  await expect(page.locator('#star-window-time')).toBeFocused();
  await expect(page.locator('.star-visibility')).toContainText('visible through the holder');
  const report = await evidence(page, testInfo);
  expect(report.result.altitudeDeg).toBeGreaterThan(80);
  expect(await holderCovers(page, report.result.holderPointMm)).toBe(false);
  await expect(page.locator('#date')).toHaveValue('2026-10-04');
  await expect(page.locator('#epoch')).toHaveValue('-2999');
  expect(report.settings.localHour * 4).toBe(Math.round(report.settings.localHour * 4));
});

test('invalid drafts retain evidence, pause actions and recover without losing the selected star', async ({
  page,
}, testInfo) => {
  await load(page);
  await page.getByRole('button', { name: 'Arcturus', exact: true }).click();
  await page.locator('.star-assumptions summary').click();
  const report = await evidence(page, testInfo);
  const coordinates = await page.locator('.star-coordinates').textContent();
  await page.locator('#date').fill('');
  await range(page, '#epoch', 3000);
  await expect(page.locator('.star-detail .control-error')).toBeVisible();
  for (const id of ['locate-star', 'star-window-time', 'export-star'])
    await expect(page.locator(`#${id}`)).toBeDisabled();
  expect(await page.locator('.star-coordinates').textContent()).toBe(coordinates);
  await expect(page.locator('.star-assumptions')).toHaveAttribute('open', '');
  await page.locator('#date').fill('2026-10-07');
  await expect(page.locator('#export-star')).toBeEnabled();
  const recovered = await evidence(page, testInfo);
  expect(recovered.catalogue.record).toEqual(report.catalogue.record);
  expect(recovered.settings.epochYear).toBe(3000);
  expect(recovered.result.position).not.toEqual(report.result.position);
});

test('bounded search, selection and evidence work offline without inventing a match', async ({
  page,
  context,
}, testInfo) => {
  await load(page);
  await page.evaluate(() => document.fonts.ready);
  await context.setOffline(true);
  await page.locator('#star-search').fill('HIP');
  await expect(page.locator('.star-results button')).toHaveCount(12);
  await page.locator('#star-search').fill('sÍrius');
  await expect(page.locator('.star-results button')).toHaveCount(1);
  await page.locator('.star-results button').focus();
  await page.locator('.star-results button').press('Enter');
  await expect(page.locator('.star-detail h3')).toHaveText('Sirius');
  await page.locator('#star-search').fill('not a catalogue object');
  await expect(page.locator('#star-search-status')).toContainText('No matching star');
  await expect(page.locator('.star-results button')).toHaveCount(0);
  await expect(page.locator('.star-detail h3')).toHaveText('Sirius');
  await range(page, '#epoch', 3000);
  const report = await evidence(page, testInfo);
  expect(report.catalogue.record.hip).toBe(32349);
  expect(report.settings.epochYear).toBe(3000);
  await context.setOffline(false);
});

test('catalogue text stays text, and missing distance is explicit in the evidence', async ({
  page,
}, testInfo) => {
  await page.route('**/data/stars.json', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    const star = data.stars.find((item) => item.hip === 104214);
    star.name = '<img src=x onerror=alert(1)>';
    star.distancePc = null;
    star.radialVelocityKmSec = 0;
    await route.fulfill({ response, json: data });
  });
  await load(page);
  await page.locator('#star-search').fill('HIP 104214');
  await page.locator('.star-results button').click();
  await expect(page.locator('.star-detail h3')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#star-finder img')).toHaveCount(0);
  await page.locator('.star-assumptions summary').click();
  await expect(page.locator('.star-assumptions')).toContainText('Radial perspective is omitted');
  const report = await evidence(page, testInfo);
  expect(report.catalogue.record.distancePc).toBeNull();
  expect(report.model.perspective).toContain('distance unavailable');
  expect(report.model.zeroRadialVelocity).toContain('measurement completeness is unspecified');
});
