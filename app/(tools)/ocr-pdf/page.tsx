"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, ProgressBar } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { ocrPDF, type OcrProgress } from "@/lib/pdf/ocr";
import { downloadBlob, getBaseName } from "@/lib/utils";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { id: "eng", label: "English" },
  { id: "deu", label: "German" },
  { id: "fra", label: "French" },
  { id: "spa", label: "Spanish" },
  { id: "ita", label: "Italian" },
  { id: "por", label: "Portuguese" },
  { id: "chi_sim", label: "Chinese (Simplified)" },
  { id: "jpn", label: "Japanese" },
  { id: "ara", label: "Arabic" },
];

export default function OCRPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState("eng");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOCR = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setText(null);
    try {
      const buffer = await file.arrayBuffer();
      const result = await ocrPDF(buffer, lang, setProgress);
      setText(result);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "OCR failed.");
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  const downloadText = () => {
    if (!text || !file) return;
    const blob = new Blob([text], { type: "text/plain" });
    downloadBlob(blob, `${getBaseName(file.name)}-ocr.txt`);
  };

  const reset = () => { setFile(null); setText(null); setError(null); };

  const progressPct = progress
    ? Math.round(((progress.page - 1) / progress.total) * 100)
    : 0;

  return (
    <ToolLayout
      title="OCR PDF"
      description="Extract text from scanned PDFs using Tesseract.js - runs fully in your browser."
      icon="document_scanner"
      iconClass="bg-teal-50 text-teal-600"
    >
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
          <span className="font-semibold">Performance note: </span>
          OCR is computationally intensive and may take 15–60 seconds per page depending on your device.
          Tesseract language data (~5 MB) is downloaded on first use.
        </div>

        <ToolCard>
          <FileDropzone
            onFiles={(f) => { setFile(f[0]); setText(null); setError(null); }}
            files={file ? [file] : []}
          />
        </ToolCard>

        {file && !text && (
          <ToolCard>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Language</label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                >
                  {LANGUAGES.map(({ id, label }) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </div>

              {processing && progress && (
                <div className="space-y-2">
                  <ProgressBar
                    value={progressPct}
                    label={`Page ${progress.page} of ${progress.total} - ${progress.status}`}
                  />
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

              <PrimaryButton onClick={handleOCR} loading={processing}>
                <span className="material-symbols-outlined text-[18px]">document_scanner</span>
                {processing ? "Running OCR…" : "Start OCR"}
              </PrimaryButton>
            </div>
          </ToolCard>
        )}

        {text && (
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700">Extracted text</p>
              <div className="flex gap-2">
                <button
                  onClick={downloadText}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-teal-600 text-white px-3 py-1.5 rounded hover:bg-teal-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  Download .txt
                </button>
                <button
                  onClick={reset}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 px-3 py-1.5 border border-slate-200 rounded hover:border-slate-400 transition-colors"
                >
                  Start over
                </button>
              </div>
            </div>
            <pre className="text-xs text-slate-700 bg-slate-50 rounded p-4 overflow-auto max-h-96 whitespace-pre-wrap font-mono leading-relaxed border border-slate-200">
              {text}
            </pre>
          </ToolCard>
        )}
      </div>
    </ToolLayout>
  );
}
