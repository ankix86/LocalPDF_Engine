"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, ProgressBar } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { ocrPDF, type OcrProgress } from "@/lib/pdf/ocr";
import { downloadBlob, getBaseName } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function OCRPDFPage() {
  const { t } = useTranslation();

  const LANGUAGES = [
    { id: "eng", labelKey: "ocr.langEnglish" },
    { id: "deu", labelKey: "ocr.langGerman" },
    { id: "fra", labelKey: "ocr.langFrench" },
    { id: "spa", labelKey: "ocr.langSpanish" },
    { id: "ita", labelKey: "ocr.langItalian" },
    { id: "por", labelKey: "ocr.langPortuguese" },
    { id: "chi_sim", labelKey: "ocr.langChinese" },
    { id: "jpn", labelKey: "ocr.langJapanese" },
    { id: "ara", labelKey: "ocr.langArabic" },
  ];

  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState("eng");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOCR = async () => {
    if (!file) return;
    setProcessing(true); setError(null); setText(null);
    try {
      const buffer = await file.arrayBuffer();
      const result = await ocrPDF(buffer, lang, setProgress);
      setText(result);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t("ocr.error"));
    } finally { setProcessing(false); setProgress(null); }
  };

  const downloadText = () => {
    if (!text || !file) return;
    const blob = new Blob([text], { type: "text/plain" });
    downloadBlob(blob, `${getBaseName(file.name)}-ocr.txt`);
  };

  const reset = () => { setFile(null); setText(null); setError(null); };
  const progressPct = progress ? Math.round(((progress.page - 1) / progress.total) * 100) : 0;

  return (
    <ToolLayout title={t("tools.ocrPdf.title")} description={t("ocr.pageDescription")} icon="document_scanner" iconClass="bg-teal-50 text-teal-600">
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
          <span className="font-semibold">{t("ocr.perfNote")}</span>
          {t("ocr.perfBody")}
        </div>

        <ToolCard>
          <FileDropzone onFiles={(f) => { setFile(f[0]); setText(null); setError(null); }} files={file ? [file] : []} />
        </ToolCard>

        {file && !text && (
          <ToolCard>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">{t("ocr.language")}</label>
                <select value={lang} onChange={(e) => setLang(e.target.value)}
                  className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                  {LANGUAGES.map(({ id, labelKey }) => (
                    <option key={id} value={id}>{t(labelKey)}</option>
                  ))}
                </select>
              </div>
              {processing && progress && (
                <ProgressBar value={progressPct} label={t("ocr.progress", { page: progress.page, total: progress.total, status: progress.status })} />
              )}
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
              <PrimaryButton onClick={handleOCR} loading={processing}>
                <span className="material-symbols-outlined text-[18px]">document_scanner</span>
                {processing ? t("ocr.running") : t("ocr.start")}
              </PrimaryButton>
            </div>
          </ToolCard>
        )}

        {text && (
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700">{t("ocr.extractedText")}</p>
              <div className="flex gap-2">
                <button onClick={downloadText} className="inline-flex items-center gap-1.5 text-xs font-medium bg-teal-600 text-white px-3 py-1.5 rounded hover:bg-teal-700 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  {t("ocr.downloadTxt")}
                </button>
                <button onClick={reset} className="text-xs font-medium text-slate-500 hover:text-slate-800 px-3 py-1.5 border border-slate-200 rounded hover:border-slate-400 transition-colors">
                  {t("ocr.startOver")}
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
