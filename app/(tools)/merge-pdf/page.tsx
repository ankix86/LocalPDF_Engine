"use client";

import { useState, useRef } from "react";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { mergePDFs } from "@/lib/pdf/merge";
import { downloadBlob } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function MergePDFPage() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const addFiles = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setResult(null);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (from: number, to: number) => {
    setFiles((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    setError(null);
    try {
      const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
      const bytes = await mergePDFs(buffers);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({ blob, filename: "merged.pdf" });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t("merge.error"));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFiles([]); setResult(null); setError(null); };

  return (
    <ToolLayout
      title={t("tools.mergePdf.title")}
      description={t("merge.pageDescription")}
      icon="merge"
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
              onFiles={addFiles}
              files={[]}
              maxFiles={20}
              label={t("merge.dropHere")}
              sublabel={t("merge.clickToSelect")}
            />
          </ToolCard>

          {files.length > 0 && (
            <ToolCard>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">
                  {t("merge.fileCount", { count: files.length })}
                </p>
                <button
                  onClick={() => setFiles([])}
                  className="text-xs text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                  {t("common.clearAll")}
                </button>
              </div>

              <div className="space-y-1.5">
                {files.map((file, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => setDragFrom(i)}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragFrom !== null && dragFrom !== i) moveFile(dragFrom, i);
                      setDragFrom(null);
                      setDragOver(null);
                    }}
                    onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded border text-sm transition-all cursor-grab active:cursor-grabbing",
                      dragOver === i
                        ? "border-teal-400 bg-teal-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">drag_indicator</span>
                    <span className="material-symbols-outlined text-teal-600 text-[18px]">picture_as_pdf</span>
                    <span className="flex-1 truncate text-slate-700 font-medium">{file.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </ToolCard>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
          )}

          <PrimaryButton
            onClick={handleMerge}
            loading={processing}
            disabled={files.length < 2}
          >
            <span className="material-symbols-outlined text-[18px]">merge</span>
            {files.length >= 2
              ? t("merge.mergeButton", { count: files.length })
              : t("merge.addAtLeast2")}
          </PrimaryButton>
        </div>
      )}
    </ToolLayout>
  );
}
