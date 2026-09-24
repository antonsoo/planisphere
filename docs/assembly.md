# Assembly

Two pieces come out of the exporter, both SVG, scale-exact to whichever
paper size you pick (A4 or US Letter). Colours follow the same laser-cut
convention as the companion `gnomon` repo: **red = cut, black = engrave**.

1. **Star disc** (`planisphere-disc-*.svg`) — the rotating piece: the star
   field, constellation lines, and the date ring, inside a red cut circle
   (radius 60 mm), with a small red pivot-hole circle at the centre.
2. **Holder** (`planisphere-holder-*.svg`) — the fixed piece: an outer red
   cut circle (radius 94 mm), the red horizon-window cutout (its shape
   depends on your chosen latitude — see `docs/geometry.md`), the black
   engraved hour ring, and the same centre pivot hole.

## By hand

1. Print both pieces at 100% scale (disable "fit to page" / "scale to fit"
   in your print dialog — the SVG is already sized in real millimetres).
2. Cut out the disc along its red circle. Cut out the holder's red outer
   circle *and* the red horizon-window shape (the hole you cut becomes the
   viewing window).
3. Push a paper fastener (a brass brad works well) through both centre
   holes, disc behind holder, and open the fastener's legs enough that the
   disc still turns freely.
4. To use it: turn the disc until tonight's date (on the disc's date ring)
   lines up with the current local mean time (on the holder's hour ring).
   The window now shows the sky for the epoch and latitude you exported.

## Laser cutting

Import either SVG directly; the red strokes are cut paths, the black
strokes/fills are engrave paths, matching a typical two-pass job (cut, then
engrave, or vice versa depending on your cutter/material). Card stock
(200-300 gsm) or 1-2 mm acrylic/plywood both work at this scale; if cutting
acrylic, mirror the disc left-right before engraving if you want the printed
side to face outward when viewed from the design side — read your cutter's
own bed/material convention before assuming ours.
