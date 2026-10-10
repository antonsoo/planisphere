# Star-wheel source verification, 2026-10-10

A fresh archive of `3386ed9125c96a06d8a36f5fffd4ac95327f9f11` was checked
before pushing the stellar-motion model, star finder and historical-catalogue
study to `main`. The [earlier record](verification-2026-10-08.md) describes
the implementation and initial captures; its local-only status describes
that earlier verification date.

Fresh TypeScript exports were independently compared with ERFA 2.0.1.5
using NumPy 2.5.3: **2,865 catalogue stars at seven epochs, 20,055 positions**.
The maximum motion and mean-coordinate differences were both 0.259403
arcseconds. The old angular-addition approximation differs by 3,199.024121
arcseconds for 61 Cyg at 3000 BCE. The 54 records without usable distance
were checked separately against the stated tangential fallback. The
[complete report](evidence/source-2026-10-10/space-motion.json) includes
catalogue hashes, the worst records and the separate precession comparison.
These numerical comparisons do not establish ancient observing conditions
or include the model's explicitly omitted physical effects.

The actual production browser downloaded the 61 Cyg evidence JSON, star
disc SVG and holder SVG. All three are byte-identical to the retained
[downloads](assets/star-61-cyg-3000bce.json). The expanded finder was opened
and visually inspected in desktop paper/night themes and at 375 pixels.
Six additional accessibility scans at 1440, 375 and 320 pixels found no
violations; the capture recorded no runtime errors, CSP violations or
off-origin requests. See the [capture manifest](evidence/source-2026-10-10/browser-capture.json).
Screenshot hashes identify this fresh inspection; the existing earlier
screenshots remain in `docs/assets`.

The clean Node 26.7.0/npm 12.0.1 install passed lint, strict types, 455 tests
in each of the default and German locales, a production build, and all
72 Chromium/Firefox workflows. The [build manifest](evidence/source-2026-10-10/build.json)
identifies all 37 produced files. Reproduction commands are in the
[stellar-motion guide](stellar-motion.md) and [contributing guide](../CONTRIBUTING.md).

No physical paper assembly or material/fastener trial was performed. The
historical-catalogue study was not independently rerun in this verification;
the fresh ERFA comparison concerns the current catalogue and position model.
This record verifies source and local downloads, not a package release or
successful Pages deployment.
