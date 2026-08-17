import { useCallback, useRef } from "react";

/**
 * Pointer-driven 3D tilt.
 *
 * Writes rotation to CSS custom properties rather than re-rendering, so the
 * effect stays on the compositor and never triggers React work on mousemove.
 * Disabled for coarse pointers and for anyone who asked for reduced motion.
 */
export function useTilt(maxDeg = 6) {
  const ref = useRef<HTMLElement | null>(null);

  const enabled =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--rx", `${(-py * maxDeg).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(px * maxDeg).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${((px + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${((py + 0.5) * 100).toFixed(1)}%`);
    },
    [enabled, maxDeg],
  );

  const onLeave = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, []);

  return { ref, onPointerMove: onMove, onPointerLeave: onLeave };
}
