import { useEffect, useRef, useState } from "react";
import { exportTimetable, type Format } from "../lib/export";
import { render } from "../lib/wallpaper";
import { DARK, LIGHT, PRESETS, type Options, type Preset } from "../lib/wallpaper-layout";
import { DAY_SHORT, dayIndex, type Batch, type Index } from "../lib/data";

interface Props {
  batch: Batch;
  index: Index;
  onClose: () => void;
}

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "png", label: "PNG", hint: "sharpest — best for wallpaper" },
  { id: "jpg", label: "JPG", hint: "smaller — best for sharing" },
  { id: "pdf", label: "PDF", hint: "one page — best for printing" },
];

export default function ExportStudio({ batch, index, onClose }: Props) {
  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [format, setFormat] = useState<Format>("png");
  const [dark, setDark] = useState(true);
  const [names, setNames] = useState(true);
  const [faculty, setFaculty] = useState(false);
  const [onlyDay, setOnlyDay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const opts: Options = { preset, palette: dark ? DARK : LIGHT, names, faculty, onlyDay };

  useEffect(() => {
    if (canvasRef.current) render(canvasRef.current, batch, index, opts);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const days = batch.meta.year === 5 ? 7 : 6;
  const today = dayIndex(new Date());

  return (
    <div className="sheet" role="dialog" aria-label="Download your timetable">
      <div className="sheet__panel studio">
        <div className="sheet__head">
          <div>
            <h2 className="sheet__title">Download your timetable</h2>
            <p className="sheet__body">
              Sized for your screen, with the top left clear for the clock.
            </p>
          </div>
          <button className="pill" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="studio__body">
          <div className="studio__preview">
            <canvas ref={canvasRef} className="studio__canvas" />
          </div>

          <div className="studio__controls">
            <fieldset className="field">
              <legend>Format</legend>
              <div className="field__row field__row--wrap">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    className={`opt ${format === f.id ? "opt--on" : ""}`}
                    onClick={() => setFormat(f.id)}
                  >
                    <span className="opt__label">{f.label}</span>
                    <span className="opt__hint">{f.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="field">
              <legend>Size</legend>
              <div className="field__row">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className={`opt ${p.id === preset.id ? "opt--on" : ""}`}
                    onClick={() => setPreset(p)}
                  >
                    <span className="opt__label">{p.label}</span>
                    <span className="opt__hint">{p.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="field">
              <legend>Days</legend>
              <div className="field__row field__row--wrap">
                <button
                  className={`opt opt--inline ${onlyDay === null ? "opt--on" : ""}`}
                  onClick={() => setOnlyDay(null)}
                >
                  Whole week
                </button>
                {Array.from({ length: days }, (_, d) => (
                  <button
                    key={d}
                    className={`opt opt--inline ${onlyDay === d ? "opt--on" : ""}`}
                    onClick={() => setOnlyDay(d)}
                  >
                    {DAY_SHORT[d]}
                    {d === today ? " ·" : ""}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="field">
              <legend>Style</legend>
              <div className="field__row field__row--wrap">
                <button
                  className={`opt opt--inline ${dark ? "opt--on" : ""}`}
                  onClick={() => setDark(true)}
                >
                  Dark
                </button>
                <button
                  className={`opt opt--inline ${!dark ? "opt--on" : ""}`}
                  onClick={() => setDark(false)}
                >
                  Light
                </button>
                <button
                  className={`opt opt--inline ${names ? "opt--on" : ""}`}
                  onClick={() => setNames(!names)}
                >
                  Course names
                </button>
                <button
                  className={`opt opt--inline ${faculty ? "opt--on" : ""}`}
                  onClick={() => setFaculty(!faculty)}
                >
                  Faculty
                </button>
              </div>
            </fieldset>

            <button
              className="pill pill--go"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await exportTimetable(batch, index, opts, format);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy
                ? "Preparing…"
                : `Download ${format.toUpperCase()} · ${preset.width} × ${preset.height}`}
            </button>
            <p className="studio__tip">
              On a phone: long-press the saved image and choose Use as wallpaper.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
