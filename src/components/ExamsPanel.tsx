import { useEffect, useMemo, useState } from "react";
import { DAY_SHORT, baseCode, type Batch } from "../lib/data";

interface Exam {
  date: string;
  session?: string;
  start?: string;
  end?: string;
  room?: string;
}

interface ExamFile {
  title?: string;
  source?: string;
  updated?: string;
  exams: Record<string, Exam>;
}

interface CampusEvent {
  title: string;
  start: string;
  end?: string;
  location?: string;
  kind?: string;
  url?: string;
}

interface Props {
  batch: Batch;
  onClose: () => void;
}

const BASE = import.meta.env?.BASE_URL ?? "/";
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function prettyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export default function ExamsPanel({ batch, onClose }: Props) {
  const [tab, setTab] = useState<"exams" | "calendar">("exams");
  const [examFile, setExamFile] = useState<ExamFile | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [cursor, setCursor] = useState(() => new Date());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    fetch(`${BASE}data/exams.json`)
      .then((r) => r.json())
      .then(setExamFile)
      .catch(() => setExamFile({ exams: {} }));
    fetch(`${BASE}data/events.json`)
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]));
  }, []);

  /** The student's own papers: their courses joined against the datesheet. */
  const myExams = useMemo(() => {
    if (!examFile) return [];
    const codes = new Map<string, string>();
    for (const c of batch.classes) {
      const b = baseCode(c.code);
      if (!codes.has(b)) codes.set(b, c.title || c.code);
    }
    return [...codes.entries()]
      .map(([code, title]) => ({ code, title, exam: examFile.exams[code] }))
      .filter((x) => x.exam)
      .sort((a, b) => a.exam!.date.localeCompare(b.exam!.date));
  }, [examFile, batch]);

  const clashes = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const e of myExams) byDate.set(e.exam!.date, (byDate.get(e.exam!.date) ?? 0) + 1);
    return new Set([...byDate.entries()].filter(([, n]) => n > 1).map(([d]) => d));
  }, [myExams]);

  // ---- calendar grid ----
  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const total = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);
    return { year, month, cells };
  }, [cursor]);

  const marks = useMemo(() => {
    const map = new Map<string, string[]>();
    const add = (iso: string, kind: string) => {
      const list = map.get(iso) ?? [];
      if (!list.includes(kind)) list.push(kind);
      map.set(iso, list);
    };
    for (const e of events) add(e.start.slice(0, 10), e.kind ?? "campus");
    for (const e of myExams) add(e.exam!.date, "exam");
    return map;
  }, [events, myExams]);

  const upcoming = useMemo(
    () =>
      [...events]
        .filter((e) => new Date(e.start) >= new Date(Date.now() - 86_400_000))
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 6),
    [events],
  );

  const iso = (day: number) =>
    `${grid.year}-${String(grid.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="detail" role="dialog" aria-modal="true" aria-label="Exams and calendar">
      <button className="detail__scrim" onClick={onClose} aria-label="Close" />

      <article className="detail__panel exams">
        <div className="exams__tabs" role="tablist">
          <button
            className={`exams__tab ${tab === "exams" ? "exams__tab--on" : ""}`}
            onClick={() => setTab("exams")}
            role="tab"
            aria-selected={tab === "exams"}
          >
            Exam dates
          </button>
          <button
            className={`exams__tab ${tab === "calendar" ? "exams__tab--on" : ""}`}
            onClick={() => setTab("calendar")}
            role="tab"
            aria-selected={tab === "calendar"}
          >
            Campus calendar
          </button>
        </div>

        {tab === "exams" ? (
          <>
            {myExams.length === 0 ? (
              <div className="blank">
                <p className="blank__title">No datesheet published yet</p>
                <p className="blank__body">
                  When the Examination Section releases the datesheet, your
                  papers appear here automatically — matched to the courses in
                  your own timetable, so you only see the ones you sit.
                </p>
                <p className="blank__hint">
                  Maintainers: fill <code>overrides/exams.json</code> from the
                  official PDF, keyed by course code.
                </p>
              </div>
            ) : (
              <>
                <p className="exams__head">
                  {examFile?.title ?? "Examinations"} · {myExams.length} papers
                  {examFile?.updated && ` · updated ${examFile.updated}`}
                </p>
                <ol className="exams__list">
                  {myExams.map(({ code, title, exam }) => {
                    const left = daysUntil(exam!.date);
                    return (
                      <li key={code} className="exam">
                        <span className="exam__when">
                          <span className="exam__date">{prettyDate(exam!.date)}</span>
                          <span className="exam__in">
                            {left === 0 ? "today" : left > 0 ? `in ${left}d` : "done"}
                          </span>
                        </span>
                        <span className="exam__body">
                          <span className="exam__title">{title}</span>
                          <span className="exam__meta">
                            {code}
                            {exam!.session && ` · ${exam!.session}`}
                            {exam!.start && ` · ${exam!.start}`}
                            {exam!.room && ` · ${exam!.room}`}
                          </span>
                        </span>
                        {clashes.has(exam!.date) && (
                          <span className="exam__clash" title="Two papers the same day">
                            2×
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {examFile?.source && (
                  <a
                    className="exams__source"
                    href={examFile.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official datesheet ↗
                  </a>
                )}
                <p className="exams__warn">
                  Always confirm against the official datesheet before an exam.
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <div className="cal__bar">
              <button
                className="cal__nav"
                onClick={() => setCursor(new Date(grid.year, grid.month - 1, 1))}
                aria-label="Previous month"
              >
                ‹
              </button>
              <span className="cal__month">
                {MONTHS[grid.month]} {grid.year}
              </span>
              <button
                className="cal__nav"
                onClick={() => setCursor(new Date(grid.year, grid.month + 1, 1))}
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            <div className="cal">
              {DAY_SHORT.map((d) => (
                <span key={d} className="cal__dow">
                  {d.slice(0, 1)}
                </span>
              ))}
              {grid.cells.map((day, i) => {
                if (day === null) return <span key={`e${i}`} className="cal__cell" />;
                const key = iso(day);
                const kinds = marks.get(key) ?? [];
                return (
                  <span
                    key={key}
                    className={`cal__cell cal__cell--day ${
                      key === todayIso ? "cal__cell--today" : ""
                    }`}
                  >
                    {day}
                    {kinds.length > 0 && (
                      <span className="cal__dots">
                        {kinds.slice(0, 3).map((k) => (
                          <i key={k} className={`cal__dot cal__dot--${k}`} />
                        ))}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>

            <div className="cal__legend">
              <span className="cal__key">
                <i className="cal__dot cal__dot--campus" /> Campus
              </span>
              <span className="cal__key">
                <i className="cal__dot cal__dot--gdg" /> GDG
              </span>
              <span className="cal__key">
                <i className="cal__dot cal__dot--exam" /> Exam
              </span>
            </div>

            {upcoming.length === 0 ? (
              <div className="blank">
                <p className="blank__title">Nothing on the calendar yet</p>
                <p className="blank__body">
                  Society events, fests and holidays show up here once they're
                  added.
                </p>
                <p className="blank__hint">
                  Maintainers: add entries to <code>overrides/events.json</code>.
                </p>
              </div>
            ) : (
              <ol className="evlist">
                {upcoming.map((e, i) => (
                  <li key={i} className={`ev ev--${e.kind ?? "campus"}`}>
                    <span className="ev__date">{prettyDate(e.start.slice(0, 10))}</span>
                    <span className="ev__body">
                      <span className="ev__title">{e.title}</span>
                      {e.location && <span className="ev__where">{e.location}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

        <button className="pill pill--go detail__close" onClick={onClose}>
          Close
        </button>
      </article>
    </div>
  );
}
