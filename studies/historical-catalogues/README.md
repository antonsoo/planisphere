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

- **The pipeline reproduces the published results for all four catalogues.**
  For Ptolemy (reduced to -128 as the editors do) the median longitude
  residual is +9.4 arcmin and the latitude residual +0.1; for Ulugh Beg
  -11.7 and +7.4; for Tycho -0.4 and -0.4; for Hevelius +0.1 and -1.3.
  Offsets and widths agree with the editors' own tables (see the results
  table). Against the editors' per-star differences (their `Dl`, `Db`
  columns, computed from Hipparcos), planisphere differs by a robust sigma of
  0.04 arcmin in both coordinates, at all four epochs. At 2,100 years that is
  the sum of precession, obliquity of date and space motion, and it holds.
- **The scatter falls from about 30 arcmin to about 2.5 arcmin** between
  Ulugh Beg (1437) and Tycho (1601) and then stays there: robust sigma in
  longitude / latitude is 35.3 / 22.5 (Ptolemy), 29.7 / 16.3 (Ulugh Beg),
  2.8 / 2.3 (Tycho), 2.6 / 2.3 (Hevelius). The floor in the two modern-era
  catalogues is the catalogues' own, more than 50 times planisphere's 0.04.
- **Stellar motion is visible in the old observations, and the model gets its
  size right.** Over the 94 stars in Ptolemy's catalogue (reduced to -128)
  that planisphere says moved at least 10 arcmin, the recorded displacement
  is 1.13 +/- 0.09 times the modelled one (0.93 +/- 0.09 after dropping one
  entry more than 4 sigma off). Tycho's six stars with at least 10 arcmin of
  modelled motion give 1.01 +/- 0.08; Hevelius's six give 0.78 +/- 0.10 (0.90
  +/- 0.06 after the same rule).
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
| Ptolemy | Toomer (1998) | `ptolema.dat` | 1,028 | AD 137 as printed; and JD 1674573 (24 Sept -128) after the editors' -2 deg 40 arcmin |
| Ulugh Beg | Knobel (1917) | `ulughbeg.dat` | 1,018 | JD 2246108 (1437) |
| Tycho Brahe | Kepler (1627), emended | `keplere.dat` | 1,007 | 1601.0 |
| Hevelius | 1690 | `hevelius.dat` | 1,564 | 1661.0 |

Epochs and the Ptolemy convention are taken from each ReadMe and from
Verbunt & van Gent (2012), sect. 2.1 and 3, which states that the longitudes
in Ptolemy's catalogue refer to AD 137 and that the editors subtract
2 deg 40 arcmin to bring them to the epoch of Hipparchus (-128) before
comparing. Both versions are scored below. The Tycho `variant.dat` file and
the Ptolemy/Ulugh Beg/Hevelius cross-reference columns are not used.

**Which entries are scored.** The editors' identification flag `I` (1 = secure
and nearest star, 2 = secure though not nearest, 3 = probable, 4 = possible,
5 = not identified, 6 = repeated entry). Scored: flags 1 and 2 only. Not
scored, with counts from `results.json`:

| | Entries | No position or no Hipparcos number | Flag 5 | Flag 6 | Flags 3-4 | Flags 1-2 | Of those, in planisphere's catalogue (scored) |
|---|---|---|---|---|---|---|---|
| Ptolemy | 1,028 | 4 | 1 | 3 | 15 | 1,006 | 978 |
| Ulugh Beg | 1,018 | 6 | 3 | 0 | 15 | 997 | 964 |
| Tycho | 1,007 | 17 | 14 | 15 | 35 | 941 | 898 |
| Hevelius | 1,564 | 37 | 16 | 13 | 27 | 1,487 | 1,361 |

The last column is limited by planisphere's own star file, which holds stars
to magnitude 5.5 (HYG v4.1, 2,865 stars). Fainter identified stars are not
scored (28, 33, 43 and 126 secure entries). Scoring flags 3-4 too moves no median by more than 0.3 arcmin and no robust sigma by more than 0.5 arcmin (`incl_uncertain_q3_4`
in `results.json`); the rms moves more, because a few uncertain entries are
far off.

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
is: drop an entry if either component is more than 3 robust sigma from its
median (`trimmed_3mad_rule`), or, for the motion slopes, if its distance
after motion exceeds 4 robust sigma.

## Results

Untrimmed residuals, arcmin, flags 1-2, stars in planisphere's catalogue.

| Catalogue (epoch) | n | Median lon | Median lat | Robust sigma lon | Robust sigma lat | > 60 arcmin | > 150 arcmin |
|---|---|---|---|---|---|---|---|
| Ptolemy, as printed (AD 137) | 978 | +68.8 | -0.2 | 34.6 | 22.9 | 63% / 7% | 6% / 1% |
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

The editors' offsets match ours, and so do the latitude sigmas (within 0.6
arcmin). Our longitude sigmas run 3 to 5 arcmin wider than theirs. This is
not the pipeline: per star we agree with their `Dl`, `Db` to 0.04 arcmin, and
running our fit on the editors' own `Dl`, `Db` columns for every flag 1-2
entry gives the same widths we get (Ptolemy 30.0 and 34.9 for the 50 and 100
arcmin windows, Ulugh Beg 26.6 and 30.2; `gauss_fit_on_editors_columns` in
`results.json`). So the difference is in how the fit is done (they fit
histograms by Poisson maximum likelihood; we fit the individual residuals,
truncated to a window centred on zero), and we did not reproduce their
procedure further.

Ptolemy as printed, at AD 137, gives a median longitude residual of +68.8
arcmin, about 1.1 degrees. That is the "about 1 degree too small" the paper
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

| Catalogue | n | Median distance, motion off / on | Rms distance, off / on | Entries improved | Slope recorded / modelled |
|---|---|---|---|---|---|
| Ptolemy -128 | 94 (215) | 33.8 / 29.6 (30.8 / 29.7) | 53.8 / 40.0 (52.2 / 46.2) | 57 (119) | 1.13 +/- 0.09 (1.11 +/- 0.10) |
| Ulugh Beg | 13 (37) | 28.4 / 18.3 (22.6 / 19.4) | 35.7 / 29.5 (33.4 / 30.5) | 9 (22) | 1.18 +/- 0.34 (1.19 +/- 0.31) |
| Tycho | 6 (25) | 16.1 / 2.2 (9.1 / 3.3) | 19.1 / 4.8 (19.6 / 17.9) | 5 (20) | 1.01 +/- 0.08 (0.78 +/- 0.24) |
| Hevelius | 6 (19) | 13.7 / 3.2 (8.1 / 2.6) | 16.3 / 7.4 (10.8 / 4.6) | 5 (17) | 0.78 +/- 0.10 (0.82 +/- 0.05) |

The slope regresses the recorded shift (recorded position minus the static
prediction) on the modelled shift (motion on minus motion off), both
components of both coordinates pooled, longitude scaled by cos(latitude).
The quoted uncertainty is the ordinary least-squares standard error and
assumes the residuals are independent and equal in size, which is rough;
read it as a guide. After the 4-sigma rule the slopes are: Ptolemy 0.93 and
0.95 (n 93 and 212), Tycho 1.03 +/- 0.06 for the 5 arcmin set (22 stars; two
Tycho entries are 40 to 60 arcmin off and own most of the drag in the
untrimmed 0.78), Hevelius 0.90 and 0.91 (n 5 and 18). Ulugh Beg is
unchanged. Hevelius's untrimmed slopes sit below 1 beyond their stated
errors (0.78, 0.82); two stars (mu Cas, HIP 5336, and HIP 104214 in Cygnus, whose
modelled shifts are 21 and 29 arcmin and whose recorded ones are 9 and 22)
account for much of it, and we did not look for a cause.

For Ptolemy the effect is clear in the pooled slope (about 12 standard
errors from zero) and modest in the per-star view: 57 of 94 stars end up
closer with motion on, 61%, because a 30 arcmin catalogue scatter hides most
individual shifts. For Tycho and Hevelius, whose scatter is 2.5 arcmin, the
fast stars are plainly better with motion on.

## Halley

Halley published in 1718 (Philosophical Transactions) that Sirius,
Aldebaran and Arcturus had shifted against the background stars since
antiquity, usually named as the first recorded finding of proper motion
([ATNF education page](https://www.atnf.csiro.au/outreach/education/senior/astrophysics/proper_motion.html));
one popular account says he compared his own positions with the Almagest and
Hipparchus's catalogue and found these three stars differed in latitude
([Koberlein](https://briankoberlein.com/blog/even-the-stars-move/)). Both
are secondary sources; we did not read Halley's paper, and we did not match
his numbers. What we can show is what planisphere's model does to those three
stars in each catalogue (latitude residual, arcmin, flags 1-2):

| Star (entry) | Ptolemy off / on | Ulugh Beg off / on | Tycho off / on | Hevelius off / on | Modelled latitude shift, Ptolemy |
|---|---|---|---|---|---|
| Sirius | -42.7 / +2.1 | -10.5 / +1.4 | -9.3 / -0.8 | -8.8 / -1.6 | 44.8 |
| Arcturus | -38.9 / +41.4 | -31.8 / -10.5 | -16.8 / -1.8 | -15.6 / -2.8 | 80.3 |
| Aldebaran | -33.9 / -26.9 | -17.3 / -15.4 | -0.1 / +1.3 | -1.4 / -0.3 | 7.0 |

Without motion, the three stars sit 34 to 43 arcmin from the Ptolemaic
position in latitude, against a latitude scatter of 22.5 arcmin for the whole
catalogue: each is a 1.5 to 1.9 sigma miss, and three in the same direction
is the pattern. With motion, Sirius lands on its recorded latitude; Arcturus
overshoots by as much as it undershot; Aldebaran's motion is too small
(7 arcmin) to account for its 34. The Ptolemaic latitude of Arcturus is
within 2 sigma of both predictions, so the old catalogue alone cannot say
which is nearer. In Ulugh Beg, Tycho and Hevelius, Sirius and Arcturus are closer with motion on.

## What was wrong and what changed

Nothing in the astronomy. The comparison would have exposed an error in the
obliquity of date, the ecliptic frame, the epoch handling or the order of
motion and precession; a wrong obliquity alone would show as a longitude
trend with a different shape and an offset that the editors' tables do not
have. Agreement at 0.04 arcmin per star with an independent reduction at four
epochs between -128 and 1661 rules those out for the ordinary stars.

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
- Hevelius's motion slope below 1, which rests on six to nineteen stars.
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
  flags 1-2. Different identifications would give different residuals.
  We did not check any identification ourselves.
- Agreement with the editors' reduction (0.04 arcmin) shows that the two
  pipelines are equivalent for ordinary stars. It does not test the
  Hipparcos data itself: planisphere's inputs are HYG v4.1, whose own provenance was not checked here.
- The Ptolemy and Ulugh Beg scatters are dominated by the astronomers'
  measurements, so they say nothing about planisphere's own accuracy beyond
  the 0.04 arcmin per-star agreement. For Tycho and Hevelius the figure is
  2.3 to 2.8 arcmin and is the catalogue's.
- Time scale: epochs are Julian years used as TT, with no delta T
  correction for the Earth's rotation. We did not evaluate its effect.
- Four catalogues are four points. The fall in scatter between 1437 and
  1601 is large; we do not offer a fit.
- Some Hevelius slopes are below 1 and we did not explain them.
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
