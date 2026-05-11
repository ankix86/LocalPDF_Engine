"use client";

import { useState, useRef, useEffect } from "react";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import PDFThumbnails from "@/components/shared/PDFThumbnail";
import { PDFDocument, degrees } from "pdf-lib";
import { renderPageToCanvas } from "@/lib/pdf/core";
import { downloadBlob, getBaseName } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

type SigPlacement = {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

type HandleState = {
  type: "move" | "resize" | "rotate";
  placementId: string;
  startPtrX: number;
  startPtrY: number;
  startX: number;
  startY: number;
  startScale: number;
  startRotation: number;
  startDist?: number;
  startAngle?: number;
  centerX?: number;
  centerY?: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function SignPDFPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [targetPage, setTargetPage] = useState(0);
  const [hasSig, setHasSig] = useState(false);
  const [sigPreviewUrl, setSigPreviewUrl] = useState<string | null>(null);
  const [placements, setPlacements] = useState<SigPlacement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [defaultScale, setDefaultScale] = useState(30);
  const [defaultRotation, setDefaultRotation] = useState(0);
  const [handle, setHandle] = useState<HandleState | null>(null);
  const [hoverPt, setHoverPt] = useState<{ x: number; y: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!file) { setPreviewError(null); setPreviewLoading(false); return; }
    let cancelled = false;
    setPreviewLoading(true); setPreviewError(null);
    file.arrayBuffer()
      .then(buf => renderPageToCanvas(buf, targetPage + 1, 2))
      .then(rendered => {
        if (cancelled || !previewCanvasRef.current) return;
        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = rendered.width; canvas.height = rendered.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(rendered, 0, 0);
      })
      .catch((err: unknown) => { if (!cancelled) setPreviewError((err as Error)?.message ?? "Failed to render."); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [file, targetPage]);

  useEffect(() => {
    setSelectedId(id => id && placements.some(p => p.id === id) ? id : null);
  }, [placements]);

  useEffect(() => {
    if (!handle) return;
    const onMove = (e: PointerEvent) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      if (handle.type === "move") {
        const dx = ((e.clientX - handle.startPtrX) / rect.width) * 100;
        const dy = ((e.clientY - handle.startPtrY) / rect.height) * 100;
        setPlacements(prev => prev.map(p =>
          p.id === handle.placementId
            ? { ...p, x: clamp(handle.startX + dx, 3, 97), y: clamp(handle.startY + dy, 3, 97) }
            : p
        ));
      } else if (handle.type === "resize") {
        const dx = e.clientX - handle.centerX!;
        const dy = e.clientY - handle.centerY!;
        const ratio = Math.sqrt(dx * dx + dy * dy) / (handle.startDist || 1);
        setPlacements(prev => prev.map(p =>
          p.id === handle.placementId ? { ...p, scale: clamp(handle.startScale * ratio, 6, 88) } : p
        ));
      } else {
        const dx = e.clientX - handle.centerX!;
        const dy = e.clientY - handle.centerY!;
        let delta = Math.atan2(dy, dx) * (180 / Math.PI) - handle.startAngle!;
        while (delta > 180) delta -= 360;
        while (delta < -180) delta += 360;
        let r = handle.startRotation + delta;
        while (r > 180) r -= 360;
        while (r < -180) r += 360;
        setPlacements(prev => prev.map(p =>
          p.id === handle.placementId ? { ...p, rotation: r } : p
        ));
      }
    };
    const onUp = () => setHandle(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [handle]);

  const getRelPt = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const r = wrap.getBoundingClientRect();
    return {
      x: clamp(((clientX - r.left) / r.width) * 100, 3, 97),
      y: clamp(((clientY - r.top) / r.height) * 100, 3, 97),
    };
  };

  const startMove = (e: React.PointerEvent, p: SigPlacement) => {
    e.stopPropagation(); e.preventDefault();
    setSelectedId(p.id); setDefaultScale(p.scale); setDefaultRotation(p.rotation);
    setHandle({ type: "move", placementId: p.id, startPtrX: e.clientX, startPtrY: e.clientY, startX: p.x, startY: p.y, startScale: p.scale, startRotation: p.rotation });
  };

  const startResize = (e: React.PointerEvent, p: SigPlacement) => {
    e.stopPropagation(); e.preventDefault();
    const wrap = wrapRef.current; if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + (p.x / 100) * rect.width;
    const cy = rect.top + (p.y / 100) * rect.height;
    const dx = e.clientX - cx; const dy = e.clientY - cy;
    setHandle({ type: "resize", placementId: p.id, startPtrX: e.clientX, startPtrY: e.clientY, startX: p.x, startY: p.y, startScale: p.scale, startRotation: p.rotation, startDist: Math.sqrt(dx * dx + dy * dy) || 1, centerX: cx, centerY: cy });
  };

  const startRotate = (e: React.PointerEvent, p: SigPlacement) => {
    e.stopPropagation(); e.preventDefault();
    const wrap = wrapRef.current; if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + (p.x / 100) * rect.width;
    const cy = rect.top + (p.y / 100) * rect.height;
    setHandle({ type: "rotate", placementId: p.id, startPtrX: e.clientX, startPtrY: e.clientY, startX: p.x, startY: p.y, startScale: p.scale, startRotation: p.rotation, startAngle: Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI), centerX: cx, centerY: cy });
  };

  const placeSignature = (e: React.MouseEvent) => {
    if (!sigPreviewUrl || handle) return;
    const pt = getRelPt(e.clientX, e.clientY); if (!pt) return;
    const placement: SigPlacement = { id: crypto.randomUUID(), pageIndex: targetPage, x: pt.x, y: pt.y, scale: defaultScale, rotation: defaultRotation };
    setPlacements(prev => [...prev, placement]);
    setSelectedId(placement.id);
  };

  const deletePlacement = (id: string) => setPlacements(prev => prev.filter(p => p.id !== id));

  // Signature pad drawing
  const getDrawPoint = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: ((clientX - rect.left) / rect.width) * canvas.width, y: ((clientY - rect.top) / rect.height) * canvas.height };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = sigCanvasRef.current; if (!canvas) return;
    e.preventDefault();
    isDrawing.current = true;
    lastPoint.current = getDrawPoint(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !sigCanvasRef.current) return;
    e.preventDefault();
    const canvas = sigCanvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const point = getDrawPoint(e, canvas);
    if (lastPoint.current) {
      ctx.beginPath();
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      setHasSig(true);
      setSigPreviewUrl(canvas.toDataURL("image/png"));
    }
    lastPoint.current = point;
  };

  const endDraw = () => { isDrawing.current = false; lastPoint.current = null; };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current; if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false); setSigPreviewUrl(null); setPlacements([]); setHoverPt(null);
  };

  const handleEmbed = async () => {
    if (!file || !hasSig || !sigCanvasRef.current) return;
    setProcessing(true); setError(null);
    try {
      const sigDataUrl = sigCanvasRef.current.toDataURL("image/png");
      const sigBytes = Uint8Array.from(atob(sigDataUrl.split(",")[1]), c => c.charCodeAt(0));
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages = doc.getPages();
      const sigImage = await doc.embedPng(sigBytes);
      const resolvedPlacements = placements.length > 0
        ? placements
        : [{ id: "default", pageIndex: targetPage, x: 50, y: 80, scale: defaultScale, rotation: 0 }];
      resolvedPlacements.forEach(p => {
        const page = pages[Math.min(p.pageIndex, pages.length - 1)]; if (!page) return;
        const { width, height } = page.getSize();
        const sw = (p.scale / 100) * width;
        const sh = (sigImage.height / sigImage.width) * sw;
        page.drawImage(sigImage, {
          x: (p.x / 100) * width - sw / 2,
          y: height - (p.y / 100) * height - sh / 2,
          width: sw, height: sh,
          rotate: degrees(p.rotation),
        });
      });
      const outBytes = await doc.save();
      setResult({ blob: new Blob([outBytes as unknown as BlobPart], { type: "application/pdf" }), filename: `${getBaseName(file.name)}-signed.pdf` });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t("sign.error"));
    } finally { setProcessing(false); }
  };

  const reset = () => {
    setFile(null); setResult(null); setError(null); setHasSig(false); setSigPreviewUrl(null);
    setTargetPage(0); setPlacements([]); setPageCount(0); setPreviewError(null);
    setHoverPt(null); setHandle(null); setSelectedId(null);
    clearSignature();
  };

  const goToPage = (n: number) => setTargetPage(clamp(n, 0, Math.max(0, pageCount - 1)));
  const pagePlacements = placements.filter(p => p.pageIndex === targetPage);
  const cursorClass = handle?.type === "move" ? "cursor-grabbing" : handle?.type === "rotate" ? "cursor-alias" : sigPreviewUrl ? "cursor-crosshair" : "cursor-default";

  return (
    <ToolLayout
      title={t("tools.signPdf.title")}
      description={t("sign.pageDescription")}
      icon="draw"
      iconClass="bg-teal-50 text-teal-600"
    >
      {result ? (
        <ToolCard>
          <DownloadSuccess onDownload={() => downloadBlob(result.blob, result.filename)} onReset={reset} filename={result.filename} />
        </ToolCard>
      ) : (
        <div className="space-y-4">
          <ToolCard>
            <FileDropzone
              onFiles={(f) => { setFile(f[0]); setResult(null); setTargetPage(0); setPlacements([]); setPageCount(0); setPreviewError(null); clearSignature(); }}
              files={file ? [file] : []}
            />
          </ToolCard>

          {file && (
            <>
              {/* Page preview with interactive handles */}
              <ToolCard className="p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{t("common.pagePreview")}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {sigPreviewUrl
                        ? t("sign.hintWithSig")
                        : t("sign.hintNoSig")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {pagePlacements.length > 0 && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        {pagePlacements.length} placed
                      </span>
                    )}
                    <span className="text-xs font-medium text-slate-500">
                      Page {Math.min(targetPage + 1, Math.max(pageCount, 1))}{pageCount > 0 ? ` / ${pageCount}` : ""}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <canvas ref={previewCanvasRef} className="block w-full h-auto" />
                  </div>

                  <div
                    ref={wrapRef}
                    className={`absolute inset-0 touch-none ${cursorClass}`}
                    onMouseMove={(e) => { if (!handle) setHoverPt(getRelPt(e.clientX, e.clientY)); }}
                    onMouseLeave={() => { if (!handle) setHoverPt(null); }}
                    onClick={placeSignature}
                  >
                    {sigPreviewUrl && (
                      <>
                        {pagePlacements.map(p => {
                          const isSel = p.id === selectedId;
                          return (
                            <div
                              key={p.id}
                              className="absolute touch-none"
                              style={{
                                left: `${p.x}%`,
                                top: `${p.y}%`,
                                width: `${p.scale}%`,
                                transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
                                transformOrigin: "center",
                                maxWidth: "88%",
                                zIndex: isSel ? 10 : 1,
                              }}
                              onMouseMove={(e) => e.stopPropagation()}
                            >
                              {/* Rotation handle */}
                              {isSel && (
                                <div
                                  className="absolute -top-11 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 cursor-grab active:cursor-grabbing touch-none"
                                  onPointerDown={(e) => startRotate(e, p)}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="w-9 h-9 bg-white border-2 border-teal-500 rounded-full flex items-center justify-center shadow-md hover:bg-teal-50 transition-colors">
                                    <span className="material-symbols-outlined text-[18px] text-teal-600 leading-none select-none">rotate_right</span>
                                  </div>
                                  <div className="w-px h-3 bg-teal-400" />
                                </div>
                              )}

                              {/* Signature body - drag to move */}
                              <div
                                className={`group relative rounded-sm cursor-grab active:cursor-grabbing touch-none ${isSel ? "ring-2 ring-teal-500 ring-offset-1" : "hover:ring-2 hover:ring-teal-300"}`}
                                onPointerDown={(e) => startMove(e, p)}
                                onClick={(e) => { e.stopPropagation(); setSelectedId(p.id); }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={sigPreviewUrl} alt="Placed signature" className="block w-full h-auto pointer-events-none" draggable={false} />

                                {/* Delete button - always visible when selected, hover-only otherwise */}
                                <button
                                  type="button"
                                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 z-20 bg-white/90 border border-slate-200 text-slate-500 rounded-full flex items-center justify-center shadow hover:bg-red-500 hover:border-red-500 hover:text-white transition-all ${isSel ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => { e.stopPropagation(); deletePlacement(p.id); }}
                                >
                                  <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                                </button>

                                {/* Corner resize handles - enlarged for touch */}
                                {isSel && (
                                  <>
                                    {[
                                      "absolute -top-2.5 -left-2.5 cursor-nw-resize",
                                      "absolute -top-2.5 -right-2.5 cursor-ne-resize",
                                      "absolute -bottom-2.5 -left-2.5 cursor-sw-resize",
                                      "absolute -bottom-2.5 -right-2.5 cursor-se-resize",
                                    ].map((cls, i) => (
                                      <div
                                        key={i}
                                        className={`${cls} w-5 h-5 bg-white border-2 border-teal-500 rounded-sm shadow-sm z-20 touch-none`}
                                        onPointerDown={(e) => startResize(e, p)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Ghost hover preview */}
                        {hoverPt && !handle && (
                          <div
                            className="absolute opacity-50 pointer-events-none"
                            style={{
                              left: `${hoverPt.x}%`,
                              top: `${hoverPt.y}%`,
                              width: `${defaultScale}%`,
                              transform: `translate(-50%, -50%) rotate(${defaultRotation}deg)`,
                              maxWidth: "88%",
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={sigPreviewUrl} alt="" className="block w-full h-auto" draggable={false} />
                          </div>
                        )}
                      </>
                    )}

                    {!sigPreviewUrl && (
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-teal-300 bg-white/70 px-4 py-2 text-xs font-medium tracking-wide text-teal-700 pointer-events-none whitespace-nowrap">
                        {t("sign.drawPrompt")}
                      </div>
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

                  {pageCount > 1 && (
                    <>
                      <button type="button" aria-label="Previous page" onClick={() => goToPage(targetPage - 1)} disabled={targetPage === 0}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md transition hover:bg-white hover:text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed">
                        <span className="material-symbols-outlined text-[24px]">chevron_left</span>
                      </button>
                      <button type="button" aria-label="Next page" onClick={() => goToPage(targetPage + 1)} disabled={targetPage >= pageCount - 1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md transition hover:bg-white hover:text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed">
                        <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                      </button>
                    </>
                  )}
                </div>
              </ToolCard>

              {/* Signature pad */}
              <ToolCard>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">{t("sign.drawTitle")}</p>
                  <button onClick={clearSignature} className="text-xs text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    {t("common.clear")}
                  </button>
                </div>
                <canvas
                  ref={sigCanvasRef}
                  width={600}
                  height={200}
                  className="w-full border-2 border-dashed border-slate-300 rounded-lg bg-white cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                {!hasSig && (
                  <p className="text-center text-sm text-slate-400 mt-2">{t("sign.signHint")}</p>
                )}
              </ToolCard>

              {/* Page thumbnails */}
              <ToolCard>
                <p className="text-sm font-semibold text-slate-700 mb-3">{t("common.pages")}</p>
                <p className="text-xs text-slate-500 mb-3">
                  {t("sign.thumbHint")}
                </p>
                <PDFThumbnails
                  file={file}
                  selectedPages={new Set([targetPage])}
                  onTogglePage={(i) => setTargetPage(i)}
                  onLoaded={setPageCount}
                  columns={6}
                />
              </ToolCard>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

              <PrimaryButton onClick={handleEmbed} loading={processing} disabled={!hasSig}>
                <span className="material-symbols-outlined text-[18px]">draw</span>
                {t("sign.button")}
              </PrimaryButton>
            </>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
