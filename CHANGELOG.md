# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- Stellar motion now propagates a Cartesian space vector before precession,
  retaining HYG distance and radial velocity when available. The previous
  RA/Dec addition clamped pole crossings and misplaced 61 Cyg by about 0.89
  degrees at 3000 BCE. The new model agrees with ERFA within 0.26 arcsecond
  over 20,055 sampled catalogue positions; this measures model agreement,
  not historical observational accuracy.
- Missing or dubious HYG distances remain unknown. Zero radial velocities
  are preserved without claiming they are measured zero. Catalogue generation
  now verifies a pinned source revision and SHA-256.

### Added

- `src/astro/ecliptic.ts`: P03 mean obliquity of date and equatorial to
  ecliptic conversion, tested against pyerfa. Not used by the app yet.
- `studies/historical-catalogues`: planisphere's pipeline compared with the
  Ptolemy, Ulugh Beg, Tycho Brahe and Hevelius catalogues (Verbunt and van
  Gent editions). It reproduces the editors' reduction to 0.04 arcminute per
  star and sees stellar motion in the old observations (recorded/modelled
  displacement 1.13 +/- 0.09 for 94 Ptolemaic stars). Scripts, pinned
  manifest, results and figures; the data files are not committed.
- Catalogue search by name, designation, constellation, HIP or HYG ID;
  coordinates before and after motion and precession; explicit motion inputs
  and model limits; downloadable JSON evidence tied to the chart settings.
- Lift/replace the paper holder and locate a selected star. The finder
  distinguishes geometric altitude, magnitude filtering, the hub and supports,
  and stars outside this latitude's sky field. A visible-time action searches
  the instrument's quarter-hour settings. Inspection marks stay out of prints.
- Reproducible catalogue-wide ERFA comparison, retained regression fixtures,
  and production-browser checks of evidence versus the actual SVG and cutouts.

## [0.3.0] - 2026-10-04

### Fixed

- The printed date scale was unlabeled and covered by the larger holder; the
  cut horizon also removed the material needed for the center pivot. A 192 mm
  wheel now exposes its date rim around a 160 mm holder. Two real window
  cutouts retain a connected hub and supports, and the preview is opaque.
- Exports now honor bright-star names and share the preview's physical artwork.
  Constellation segments, star discs, and labels stay inside the sky field.
- Dragging changes local mean time and its readouts, with no hidden offset left
  after other settings change. Pointer seam crossings and cancellations are handled.
- Invalid date drafts keep the last valid chart and disable downloads. Catalogue
  HTTP, JSON, schema, endpoint, size, and timeout failures have working retry;
  pending requests can be restarted without stale results winning.
- Equatorial horizon construction is a half-disc verified against altitude.
  The epoch slider's lower bound now correctly reads 3000 BCE, not 3001 BCE.
- Night-theme controls and narrow-screen range inputs remain readable and fit.

### Added

- Daily marks for the selected Gregorian year, including leap day; month/day
  labels, 24 hour labels, quarter-hour ticks, compass letters, catalogue credits,
  and a 50 mm print calibration bar.
- Keyboard time steps, a sky-detail view, and saved theme preference. Native
  two-finger page zoom remains available over the chart.
- Production Chromium/Firefox workflows and reviewed print-download examples,
  with an updated assembly and local-mean-time conversion guide.

## [0.2.1] - 2026-10-02

### Changed

- The page's fonts are served by the page itself. They came from Google Fonts,
  the one request the page made to another origin; the same font files (every
  subset, as Google serves them to a current browser) are now in
  `src/fonts/`, with their SIL Open Font License texts. Nothing looks
  different: screenshots before and after match. The page now loads with
  every other host blocked.

### Security

- The built page carries a Content-Security-Policy. Scripts, styles, fonts and
  workers load from the page's own origin only, and `connect-src 'self'` has
  the browser refuse to send what you give the page to any other host, even
  for a script injected through a bug in how the page renders a file. Inline
  event handlers and `eval` are not allowed. Every control was exercised
  in Chromium and Firefox with a listener for policy violations: none.

### Accessibility

- Checked with axe-core (WCAG 2.1 A and AA, and its best-practice rules) in light and dark,
  at desktop and phone widths: no findings now. Brass as text, and
  under paper-coloured text, was 3.4:1 and 3.9:1; those places use a darker
  brass (5.2:1). The paper-size select has a name.

## [0.2.0] - 2026-09-30

### Fixed

- The date ring was placed by the apparent Sun's right ascension, which
  keeps apparent (sundial) time, while the rings, the docs, and the page all
  say to enter local mean time. Readings were off by the equation of time: up
  to 16 minutes, or 4 degrees of disc rotation, in early November and
  mid-February. The ring now uses the mean Sun (its mean longitude), and a
  new test checks the disc rotation against an independent sidereal-time
  formula to 0.02 degrees; the old placement missed by 4.1.
- The preview built its date with `Date.UTC`, which reads years 0-99 as
  1900-1999.

### Changed

- The README and `docs/geometry.md` now say the date ring is Gregorian
  (proleptic for ancient epochs, where the Julian calendar runs up to a week
  off) and that a date mark stands for 0h UT, so a late-evening reading
  trails the sky by up to a degree.

## [0.1.0] - 2026-09-24

### Added

- Latitude/city picker with ancient-site presets (Babylon, Alexandria, Athens, Rome, Chichén Itzá, Tikal, Chang'an, Ujjain, and more), each with a suggested historical epoch.
- Epoch year selection from 3000 BCE to 3000 CE, with star positions precessed using the IAU 2006/P03 (Capitaine et al. 2003) model and proper motion applied.
- Magnitude limit control to thin the star field.
- Constellation lines and bright-star names, each toggleable.
- Ink & paper and night-sky chart themes.
- Drag-to-rotate live SVG preview of the star wheel, with a sidereal-alignment and visible-declination readout.
- SVG export (disc + horizon-window holder), scale-exact for A4 and US Letter paper.
