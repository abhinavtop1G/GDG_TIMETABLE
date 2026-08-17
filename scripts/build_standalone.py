#!/usr/bin/env python3
"""
Builds a single self-contained HTML file with every batch embedded.

No server, no build step, no network: one file a student can open from a
downloads folder or a WhatsApp forward and still see their timetable offline.

    python scripts/build_standalone.py [data_dir] [output.html]
"""

import json
import sys
from pathlib import Path

data_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "data")
out_path = Path(sys.argv[2] if len(sys.argv) > 2 else "dist/timetable.html")
template = Path(__file__).with_name("standalone_template.html")

index = json.loads((data_dir / "index.json").read_text())

batches, sched = [], {}
for b in index["batches"]:
    f = data_dir / "batches" / f"{b['id']}.json"
    if not f.exists():
        continue
    entry = json.loads(f.read_text())
    if not entry["classes"]:
        continue
    batches.append([b["id"], b["year"], b["branch"], b["lectureGroup"], b["tutorialGroup"]])
    # Compact rows: start/end are derivable from the period number, and `raw`
    # is a debugging aid that would double the payload.
    sched[b["id"]] = [
        [c["day"], c["period"], c["periods"], c["code"], c["type"][0],
         c["room"], c["faculty"], c["options"], c["note"]]
        for c in entry["classes"]
    ]

payload = {
    "term": index["term"],
    "hash": index["sourceHash"],
    "generated": index["generated"],
    "subjects": index["subjects"],
    "batches": batches,
    "sched": sched,
}

blob = json.dumps(payload, separators=(",", ":"))
if "</script" in blob:
    blob = blob.replace("</script", "<\\/script")

out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(template.read_text().replace("__DATA__", blob), encoding="utf-8")

size = out_path.stat().st_size / 1024
print(f"{out_path}  {size:.0f} KB  ·  {len(batches)} batches  ·  "
      f"{sum(len(v) for v in sched.values())} classes")
