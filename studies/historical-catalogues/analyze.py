"""Score planisphere's reduction of the historical catalogues.

usage: python analyze.py <reduced.json> <results.json>

Residual = planisphere (computed) minus historical (recorded), arcminutes, the
same sign convention as the editors' Dl/Db columns (Hipparcos - historical).
Longitude residuals are plain differences in lambda, as the editors give them.
"""

import json
import math
import sys

import numpy as np
from scipy import optimize, stats

reduced = json.load(open(sys.argv[1]))
NAMES = {"ptolemy_137": "Ptolemy (AD 137, as printed)", "ptolemy_128": "Ptolemy (-128, editors' -2d40m)", "ulugh_beg": "Ulugh Beg", "tycho": "Tycho Brahe", "hevelius": "Hevelius"}
# Windows quoted in the ReadMe/abstract for the Gaussian fits (arcmin).
FIT_WINDOW = {"ptolemy_128": 50.0, "ulugh_beg": 50.0, "tycho": 10.0, "hevelius": 10.0}  # last two: our choice
PRECESSION_ARCMIN_PER_YEAR = 50.29 / 60  # rough, for converting an offset to years only
HALLEY = {"Sirius": 32349, "Arcturus": 69673, "Aldebaran": 21421}


def wrap(x):
    return (x + 180.0) % 360.0 - 180.0


def trunc_gauss(x, w):
    """Maximum-likelihood mean and sigma of a Gaussian truncated to |x| < w."""
    x = x[np.abs(x) < w]

    def nll(p):
        mu, ls = p
        s = math.exp(ls)
        z = stats.norm.cdf((w - mu) / s) - stats.norm.cdf((-w - mu) / s)
        return -(stats.norm.logpdf(x, mu, s).sum() - len(x) * math.log(max(z, 1e-300)))

    r = optimize.minimize(nll, [float(np.median(x)), math.log(float(np.std(x)) + 1e-9)], method="Nelder-Mead")
    return float(r.x[0]), math.exp(float(r.x[1])), int(len(x))


def mad_sigma(x):
    return float(1.4826 * np.median(np.abs(x - np.median(x))))


def summarise(x):
    return {
        "n": int(len(x)),
        "median": float(np.median(x)),
        "mad_sigma": mad_sigma(x),
        "rms": float(np.sqrt(np.mean(x**2))),
        "frac_gt_10": float(np.mean(np.abs(x) > 10)),
        "frac_gt_60": float(np.mean(np.abs(x) > 60)),
        "frac_gt_150": float(np.mean(np.abs(x) > 150)),
    }


results = {}
for key, cat in reduced.items():
    rows = cat["rows"]
    def category(r):
        if r["q"] == 6:
            return "quality_6_repeated_entry"
        if r["q"] == 5:
            return "quality_5_not_identified"
        if r["lon"] is None or not r["hip"]:
            return "no_position_or_no_hipparcos_number_(not flagged 5 or 6)"
        return "quality_3_4_uncertain" if r["q"] in (3, 4) else "quality_1_2_secure"

    counts = {"entries": len(rows)}
    for r in rows:
        counts[category(r)] = counts.get(category(r), 0) + 1
    for k in ("quality_6_repeated_entry", "quality_5_not_identified",
              "no_position_or_no_hipparcos_number_(not flagged 5 or 6)", "quality_3_4_uncertain", "quality_1_2_secure"):
        counts.setdefault(k, 0)
    ident = [r for r in rows if r["lon"] is not None and r["hip"] and r["q"] in (1, 2, 3, 4)]
    secure = [r for r in ident if r["q"] in (1, 2)]
    scored = [r for r in secure if r["inPlanisphere"]]
    counts["secure_q1_2"] = len(secure)
    counts["secure_and_in_planisphere_catalogue"] = len(scored)
    absent = [r for r in secure if not r["inPlanisphere"]]
    counts["secure_not_in_planisphere_star_file"] = len(absent)
    counts["secure_not_in_star_file_with_hipparcos_V_le_5.5"] = sum(1 for r in absent if r["vmag"] is not None and r["vmag"] <= 5.5)

    def resid(rs, lon="lonMotion", lat="latMotion"):
        dl = np.array([wrap(r[lon] - r["lon"]) * 60 for r in rs])
        db = np.array([(r[lat] - r["lat"]) * 60 for r in rs])
        return dl, db

    dl, db = resid(scored)
    dls, dbs = resid(scored, "lonStatic", "latStatic")
    ed_dl = np.array([r["dl"] for r in scored])  # editors' Dl exists for ptolemy_128 only
    has_ed = key != "ptolemy_137"
    ed_db = np.array([r["db"] for r in scored])
    out = {"epoch": cat["epoch"], "counts": counts}

    # Headline: untrimmed.
    out["untrimmed"] = {"lon": summarise(dl), "lat": summarise(db)}
    # Gaussian fit in the editors' window.
    w = FIT_WINDOW.get(key, 50.0)
    mu_l, s_l, n_l = trunc_gauss(dl, w)
    mu_b, s_b, n_b = trunc_gauss(db, w)
    mu_l1, s_l1, n_l1 = trunc_gauss(dl, 100.0)
    mu_b1, s_b1, n_b1 = trunc_gauss(db, 100.0)
    out["gauss_fit_window_100"] = None if key == "ptolemy_137" else {"lon": {"mu": mu_l1, "sigma": s_l1, "n": n_l1}, "lat": {"mu": mu_b1, "sigma": s_b1, "n": n_b1}}
    out["gauss_fit_window_arcmin"] = w
    # The AD 137 variant carries a ~70 arcmin offset, outside any window centred on zero: no fit.
    out["gauss_fit"] = None if key == "ptolemy_137" else {"lon": {"mu": mu_l, "sigma": s_l, "n": n_l},
                                  "lat": {"mu": mu_b, "sigma": s_b, "n": n_b}}
    # Our fit procedure applied to the editors' own Dl, Db for every flag 1-2 entry
    # (not only those in planisphere's catalogue): separates fit method from pipeline.
    if has_ed:
        edl = np.array([r["dl"] for r in secure])
        edb = np.array([r["db"] for r in secure])
        out["gauss_fit_on_editors_columns"] = {
            str(win): {"n_entries": len(secure), "lon": dict(zip(("mu", "sigma", "n"), trunc_gauss(edl, win))),
                       "lat": dict(zip(("mu", "sigma", "n"), trunc_gauss(edb, win)))}
            for win in sorted({FIT_WINDOW.get(key, 50.0), 100.0})}
    # Sensitivity: include q3-4.
    dl34, db34 = resid([r for r in ident if r["inPlanisphere"]])
    out["incl_uncertain_q3_4"] = {"lon": summarise(dl34), "lat": summarise(db34)}
    # Trimmed: both components within 3 mad-sigma of the median.
    keep = (np.abs(dl - np.median(dl)) < 3 * mad_sigma(dl)) & (np.abs(db - np.median(db)) < 3 * mad_sigma(db))
    out["trimmed_3mad_rule"] = {"kept": int(keep.sum()), "lon": summarise(dl[keep]), "lat": summarise(db[keep])}
    # Against the editors' own reduction (their Dl, Db from Hipparcos).
    d1, d2 = dl - ed_dl, db - ed_db
    out["vs_editors_reduction"] = {} if not has_ed else {
        "lon_median": float(np.median(d1)), "lon_mad_sigma": mad_sigma(d1), "lon_max_abs": float(np.abs(d1).max()),
        "lat_median": float(np.median(d2)), "lat_mad_sigma": mad_sigma(d2), "lat_max_abs": float(np.abs(d2).max()),
        "frac_lon_within_1arcmin": float(np.mean(np.abs(d1) < 1)),
        "frac_lat_within_1arcmin": float(np.mean(np.abs(d2) < 1)),
    }
    # Offset expressed as an epoch shift (longitude only; rough, for context).
    out["median_lon_offset_as_years"] = float(np.median(dl)) / PRECESSION_ARCMIN_PER_YEAR
    # Longitude offset by 30-degree bin of recorded longitude.
    lon_rec = np.array([r["lon"] for r in scored])
    bins = []
    for b in range(12):
        m = (lon_rec >= 30 * b) & (lon_rec < 30 * b + 30)
        bins.append({"bin_deg": 30 * b, "n": int(m.sum()),
                     "median_dl": float(np.median(dl[m])) if m.any() else None,
                     "median_db": float(np.median(db[m])) if m.any() else None})
    out["by_longitude_bin"] = bins

    # Space motion: stars whose modelled motion displacement is large. All
    # distances here are on the sphere (longitude scaled by cos(latitude)).
    cb = np.cos(np.radians([r["lat"] for r in scored]))
    mo_l, mo_b = np.median(dl * cb), np.median(db)      # catalogue-wide offset, with motion
    so_l, so_b = np.median(dls * cb), np.median(dbs)    # catalogue-wide offset, without motion
    res_with = np.hypot(dl * cb - mo_l, db - mo_b)
    res_without = np.hypot(dls * cb - so_l, dbs - so_b)
    # Modelled shift (motion minus static) and recorded shift (recorded minus static,
    # offset removed). If the model is right and the catalogue sees the motion,
    # recorded = modelled.
    mod_x, mod_y = (dl - dls) * cb, db - dbs
    rec_x, rec_y = -(dls * cb - so_l), -(dbs - so_b)
    disp = np.hypot(mod_x, mod_y)
    for thr in (10, 5):
        m = disp >= thr
        if m.sum() < 3:
            continue
        out[f"motion_disp_ge_{thr}arcmin"] = {
            "n": int(m.sum()),
            "median_dist_with_motion": float(np.median(res_with[m])),
            "median_dist_without_motion": float(np.median(res_without[m])),
            "rms_dist_with_motion": float(np.sqrt(np.mean(res_with[m] ** 2))),
            "rms_dist_without_motion": float(np.sqrt(np.mean(res_without[m] ** 2))),
            "n_improved": int(np.sum(res_with[m] < res_without[m])),
        }
        # Three estimates of the slope of recorded shift on modelled shift, each with a
        # 95% interval from a bootstrap over stars (a star brings both components).
        idx = np.flatnonzero(m)
        thr_arcmin = 4 * mad_sigma(dl)  # 4 robust sigma of the longitude residuals

        def pooled(sel_idx):
            return (np.concatenate([mod_x[sel_idx], mod_y[sel_idx]]),
                    np.concatenate([rec_x[sel_idx], rec_y[sel_idx]]))

        def ols(sel_idx):
            X, Y = pooled(sel_idx)
            return float(np.sum(X * Y) / np.sum(X * X))

        def theil(sel_idx):
            X, Y = pooled(sel_idx)
            return float(stats.theilslopes(Y, X)[0])

        def trimmed(sel_idx):
            # Drops stars whose distance from the line recorded = modelled exceeds the threshold.
            # That is distance from the slope being tested, and the threshold was chosen after
            # seeing the untrimmed fits.
            keep = sel_idx[res_with[sel_idx] < thr_arcmin]
            return ols(keep)

        rng = np.random.default_rng(20261008)
        dropped = idx[res_with[idx] >= thr_arcmin]
        est = {}
        for name, fn in (("least_squares", ols), ("theil_sen", theil), ("trimmed_4sigma", trimmed)):
            boots = [fn(rng.choice(idx, size=len(idx), replace=True)) for _ in range(1000)]
            est[name] = {"slope": fn(idx), "ci95": [float(np.percentile(boots, 2.5)), float(np.percentile(boots, 97.5))]}
        est["trimmed_4sigma"]["n_kept"] = int(len(idx) - len(dropped))
        est["trimmed_4sigma"]["dropped"] = [
            {"hip": int(scored[i]["hip"]), "distance_from_line_arcmin": float(res_with[i]), "modelled_arcmin": float(disp[i])}
            for i in dropped]
        est["trimmed_4sigma"]["threshold_arcmin"] = float(thr_arcmin)
        # Leave-one-out range of the least-squares slope.
        loo = [ols(np.delete(idx, k)) for k in range(len(idx))]
        est["least_squares_leave_one_out_range"] = [float(min(loo)), float(max(loo))]
        worst = int(np.argmin(loo)) if ols(idx) > 1 else int(np.argmax(loo))
        est["largest_single_star_effect"] = {"hip": int(scored[idx[worst]]["hip"]), "slope_without_it": float(loo[worst])}
        out[f"motion_disp_ge_{thr}arcmin"]["slope_recorded_vs_modelled"] = est
    sel = disp >= 5
    out["motion_scatter_ge_5arcmin"] = {
        "hip": [int(r["hip"]) for r, s in zip(scored, sel) if s],
        "modelled_arcmin": [[round(float(a), 2), round(float(b), 2)] for a, b in zip(mod_x[sel], mod_y[sel])],
        "recorded_arcmin": [[round(float(a), 2), round(float(b), 2)] for a, b in zip(rec_x[sel], rec_y[sel])],
    }

    # Perspective term: stars where full space motion and proper-motion-only differ.
    pers = []
    for r in scored:
        gl = wrap(r["lonMotion"] - r["lonPmOnly"]) * 60
        gb = (r["latMotion"] - r["latPmOnly"]) * 60
        if math.hypot(gl * math.cos(math.radians(r["lat"])), gb) >= 1.0:
            pers.append({"hip": r["hip"], "entry": r["id"], "cst": r["cst"], "pm_mas_yr": r["pmMasYr"],
                         "distance_pc": r["distancePc"], "perspective_shift_arcmin": math.hypot(gl * math.cos(math.radians(r["lat"])), gb),
                         "resid_full": [wrap(r["lonMotion"] - r["lon"]) * 60, (r["latMotion"] - r["lat"]) * 60],
                         "resid_pm_only": [wrap(r["lonPmOnly"] - r["lon"]) * 60, (r["latPmOnly"] - r["lat"]) * 60]})
    out["perspective_ge_1arcmin"] = pers
    out["perspective_pm_only_vs_editors"] = None
    if has_ed:
        lp = np.array([wrap(r["lonPmOnly"] - r["lon"]) * 60 for r in scored]) - ed_dl
        bp = np.array([(r["latPmOnly"] - r["lat"]) * 60 for r in scored]) - ed_db
        out["perspective_pm_only_vs_editors"] = {"lon_max_abs": float(np.abs(lp).max()), "lat_max_abs": float(np.abs(bp).max())}

    halley = {}
    for nm, hip in HALLEY.items():
        for r in rows:
            if r["hip"] == hip and r["q"] in (1, 2) and r["inPlanisphere"]:
                halley.setdefault(nm, []).append({
                    "dl_with": wrap(r["lonMotion"] - r["lon"]) * 60, "db_with": (r["latMotion"] - r["lat"]) * 60,
                    "db_pm_only": (r["latPmOnly"] - r["lat"]) * 60,
                    "dl_without": wrap(r["lonStatic"] - r["lon"]) * 60, "db_without": (r["latStatic"] - r["lat"]) * 60,
                    "modelled_shift_lat": (r["latMotion"] - r["latStatic"]) * 60,
                    "entry": r["id"]})
    out["halley_stars"] = halley
    results[key] = out

json.dump(results, open(sys.argv[2], "w"), indent=1)
for k, v in results.items():
    if not v["vs_editors_reduction"]:
        print(k, v["untrimmed"]["lon"]["median"], v["untrimmed"]["lat"]["median"], v["untrimmed"]["lon"]["mad_sigma"]); continue
    print(k, v["counts"]["secure_and_in_planisphere_catalogue"], "median dl/db", round(v["untrimmed"]["lon"]["median"], 1), round(v["untrimmed"]["lat"]["median"], 1),
          "mad", round(v["untrimmed"]["lon"]["mad_sigma"], 1), round(v["untrimmed"]["lat"]["mad_sigma"], 1),
          "| fit", {a: round(b["sigma"], 1) for a, b in v["gauss_fit"].items()},
          "| vs editors", round(v["vs_editors_reduction"]["lon_mad_sigma"], 2), round(v["vs_editors_reduction"]["lat_mad_sigma"], 2), round(v["vs_editors_reduction"]["lon_max_abs"], 1))
