# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
