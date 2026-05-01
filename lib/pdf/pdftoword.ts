import { loadPdfDocument } from "./core";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

/**
 * Extract text content from each page and produce a .docx file.
 * Formatting is approximate - paragraph breaks are inferred from
 * vertical position gaps between text items.
 */
export async function pdfToWord(arrayBuffer: ArrayBuffer): Promise<Blob> {
  const pdf = await loadPdfDocument(arrayBuffer);
  const sections: import("docx").ISectionOptions[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group text items into lines by their y-coordinate (rounded)
    const lines = new Map<number, string[]>();
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = Math.round(item.transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push(item.str);
    }

    const sortedY = Array.from(lines.keys()).sort((a, b) => b - a);
    const paragraphs: Paragraph[] = sortedY.map((y) => {
      const text = lines.get(y)!.join(" ").trim();
      return new Paragraph({ children: [new TextRun(text)] });
    });

    if (i > 1) {
      // Add a page-break paragraph before each subsequent page
      paragraphs.unshift(
        new Paragraph({
          children: [new TextRun({ text: `- Page ${i} -`, bold: true })],
          heading: HeadingLevel.HEADING_2,
        })
      );
    }

    sections.push({ children: paragraphs });
  }

  const doc = new Document({ sections });
  const buffer = await Packer.toBlob(doc);
  return buffer;
}
