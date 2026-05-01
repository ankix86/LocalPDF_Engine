// Lazy-load pdfjs-dist so it only runs in the browser.
// The worker is loaded from the same CDN version to avoid mismatches.
let _pdfjs: typeof import("pdfjs-dist") | null = null;

export async function getPdfJs() {
  if (_pdfjs) return _pdfjs;
  _pdfjs = await import("pdfjs-dist");
  _pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return _pdfjs;
}

export async function loadPdfDocument(arrayBuffer: ArrayBuffer) {
  const pdfjs = await getPdfJs();
  // .slice(0) creates an independent copy so pdfjs can transfer it to its
  // worker without detaching the caller's buffer.
  return pdfjs.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
}

/** Render one page from an already-loaded PDFDocumentProxy. */
export async function renderPageFromDoc(
  pdf: Awaited<ReturnType<typeof loadPdfDocument>>,
  pageNumber: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
  return canvas;
}

/** Render a single PDF page to an off-screen canvas and return the canvas. */
export async function renderPageToCanvas(
  arrayBuffer: ArrayBuffer,
  pageNumber: number,
  scale = 1.5
): Promise<HTMLCanvasElement> {
  const pdf = await loadPdfDocument(arrayBuffer);
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

/** Render all pages and return an array of data-URL strings (for thumbnails). */
export async function renderAllPageThumbnails(
  arrayBuffer: ArrayBuffer,
  scale = 0.3
): Promise<string[]> {
  const pdf = await loadPdfDocument(arrayBuffer);
  const thumbnails: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    thumbnails.push(canvas.toDataURL("image/jpeg", 0.7));
  }

  return thumbnails;
}

/** Return the page count of a PDF without fully loading it. */
export async function getPdfPageCount(arrayBuffer: ArrayBuffer): Promise<number> {
  const pdf = await loadPdfDocument(arrayBuffer);
  return pdf.numPages;
}
