"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { watermarkPDF } from "@/lib/pdf/watermark";
import { downloadBlob, getBaseName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function WatermarkPDFPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(30);
  const [fontSize, setFontSize] = useState(60);
  const [angle, setAngle] = useState(45);
  const [position, setPosition] = useState<"center" | "tile">("center");
  const [color, setColor] = useState("#808080");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const handleWatermark = async () => {
    if (!file || !text.trim()) return;
    setProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = await watermarkPDF(buffer, {
        text: text.trim(),
        opacity: opacity / 100,
        fontSize,
        angle,
        color: hexToRgb(color),
        position,
      });
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({ blob, filename: `${getBaseName(file.name)}-watermarked.pdf` });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t("watermark.error"));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(null); };

  return (
    <ToolLayout
      title={t("tools.watermarkPdf.title")}
      description={t("watermark.pageDescription")}
      icon="water"
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
              onFiles={(f) => { setFile(f[0]); setResult(null); }}
              files={file ? [file] : []}
            />
          </ToolCard>

          {file && (
            <ToolCard>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">{t("watermark.text")}</label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="CONFIDENTIAL"
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">
                      {t("watermark.opacity", { value: opacity })}
                    </label>
                    <input
                      type="range" min={5} max={100} value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full accent-teal-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">
                      {t("watermark.fontSize", { value: fontSize })}
                    </label>
                    <input
                      type="range" min={20} max={120} value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-teal-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">
                      {t("watermark.angle", { value: angle })}
                    </label>
                    <input
                      type="range" min={0} max={360} value={angle}
                      onChange={(e) => setAngle(Number(e.target.value))}
                      className="w-full accent-teal-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">{t("watermark.color")}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color" value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border border-slate-300"
                      />
                      <span className="text-sm text-slate-600 font-mono">{color}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">{t("watermark.position")}</label>
                  <div className="flex gap-3">
                    {(["center", "tile"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPosition(p)}
                        className={cn(
                          "px-4 py-1.5 rounded border text-sm font-medium transition-all",
                          position === p
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-400"
                        )}
                      >
                        {p === "center" ? t("watermark.center") : t("watermark.tiled")}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

                <PrimaryButton onClick={handleWatermark} loading={processing} disabled={!text.trim()}>
                  <span className="material-symbols-outlined text-[18px]">water</span>
                  {t("watermark.button")}
                </PrimaryButton>
              </div>
            </ToolCard>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
