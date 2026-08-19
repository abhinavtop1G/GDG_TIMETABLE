# Contributing

New to open source? This is a good place to start. Everything here is plain
React, plain CSS, and one Python script.

## Good first issues

- **Add course names.** `overrides/subjects.json` maps a base code like `UCS303`
  to "Operating Systems". 295 are done; ~180 codes are still missing, mostly
  higher-year electives. Add the ones from your own semester — one line each.
  **Cite the official source in your PR** (department scheme PDF, syllabus, or
  the institute Faculty-Assigned PDF). A guessed name will be rejected: a wrong
  course name is worse than a bare code.
- **Add faculty names.** Same idea in `overrides/faculty.json`, mapping initials
  like `NDH` to the full name.
- **Write a course description.** `overrides/descriptions.json` maps a base code
  to a couple of sentences shown when someone taps a class. Nothing is in there
  yet. Write about a course you have actually taken — what it covers, what the
  labs are like. Keep it factual; this is not a review site.
- **Add the exam datesheet.** When the Examination Section publishes it, put
  the dates into `overrides/exams.json`, keyed by the six-character course code
  (`UCS303`, not `UCS303L`). Everyone's papers are then matched from their own
  timetable, so each student sees only the ones they sit. Cite the official PDF
  in the PR — a wrong exam date is the worst bug this site could ship.
- **Add campus events.** `overrides/events.json` takes title, start, location
  and a `kind` of campus / gdg / exam / holiday. Only add what you can verify
  from an official notice or the organising society.
- **Report a wrong class.** Open an issue with your batch id, the day, and what
  the official sheet says.

## Bigger pieces we want

- Free-slot finder across several batches (when is everyone free?)
- Faculty view — where is a given teacher right now
- Room view — which lecture theatres are empty
- Offline support via a service worker
- Share-as-image for your week

## Ground rules

- Run `npm run build` before opening a PR; it type-checks.
- If you touch the parser, run `npm run parse` and paste the summary line
  (batches / class blocks / errors) in the PR description.
- Never lower the parser's validation. If a check is firing, the data is wrong,
  not the check.
