"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import { mergePDFs } from "@/lib/pdf/merge";
import { downloadBlob, formatBytes, getBaseName } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PDFFile {
  file: File;
  id: string;
}

export default function MergePDFPage() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    setResult(null);
    setError(null);
    setFiles((prev) => [
      ...prev,
      ...accepted.map((f) => ({ file: f, id: `${f.name}-${Date.now()}-${Math.random()}` })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    setFiles((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, item);
      return arr;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    setError(null);
    try {
      const buffers = await Promise.all(files.map((f) => f.file.arrayBuffer()));
      const merged = await mergePDFs(buffers);
      const blob = new Blob([merged as unknown as BlobPart], { type: "application/pdf" });
      const firstName = getBaseName(files[0].file.name);
      setResult({ blob, filename: `${firstName}-merged.pdf` });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Merge failed. Ensure all files are valid, non-encrypted PDFs.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.blob, result.filename);
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
  };

  return (
    <ToolLayout
      title="Merge PDF"
      description="Combine multiple PDF files into one. Drag to reorder before merging."
      icon="merge"
      iconClass="bg-blue-50 text-blue-600"
    >
      {result ? (
        <ToolCard>
          <DownloadSuccess
            onDownload={handleDownload}
            onReset={reset}
            filename={result.filename}
            sizeBytes={result.blob.size}
          />
        </ToolCard>
      ) : (
        <div className="space-y-4">
          {/* Drop zone */}
          <ToolCard>
            <div
              {...getRootProps()}
              className={cn(
                "flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg py-10 cursor-pointer transition-all",
                isDragActive ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-teal-400 hover:bg-slate-50"
              )}
            >
              <input {...getInputProps()} />
              <span className="material-symbols-outlined text-slate-400 text-[40px]">upload_file</span>
              <div className="text-center">
                <p className="font-medium text-slate-700">Drop PDFs here</p>
                <p className="text-sm text-slate-500 mt-0.5">or click to select multiple files</p>
              </div>
            </div>
          </ToolCard>

          {/* File list */}
          {files.length > 0 && (
            <ToolCard>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-700">
                  {files.length} file{files.length !== 1 ? "s" : ""} - drag to reorder
                </p>
                <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">
                  Clear all
                </button>
              </div>

              <div className="space-y-2">
                {files.map((f, i) => (
                  <div
                    key={f.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("index", String(i))}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(f.id); }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = Number(e.dataTransfer.getData("index"));
                      moveFile(from, i);
                      setDragOverId(null);
                    }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing",
                      dragOverId === f.id ? "border-teal-400 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">drag_indicator</span>
                    <span className="material-symbols-outlined text-teal-500 text-[20px] shrink-0">picture_as_pdf</span>
                    <span className="flex-1 text-sm font-medium text-slate-700 truncate">{f.file.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{formatBytes(f.file.size)}</span>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </div>
              )}

              <div className="mt-5 flex items-center gap-3">
                <PrimaryButton
                  onClick={handleMerge}
                  disabled={files.length < 2}
                  loading={processing}
                >
                  <span className="material-symbols-outlined text-[18px]">merge</span>
                  Merge {files.length} PDFs
                </PrimaryButton>
                {files.length < 2 && (
                  <span className="text-xs text-slate-400">Add at least 2 files</span>
                )}
              </div>
            </ToolCard>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
