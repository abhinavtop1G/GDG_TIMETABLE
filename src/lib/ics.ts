import type { Batch, ClassEntry } from "./data";
import { DAY_NAMES } from "./data";

/** Last teaching day of the Aug–Dec 2026 term. Update once per semester. */
const TERM_END = new Date("2026-12-15T23:59:00");
const ICS_DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function localStamp(d: Date, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(h)}${pad(m)}00`
  );
}

function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** First occurrence of `day` (Mon=0) on or after today. */
function firstOccurrence(day: number, from = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const current = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() + ((day - current + 7) % 7));
  return d;
}

function escape(text: string): string {
  return text.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

function summaryFor(c: ClassEntry): string {
  const label = c.title || c.code;
  const kind = c.type === "practical" ? "Lab" : c.type === "tutorial" ? "Tutorial" : "";
  return kind ? `${label} (${kind})` : label;
}

export function buildICS(batch: Batch): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GDG on Campus TIET//Timetable//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(`TIET ${batch.id} — ${batch.term}`)}`,
    "X-WR-TIMEZONE:Asia/Kolkata",
  ];

  const stamp = utcStamp(new Date());

  batch.classes.forEach((c, i) => {
    const first = firstOccurrence(c.day);
    const details = [
      c.code !== (c.title || c.code) ? `Course code: ${c.code}` : `Course: ${c.code}`,
      c.faculty ? `Faculty: ${c.faculty}` : "",
      c.options.length ? `Options: ${c.options.join(", ")}` : "",
      c.note ? `Note: ${c.note}` : "",
      `Batch ${batch.id} · ${DAY_NAMES[c.day]} period ${c.period}`,
    ]
      .filter(Boolean)
      .join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${batch.id}-${i}@timetable.gdgtiet`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Asia/Kolkata:${localStamp(first, c.start)}`,
      `DTEND;TZID=Asia/Kolkata:${localStamp(first, c.end)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${ICS_DAYS[c.day]};UNTIL=${utcStamp(TERM_END)}`,
      `SUMMARY:${escape(summaryFor(c))}`,
      c.room ? `LOCATION:${escape(c.room)}` : "",
      `DESCRIPTION:${escape(details)}`,
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

export function downloadICS(batch: Batch): void {
  const blob = new Blob([buildICS(batch)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `TIET-${batch.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
