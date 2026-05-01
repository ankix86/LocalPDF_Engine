import { PDFDocument } from "pdf-lib";

export type SplitRange = { from: number; to: number; label?: string };

/**
 * Split a PDF into multiple PDFs, one per range.
 * Page numbers are 1-indexed.
 */
export async function splitPDF(
  arrayBuffer: ArrayBuffer,
  ranges: SplitRange[]
): Promise<{ bytes: Uint8Array; label: string }[]> {
  const src = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const results: { bytes: Uint8Array; label: string }[] = [];

  for (const range of ranges) {
    const doc = await PDFDocument.create();
    const from = Math.max(1, range.from);
    const to = Math.min(src.getPageCount(), range.to);
    const indices = Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i);
    const pages = await doc.copyPages(src, indices);
    pages.forEach((p) => doc.addPage(p));
    const bytes = await doc.save();
    results.push({ bytes, label: range.label ?? `pages-${from}-${to}` });
  }

  return results;
}

/**
 * Parse a range string like "1-3, 5, 7-9" into SplitRange objects.
 * Returns null if the string is invalid.
 */
export function parseRangeString(input: string, maxPage: number): SplitRange[] | null {
  try {
    const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
    const ranges: SplitRange[] = [];
    for (const part of parts) {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map(Number);
        if (isNaN(a) || isNaN(b) || a < 1 || b < a || b > maxPage) return null;
        ranges.push({ from: a, to: b, label: `pages-${a}-${b}` });
      } else {
        const n = Number(part);
        if (isNaN(n) || n < 1 || n > maxPage) return null;
        ranges.push({ from: n, to: n, label: `page-${n}` });
      }
    }
    return ranges.length > 0 ? ranges : null;
  } catch {
    return null;
  }
}

/**
 * Split a PDF into individual pages, one PDF per page.
 */
export async function splitPDFByPage(
  arrayBuffer: ArrayBuffer
): Promise<{ bytes: Uint8Array; label: string }[]> {
  const src = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const total = src.getPageCount();
  const results: { bytes: Uint8Array; label: string }[] = [];

  for (let i = 0; i < total; i++) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(src, [i]);
    doc.addPage(page);
    results.push({ bytes: await doc.save(), label: `page-${i + 1}` });
  }

  return results;
}
