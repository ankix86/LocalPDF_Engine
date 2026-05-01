import { PDFDocument } from "pdf-lib";

export type CropRectFrac = {
  /** 0..1 from left */
  xFrac: number;
  /** 0..1 from top */
  yFrac: number;
  /** 0..1 width */
  wFrac: number;
  /** 0..1 height */
  hFrac: number;
};

type PdfLibBoundingBox = { left: number; bottom: number; right: number; top: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function normalizeCropRectFrac(rect: CropRectFrac): CropRectFrac {
  const x1 = clamp01(rect.xFrac);
  const y1 = clamp01(rect.yFrac);
  const x2 = clamp01(rect.xFrac + rect.wFrac);
  const y2 = clamp01(rect.yFrac + rect.hFrac);
  return {
    xFrac: Math.min(x1, x2),
    yFrac: Math.min(y1, y2),
    wFrac: Math.max(0, Math.abs(x2 - x1)),
    hFrac: Math.max(0, Math.abs(y2 - y1)),
  };
}

function fracToBoundingBox(pageWidth: number, pageHeight: number, rect: CropRectFrac): PdfLibBoundingBox {
  const n = normalizeCropRectFrac(rect);

  const left = n.xFrac * pageWidth;
  const right = (n.xFrac + n.wFrac) * pageWidth;

  // UI fractions are top-left origin; PDF is bottom-left origin
  const top = pageHeight - n.yFrac * pageHeight;
  const bottom = pageHeight - (n.yFrac + n.hFrac) * pageHeight;

  return {
    left: Math.max(0, Math.min(left, right)),
    right: Math.max(0, Math.max(left, right)),
    bottom: Math.max(0, Math.min(bottom, top)),
    top: Math.max(0, Math.max(bottom, top)),
  };
}

/**
 * Crop pages individually by embedding each page into a new PDF with a clipped
 * bounding box. This produces a "true crop" (not just setting CropBox metadata).
 *
 * `crops` is 0-indexed; any missing entry keeps the original page as-is.
 */
export async function cropPdfPages(
  arrayBuffer: ArrayBuffer,
  crops: Array<(CropRectFrac | null | undefined)>
): Promise<Uint8Array> {
  const src = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const out = await PDFDocument.create();

  const srcPages = src.getPages();

  for (let i = 0; i < srcPages.length; i += 1) {
    const crop = crops[i];
    const srcPage = srcPages[i];
    const { width, height } = srcPage.getSize();

    if (!crop) {
      const [copied] = await out.copyPages(src, [i]);
      out.addPage(copied);
      continue;
    }

    const box = fracToBoundingBox(width, height, crop);
    const cropW = Math.max(1, box.right - box.left);
    const cropH = Math.max(1, box.top - box.bottom);

    const embedded = await out.embedPage(srcPage, box);
    const page = out.addPage([cropW, cropH]);
    page.drawPage(embedded, { x: 0, y: 0, width: cropW, height: cropH });
  }

  return out.save();
}

