"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, SecondaryButton } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import PDFThumbnails from "@/components/shared/PDFThumbnail";
import { splitPDF, splitPDFByPage, parseRangeString } from "@/lib/pdf/split";
import { downloadBlob, getBaseName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

type Mode = "ranges" | "every-page" | "extract";

export default function SplitPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<Mode>("ranges");
  const [rangeInput, setRangeInput] = useState("");
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setFile(null);
    setPageCount(0);
    setRangeInput("");
    setSelectedPages(new Set());
    setError(null);
    setDone(false);
  };

  const togglePage = (i: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleSplit = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const base = getBaseName(file.name);
      const zip = new JSZip();

      if (mode === "every-page") {
        const parts = await splitPDFByPage(buffer);
        parts.forEach(({ bytes, label }) => {
          zip.file(`${base}-${label}.pdf`, bytes);
        });
      } else if (mode === "ranges") {
        const ranges = parseRangeString(rangeInput, pageCount);
        if (!ranges) { setError("Invalid range. Example: 1-3, 5, 7-9"); return; }
        const parts = await splitPDF(buffer, ranges);
        parts.forEach(({ bytes, label }) => {
          zip.file(`${base}-${label}.pdf`, bytes);
        });
      } else {
        // extract: turn each selected page into its own PDF
        const indices = Array.from(selectedPages).sort((a, b) => a - b);
        if (indices.length === 0) { setError("Select at least one page."); return; }
        const ranges = indices.map((idx) => ({ from: idx + 1, to: idx + 1, label: `page-${idx + 1}` }));
        const extracted = await splitPDF(buffer, ranges);
        extracted.forEach(({ bytes, label }) => zip.file(`${base}-${label}.pdf`, bytes));
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `${base}-split.zip`);
      setDone(true);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Split failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="Split PDF"
      description="Divide a PDF into multiple files by page range or extract individual pages."
      icon="cut"
      iconClass="bg-blue-50 text-blue-600"
    >
      {!file ? (
        <ToolCard>
          <FileDropzone onFiles={(f) => setFile(f[0])} />
        </ToolCard>
      ) : done ? (
        <ToolCard>
          <div className="flex flex-col items-center gap-6 py-10 text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-teal-600 icon-filled text-[36px]">check_circle</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-lg">Downloaded as ZIP</p>
              <p className="text-sm text-slate-500 mt-1">Check your downloads folder.</p>
            </div>
            <SecondaryButton onClick={reset}>
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Split another PDF
            </SecondaryButton>
          </div>
        </ToolCard>
      ) : (
        <div className="space-y-4">
          {/* File slot - swap file by clicking */}
          <ToolCard>
            <FileDropzone
              onFiles={(f) => { setFile(f[0]); setSelectedPages(new Set()); setError(null); }}
              files={[file]}
            />
          </ToolCard>

          {/* Mode selector + range input */}
          <ToolCard>
            <p className="text-sm font-semibold text-slate-700 mb-3">Split mode</p>
            <div className="grid sm:grid-cols-3 gap-2">
              {(["ranges", "every-page", "extract"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "px-3 py-2.5 rounded text-sm font-medium border transition-all text-left",
                    mode === m
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-400"
                  )}
                >
                  {m === "ranges" && "By page range"}
                  {m === "every-page" && "Every page separately"}
                  {m === "extract" && "Extract selected pages"}
                </button>
              ))}
            </div>

            {mode === "ranges" && (
              <div className="mt-4">
                <label className="text-xs font-medium text-slate-600 block mb-1.5">
                  Page ranges (e.g.{" "}
                  <code className="bg-slate-100 px-1 rounded">1-3, 5, 7-9</code>)
                </label>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder="1-3, 5, 7-9"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            )}
          </ToolCard>

          {/* Page previews - always visible; selection enabled only for "extract" mode */}
          <ToolCard>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              {mode === "extract"
                ? `Pages - click to select (${selectedPages.size} selected)`
                : `Pages - ${pageCount} total`}
            </p>
            {mode === "extract" && (
              <p className="text-xs text-slate-500 mb-3">
                Each selected page will be saved as a separate PDF.
              </p>
            )}
            <PDFThumbnails
              file={file}
              selectedPages={mode === "extract" ? selectedPages : undefined}
              onTogglePage={mode === "extract" ? togglePage : undefined}
              onLoaded={setPageCount}
              columns={4}
            />
          </ToolCard>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
          )}

          <div className="flex gap-3">
            <PrimaryButton onClick={handleSplit} loading={processing}>
              <span className="material-symbols-outlined text-[18px]">cut</span>
              Split &amp; Download ZIP
            </PrimaryButton>
            <SecondaryButton onClick={reset}>Cancel</SecondaryButton>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
