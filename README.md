# TIET Timetable — GDG on Campus

Your Thapar class schedule, readable. Pick your practical subgroup once; the site
remembers it, shows what you're in right now, and exports the whole semester to
your calendar.

Built and maintained by **GDG on Campus, TIET**.

## How it works

The university publishes one Excel workbook per semester. It is built for
printing, not for reading: nine sheets, ~140 columns each, three levels of
column headers, and one class spread across four rows. This repo turns that into
JSON at build time, so the browser never touches the spreadsheet.

```
source/*.xlsx  ──►  scripts/parse_timetable.py  ──►  data/  ──►  React app
```

- **534 batches**, one JSON file each (~2 KB), so a student downloads only
  their own schedule.
- **13,135 class blocks** parsed, with the original spreadsheet text kept on
  every entry as `raw` — add `?debug=1` to any page to see it.
- The parser asserts its own assumptions. If the university changes the sheet
  layout, the build fails instead of quietly shipping a wrong timetable.

## What it does

- **Pick your year, then your batch.** 534 batches; the numbered group id
  students actually use (2Q31, not 2Q3A).
- **Live "in class now"** card, and a now-line that moves down the week grid.
- **Tap any class** to expand it: full course name, every session of that course
  in the week, total contact hours, all rooms and faculty, and any scheduling
  note. Optional prose lives in `overrides/descriptions.json`.
- **Download as PNG, JPG or PDF** — sized for an iPhone or Android lock screen,
  a story post, or A4 landscape for the notice board. The PDF is assembled by
  hand around a JPEG, so there is no PDF library in the bundle.
- **Calendar export** (.ics) with weekly recurrence for the whole term.
- Works offline once loaded; no accounts, no backend, no database.

## Updating for a new semester

1. Drop the new workbook into `source/`.
2. `npm run parse`
3. `npm run check` — renders every batch at every export size in pure geometry
   and fails if any text escapes a card or collides.
4. Read `data/unknown_tokens.json`. Anything new in there is a cell the parser
   did not recognise — usually a typo in the source or a new room naming
   convention. Fix the classifier or add it to the override maps.
5. Open a PR. The JSON diff is reviewable; check a few batches you know.

## Design previews

```bash
npm run preview   # renders the real components to design-preview.html
npm run samples   # renders sample wallpapers + a PDF to /tmp (needs: npm i -D canvas)
```

`npm run preview` server-renders the actual components with the shipped CSS, so
the file shows the real design in both themes — no dev server needed.

## Course and faculty names

The workbook only contains codes. `overrides/subjects.json` maps
the six-character base code (UCS301, covering UCS301L / UCS301P / UCS301T) to
the official course name, and the parser folds them into the output.

**295 course names are in, verified against official TIET sources** — the
departmental Course Scheme and Syllabus PDFs on `thapar.edu` and the
institute's "Faculty Assigned (Summer Semester)" PDFs. That covers **82% of all
class blocks**. Names were only added where the exact code appeared next to the
name in an official document; nothing was guessed from the code prefix.

Two known conflicts between official documents, resolved toward the majority
form: `UPH013` is "Physics" in every department scheme except Civil's
("Applied Physics"), and `UCB009` is "Chemistry" except in Civil's
("Applied Chemistry"). `PAI106` is left unnamed — the M.E.(AI) scheme and the
Faculty-Assigned PDF genuinely disagree.

Remaining gaps are listed by running `npm run parse` and checking
`index.json > coverage`. **Adding a verified name is the best first
contribution** — cite the official PDF in your PR.

## Local development

```bash
npm install
npm run parse     # regenerate data/ from the workbook (needs python3 + openpyxl)
npm run dev
```

`public/data` is a copy of `data/`. Re-copy it after a parse:

```bash
rm -rf public/data && cp -r data public/data
```

## One-file build

`npm run standalone` bundles every batch into a single `dist/timetable.html`
(~730 KB) with no server and no network calls. Useful for the society fair
laptop, and it works offline once opened.

## Deploying

Static output, no backend, no database. `npm run build` produces `dist/`.
Point Vercel at the repo and it will use `vercel.json`.

## Accuracy

Generated from the official sheet for **August – December 2026**. If a class
looks wrong, check the official workbook and open an issue with the batch id and
the day — the `raw` field in the JSON makes it a two-minute fix.
