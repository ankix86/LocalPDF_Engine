"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import PDFThumbnails from "@/components/shared/PDFThumbnail";
import { rotatePDF, type RotationAngle } from "@/lib/pdf/rotate";
import { downloadBlob, getBaseName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function RotatePDFPage() {
  const { t } = useTranslation();

  const ANGLES: { angle: RotationAngle; icon: string; labelKey: string }[] = [
    { angle: 90, icon: "rotate_right", labelKey: "rotate.cw90" },
    { angle: 180, icon: "sync", labelKey: "rotate.180" },
    { angle: 270, icon: "rotate_left", labelKey: "rotate.ccw90" },
  ];

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [angle, setAngle] = useState<RotationAngle>(90);
  const [target, setTarget] = useState<"all" | "selected">("all");
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const togglePage = (i: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleRotate = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const indices = target === "selected"
        ? Array.from(selectedPages)
        : undefined;
      const bytes = await rotatePDF(buffer, angle, indices);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({ blob, filename: `${getBaseName(file.name)}-rotated.pdf` });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t("rotate.error"));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setSelectedPages(new Set()); setError(null); };

  return (
    <ToolLayout
      title={t("tools.rotatePdf.title")}
      description={t("rotate.pageDescription")}
      icon="rotate_right"
      iconClass="bg-teal-50 text-teal-600"
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
              onFiles={(f) => { setFile(f[0]); setResult(null); setSelectedPages(new Set()); }}
              files={file ? [file] : []}
            />
          </ToolCard>

          {file && (
            <>
              <ToolCard>
                <p className="text-sm font-semibold text-slate-700 mb-3">{t("rotate.rotation")}</p>
                <div className="flex gap-3 flex-wrap">
                  {ANGLES.map(({ angle: a, icon, labelKey }) => (
                    <button
                      key={a}
                      onClick={() => setAngle(a)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded border text-sm font-medium transition-all",
                        angle === a
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-400"
                      )}
                    >
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                      {t(labelKey)}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex gap-3">
                  {(["all", "selected"] as const).map((tgt) => (
                    <button
                      key={tgt}
                      onClick={() => setTarget(tgt)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                        target === tgt
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                      )}
                    >
                      {tgt === "all" ? t("rotate.allPages") : t("rotate.selectedPages")}
                    </button>
                  ))}
                </div>
              </ToolCard>

              {target === "selected" && (
                <ToolCard>
                  <p className="text-sm font-semibold text-slate-700 mb-3">
                    {t("rotate.selectPages", { count: selectedPages.size })}
                  </p>
                  <PDFThumbnails
                    file={file}
                    selectedPages={selectedPages}
                    onTogglePage={togglePage}
                    onLoaded={setPageCount}
                    columns={4}
                  />
                </ToolCard>
              )}

              {target !== "selected" && (
                <div className="hidden">
                  <PDFThumbnails file={file} onLoaded={setPageCount} columns={6} />
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
              )}

              <PrimaryButton
                onClick={handleRotate}
                loading={processing}
                disabled={target === "selected" && selectedPages.size === 0}
              >
                <span className="material-symbols-outlined text-[18px]">rotate_right</span>
                {t("rotate.button")}
              </PrimaryButton>
            </>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
