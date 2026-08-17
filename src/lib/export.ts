import type { Batch, Index } from "./data";
import { render } from "./wallpaper";
import type { Options } from "./wallpaper-layout";

export type Format = "png" | "jpg" | "pdf";

function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode the image."))),
      type,
      quality,
    ),
  );
}

// --------------------------------------------------------------------------
// PDF
// --------------------------------------------------------------------------

const A4_SHORT = 595.28;
const A4_LONG = 841.89;

/**
 * Wraps an already-encoded JPEG in a one-page PDF.
 *
 * PDF supports JPEG natively through the DCTDecode filter, so the image bytes
 * go in untouched and no encoding library is needed -- the whole file is a few
 * hundred bytes of structure around the picture. Offsets in the cross-reference
 * table must be exact, so everything is assembled as bytes, never as a string.
 */
export function buildPDF(jpeg: Uint8Array, pxWidth: number, pxHeight: number, title: string): Blob {
  const landscape = pxWidth >= pxHeight;
  const pageW = landscape ? A4_LONG : A4_SHORT;
  const pageH = landscape ? A4_SHORT : A4_LONG;
  const margin = 18;

  const scale = Math.min(
    (pageW - margin * 2) / pxWidth,
    (pageH - margin * 2) / pxHeight,
  );
  const w = pxWidth * scale;
  const h = pxHeight * scale;
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;

  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === "string" ? enc.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const startObject = () => offsets.push(length);

  const f = (n: number) => n.toFixed(2);
  const content = `q ${f(w)} 0 0 ${f(h)} ${f(x)} ${f(y)} cm /Im0 Do Q\n`;
  const safeTitle = title.replace(/[()\\]/g, "");

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  startObject();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObject();
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  startObject();
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(pageW)} ${f(pageH)}] ` +
      `/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
  );

  startObject();
  push(`4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

  startObject();
  push(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxWidth} /Height ${pxHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
      `/Length ${jpeg.length} >>\nstream\n`,
  );
  push(jpeg);
  push("\nendstream\nendobj\n");

  startObject();
  push(
    `6 0 obj\n<< /Title (${safeTitle}) /Producer (GDG on Campus TIET Timetable) >>\nendobj\n`,
  );

  const xrefStart = length;
  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  push(xref);
  push(
    `trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  );

  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

// --------------------------------------------------------------------------

export async function exportTimetable(
  batch: Batch,
  index: Index,
  opts: Options,
  format: Format,
): Promise<void> {
  const canvas = document.createElement("canvas");
  render(canvas, batch, index, opts);
  const name = `TIET-${batch.id}-${opts.preset.id}`;

  if (format === "png") {
    save(await toBlob(canvas, "image/png"), `${name}.png`);
    return;
  }
  if (format === "jpg") {
    save(await toBlob(canvas, "image/jpeg", 0.94), `${name}.jpg`);
    return;
  }

  const jpeg = new Uint8Array(await (await toBlob(canvas, "image/jpeg", 0.94)).arrayBuffer());
  save(
    buildPDF(jpeg, canvas.width, canvas.height, `${batch.id} timetable — ${batch.term}`),
    `${name}.pdf`,
  );
}
