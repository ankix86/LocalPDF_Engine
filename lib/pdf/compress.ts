import { PDFDocument } from "pdf-lib";
import { renderPageToCanvas } from "./core";

export type CompressionLevel = "low" | "medium" | "high";

const QUALITY_MAP: Record<CompressionLevel, number> = {
  low: 0.85,
  medium: 0.65,
  high: 0.4,
};

const SCALE_MAP: Record<CompressionLevel, number> = {
  low: 1.2,
  medium: 1.0,
  high: 0.8,
};

/**
 * Compress a PDF by re-rendering each page to a JPEG image at reduced quality.
 * This trades text selectability for significant file-size reduction.
 */
export async function compressPDF(
  arrayBuffer: ArrayBuffer,
  level: CompressionLevel = "medium",
  onProgress?: (page: number, total: number) => void
): Promise<Uint8Array> {
  const quality = QUALITY_MAP[level];
  const scale = SCALE_MAP[level];

  // Determine page count without loading the full pdf-lib doc
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pageCount = srcDoc.getPageCount();
  const outDoc = await PDFDocument.create();

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.(i, pageCount);

    const canvas = await renderPageToCanvas(arrayBuffer, i, scale);
    const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = jpegDataUrl.split(",")[1];
    const imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const jpegImage = await outDoc.embedJpg(imageBytes);
    const page = outDoc.addPage([canvas.width, canvas.height]);
    page.drawImage(jpegImage, {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    });
  }

  return outDoc.save();
}
