import {
  PDFDocument,
  PDFPage,
  rgb,
  StandardFonts,
  degrees,
} from "pdf-lib";

export interface WatermarkOptions {
  text: string;
  opacity?: number;       // 0–1, default 0.3
  fontSize?: number;      // default 60
  angle?: number;         // degrees, default 45
  color?: { r: number; g: number; b: number }; // default grey
  position?: "center" | "tile";
}

function applyTextWatermark(page: PDFPage, font: import("pdf-lib").PDFFont, opts: WatermarkOptions) {
  const { width, height } = page.getSize();
  const {
    text,
    opacity = 0.3,
    fontSize = 60,
    angle = 45,
    color = { r: 0.5, g: 0.5, b: 0.5 },
  } = opts;

  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = font.heightAtSize(fontSize);

  if (opts.position === "tile") {
    const cols = Math.ceil(width / (textWidth * 1.5)) + 1;
    const rows = Math.ceil(height / (textHeight * 4)) + 1;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        page.drawText(text, {
          x: col * textWidth * 1.5 - textWidth / 2,
          y: row * textHeight * 4,
          size: fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
          opacity,
          rotate: degrees(angle),
        });
      }
    }
  } else {
    // center
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - textHeight / 2,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(angle),
    });
  }
}

export async function watermarkPDF(
  arrayBuffer: ArrayBuffer,
  opts: WatermarkOptions
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const page of doc.getPages()) {
    applyTextWatermark(page, font, opts);
  }

  return doc.save();
}
