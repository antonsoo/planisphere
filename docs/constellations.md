# Constellation lines

## Why not a third-party line dataset

The most convenient ready-made source of constellation stick-figure data
mixes a CC-BY-licensed file and a GPL-licensed file in the same repository,
and carries a GPL boilerplate header even on the file described elsewhere as
CC-BY. Under time pressure we couldn't resolve that discrepancy with
confidence, so we treated the whole dataset as unverifiable and did not use
it, rather than risk shipping mis-licensed data.

## What we did instead

We self-authored a small set of simplified stick figures for 24 of the most
widely recognized constellations, built directly from each constellation's
classical bright named stars (e.g. "the Big Dipper connects Dubhe-Merak-
Phecda-Megrez-Dubhe for the bowl and Megrez-Alioth-Mizar-Alkaid for the
handle") — general astronomical knowledge repeated across countless
independent sources, not a copied line-list file.

Every line endpoint is mechanically verified against the HYG v4.1 CSV: each
point is resolved to a star by its Bayer letter, Flamsteed number, or proper
name *within that constellation's `con` field*, and the resulting star `id`
is checked against the mag<=5.5 filtered `stars.json`. Any constellation
with an unresolved point is dropped loudly rather than guessed at.

## Regenerating

```
python3 scripts/build_catalogue.py       # writes public/data/stars.json
python3 scripts/build_constellations.py  # writes public/data/constellations.json
```

The chain definitions live in `scripts/constellation_lines.py`.

## Constellations included

| Abbr | Name |
| --- | --- |
| UMa | Ursa Major |
| UMi | Ursa Minor |
| Cas | Cassiopeia |
| Ori | Orion |
| CMa | Canis Major |
| CMi | Canis Minor |
| Tau | Taurus |
| Gem | Gemini |
| Leo | Leo |
| Vir | Virgo |
| Lib | Libra |
| Sco | Scorpius |
| Sgr | Sagittarius |
| Cap | Capricornus |
| Aqr | Aquarius |
| Ari | Aries |
| Cyg | Cygnus |
| Lyr | Lyra |
| Aql | Aquila |
| Boo | Boötes |
| Peg | Pegasus |
| And | Andromeda |
| Aur | Auriga |
| Per | Perseus |
