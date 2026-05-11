"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import { imagesToPDF } from "@/lib/pdf/convert";
import { downloadBlob, formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const IMAGE_ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/bmp": [".bmp"],
};

export default function JPGToPDFPage() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted]); setResult(null); setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: IMAGE_ACCEPT, multiple: true });

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));
  const moveFile = (from: number, to: number) => {
    setFiles((prev) => { const arr = [...prev]; const [item] = arr.splice(from, 1); arr.splice(to, 0, item); return arr; });
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true); setError(null);
    try {
      const bytes = await imagesToPDF(files);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({ blob, filename: files.length === 1 ? `${files[0].name.replace(/\.[^.]+$/, "")}.pdf` : "images.pdf" });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t("jpgToPdf.error"));
    } finally { setProcessing(false); }
  };

  const reset = () => { setFiles([]); setResult(null); setError(null); };

  return (
    <ToolLayout title={t("tools.jpgToPdf.title")} description={t("jpgToPdf.pageDescription")} icon="add_photo_alternate" iconClass="bg-orange-50 text-orange-600">
      {result ? (
        <ToolCard>
          <DownloadSuccess onDownload={() => downloadBlob(result.blob, result.filename)} onReset={reset} filename={result.filename} sizeBytes={result.blob.size} />
        </ToolCard>
      ) : (
        <div className="space-y-4">
          <ToolCard>
            <div {...getRootProps()} className={cn(
              "flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg py-10 cursor-pointer transition-all",
              isDragActive ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-teal-400 hover:bg-slate-50"
            )}>
              <input {...getInputProps()} />
              <span className="material-symbols-outlined text-slate-400 text-[40px]">add_photo_alternate</span>
              <div className="text-center">
                <p className="font-medium text-slate-700">{t("jpgToPdf.dropHere")}</p>
                <p className="text-sm text-slate-500 mt-0.5">{t("jpgToPdf.formats")}</p>
              </div>
            </div>
          </ToolCard>

          {files.length > 0 && (
            <ToolCard>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-700">
                  {t("jpgToPdf.imageCount", { count: files.length })}
                </p>
                <button onClick={() => setFiles([])} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">
                  {t("common.clearAll")}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-5">
                {files.map((f, i) => (
                  <div key={i} draggable onDragStart={(e) => e.dataTransfer.setData("index", String(i))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); moveFile(Number(e.dataTransfer.getData("index")), i); }}
                    className="relative group rounded border border-slate-200 overflow-hidden cursor-grab">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(f)} alt={f.name} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                    <button onClick={() => removeFile(i)} className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full text-slate-600 hover:text-red-600 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 rounded">{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-4">{error}</p>}
              <PrimaryButton onClick={handleConvert} loading={processing}>
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                {t("jpgToPdf.button")}
              </PrimaryButton>
            </ToolCard>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
