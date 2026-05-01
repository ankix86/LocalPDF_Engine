import { loadPdfDocument, renderPageFromDoc } from "./core";

export interface OcrProgress {
  page: number;
  total: number;
  status: string;
}

/**
 * Run Tesseract OCR on every page of a PDF and return extracted text.
 * tesseract.js is dynamically imported to avoid SSR issues and to keep
 * the main bundle small.
 */
export async function ocrPDF(
  arrayBuffer: ArrayBuffer,
  language = "eng",
  onProgress?: (p: OcrProgress) => void
): Promise<string> {
  const Tesseract = (await import("tesseract.js")).default;

  // Load the PDF once - re-using the same document proxy avoids detaching
  // the ArrayBuffer across multiple renderPageToCanvas calls.
  const pdf = await loadPdfDocument(arrayBuffer);
  const total = pdf.numPages;
  const textParts: string[] = [];

  for (let i = 1; i <= total; i++) {
    onProgress?.({ page: i, total, status: "rendering" });
    const canvas = await renderPageFromDoc(pdf, i, 2.0);
    const dataUrl = canvas.toDataURL("image/png");

    onProgress?.({ page: i, total, status: "recognizing" });
    const result = await Tesseract.recognize(dataUrl, language, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          onProgress?.({
            page: i,
            total,
            status: `recognizing (${Math.round(m.progress * 100)}%)`,
          });
        }
      },
    });

    textParts.push(`=== Page ${i} ===\n${result.data.text}`);
  }

  return textParts.join("\n\n");
}
