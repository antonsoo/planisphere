import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import { load, range, test } from './helpers.mjs';

for (const width of [1440, 375]) {
  test(`civil clock preview, rollover and invalid-draft recovery offline at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await load(page);
    await context.setOffline(true);
    await page.selectOption('#city', 'san-francisco');
    await page.locator('#clock-converter summary').click();
    await expect(page.locator('#civil-longitude')).toHaveValue('-122.42');
    await expect(page.locator('#clock-apply')).toBeDisabled();
    const original = await page.locator('#preview-setting').textContent();
    await page.locator('#civil-clock').fill('2026-07-01T00:15');
    await page.locator('#civil-offset').fill('-07:00');
    await expect(page.locator('#clock-result')).toContainText('2026-06-30 23:05:19.200');
    await expect(page.locator('#preview-setting')).toHaveText(original);
    await page.locator('#clock-apply').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#date')).toHaveValue('2026-06-30');
    await expect(page.locator('#hour')).toHaveValue('23');
    await expect(page.locator('#preview-setting')).toContainText('2026-06-30 · 23:00 mean time');
    const applied = await page.locator('#disc-svg').innerHTML();
    await page.locator('#civil-offset').fill('PDT');
    await expect(page.locator('#civil-offset')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#clock-apply')).toBeDisabled();
    await expect(page.locator('#export-disc')).toBeEnabled();
    expect(await page.locator('#disc-svg').innerHTML()).toBe(applied);
    await page.locator('#civil-offset').fill('+14:00');
    await page.locator('#civil-clock').fill('2026-01-01T00:05');
    await page.locator('#civil-longitude').fill('-157.4');
    await page.locator('#clock-apply').click();
    await expect(page.locator('#date')).toHaveValue('2025-12-30');
    await expect(page.locator('#hour')).toHaveValue('23.5');
    await expect(page.locator('#date-scale-note')).toContainText('2025');
    await page.selectOption('#city', 'custom');
    await expect(page.locator('#civil-longitude')).toHaveValue('');
    await expect(page.locator('#clock-apply')).toBeDisabled();
    await page.locator('#civil-longitude').fill('75.78');
    await range(page, '#lat', 23.2);
    await expect(page.locator('#civil-longitude')).toHaveValue('75.78');
    await page.selectOption('#city', 'babylon');
    await expect(page.locator('#civil-longitude')).toHaveValue('44.42');
    await page.locator('#civil-clock').fill('2026-12-31T23:59');
    await page.locator('#civil-offset').fill('+00:00');
    await page.locator('#civil-longitude').fill('0');
    await page.locator('#clock-apply').click();
    await expect(page.locator('#date')).toHaveValue('2027-01-01');
    await expect(page.locator('#hour')).toHaveValue('0');
    await expect(page.locator('#date-scale-note')).toContainText('2027');
    await range(page, '#hour', 1);
    await expect(page.locator('#clock-applied')).toBeEmpty();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  });
}
