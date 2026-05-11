"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, SecondaryButton } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import PDFThumbnails from "@/components/shared/PDFThumbnail";
import { splitPDF, splitPDFByPage, parseRangeString } from "@/lib/pdf/split";
import { downloadBlob, getBaseName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import { useTranslation } from "@/lib/i18n";

type Mode = "ranges" | "every-page" | "extract";

export default function SplitPDFPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<Mode>("ranges");
  const [rangeInput, setRangeInput] = useState("");
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setFile(null); setPageCount(0); setRangeInput(""); setSelectedPages(new Set()); setError(null); setDone(false);
  };

  const togglePage = (i: number) => {
    setSelectedPages((prev) => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; });
  };

  const handleSplit = async () => {
    if (!file) return;
    setProcessing(true); setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const base = getBaseName(file.name);
      const zip = new JSZip();
      if (mode === "every-page") {
        const parts = await splitPDFByPage(buffer);
        parts.forEach(({ bytes, label }) => zip.file(`${base}-${label}.pdf`, bytes));
      } else if (mode === "ranges") {
        const ranges = parseRangeString(rangeInput, pageCount);
        if (!ranges) { setError(t("split.invalidRange")); return; }
        const parts = await splitPDF(buffer, ranges);
        parts.forEach(({ bytes, label }) => zip.file(`${base}-${label}.pdf`, bytes));
      } else {
        const indices = Array.from(selectedPages).sort((a, b) => a - b);
        if (indices.length === 0) { setError(t("split.selectAtLeast1")); return; }
        const ranges = indices.map((idx) => ({ from: idx + 1, to: idx + 1, label: `page-${idx + 1}` }));
        const extracted = await splitPDF(buffer, ranges);
        extracted.forEach(({ bytes, label }) => zip.file(`${base}-${label}.pdf`, bytes));
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `${base}-split.zip`);
      setDone(true);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t("split.error"));
    } finally { setProcessing(false); }
  };

  return (
    <ToolLayout title={t("tools.splitPdf.title")} description={t("split.pageDescription")} icon="cut" iconClass="bg-blue-50 text-blue-600">
      {!file ? (
        <ToolCard><FileDropzone onFiles={(f) => setFile(f[0])} /></ToolCard>
      ) : done ? (
        <ToolCard>
          <div className="flex flex-col items-center gap-6 py-10 text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-teal-600 icon-filled text-[36px]">check_circle</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-lg">{t("split.downloadedAsZip")}</p>
              <p className="text-sm text-slate-500 mt-1">{t("split.checkDownloads")}</p>
            </div>
            <SecondaryButton onClick={reset}>
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              {t("split.splitAnother")}
            </SecondaryButton>
          </div>
        </ToolCard>
      ) : (
        <div className="space-y-4">
          <ToolCard>
            <FileDropzone onFiles={(f) => { setFile(f[0]); setSelectedPages(new Set()); setError(null); }} files={[file]} />
          </ToolCard>
          <ToolCard>
            <p className="text-sm font-semibold text-slate-700 mb-3">{t("split.splitMode")}</p>
            <div className="grid sm:grid-cols-3 gap-2">
              {(["ranges", "every-page", "extract"] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={cn(
                  "px-3 py-2.5 rounded text-sm font-medium border transition-all text-left",
                  mode === m ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-slate-400"
                )}>
                  {m === "ranges" && t("split.byRange")}
                  {m === "every-page" && t("split.everyPage")}
                  {m === "extract" && t("split.extractSelected")}
                </button>
              ))}
            </div>
            {mode === "ranges" && (
              <div className="mt-4">
                <label className="text-xs font-medium text-slate-600 block mb-1.5">{t("split.rangeLabel")}</label>
                <input type="text" value={rangeInput} onChange={(e) => setRangeInput(e.target.value)} placeholder="1-3, 5, 7-9"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
            )}
          </ToolCard>
          <ToolCard>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              {mode === "extract" ? t("split.pagesSelect", { count: selectedPages.size }) : t("split.pagesTotal", { count: pageCount })}
            </p>
            {mode === "extract" && <p className="text-xs text-slate-500 mb-3">{t("split.eachSelectedSaved")}</p>}
            <PDFThumbnails file={file} selectedPages={mode === "extract" ? selectedPages : undefined}
              onTogglePage={mode === "extract" ? togglePage : undefined} onLoaded={setPageCount} columns={4} />
          </ToolCard>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
          <div className="flex gap-3">
            <PrimaryButton onClick={handleSplit} loading={processing}>
              <span className="material-symbols-outlined text-[18px]">cut</span>
              {t("split.splitButton")}
            </PrimaryButton>
            <SecondaryButton onClick={reset}>{t("common.cancel")}</SecondaryButton>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
