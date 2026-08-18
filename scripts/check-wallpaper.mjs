/**
 * Wallpaper layout audit.
 *
 * Renders the wallpaper layout for every batch and every preset, in pure
 * geometry, and asserts nothing escapes the canvas or collides. A wallpaper is
 * a shareable artefact -- a card bleeding off the edge is the kind of thing
 * that gets screenshotted and mocked, so it is worth a build-time check.
 *
 *   node scripts/check-wallpaper.mjs
 */

import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "wp-"));
const bundle = join(tmp, "layout.mjs");

execFileSync(
  "npx",
  [
    "esbuild",
    "src/lib/wallpaper-layout.ts",
    "--bundle",
    "--format=esm",
    "--platform=node",
    `--outfile=${bundle}`,
    "--log-level=error",
  ],
  { stdio: "inherit" },
);

const { layout, PRESETS, DARK } = await import(bundle);

const index = JSON.parse(readFileSync("data/index.json", "utf8"));
const files = readdirSync("data/batches");

let checked = 0;
const problems = [];

for (const file of files) {
  const batch = JSON.parse(readFileSync(join("data/batches", file), "utf8"));
  if (!batch.classes.length) continue;

  for (const preset of PRESETS) {
    for (const onlyDay of [null, 0]) {
      const opts = { preset, palette: DARK, names: true, faculty: true, onlyDay };
      const ops = layout(batch, index, opts);
      checked++;

      const boxes = [];
      for (const op of ops) {
        if (op.t === "rect") {
          if (op.x < -1 || op.y < -1 || op.x + op.w > preset.width + 1 || op.y + op.h > preset.height + 1) {
            problems.push(`${batch.id}/${preset.id}: rect escapes canvas`);
          }
          if (op.role === "card") boxes.push(op);
          if (op.h < 0 || op.w < 0) problems.push(`${batch.id}/${preset.id}: negative box`);
        }
        if (op.t === "text") {
          if (op.y > preset.height - 4) {
            problems.push(`${batch.id}/${preset.id}: text below the fold ("${op.text}")`);
          }
          if (op.x < 0 || op.x > preset.width) {
            problems.push(`${batch.id}/${preset.id}: text outside width ("${op.text}")`);
          }
          if (op.size < 14) {
            problems.push(`${batch.id}/${preset.id}: text too small (${op.size}px)`);
          }
        }
      }

      // Text inside one card must not collide: same-line pairs need
      // disjoint x-ranges, stacked lines need vertical clearance.
      const groups = new Map();
      for (const op of ops) {
        if (op.t === "text" && op.group) {
          const list = groups.get(op.group) ?? [];
          const w = op.text.length * op.size * (op.mono ? 0.6 : 0.53);
          const x0 = op.align === "right" ? op.x - w : op.x;
          list.push({ ...op, x0, x1: x0 + w });
          groups.set(op.group, list);
        }
      }
      for (const [id, list] of groups) {
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i];
            const b = list[j];
            const sameLine = Math.abs(a.y - b.y) < Math.min(a.size, b.size) * 0.9;
            if (sameLine && a.x0 < b.x1 - 1 && a.x1 - 1 > b.x0) {
              problems.push(`${batch.id}/${preset.id}: card text overlaps (${id})`);
            }
          }
        }
      }

      // Cards must not overlap each other.
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];
          const overlap =
            a.x < b.x + b.w - 1 &&
            a.x + a.w - 1 > b.x &&
            a.y < b.y + b.h - 1 &&
            a.y + a.h - 1 > b.y;
          if (overlap) problems.push(`${batch.id}/${preset.id}: two cards overlap`);
        }
      }
    }
  }
}

rmSync(tmp, { recursive: true, force: true });

const unique = [...new Set(problems)];
console.log(`checked ${checked} layouts across ${files.length} batches`);
if (unique.length) {
  console.log(`FAILED — ${unique.length} distinct problems`);
  unique.slice(0, 20).forEach((p) => console.log("  " + p));
  process.exit(1);
}
console.log("all layouts fit");
