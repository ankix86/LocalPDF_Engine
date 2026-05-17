import { PDFDocument } from "pdf-lib";

export type PagePaddingIn = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const ZERO_PADDING: PagePaddingIn = { top: 0, right: 0, bottom: 0, left: 0 };

const PTS_PER_IN = 72;

export function isZeroPadding(p: PagePaddingIn | null | undefined): boolean {
  if (!p) return true;
  const eps = 0.0001;
  return (
    Math.abs(p.top) < eps &&
    Math.abs(p.right) < eps &&
    Math.abs(p.bottom) < eps &&
    Math.abs(p.left) < eps
  );
}

/**
 * Add white padding around each page's content. Original content size is preserved;
 * the page grows by the padding amounts on each side.
 *
 * `paddings` is 0-indexed; missing or zero entries keep the original page.
 */
export async function addPaddingToPdfPages(
  arrayBuffer: ArrayBuffer,
  paddings: Array<(PagePaddingIn | null | undefined)>
): Promise<Uint8Array> {
  const src = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const srcPages = src.getPages();

  for (let i = 0; i < srcPages.length; i += 1) {
    const pad = paddings[i];
    const srcPage = srcPages[i];
    const { width, height } = srcPage.getSize();

    if (!pad || isZeroPadding(pad)) {
      const [copied] = await out.copyPages(src, [i]);
      out.addPage(copied);
      continue;
    }

    const leftPt = pad.left * PTS_PER_IN;
    const rightPt = pad.right * PTS_PER_IN;
    const topPt = pad.top * PTS_PER_IN;
    const bottomPt = pad.bottom * PTS_PER_IN;

    const newW = width + leftPt + rightPt;
    const newH = height + topPt + bottomPt;

    const embedded = await out.embedPage(srcPage);
    const page = out.addPage([newW, newH]);
    page.drawPage(embedded, {
      x: leftPt,
      y: bottomPt,
      width,
      height,
    });
  }

  return out.save();
}
