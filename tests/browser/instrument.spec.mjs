import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import { load, range, test } from './helpers.mjs';

async function download(page, part, testInfo) {
  const pending = page.waitForEvent('download');
  await page.locator(`#export-${part}`).click();
  const result = await pending;
  const path = testInfo.outputPath(result.suggestedFilename());
  await result.saveAs(path);
  return readFile(path, 'utf8');
}
async function checkAlignment(page) {
  const result = await page.evaluate(() => {
    const date = document.querySelector('#date').value;
    const tick = document.querySelector(`[data-date="${date}"]`);
    const x = Number(tick.getAttribute('x1'));
    const y = Number(tick.getAttribute('y1'));
    const rotation = Number(
      /rotate\(([^)]+)/.exec(document.querySelector('.disc-rotator').getAttribute('transform'))[1],
    );
    const angle = (Math.atan2(y, x) * 180) / Math.PI + rotation;
    const expected = (Number(document.querySelector('#hour').value) - 12) * 15;
    const difference = ((angle - expected + 540) % 360) - 180;
    return {
      difference,
      rotation,
      readout: Number.parseFloat(document.querySelector('#readout-lst').textContent),
    };
  });
  expect(Math.abs(result.difference)).toBeLessThan(0.002);
  expect(Math.abs(result.rotation - result.readout)).toBeLessThan(0.051);
}

test('initial site mean time rounds across midnight with the correct date', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-04T21:01:00Z') });
  await page.goto('./');
  await expect(page.locator('#export-disc')).toBeEnabled();
  await expect(page.locator('#date')).toHaveValue('2026-10-05');
  await expect(page.locator('#hour-value')).toHaveText('00:00');
  await checkAlignment(page);
});

test('date/hour scale stays aligned through keyboard time changes and midnight', async ({
  page,
}) => {
  await load(page);
  await checkAlignment(page);
  await page.locator('#hour').focus();
  await page.locator('#hour').press('ArrowRight');
  await expect(page.locator('#hour-value')).toHaveText('21:15');
  await checkAlignment(page);
  await range(page, '#hour', 23.75);
  await page.getByRole('button', { name: 'Later by 15 minutes' }).click();
  await expect(page.locator('#hour-value')).toHaveText('00:00');
  await checkAlignment(page);
  await page.getByRole('button', { name: 'Earlier by 15 minutes' }).click();
  await expect(page.locator('#hour-value')).toHaveText('23:45');
  await checkAlignment(page);
});

test('pointer rotation changes the actual mean time without a stale offset', async ({ page }) => {
  await load(page);
  await page.locator('#disc-svg').scrollIntoViewIfNeeded();
  const box = await page.locator('#disc-svg').boundingBox();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('#hour-value')).toHaveText('15:00');
  await expect(page.locator('#preview-setting')).toContainText('15:00 mean time');
  await checkAlignment(page);
  await page.locator('#date').fill('2026-12-25');
  await checkAlignment(page);
  await range(page, '#lat', -33.9);
  await expect(page.locator('#city')).toHaveValue('custom');
  await checkAlignment(page);
  await page.locator('#hour').focus();
  await page.locator('#hour').press('ArrowRight');
  await expect(page.locator('#hour-value')).toHaveText('15:15');
  await checkAlignment(page);
});

test('pointer seam, cancellation and right clicks do not add hidden rotations', async ({
  page,
}) => {
  await load(page);
  await page.locator('#disc-svg').evaluate((svg) => {
    const b = svg.getBoundingClientRect();
    const at = (name, angle, button = 0) =>
      svg.dispatchEvent(
        new PointerEvent(name, {
          pointerId: 1,
          isPrimary: true,
          button,
          bubbles: true,
          clientX: b.x + b.width / 2 + b.width * 0.3 * Math.cos((angle * Math.PI) / 180),
          clientY: b.y + b.height / 2 + b.height * 0.3 * Math.sin((angle * Math.PI) / 180),
        }),
      );
    // Synthetic pointer events cannot capture a real pointer; replace capture
    // only for this deterministic wrap/cancellation boundary check.
    svg.setPointerCapture = () => {};
    at('pointerdown', 179);
    at('pointermove', -176);
    at('pointercancel', -176);
    at('pointermove', 0);
    at('pointerdown', 0, 2);
    at('pointermove', 90);
  });
  await expect(page.locator('#hour-value')).toHaveText('20:45');
  await checkAlignment(page);
});

test('sky detail enlarges the actual windows and dragging still uses the physical pivot', async ({
  page,
}) => {
  await load(page);
  await page.getByRole('button', { name: 'Sky detail', exact: true }).click();
  const view = await page.locator('#disc-svg').getAttribute('viewBox');
  await expect(page.locator('.date-ring')).toBeHidden();
  expect(Number(view.split(' ')[2])).toBeLessThan(140);
  await page.locator('#disc-svg').scrollIntoViewIfNeeded();
  const points = await page.locator('#disc-svg').evaluate((svg) => {
    const matrix = svg.getScreenCTM();
    return [
      new DOMPoint(24, 0).matrixTransform(matrix),
      new DOMPoint(0, 24).matrixTransform(matrix),
    ].map(({ x, y }) => ({ x, y }));
  });
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  await page.mouse.move(points[1].x, points[1].y, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('#hour-value')).toHaveText('15:00');
  await checkAlignment(page);
  await range(page, '#lat', -33.9);
  await expect(page.locator('#chart-detail')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Full instrument', exact: true }).click();
  await expect(page.locator('#disc-svg')).toHaveAttribute('viewBox', '-100 -100 200 200');
  await checkAlignment(page);
});

test('invalid date drafts retain the whole result and block both downloads', async ({ page }) => {
  await load(page);
  const original = await page.locator('#disc-svg').innerHTML();
  const caption = await page.locator('#preview-setting').textContent();
  for (const value of ['', '10000-01-01']) {
    await page.locator('#date').fill(value);
    await expect(page.locator('#date-error')).toBeVisible();
    await expect(page.locator('#date')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#export-disc')).toBeDisabled();
    await expect(page.locator('#export-holder')).toBeDisabled();
    await expect(page.locator('#later')).toBeDisabled();
    expect(await page.locator('#disc-svg').innerHTML()).toBe(original);
    await expect(page.locator('#preview-setting')).toHaveText(caption);
  }
  await range(page, '#lat', -33.9);
  await range(page, '#hour', 10.5);
  await expect(page.locator('#lat-value')).toHaveText('33.9°S');
  await expect(page.locator('#hour-value')).toHaveText('10:30');
  expect(await page.locator('#disc-svg').innerHTML()).toBe(original);
  await expect(page.locator('#preview-setting')).toHaveText(caption);
  await page.locator('#date').fill('2024-02-29');
  await page.locator('#epoch').focus();
  await page.locator('#epoch').press('Home');
  await expect(page.locator('#epoch-value')).toHaveText('3000 BCE');
  await page.locator('#epoch').press('End');
  await expect(page.locator('#epoch-value')).toHaveText('3000 CE');
  await expect(page.locator('#date-error')).toBeHidden();
  await expect(page.locator('.date-tick')).toHaveCount(366);
  await expect(page.locator('#export-disc')).toBeEnabled();
  await checkAlignment(page);
  await page.locator('#date').fill('0099-01-01');
  await expect(page.locator('[data-date="0099-01-01"]')).toBeAttached();
  await checkAlignment(page);
});

for (const failure of ['http', 'schema', 'json', 'oversized', 'stream-limit']) {
  test(`catalogue ${failure} failure retains controls and recovers with retry`, async ({
    page,
    expectedConsoleErrors,
  }) => {
    if (failure === 'http') expectedConsoleErrors.push(/503/);
    let calls = 0;
    await page.route('**/data/stars.json', async (route) => {
      calls++;
      if (calls > 1) return route.continue();
      const options =
        failure === 'http'
          ? { status: 503, body: 'Unavailable' }
          : failure === 'json'
            ? { status: 200, body: '{' }
            : failure === 'schema'
              ? { status: 200, json: { stars: [{ id: 1, ra: 'not a number' }] } }
              : failure === 'oversized'
                ? { status: 200, headers: { 'content-length': '2000001' }, body: '{}' }
                : { status: 200, body: ' '.repeat(2_000_001) };
      await route.fulfill(options);
    });
    await page.goto('./');
    await expect(page.locator('#retry')).toBeVisible();
    await expect(page.locator('#load-status')).toContainText('retry');
    await expect(page.locator('#lat')).toBeDisabled();
    await expect(page.locator('#export-disc')).toBeDisabled();
    await expect(page.locator('#disc-svg')).toHaveCount(1);
    await page.getByRole('button', { name: 'Retry loading catalogue' }).click();
    await expect(page.locator('#export-disc')).toBeEnabled();
    await expect(page.locator('#retry')).toBeHidden();
    await expect(page.locator('#load-status')).toBeHidden();
    await expect(page.locator('circle.star').first()).toBeAttached();
    expect(calls).toBe(2);
  });
}

test('slow initial loading has a live status and disables every setting', async ({ page }) => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/data/stars.json', async (route) => {
    await pending;
    await route.continue();
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#load-status')).toContainText('Loading');
  await expect(page.locator('#city')).toBeDisabled();
  await expect(page.locator('#later')).toBeDisabled();
  release();
  await expect(page.locator('#export-disc')).toBeEnabled();
});

test('restarting a stalled load aborts its ownership and keeps the recovered preview', async ({
  page,
}) => {
  let first;
  let requests = 0;
  await page.route('**/data/stars.json', async (route) => {
    requests++;
    if (requests === 1) {
      first = route;
      return;
    }
    await route.continue();
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#retry')).toHaveText('Restart catalogue loading');
  await page.locator('#retry').click();
  await expect(page.locator('#export-disc')).toBeEnabled();
  await first.fulfill({ json: { stars: [] } });
  await expect(page.locator('#load-status')).toBeHidden();
  await expect(page.locator('circle.star').first()).toBeAttached();
  expect(requests).toBe(2);
});

test('a timed-out catalogue request can be retried without reloading the app', async ({ page }) => {
  await page.clock.install();
  let requests = 0;
  await page.route('**/data/stars.json', async (route) => {
    requests++;
    if (requests > 1) await route.continue();
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#load-status')).toContainText('Loading');
  await page.clock.runFor(15_001);
  await expect(page.locator('#load-status')).toContainText('timed out');
  await page.getByRole('button', { name: 'Retry loading catalogue' }).click();
  await expect(page.locator('#export-disc')).toBeEnabled();
});

for (const [lat, paper] of [
  [32.5, 'a4'],
  [-33.9, 'letter'],
  [0, 'a4'],
  [89, 'letter'],
  [-89, 'a4'],
]) {
  test(`downloaded opaque assembly at ${lat} latitude on ${paper} exposes all dates and retains its pivot`, async ({
    page,
  }, testInfo) => {
    await load(page);
    await range(page, '#lat', lat);
    await page.locator('#paper-size').selectOption(paper);
    const disc = await download(page, 'disc', testInfo);
    const holder = await download(page, 'holder', testInfo);
    const checks = await page.evaluate(
      ({ disc, holder }) => {
        const parser = new DOMParser();
        const d = parser.parseFromString(disc, 'image/svg+xml');
        const h = parser.parseFromString(holder, 'image/svg+xml');
        const outer = Number(h.querySelector('.holder-edge').getAttribute('r'));
        const wheel = Number(d.querySelector('.wheel-edge').getAttribute('r'));
        const dates = [...d.querySelectorAll('.date-tick')];
        const holes = [...h.querySelectorAll('.window-cut')];
        // Construct material from the downloaded cutting instructions alone.
        const material = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        material.setAttribute(
          'd',
          `M ${outer} 0 A ${outer} ${outer} 0 1 0 ${-outer} 0 A ${outer} ${outer} 0 1 0 ${outer} 0 Z ${holes.map((hole) => hole.getAttribute('d')).join(' ')}`,
        );
        material.setAttribute('fill-rule', 'evenodd');
        document.querySelector('#disc-svg').appendChild(material);
        let coveredDates = 0;
        for (const tick of dates) {
          const point = new DOMPoint(
            Number(tick.getAttribute('x1')),
            Number(tick.getAttribute('y1')),
          );
          // Radius is unchanged by every possible wheel rotation; all date marks
          // must clear the holder even outside its sky windows.
          if (Math.hypot(point.x, point.y) <= outer + 1 || material.isPointInFill(point))
            coveredDates++;
        }
        const hubIntact = material.isPointInFill(new DOMPoint(0, 0));
        const supportsIntact = [-59, -10, 10, 59].every((x) =>
          material.isPointInFill(new DOMPoint(x, 0)),
        );
        material.remove();
        const previewDisc = document.querySelector('.disc-rotator');
        const previewHolder = document.querySelector('.holder');
        const descriptor = (e) => [
          e.localName,
          [...e.attributes].map((attr) => [attr.name, attr.value]).sort(),
          e.children.length ? [...e.children].map(descriptor) : e.textContent,
        ];
        const equalElements = (a, b, selector) =>
          [...a.querySelectorAll(selector)].map((e) => JSON.stringify(descriptor(e))).join('') ===
          [...b.querySelectorAll(selector)].map((e) => JSON.stringify(descriptor(e))).join('');
        return {
          xmlErrors:
            d.querySelectorAll('parsererror').length + h.querySelectorAll('parsererror').length,
          wheel,
          outer,
          width: d.documentElement.getAttribute('width'),
          dateCount: dates.length,
          months: d.querySelectorAll('.month-label').length,
          hours: h.querySelectorAll('.hour-label').length,
          quarterTicks: h.querySelectorAll('.hour-tick').length,
          holes: holes.length,
          coveredDates,
          hubIntact,
          supportsIntact,
          sameStars: equalElements(d, previewDisc, '.star'),
          sameNames: equalElements(d, previewDisc, '.star-label'),
          sameDates: equalElements(d, previewDisc, '.date-ring'),
          sameHoles: equalElements(h, previewHolder, '.window-cut'),
          opaque: getComputedStyle(document.querySelector('.holder-face')).opacity,
          names: d.querySelectorAll('.star-label').length,
        };
      },
      { disc, holder },
    );
    expect(checks).toMatchObject({
      xmlErrors: 0,
      wheel: 96,
      outer: 80,
      dateCount: 365,
      months: 12,
      hours: 24,
      quarterTicks: 96,
      holes: 2,
      coveredDates: 0,
      hubIntact: true,
      supportsIntact: true,
      sameStars: true,
      sameNames: true,
      sameDates: true,
      sameHoles: true,
      opaque: '1',
    });
    expect(checks.width).toBe(paper === 'a4' ? '210mm' : '215.9mm');
    expect(checks.names).toBeGreaterThan(0);
    expect(disc).toContain('50 mm');
    expect(holder).toContain('retain both supports');
    await checkAlignment(page);
  });
}

test('names and constellation switches agree in the preview and downloaded SVG', async ({
  page,
}, testInfo) => {
  await load(page);
  await expect(page.locator('.star-label').first()).toBeAttached();
  await page.locator('#show-names').uncheck();
  await page.locator('#show-constellations').uncheck();
  await expect(page.locator('.star-label')).toHaveCount(0);
  await expect(page.locator('.constellation-line')).toHaveCount(0);
  const disc = await download(page, 'disc', testInfo);
  expect(disc).not.toContain('class="star-label"');
  expect(disc).not.toContain('class="constellation-line"');
});

test('actual exported glyph bounds and line strokes stay inside the field', async ({
  page,
}, testInfo) => {
  await load(page);
  for (const lat of [32.5, -33.9, 89, -89]) {
    await range(page, '#lat', lat);
    const markup = await download(page, 'disc', testInfo);
    const overflow = await page.evaluate((markup) => {
      const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
      const svg = document.importNode(parsed.documentElement, true);
      document.body.appendChild(svg);
      const violations = [];
      for (const text of svg.querySelectorAll('.star-label')) {
        const box = text.getBBox();
        const [x, y] = /translate\(([^,]+),([^)]+)/
          .exec(text.getAttribute('transform'))
          .slice(1)
          .map(Number);
        for (const dx of [box.x, box.x + box.width])
          for (const dy of [box.y, box.y + box.height])
            if (Math.hypot(x + dx, y - dy) > 60) violations.push(text.textContent);
      }
      for (const path of svg.querySelectorAll('.constellation-line')) {
        const coords = path
          .getAttribute('d')
          .match(/-?[\d.]+/g)
          .map(Number);
        for (let i = 0; i < coords.length; i += 2)
          if (Math.hypot(coords[i], coords[i + 1]) + 0.05 > 60)
            violations.push(path.getAttribute('d'));
      }
      svg.remove();
      return violations;
    }, markup);
    expect(overflow).toEqual([]);
  }
});

test('after loading, theme, epoch, hemisphere and downloads work offline', async ({
  page,
  context,
}, testInfo) => {
  await load(page);
  await page.evaluate(() => document.fonts.ready);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Night sky', exact: true }).click();
  await range(page, '#epoch', 3000);
  await range(page, '#lat', -33.9);
  await page.locator('#date').fill('2024-02-29');
  await page.getByRole('button', { name: 'Later by 15 minutes' }).click();
  await checkAlignment(page);
  expect(await download(page, 'disc', testInfo)).toContain('date scale 2024');
  expect(await download(page, 'holder', testInfo)).toContain('33.9°S');
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator('#theme-night')).toHaveAttribute('aria-pressed', 'true');
});

test('printed scale and compass lettering stays on the retained physical pieces', async ({
  page,
}, testInfo) => {
  await load(page);
  for (const lat of [0, 0.1, -0.1, 32.5, -33.9, 89, -89]) {
    await range(page, '#lat', lat);
    const disc = await download(page, 'disc', testInfo);
    const holder = await download(page, 'holder', testInfo);
    const violations = await page.evaluate(
      ({ disc, holder }) => {
        const issues = [];
        for (const [markup, radius, isHolder] of [
          [disc, 96, false],
          [holder, 80, true],
        ]) {
          const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
          const svg = document.importNode(parsed.documentElement, true);
          document.body.appendChild(svg);
          const piece = svg.querySelector('.piece');
          const material = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          material.setAttribute(
            'd',
            `M 80 0 A 80 80 0 1 0 -80 0 A 80 80 0 1 0 80 0 Z ${[...piece.querySelectorAll('.window-cut')].map((path) => path.getAttribute('d')).join(' ')}`,
          );
          material.setAttribute('fill-rule', 'evenodd');
          piece.appendChild(material);
          for (const text of piece.querySelectorAll('text')) {
            const box = text.getBBox();
            const transform = piece.getCTM().inverse().multiply(text.getCTM());
            for (const x of [box.x, box.x + box.width])
              for (const y of [box.y, box.y + box.height]) {
                const point = new DOMPoint(x, y).matrixTransform(transform);
                const r = Math.hypot(point.x, point.y);
                if (
                  r > radius ||
                  (isHolder && !material.isPointInFill(point)) ||
                  (text.closest('.date-ring') && r <= 80)
                )
                  issues.push(text.textContent);
              }
          }
          svg.remove();
        }
        return issues;
      },
      { disc, holder },
    );
    expect(violations, `latitude ${lat}`).toEqual([]);
  }
});

for (const width of [1440, 375, 320])
  for (const theme of ['Ink & paper', 'Night sky']) {
    test(`${theme} at ${width}px has no accessibility violations or horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1100 });
      await load(page);
      await page.getByRole('button', { name: theme, exact: true }).click();
      await page.getByRole('button', { name: '61 Cyg', exact: true }).click();
      await page.locator('.star-assumptions summary').click();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(result.violations).toEqual([]);
      await page.locator('.preview-link').click();
      await expect(page.locator('#preview')).toBeFocused();
      await page.getByRole('button', { name: 'Later by 15 minutes' }).focus();
      await page.getByRole('button', { name: 'Later by 15 minutes' }).press('Enter');
      await expect(page.locator('#hour-value')).toHaveText('21:15');
      await checkAlignment(page);
    });
  }
