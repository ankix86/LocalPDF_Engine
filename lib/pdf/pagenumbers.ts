import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PageNumberPosition =
  | "bottom-center"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "top-left"
  | "top-right";

export interface PageNumberOptions {
  position?: PageNumberPosition;
  fontSize?: number;
  startAt?: number;         // start counting from this number (default 1)
  format?: string;          // e.g. "Page {n} of {total}" (default "{n}")
  color?: { r: number; g: number; b: number };
  margin?: number;
}

export async function addPageNumbers(
  arrayBuffer: ArrayBuffer,
  opts: PageNumberOptions = {}
): Promise<Uint8Array> {
  const {
    position = "bottom-center",
    fontSize = 11,
    startAt = 1,
    format = "{n}",
    color = { r: 0.2, g: 0.2, b: 0.2 },
    margin = 24,
  } = opts;

  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;

  pages.forEach((page, i) => {
    const { width, height } = page.getSize();
    const n = i + startAt;
    const label = format.replace("{n}", String(n)).replace("{total}", String(total));
    const textWidth = font.widthOfTextAtSize(label, fontSize);

    let x: number;
    let y: number;

    switch (position) {
      case "bottom-center": x = (width - textWidth) / 2; y = margin; break;
      case "bottom-left":   x = margin; y = margin; break;
      case "bottom-right":  x = width - textWidth - margin; y = margin; break;
      case "top-center":    x = (width - textWidth) / 2; y = height - margin - fontSize; break;
      case "top-left":      x = margin; y = height - margin - fontSize; break;
      case "top-right":     x = width - textWidth - margin; y = height - margin - fontSize; break;
    }

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  });

  return doc.save();
}
