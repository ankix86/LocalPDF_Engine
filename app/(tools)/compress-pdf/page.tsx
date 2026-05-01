"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess, ProgressBar } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { compressPDF, type CompressionLevel } from "@/lib/pdf/compress";
import { downloadBlob, formatBytes, getBaseName } from "@/lib/utils";
import { cn } from "@/lib/utils";

const LEVELS: { id: CompressionLevel; label: string; desc: string }[] = [
  { id: "low", label: "Low", desc: "Smallest reduction, best quality" },
  { id: "medium", label: "Medium", desc: "Good balance (recommended)" },
  { id: "high", label: "High", desc: "Maximum reduction, lower quality" },
];

export default function CompressPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<CompressionLevel>("medium");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompress = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(0);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = await compressPDF(buffer, level, (page, total) => {
        setProgress(Math.round((page / total) * 100));
        setProgressLabel(`Compressing page ${page} of ${total}…`);
      });
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({ blob, filename: `${getBaseName(file.name)}-compressed.pdf` });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Compression failed.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  return (
    <ToolLayout
      title="Compress PDF"
      description="Reduce file size by re-encoding pages at lower image quality."
      icon="compress"
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
          {file && (
            <p className="text-center text-xs text-slate-500 mt-2">
              {formatBytes(file.size)} → {formatBytes(result.blob.size)}{" "}
              ({Math.round((1 - result.blob.size / file.size) * 100)}% smaller)
            </p>
          )}
        </ToolCard>
      ) : (
        <div className="space-y-4">
          <ToolCard>
            <FileDropzone
              onFiles={(f) => { setFile(f[0]); setResult(null); setError(null); }}
              files={file ? [file] : []}
            />
          </ToolCard>

          {file && (
            <>
              <ToolCard>
                <p className="text-sm font-semibold text-slate-700 mb-3">Compression level</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {LEVELS.map(({ id, label, desc }) => (
                    <button
                      key={id}
                      onClick={() => setLevel(id)}
                      className={cn(
                        "border rounded-lg p-4 text-left transition-all",
                        level === id
                          ? "border-teal-500 bg-teal-50"
                          : "border-slate-200 hover:border-slate-400"
                      )}
                    >
                      <p className={cn("font-semibold text-sm", level === id ? "text-teal-700" : "text-slate-800")}>
                        {label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  <span className="font-semibold">Note:</span> Compression rasterizes pages to JPEG.
                  Text will no longer be selectable. Best suited for print-ready or image-heavy PDFs.
                </div>
              </ToolCard>

              {processing && (
                <ToolCard>
                  <ProgressBar value={progress} label={progressLabel} />
                </ToolCard>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
              )}

              <PrimaryButton onClick={handleCompress} loading={processing}>
                <span className="material-symbols-outlined text-[18px]">compress</span>
                Compress PDF
              </PrimaryButton>
            </>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
