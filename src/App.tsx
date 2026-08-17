import { useCallback, useEffect, useMemo, useState } from "react";
import ElectivePicker from "./components/ElectivePicker";
import ExportStudio from "./components/ExportStudio";
import GdgMark from "./components/GdgMark";
import Home from "./components/Home";
import WeekBoard from "./components/WeekBoard";
import { downloadICS } from "./lib/ics";
import { useTheme } from "./lib/theme";
import {
  DAY_NAMES,
  DAY_SHORT,
  dayIndex,
  displayId,
  formatTime,
  loadBatch,
  loadIndex,
  electiveGroups,
  resolveNow,
  resolvePicks,
  YEAR_LABEL,
  type Batch,
  type Index,
  type Picks,
} from "./lib/data";

const STORAGE_KEY = "gdg-tiet-timetable:batch";
const PICKS_KEY = "gdg-tiet-timetable:electives";

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 900,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

export default function App() {
  const [index, setIndex] = useState<Index | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [electivesOpen, setElectivesOpen] = useState(false);
  const [picks, setPicks] = useState<Picks>({});
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const narrow = useIsNarrow();
  const [theme, toggleTheme] = useTheme();
  const today = dayIndex(now);
  const [focusDay, setFocusDay] = useState<number | null>(null);

  const debug = useMemo(
    () => new URLSearchParams(window.location.search).has("debug"),
    [],
  );

  useEffect(() => {
    loadIndex().then(setIndex).catch((e) => setError(e.message));
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setBatchId(saved);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!batchId) {
      setBatch(null);
      return;
    }
    loadBatch(batchId)
      .then((b) => {
        setBatch(b);
        setError(null);
      })
      .catch((e) => setError(e.message));

    // Elective picks are per batch, so switching batch loads that batch's set.
    try {
      const all = JSON.parse(localStorage.getItem(PICKS_KEY) ?? "{}");
      setPicks(all[batchId] ?? {});
    } catch {
      setPicks({});
    }
  }, [batchId]);

  const savePicks = useCallback(
    (next: Picks) => {
      setPicks(next);
      if (!batchId) return;
      try {
        const all = JSON.parse(localStorage.getItem(PICKS_KEY) ?? "{}");
        all[batchId] = next;
        localStorage.setItem(PICKS_KEY, JSON.stringify(all));
      } catch {
        /* storage full or blocked; picks still apply for this session */
      }
    },
    [batchId],
  );

  // A phone cannot show six columns legibly; land on today instead.
  useEffect(() => {
    setFocusDay(narrow ? Math.min(today, 5) : null);
  }, [narrow, today]);

  const pick = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setBatchId(id);
  }, []);

  const goHome = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBatchId(null);
  }, []);

  if (error) {
    return (
      <div className="app">
        <p className="notice">
          {error}
          <br />
          Reload the page — if it keeps failing, post in the GDG group so we can
          fix it.
        </p>
      </div>
    );
  }

  if (!index) {
    return (
      <div className="app">
        <p className="notice">Loading the timetable…</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <Home
        batches={index.batches}
        term={index.term}
        onPick={pick}
        theme={theme}
        onToggleTheme={toggleTheme}
        initialQuery={new URLSearchParams(window.location.search).get("q") ?? ""}
      />
    );
  }

  const resolved: Batch = { ...batch, classes: resolvePicks(batch.classes, picks) };
  const groups = electiveGroups(batch);
  const pendingElectives = groups.filter((g) => !picks[g.key]).length;

  const dayCount = batch.meta.year === 5 ? 7 : 6;
  const state = resolveNow(resolved, now);
  const label = displayId(batch.id, batch.meta.tutorial_group);

  return (
    <div className="app">
      <div className="mesh" aria-hidden="true">
        <span className="mesh__blob mesh__blob--a" />
        <span className="mesh__blob mesh__blob--b" />
        <span className="mesh__blob mesh__blob--c" />
        <span className="mesh__blob mesh__blob--d" />
      </div>

      <header className="top">
        <button className="top__brand" onClick={goHome} title="Change batch">
          <GdgMark size={32} />
          <div>
            <p className="top__eyebrow">GDG on Campus · TIET</p>
            <h1 className="top__title">Timetable</h1>
          </div>
        </button>

        <div className="top__right">
          <button
            className="pill pill--icon"
            onClick={toggleTheme}
            aria-label="Switch theme"
            title="Switch theme"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button className="pill" onClick={() => downloadICS(batch)}>
            Add to calendar
          </button>
          {groups.length > 0 && (
            <button
              className={`pill ${pendingElectives ? "pill--alert" : ""}`}
              onClick={() => setElectivesOpen(true)}
            >
              Electives
              {pendingElectives > 0 && (
                <span className="pill__count">{pendingElectives}</span>
              )}
            </button>
          )}
          <button className="pill pill--go" onClick={() => setStudioOpen(true)}>
            Download
          </button>
          <button className="pill pill--batch" onClick={goHome}>
            <span className="pill__id">{label}</span>
            <span className="pill__sub">{YEAR_LABEL[batch.meta.year]} · change</span>
          </button>
        </div>
      </header>

      <section className={`now now--${state.current?.type ?? "idle"}`}>
        <div className="now__body">
          {state.current ? (
            <>
              <p className="now__label">
                <span className="now__pulse" /> In class now
              </p>
              <h2 className="now__title">
                {state.current.title || state.current.code}
              </h2>
              <p className="now__detail">
                {state.current.room || "Room not listed"}
                {state.current.faculty && ` · ${state.current.faculty}`} ·{" "}
                {state.minutesLeft} min left
              </p>
            </>
          ) : state.next ? (
            <>
              <p className="now__label">Up next</p>
              <h2 className="now__title">{state.next.title || state.next.code}</h2>
              <p className="now__detail">
                {formatTime(state.next.start)} ·{" "}
                {state.next.room || "Room not listed"} · in {state.minutesUntil} min
              </p>
            </>
          ) : (
            <>
              <p className="now__label">{DAY_NAMES[today]}</p>
              <h2 className="now__title">You're done for the day</h2>
              <p className="now__detail">Nothing else on the schedule.</p>
            </>
          )}
        </div>
        <dl className="now__stats">
          <div>
            <dt>Classes a week</dt>
            <dd>{batch.classes.length}</dd>
          </div>
          <div>
            <dt>Branch</dt>
            <dd className="now__branch">{batch.meta.branch || batch.meta.sheet}</dd>
          </div>
        </dl>
      </section>

      <nav className="days">
        <button
          className={`day ${focusDay === null ? "day--on" : ""}`}
          onClick={() => setFocusDay(null)}
        >
          Full week
        </button>
        {Array.from({ length: dayCount }, (_, d) => (
          <button
            key={d}
            className={`day ${focusDay === d ? "day--on" : ""}`}
            onClick={() => setFocusDay(d)}
          >
            {DAY_SHORT[d]}
            {d === today && <span className="day__dot" />}
          </button>
        ))}
      </nav>

      {pendingElectives > 0 && (
        <button className="banner" onClick={() => setElectivesOpen(true)}>
          <span className="banner__dot" />
          <span>
            You have {pendingElectives} elective slot
            {pendingElectives > 1 ? "s" : ""} to choose. Pick yours to see the
            right room and teacher.
          </span>
          <span className="banner__go">Choose →</span>
        </button>
      )}

      <WeekBoard
        batch={resolved}
        index={index}
        days={dayCount}
        focusDay={focusDay}
        today={today}
        now={now}
        debug={debug}
        onSwipeDay={setFocusDay}
      />

      <footer className="foot">
        <div className="foot__legend">
          {[
            ["lecture", "Lecture"],
            ["practical", "Practical"],
            ["tutorial", "Tutorial"],
            ["elective", "Elective"],
          ].map(([key, text]) => (
            <span key={key} className={`legend legend--${key}`}>
              {text}
            </span>
          ))}
        </div>
        <p className="foot__note">
          {batch.term} · generated from the official sheet. If a class looks
          wrong, check the sheet and tell us.
        </p>
      </footer>

      {electivesOpen && (
        <ElectivePicker
          batch={batch}
          picks={picks}
          onChange={savePicks}
          onClose={() => setElectivesOpen(false)}
        />
      )}

      {studioOpen && (
        <ExportStudio
          batch={resolved}
          index={index}
          onClose={() => setStudioOpen(false)}
        />
      )}
    </div>
  );
}
