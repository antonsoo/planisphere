import { parseDateInput } from '../controls.js';

export type ClockField = 'civil' | 'offset' | 'longitude';
export type ClockConversion =
  | { ok: false; field: ClockField; message: string }
  | {
      ok: true;
      utc: Date;
      meanTime: Date;
      wheelDate: string;
      wheelHour: number;
      roundingSeconds: number;
    };

/** Explicit-offset clock arithmetic; no device zone or historical zone rules.
 * Mean time omits the equation of time. UTC approximates UT1 for this paper dial.
 * Date objects here hold clock coordinates, not a time zone for the mean clock.
 */
export function civilToMeanTime(civil: string, offset: string, longitude: string): ClockConversion {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(civil);
  const date = match ? parseDateInput(match[1] ?? '') : null;
  if (!match || !date || Number(match[2]) > 23 || Number(match[3]) > 59) {
    return {
      ok: false,
      field: 'civil',
      message: 'Enter a valid civil date and time from year 0001 to 9999.',
    };
  }
  const zone = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  const offsetMinutes = zone ? Number(zone[2]) * 60 + Number(zone[3]) : NaN;
  if (!zone || Number(zone[3]) > 59 || offsetMinutes > 14 * 60) {
    return {
      ok: false,
      field: 'offset',
      message: 'Enter an explicit UTC offset from -14:00 to +14:00, such as -07:00 or +05:45.',
    };
  }
  const longitudeDeg = Number(longitude);
  if (
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(longitude) ||
    !Number.isFinite(longitudeDeg) ||
    Math.abs(longitudeDeg) > 180
  ) {
    return {
      ok: false,
      field: 'longitude',
      message: 'Enter longitude from -180 to 180 degrees: west negative, east positive.',
    };
  }
  date.setUTCHours(Number(match[2]), Number(match[3]));
  const utc = new Date(date.getTime() - (zone[1] === '-' ? -1 : 1) * offsetMinutes * 60_000);
  // Round longitude arithmetic to a millisecond before calendar conversion.
  const meanTime = new Date(utc.getTime() + Math.round(longitudeDeg * 240_000));
  // Rounding the full coordinate (not the hour alone) preserves midnight rollover.
  // A half-quarter tie selects the later setting, including before the Unix epoch.
  const rounded = new Date(Math.floor(meanTime.getTime() / 900_000 + 0.5) * 900_000);
  if (
    [utc, meanTime, rounded].some(
      (value) => value.getUTCFullYear() < 1 || value.getUTCFullYear() > 9999,
    )
  ) {
    return {
      ok: false,
      field: 'civil',
      message:
        'This conversion crosses the supported year 0001–9999 boundary. Choose another clock setting.',
    };
  }
  return {
    ok: true,
    utc,
    meanTime,
    wheelDate: rounded.toISOString().slice(0, 10),
    wheelHour: rounded.getUTCHours() + rounded.getUTCMinutes() / 60,
    roundingSeconds: (rounded.getTime() - meanTime.getTime()) / 1000,
  };
}
