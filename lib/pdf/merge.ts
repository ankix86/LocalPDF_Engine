import { PDFDocument } from "pdf-lib";

/**
 * Merge multiple PDF files into one, preserving all pages in order.
 */
export async function mergePDFs(arrayBuffers: ArrayBuffer[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();

  for (const buffer of arrayBuffers) {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  return merged.save();
}
