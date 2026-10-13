import { describe, expect, it } from 'vitest';
import { civilToMeanTime } from '../src/astro/civilTime.js';
import oracle from '../studies/clock-conversion/oracle.json';

describe('explicit civil clock to paper-wheel setting', () => {
  it.each(oracle.cases)('$name matches independent Python calendar arithmetic', (row) => {
    const result = civilToMeanTime(row.civil, row.offset, row.longitude);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.utc.toISOString()).toBe(row.utc);
    expect(result.meanTime.toISOString()).toBe(row.meanTime);
    expect(result.wheelDate).toBe(row.wheelDate);
    expect(result.wheelHour).toBe(row.wheelHour);
    expect(result.roundingSeconds).toBe(row.roundingSeconds);
  });

  it.each([
    '',
    '2026-02-29T12:00',
    '1900-02-29T12:00',
    '2026-01-01T24:00',
    '2026-01-01T12:60',
    '2026-01-01',
    '0000-01-01T12:00',
    '10000-01-01T12:00',
  ])('rejects incomplete or normalized date %j', (civil) => {
    expect(civilToMeanTime(civil, '+00:00', '0')).toMatchObject({ ok: false, field: 'civil' });
  });
  it.each(['', '7', 'PDT', '+05:60', '+14:01', '-14:01', '+24:00', ' +00:00', '00:00'])(
    'requires an explicit valid offset %j',
    (offset) => {
      expect(civilToMeanTime('2026-01-01T12:00', offset, '0')).toMatchObject({
        ok: false,
        field: 'offset',
      });
    },
  );
  it.each(['', ' ', 'NaN', 'Infinity', '181', '-180.1', '1e2', '1,5'])(
    'requires a finite decimal longitude %j',
    (longitude) => {
      expect(civilToMeanTime('2026-01-01T12:00', '+00:00', longitude)).toMatchObject({
        ok: false,
        field: 'longitude',
      });
    },
  );
  it.each([
    ['0001-01-01T00:00', '+14:00', '180'],
    ['0001-01-01T00:00', '+00:00', '-180'],
    ['9999-12-31T23:59', '+00:00', '0'],
    ['9999-12-31T23:59', '-14:00', '-180'],
  ])('rejects a conversion outside the supported calendar %s %s %s', (civil, offset, longitude) => {
    expect(civilToMeanTime(civil, offset, longitude)).toMatchObject({ ok: false, field: 'civil' });
  });
});
