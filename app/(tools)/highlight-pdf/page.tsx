"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ToolLayout, { ToolCard, PrimaryButton, SecondaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import PDFThumbnails from "@/components/shared/PDFThumbnail";
import { PDFDocument, rgb } from "pdf-lib";
import { renderPageToCanvas } from "@/lib/pdf/core";
import { downloadBlob, getBaseName } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const COLORS = [
  { name: "Black",    hex: "#000000", r: 0,    g: 0,    b: 0    },
  { name: "Yellow",  hex: "#FFFF00", r: 1,    g: 1,    b: 0    },
  { name: "Green",   hex: "#7CFC00", r: 0.49, g: 0.99, b: 0    },
  { name: "Cyan",    hex: "#00FFFF", r: 0,    g: 1,    b: 1    },
  { name: "Pink",    hex: "#FF69B4", r: 1,    g: 0.41, b: 0.71 },
  { name: "Orange",  hex: "#FFA500", r: 1,    g: 0.65, b: 0    },
  { name: "Lavender",hex: "#C084FC", r: 0.75, g: 0.52, b: 0.99 },
];

const OPACITY_DISPLAY = "55"; // hex alpha for CSS overlay (~33%)
const OPACITY_PDF = 0.35;
const STROKE_OPACITY_DISPLAY = "cc";
const DEFAULT_STROKE_WIDTH = 6;

type Highlight = {
  id: string;
  pageIndex: number;
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
  colorIndex: number;
  order: number;
};

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  id: string;
  pageIndex: number;
  colorIndex: number;
  thickness: number;
  points: Point[];
  order: number;
};

type ToolMode = "highlight" | "draw";

type DrawState = {
  kind: ToolMode;
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  points: Point[];
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export default function HighlightPDFPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [targetPage, setTargetPage] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeColorIdx, setActiveColorIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ToolMode>("highlight");
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);
  const [draw, setDraw] = useState<DrawState | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const strokeCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const annotationOrderRef = useRef(1);

  useEffect(() => {
    if (!file) { setPreviewError(null); setPreviewLoading(false); return; }
    let cancelled = false;
    setPreviewLoading(true); setPreviewError(null);
    file.arrayBuffer()
      .then(buf => renderPageToCanvas(buf, targetPage + 1, 2))
      .then(rendered => {
        if (cancelled || !previewCanvasRef.current) return;
        const canvas = previewCanvasRef.current;
        canvas.width = rendered.width; canvas.height = rendered.height;
        canvas.getContext("2d")!.drawImage(rendered, 0, 0);
      })
      .catch((err: unknown) => { if (!cancelled) setPreviewError((err as Error)?.message ?? "Failed to render."); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [file, targetPage]);

  const getRelFrac = (clientX: number, clientY: number) => {
    const source = previewCanvasRef.current ?? wrapRef.current;
    if (!source) return null;
    const r = source.getBoundingClientRect();
    return {
      x: clamp01((clientX - r.left) / r.width),
      y: clamp01((clientY - r.top) / r.height),
    };
  };

  const getAnnotationOrder = () => annotationOrderRef.current++;

  const syncStrokeCanvas = useCallback(() => {
    const baseCanvas = previewCanvasRef.current;
    const strokeCanvas = strokeCanvasRef.current;
    if (!baseCanvas || !strokeCanvas) return;

    const ctx = strokeCanvas.getContext("2d");
    if (!ctx) return;

    if (strokeCanvas.width !== baseCanvas.width) strokeCanvas.width = baseCanvas.width;
    if (strokeCanvas.height !== baseCanvas.height) strokeCanvas.height = baseCanvas.height;

    ctx.clearRect(0, 0, strokeCanvas.width, strokeCanvas.height);

    const scaleFactor = strokeCanvas.width / Math.max(1, strokeCanvas.getBoundingClientRect().width);
    const drawStroke = (stroke: { colorIndex: number; thickness: number; points: Point[] }) => {
      if (stroke.points.length < 2) return;
      const c = COLORS[stroke.colorIndex];
      ctx.save();
      ctx.strokeStyle = c.hex;
      ctx.globalAlpha = OPACITY_PDF;
      ctx.lineWidth = Math.max(1, stroke.thickness * scaleFactor);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * strokeCanvas.width, stroke.points[0].y * strokeCanvas.height);
      for (let i = 1; i < stroke.points.length; i += 1) {
        ctx.lineTo(stroke.points[i].x * strokeCanvas.width, stroke.points[i].y * strokeCanvas.height);
      }
      ctx.stroke();
      ctx.restore();
    };

    const pageStrokes = strokes.filter((stroke) => stroke.pageIndex === targetPage);
    pageStrokes.sort((a, b) => a.order - b.order).forEach(drawStroke);
    if (draw?.kind === "draw") {
      drawStroke({ colorIndex: activeColorIdx, thickness: strokeWidth, points: draw.points });
    }
  }, [strokes, draw, activeColorIdx, strokeWidth, targetPage]);

  const onPointerDown = (e: React.PointerEvent) => {
    // Only primary pointer (ignore secondary touch points)
    if (e.button !== 0 && e.pointerType !== "touch") return;
    e.preventDefault();
    const pt = getRelFrac(e.clientX, e.clientY); if (!pt) return;
    wrapRef.current?.setPointerCapture(e.pointerId);
    setSelectedId(null);
    setDraw({ kind: mode, startX: pt.x, startY: pt.y, curX: pt.x, curY: pt.y, points: [pt] });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draw) return;
    e.preventDefault();
    const pt = getRelFrac(e.clientX, e.clientY); if (!pt) return;
    const coalesced = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const sampledPoints = coalesced.length
      ? coalesced
          .map(event => getRelFrac(event.clientX, event.clientY))
          .filter((point): point is Point => Boolean(point))
      : [pt];
    setDraw(prev => prev ? { ...prev, curX: pt.x, curY: pt.y, points: [...prev.points, ...sampledPoints] } : null);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!draw) return;
    e.preventDefault();
    const wFrac = Math.abs(draw.curX - draw.startX);
    const hFrac = Math.abs(draw.curY - draw.startY);
    if (draw.kind === "draw") {
      const points = draw.points.length > 1 ? draw.points : [draw.points[0], { x: draw.points[0].x + 0.001, y: draw.points[0].y + 0.001 }];
      if (points.length > 1) {
        const stroke: Stroke = {
          id: crypto.randomUUID(),
          pageIndex: targetPage,
          colorIndex: activeColorIdx,
          thickness: strokeWidth,
          points,
          order: getAnnotationOrder(),
        };
        setStrokes(prev => [...prev, stroke]);
      }
    } else if (wFrac > 0.01 && hFrac > 0.005) {
      const hl: Highlight = {
        id: crypto.randomUUID(),
        pageIndex: targetPage,
        xFrac: Math.min(draw.startX, draw.curX),
        yFrac: Math.min(draw.startY, draw.curY),
        wFrac,
        hFrac,
        colorIndex: activeColorIdx,
        order: getAnnotationOrder(),
      };
      setHighlights(prev => [...prev, hl]);
      setSelectedId(hl.id);
    }
    setDraw(null);
  };

  const deleteHighlight = (id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
    setSelectedId(sel => sel === id ? null : sel);
  };

  const undoLastAnnotation = useCallback(() => {
    const lastHighlight = highlights.reduce<Highlight | null>((latest, item) => (
      !latest || item.order > latest.order ? item : latest
    ), null);
    const lastStroke = strokes.reduce<Stroke | null>((latest, item) => (
      !latest || item.order > latest.order ? item : latest
    ), null);

    if (!lastHighlight && !lastStroke) return;

    if (!lastStroke || (lastHighlight && lastHighlight.order > lastStroke.order)) {
      setHighlights(prev => prev.filter(item => item.id !== lastHighlight!.id));
      setSelectedId(sel => sel === lastHighlight!.id ? null : sel);
      return;
    }

    setStrokes(prev => prev.filter(item => item.id !== lastStroke!.id));
    setSelectedId(sel => sel === lastStroke!.id ? null : sel);
  }, [highlights, strokes]);

  const clearAnnotations = () => {
    setHighlights([]);
    setStrokes([]);
    setSelectedId(null);
  };

  useEffect(() => {
    syncStrokeCanvas();
  }, [syncStrokeCanvas, targetPage, file]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoLastAnnotation();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoLastAnnotation]);

  const handleExport = async () => {
    if (!file) return;
    setProcessing(true); setError(null);
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = doc.getPages();

      highlights.forEach(hl => {
        const page = pages[Math.min(hl.pageIndex, pages.length - 1)];
        if (!page) return;
        const { width, height } = page.getSize();
        const c = COLORS[hl.colorIndex];
        page.drawRectangle({
          x: hl.xFrac * width,
          y: height - (hl.yFrac + hl.hFrac) * height,
          width: hl.wFrac * width,
          height: hl.hFrac * height,
          color: rgb(c.r, c.g, c.b),
          opacity: OPACITY_PDF,
        });
      });

      strokes.forEach(stroke => {
        const page = pages[Math.min(stroke.pageIndex, pages.length - 1)];
        if (!page || stroke.points.length < 2) return;
        const { width, height } = page.getSize();
        const c = COLORS[stroke.colorIndex];
        for (let i = 1; i < stroke.points.length; i += 1) {
          const prev = stroke.points[i - 1];
          const curr = stroke.points[i];
          page.drawLine({
            start: { x: prev.x * width, y: height - prev.y * height },
            end: { x: curr.x * width, y: height - curr.y * height },
            thickness: stroke.thickness,
            color: rgb(c.r, c.g, c.b),
            opacity: OPACITY_PDF,
          });
        }
      });

      const outBytes = await doc.save();
      setResult({
        blob: new Blob([outBytes as unknown as BlobPart], { type: "application/pdf" }),
        filename: `${getBaseName(file.name)}-draw-highlighted.pdf`,
      });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t("highlight.error"));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null); setResult(null); setError(null);
    setHighlights([]); setStrokes([]); setSelectedId(null); setDraw(null);
    setTargetPage(0); setPageCount(0); setPreviewError(null);
    setMode("highlight");
    setStrokeWidth(DEFAULT_STROKE_WIDTH);
    annotationOrderRef.current = 1;
  };

  const goToPage = (n: number) => {
    setTargetPage(Math.min(Math.max(0, n), Math.max(0, pageCount - 1)));
    setSelectedId(null);
  };

  const pageHighlights = highlights.filter(h => h.pageIndex === targetPage);
  const totalHighlights = highlights.length;
  const totalStrokes = strokes.length;

  // Compute draw preview rect
  const drawRect = draw ? {
    x: Math.min(draw.startX, draw.curX),
    y: Math.min(draw.startY, draw.curY),
    w: Math.abs(draw.curX - draw.startX),
    h: Math.abs(draw.curY - draw.startY),
  } : null;

  return (
    <ToolLayout
      title={t("tools.highlightPdf.title")}
      description={t("highlight.pageDescription")}
      icon="draw"
      iconClass="bg-yellow-50 text-yellow-600"
    >
      {result ? (
        <ToolCard>
          <DownloadSuccess
            onDownload={() => downloadBlob(result.blob, result.filename)}
            onReset={reset}
            filename={result.filename}
          />
        </ToolCard>
      ) : (
        <div className="space-y-4">
          <ToolCard>
            <FileDropzone
              onFiles={(f) => {
                setFile(f[0]);
                setResult(null);
                setHighlights([]);
                  setStrokes([]);
                setSelectedId(null);
                  setDraw(null);
                setTargetPage(0);
                setPageCount(0);
                setPreviewError(null);
                  annotationOrderRef.current = 1;
              }}
              files={file ? [file] : []}
            />
          </ToolCard>

          {file && (
            <>
              <ToolCard>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t("highlight.editMode")}</p>
                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setMode("highlight")}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${mode === "highlight" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                      >
                        {t("highlight.modeHighlight")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("draw")}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${mode === "draw" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                      >
                        {t("highlight.modeDraw")}
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0 lg:w-80">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      {t("highlight.thickness")}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={2}
                        max={24}
                        step={1}
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(Number(e.target.value))}
                        className="w-full accent-teal-600"
                      />
                      <span className="w-12 shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs font-semibold text-slate-700">
                        {strokeWidth}px
                      </span>
                    </div>
                  </div>

                  <SecondaryButton
                    onClick={undoLastAnnotation}
                    disabled={totalHighlights + totalStrokes === 0}
                    className="w-full lg:w-auto lg:self-end"
                  >
                    <span className="material-symbols-outlined text-[18px]">undo</span>
                    {t("highlight.undoLast")}
                  </SecondaryButton>
                </div>
              </ToolCard>

              {/* Color palette + stats */}
              <ToolCard>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      {mode === "draw" ? t("highlight.penColor") : t("highlight.highlightColor")}
                    </p>
                    <div className="flex items-center gap-2">
                      {COLORS.map((c, i) => (
                        <button
                          key={c.name}
                          type="button"
                          title={c.name}
                          onClick={() => setActiveColorIdx(i)}
                          className="relative w-8 h-8 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                          style={{
                            backgroundColor: c.hex,
                            borderColor: i === activeColorIdx ? "#0f172a" : "transparent",
                            boxShadow: i === activeColorIdx ? "0 0 0 2px #0f172a" : "0 1px 3px rgba(0,0,0,0.2)",
                            transform: i === activeColorIdx ? "scale(1.15)" : "scale(1)",
                          }}
                        >
                          {i === activeColorIdx && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[14px] text-slate-800 font-bold">check</span>
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="ml-auto flex items-center gap-3">
                    {totalHighlights + totalStrokes > 0 && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        {totalHighlights + totalStrokes} annotation{totalHighlights + totalStrokes !== 1 ? "s" : ""}
                      </span>
                    )}
                    {totalHighlights + totalStrokes > 0 && (
                      <button
                        type="button"
                        onClick={clearAnnotations}
                        className="text-xs text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                        {t("common.clearAll")}
                      </button>
                    )}
                  </div>
                </div>
              </ToolCard>

              {/* Page preview + drawing canvas */}
              <ToolCard className="p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{t("common.pagePreview")}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedId
                        ? t("highlight.hintSelected")
                        : mode === "draw"
                          ? t("highlight.hintDraw")
                          : t("highlight.hintHighlight")}
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

                  <canvas
                    ref={strokeCanvasRef}
                    className="absolute inset-0 pointer-events-none block w-full h-auto"
                    aria-hidden="true"
                  />

                  {/* Interaction overlay */}
                  <div
                    ref={wrapRef}
                    className="absolute inset-0 touch-none select-none cursor-crosshair"
                    style={{ cursor: selectedId ? "default" : "crosshair" }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onClick={(e) => {
                      // Deselect when clicking empty space
                      if ((e.target as HTMLElement).dataset.hlid === undefined) setSelectedId(null);
                    }}
                  >
                    {/* Existing highlights */}
                    {pageHighlights.map(hl => {
                      const c = COLORS[hl.colorIndex];
                      const isSel = hl.id === selectedId;
                      return (
                        <div
                          key={hl.id}
                          data-hlid={hl.id}
                          className="absolute transition-all"
                          style={{
                            left: `${hl.xFrac * 100}%`,
                            top: `${hl.yFrac * 100}%`,
                            width: `${hl.wFrac * 100}%`,
                            height: `${hl.hFrac * 100}%`,
                            backgroundColor: `${c.hex}${OPACITY_DISPLAY}`,
                            outline: isSel ? "2px solid #0f172a" : `1px solid ${c.hex}88`,
                            borderRadius: "1px",
                            zIndex: isSel ? 10 : 1,
                          }}
                          onPointerDown={(e) => { e.stopPropagation(); setSelectedId(hl.id); }}
                        >
                          {isSel && (
                            <button
                              type="button"
                              className="absolute -top-4 -right-4 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow hover:bg-red-500 hover:border-red-500 hover:text-white text-slate-500 transition-all z-20"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.stopPropagation(); deleteHighlight(hl.id); }}
                            >
                              <span className="material-symbols-outlined text-[16px] leading-none">delete</span>
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Live draw preview */}
                    {drawRect && (
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: `${drawRect.x * 100}%`,
                          top: `${drawRect.y * 100}%`,
                          width: `${drawRect.w * 100}%`,
                          height: `${drawRect.h * 100}%`,
                          backgroundColor: mode === "draw" ? "transparent" : `${COLORS[activeColorIdx].hex}44`,
                          border: mode === "draw" ? "none" : `2px dashed ${COLORS[activeColorIdx].hex}`,
                          borderRadius: "1px",
                        }}
                      />
                    )}

                    {previewLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl pointer-events-none">
                        <span className="material-symbols-outlined animate-spin text-teal-500 text-[22px]">progress_activity</span>
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
              </ToolCard>

              {/* Page thumbnails */}
              <ToolCard>
                <p className="text-sm font-semibold text-slate-700 mb-3">{t("common.pages")}</p>
                <p className="text-xs text-slate-500 mb-3">{t("highlight.thumbHint")}</p>
                <PDFThumbnails
                  file={file}
                  selectedPages={new Set([targetPage])}
                  onTogglePage={goToPage}
                  onLoaded={setPageCount}
                  columns={6}
                />
              </ToolCard>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

              <div className="flex flex-col sm:flex-row gap-3">
                <PrimaryButton onClick={handleExport} loading={processing} disabled={totalHighlights + totalStrokes === 0} className="w-full sm:w-auto">
                  <span className="material-symbols-outlined text-[18px]">draw</span>
                  {totalHighlights + totalStrokes > 0 ? t("highlight.buttonCount", { count: totalHighlights + totalStrokes }) : t("highlight.button")}
                </PrimaryButton>
              </div>
            </>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
