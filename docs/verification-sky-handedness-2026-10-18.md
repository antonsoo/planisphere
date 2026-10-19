# Southern sky correction: source verification

The south-pole projection reflected the sky. It changed radial distance but
kept the north-pole angular direction, so horizon tests passed while star
patterns and compass directions were reversed. The fix in `ca6d407` changes
southern star projection, compass placement, date/hour scales, physical wheel
rotation, pointer interaction and finder evidence together. Previously printed
southern instruments need both pieces regenerated.

The [independent study](../studies/sky-handedness/README.md) retains the original
and corrected app downloads and screenshots. Of 2,668 printable bright-star
positions checked at nine latitudes and four alignments, the original had
1,164 errors above 0.002 mm. The corrected output has none; maximum error is
0.000701 mm, consistent with SVG rounding. The independent reference is an ENU
camera looking out from inside the sky. This measures projection agreement,
not field or printer accuracy.

## Clean source verification

A fresh `git archive ca6d407` was extracted and installed without copying the
working node_modules or build. On Node 24.21.0 / npm 11.19.0:

```sh
npm ci
npm run lint
npm run typecheck
npm test
LC_ALL=de_DE.UTF-8 LANG=de_DE.UTF-8 npm test
npm run build
npm run test:browser
python studies/sky-handedness/oracle.py
node studies/sky-handedness/replay.mjs OUTPUT_DIR
```

| Check | Result |
| --- | --- |
| Fresh installation | 47 packages installed; zero reported audit vulnerabilities |
| Lint / strict types / build | Passed |
| Numerical suite | 521 tests in 13 files; passed in both locales |
| Production browser suite | 78 Chromium/Firefox workflows passed |
| Independent exported-geometry replay | 2,668 positions; zero errors above tolerance |
| Clean versus working build | All 37 files byte-identical across Node 24 and Node 26 |
| Locally served files | All 37 responses matched that build by SHA-256 |

The browser suite exercises downloaded XML, actual pointer drags, hemisphere
changes, keyboard controls, star evidence, midnight settings, network-failure
recovery, glyph bounds, cutout material and first-use offline workflows.
The dedicated study additionally retains Chromium/Firefox desktop and 375px
runs, eight actual SVG downloads per build, and the signed orientation of the
Acrux/Mimosa/Gacrux triangle. The four corrected study workflows had no page
exceptions, CSP violations, external requests or horizontal overflow.

The [asset receipt](../studies/sky-handedness/verification.json) records each
built file's byte count and SHA-256. The [print receipt](../studies/sky-handedness/print-example.json)
records the regenerated southern Letter examples. Both construction SVGs and
the opaque assembled proof were replaced in `docs/assets/`; the [assembly
guide](assembly.md#example-print-files) links them.

Reviewed the original/corrected assembled screenshots, mobile workflow and
regenerated print proof. The chart now has the expected southern orientation;
letters stay upright, paper supports remain intact and there is no horizontal
overflow. The quarter-hour granularity, daily date-ring approximation,
geometric horizon and paper obstructions remain documented limits. A physical
paper, fastener, printer or cutter trial has not been performed.

Build command: `npm run build`. Static output: `dist/` with base `/planisphere/`.
Changes are committed locally. This work does not establish a hosted deployment,
registry release, tag or remote CI result.

Suggested GitHub description: Printable star wheels with inspectable stellar
motion and hemisphere-correct sky geometry.

Suggested topics: `astronomy`, `planisphere`, `typescript`, `precession`,
`stellar-motion`, `svg`, `laser-cutting`.

Implementation commit:

```text
ca6d407 fix: preserve southern sky handedness in printed instruments
```
