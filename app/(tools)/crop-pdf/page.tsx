"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ToolLayout, { DownloadSuccess, PrimaryButton, SecondaryButton, ToolCard } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import PDFThumbnails from "@/components/shared/PDFThumbnail";
import { renderPageToCanvas } from "@/lib/pdf/core";
import { cropPdfPages, type CropRectFrac } from "@/lib/pdf/crop";
import { downloadBlob, getBaseName, pdfBytes } from "@/lib/utils";

type DragMode =
  | { kind: "move"; start: { x: number; y: number }; startRect: CropRectFrac }
  | { kind: "resize"; handle: ResizeHandle; start: { x: number; y: number }; startRect: CropRectFrac };

type ResizeHandle = "n" | "e" | "s" | "w" | "nw" | "ne" | "sw" | "se";

const FULL_PAGE_CROP: CropRectFrac = { xFrac: 0, yFrac: 0, wFrac: 1, hFrac: 1 };
const RESIZE_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  n: "ns-resize",
  e: "ew-resize",
  s: "ns-resize",
  w: "ew-resize",
  nw: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  se: "nwse-resize",
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function normalizeRect(r: CropRectFrac): CropRectFrac {
  const x1 = clamp01(r.xFrac);
  const y1 = clamp01(r.yFrac);
  const x2 = clamp01(r.xFrac + r.wFrac);
  const y2 = clamp01(r.yFrac + r.hFrac);
  return {
    xFrac: Math.min(x1, x2),
    yFrac: Math.min(y1, y2),
    wFrac: Math.max(0, Math.abs(x2 - x1)),
    hFrac: Math.max(0, Math.abs(y2 - y1)),
  };
}

function pointInRect(p: { x: number; y: number }, r: CropRectFrac) {
  return p.x >= r.xFrac && p.x <= r.xFrac + r.wFrac && p.y >= r.yFrac && p.y <= r.yFrac + r.hFrac;
}

function getRelPoint(clientX: number, clientY: number, el: HTMLElement | null) {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    x: clamp01((clientX - rect.left) / Math.max(1, rect.width)),
    y: clamp01((clientY - rect.top) / Math.max(1, rect.height)),
  };
}

function minSizeClamp(r: CropRectFrac, minFrac = 0.02): CropRectFrac {
  const n = normalizeRect(r);
  if (n.wFrac < minFrac || n.hFrac < minFrac) return n;
  return n;
}

function isFullPageCrop(rect: CropRectFrac | null | undefined) {
  if (!rect) return false;
  const n = normalizeRect(rect);
  return n.xFrac <= 0.001 && n.yFrac <= 0.001 && n.wFrac >= 0.999 && n.hFrac >= 0.999;
}

function getHandleStyle(handle: ResizeHandle): React.CSSProperties {
  const middleOffset = "calc(50% - 12px)";
  return {
    left: handle.includes("w") ? "-12px" : handle === "n" || handle === "s" ? middleOffset : undefined,
    right: handle.includes("e") ? "-12px" : undefined,
    top: handle.includes("n") ? "-12px" : handle === "e" || handle === "w" ? middleOffset : undefined,
    bottom: handle.includes("s") ? "-12px" : undefined,
    cursor: HANDLE_CURSOR[handle],
  };
}

export default function CropPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [targetPage, setTargetPage] = useState(0);
  const [crops, setCrops] = useState<Array<CropRectFrac | null>>([]);

  const [drag, setDrag] = useState<DragMode | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    file
      .arrayBuffer()
      .then((buf) => renderPageToCanvas(buf, targetPage + 1, 2))
      .then((rendered) => {
        if (cancelled || !previewCanvasRef.current) return;
        const canvas = previewCanvasRef.current;
        canvas.width = rendered.width;
        canvas.height = rendered.height;
        canvas.getContext("2d")!.drawImage(rendered, 0, 0);
      })
      .catch((err: unknown) => {
        if (!cancelled) setPreviewError((err as Error)?.message ?? "Failed to render.");
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file, targetPage]);

  const storedCrop = crops[targetPage] ?? null;
  const currentCrop = storedCrop ?? FULL_PAGE_CROP;
  const adjustedCropCount = useMemo(() => crops.filter((crop) => crop && !isFullPageCrop(crop)).length, [crops]);
  const hasAnyCrop = adjustedCropCount > 0;

  const setCropForPage = (pageIndex: number, rect: CropRectFrac | null) => {
    setCrops((prev) => {
      const next = [...prev];
      while (next.length < pageCount) next.push(null);
      const normalized = rect ? normalizeRect(rect) : null;
      next[pageIndex] = normalized && !isFullPageCrop(normalized) ? normalized : null;
      return next;
    });
  };

  const applyCurrentToAll = () => {
    setCrops((prev) => {
      const next = [...prev];
      while (next.length < pageCount) next.push(null);
      for (let i = 0; i < pageCount; i += 1) next[i] = isFullPageCrop(currentCrop) ? null : currentCrop;
      return next;
    });
  };

  const clearAll = () => setCrops(Array.from({ length: pageCount }, () => null));

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    const overlay = overlayRef.current;
    const pt = getRelPoint(e.clientX, e.clientY, overlay);
    if (!pt) return;
    e.preventDefault();
    overlay?.setPointerCapture(e.pointerId);

    const handle = (e.target as HTMLElement | null)?.dataset?.handle as ResizeHandle | undefined;
    const cropNow = currentCrop;

    if (handle) {
      setDrag({ kind: "resize", handle, start: pt, startRect: cropNow });
      return;
    }

    if (pointInRect(pt, cropNow)) {
      setDrag({ kind: "move", start: pt, startRect: cropNow });
      return;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const overlay = overlayRef.current;
    const pt = getRelPoint(e.clientX, e.clientY, overlay);
    if (!pt) return;
    e.preventDefault();

    const minFrac = 0.03;
    const cropNow = currentCrop;

    if (drag.kind === "move") {
      const dx = pt.x - drag.start.x;
      const dy = pt.y - drag.start.y;
      const w = drag.startRect.wFrac;
      const h = drag.startRect.hFrac;
      const rect = {
        xFrac: clamp01(drag.startRect.xFrac + dx),
        yFrac: clamp01(drag.startRect.yFrac + dy),
        wFrac: w,
        hFrac: h,
      };
      // keep inside bounds
      const n = normalizeRect(rect);
      n.xFrac = clamp01(Math.min(n.xFrac, 1 - n.wFrac));
      n.yFrac = clamp01(Math.min(n.yFrac, 1 - n.hFrac));
      setCropForPage(targetPage, n);
      return;
    }

    if (drag.kind === "resize") {
      const r = { ...drag.startRect };
      const endX = clamp01(r.xFrac + r.wFrac);
      const endY = clamp01(r.yFrac + r.hFrac);

      let x1 = r.xFrac;
      let y1 = r.yFrac;
      let x2 = endX;
      let y2 = endY;

      if (drag.handle.includes("n")) {
        y1 = Math.min(pt.y, y2 - minFrac);
      }
      if (drag.handle.includes("s")) {
        y2 = Math.max(pt.y, y1 + minFrac);
      }
      if (drag.handle.includes("w")) {
        x1 = Math.min(pt.x, x2 - minFrac);
      }
      if (drag.handle.includes("e")) {
        x2 = Math.max(pt.x, x1 + minFrac);
      }

      const rect = normalizeRect({
        xFrac: clamp01(x1),
        yFrac: clamp01(y1),
        wFrac: clamp01(x2) - clamp01(x1),
        hFrac: clamp01(y2) - clamp01(y1),
      });
      setCropForPage(targetPage, minSizeClamp(rect, minFrac));
      return;
    }

    // fallback (should never happen)
    setCropForPage(targetPage, cropNow);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    e.preventDefault();
    setDrag(null);
    const c = currentCrop;
    if (c) setCropForPage(targetPage, minSizeClamp(c, 0.01));
  };

  const handleExport = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const normalized = Array.from({ length: pageCount }, (_, i) => crops[i] ?? null);
      const bytes = await cropPdfPages(buf, normalized);
      setResult({
        blob: pdfBytes(bytes),
        filename: `${getBaseName(file.name)}-cropped.pdf`,
      });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed to crop PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setTargetPage(0);
    setCrops([]);
    setDrag(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setProcessing(false);
    setError(null);
    setResult(null);
  };

  const onLoaded = (count: number) => {
    setPageCount(count);
    setCrops((prev) => (prev.length === count ? prev : Array.from({ length: count }, (_, i) => prev[i] ?? null)));
    setTargetPage((p) => Math.min(p, Math.max(0, count - 1)));
  };

  const goToPage = (i: number) => setTargetPage(Math.min(Math.max(0, i), Math.max(0, pageCount - 1)));

  return (
    <ToolLayout
      title="Crop PDF"
      description="Select a page, adjust the full-page crop box from any side, then export."
      icon="crop"
      iconClass="bg-teal-50 text-teal-600"
    >
      {result ? (
        <ToolCard>
          <DownloadSuccess
            onDownload={() => downloadBlob(result.blob, result.filename)}
            onReset={reset}
            filename={result.filename}
            sizeBytes={result.blob.size}
          />
        </ToolCard>
      ) : (
        <div className="space-y-4">
          <ToolCard>
            <FileDropzone
              onFiles={(f) => {
                setFile(f[0]);
                setResult(null);
                setError(null);
                setPreviewError(null);
                setTargetPage(0);
                setPageCount(0);
                setCrops([]);
              }}
              files={file ? [file] : []}
            />
          </ToolCard>

          {file && (
            <>
              <ToolCard className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700">Crop preview</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select a page first. The box starts around the whole page, then you can drag any side or corner.
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 shrink-0">
                    Page {Math.min(targetPage + 1, Math.max(pageCount, 1))}{pageCount > 0 ? ` / ${pageCount}` : ""}
                  </span>
                </div>

                <div className="relative">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <canvas ref={previewCanvasRef} className="block w-full h-auto" />
                  </div>

                  {/* Interaction overlay */}
                  <div
                    ref={overlayRef}
                    className="absolute inset-0 touch-none select-none"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    style={{ cursor: "move" }}
                  >
                    {/* Darken outside crop */}
                    {/* Crop rect + handles */}
                    <div
                      className="absolute rounded-sm border-2 border-white bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.42)]"
                      style={{
                        left: `${currentCrop.xFrac * 100}%`,
                        top: `${currentCrop.yFrac * 100}%`,
                        width: `${currentCrop.wFrac * 100}%`,
                        height: `${currentCrop.hFrac * 100}%`,
                      }}
                    >
                      <div className="absolute left-0 right-0 top-1/3 border-t border-white/45" />
                      <div className="absolute left-0 right-0 top-2/3 border-t border-white/45" />
                      <div className="absolute bottom-0 top-0 left-1/3 border-l border-white/45" />
                      <div className="absolute bottom-0 top-0 left-2/3 border-l border-white/45" />
                      {RESIZE_HANDLES.map((h) => (
                        <div
                          key={h}
                          data-handle={h}
                          className="absolute h-6 w-6 rounded-sm border-2 border-white bg-teal-500 shadow-md touch-none"
                          style={getHandleStyle(h)}
                        />
                      ))}
                    </div>

                    {previewLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl pointer-events-none">
                        <span className="material-symbols-outlined animate-spin text-teal-500 text-[22px]">
                          progress_activity
                        </span>
                      </div>
                    )}
                    {previewError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/85 p-4 rounded-xl pointer-events-none">
                        <p className="text-sm text-red-600 text-center">{previewError}</p>
                      </div>
                    )}
                  </div>

                  {/* Page navigation */}
                  {pageCount > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous page"
                        onClick={() => goToPage(targetPage - 1)}
                        disabled={targetPage === 0}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md transition hover:bg-white hover:text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[24px]">chevron_left</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Next page"
                        onClick={() => goToPage(targetPage + 1)}
                        disabled={targetPage >= pageCount - 1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md transition hover:bg-white hover:text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton onClick={() => setCropForPage(targetPage, null)} disabled={!storedCrop}>
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                      Reset to full page
                    </SecondaryButton>
                    <SecondaryButton onClick={applyCurrentToAll} disabled={!storedCrop || pageCount <= 1}>
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      Apply to all pages
                    </SecondaryButton>
                    <button
                      type="button"
                      onClick={clearAll}
                      disabled={!hasAnyCrop}
                      className="text-sm text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                      Reset all pages
                    </button>
                  </div>
                  <div className="text-xs text-slate-500">
                    {hasAnyCrop ? `${adjustedCropCount} page${adjustedCropCount !== 1 ? "s" : ""} adjusted` : "Current page uses the full-page box"}
                  </div>
                </div>
              </ToolCard>

              <ToolCard>
                <p className="text-sm font-semibold text-slate-700 mb-3">Pages</p>
                <p className="text-xs text-slate-500 mb-3">Tap a thumbnail first, then adjust that page&apos;s crop box above.</p>
                <PDFThumbnails
                  file={file}
                  selectedPages={new Set([targetPage])}
                  onTogglePage={goToPage}
                  onLoaded={onLoaded}
                  columns={6}
                />
              </ToolCard>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

              <div className="flex flex-col sm:flex-row gap-3">
                <PrimaryButton onClick={handleExport} loading={processing} disabled={!hasAnyCrop} className="w-full sm:w-auto">
                  <span className="material-symbols-outlined text-[18px]">crop</span>
                  Export Cropped PDF
                </PrimaryButton>
              </div>
            </>
          )}
        </div>
      )}
    </ToolLayout>
  );
}

