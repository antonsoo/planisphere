# Planisphere 0.3.0 verification - 2026-10-04

The released build uses shared physical artwork for an exposed date wheel,
opaque holder, and retained center pivot. Browser, print-geometry, clean-install,
and hosted-asset checks below passed. A physical paper/cutter trial has not
been performed.

## Source and build

- Application source: `bba74cca66d194bd2619fd2840cde21a277cd28c`.
- Published from a fresh source archive with Node **24.21.0**, npm **11.19.0**.
- `npm ci`: 47 packages installed, 48 audited, zero reported vulnerabilities.
- `npm run lint`, `npm run typecheck`, and production build: passed.
- `npm test`: **386 tests / 10 files**, passed in both the default locale and
  `de_DE.UTF-8`. Precession/proper-motion fixtures and the independent
  sidereal-time cross-check remained in the suite.
- The clean build and working-checkout build were byte-identical for all
  **37 built files**.

## Production browsers

`npm run test:browser` passed **58 workflows** against both the clean local
production build and [the deployed site](https://antonsoo.github.io/planisphere/).
Each run covers Chromium and Firefox:

| Evidence | Coverage |
| --- | --- |
| Date/hour alignment | Keyboard steps, midnight rollover, actual pointer dragging, angle seam and cancellation, changes after dragging, enlarged sky view |
| Draft recovery | Empty/out-of-range dates retain the prior SVG and caption; downloads pause; form outputs track drafts; leap day and year 0099 recover |
| Loading | HTTP 503, malformed JSON/schema, oversized advertised/streamed bodies, pending restart, timeout and retry |
| Downloaded assembly | A4/Letter at 32.5 N, 33.9 S, equator, 89 N and 89 S; valid XML; equal preview/print artwork; all dates exposed over every rotation; hub/support material retained |
| Print lettering | Actual glyph bounds at equator, near-equator and both hemispheres; stars/lines/names inside the sky field; scale and compass text on retained pieces |
| Offline | Loaded calculations, themes, settings and SVG downloads without a connection |
| Accessibility | 12 Axe WCAG 2.1 A/AA scans per run: two browsers, both themes, 1440/375/320 px; zero violations or horizontal overflow; focus and keyboard controls exercised |
| Runtime/privacy | No unexpected console/page errors, CSP violations or off-origin requests; the HTTP-failure fixture allows only its expected 503 resource diagnostic |

The horizon and cutout suites independently compare polygon visibility to
altitude, including zero latitude, near-zero latitude and both extreme
hemispheres. The retained strip is checked for a continuous material path
from the pivot to both sides. Constellation segments are clipped in their
actual coordinates, including outside-to-outside crossings.

## Hosted integrity

The deployment appended a normal commit to the existing `gh-pages` history.
Every built file was fetched from the live origin and compared by SHA-256
with the clean build. All **37** matched, including the page, JavaScript,
CSS, catalogue data and fonts. The byte-checked page contains its production
CSP. The [timestamped asset manifest](verification-assets-2026-10-04.json)
records the hashes.

```sh
npm ci
npm run lint
npm run typecheck
npm test
LC_ALL=de_DE.UTF-8 LANG=de_DE.UTF-8 npm test
npm run build
npx playwright install chromium firefox
npm run test:browser
npm run verify:hosted
PLANISPHERE_BASE_URL=https://antonsoo.github.io/planisphere/ npm run test:browser
```

## Visual and physical review

Reviewed desktop paper/night, full instrument, mobile sky detail and print
proofs. The [assembly guide](assembly.md) links actual A4 Babylon and Letter
southern-hemisphere SVG downloads and opaque assembly images reconstructed
from those downloads. The equatorial assembled image is also committed as
`docs/assets/print-equator-assembled.png`.

The wheel radius is 96 mm, the holder radius 80 mm, and all daily ticks start
at 82 mm. The center hub is 3.2 mm in radius, connected by a 2.4 mm wide strip.
The generated cut paths retain the hub rather than cutting it away. Print at
100% and measure both 50 mm calibration bars before assembly.

The hub/supports obscure part of the sky; the preview shows that obstruction.
The annual date scale is calibrated for the selected Gregorian year. Quarter-hour
selection, the midnight date anchor and a geometric rather than refracted horizon
remain approximation boundaries. Material strength, fastener clearance, cutter
kerf and a real printed prototype remain unverified.
