import { useMemo, useRef, useState } from "react";
import ClassDetail from "./ClassDetail";
import GdgMark from "./GdgMark";
import { useTilt } from "../lib/tilt";
import {
  DAY_NAMES,
  DAY_SHORT,
  department,
  formatTime,
  minutesNow,
  perPeriod,
  toMinutes,
  type Batch,
  type ClassEntry,
  type Index,
} from "../lib/data";

const ROW_HEIGHT = 108;

const TYPE_LABEL: Record<string, string> = {
  lecture: "Lecture",
  practical: "Practical",
  tutorial: "Tutorial",
  elective: "Elective",
  seminar: "Seminar",
  discussion: "Discussion",
  class: "Class",
};

interface Props {
  batch: Batch;
  index: Index;
  days: number;
  focusDay: number | null;
  today: number;
  now: Date;
  debug: boolean;
  onSwipeDay?: (day: number) => void;
}

export default function WeekBoard({
  batch,
  index,
  days,
  focusDay,
  today,
  now,
  debug,
  onSwipeDay,
}: Props) {
  const [open, setOpen] = useState<ClassEntry | null>(null);
  const cards = useMemo(
    () => perPeriod(batch.classes, index.periods),
    [batch, index],
  );

  const shown =
    focusDay === null ? Array.from({ length: days }, (_, i) => i) : [focusDay];

  const periods = useMemo(() => {
    const visible = cards.filter((c) => shown.includes(c.day));
    const source = visible.length ? visible : cards;
    if (!source.length) return index.periods.slice(0, 8);
    const from = Math.min(...source.map((c) => c.period));
    const to = Math.max(...source.map((c) => c.period));
    return index.periods.filter((p) => p.index >= from && p.index <= to);
  }, [cards, shown, index]);

  const firstPeriod = periods[0].index;
  const gridStart = toMinutes(periods[0].start);
  const gridEnd = toMinutes(periods[periods.length - 1].end);
  const nowMin = minutesNow(now);
  const nowVisible =
    shown.includes(today) && nowMin > gridStart && nowMin < gridEnd;
  const nowOffset =
    ((nowMin - gridStart) / (gridEnd - gridStart)) * (periods.length * ROW_HEIGHT);

  const touch = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    const t0 = e.touches[0];
    touch.current = { x: t0.clientX, y: t0.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (focusDay === null || !touch.current) return;
    const t0 = e.changedTouches[0];
    const dx = t0.clientX - touch.current.x;
    const dy = t0.clientY - touch.current.y;
    touch.current = null;
    // Horizontal intent only, so vertical scrolling never changes the day.
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    const next = dx < 0 ? focusDay + 1 : focusDay - 1;
    if (next >= 0 && next < days) onSwipeDay?.(next);
  }

  return (
    <div
      className={`board ${focusDay !== null ? "board--single" : ""}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="board__scroll">
        <div
          className="board__grid"
          style={{
            gridTemplateColumns: `5.5rem repeat(${shown.length}, minmax(11rem, 1fr))`,
            gridTemplateRows: `3.5rem repeat(${periods.length}, ${ROW_HEIGHT}px)`,
          }}
        >
          <div className="board__corner" />

          {shown.map((d, col) => (
            <div
              key={d}
              className={`board__day ${d === today ? "board__day--today" : ""}`}
              style={{ gridColumn: col + 2, gridRow: 1 }}
            >
              <span className="board__dayFull">{DAY_NAMES[d]}</span>
              <span className="board__dayShort">{DAY_SHORT[d]}</span>
            </div>
          ))}

          {shown.map((d, col) =>
            d === today ? (
              <div
                key={`tint-${d}`}
                className="board__todayCol"
                style={{
                  gridColumn: col + 2,
                  gridRow: `2 / span ${periods.length}`,
                }}
              />
            ) : null,
          )}

          {periods.map((p, row) => (
            <div
              key={p.index}
              className="board__hour"
              style={{ gridColumn: 1, gridRow: row + 2 }}
            >
              <span className="board__hourTime">{formatTime(p.start)}</span>
              <span className="board__hourDot" />
            </div>
          ))}

          {periods.map((p, row) =>
            shown.map((d, col) => (
              <div
                key={`${p.index}-${d}`}
                className="board__cell"
                style={{ gridColumn: col + 2, gridRow: row + 2 }}
              />
            )),
          )}

          <div
            className="board__watermark"
            style={{
              gridColumn: `2 / span ${shown.length}`,
              gridRow: `2 / span ${periods.length}`,
            }}
          >
            <GdgMark size={300} />
          </div>

          {cards
            .filter((c) => shown.includes(c.day) && c.period >= firstPeriod)
            .map((c, i) => (
              <Card
                key={`${c.day}-${c.period}-${c.code}`}
                entry={c}
                index={i}
                col={shown.indexOf(c.day)}
                onOpen={() => setOpen(c)}
                column={shown.indexOf(c.day) + 2}
                row={c.period - firstPeriod + 2}
                live={
                  c.day === today &&
                  nowMin >= toMinutes(c.start) &&
                  nowMin < toMinutes(c.end)
                }
                debug={debug}
              />
            ))}

          {nowVisible && (
            <div
              className="board__nowWrap"
              style={{
                gridColumn: `1 / span ${shown.length + 1}`,
                gridRow: `2 / span ${periods.length}`,
              }}
            >
              <div className="board__nowLine" style={{ top: nowOffset }}>
                <span className="board__nowTime">
                  {now.getHours() % 12 || 12}:
                  {String(now.getMinutes()).padStart(2, "0")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {open && (
        <ClassDetail
          entry={open}
          batch={batch}
          index={index}
          now={now}
          debug={debug}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function Card({
  entry,
  index,
  col,
  column,
  row,
  live,
  debug,
  onOpen,
}: {
  entry: ClassEntry;
  index: number;
  col: number;
  column: number;
  row: number;
  live: boolean;
  debug: boolean;
  onOpen: () => void;
}) {
  const tilt = useTilt();
  const dept = entry.title ? "" : department(entry.code);
  return (
    <article
      className={`card card--${entry.type} ${live ? "card--live" : ""} ${entry.picked ? "card--picked" : ""}`}
      {...tilt}
      style={
        {
          gridColumn: column,
          gridRow: row,
          "--i": index,
          "--col": col,
        } as React.CSSProperties
      }
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      title={[
        entry.title || entry.code,
        entry.title ? entry.code : "",
        entry.room,
        entry.faculty,
        entry.note,
      ]
        .filter(Boolean)
        .join(" · ")}
    >
      <header className="card__top">
        <span className="card__kind">{TYPE_LABEL[entry.type] ?? entry.type}</span>
        {entry.part && (
          <span className="card__part">
            {entry.part.index}/{entry.part.of}
          </span>
        )}
      </header>

      <h3 className="card__title">
        {entry.type === "elective" && !entry.picked
          ? "Choose your elective"
          : entry.title || entry.code}
      </h3>
      {dept && <span className="card__dept">{dept}</span>}

      {entry.note && <span className="card__note">{entry.note}</span>}

      <footer className="card__foot">
        {entry.room && <span className="card__room">{entry.room}</span>}
        {entry.faculty && <span className="card__faculty">{entry.faculty}</span>}
        {entry.title && <span className="card__chip">{entry.code}</span>}
      </footer>

      {entry.type === "elective" && !entry.picked && (
        <span className="card__options">{entry.choices?.length ?? entry.options.length} options</span>
      )}
      {debug && <span className="card__raw">{entry.raw}</span>}
    </article>
  );
}
