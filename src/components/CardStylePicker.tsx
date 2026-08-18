import { useEffect, useRef } from "react";
import { CARD_THEMES } from "../lib/cardTheme";

interface Props {
  value: string;
  onChange: (id: string) => void;
  onClose: () => void;
}

export default function CardStylePicker({ value, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  return (
    <div className="styles" ref={ref} role="dialog" aria-label="Card style">
      <p className="styles__title">Card style</p>
      <ul className="styles__list">
        {CARD_THEMES.map((t) => (
          <li key={t.id}>
            <button
              className={`style ${value === t.id ? "style--on" : ""}`}
              onClick={() => onChange(t.id)}
            >
              <span
                className="style__swatch"
                style={{
                  background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})`,
                }}
                aria-hidden="true"
              />
              <span className="style__text">
                <span className="style__name">{t.name}</span>
                <span className="style__blurb">{t.blurb}</span>
              </span>
              {value === t.id && <span className="style__tick">✓</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
