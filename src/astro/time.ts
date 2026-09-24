import { DAYS_PER_JULIAN_CENTURY, DAYS_PER_JULIAN_YEAR, JD_J2000 } from './constants.js';

/**
 * Converts an epoch, given as an astronomical year number (fractional years
 * allowed; year 0 = 1 BCE, year -699 = 700 BCE, following the astronomical
 * convention used throughout this project -- see docs/epochs.md), to Julian
 * centuries T from J2000.0 TT.
 *
 * This uses a fixed 365.25-day Julian year rather than the true (irregular,
 * leap-second-laden, and for antiquity partly conventional) civil calendar.
 * That is the standard simplification for star charts spanning millennia:
 * the few-day difference between a Julian-year epoch and a proleptic
 * Gregorian date is far smaller than the sub-arcminute precision this app
 * targets, and it keeps epoch math exact and invertible. See README
 * "Accuracy and limitations".
 */
export function epochYearToJulianCenturies(year: number): number {
  const jd = JD_J2000 + (year - 2000) * DAYS_PER_JULIAN_YEAR;
  return (jd - JD_J2000) / DAYS_PER_JULIAN_CENTURY;
}

export function julianCenturiesToEpochYear(t: number): number {
  const jd = t * DAYS_PER_JULIAN_CENTURY + JD_J2000;
  return 2000 + (jd - JD_J2000) / DAYS_PER_JULIAN_YEAR;
}
