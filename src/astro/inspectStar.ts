import { BRIDGE_HALF_WIDTH_MM, HUB_RADIUS_MM, SKY_RADIUS_MM } from '../geometry/cutouts.js';
import { localSiderealTimeDeg } from '../geometry/dial.js';
import { equatorialToHorizontal } from '../geometry/horizontal.js';
import { printedStarRadius } from '../geometry/printedStar.js';
import { projectPoint, projectStar } from '../geometry/projection.js';
import type { PlanisphereConfig } from '../render/types.js';
import { normalizeDegrees, RAD_PER_DEG } from './constants.js';
import type { EquatorialCoord } from './precession.js';
import { applyProperMotion } from './properMotion.js';
import { type CatalogueStar, positionAtEpoch } from './starPosition.js';

export function starName(star: CatalogueStar): string {
  return (
    star.name ??
    (star.flam !== null
      ? `${star.flam} ${star.con}`
      : star.bayer
        ? `${star.bayer} ${star.con}`
        : star.hip !== null
          ? `HIP ${star.hip}`
          : `HYG ${star.id}`)
  );
}

function searchText(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en-US').trim();
}

export function searchStars(stars: CatalogueStar[], query: string): CatalogueStar[] {
  const terms = searchText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return stars
    .filter((star) => {
      const haystack = searchText(
        `${starName(star)} ${star.bayer ?? ''} ${star.flam ?? ''} ${star.con} ${star.hip !== null ? `HIP ${star.hip}` : ''} HYG ${star.id}`,
      );
      return terms.every((term) => haystack.includes(term));
    })
    .sort(
      (a, b) =>
        Number(searchText(starName(b)) === searchText(query)) -
          Number(searchText(starName(a)) === searchText(query)) ||
        a.mag - b.mag ||
        a.id - b.id,
    );
}

export function angularSeparationDeg(a: EquatorialCoord, b: EquatorialCoord): number {
  const vector = ({ ra, dec }: EquatorialCoord) => {
    const d = dec * RAD_PER_DEG;
    const r = ra * RAD_PER_DEG;
    return [Math.cos(d) * Math.cos(r), Math.cos(d) * Math.sin(r), Math.sin(d)] as const;
  };
  const [ax, ay, az] = vector(a);
  const [bx, by, bz] = vector(b);
  return (
    Math.atan2(
      Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx),
      ax * bx + ay * by + az * bz,
    ) / RAD_PER_DEG
  );
}

export function inspectStar(star: CatalogueStar, config: PlanisphereConfig) {
  const position = positionAtEpoch(star, config.epochYear);
  const moved = applyProperMotion(
    { ra: star.ra, dec: star.dec },
    star.pmRa,
    star.pmDec,
    config.epochYear - 2000,
    { distancePc: star.distancePc ?? null, radialVelocityKmSec: star.radialVelocityKmSec ?? null },
  );
  const sign = config.latDeg >= 0 ? 1 : -1;
  const scale = SKY_RADIUS_MM / (180 - Math.abs(config.latDeg));
  const disc = projectStar(position.dec, position.ra, sign, scale);
  const hourAngle = normalizeDegrees(
    localSiderealTimeDeg(config.date, config.localHour) - position.ra,
  );
  const holder = projectPoint(position.dec, hourAngle, sign, scale);
  const horizontal = equatorialToHorizontal(position.dec, hourAngle, config.latDeg);
  const onDisc = printedStarRadius(star.mag, disc) !== null;
  const includedByMagnitude = star.mag <= config.magLimit;
  const aboveHorizon = horizontal.altDeg > 0;
  const behindHub = Math.hypot(holder.x, holder.y) <= HUB_RADIUS_MM;
  const behindSupport = Math.abs(holder.y) <= BRIDGE_HALF_WIDTH_MM;
  const throughWindow = onDisc && aboveHorizon && !behindHub && !behindSupport;
  const state = !onDisc
    ? 'outside-disc'
    : !includedByMagnitude
      ? 'fainter-than-limit'
      : !aboveHorizon
        ? 'below-horizon'
        : behindHub
          ? 'behind-hub'
          : behindSupport
            ? 'behind-support'
            : 'in-window';
  return {
    position,
    moved,
    motionDisplacementDeg: angularSeparationDeg(star, moved),
    hourAngleDeg: hourAngle > 180 ? hourAngle - 360 : hourAngle,
    altitudeDeg: horizontal.altDeg,
    azimuthDeg: Math.abs(horizontal.altDeg) > 89.999999999 ? null : horizontal.azDeg,
    discPointMm: disc,
    holderPointMm: holder,
    onDisc,
    includedByMagnitude,
    aboveHorizon,
    behindHub,
    behindSupport,
    throughWindow,
    state,
  };
}

/** Search the same 15-minute settings the instrument's controls allow. */
export function bestWindowHour(star: CatalogueStar, config: PlanisphereConfig): number | null {
  let best: { hour: number; altitude: number; distance: number } | null = null;
  for (let step = 0; step < 96; step++) {
    const hour = step / 4;
    const state = inspectStar(star, { ...config, localHour: hour });
    if (!state.throughWindow) continue;
    const distance = Math.min(
      Math.abs(hour - config.localHour),
      24 - Math.abs(hour - config.localHour),
    );
    if (
      !best ||
      state.altitudeDeg > best.altitude + 1e-9 ||
      (Math.abs(state.altitudeDeg - best.altitude) < 1e-9 && distance < best.distance)
    )
      best = { hour, altitude: state.altitudeDeg, distance };
  }
  return best?.hour ?? null;
}

export function buildStarEvidence(
  star: CatalogueStar,
  config: PlanisphereConfig,
  provenance: Record<string, unknown>,
) {
  return {
    tool: 'planisphere',
    schemaVersion: 1,
    catalogue: { ...provenance, record: { ...star } },
    settings: {
      ...config,
      date: config.date.toISOString().slice(0, 10),
      yearNumbering: 'astronomical; 0 = 1 BCE',
      timeBasis: 'local mean solar time; printed daily scale',
    },
    model: {
      motion: 'rectilinear geometric space motion before P03 precession',
      referenceEpoch: 2000,
      epochConvention: 'JD 2451545.0 + (epochYear - 2000) * 365.25 days',
      axes: 'Catalogue and motion-only coordinates are treated as mean J2000; final coordinates use mean axes of the selected epoch.',
      perspective:
        star.distancePc == null
          ? 'omitted: distance unavailable'
          : star.radialVelocityKmSec == null
            ? 'zero radial velocity assumed'
            : 'catalogue distance and radial velocity',
      zeroRadialVelocity:
        star.radialVelocityKmSec === 0
          ? 'Catalogue supplies zero; measurement completeness is unspecified.'
          : null,
      limits: [
        'No light-time, relativistic, binary-orbit, refraction or nutation correction.',
        'Magnitude is held at its catalogue value.',
        'Visibility refers to the star center and the geometric horizon, not observing conditions.',
        'Date-ring year and stellar epoch are independent settings.',
      ],
    },
    units: {
      raDec: 'degrees',
      pmRaPmDec: 'milliarcseconds per Julian year; pmRa includes cos(dec)',
      distancePc: 'parsecs',
      radialVelocityKmSec: 'km/s, receding positive',
      discPointMm: 'millimetres, unrotated disc; mirrored RA, y up',
      holderPointMm: 'millimetres, fixed holder; y up',
    },
    result: inspectStar(star, config),
  };
}
