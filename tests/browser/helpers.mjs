import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires a destructured fixture argument.
  expectedConsoleErrors: async ({}, use) => {
    await use([]);
  },
  page: async ({ page, baseURL, expectedConsoleErrors }, use) => {
    const errors = [];
    const offOrigin = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        !expectedConsoleErrors.some((pattern) => pattern.test(message.text()))
      )
        errors.push(message.text());
    });
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== new URL(baseURL).origin) offOrigin.push(request.url());
    });
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (event) =>
        window.__cspViolations.push(event.violatedDirective),
      );
    });
    await use(page);
    expect(errors).toEqual([]);
    expect(offOrigin).toEqual([]);
    expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
  },
});

export async function load(page) {
  await page.goto('./');
  await expect(page.locator('circle.star').first()).toBeAttached();
  await expect(page.locator('#export-disc')).toBeEnabled();
  await page.locator('#date').fill('2026-10-04');
  await range(page, '#hour', 21);
}
export async function range(page, selector, value) {
  await page.locator(selector).evaluate((node, value) => {
    node.value = String(value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
