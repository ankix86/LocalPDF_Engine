import { PDFDocument } from "pdf-lib";
import { renderPageToCanvas, loadPdfDocument } from "./core";

export type ImageFormat = "jpeg" | "png";

/**
 * Convert every page of a PDF to an image blob.
 * Returns one blob per page.
 */
export async function pdfToImages(
  arrayBuffer: ArrayBuffer,
  format: ImageFormat = "jpeg",
  scale = 2.0,
  quality = 0.92,
  onProgress?: (page: number, total: number) => void
): Promise<{ blob: Blob; filename: string }[]> {
  const pdf = await loadPdfDocument(arrayBuffer);
  const total = pdf.numPages;
  const results: { blob: Blob; filename: string }[] = [];

  for (let i = 1; i <= total; i++) {
    onProgress?.(i, total);
    const canvas = await renderPageToCanvas(arrayBuffer, i, scale);
    const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), mimeType, quality);
    });
    results.push({ blob, filename: `page-${i}.${format}` });
  }

  return results;
}

/**
 * Convert image files (JPG/PNG/WebP/BMP) to a single PDF.
 */
export async function imagesToPDF(files: File[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const mime = file.type;

    let img;
    if (mime === "image/jpeg" || mime === "image/jpg") {
      img = await doc.embedJpg(bytes);
    } else if (mime === "image/png") {
      img = await doc.embedPng(bytes);
    } else {
      // For WebP/BMP etc., convert via canvas first
      img = await embedViaCanvas(doc, file);
    }

    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }

  return doc.save();
}

async function embedViaCanvas(doc: PDFDocument, file: File) {
  return new Promise<import("pdf-lib").PDFImage>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        const ab = await blob!.arrayBuffer();
        const embedded = await doc.embedJpg(new Uint8Array(ab));
        URL.revokeObjectURL(url);
        resolve(embedded);
      }, "image/jpeg", 0.92);
    };
    img.onerror = reject;
    img.src = url;
  });
}
