"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ToolLayout, { DownloadSuccess, PrimaryButton, SecondaryButton, ToolCard } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import PDFThumbnails from "@/components/shared/PDFThumbnail";
import TouchHint from "@/components/shared/TouchHint";
import PageJumpInput from "@/components/shared/PageJumpInput";
import { loadPdfDocument, renderPageToCanvas } from "@/lib/pdf/core";
import {
  addPaddingToPdfPages,
  isZeroPadding,
  ZERO_PADDING,
  type PagePaddingIn,
} from "@/lib/pdf/padding";
import type { CropRectFrac } from "@/lib/pdf/crop";
import { downloadBlob, getBaseName, pdfBytes } from "@/lib/utils";
import { preventScrollDuringTouch, isTouchDevice } from "@/lib/touch-utils";
import { useTranslation } from "@/lib/i18n";

type DragMode =
  | { kind: "move"; start: { x: number; y: number }; startRect: CropRectFrac }
  | { kind: "resize"; handle: ResizeHandle; start: { x: number; y: number }; startRect: CropRectFrac };

type ResizeHandle = "n" | "e" | "s" | "w" | "nw" | "ne" | "sw" | "se";
type EdgeSide = "top" | "right" | "bottom" | "left";

const RESIZE_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const EDGE_SIDES: EdgeSide[] = ["top", "right", "bottom", "left"];
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
const HANDLE_SIZE = 44;
const PTS_PER_IN = 72;
const MIN_CONTENT_FRAC = 0.05;
const MAX_PADDING_IN = 4;

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

function minSizeClamp(r: CropRectFrac, minFrac = MIN_CONTENT_FRAC): CropRectFrac {
  const n = normalizeRect(r);
  if (n.wFrac < minFrac || n.hFrac < minFrac) return n;
  return n;
}

function paddingToContentRect(pad: PagePaddingIn, pageWidthIn: number, pageHeightIn: number): CropRectFrac {
  return normalizeRect({
    xFrac: pad.left / pageWidthIn,
    yFrac: pad.top / pageHeightIn,
    wFrac: (pageWidthIn - pad.left - pad.right) / pageWidthIn,
    hFrac: (pageHeightIn - pad.top - pad.bottom) / pageHeightIn,
  });
}

function contentRectToPadding(rect: CropRectFrac, pageWidthIn: number, pageHeightIn: number): PagePaddingIn {
  const n = normalizeRect(rect);
  return {
    left: Math.min(MAX_PADDING_IN, Math.max(0, n.xFrac * pageWidthIn)),
    top: Math.min(MAX_PADDING_IN, Math.max(0, n.yFrac * pageHeightIn)),
    right: Math.min(MAX_PADDING_IN, Math.max(0, (1 - n.xFrac - n.wFrac) * pageWidthIn)),
    bottom: Math.min(MAX_PADDING_IN, Math.max(0, (1 - n.yFrac - n.hFrac) * pageHeightIn)),
  };
}

function formatInches(value: number): string {
  if (value <= 0.0001) return "0";
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function parseInchesInput(raw: string): number | null {
  const cleaned = raw.replace(/"/g, "").trim();
  if (!cleaned) return 0;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(MAX_PADDING_IN, n);
}

function getHandleStyle(handle: ResizeHandle): React.CSSProperties {
  const halfSize = HANDLE_SIZE / 2;
  const middleOffset = `calc(50% - ${halfSize}px)`;
  return {
    left: handle.includes("w") ? `-${halfSize}px` : handle === "n" || handle === "s" ? middleOffset : undefined,
    right: handle.includes("e") ? `-${halfSize}px` : undefined,
    top: handle.includes("n") ? `-${halfSize}px` : handle === "e" || handle === "w" ? middleOffset : undefined,
    bottom: handle.includes("s") ? `-${halfSize}px` : undefined,
    cursor: HANDLE_CURSOR[handle],
    width: `${HANDLE_SIZE}px`,
    height: `${HANDLE_SIZE}px`,
  };
}

function EdgeInput({
  side,
  valueIn,
  onCommit,
}: {
  side: EdgeSide;
  valueIn: number;
  onCommit: (inches: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatInches(valueIn));

  useEffect(() => {
    if (!editing) setDraft(formatInches(valueIn));
  }, [valueIn, editing]);

  const commit = () => {
    const parsed = parseInchesInput(draft);
    if (parsed === null) {
      setDraft(formatInches(valueIn));
    } else {
      onCommit(parsed);
    }
    setEditing(false);
  };

  const positionClass =
    side === "top"
      ? "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
      : side === "bottom"
        ? "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2"
        : side === "left"
          ? "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2"
          : "right-0 top-1/2 translate-x-1/2 -translate-y-1/2";

  return (
    <label
      className={`absolute z-30 flex items-center gap-0.5 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-md ${positionClass}`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        inputMode="decimal"
        aria-label={`${side} padding inches`}
        className="w-10 bg-transparent text-center text-white outline-none placeholder:text-white/60"
        value={editing ? draft : formatInches(valueIn)}
        onFocus={() => {
          setEditing(true);
          setDraft(formatInches(valueIn));
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setDraft(formatInches(valueIn));
            setEditing(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      <span className="text-white/90" aria-hidden>
        &quot;
      </span>
    </label>
  );
}

export default function AddPaddingPDFPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [targetPage, setTargetPage] = useState(0);
  const [paddings, setPaddings] = useState<Array<PagePaddingIn | null>>([]);
  const [pageSizePt, setPageSizePt] = useState<{ width: number; height: number } | null>(null);
  const [linkSides, setLinkSides] = useState(false);

  const [drag, setDrag] = useState<DragMode | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isTouch] = useState(() => isTouchDevice());

  const pageWidthIn = pageSizePt ? pageSizePt.width / PTS_PER_IN : 8.5;
  const pageHeightIn = pageSizePt ? pageSizePt.height / PTS_PER_IN : 11;

  useEffect(() => {
    const cleanup = preventScrollDuringTouch(overlayRef.current);
    return cleanup;
  }, []);

  useEffect(() => {
    if (!file) {
      setPageSizePt(null);
      return;
    }
    let cancelled = false;
    file
      .arrayBuffer()
      .then((buf) => loadPdfDocument(buf))
      .then((pdf) => pdf.getPage(targetPage + 1))
      .then((page) => {
        if (cancelled) return;
        const vp = page.getViewport({ scale: 1 });
        setPageSizePt({ width: vp.width, height: vp.height });
      })
      .catch(() => {
        if (!cancelled) setPageSizePt(null);
      });
    return () => {
      cancelled = true;
    };
  }, [file, targetPage]);

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

  const storedPadding = paddings[targetPage] ?? null;
  const currentPadding = storedPadding ?? ZERO_PADDING;
  const contentRect = useMemo(
    () => paddingToContentRect(currentPadding, pageWidthIn, pageHeightIn),
    [currentPadding, pageWidthIn, pageHeightIn]
  );

  const adjustedCount = useMemo(() => paddings.filter((p) => p && !isZeroPadding(p)).length, [paddings]);
  const hasAnyPadding = adjustedCount > 0;

  const setPaddingForPage = useCallback(
    (pageIndex: number, pad: PagePaddingIn | null) => {
      setPaddings((prev) => {
        const next = [...prev];
        while (next.length < pageCount) next.push(null);
        next[pageIndex] = pad && !isZeroPadding(pad) ? pad : null;
        return next;
      });
    },
    [pageCount]
  );

  const applyPaddingFromRect = useCallback(
    (rect: CropRectFrac) => {
      const pad = contentRectToPadding(minSizeClamp(rect), pageWidthIn, pageHeightIn);
      if (linkSides) {
        const max = Math.max(pad.top, pad.right, pad.bottom, pad.left);
        const uniform = { top: max, right: max, bottom: max, left: max };
        setPaddingForPage(targetPage, uniform);
      } else {
        setPaddingForPage(targetPage, pad);
      }
    },
    [linkSides, pageWidthIn, pageHeightIn, setPaddingForPage, targetPage]
  );

  const setEdgePadding = useCallback(
    (side: EdgeSide, inches: number) => {
      const v = Math.min(MAX_PADDING_IN, Math.max(0, inches));
      const next = { ...currentPadding };
      if (linkSides) {
        next.top = v;
        next.right = v;
        next.bottom = v;
        next.left = v;
      } else {
        next[side] = v;
      }
      setPaddingForPage(targetPage, next);
    },
    [currentPadding, linkSides, setPaddingForPage, targetPage]
  );

  const applyCurrentToAll = () => {
    setPaddings((prev) => {
      const next = [...prev];
      while (next.length < pageCount) next.push(null);
      for (let i = 0; i < pageCount; i += 1) {
        next[i] = isZeroPadding(currentPadding) ? null : { ...currentPadding };
      }
      return next;
    });
  };

  const clearAll = () => setPaddings(Array.from({ length: pageCount }, () => null));

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    const overlay = overlayRef.current;
    const pt = getRelPoint(e.clientX, e.clientY, overlay);
    if (!pt) return;
    e.preventDefault();
    overlay?.setPointerCapture(e.pointerId);

    const handle = (e.target as HTMLElement | null)?.dataset?.handle as ResizeHandle | undefined;

    if (handle) {
      setDrag({ kind: "resize", handle, start: pt, startRect: contentRect });
      return;
    }

    if (pointInRect(pt, contentRect)) {
      setDrag({ kind: "move", start: pt, startRect: contentRect });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const overlay = overlayRef.current;
    const pt = getRelPoint(e.clientX, e.clientY, overlay);
    if (!pt) return;
    e.preventDefault();

    const minFrac = MIN_CONTENT_FRAC;

    if (drag.kind === "move") {
      const dx = pt.x - drag.start.x;
      const dy = pt.y - drag.start.y;
      const w = drag.startRect.wFrac;
      const h = drag.startRect.hFrac;
      const rect = normalizeRect({
        xFrac: clamp01(drag.startRect.xFrac + dx),
        yFrac: clamp01(drag.startRect.yFrac + dy),
        wFrac: w,
        hFrac: h,
      });
      rect.xFrac = clamp01(Math.min(rect.xFrac, 1 - rect.wFrac));
      rect.yFrac = clamp01(Math.min(rect.yFrac, 1 - rect.hFrac));
      applyPaddingFromRect(rect);
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

      if (drag.handle.includes("n")) y1 = Math.min(pt.y, y2 - minFrac);
      if (drag.handle.includes("s")) y2 = Math.max(pt.y, y1 + minFrac);
      if (drag.handle.includes("w")) x1 = Math.min(pt.x, x2 - minFrac);
      if (drag.handle.includes("e")) x2 = Math.max(pt.x, x1 + minFrac);

      applyPaddingFromRect(
        normalizeRect({
          xFrac: clamp01(x1),
          yFrac: clamp01(y1),
          wFrac: clamp01(x2) - clamp01(x1),
          hFrac: clamp01(y2) - clamp01(y1),
        })
      );
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    e.preventDefault();
    setDrag(null);
    applyPaddingFromRect(minSizeClamp(contentRect, MIN_CONTENT_FRAC));
  };

  const handleExport = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const normalized = Array.from({ length: pageCount }, (_, i) => paddings[i] ?? null);
      const bytes = await addPaddingToPdfPages(buf, normalized);
      setResult({
        blob: pdfBytes(bytes),
        filename: `${getBaseName(file.name)}-padded.pdf`,
      });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t("padding.error"));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setTargetPage(0);
    setPaddings([]);
    setPageSizePt(null);
    setDrag(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setProcessing(false);
    setError(null);
    setResult(null);
    setLinkSides(false);
  };

  const onLoaded = (count: number) => {
    setPageCount(count);
    setPaddings((prev) => (prev.length === count ? prev : Array.from({ length: count }, (_, i) => prev[i] ?? null)));
    setTargetPage((p) => Math.min(p, Math.max(0, count - 1)));
  };

  const goToPage = (i: number) => setTargetPage(Math.min(Math.max(0, i), Math.max(0, pageCount - 1)));

  const hasCurrentPadding = storedPadding !== null && !isZeroPadding(storedPadding);

  return (
    <ToolLayout
      title={t("tools.addPaddingPdf.title")}
      description={t("padding.pageDescription")}
      icon="border_outer"
      iconClass="bg-indigo-50 text-indigo-600"
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
                setPaddings([]);
              }}
              files={file ? [file] : []}
            />
          </ToolCard>

          {file && (
            <>
              <ToolCard className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{t("padding.preview")}</p>
                    <TouchHint
                      text={isTouch ? t("padding.hintTouch") : t("padding.hintMouse")}
                      icon="border_outer"
                      className="mt-2"
                    />
                  </div>
                  <PageJumpInput currentPage={targetPage} totalPages={pageCount} onJump={goToPage} />
                </div>

                <div className="relative">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <canvas ref={previewCanvasRef} className="block w-full h-auto" />
                  </div>

                  <div
                    ref={overlayRef}
                    className="absolute inset-0 touch-none select-none no-select"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                  >
                    {/* Content boundary + padding shade */}
                    <div
                      className="absolute rounded-sm border-2 border-dashed border-blue-500 bg-transparent shadow-[0_0_0_9999px_rgba(59,130,246,0.18)]"
                      style={{
                        left: `${contentRect.xFrac * 100}%`,
                        top: `${contentRect.yFrac * 100}%`,
                        width: `${contentRect.wFrac * 100}%`,
                        height: `${contentRect.hFrac * 100}%`,
                        cursor: drag?.kind === "move" ? "grabbing" : "grab",
                      }}
                    >
                      {RESIZE_HANDLES.map((h) => (
                        <div
                          key={h}
                          data-handle={h}
                          className="absolute rounded-md border-2 border-white bg-blue-500 shadow-lg touch-none flex items-center justify-center"
                          style={getHandleStyle(h)}
                        >
                          <span className="material-symbols-outlined text-white text-[18px] pointer-events-none">
                            {h.includes("n") && h.includes("w")
                              ? "north_west"
                              : h.includes("n") && h.includes("e")
                                ? "north_east"
                                : h.includes("s") && h.includes("w")
                                  ? "south_west"
                                  : h.includes("s") && h.includes("e")
                                    ? "south_east"
                                    : "unfold_more"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {EDGE_SIDES.map((side) => (
                      <EdgeInput
                        key={side}
                        side={side}
                        valueIn={currentPadding[side]}
                        onCommit={(inches) => setEdgePadding(side, inches)}
                      />
                    ))}

                    <button
                      type="button"
                      title={linkSides ? t("padding.unlinkSides") : t("padding.linkSides")}
                      onClick={() => setLinkSides((v) => !v)}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={`absolute right-2 top-2 z-30 inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-sm transition ${
                        linkSides
                          ? "border-blue-300 bg-blue-50 text-blue-600"
                          : "border-slate-200 bg-white/95 text-slate-600 hover:bg-white"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {linkSides ? "link" : "link_off"}
                      </span>
                    </button>

                    {previewLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl pointer-events-none">
                        <span className="material-symbols-outlined animate-spin text-blue-500 text-[22px]">
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

                  {pageCount > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous page"
                        onClick={() => goToPage(targetPage - 1)}
                        disabled={targetPage === 0}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md transition hover:bg-white hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        style={{ width: "44px", height: "44px" }}
                      >
                        <span className="material-symbols-outlined text-[24px]">chevron_left</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Next page"
                        onClick={() => goToPage(targetPage + 1)}
                        disabled={targetPage >= pageCount - 1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md transition hover:bg-white hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        style={{ width: "44px", height: "44px" }}
                      >
                        <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton onClick={() => setPaddingForPage(targetPage, null)} disabled={!hasCurrentPadding}>
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                      {t("padding.resetPage")}
                    </SecondaryButton>
                    <SecondaryButton onClick={applyCurrentToAll} disabled={!hasCurrentPadding || pageCount <= 1}>
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      {t("padding.applyAll")}
                    </SecondaryButton>
                    <button
                      type="button"
                      onClick={clearAll}
                      disabled={!hasAnyPadding}
                      className="text-sm text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                      {t("padding.resetAll")}
                    </button>
                  </div>
                  <div className="text-xs text-slate-500">
                    {hasAnyPadding
                      ? t("padding.adjustedCount", { count: adjustedCount })
                      : t("padding.noPadding")}
                  </div>
                </div>
              </ToolCard>

              <ToolCard>
                <p className="text-sm font-semibold text-slate-700 mb-3">{t("common.pages")}</p>
                <p className="text-xs text-slate-500 mb-3">{t("padding.thumbHint")}</p>
                <PDFThumbnails
                  file={file}
                  selectedPages={new Set([targetPage])}
                  onTogglePage={goToPage}
                  onLoaded={onLoaded}
                  columns={6}
                  mobileHorizontalScroll
                />
              </ToolCard>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

              <div className="flex flex-col sm:flex-row gap-3">
                <PrimaryButton
                  onClick={handleExport}
                  loading={processing}
                  disabled={!hasAnyPadding}
                  className="w-full sm:w-auto"
                >
                  <span className="material-symbols-outlined text-[18px]">border_outer</span>
                  {t("padding.button")}
                </PrimaryButton>
              </div>
            </>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
