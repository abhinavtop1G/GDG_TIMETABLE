import type { Batch, Index } from "./data";
import { layout, type Op, type Options } from "./wallpaper-layout";

const SANS = `"Plus Jakarta Sans", Inter, system-ui, sans-serif`;
const MONO = `"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;

/** The GDG chevron mark, drawn in device pixels. */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number) {
  const bars: [number, number, number, number, string][] = [
    [0.44, 0.24, 0.2, 0.5, "#EA4335"],
    [0.2, 0.5, 0.44, 0.76, "#4285F4"],
    [0.56, 0.24, 0.8, 0.5, "#34A853"],
    [0.8, 0.5, 0.56, 0.76, "#FBBC04"],
  ];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = s * 0.125;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [x1, y1, x2, y2, color] of bars) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + x1 * s, y + y1 * s);
    ctx.lineTo(x + x2 * s, y + y2 * s);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function paint(ctx: CanvasRenderingContext2D, ops: Op[], width: number, height: number) {
  for (const op of ops) {
    switch (op.t) {
      case "fill":
        ctx.fillStyle = op.color;
        ctx.fillRect(0, 0, width, height);
        break;

      case "glow": {
        const g = ctx.createRadialGradient(op.x, op.y, 0, op.x, op.y, op.r);
        const n = parseInt(op.color.slice(1), 16);
        const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
        // Two-stop gradient: peak alpha at centre, fade to transparent.
        // Gaussian-style midstop makes the bloom look softer.
        g.addColorStop(0,   `rgba(${rgb},${op.alpha})`);
        g.addColorStop(0.4, `rgba(${rgb},${(op.alpha * 0.5).toFixed(3)})`);
        g.addColorStop(1,   `rgba(${rgb},0)`);
        ctx.save();
        ctx.filter = "blur(80px)";
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(op.x, op.y, op.r, op.r * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }

      case "rect":
        if (op.radius) roundRect(ctx, op.x, op.y, op.w, op.h, op.radius);
        if (op.fill) {
          ctx.fillStyle = op.fill;
          if (op.radius) ctx.fill();
          else ctx.fillRect(op.x, op.y, op.w, op.h);
        }
        if (op.stroke) {
          ctx.strokeStyle = op.stroke;
          ctx.lineWidth = op.lineWidth ?? 1;
          if (op.radius) ctx.stroke();
          else ctx.strokeRect(op.x, op.y, op.w, op.h);
        }
        break;

      case "text":
        ctx.font = `${op.weight ?? 400} ${op.size}px ${op.mono ? MONO : SANS}`;
        ctx.fillStyle = op.color;
        ctx.textAlign = op.align ?? "left";
        ctx.textBaseline = "alphabetic";
        if (op.tracking) {
          // Letter spacing is not universally supported; emit per glyph.
          const chars = [...op.text];
          const widths = chars.map((ch) => ctx.measureText(ch).width + op.tracking!);
          const total = widths.reduce((a, b) => a + b, 0);
          let cx =
            op.align === "center" ? op.x - total / 2 : op.align === "right" ? op.x - total : op.x;
          ctx.textAlign = "left";
          chars.forEach((ch, i) => {
            ctx.fillText(ch, cx, op.y);
            cx += widths[i];
          });
        } else {
          ctx.fillText(op.text, op.x, op.y);
        }
        break;

      case "mark":
        drawMark(ctx, op.x, op.y, op.size, op.alpha);
        break;
    }
  }
}

export function render(
  canvas: HTMLCanvasElement,
  batch: Batch,
  index: Index,
  opts: Options,
): void {
  const { width, height } = opts.preset;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  paint(ctx, layout(batch, index, opts), width, height);
}

export async function downloadWallpaper(
  batch: Batch,
  index: Index,
  opts: Options,
): Promise<void> {
  const canvas = document.createElement("canvas");
  render(canvas, batch, index, opts);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `TIET-${batch.id}-${opts.preset.id}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
