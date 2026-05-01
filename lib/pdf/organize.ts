import { PDFDocument } from "pdf-lib";

/**
 * Re-export pages in a custom order (0-indexed).
 * Pass the new order as an array of original page indices.
 * Omitting an index removes that page.
 */
export async function reorganizePages(
  arrayBuffer: ArrayBuffer,
  newOrder: number[]
): Promise<Uint8Array> {
  const src = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, newOrder);
  pages.forEach((p) => doc.addPage(p));
  return doc.save();
}

/**
 * Delete specific pages from a PDF (0-indexed).
 */
export async function deletePages(
  arrayBuffer: ArrayBuffer,
  indicesToDelete: number[]
): Promise<Uint8Array> {
  const src = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const total = src.getPageCount();
  const keep = Array.from({ length: total }, (_, i) => i).filter(
    (i) => !indicesToDelete.includes(i)
  );
  return reorganizePages(arrayBuffer, keep);
}
