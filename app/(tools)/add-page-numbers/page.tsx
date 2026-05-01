"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { addPageNumbers, type PageNumberPosition } from "@/lib/pdf/pagenumbers";
import { downloadBlob, getBaseName } from "@/lib/utils";
import { cn } from "@/lib/utils";

const POSITIONS: { id: PageNumberPosition; label: string }[] = [
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-center", label: "Bottom center" },
  { id: "bottom-right", label: "Bottom right" },
  { id: "top-left", label: "Top left" },
  { id: "top-center", label: "Top center" },
  { id: "top-right", label: "Top right" },
];

export default function AddPageNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<PageNumberPosition>("bottom-center");
  const [startAt, setStartAt] = useState(1);
  const [format, setFormat] = useState("{n}");
  const [fontSize, setFontSize] = useState(11);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = await addPageNumbers(buffer, { position, startAt, format, fontSize });
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({ blob, filename: `${getBaseName(file.name)}-numbered.pdf` });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(null); };

  return (
    <ToolLayout
      title="Add Page Numbers"
      description="Stamp page numbers on every page of your PDF."
      icon="format_list_numbered"
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

          {file && (
            <ToolCard>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Position</label>
                  <div className="grid grid-cols-3 gap-2">
                    {POSITIONS.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setPosition(id)}
                        className={cn(
                          "px-3 py-2 rounded border text-xs font-medium transition-all",
                          position === id
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-400"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">
                      Format
                    </label>
                    <input
                      type="text"
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      placeholder="{n} or Page {n} of {total}"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Use <code className="bg-slate-100 px-0.5 rounded">{"{n}"}</code> for page number,{" "}
                      <code className="bg-slate-100 px-0.5 rounded">{"{total}"}</code> for total pages
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">
                      Start at
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={startAt}
                      onChange={(e) => setStartAt(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">
                      Font size: {fontSize}pt
                    </label>
                    <input
                      type="range" min={8} max={24} value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-teal-600"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

                <PrimaryButton onClick={handleAdd} loading={processing}>
                  <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
                  Add Page Numbers
                </PrimaryButton>
              </div>
            </ToolCard>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
