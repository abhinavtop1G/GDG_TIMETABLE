import { useMemo, useRef } from "react";
import {
  DAY_NAMES,
  DAY_SHORT,
  department,
  formatTime,
  minutesNow,
  toMinutes,
  type Batch,
  type ClassEntry,
} from "../lib/data";

const TYPE_SHORT: Record<string, string> = {
  lecture: "LEC",
  practical: "LAB",
  tutorial: "TUT",
  elective: "ELE",
  seminar: "SEM",
  discussion: "DIS",
  class: "CLS",
};

interface Props {
  batch: Batch;
  days: number;
  day: number;
  today: number;
  now: Date;
  debug: boolean;
  onDay: (day: number) => void;
  onOpen: (entry: ClassEntry) => void;
  onWeekView: () => void;
}

/** A run of consecutive periods with the same class, kept as one card. */
interface Row {
  kind: "class" | "gap";
  entry?: ClassEntry;
  start?: string;
  end?: string;
  minutes?: number;
}

export default function MobileAgenda({
  batch,
  days,
  day,
  today,
  now,
  debug,
  onDay,
  onOpen,
  onWeekView,
}: Props) {
  const touch = useRef<{ x: number; y: number } | null>(null);

  /** Class count per day, for the week strip. */
  const density = useMemo(() => {
    const counts = new Array(days).fill(0);
    for (const c of batch.classes) if (c.day < days) counts[c.day] += 1;
    return counts;
  }, [batch, days]);

  /**
   * The day as a list. Empty periods become a single compact "free" divider
   * instead of a stack of blank rows, which is what made the grid three
   * screens tall on a phone.
   */
  const rows = useMemo<Row[]>(() => {
    const classes = batch.classes
      .filter((c) => c.day === day)
      .sort((a, b) => a.period - b.period);
    if (!classes.length) return [];

    const out: Row[] = [];
    let previousEnd: string | null = null;

    for (const c of classes) {
      if (previousEnd) {
        const gap = toMinutes(c.start) - toMinutes(previousEnd);
        if (gap >= 50) {
          out.push({ kind: "gap", start: previousEnd, end: c.start, minutes: gap });
        }
      }
      out.push({ kind: "class", entry: c });
      previousEnd = c.end;
    }
    return out;
  }, [batch, day]);

  const totalMinutes = rows
    .filter((r) => r.kind === "class")
    .reduce((n, r) => n + (toMinutes(r.entry!.end) - toMinutes(r.entry!.start)), 0);

  const nowMin = minutesNow(now);
  const isToday = day === today;

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const next = dx < 0 ? day + 1 : day - 1;
    if (next >= 0 && next < days) onDay(next);
  }

  // A ten-class day cannot fit a small phone at comfortable density, so the
  // list tightens itself rather than forcing the student to scroll.
  const classCount = rows.filter((r) => r.kind === "class").length;
  const dense = classCount >= 8;

  return (
    <section
      className={`agenda ${dense ? "agenda--dense" : ""}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <nav className="strip" aria-label="Day">
        {Array.from({ length: days }, (_, d) => (
          <button
            key={d}
            className={`strip__day ${d === day ? "strip__day--on" : ""} ${
              d === today ? "strip__day--today" : ""
            }`}
            onClick={() => onDay(d)}
            aria-current={d === day ? "true" : undefined}
          >
            <span className="strip__label">{DAY_SHORT[d].slice(0, 1)}</span>
            <span className="strip__bar" style={{ "--n": density[d] } as React.CSSProperties} />
          </button>
        ))}
      </nav>

      <div className="strip__week">
        <button className="week-btn" onClick={onWeekView}>
          Full week ↗
        </button>
      </div>

      <header className="agenda__head">
        <h2 className="agenda__day">
          {DAY_NAMES[day]}
          {isToday && <span className="agenda__today">Today</span>}
        </h2>
        <p className="agenda__meta">
          {rows.filter((r) => r.kind === "class").length} classes ·{" "}
          {Math.floor(totalMinutes / 60)}h {totalMinutes % 60 ? `${totalMinutes % 60}m` : ""}
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="agenda__empty">
          <span className="agenda__emptyIcon" aria-hidden="true">
            ○
          </span>
          <p className="agenda__emptyTitle">Nothing scheduled</p>
          <p className="agenda__emptyBody">The whole day is yours.</p>
        </div>
      ) : (
        <ol className="agenda__list">
          {rows.map((row, i) => {
            if (row.kind === "gap") {
              const h = Math.floor(row.minutes! / 60);
              const m = row.minutes! % 60;
              return (
                <li key={`gap-${i}`} className="gap">
                  <span className="gap__line" />
                  <span className="gap__text">
                    {h ? `${h}h` : ""} {m ? `${m}m` : ""} free
                  </span>
                  <span className="gap__line" />
                </li>
              );
            }

            const c = row.entry!;
            const live = isToday && nowMin >= toMinutes(c.start) && nowMin < toMinutes(c.end);
            const dept = c.title ? "" : department(c.code);

            return (
              <li key={`${c.day}-${c.period}-${c.code}`}>
                <button
                  className={`mrow mrow--${c.type} ${live ? "mrow--live" : ""}`}
                  onClick={() => onOpen(c)}
                >
                  <span className="mrow__time">
                    <span className="mrow__start">{formatTime(c.start).replace(/ ?[ap]m/, "")}</span>
                    <span className="mrow__end">{formatTime(c.end).replace(/ ?[ap]m/, "")}</span>
                  </span>

                  <span className="mrow__body">
                    <span className="mrow__title">
                      {c.type === "elective" && !c.picked
                        ? "Choose your elective"
                        : c.title || c.code}
                    </span>
                    <span className="mrow__meta">
                      {c.room && <span className="mrow__room">{c.room}</span>}
                      {c.faculty && <span className="mrow__fac">{c.faculty}</span>}
                      {!c.room && !c.faculty && dept && <span className="mrow__fac">{dept}</span>}
                    </span>
                    {c.note && <span className="mrow__note">{c.note}</span>}
                    {debug && <span className="mrow__raw">{c.raw}</span>}
                  </span>

                  <span className="mrow__tag">{TYPE_SHORT[c.type] ?? "CLS"}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
