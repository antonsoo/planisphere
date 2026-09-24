export const DEG_PER_RAD = 180 / Math.PI;
export const RAD_PER_DEG = Math.PI / 180;
export const ARCSEC_PER_DEG = 3600;
export const MAS_PER_DEG = 3_600_000;

/** Julian date of the standard epoch J2000.0 (2000 January 1.5 TT). */
export const JD_J2000 = 2451545.0;

/** Days per Julian year, by definition (used throughout for epoch bookkeeping). */
export const DAYS_PER_JULIAN_YEAR = 365.25;

/** Days per Julian century, by definition. */
export const DAYS_PER_JULIAN_CENTURY = 36525;

export function clampDeclination(decDeg: number): number {
  return Math.max(-90, Math.min(90, decDeg));
}

export function normalizeDegrees(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}
