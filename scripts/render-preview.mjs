/**
 * Renders the real components to a standalone HTML file so the design can be
 * reviewed without running the dev server. Uses the same CSS the site ships.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const tmp = ".ssr-tmp";
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
writeFileSync("entry-ssr.tsx", `
import { renderToStaticMarkup } from "react-dom/server";
import ClassDetail from "./src/components/ClassDetail";
import ElectivePicker from "./src/components/ElectivePicker";
import Home from "./src/components/Home";
import WeekBoard from "./src/components/WeekBoard";
export function renderHome(props: any) { return renderToStaticMarkup(<Home {...props} />); }
export function renderBoard(props: any) { return renderToStaticMarkup(<WeekBoard {...props} />); }
export function renderDetail(props: any) { return renderToStaticMarkup(<ClassDetail {...props} />); }
export function renderElectives(props: any) { return renderToStaticMarkup(<ElectivePicker {...props} />); }
`);
execFileSync("npx", ["esbuild", "entry-ssr.tsx", "--bundle", "--format=esm", "--platform=node",
  "--jsx=automatic", "--external:react", "--external:react-dom",
  `--outfile=${join(tmp, "ssr.mjs")}`, "--log-level=error"], { stdio: "inherit" });

const { renderHome, renderBoard, renderDetail, renderElectives } = await import(pathToFileURL(join(process.cwd(), tmp, "ssr.mjs")).href);

const index = JSON.parse(readFileSync("data/index.json", "utf8"));
const batch = JSON.parse(readFileSync("data/batches/2Q3A.json", "utf8"));
// 1X2A carries the longest course name in the whole workbook (73 characters),
// so it is the honest stress test for card overflow.
const stress = JSON.parse(readFileSync("data/batches/1X2A.json", "utf8"));
// 3Q1A is a third-year CSE batch with real elective bundles.
const elective = JSON.parse(readFileSync("data/batches/3Q1A.json", "utf8"));
const cssFile = readdirSync("dist/assets").find((f) => f.endsWith(".css"));
const css = readFileSync(join("dist/assets", cssFile), "utf8");

const now = new Date("2026-08-17T11:47:00");
const board = (theme) => `<div data-theme="${theme}" class="app" style="background:var(--bg);padding:1.5rem 1.25rem 2.5rem">
${renderBoard({ batch, index, days: 6, focusDay: null, today: 0, now, debug: false })}</div>`;
const boardOf = (b, theme) => `<div data-theme="${theme}" class="app" style="background:var(--bg);padding:1.5rem 1.25rem 2.5rem">
${renderBoard({ batch: b, index, days: 6, focusDay: null, today: 0, now, debug: false })}</div>`;
const detail = (theme, b, entry) => `<div data-theme="${theme}" style="position:absolute;inset:0">
${renderDetail({ entry, batch: b, index, now, debug: false, onClose: () => {} })}</div>`;
const electives = (theme) => `<div data-theme="${theme}" style="position:absolute;inset:0">
${renderElectives({ batch: elective, picks: {}, onChange: () => {}, onClose: () => {} })}</div>`;
const home = (theme) => `<div data-theme="${theme}" style="background:var(--bg)">
${renderHome({ batches: index.batches, term: index.term, onPick: () => {}, theme, onToggleTheme: () => {} })}</div>`;

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GDG Timetable — design preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${css}
body{margin:0}
.detail{position:absolute}
.pv{padding:2.5rem 1rem;border-bottom:1px solid rgba(128,128,128,.25)}
.pv__h{font:600 .72rem/1 Inter,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:#888;margin:0 auto 1.25rem;max-width:84rem;padding:0 1.25rem}
</style></head><body style="background:#000">
<section class="pv"><p class="pv__h">Home — dark</p>${home("dark")}</section>
<section class="pv"><p class="pv__h">Home — light</p>${home("light")}</section>
<section class="pv"><p class="pv__h">Week board — dark (2Q31, Monday 11:47)</p>${board("dark")}</section>
<section class="pv"><p class="pv__h">Week board — light</p>${board("light")}</section>
<section class="pv"><p class="pv__h">Click a block → expanded detail (dark)</p>
<div data-theme="dark" style="position:relative;height:640px;background:var(--bg);overflow:hidden">${detail("dark", batch, batch.classes.find((c) => c.type === "practical") ?? batch.classes[0])}</div></section>
<section class="pv"><p class="pv__h">Expanded detail (light) — a course with no verified name yet</p>
<div data-theme="light" style="position:relative;height:640px;background:var(--bg);overflow:hidden">${detail("light", stress, stress.classes.find((c) => !c.title) ?? stress.classes[0])}</div></section>
<section class="pv"><p class="pv__h">Elective picker — 3Q1A, third-year CSE (real options from their own sheet)</p>
<div data-theme="dark" style="position:relative;height:760px;background:var(--bg);overflow:hidden">${electives("dark")}</div></section>
<section class="pv"><p class="pv__h">Elective picker — light</p>
<div data-theme="light" style="position:relative;height:760px;background:var(--bg);overflow:hidden">${electives("light")}</div></section>
<section class="pv"><p class="pv__h">Overflow stress test — 1X2A, longest course names in the workbook</p>${boardOf(stress, "dark")}</section>
<section class="pv"><p class="pv__h">Overflow stress test — light</p>${boardOf(stress, "light")}</section>
</body></html>`;

writeFileSync("design-preview.html", page);
rmSync(tmp, { recursive: true, force: true });
rmSync("entry-ssr.tsx", { force: true });
console.log("design-preview.html written,", Math.round(page.length / 1024), "KB");
