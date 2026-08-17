export type ClassType =
  | "lecture"
  | "practical"
  | "tutorial"
  | "elective"
  | "seminar"
  | "discussion"
  | "class";

export interface ClassEntry {
  day: number;
  period: number;
  periods: number;
  start: string;
  end: string;
  code: string;
  type: ClassType;
  title: string;
  room: string;
  faculty: string;
  options: string[];
  note: string;
  raw: string;
  /** Set when a long block has been split into one card per period. */
  part?: { index: number; of: number };
}

export interface BatchSummary {
  id: string;
  year: number;
  branch: string;
  lectureGroup: string;
  tutorialGroup: string;
  classes: number;
}

export interface Index {
  term: string;
  source: string;
  sourceHash: string;
  generated: string;
  days: string[];
  periods: { index: number; start: string; end: string }[];
  batches: BatchSummary[];
  subjects: Record<string, string>;
  faculty: Record<string, string>;
  descriptions?: Record<string, string>;
}

export interface Batch {
  id: string;
  term: string;
  meta: {
    id: string;
    year: number;
    sheet: string;
    branch: string;
    lecture_group: string;
    tutorial_group: string;
  };
  classes: ClassEntry[];
}

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The rail spans the whole teaching day: first period start to last period end. */
export const DAY_START_MIN = 8 * 60;
export const DAY_END_MIN = 19 * 60 + 40;

export const YEAR_LABEL: Record<number, string> = {
  1: "First year",
  2: "Second year",
  3: "Third year",
  4: "Fourth year",
  5: "Postgraduate",
};

/**
 * Students say "2Q31", not "2Q3A". The workbook keys practical subgroups by
 * letter and tutorial groups by number for the same set of people, so prefer
 * the numbered form everywhere it exists and derive it where it doesn't.
 */
export function displayId(id: string, tutorialGroup?: string): string {
  if (tutorialGroup) return tutorialGroup;
  const m = id.match(/^(.*[0-9])([A-H])$/);
  if (!m) return id;
  return `${m[1]}${m[2].charCodeAt(0) - 64}`;
}

/** Course-code prefixes we are confident about, used when no name is known. */
export const DEPARTMENTS: Record<string, string> = {
  UCS: "Computer Science",
  UMA: "Mathematics",
  UPH: "Physics",
  UCH: "Chemistry",
  UHU: "Humanities",
  UEC: "Electronics",
  UEE: "Electrical",
  UME: "Mechanical",
  UCE: "Civil",
  UBT: "Biotechnology",
  UES: "Engineering Sciences",
  UEN: "Energy & Environment",
  UAI: "Artificial Intelligence",
  URA: "Robotics & AI",
  UBM: "Biomedical",
  UIT: "Information Technology",
  PBT: "Biotechnology",
  PCY: "Chemistry",
  PMA: "Mathematics",
  PPH: "Physics",
};

export function department(code: string): string {
  return DEPARTMENTS[code.slice(0, 3).toUpperCase()] ?? "";
}

/**
 * A two-period lab is one block in the data but reads better as one card per
 * period, matching how the printed timetable shows it.
 */
export function perPeriod(classes: ClassEntry[], periods: Index["periods"]): ClassEntry[] {
  const out: ClassEntry[] = [];
  for (const c of classes) {
    for (let i = 0; i < c.periods; i++) {
      const slot = periods.find((p) => p.index === c.period + i);
      out.push({
        ...c,
        period: c.period + i,
        periods: 1,
        start: slot?.start ?? c.start,
        end: slot?.end ?? c.end,
        part: c.periods > 1 ? { index: i + 1, of: c.periods } : undefined,
      });
    }
  }
  return out;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Monday = 0 ... Sunday = 6, matching the parser's day indices. */
export function dayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function minutesNow(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Resolved lazily so this module can be imported outside the browser
 *  (the wallpaper layout audit runs it in plain Node). */
function base(): string {
  return import.meta.env?.BASE_URL ?? "/";
}

export async function loadIndex(): Promise<Index> {
  const res = await fetch(`${base()}data/index.json`);
  if (!res.ok) throw new Error("Could not load the batch directory.");
  return res.json();
}

export async function loadBatch(id: string): Promise<Batch> {
  const res = await fetch(`${base()}data/batches/${encodeURIComponent(id)}.json`);
  if (!res.ok) throw new Error(`No timetable found for ${id}.`);
  return res.json();
}

export function classesOn(batch: Batch, day: number): ClassEntry[] {
  return batch.classes
    .filter((c) => c.day === day)
    .sort((a, b) => a.period - b.period);
}

export interface NowState {
  current?: ClassEntry;
  next?: ClassEntry;
  minutesLeft?: number;
  minutesUntil?: number;
}

export function resolveNow(batch: Batch, at: Date): NowState {
  const day = dayIndex(at);
  const mins = minutesNow(at);
  const today = classesOn(batch, day);

  const current = today.find(
    (c) => toMinutes(c.start) <= mins && mins < toMinutes(c.end),
  );
  const next = today.find((c) => toMinutes(c.start) > mins);

  return {
    current,
    next,
    minutesLeft: current ? toMinutes(current.end) - mins : undefined,
    minutesUntil: next ? toMinutes(next.start) - mins : undefined,
  };
}

/** Search across batch id, branch, and the lecture/tutorial group labels. */
export function searchBatches(batches: BatchSummary[], query: string): BatchSummary[] {
  const q = query.trim().toUpperCase().replace(/\s+/g, " ");
  if (!q) return batches;
  return batches.filter(
    (b) =>
      b.id.includes(q) ||
      displayId(b.id, b.tutorialGroup).toUpperCase().includes(q) ||
      b.lectureGroup.toUpperCase().includes(q) ||
      b.tutorialGroup.toUpperCase().includes(q) ||
      b.branch.toUpperCase().includes(q),
  );
}

/** Distinct branches for one year, for the home-page filter. */
export function branchesForYear(batches: BatchSummary[], year: number): string[] {
  return [...new Set(batches.filter((b) => b.year === year && b.branch).map((b) => b.branch))].sort();
}
