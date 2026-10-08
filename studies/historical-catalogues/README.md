# Planisphere against four historical star catalogues

Planisphere's README used to say its error numbers "quantify agreement with a
reference calculation using the same inputs, not accuracy of reconstructed
ancient skies". That was true and it left the main question open: does the
pipeline (space motion, then P03 precession, then the ecliptic of date) put
stars where people actually recorded them, two thousand years ago? Four
catalogues of measured positions survive in machine-readable form with
modern identifications, so this study runs the pipeline at each catalogue's
epoch and compares the result with the recorded longitude and latitude.

![Left: recorded against modelled stellar-motion shift. Right: robust scatter of the residuals for the four catalogues.](../../docs/assets/historical-catalogues-light.svg)

## What came out

- **Planisphere agrees with the editors' per-star reduction, and the
  published offsets are reproduced.** Against the editors' own per-star
  differences (their `Dl`, `Db` columns, computed from Hipparcos, which HYG
  derives from) planisphere differs by a robust sigma of 0.04 arcmin in both
  coordinates, at all four epochs. Five Ptolemy stars with proper motions of
  637 to 4,088 mas/yr are exceptions, by 1 to 19 arcmin (the largest is
  HIP 71681, alpha-2 Cen). Median residuals against the recorded positions
  (Ptolemy reduced to -128 as the editors do, then Ulugh Beg, Tycho,
  Hevelius; longitude / latitude, arcmin): +9.4 / +0.1, -11.7 / +7.4,
  -0.4 / -0.4, +0.1 / -1.3. The Gaussian offsets match the editors' published
  ones. The longitude widths are 10 to 20% wider than theirs, and the same
  fit gives the same widths on the editors' own columns, so that is the
  fitting. For Tycho and Hevelius the editors report widths of about
  2 arcmin; our window fit, and the same fit on their columns, gives 2.6 to
  3.0.
- **The scatter falls from about 30 arcmin to about 2.5 arcmin** between
  Ulugh Beg (1437) and Tycho (1601) and then stays there: robust sigma in
  longitude / latitude is 35.3 / 22.5 (Ptolemy), 29.7 / 16.3 (Ulugh Beg),
  2.8 / 2.3 (Tycho), 2.6 / 2.3 (Hevelius). The floor in the two modern-era
  catalogues is the catalogues' own, more than 50 times planisphere's 0.04.
- **Stellar motion is visible in the old observations; the intervals are
  wide.** Regressing recorded shift on modelled shift for the 94 Ptolemaic
  stars (reduced to -128) that planisphere says moved at least 10 arcmin
  gives 1.13 by least squares (95% bootstrap interval over stars, 0.74 to
  1.46), 0.94 by Theil-Sen (0.68 to 1.14) and 0.93 after dropping one star
  (0.71 to 1.09). That one star is HIP 71681, the same star planisphere and
  the editors disagree on; its recorded longitude is 3 degrees from either
  model. So the data are consistent with a slope of 1 and clearly not with
  0, but they do not fix the size of the motion better than roughly 0.7 to
  1.5. Tycho's six stars give 1.01 (0.89 to 1.14); Hevelius's six give 0.78
  (0.54 to 1.05).
- **Halley's three stars.** In Ptolemy, Sirius's latitude residual goes from
  -42.7 to +2.1 arcmin when motion is switched on. Arcturus does not
  improve: -38.9 without motion, +41.4 with it, because the model moves it
  80 arcmin and the recorded latitude is about 40 arcmin short of that.
  Aldebaran barely changes (-33.9 to -26.9; the model moves it 7 arcmin). In Tycho and Hevelius Sirius and Arcturus shrink clearly (Sirius -9.3 to -0.8 and -8.8 to -1.6, Arcturus -16.8 to -1.8 and -15.6 to -2.8); Aldebaran's modelled shift is about 1 arcmin and its residual does not change meaningfully.
- **No planisphere astronomy needed fixing.** What the comparison did expose
  is that the pipeline had no way to express a position in the ecliptic of
  date, which is how every old catalogue is written. This checkout adds
  `src/astro/ecliptic.ts` (P03 mean obliquity, equatorial to ecliptic), tested
  against pyerfa, and the README disclaimer is replaced by these numbers.

## Data and how it was chosen

Four catalogues, from the machine-readable editions of Verbunt and van
Gent, served by CDS Strasbourg (see References). All were fetched on
2026-10-08 by `fetch.py`; `manifest.json` has the URLs, byte counts and
SHA-256 of every file. The data files are not committed (`cache/` is
gitignored); the CDS terms are given under References.

| Catalogue | Edition | File | Entries | Epoch used |
|---|---|---|---|---|
| Ptolemy | Toomer (1998) | `ptolema.dat` | 1,028 | JD 1771298 (20 July 137, 137.58 as a Julian year) as printed; and JD 1674573 (24 Sept -128) after the editors' -2 deg 40 arcmin |
| Ulugh Beg | Knobel (1917) | `ulughbeg.dat` | 1,018 | JD 2246108 (1437) |
| Tycho Brahe | Kepler (1627), emended | `keplere.dat` | 1,007 | 1601.0 |
| Hevelius | 1690 | `hevelius.dat` | 1,564 | 1661.0 |

Epochs for Ulugh Beg, Tycho and Hevelius are taken from each ReadMe. The
Ptolemy convention is not: the ReadMe note on `ptolema.dat` says the
longitudes are "assumed Equinox=-128", but the file's longitudes are the
printed ones. What fixes the convention is Verbunt & van Gent (2012), sect.
2.1 and 3, which state that Ptolemy's longitudes refer to AD 137 and that
the editors subtract 2 deg 40 arcmin to bring them to the epoch of
Hipparchus (-128) before comparing, and the check that planisphere then
reproduces their `Dl` to 0.04 arcmin (it does not without the subtraction).
Both versions are scored below. The Tycho `variant.dat` file and the
cross-reference columns are not used.

**Which entries are scored.** The editors' identification flag `I` (1 = secure
and nearest star, 2 = secure though not nearest, 3 = probable, 4 = possible,
5 = not identified, 6 = repeated entry). Scored: flags 1 and 2 only. Not
scored, with counts from `results.json`. The columns are disjoint (an entry
is counted in the first that applies, left to right) and each row sums to
its entry count:

| | Entries | Flag 6 | Flag 5 | No position or no Hipparcos number (not flagged 5 or 6) | Flags 3-4 | Flags 1-2 | Of those, in planisphere's star file (scored) |
|---|---|---|---|---|---|---|---|
| Ptolemy | 1,028 | 3 | 1 | 3 | 15 | 1,006 | 978 |
| Ulugh Beg | 1,018 | 0 | 3 | 3 | 15 | 997 | 964 |
| Tycho | 1,007 | 15 | 14 | 2 | 35 | 941 | 898 |
| Hevelius | 1,564 | 13 | 16 | 21 | 27 | 1,487 | 1,361 |

The last column is limited by planisphere's own star file, which holds
2,865 stars to magnitude 5.5 (HYG v4.1). The secure entries not scored
(28, 33, 43 and 126) are mostly fainter than that, but some bright
identified stars are simply absent from the file: by the editors' Hipparcos
magnitudes, 8, 9, 9 and 24 of them are V 5.5 or brighter. Scoring flags 3-4
too moves no median by more than 0.3 arcmin and no robust sigma by more
than 0.5 arcmin (`incl_uncertain_q3_4` in `results.json`); the rms moves
more, because a few uncertain entries are far off.

## The measure

For each scored entry, `reduce.mjs` takes the star from planisphere's
`public/data/stars.json`, runs the production code (`positionAtEpoch`:
space motion with HYG distance and radial velocity, then precession), and
rotates the result by the P03 mean obliquity of date into longitude and
latitude of the mean ecliptic and equinox of date. Time is Julian years of
365.25 days from J2000, as in the app. The residual is computed minus
recorded, in arcmin, the editors' sign convention (Hipparcos minus
catalogue). Longitude residuals are plain differences in lambda, as the
editors give them. The same star is also run with motion removed
(precession of the J2000 position alone) and with proper motion only (no
parallax or radial velocity).

`analyze.py` reports medians, a robust sigma (1.4826 times the median
absolute deviation), the fractions beyond 10, 60 and 150 arcmin, and a
maximum-likelihood Gaussian fit truncated to a window around zero. It is
untrimmed throughout. Where a trimmed figure appears it says so and the rule
is: drop an entry if either component is more than 3 robust sigma from its median (`trimmed_3mad_rule`), or, for the motion slopes, if its distance from the line recorded = modelled exceeds 4 robust sigma of the longitude residuals. The 4 sigma threshold was chosen after seeing the untrimmed fits, and because it removes points by their distance from the line being tested it pulls the slope toward 1; the trimmed slopes are reported beside the untrimmed and robust ones, not instead of them.

## Results

Untrimmed residuals, arcmin, flags 1-2, stars in planisphere's catalogue.

| Catalogue (epoch) | n | Median lon | Median lat | Robust sigma lon | Robust sigma lat | > 60 arcmin | > 150 arcmin |
|---|---|---|---|---|---|---|---|
| Ptolemy, as printed (AD 137) | 978 | +69.3 | -0.2 | 34.6 | 22.9 | 64% / 7% | 6% / 1% |
| Ptolemy, -2d40m (-128) | 978 | +9.4 | +0.1 | 35.3 | 22.5 | 16% / 8% | 3% / 1% |
| Ulugh Beg (1437) | 964 | -11.7 | +7.4 | 29.7 | 16.3 | 9% / 2% | 1% / 0% |
| Tycho (1601) | 898 | -0.4 | -0.4 | 2.8 | 2.3 | 2% / 1% | 0% / 0% |
| Hevelius (1661) | 1,361 | +0.1 | -1.3 | 2.6 | 2.3 | 1% / 0% | 0% / 0% |

(Fractions are longitude / latitude.) Gaussian fits, which is what the
editors report, compared with their text:

| | Window | Ours: offset, sigma, lon | Ours: offset, sigma, lat | Editors (A&A 544, A31) |
|---|---|---|---|---|
| Ptolemy -128 | +/-50 arcmin | +8.3, 29.9 | +0.7, 22.6 | text: offset about 9 (lon), +0.3 (lat); sigma 27 / 23 (also in the abstract) |
| Ptolemy -128 | +/-100 arcmin | +9.8, 34.6 | -0.1, 28.4 | text: offset about 7, sigma 30 (lon); offset -0.7, sigma 29 (lat) |
| Ulugh Beg | +/-50 arcmin | -11.3, 26.5 | +6.8, 17.7 | text: same offsets as the 100 window; sigma 22 (lon) and, in the abstract, 18 (lat) |
| Ulugh Beg | +/-100 arcmin | -12.0, 29.9 | +7.4, 20.9 | text: offset about -10, sigma about 26 (lon); offset about +7, sigma 21 (lat) |

The editors' offsets match ours, and so do the latitude sigmas (within 0.6 arcmin). Our longitude sigmas run 3 to 5 arcmin (10 to 20%) wider than theirs. This is
not the pipeline: per star we agree with their `Dl`, `Db` to 0.04 arcmin, and
running our fit on the editors' own `Dl`, `Db` columns for every flag 1-2
entry gives the same widths we get (Ptolemy 30.0 and 34.9 for the 50 and 100
arcmin windows, Ulugh Beg 26.6 and 30.2; `gauss_fit_on_editors_columns` in
`results.json`). So the difference is in how the fit is done (they fit
histograms by Poisson maximum likelihood; we fit the individual residuals,
truncated to a window centred on zero), and we did not reproduce their
procedure further. For Tycho and Hevelius the editors give widths of about 2 arcmin (abstracts). Our robust sigma is 2.3 to 2.8; a Gaussian fit in a +/-10 arcmin window (our choice) gives 2.9 / 2.6 and 2.9 / 2.6, and the same fit on the editors' own columns 3.0 / 2.7 and 3.0 / 2.7, so the stated 2 arcmin is narrower than anything we can get from their data with this fit.

Ptolemy as printed, at AD 137, gives a median longitude residual of +69.3 arcmin, about 1.2 degrees. That is the "about 1 degree too small" the paper
describes (sect. 2.1); our figure is not an independent measurement of it.
The paper's own explanation set (copying from Hipparchus with a wrong
precession correction, or a zero point error) is not something this data
can adjudicate. Median longitude residual by 30-degree longitude bin
(`by_longitude_bin`) runs from about -12 to +34 arcmin for Ptolemy at -128,
and from -37 to +4 for Ulugh Beg: both catalogues have a trend with
longitude, which the paper also reports.

**Against the editors' own reduction** (stars scored, per-star difference of
computed residual minus their `Dl`/`Db`):

| | Median diff lon / lat | Robust sigma lon / lat | Largest |diff| lon / lat | Entries differing by more than 1 arcmin |
|---|---|---|---|---|
| Ptolemy -128 | -0.02 / 0.00 | 0.04 / 0.04 | 13.0 / 19.1 | 5 |
| Ulugh Beg | 0.02 / 0.00 | 0.04 / 0.04 | 0.7 / 0.2 | 0 |
| Tycho | 0.01 / 0.00 | 0.04 / 0.04 | 0.3 / 0.1 | 0 |
| Hevelius | 0.01 / 0.00 | 0.04 / 0.04 | 0.6 / 0.1 | 0 |

The five Ptolemy entries are the stars with the largest proper motion
(637 to 4,088 mas/yr; HIP 96100, 89937, 102422, 19849 and 71681, the last, HIP 71681 (alpha-2 Cen), at 3,710 mas/yr and a 19 arcmin difference). Planisphere carries
HYG's distance and radial velocity; removing them (proper motion only) moves
only two of the five, so the difference is not the perspective term. Linear
extrapolation in the editors' code is a likely cause but the paper does not
say how they propagate, and we did not determine it. The recorded
positions cannot decide between the two: for HIP 71681 the longitude residual is -177 arcmin with the full model and -170 with proper motion only.

### Does the motion model earn its keep?

Stars whose modelled motion between J2000 and the catalogue epoch is at
least 10 arcmin (5 arcmin in parentheses). "Distance" is the angular
distance between the computed and recorded position after removing the
catalogue's median offset, with and without space motion.

| Catalogue | n | Median distance, motion off / on | Rms distance, off / on | Entries improved |
|---|---|---|---|---|
| Ptolemy -128 | 94 (215) | 33.8 / 29.6 (30.8 / 29.7) | 53.8 / 40.0 (52.2 / 46.2) | 57 (119) |
| Ulugh Beg | 13 (37) | 28.4 / 18.3 (22.6 / 19.4) | 35.7 / 29.5 (33.4 / 30.5) | 9 (22) |
| Tycho | 6 (25) | 16.1 / 2.2 (9.1 / 3.3) | 19.1 / 4.8 (19.6 / 17.9) | 5 (20) |
| Hevelius | 6 (19) | 13.7 / 3.2 (8.1 / 2.6) | 16.3 / 7.4 (10.8 / 4.6) | 5 (17) |

The slope regresses the recorded shift (recorded position minus the static
prediction, catalogue offset removed) on the modelled shift (motion on minus
motion off), both components pooled, longitude scaled by cos(latitude). If
the model is right and the catalogue sees the motion, the slope is 1. Three
estimates, each with a 95% interval from 1,000 bootstrap resamples over
stars (a star carries both components, so stars, not components, are
resampled; seed in `analyze.py`):

| Catalogue | Modelled shift at least (arcmin) | Stars | Least squares | Theil-Sen | Trimmed at 4 sigma |
|---|---|---|---|---|---|
| Ptolemy -128 | 10 | 94 | 1.13 (0.74 to 1.46) | 0.94 (0.68 to 1.14) | 0.93 (0.71 to 1.09); 93 kept, dropped: 71681 |
| Ptolemy -128 | 5 | 215 | 1.11 (0.75 to 1.44) | 0.99 (0.73 to 1.22) | 0.95 (0.76 to 1.09); 212 kept, dropped: 68895, 61084, 71681 |
| Ulugh Beg | 10 | 13 | 1.18 (0.61 to 1.95) | 1.26 (0.41 to 2.80) | 1.18 (0.68 to 1.93); 13 kept, dropped: none |
| Ulugh Beg | 5 | 37 | 1.19 (0.69 to 1.85) | 1.02 (0.38 to 1.95) | 1.19 (0.64 to 1.88); 37 kept, dropped: none |
| Tycho | 10 | 6 | 1.01 (0.89 to 1.14) | 1.05 (0.73 to 1.19) | 1.01 (0.87 to 1.14); 6 kept, dropped: none |
| Tycho | 5 | 25 | 0.78 (0.17 to 1.05) | 1.01 (0.80 to 1.16) | 1.03 (0.94 to 1.14); 22 kept, dropped: 46853, 7918, 64394 |
| Hevelius | 10 | 6 | 0.78 (0.54 to 1.05) | 0.80 (0.37 to 1.07) | 0.90 (0.80 to 1.14); 5 kept, dropped: 5336 |
| Hevelius | 5 | 19 | 0.82 (0.64 to 1.02) | 0.95 (0.76 to 1.11) | 0.91 (0.82 to 1.06); 18 kept, dropped: 5336 |

Theil-Sen is the median of pairwise slopes (scipy, with an intercept). The
trimmed column drops stars whose distance from the line recorded = modelled
exceeds 4 robust sigma of the catalogue's longitude residuals (141 arcmin for
Ptolemy, 119 for Ulugh Beg, 11 for Tycho, 10 for Hevelius). That rule
removes points by their distance from the slope being tested, and the
threshold was chosen after seeing the untrimmed fits, so the trimmed slope
is pulled toward 1 and its interval (which re-applies the rule in each
resample) is not a clean test; read it as a sensitivity check.

What the intervals support: every interval includes 1, and the Ptolemy and
Tycho (10 arcmin) ones exclude 0 by a wide margin. The Ptolemy least-squares
slope of 1.13 is carried by one star: leave-one-out gives 0.93 to 1.18, and
the low end is dropping HIP 71681 (alpha-2 Cen, modelled shift 128 arcmin,
recorded longitude about 3 degrees off), the same star on which planisphere
and the editors disagree by 19 arcmin. The Tycho 5 arcmin least-squares
0.78 is likewise pulled by HIP 46853 and 7918, whose recorded positions are
65 and 55 arcmin from the line (a copying or computing error in the
catalogue, in the editors' terms; they are not removed from the
untrimmed numbers). Hevelius's 0.78 (six stars) drops to 0.90 without
HIP 5336 (mu Cas). Ulugh Beg's 13 and 37 stars give intervals from about
0.4 to 2.8.

The per-star view is weaker for Ptolemy: 57 of 94 stars end up closer with
motion on (61%), because a 30 arcmin catalogue scatter hides most
individual shifts. For Tycho and Hevelius, whose scatter is 2.5 arcmin, the
fast stars are plainly better with motion on (median distance 16.1 to 2.2
and 13.7 to 3.2 arcmin in the 10 arcmin sets).

## Halley

Halley published in 1718 (Philosophical Transactions) that Sirius,
Aldebaran and Arcturus had shifted against the background stars since
antiquity, usually named as the first recorded finding of proper motion
([ATNF education page](https://www.atnf.csiro.au/outreach/education/senior/astrophysics/proper_motion.html));
one popular account says he compared his own positions with the Almagest and
Hipparchus's catalogue and found these three stars differed in latitude
([Koberlein](https://briankoberlein.com/blog/even-the-stars-move/)). Both
are secondary sources; we did not read Halley's paper, and we did not match
his numbers. We picked these three stars because they are Halley's three, not by looking at the residuals. What we can show is what planisphere's model does to them in each catalogue (latitude residual, arcmin, flags 1-2):

| Star (entry) | Ptolemy off / on | Ulugh Beg off / on | Tycho off / on | Hevelius off / on | Modelled latitude shift, Ptolemy |
|---|---|---|---|---|---|
| Sirius | -42.7 / +2.1 | -10.5 / +1.4 | -9.3 / -0.8 | -8.8 / -1.6 | 44.8 |
| Arcturus | -38.9 / +41.4 | -31.8 / -10.5 | -16.8 / -1.8 | -15.6 / -2.8 | 80.3 |
| Aldebaran | -33.9 / -26.9 | -17.3 / -15.4 | -0.1 / +1.3 | -1.4 / -0.3 | 7.0 |

Without motion, the three stars sit 34 to 43 arcmin from the Ptolemaic
position in latitude, against a latitude scatter of 22.5 arcmin for the whole
catalogue: each is a 1.5 to 1.9 sigma miss, and three in the same direction is the pattern (a post-hoc pattern in three stars, not a test). With motion, Sirius lands on its recorded latitude; Arcturus
overshoots by as much as it undershot; Aldebaran's motion is too small
(7 arcmin) to account for its 34. The Ptolemaic latitude of Arcturus is
within 2 sigma of both predictions, so the old catalogue alone cannot say
which is nearer. In Ulugh Beg, Tycho and Hevelius, Sirius and Arcturus are closer with motion on.

## What was wrong and what changed

Nothing in the astronomy. The comparison would have exposed an error in the
obliquity of date, the ecliptic frame, the epoch handling or the order of
motion and precession; a wrong obliquity alone would show as a longitude
trend with a different shape and an offset that the editors' tables do not
have. Agreement at 0.04 arcmin per star with the editors' reduction at four epochs between -128 and 1661 rules those out for the ordinary stars.

The change is a missing piece, not a fix: planisphere could only produce
equatorial positions, and every old catalogue is ecliptic. `src/astro/ecliptic.ts`
adds the P03 mean obliquity (checked against pyerfa's `obl06` to 4 decimals of an arcsecond) and the equatorial-to-ecliptic rotation, with
`tests/astro/ecliptic.test.ts` against pyerfa positions at the catalogue
epochs. It is not used by the app yet; the study scripts call it. The README's
accuracy section now carries these results in place of the disclaimer.

## What is left

- The five high-proper-motion stars where we differ from the editors by more
  than 1 arcmin. Either the editors or planisphere propagate such stars
  differently; this data cannot say which is nearer the sky.
- Hevelius's least-squares motion slope below 1, which rests on six to nineteen stars.
- Fainter stars. Planisphere's catalogue stops at magnitude 5.5, so the
  identified faint stars (126 of Hevelius's 1,487 secure entries) are not
  scored. The same method with the full Hipparcos catalogue would score them.
- ERFA's `pmat06` precession differs from planisphere's three-angle
  rotation by 9.4 arcsec at the far millennia (README, Accuracy). That is
  invisible against a 2 arcmin catalogue; it is not tested here.

## What this does not show

- It does not show that the app draws the ancient sky as people saw it:
  nothing here tests horizon, refraction, atmospheric clarity, or whether a
  star was visible. It shows that star positions in ecliptic coordinates at
  four epochs agree with what four catalogues recorded.
- The yardstick is the editors' identifications and editions, with their
  flags 1-2. Different identifications would give different residuals. We
  did not check any identification ourselves. The editors also apply proper
  motion to the Hipparcos positions before they look for the nearest star
  (A&A 544, A31, sect. 3), so their secure identifications are not
  independent of a motion model. For Ptolemy, where the scatter is 30 arcmin
  and the shifts are tens of arcmin, that pulls the recorded-against-modelled
  slope toward 1; we cannot say by how much.
- Agreement with the editors' reduction (0.04 arcmin robust sigma) shows that the two pipelines are equivalent for ordinary stars, on the same Hipparcos-derived data; it is not an independent measurement. It does not test the
  Hipparcos data itself: planisphere's inputs are HYG v4.1, whose own provenance was not checked here.
- The Ptolemy and Ulugh Beg scatters are dominated by the astronomers'
  measurements, so they say nothing about planisphere's own accuracy beyond
  the 0.04 arcmin per-star agreement. For Tycho and Hevelius the figure is
  2.3 to 2.8 arcmin and is the catalogue's.
- Time scale: epochs are Julian years used as TT, with no delta T
  correction. The effect is negligible here: precession is 50.3 arcsec a
  year, so even a whole day of delta T would move a longitude by 0.14
  arcsec, 0.002 arcmin, against catalogue scatter of 2 arcmin or more.
- Four catalogues are four points. The fall in scatter between 1437 and
  1601 is large; we do not offer a fit.
- Hevelius's least-squares slopes are below 1 (0.78, 0.82); the intervals include 1 and we did not look for a cause.
- Halley's account is from two secondary web pages and we did not match
  his numbers.

## Reproduce

```sh
cd planisphere && npm ci
python3 -I studies/historical-catalogues/fetch.py          # downloads cache/ (about 0.5 MB), rewrites manifest.json
uv venv /tmp/planisphere-study && uv pip install --python /tmp/planisphere-study/bin/python numpy scipy
studies/historical-catalogues/run.sh /tmp/planisphere-study-scratch /tmp/planisphere-study/bin/python
```

`run.sh` compiles `src/astro` to the scratch directory with `tsc`, parses the
four catalogues (`parse.py`), runs planisphere's pipeline (`reduce.mjs`),
scores it (`analyze.py`, writing `results.json`) and draws the figure
(`plot.py`, writing `docs/assets/historical-catalogues-light.svg` and
`-dark.svg`). The comparison with pyerfa that backs `tests/fixtures/ecliptic.oracle.json`
used `erfa.obl06` and `erfa.pmat06` in a throwaway venv.

## References and licences

- Verbunt, F. & van Gent, R. H. (2012), The star catalogues of Ptolemaios
  and Ulugh Beg, A&A 544, A31. https://arxiv.org/abs/1206.0628 ; data
  https://cdsarc.cds.unistra.fr/ftp/J/A+A/544/A31/
- Verbunt, F. & van Gent, R. H. (2010), Three editions of the star catalogue
  of Tycho Brahe, A&A 516, A28. Data
  https://cdsarc.cds.unistra.fr/ftp/J/A+A/516/A28/
- Verbunt, F. & van Gent, R. H. (2010), The star catalogue of Hevelius, A&A
  516, A29. Data https://cdsarc.cds.unistra.fr/ftp/J/A+A/516/A29/
- CDS/VizieR terms: data are free to use in a scientific context if the
  original authors and publication are cited
  (https://cds.unistra.fr/vizier-org/licences_vizier.html). The catalogue
  ReadMe files carry no separate licence. The catalogues are not
  redistributed here; `manifest.json` pins them.
- HYG v4.1 star data: CC BY-SA 4.0, as already used by planisphere.
- Capitaine, Wallace & Chapront (2003), A&A 412, 567 (P03 obliquity and
  precession), via pyerfa (ERFA) for the cross-check.
- Halley sources: see the Halley section.
