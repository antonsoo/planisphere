# Stellar motion and star finder: local verification

This work is **local and unreleased**. No push, package publication or Pages
deployment was performed. The application and browser checks were committed
at `672daa6`; later documentation/artifact commits do not change the runtime.
The previous [0.3.0 release verification](verification-2026-10-04.md) describes
that older deployed build, not the finder added here.

## Concrete changes

The previous angular-addition motion model misplaced 61 Cyg at 3000 BCE by
3199.024 arcseconds versus ERFA. The replacement propagates a Cartesian space
vector, using HYG distance and radial velocity when available, before the
existing P03 precession. Pole crossings no longer clamp at 90 degrees.

The new finder connects that calculation to the paper instrument:

```text
catalogue record
    |
    +--> motion in J2000 axes --> precession --> disc point --> printed SVG
    |                                               |
    +--> source + assumptions                       +--> rotate by mean time
                                                        |
                                                        v
                                         horizon / hub / support / window
```

Search, source IDs, intermediate coordinates, model inputs, explicit visibility
states and JSON evidence make a selected point inspectable. Lift/replace the
holder, include an excluded magnitude, and choose a visible quarter-hour setting.
Inspection guides never enter the print files. Desktop controls remain beside
the inspection table when scrolling; small screens keep the single-column flow.

## Clean build and numerical verification

A detached worktree at `672daa6` received a fresh `npm ci` with Node **24.21.0**
and npm **11.19.0**. It installed 47 packages and reported zero audit findings.

| Check | Result |
| --- | --- |
| Biome, strict TypeScript and build | Passed |
| Vitest | 437 checks in 10 files, passed |
| Same numerical/data suite under `de_DE.UTF-8` | 437 passed |
| Production Chromium + Firefox workflows | 72 passed |
| Fresh versus working production build | All 37 files byte-identical |
| Documented dev server | Catalogue and interactive finder loaded successfully |
| Modified Python scripts | Ruff check and formatting passed |
| Pinned source fetch and reduced catalogue rebuild | Verified CSV digest; generated JSON byte-identical |

The TypeScript exporter and independent ERFA audit were also rerun from the
fresh worktree. Their numerical report exactly reproduced the retained
[`space-motion-verification.json`](space-motion-verification.json), using
pyerfa **2.0.1.5** and NumPy **2.5.3**.

| Reference comparison | Evidence |
| --- | --- |
| Coverage | 2865 stars, 7 epochs, 20,055 positions |
| Motion-only error | At most 0.259403 arcsecond versus ERFA `pmsafe` |
| Mean coordinates with matching P03 Euler angles | At most 0.259403 arcsecond |
| Different Fukushima-Williams precession representation | At most 9.419407 arcseconds |
| Unknown distances | 54 stars; disclosed tangential fallback, not verified perspective |
| Retained C-library regression cases | 7 selected stars at 7 epochs |

The [motion guide](stellar-motion.md) distinguishes model agreement from
historical physical accuracy and documents both precession comparisons.

Commands exercised from the fresh checkout:

```sh
npm ci
npm run lint
npm run typecheck
npm test
LC_ALL=de_DE.UTF-8 LANG=de_DE.UTF-8 npm test
npm run build
npm run test:browser
node scripts/export-star-positions.mjs > /tmp/planisphere-positions.json
uv run --with numpy==2.5.3 --with pyerfa==2.0.1.5 --no-project python scripts/verify-space-motion.py /tmp/planisphere-positions.json
npm run dev -- --host 127.0.0.1 --port 4206 --strictPort
```

The final command runs a foreground development server; stop it before leaving
the terminal. Build output is **`dist/`**, with Vite base **`/planisphere/`**.

## Browser evidence

The suite checks the actual production build. New workflows cover:

- 61 Cyg's downloaded JSON versus an independent ERFA reference, then the
  actual SVG circle versus that reference projected into millimetres. The
  downloaded print point equals the preview point; inspection markers are absent.
- Polaris above the northern horizon but covered by the hub, confirmed with
  the SVG holder material's `isPointInFill`. The same star is outside a southern
  disc, disabling actions that cannot locate it.
- Magnitude recovery followed by a visible-time choice, with the selected
  center inside the actual paper opening. Date and stellar epoch stay fixed.
- Invalid date drafts retain coordinates and expanded assumptions while
  actions pause, then recover the same star at the changed epoch.
- First-use search, selection, epoch changes and evidence download after
  disconnecting the loaded page. This caught a deferred font request from the
  coordinate table; the table now reuses its already-loaded body typeface.
- Search result bounds, accent/case folding, empty results without a fabricated
  match, escaped catalogue labels, missing distance and ambiguous zero velocity.
- Keyboard focus after including a star, setting a visible time and locating
  a point; simultaneous visibility of epoch controls and coordinates on desktop.

Existing workflows still verify pointer rotation, scale alignment, loading and
retry ownership, actual print dimensions, clipped glyphs, connected pivot material,
both hemispheres and the equator, and offline SVG downloads. Expanded star details
are included in accessibility and overflow checks at **1440, 375 and 320 pixels**,
in both themes and browsers. All workflows monitor console/page errors, CSP
violations and off-origin requests; only the explicit HTTP-failure fixture permits
its expected resource error.

## Reviewed artifacts

The capture script saves real browser downloads and screenshots, with SHA-256
hashes and Axe results in [`star-finder-capture.json`](star-finder-capture.json).
It uses Chromium **153.0.8010.12**; the browser suite also used Firefox **155.0**.
Every retained PNG was opened for review. The instrument's ink/brass palette,
type hierarchy and physical-wheel lettering are preserved. The finder table and
actions remain readable on the phone capture; the full-page view is intentionally
long, with sticky desktop controls for epoch comparison.

| Artifact | Purpose |
| --- | --- |
| [Full instrument and finder](assets/star-finder-paper.png) | Babylon holder latitude, 61 Cyg at 3000 BCE, uncovered wheel |
| [Inspection register](assets/star-finder-register.png) | Catalogue, motion-only and precessed coordinates with expanded inputs |
| [Night register](assets/star-finder-night.png) | Same result in the night theme |
| [Phone register](assets/star-finder-mobile.png) | 375-pixel layout |
| [61 Cyg evidence JSON](assets/star-61-cyg-3000bce.json) | Unedited browser download; source record, units, settings and computed result |
| [Disc SVG](assets/star-61-cyg-3000bce-disc.svg) | Actual A4 print download, unmarked by inspection |
| [Holder SVG](assets/star-61-cyg-holder.svg) | Actual A4 holder for 32.5 degrees north |

The README's [700 BCE](assets/hero-babylon-700bce.png) and
[2026 CE](assets/hero-babylon-today.png) comparison images were also recaptured
from the corrected model, with the same latitude, magnitude limit, date and time.

Capture/review commands, after building:

```sh
npm run preview -- --host 127.0.0.1 --port 4205 --strictPort
# In another terminal:
node scripts/capture-star-finder.mjs
```

The capture records 96 time-control changes with the selected star's assumptions
expanded, forcing layout after each update. Timings are in the manifest, measured
on this 14-vCPU WSL2 Linux / 48-GB-class machine at a 320-pixel viewport. This is
one local measurement, not a portable performance guarantee.

## Remaining limits

No physical print, fastener or laser-cutter trial was performed. Material strength,
kerf and clearance still require a real assembly. Star-center visibility is
geometric; the full glyph may touch an edge, and actual observing conditions are
not modeled. Missing distance, uncertain catalogue measurements, unresolved binary
motion and omitted light-time/relativistic corrections remain explicit limits.
The stellar epoch and Gregorian date-ring year are independent.

Suggested repository description: **Printable star wheels with inspectable
catalogue data, stellar motion, precession and physical horizon windows.**
Topics: `astronomy`, `planisphere`, `star-chart`, `precession`, `svg`,
`archaeoastronomy`, `typescript`.
