import { PDFDocument } from "pdf-lib";
import { encryptPDF as encryptPdfBytes } from "@pdfsmaller/pdf-encrypt-lite";
import { loadPdf } from "modern-pdf-lib";

/**
 * Encrypt a PDF with a user password (and optional distinct owner password).
 *
 * Uses pdf-lib to produce a clean traditional-xref PDF (preserves all
 * content faithfully), then applies RC4-128 encryption via pdf-encrypt-lite.
 * RC4-128 is universally supported by every PDF reader.
 */
export async function protectPDF(
  arrayBuffer: ArrayBuffer,
  userPassword: string,
  ownerPassword?: string
): Promise<Uint8Array> {
  if (!userPassword) {
    throw new Error("A password is required.");
  }

  const pdfLibDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  if (pdfLibDoc.getPageCount() === 0) {
    throw new Error("PDF has no pages.");
  }
  const cleanBytes = await pdfLibDoc.save({ useObjectStreams: false });

  return encryptPdfBytes(cleanBytes, userPassword, ownerPassword ?? userPassword);
}

/**
 * Remove password protection from a PDF (requires the current password).
 * Loads the encrypted PDF with modern-pdf-lib (decryption-on-load), then
 * re-saves through pdf-lib to guarantee a clean unprotected output.
 */
export async function unlockPDF(
  arrayBuffer: ArrayBuffer,
  password: string
): Promise<Uint8Array> {
  const decrypted = await loadPdf(arrayBuffer, { password });
  if (decrypted.getPageCount() === 0) {
    throw new Error("PDF has no pages.");
  }
  const rawBytes = await decrypted.save({ addDefaultPage: false });
  const clean = await PDFDocument.load(rawBytes, { ignoreEncryption: true });
  return clean.save();
}
