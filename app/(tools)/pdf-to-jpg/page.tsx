"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, ProgressBar } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { pdfToImages, type ImageFormat } from "@/lib/pdf/convert";
import { downloadBlob, getBaseName } from "@/lib/utils";
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function PDFToJPGPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImageFormat>("jpeg");
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(2.0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dpiLabel = scale === 1 ? "72 dpi" : scale === 1.5 ? "108 dpi" : scale === 2 ? "144 dpi" : "216 dpi";

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true); setProgress(0); setError(null); setPreviews([]);
    try {
      const buffer = await file.arrayBuffer();
      const images = await pdfToImages(buffer, format, scale, quality / 100, (page, total) => {
        setProgress(Math.round((page / total) * 100));
      });
      const thumbs: string[] = [];
      for (const img of images.slice(0, 4)) thumbs.push(URL.createObjectURL(img.blob));
      setPreviews(thumbs);
      const zip = new JSZip();
      const base = getBaseName(file.name);
      images.forEach(({ blob, filename }) => zip.file(`${base}-${filename}`, blob));
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `${base}-images.zip`);
      setDone(true);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t("pdfToJpg.error"));
    } finally { setProcessing(false); }
  };

  const reset = () => { setFile(null); setPreviews([]); setDone(false); setError(null); };

  return (
    <ToolLayout title={t("tools.pdfToJpg.title")} description={t("pdfToJpg.pageDescription")} icon="image" iconClass="bg-orange-50 text-orange-600">
      <div className="space-y-4">
        <ToolCard>
          <FileDropzone onFiles={(f) => { setFile(f[0]); setDone(false); setPreviews([]); }} files={file ? [file] : []} />
        </ToolCard>

        {file && !done && (
          <ToolCard>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">{t("pdfToJpg.format")}</p>
                <div className="flex gap-2">
                  {(["jpeg", "png"] as ImageFormat[]).map((f) => (
                    <button key={f} onClick={() => setFormat(f)} className={cn(
                      "px-4 py-1.5 rounded border text-sm font-medium transition-all",
                      format === f ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-slate-400"
                    )}>{f.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">{t("pdfToJpg.resolution", { dpi: dpiLabel })}</p>
                <div className="flex gap-2">
                  {[1, 1.5, 2, 3].map((s) => (
                    <button key={s} onClick={() => setScale(s)} className={cn(
                      "px-3 py-1.5 rounded border text-sm font-medium transition-all",
                      scale === s ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-slate-400"
                    )}>{s}×</button>
                  ))}
                </div>
              </div>
            </div>
            {format === "jpeg" && (
              <div className="mt-4">
                <label className="text-sm font-medium text-slate-700 block mb-1.5">{t("pdfToJpg.jpegQuality", { value: quality })}</label>
                <input type="range" min={40} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-teal-600" />
              </div>
            )}
            {processing && (
              <div className="mt-4"><ProgressBar value={progress} label={t("pdfToJpg.progress", { value: progress })} /></div>
            )}
            {error && <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
            <PrimaryButton onClick={handleConvert} loading={processing} className="mt-5">
              <span className="material-symbols-outlined text-[18px]">image</span>
              {t("pdfToJpg.button")}
            </PrimaryButton>
          </ToolCard>
        )}

        {done && (
          <ToolCard>
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-teal-600 icon-filled text-[30px]">check_circle</span>
              </div>
              <p className="font-semibold text-slate-800">{t("pdfToJpg.done")}</p>
              {previews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full mt-2">
                  {previews.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt={`Page ${i + 1}`} className="w-full rounded border border-slate-200" />
                  ))}
                </div>
              )}
              <button onClick={reset} className="mt-2 inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium px-5 py-2.5 rounded hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                {t("pdfToJpg.another")}
              </button>
            </div>
          </ToolCard>
        )}
      </div>
    </ToolLayout>
  );
}
