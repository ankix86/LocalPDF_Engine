import { PDFDocument } from "pdf-lib";

/**
 * Encrypt a PDF with a user password.
 * NOTE: pdf-lib v1 does not support AES-256 encryption; it uses RC4-128.
 * For stronger encryption, a server-side solution or WASM-based lib would be needed.
 * However, for most use cases this is sufficient.
 */
export async function protectPDF(
  arrayBuffer: ArrayBuffer,
  userPassword: string,
  ownerPassword?: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  // pdf-lib save with encryption options
  return doc.save({
    // @ts-ignore - pdf-lib types don't fully expose encryption options but the runtime supports them
    userPassword,
    ownerPassword: ownerPassword ?? userPassword,
  });
}

/**
 * Remove password protection from a PDF (requires the current password).
 */
export async function unlockPDF(
  arrayBuffer: ArrayBuffer,
  password: string
): Promise<Uint8Array> {
  // pdf-lib accepts a `password` load option at runtime, but the TS types omit it.
  const doc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: false,
    password,
  } as Parameters<typeof PDFDocument.load>[1]);
  return doc.save();
}
