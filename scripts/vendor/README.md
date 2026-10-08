# scripts/vendor/

`hygdata_v41.csv` is the HYG v4.1 star database (119,626 rows), CC BY-SA 4.0,
from https://github.com/astronexus/HYG-Database (`hyg/CURRENT/hygdata_v41.csv`),
pinned at `c7f7f883fe678cc7680169a50ccd7dcc49b060ce`.
The upstream license notice is in `HYG_LICENSE.txt` in this directory.

The fetch script verifies SHA-256
`d9f69fd86bbf90a4e4d52b4c5c53eacfa6dfc0bfdef85bfd94f095e0bebe4ebd`
before replacing an existing CSV. The generated star catalogue records this
provenance; distance and radial-velocity conventions are documented in
[`docs/stellar-motion.md`](../../docs/stellar-motion.md).

This CSV is gitignored (it's a 34 MB raw source file) — only the reduced,
derived JSON files under `public/data/` (`stars.json`, `constellations.json`)
are committed to the repo.

To refetch it:

```
../fetch_hygdata.sh
```
