import { useEffect, useState } from "react";

export interface CardTheme {
  id: string;
  name: string;
  /** Shown in the picker so the choice is legible before applying it. */
  blurb: string;
  /** Two swatch colours for the picker chip. */
  swatch: [string, string];
}

/**
 * Card styles are cosmetic skins over the same markup — they only restyle
 * `.card` and `.mrow`, never change what information is shown. All original
 * designs; nothing here reproduces licensed artwork or characters.
 */
export const CARD_THEMES: CardTheme[] = [
  {
    id: "aurora",
    name: "Aurora",
    blurb: "Frosted glass over a colour wash",
    swatch: ["#a5b4fc", "#f0abfc"],
  },
  {
    id: "blueprint",
    name: "Blueprint",
    blurb: "Drafting paper and fine cyan rules",
    swatch: ["#0b3a6f", "#7dd3fc"],
  },
  {
    id: "neon",
    name: "Neon Grid",
    blurb: "Midnight arcade, glowing edges",
    swatch: ["#0f0524", "#f0f"],
  },
  {
    id: "paper",
    name: "Paper Cut",
    blurb: "Warm card stock with a hard shadow",
    swatch: ["#fdf6e3", "#e07a5f"],
  },
  {
    id: "terminal",
    name: "Terminal",
    blurb: "Monospace on a phosphor screen",
    swatch: ["#04140a", "#4ade80"],
  },
];

const KEY = "gdg-tiet-timetable:cards";

export function useCardTheme(): [string, (id: string) => void] {
  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem(KEY);
    return CARD_THEMES.some((t) => t.id === saved) ? saved! : "aurora";
  });

  useEffect(() => {
    document.documentElement.dataset.cards = theme;
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return [theme, setTheme];
}
