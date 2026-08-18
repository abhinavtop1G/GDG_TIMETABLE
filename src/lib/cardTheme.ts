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
    id: "comic",
    name: "Comic Ink",
    blurb: "Halftone dots and heavy ink lines",
    swatch: ["#ffd23f", "#e63946"],
  },
  {
    id: "odyssey",
    name: "Odyssey",
    blurb: "Deep space, starfield and chrome",
    swatch: ["#0b1026", "#8ab4ff"],
  },
  {
    id: "sandstorm",
    name: "Sandstorm",
    blurb: "Sun-bleached ochre and long shadow",
    swatch: ["#c8853b", "#3d2415"],
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
