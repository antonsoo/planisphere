# scripts/vendor/

`hygdata_v41.csv` is the HYG v4.1 star database (119,626 rows), CC BY-SA 4.0,
from https://github.com/astronexus/HYG-Database (`hyg/CURRENT/hygdata_v41.csv`).
Full license text is in `HYG_LICENSE.txt` in this directory.

This CSV is gitignored (it's a 34 MB raw source file) — only the reduced,
derived JSON files under `public/data/` (`stars.json`, `constellations.json`)
are committed to the repo.

To refetch it:

```
../fetch_hygdata.sh
```
