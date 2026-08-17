import { useEffect, useMemo, useState } from "react";
import Badge from "./Badge";
import { CONTRIBUTORS } from "../lib/contributors";
import {
  branchesForYear,
  displayId,
  YEAR_LABEL,
  type BatchSummary,
} from "../lib/data";

interface Props {
  batches: BatchSummary[];
  term: string;
  onPick: (id: string) => void;
  theme: string;
  onToggleTheme: () => void;
}

const REPO = "https://github.com/abhinavtop1G/gdg-tiet-timetable";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];

export default function Home({ batches, term, onPick, theme, onToggleTheme }: Props) {
  const [year, setYear] = useState<number | "">("");
  const [branch, setBranch] = useState<string>("");
  const [batchId, setBatchId] = useState<string>("");

  const years = useMemo(() => {
    const set = new Set(batches.map((b) => b.year));
    return [...set].sort();
  }, [batches]);

  const branches = useMemo(
    () => (year === "" ? [] : branchesForYear(batches, year)),
    [batches, year],
  );

  const options = useMemo(() => {
    if (year === "") return [];
    return batches
      .filter((b) => b.year === year && (!branch || b.branch === branch))
      .sort((a, b) =>
        displayId(a.id, a.tutorialGroup).localeCompare(
          displayId(b.id, b.tutorialGroup),
          undefined,
          { numeric: true },
        ),
      );
  }, [batches, year, branch]);

  useEffect(() => setBranch(""), [year]);
  useEffect(() => setBatchId(""), [year, branch]);

  return (
    <div className="home">
      <div className="glow" aria-hidden="true" />

      <header className="home__top">
        <span className="home__wordmark">GDG TIMETABLE</span>
      </header>

      <section className="hero">
        <div className="hero__art">
          <Badge size={310} />
        </div>

        <div className="hero__panel">
          <h1 className="hero__title">
            GDG Timetable <span className="hero__term">{term.replace("August - December ", "Odd ")}</span>
          </h1>
          <p className="hero__sub">Thapar Institute of Engineering &amp; Technology</p>

          <p className="hero__lede">
            Every batch, every branch — your week, readable at a glance. Pick
            once and we'll remember it.
          </p>

          <div className="select">
            <label className="select__label" htmlFor="year">
              Year
            </label>
            <select
              id="year"
              className="select__field"
              value={year}
              onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">Select your year</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {YEAR_LABEL[y] ?? `Year ${y}`}
                </option>
              ))}
            </select>
          </div>

          <div className={`select ${year === "" ? "select--off" : ""}`}>
            <label className="select__label" htmlFor="branch">
              Branch
            </label>
            <select
              id="branch"
              className="select__field"
              value={branch}
              disabled={year === ""}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className={`select ${year === "" ? "select--off" : ""}`}>
            <label className="select__label" htmlFor="batch">
              Batch
            </label>
            <select
              id="batch"
              className="select__field"
              value={batchId}
              disabled={year === ""}
              onChange={(e) => setBatchId(e.target.value)}
            >
              <option value="">
                {year === "" ? "Pick a year first" : `Select from ${options.length}`}
              </option>
              {options.map((b) => (
                <option key={b.id} value={b.id}>
                  {displayId(b.id, b.tutorialGroup)}
                  {b.branch && branch === "" ? ` — ${b.branch}` : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            className="cta"
            disabled={!batchId}
            onClick={() => batchId && onPick(batchId)}
          >
            {batchId
              ? `Open ${displayId(batchId, options.find((b) => b.id === batchId)?.tutorialGroup)}`
              : "Show my timetable"}
          </button>

          <p className="hero__note">
            {batches.length} batches · generated from the official {term} sheet
          </p>
        </div>
      </section>

      <section className="community">
        <h2 className="community__title">Built by the community</h2>
        <div className="community__row">
          {CONTRIBUTORS.map((c, i) => (
            <a
              key={c.name}
              className="avatar"
              href={c.github ? `https://github.com/${c.github}` : REPO}
              target="_blank"
              rel="noreferrer"
              title={c.role ? `${c.name} — ${c.role}` : c.name}
            >
              <span
                className="avatar__ring"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {initials(c.name)}
              </span>
              <span className="avatar__name">{c.name}</span>
            </a>
          ))}
          <a className="avatar avatar--join" href={REPO} target="_blank" rel="noreferrer">
            <span className="avatar__ring avatar__ring--dashed">+</span>
            <span className="avatar__name">Join us</span>
          </a>
        </div>

        <a className="repo" href={REPO} target="_blank" rel="noreferrer">
          Repo link ↗
        </a>
      </section>

      <footer className="home__foot">
        <div className="cluster">
          <span className="cluster__mark" aria-hidden="true">
            <svg viewBox="0 0 100 100" width="20" height="20" fill="none" strokeWidth="13" strokeLinecap="round">
              <path d="M44 24 L20 50" stroke="#EA4335" />
              <path d="M20 50 L44 76" stroke="#4285F4" />
              <path d="M56 24 L80 50" stroke="#34A853" />
              <path d="M80 50 L56 76" stroke="#FBBC04" />
            </svg>
          </span>
          <button
            className="cluster__btn"
            onClick={onToggleTheme}
            aria-label="Switch theme"
            title="Switch theme"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <a className="cluster__btn" href={REPO} target="_blank" rel="noreferrer" title="Source code">
            ⌥
          </a>
        </div>
        <p className="home__fine">
          Built by GDG on Campus, TIET. Always check the official sheet for
          anything that looks wrong.
        </p>
      </footer>
    </div>
  );
}
