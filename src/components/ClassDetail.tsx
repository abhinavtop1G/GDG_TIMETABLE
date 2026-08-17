import { useEffect, useMemo } from "react";
import {
  DAY_NAMES,
  department,
  formatTime,
  perPeriod,
  toMinutes,
  type Batch,
  type ClassEntry,
  type Index,
} from "../lib/data";

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
  entry: ClassEntry;
  batch: Batch;
  index: Index;
  now: Date;
  debug: boolean;
  onClose: () => void;
}

export default function ClassDetail({ entry, batch, index, now, debug, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Every session of this course across the week, not just the one clicked.
  const sessions = useMemo(
    () =>
      batch.classes
        .filter((c) => c.code.slice(0, 6) === entry.code.slice(0, 6))
        .sort((a, b) => a.day - b.day || a.period - b.period),
    [batch, entry],
  );

  const stats = useMemo(() => {
    const kinds = new Map<string, number>();
    const rooms = new Set<string>();
    const faculty = new Set<string>();
    let hours = 0;
    for (const s of sessions) {
      kinds.set(s.type, (kinds.get(s.type) ?? 0) + 1);
      if (s.room) rooms.add(s.room);
      for (const f of s.faculty.split(" / ").filter(Boolean)) faculty.add(f);
      hours += (toMinutes(s.end) - toMinutes(s.start)) / 60;
    }
    return { kinds: [...kinds.entries()], rooms: [...rooms], faculty: [...faculty], hours };
  }, [sessions]);

  const description = index.descriptions?.[entry.code] ?? index.descriptions?.[entry.code.slice(0, 6)];
  const dept = department(entry.code);
  const cards = perPeriod(sessions, index.periods);
  const nowKey = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="detail" role="dialog" aria-modal="true" aria-label={entry.title || entry.code}>
      <button className="detail__scrim" onClick={onClose} aria-label="Close" />

      <article className={`detail__panel detail__panel--${entry.type}`}>
        <header className="detail__head">
          <div className="detail__badges">
            <span className="detail__kind">{TYPE_LABEL[entry.type] ?? entry.type}</span>
            <span className="detail__code">{entry.code}</span>
          </div>
          <h2 className="detail__title">{entry.title || entry.code}</h2>
          {dept && <p className="detail__dept">{dept} department</p>}
          {!entry.title && (
            <p className="detail__missing">
              We don't have the official name for this code yet. Found it in a
              department syllabus? Send it to us and it'll show up here.
            </p>
          )}
        </header>

        {description && <p className="detail__about">{description}</p>}

        {entry.options.length > 0 && (
          <div className="detail__block">
            <h3 className="detail__h3">Elective — one of these</h3>
            <ul className="detail__options">
              {entry.options.map((o) => (
                <li key={o}>{index.subjects?.[o] ? `${index.subjects[o]} (${o})` : o}</li>
              ))}
            </ul>
          </div>
        )}

        {entry.note && <p className="detail__note">{entry.note}</p>}

        <dl className="detail__facts">
          <div>
            <dt>This slot</dt>
            <dd>
              {DAY_NAMES[entry.day]}, {formatTime(entry.start)} – {formatTime(entry.end)}
            </dd>
          </div>
          <div>
            <dt>Room</dt>
            <dd>{entry.room || "Not listed"}</dd>
          </div>
          <div>
            <dt>Faculty</dt>
            <dd>{stats.faculty.length ? stats.faculty.join(", ") : "Not listed"}</dd>
          </div>
          <div>
            <dt>Hours a week</dt>
            <dd>
              {stats.hours % 1 === 0 ? stats.hours : stats.hours.toFixed(1)} h ·{" "}
              {stats.kinds
                .map(([k, n]) => `${n} ${TYPE_LABEL[k]?.toLowerCase() ?? k}${n > 1 ? "s" : ""}`)
                .join(", ")}
            </dd>
          </div>
        </dl>

        <div className="detail__block">
          <h3 className="detail__h3">Every session this week</h3>
          <ul className="detail__sessions">
            {cards.map((s) => {
              const live = s.day === nowKey && nowMin >= toMinutes(s.start) && nowMin < toMinutes(s.end);
              const same = s.day === entry.day && s.period === entry.period;
              return (
                <li
                  key={`${s.day}-${s.period}`}
                  className={`session ${same ? "session--this" : ""} ${live ? "session--live" : ""}`}
                >
                  <span className="session__day">{DAY_NAMES[s.day].slice(0, 3)}</span>
                  <span className="session__time">
                    {formatTime(s.start)} – {formatTime(s.end)}
                  </span>
                  <span className="session__kind">{TYPE_LABEL[s.type] ?? s.type}</span>
                  <span className="session__room">{s.room || "—"}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {stats.rooms.length > 1 && (
          <p className="detail__rooms">Rooms used: {stats.rooms.join(" · ")}</p>
        )}

        {debug && <p className="detail__raw">{entry.raw}</p>}

        <button className="pill pill--go detail__close" onClick={onClose}>
          Close
        </button>
      </article>
    </div>
  );
}
