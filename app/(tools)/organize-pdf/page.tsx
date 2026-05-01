"use client";

import { useState, useEffect } from "react";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { renderAllPageThumbnails } from "@/lib/pdf/core";
import { reorganizePages } from "@/lib/pdf/organize";
import { downloadBlob, getBaseName } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PageItem {
  originalIndex: number;
  thumbnail: string;
  deleted: boolean;
}

export default function OrganizePDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    setLoading(true);
    setPages([]);
    file.arrayBuffer().then((buf) => renderAllPageThumbnails(buf, 0.35)).then((thumbs) => {
      setPages(thumbs.map((t, i) => ({ originalIndex: i, thumbnail: t, deleted: false })));
    }).finally(() => setLoading(false));
  }, [file]);

  const toggleDelete = (i: number) => {
    setPages((prev) => prev.map((p, idx) => idx === i ? { ...p, deleted: !p.deleted } : p));
  };

  const movePage = (from: number, to: number) => {
    setPages((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const handleApply = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const order = pages.filter((p) => !p.deleted).map((p) => p.originalIndex);
      if (order.length === 0) { setError("At least one page must remain."); return; }
      const bytes = await reorganizePages(buffer, order);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({ blob, filename: `${getBaseName(file.name)}-organized.pdf` });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setPages([]); setResult(null); setError(null); };

  const active = pages.filter((p) => !p.deleted);
  const deleted = pages.filter((p) => p.deleted);

  return (
    <ToolLayout
      title="Reorder / Delete Pages"
      description="Drag pages to reorder, or click × to delete them."
      icon="grid_view"
      iconClass="bg-blue-50 text-blue-600"
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
              onFiles={(f) => { setFile(f[0]); setResult(null); }}
              files={file ? [file] : []}
            />
          </ToolCard>

          {loading && (
            <div className="flex items-center gap-2 text-slate-500 py-4">
              <span className="material-symbols-outlined animate-spin text-teal-500">progress_activity</span>
              <span className="text-sm">Loading pages…</span>
            </div>
          )}

          {pages.length > 0 && (
            <ToolCard>
              <p className="text-sm font-semibold text-slate-700 mb-1">
                {active.length} page{active.length !== 1 ? "s" : ""} - drag to reorder, click × to remove
              </p>
              <p className="text-xs text-slate-500 mb-4">Click a deleted page to restore it.</p>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {pages.map((page, i) => (
                  <div
                    key={i}
                    draggable={!page.deleted}
                    onDragStart={() => { if (!page.deleted) setDragFrom(i); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragFrom !== null && dragFrom !== i) movePage(dragFrom, i);
                      setDragFrom(null);
                      setDragOver(null);
                    }}
                    onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
                    className={cn(
                      "relative group rounded border-2 overflow-hidden transition-all",
                      page.deleted
                        ? "opacity-40 border-slate-200 cursor-pointer"
                        : dragOver === i
                        ? "border-teal-400 scale-105"
                        : "border-slate-200 hover:border-slate-400 cursor-grab active:cursor-grabbing"
                    )}
                    onClick={() => page.deleted && toggleDelete(i)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.thumbnail}
                      alt={`Page ${page.originalIndex + 1}`}
                      className="w-full h-auto"
                      style={{ aspectRatio: "1 / 1.414", objectFit: "cover" }}
                    />
                    {page.deleted && (
                      <div className="absolute inset-0 bg-red-100/70 flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-500 text-[28px]">delete</span>
                      </div>
                    )}
                    {!page.deleted && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleDelete(i); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full shadow text-slate-500 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 py-1 px-1.5">
                      <span className="text-white text-[10px] font-medium">{page.originalIndex + 1}</span>
                    </div>
                  </div>
                ))}
              </div>

              {deleted.length > 0 && (
                <p className="mt-3 text-xs text-slate-400">
                  {deleted.length} page{deleted.length !== 1 ? "s" : ""} marked for removal. Click to restore.
                </p>
              )}

              {error && <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

              <div className="mt-5 flex gap-3">
                <PrimaryButton onClick={handleApply} loading={processing}>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Apply &amp; Download
                </PrimaryButton>
                <button
                  onClick={() => setPages(pages.map((p) => ({ ...p, deleted: false })))}
                  className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Restore all
                </button>
              </div>
            </ToolCard>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
