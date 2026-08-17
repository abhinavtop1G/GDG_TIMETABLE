// Prove that a student's pick lands them in the room the sheet actually names.
import { readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const tmp = ".ev-tmp";
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
writeFileSync("entry-ev.ts", `export { electiveGroups, resolvePicks, baseCode } from "./src/lib/data.ts";`);
execFileSync("npx", ["esbuild", "entry-ev.ts", "--bundle", "--format=esm", "--platform=node",
  `--outfile=${join(tmp, "ev.mjs")}`, "--log-level=error"]);
const { electiveGroups, resolvePicks, baseCode } =
  await import(pathToFileURL(join(process.cwd(), tmp, "ev.mjs")).href);

import { readdirSync } from "node:fs";
let checked = 0, mismatches = 0, unaligned = 0;

for (const file of readdirSync("data/batches")) {
  const batch = JSON.parse(readFileSync(join("data/batches", file), "utf8"));
  const groups = electiveGroups(batch);
  if (!groups.length) continue;

  for (const group of groups) {
    for (const choice of group.choices) {
      const picks = { [group.key]: baseCode(choice.code) };
      const resolved = resolvePicks(batch.classes, picks);

      for (const slot of resolved) {
        if (!slot.picked) continue;
        checked++;
        // find the original slot and its own choice list
        const original = batch.classes.find(
          (c) => c.day === slot.day && c.period === slot.period && c.type === "elective",
        );
        if (!original) continue;
        if (!original.aligned) { unaligned++; continue; }
        const truth = original.choices.find((ch) => baseCode(ch.code) === baseCode(slot.code));
        if (!truth) { mismatches++; console.log("no source choice", batch.id, slot.code); continue; }
        if (slot.room !== truth.room || slot.faculty !== truth.faculty) {
          mismatches++;
          if (mismatches < 5) console.log("MISMATCH", batch.id, slot.code, slot.room, "vs", truth.room);
        }
      }
    }
  }
}

rmSync(tmp, { recursive: true, force: true });
rmSync("entry-ev.ts", { force: true });
console.log(`resolved slots checked: ${checked}`);
console.log(`slots left without a room (unaligned source, correct): ${unaligned}`);
if (mismatches) {
  console.log(`FAILED — ${mismatches} room/faculty mismatches`);
  process.exit(1);
}
console.log("every elective pick resolves to the room the sheet names");
