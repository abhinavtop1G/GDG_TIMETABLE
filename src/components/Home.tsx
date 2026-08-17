import { useEffect, useMemo, useRef, useState } from "react";
import GdgMark from "./GdgMark";
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
  /** Seeds the palette — used by shareable ?q= links and the design preview. */
  initialQuery?: string;
}

const REPO = "https://github.com/abhinavtop1G/GDG_TIMETABLE";
const AVATAR_COLORS = ["#4285F4", "#EA4335", "#FBBC04", "#34A853"];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Rank matches so an exact code outranks a prefix, which outranks a branch hit. */
function rank(b: BatchSummary, q: string): number {
  const label = displayId(b.id, b.tutorialGroup).toUpperCase();
  const id = b.id.toUpperCase();
  if (label === q || id === q) return 0;
  if (label.startsWith(q) || id.startsWith(q)) return 1;
  if (b.lectureGroup.toUpperCase().startsWith(q)) return 2;
  if (label.includes(q) || id.includes(q)) return 3;
  if (b.branch.toUpperCase().includes(q)) return 4;
  return 99;
}

export default function Home({
  batches,
  term,
  onPick,
  theme,
  onToggleTheme,
  initialQuery = "",
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [cursor, setCursor] = useState(0);
  const [browsing, setBrowsing] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return [];
    return batches
      .map((b) => ({ b, r: rank(b, q) }))
      .filter((x) => x.r < 99)
      .sort((x, y) => x.r - y.r || x.b.id.localeCompare(y.b.id))
      .slice(0, 7)
      .map((x) => x.b);
  }, [batches, query]);

  useEffect(() => setCursor(0), [query]);

  const years = useMemo(
    () => [...new Set(batches.map((b) => b.year))].sort(),
    [batches],
  );
  const branches = useMemo(
    () => (year === null ? [] : branchesForYear(batches, year)),
    [batches, year],
  );
  const browseList = useMemo(() => {
    if (year === null) return [];
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

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && matches[cursor]) {
      e.preventDefault();
      onPick(matches[cursor].id);
    }
  }

  return (
    <div className="home">
      <div className="mesh" aria-hidden="true">
        <span className="mesh__blob mesh__blob--a" />
        <span className="mesh__blob mesh__blob--b" />
        <span className="mesh__blob mesh__blob--c" />
        <span className="mesh__blob mesh__blob--d" />
      </div>

      <header className="home__bar">
        <span className="home__brand">
          <GdgMark size={22} />
          GDG on Campus · TIET
        </span>
        <button className="ghost-btn" onClick={onToggleTheme} aria-label="Switch theme">
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </header>

      <main className="stage">
        <p className="stage__term">{term}</p>
        <h1 className="stage__title">
          Your timetable,
          <span className="stage__grad"> beautifully.</span>
        </h1>

        <div className={`palette ${matches.length ? "palette--open" : ""}`}>
          <div className="palette__field">
            <svg className="palette__icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              className="palette__input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type your batch (e.g. 2Q31) and press Enter…"
              spellCheck={false}
              autoComplete="off"
              aria-label="Search for your batch"
            />
            {query && (
              <kbd className="palette__kbd">↵</kbd>
            )}
          </div>

          {matches.length > 0 && (
            <ul className="palette__list">
              {matches.map((b, i) => (
                <li key={b.id}>
                  <button
                    className={`hit ${i === cursor ? "hit--on" : ""}`}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => onPick(b.id)}
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <span className="hit__id">{displayId(b.id, b.tutorialGroup)}</span>
                    <span className="hit__branch">{b.branch || "—"}</span>
                    <span className="hit__year">{YEAR_LABEL[b.year]}</span>
                    <span className="hit__go">↵</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query && matches.length === 0 && (
            <p className="palette__empty">
              Nothing matches “{query}”. Your batch code looks like 2Q31 or 1B14 —
              or <button className="linky" onClick={() => setBrowsing(true)}>browse by year</button>.
            </p>
          )}
        </div>

        <button className="stage__browse" onClick={() => setBrowsing((v) => !v)}>
          {browsing ? "Hide the list" : "Don't know your code? Browse all batches"}
        </button>

        {browsing && (
          <section className="browse">
            <div className="browse__row">
              {years.map((y) => (
                <button
                  key={y}
                  className={`tag ${year === y ? "tag--on" : ""}`}
                  onClick={() => {
                    setYear(year === y ? null : y);
                    setBranch(null);
                  }}
                >
                  {YEAR_LABEL[y]}
                </button>
              ))}
            </div>

            {branches.length > 1 && (
              <div className="browse__row browse__row--sub">
                {branches.map((b) => (
                  <button
                    key={b}
                    className={`tag tag--sm ${branch === b ? "tag--on" : ""}`}
                    onClick={() => setBranch(branch === b ? null : b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}

            {browseList.length > 0 && (
              <div className="browse__grid">
                {browseList.map((b, i) => (
                  <button
                    key={b.id}
                    className="tile"
                    onClick={() => onPick(b.id)}
                    style={{ "--i": i % 24 } as React.CSSProperties}
                  >
                    <span className="tile__id">{displayId(b.id, b.tutorialGroup)}</span>
                    <span className="tile__sub">{b.classes} classes</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <p className="stage__count">
          {batches.length} batches · every branch · generated from the official sheet
        </p>
      </main>

      <footer className="home__foot">
        <p className="community__title">Built by the community</p>
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
          <a className="avatar" href={REPO} target="_blank" rel="noreferrer">
            <span className="avatar__ring avatar__ring--dashed">+</span>
            <span className="avatar__name">Join us</span>
          </a>
        </div>
        <a className="repo" href={REPO} target="_blank" rel="noreferrer">
          Repo link ↗
        </a>
      </footer>
    </div>
  );
}
