import type { Batch, Index } from "./data";
import { DAY_SHORT, department, displayId, formatTime, perPeriod } from "./data";

/**
 * Wallpaper layout.
 *
 * This module computes *what* to draw, not how. It emits a flat list of draw
 * operations in device pixels, which `paint()` in wallpaper.ts executes onto a
 * canvas. Keeping the geometry pure means the layout can be checked for
 * overflow and collisions in a plain Node test, with no browser involved.
 */

export interface Preset {
  id: string;
  label: string;
  hint: string;
  width: number;
  height: number;
  /** Vertical space left clear at the top for the lock-screen clock. */
  safeTop: number;
}

export const PRESETS: Preset[] = [
  {
    id: "lock-ios",
    label: "iPhone lock screen",
    hint: "1179 × 2556 · clears the clock",
    width: 1179,
    height: 2556,
    safeTop: 620,
  },
  {
    id: "lock-android",
    label: "Android lock screen",
    hint: "1080 × 2400 · clears the clock",
    width: 1080,
    height: 2400,
    safeTop: 560,
  },
  {
    id: "home",
    label: "Phone home screen",
    hint: "1080 × 2400 · full bleed",
    width: 1080,
    height: 2400,
    safeTop: 150,
  },
  {
    id: "story",
    label: "Story / status",
    hint: "1080 × 1920 · for WhatsApp",
    width: 1080,
    height: 1920,
    safeTop: 260,
  },
  {
    id: "print",
    label: "A4 print",
    hint: "landscape · for the notice board",
    width: 3508,
    height: 2480,
    safeTop: 130,
  },
  {
    id: "desktop",
    label: "Laptop wallpaper",
    hint: "2560 × 1440",
    width: 2560,
    height: 1440,
    safeTop: 120,
  },
];

export type Op =
  | { t: "fill"; color: string }
  | { t: "glow"; x: number; y: number; r: number; color: string; alpha: number }
  | {
      t: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      radius?: number;
      fill?: string;
      stroke?: string;
      lineWidth?: number;
    }
  | {
      t: "text";
      x: number;
      y: number;
      text: string;
      size: number;
      color: string;
      weight?: number;
      mono?: boolean;
      align?: "left" | "center" | "right";
      tracking?: number;
      /** Cards tag their text so the layout audit can check line spacing. */
      group?: string;
    }
  | { t: "mark"; x: number; y: number; size: number; alpha: number };

export interface Palette {
  bg: string;
  surface: string;
  line: string;
  ink: string;
  muted: string;
  dim: string;
  types: Record<string, string>;
}

export const DARK: Palette = {
  bg: "#070810",
  surface: "#13152a",
  line: "rgba(255,255,255,0.10)",
  ink: "#f1f5f9",
  muted: "#94a3b8",
  dim: "#64748b",
  types: {
    lecture: "#34d399",
    practical: "#fb923c",
    tutorial: "#a78bfa",
    elective: "#f472b6",
    class: "#94a3b8",
    seminar: "#94a3b8",
    discussion: "#94a3b8",
  },
};

export const LIGHT: Palette = {
  bg: "#f7f8fc",
  surface: "#ffffff",
  line: "rgba(15,23,42,0.08)",
  ink: "#0f172a",
  muted: "#64748b",
  dim: "#94a3b8",
  types: {
    lecture: "#16a34a",
    practical: "#f97316",
    tutorial: "#8b5cf6",
    elective: "#ec4899",
    class: "#64748b",
    seminar: "#64748b",
    discussion: "#64748b",
  },
};

export interface Options {
  preset: Preset;
  palette: Palette;
  /** Show the full course name, not just the code. */
  names: boolean;
  /** Show faculty initials under the room. */
  faculty: boolean;
  /** Only this day, or the whole week. */
  onlyDay: number | null;
}

/** Approximate advance width. Close enough for wrapping decisions. */
function textWidth(text: string, size: number, mono = false): number {
  return text.length * size * (mono ? 0.62 : 0.60);
}

function wrap(text: string, size: number, maxWidth: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.length) {
    const last = lines[maxLines - 1];
    if (textWidth(last, size) > maxWidth) {
      lines[maxLines - 1] = `${last.slice(0, Math.max(3, Math.floor(maxWidth / (size * 0.53)) - 1))}…`;
    }
  }
  return lines;
}

/**
 * Rooms come through as "NA1 (G203)" or "F314 / B204". On a wallpaper the
 * column is narrow, so fall back progressively to the part that matters --
 * the actual room number -- rather than truncating mid-string.
 */
function fitRoom(room: string, size: number, maxWidth: number): string {
  const candidates = [room];
  const paren = room.match(/\(([^)]+)\)$/);
  if (paren) candidates.push(paren[1]);
  if (room.includes("/")) candidates.push(room.split("/")[0].trim());
  for (const c of candidates) {
    if (textWidth(c, size, true) <= maxWidth) return c;
  }
  return candidates[candidates.length - 1];
}

function typeColor(p: Palette, type: string): string {
  return p.types[type] ?? p.types.class;
}

/** rgba string from a #rrggbb hex plus alpha. */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function layout(batch: Batch, index: Index, opts: Options): Op[] {
  const { preset: P, palette: C } = opts;
  const ops: Op[] = [];
  const u = P.width / 1080; // horizontal scale, tuned against a 1080-wide phone
  const vu = P.height / 2400; // vertical scale, so a short wide sheet keeps its rows
  const pad = Math.round(46 * u);
  const padY = Math.round(46 * vu);
  const chrome = Math.min(u, vu * 1.4); // header furniture, capped on wide canvases

  ops.push({ t: "fill", color: C.bg });

  // Brand wash behind the header.
  const glowY = P.height * 0.35;
  // Four-blob aurora mesh matching the website background
  const isDark = opts.palette === DARK;
  const glowA = isDark ? 0.28 : 0.18;
  ops.push({ t: "glow", x: P.width * 0.08, y: glowY * 0.7, r: P.width * 0.55, color: "#4285f4", alpha: glowA });
  ops.push({ t: "glow", x: P.width * 0.55, y: glowY * 0.5, r: P.width * 0.42, color: "#8b5cf6", alpha: glowA * 0.75 });
  ops.push({ t: "glow", x: P.width * 0.25, y: P.height * 0.72, r: P.width * 0.5,  color: "#ec4899", alpha: glowA * 0.55 });
  ops.push({ t: "glow", x: P.width * 0.85, y: P.height * 0.65, r: P.width * 0.48, color: "#34a853", alpha: glowA * 0.6 });

  // ---- header ----
  const markSize = Math.round(64 * chrome);
  let y = P.safeTop;
  ops.push({ t: "mark", x: pad, y, size: markSize, alpha: 1 });
  ops.push({
    t: "text",
    x: pad + markSize + 22 * u,
    y: y + markSize * 0.38,
    text: "GDG ON CAMPUS · TIET",
    size: Math.round(20 * chrome),
    color: C.muted,
    weight: 500,
    tracking: 3 * u,
  });
  ops.push({
    t: "text",
    x: pad + markSize + 22 * u,
    y: y + markSize * 0.92,
    text: batch.term,
    size: Math.round(22 * chrome),
    color: C.dim,
  });
  ops.push({
    t: "text",
    x: P.width - pad,
    y: y + markSize * 0.72,
    text: displayId(batch.id, batch.meta.tutorial_group),
    size: Math.round(46 * chrome),
    color: C.ink,
    weight: 600,
    mono: true,
    align: "right",
  });

  y += markSize + 42 * vu;

  // ---- grid frame ----
  let days: number[];
  if (opts.onlyDay !== null) {
    days = [opts.onlyDay];
  } else {
    const width = batch.meta.year === 5 ? 7 : 6;
    const busy = new Set(batch.classes.map((c) => c.day));
    // Trailing empty days only -- dropping a blank Wednesday would be
    // disorienting, but a blank Saturday just wastes column width.
    let end = width;
    while (end > 1 && !busy.has(end - 1)) end--;
    days = Array.from({ length: end }, (_, i) => i);
  }
  const shown = perPeriod(batch.classes, index.periods).filter((c) => days.includes(c.day));
  const source = shown.length ? shown : batch.classes;
  const first = source.length ? Math.min(...source.map((c) => c.period)) : 1;
  const last = source.length ? Math.max(...source.map((c) => c.period)) : 8;
  const periods = index.periods.filter((p) => p.index >= first && p.index <= last);

  const footerH = Math.round(74 * vu);
  const gutter = Math.round(86 * u);
  const headerRow = Math.round(48 * vu);
  const gridTop = y + headerRow;
  const gridBottom = P.height - padY - footerH;
  const rowH = (gridBottom - gridTop) / periods.length;
  const colW = (P.width - pad * 2 - gutter) / days.length;

  // Type is sized by row height as well as canvas width. A wide, short canvas
  // (the A4 print sheet) has large columns but shallow rows, and scaling text
  // by width alone pushes it straight out of the card.
  const tu = Math.min(u, (rowH - Math.round(7 * vu) * 2) / 68);
  const colX = (i: number) => pad + gutter + i * colW;

  // Day headers
  days.forEach((d, i) => {
    ops.push({
      t: "text",
      x: colX(i) + colW / 2,
      y: y + headerRow * 0.62,
      text: DAY_SHORT[d].toUpperCase(),
      size: Math.round(22 * chrome),
      color: C.muted,
      weight: 600,
      align: "center",
      tracking: 3 * u,
    });
  });

  // Hour rules and labels
  periods.forEach((p, r) => {
    const ry = gridTop + r * rowH;
    ops.push({
      t: "rect",
      x: pad + gutter,
      y: ry,
      w: P.width - pad * 2 - gutter,
      h: 1,
      fill: C.line,
    });
    ops.push({
      t: "text",
      x: pad + gutter - 20 * u,
      y: ry + 26 * u,
      text: formatTime(p.start),
      size: Math.round(21 * Math.min(u, vu * 1.6)),
      color: C.dim,
      mono: true,
      align: "right",
    });
  });

  // Watermark, behind the cards.
  const wmSize = Math.min(colW * days.length, gridBottom - gridTop) * 0.62;
  ops.push({
    t: "mark",
    x: pad + gutter + (colW * days.length - wmSize) / 2,
    y: gridTop + (gridBottom - gridTop - wmSize) / 2,
    size: wmSize,
    alpha: 0.07,
  });

  // ---- class cards ----
  const gapX = Math.round(7 * u);
  const gapY = Math.round(7 * vu);
  for (const c of shown) {
    const i = days.indexOf(c.day);
    if (i < 0 || c.period < first) continue;
    const x = colX(i) + gapX;
    const w = colW - gapX * 2;
    const cy = gridTop + (c.period - first) * rowH + gapY;
    const h = rowH - gapY * 2;
    const color = typeColor(C, c.type);

    // Card: lighter glass tint on dark, clean white-tinted glass on light
    const isDarkPalette = opts.palette.bg.startsWith("#07") || opts.palette.bg.startsWith("#08");
    const cardFill = isDarkPalette
      ? tint(color, 0.22)
      : `rgba(255,255,255,0.72)`;
    const cardStroke = isDarkPalette
      ? tint(color, 0.5)
      : tint(color, 0.32);
    ops.push({
      t: "rect",
      x,
      y: cy,
      w,
      h,
      radius: 20 * u,
      fill: cardFill,
      stroke: cardStroke,
      lineWidth: Math.max(1.5, 2 * u),
    });

    const px = x + 18 * u;
    const innerW = w - 36 * u;
    const group = `${c.day}-${c.period}-${c.code}`;

    const metaSize = Math.round(19 * tu);
    const titleSize = Math.round(20 * tu);
    const lineH = titleSize * 1.18;

    // The course name is the headline. The code only appears when we have no
    // name for it, so the card never spends a line saying the same thing twice.
    const name = opts.names ? c.title || department(c.code) : "";
    const heading = name || c.code;
    const isCode = !name;

    const metaY = cy + h - 15 * tu;
    const facSize = Math.round(17 * tu);
    const roomText = c.room ? fitRoom(c.room, metaSize, innerW) : "";
    const roomW = roomText ? textWidth(roomText, metaSize, true) : 0;

    if (roomText) {
      ops.push({
        t: "text",
        x: px,
        y: metaY,
        text: roomText,
        size: metaSize,
        color: C.muted,
        mono: true,
        group,
      });
    }
    // Faculty shares the footer line only when it genuinely fits beside the
    // room; a long room name wins, since it is what gets you to the class.
    if (
      opts.faculty &&
      c.faculty &&
      textWidth(c.faculty, facSize) + roomW + 12 * u <= innerW
    ) {
      ops.push({
        t: "text",
        x: x + w - 18 * u,
        y: metaY,
        text: c.faculty,
        size: facSize,
        color: C.dim,
        align: "right",
        group,
      });
    }

    const budget = Math.max(
      1,
      Math.min(3, Math.floor((metaY - metaSize - (cy + 10 * tu)) / lineH)),
    );
    let ty = cy + 30 * tu;
    for (const line of wrap(heading, titleSize, innerW, budget)) {
      ops.push({
        t: "text",
        x: px,
        y: ty,
        text: line,
        size: titleSize,
        color: isCode ? color : C.ink,
        weight: 600,
        mono: isCode,
        group,
      });
      ty += lineH;
    }

    if (name && !isCode && budget >= 2 && ty + metaSize < metaY - metaSize) {
      ops.push({
        t: "text",
        x: px,
        y: ty,
        text: c.code,
        size: Math.round(17 * tu),
        color: tint(color, 0.85),
        mono: true,
        group,
      });
    }
  }

  // ---- footer ----
  const fy = P.height - padY - footerH / 2;
  const legend: [string, string][] = [
    ["lecture", "Lecture"],
    ["practical", "Practical"],
    ["tutorial", "Tutorial"],
  ];
  let lx = pad;
  const legendSize = Math.round(20 * chrome);
  for (const [key, label] of legend) {
    ops.push({
      t: "rect",
      x: lx,
      y: fy - legendSize * 0.55,
      w: legendSize * 0.62,
      h: legendSize * 0.62,
      radius: 5 * u,
      fill: typeColor(C, key),
    });
    ops.push({
      t: "text",
      x: lx + legendSize,
      y: fy,
      text: label,
      size: legendSize,
      color: C.muted,
    });
    lx += legendSize + textWidth(label, legendSize) + 34 * u;
  }
  ops.push({
    t: "text",
    x: P.width - pad,
    y: fy,
    text: "timetable.gdgtiet.com",
    size: legendSize,
    color: C.dim,
    align: "right",
  });

  return ops;
}
