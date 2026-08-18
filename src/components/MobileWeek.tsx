import { useMemo } from "react";
import {
  DAY_SHORT,
  formatTime,
  perPeriod,
  type Batch,
  type ClassEntry,
  type Index,
} from "../lib/data";

interface Props {
  batch: Batch;
  index: Index;
  days: number;
  today: number;
  onOpen: (entry: ClassEntry) => void;
}

/**
 * The whole week on one phone screen.
 *
 * Two things make it fit where the desktop grid could not: empty periods are
 * dropped entirely (a batch uses 11 of 14 on average, and the unused ones are
 * always the early and late ones), and the rows are `1fr` inside a
 * viewport-height container, so they divide whatever space exists rather than
 * being a fixed pixel height that overflows.
 */
export default function MobileWeek({ batch, index, days, today, onOpen }: Props) {
  const cards = useMemo(
    () => perPeriod(batch.classes, index.periods),
    [batch, index],
  );

  // Only the periods that actually carry a class somewhere this week.
  const periods = useMemo(() => {
    const used = new Set(cards.map((c) => c.period));
    return index.periods.filter((p) => used.has(p.index));
  }, [cards, index]);

  const rowOf = useMemo(() => {
    const map = new Map<number, number>();
    periods.forEach((p, i) => map.set(p.index, i + 2)); // +2: header row is 1
    return map;
  }, [periods]);

  if (!periods.length) {
    return <p className="mweek__empty">No classes this week.</p>;
  }

  return (
    <div
      className="mweek"
      style={
        {
          "--rows": periods.length,
          "--cols": days,
        } as React.CSSProperties
      }
    >
      <div className="mweek__grid">
        <div className="mweek__corner" />

        {Array.from({ length: days }, (_, d) => (
          <div
            key={d}
            className={`mweek__day ${d === today ? "mweek__day--today" : ""}`}
            style={{ gridColumn: d + 2, gridRow: 1 }}
          >
            {DAY_SHORT[d].slice(0, 1)}
          </div>
        ))}

        {periods.map((p, i) => (
          <div
            key={p.index}
            className="mweek__time"
            style={{ gridColumn: 1, gridRow: i + 2 }}
          >
            {formatTime(p.start).replace(/ ?([ap])m/, "$1")}
          </div>
        ))}

        {Array.from({ length: days }, (_, d) =>
          d === today ? (
            <div
              key={`t${d}`}
              className="mweek__todayCol"
              style={{ gridColumn: d + 2, gridRow: `2 / span ${periods.length}` }}
            />
          ) : null,
        )}

        {cards.map((c) => {
          const row = rowOf.get(c.period);
          if (row === undefined || c.day >= days) return null;
          return (
            <button
              key={`${c.day}-${c.period}-${c.code}`}
              className={`mchip mchip--${c.type}`}
              style={{ gridColumn: c.day + 2, gridRow: row }}
              onClick={() => onOpen(c)}
              title={`${c.title || c.code} · ${c.room}`}
            >
              <span className="mchip__code">{c.code}</span>
              {c.room && <span className="mchip__room">{c.room}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
