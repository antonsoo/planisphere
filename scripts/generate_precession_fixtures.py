#!/usr/bin/env python3
"""Regenerates tests/fixtures/precession-angles.oracle.json.

Cross-checks the hand-transcribed Capitaine et al. (2003) polynomial
coefficients used in src/astro/precession.ts against pyerfa's `p06e`, an
independent C-library implementation (via ERFA, the open-source equivalent
of IAU SOFA) of the same IAU 2006/P03 precession angles. Agreement here means
the TypeScript port of the published formula is transcribed correctly, not
that the formula itself is "true" (no formula is, beyond its stated
accuracy -- see README's Accuracy section).

Requires astropy/pyerfa in a throwaway venv (not a project dependency):
    uv venv /tmp/planisphere-oracle && source /tmp/planisphere-oracle/bin/activate
    uv pip install astropy
    python3 scripts/generate_precession_fixtures.py > tests/fixtures/precession-angles.oracle.json
"""

import json

import erfa

ARCSEC_PER_RAD = 206264.80624709636
JD2000 = 2451545.0


def jd_tt_for_year(year: float) -> float:
    # Simple, documented convention: treat "year" as astronomical year
    # numbering (year 0 = 1 BCE), fractional Julian years of 365.25 days
    # from J2000.0 TT. This matches epochToJulianCenturies() in
    # src/astro/time.ts, so this fixture cross-checks the precession-angle
    # formula itself, independent of calendar/epoch bookkeeping.
    return JD2000 + (year - 2000.0) * 365.25


YEARS = [2000, 2028.867, 2050, 2100, 1900, 1, -699, -1499, -2999, 3000, -100, 500, 1500]


def main() -> None:
    cases = []
    for year in YEARS:
        jd = jd_tt_for_year(year)
        t = (jd - JD2000) / 36525.0
        result = erfa.p06e(jd, 0.0)
        zetaa, za, thetaa = result[10], result[9], result[11]
        cases.append(
            {
                "year": year,
                "t_centuries": t,
                "zetaA_arcsec": zetaa * ARCSEC_PER_RAD,
                "zA_arcsec": za * ARCSEC_PER_RAD,
                "thetaA_arcsec": thetaa * ARCSEC_PER_RAD,
            }
        )

    print(
        json.dumps(
            {
                "generator": "pyerfa erfa.p06e (IAU 2006/P03 precession angles), "
                "astropy/pyerfa in a throwaway uv venv",
                "note": "Independent-library cross-check of the zeta_A/z_A/theta_A "
                "polynomial coefficients from Capitaine et al. 2003 (A&A 412, 567), "
                "eq. 40, as adopted by IAU 2006.",
                "cases": cases,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
