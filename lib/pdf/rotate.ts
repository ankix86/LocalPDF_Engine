import { PDFDocument, degrees } from "pdf-lib";

export type RotationAngle = 90 | 180 | 270;

/**
 * Rotate selected pages (or all pages) by the given angle.
 * pageIndices is 0-based; pass undefined to rotate all pages.
 */
export async function rotatePDF(
  arrayBuffer: ArrayBuffer,
  angle: RotationAngle,
  pageIndices?: number[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = doc.getPages();
  const targets = pageIndices ?? pages.map((_, i) => i);

  for (const idx of targets) {
    if (idx < 0 || idx >= pages.length) continue;
    const page = pages[idx];
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  }

  return doc.save();
}
