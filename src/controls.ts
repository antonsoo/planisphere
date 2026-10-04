import { gregorianDate } from './render/artwork.js';

/** The browser's date input may be empty/partially edited or out of range. */
export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = gregorianDate(year, month - 1, day);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

export function quarterHour(hour: number): number {
  return (((Math.round(hour * 4) % 96) + 96) % 96) / 4;
}

export function formatHour(hour: number): string {
  const minutes = Math.round(quarterHour(hour) * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Incremental angle difference across the +/-180 degree seam. */
export function angleDelta(previous: number, next: number): number {
  return ((next - previous + 540) % 360) - 180;
}
