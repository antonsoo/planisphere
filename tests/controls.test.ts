import { describe, expect, it } from 'vitest';
import { angleDelta, formatHour, parseDateInput, quarterHour } from '../src/controls.js';

describe('date drafts', () => {
  it.each([
    '',
    '0000-01-01',
    '10000-01-01',
    '2026-02-29',
    '2026-04-31',
    '1900-02-29',
    '2026-13-01',
    '2026-01-00',
    '2026-1-1',
    ' 2026-01-01',
  ])('rejects %j without normalizing or replacing it', (value) =>
    expect(parseDateInput(value)).toBeNull(),
  );
  it.each(['0001-01-01', '0099-12-31', '2000-02-29', '2024-02-29', '9999-12-31'])(
    'preserves %s including years below 100',
    (value) => expect(parseDateInput(value)?.toISOString().slice(0, 10)).toBe(value),
  );
});
describe('one time state', () => {
  it('wraps midnight with valid quarter-hour values and no 23:60 readout', () => {
    expect(quarterHour(24)).toBe(0);
    expect(quarterHour(-0.25)).toBe(23.75);
    expect(formatHour(23.99)).toBe('00:00');
    expect(formatHour(-0.25)).toBe('23:45');
    expect(formatHour(21.25)).toBe('21:15');
  });
  it('crosses the pointer angle seam without a full-turn jump', () => {
    expect(angleDelta(179, -179)).toBe(2);
    expect(angleDelta(-179, 179)).toBe(-2);
  });
});
