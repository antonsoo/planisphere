"""Download the four CDS catalogues into cache/ and write manifest.json.

usage: python3 -I fetch.py
Read-only HTTP to the CDS FTP mirror, one file at a time.
"""

import hashlib
import json
import time
import urllib.request
from datetime import date
from pathlib import Path

BASE = "https://cdsarc.cds.unistra.fr/ftp/J/A+A"
FILES = {
    "ptolemy_ulugh": ("544/A31", ["ReadMe", "ptolema.dat", "ulughbeg.dat"]),
    "tycho": ("516/A28", ["ReadMe", "keplere.dat", "variant.dat", "names.dat"]),
    "hevelius": ("516/A29", ["ReadMe", "hevelius.dat"]),
}
UA = "planisphere-study/0.1 (historical catalogue comparison; read-only)"
here = Path(__file__).resolve().parent
manifest = {"retrieved": date.today().isoformat(), "user_agent": UA, "files": []}
for folder, (path, names) in FILES.items():
    (here / "cache" / folder).mkdir(parents=True, exist_ok=True)
    for name in names:
        url = f"{BASE}/{path}/{name}"
        data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60).read()
        (here / "cache" / folder / name).write_bytes(data)
        manifest["files"].append({"url": url, "path": f"cache/{folder}/{name}", "bytes": len(data),
                                  "sha256": hashlib.sha256(data).hexdigest()})
        time.sleep(1)
(here / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
print(len(manifest["files"]), "files")
