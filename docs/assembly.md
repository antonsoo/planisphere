# Assembly and time setting

Export both pieces at the same latitude. Each SVG is a full A4 or US Letter
page in millimetres: red strokes are cut outlines, black marks are printed
or engraved. The star wheel is **192 mm** across; the holder is **160 mm**
across. The larger rotating wheel leaves its date scale visible outside the
opaque holder at every angle.

| Part | Radius | What it carries |
| --- | ---: | --- |
| Star wheel | 96 mm | 60 mm sky field, month names, daily date ticks, center hole |
| Fixed holder | 80 mm | 24 hour labels, 96 quarter-hour ticks, compass letters, two sky windows |
| Center hub | 3.2 mm | Material retained around the 0.8 mm radius pivot hole |
| Horizontal supports | 2.4 mm wide | Continuous material connecting the hub to the holder |

The preview uses the same artwork as the exports, with this physical order:

```text
viewer
  |
  v
opaque holder: hour scale + two cutouts + connected center hub
  |
  v
rotating wheel: star field + exposed outer date scale
```

## Cut and assemble

1. Print both SVGs at **100% / actual size**, with fit-to-page disabled. Check
   that the calibration line at the bottom of *each* sheet measures 50 mm.
   If a print application imports SVGs at another scale, correct that scale
   before cutting.
2. Cut the star wheel's outer red circle and its small center hole.
3. Cut the holder's outer red circle, center hole, and **two closed red
   window outlines**. Retain the horizontal supports and center hub. Do not
   join the two windows into one cut: that would remove the pivot support.
4. Place the smaller holder over the wheel, with the printed faces toward
   you. Use a small paper fastener through both holes and leave enough
   clearance for the wheel to turn. The holder remains fixed while the
   larger date wheel rotates behind it.
5. Align a **daily date tick** on the exposed rim with a **time tick** on
   the holder. Day numbers appear at 1, 5, 10, 15, 20, and 25; count the
   intervening daily ticks. The preview's red guide shows this alignment.
   The hour scale reads 00 through 23, with half-hour and quarter-hour ticks.
6. Match the compass letters to the directions around your horizon while
   using the chart as an overhead sky map. The hub and supports cover part
   of the sky, including the elevated celestial pole; this obstruction is
   visible in the opaque assembled preview. Sky detail enlarges the same
   visible windows without changing either print file.

The **epoch** controls precession and proper motion of the stars. The
**Gregorian date's year** calibrates the date ring (365 or 366 days). These
are separate settings: for example, compare epoch 700 BCE with epoch 2026 CE
using the same 2026 date scale. Regenerate the wheel when changing the date
scale's year. The holder can be reused at the same latitude.

## Convert your clock to local mean time

The instrument reads local mean solar time, rather than civil time or
sundial time. With longitude positive east and negative west:

```text
local mean time = UTC + longitude / 15 hours
UTC             = civil clock time - its current UTC offset
```

Babylon at 44.42 degrees east is 2 hours 57 minutes 41 seconds ahead of UTC.
At 18:00 UTC, its mean time is about 20:58, so choose 21:00 on the app's
quarter-hour control. Apply the date rollover too. A civil clock at UTC+3
reading 21:00 gives the same result. Use your clock's current offset,
including daylight saving if it applies.

The app initially rounds the current mean time at the default Babylon site
to the nearest quarter-hour, including a possible date rollover. Changing
location retains the date and time you entered; supply the new site's mean
time. Custom latitude has no longitude, so no civil-time conversion can be
inferred from that setting.

The annual scale uses the mean Sun at 00:00 UTC for each date. It omits the
Sun's motion during that day, atmospheric refraction, and other small
corrections; see [geometry](geometry.md) and the README's accuracy section.
It is a printable seasonal chart rather than a precision ephemeris.

## Example print files

These are actual app downloads, not drawings reconstructed from a screenshot:

| Setting | Star wheel | Holder | Opaque assembled review |
| --- | --- | --- | --- |
| Babylon, 32.5 N; epoch 700 BCE; 2026 scale; A4 | [SVG](assets/print-babylon-disc-a4.svg) | [SVG](assets/print-babylon-holder-a4.svg) | [PNG](assets/print-babylon-assembled.png) |
| 33.9 S; epoch 2026 CE; leap-year 2024 scale; Letter | [SVG](assets/print-southern-disc-letter.svg) | [SVG](assets/print-southern-holder-letter.svg) | [PNG](assets/print-southern-assembled.png) |

The review images reconstruct the opaque holder from the downloaded cut
paths and place it over the downloaded wheel at 21:00 mean time. The red
outlines remain visible in these proofs to make the cutting paths inspectable.
These pieces have been verified digitally; a physical paper assembly or
laser-cut trial has not been performed.

## Laser workflow

Keep the exported left/right orientation: plotting negative right ascension
is essential to the date/hour alignment. Configure the red strokes as cuts
and black strokes/fills as engraving in your cutter's software, with the
50 mm scale bar as an independent size check. Do not treat page captions or
the scale bar as cuts. Prototype on paper before choosing material thickness,
fastener clearance, engraving settings, or kerf compensation for your machine.

The wheel includes HYG catalogue attribution, and both SVGs carry source
and license metadata. Preserve the catalogue credits when sharing derivatives.
