"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { pdfToWord } from "@/lib/pdf/pdftoword";
import { downloadBlob, getBaseName } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function PDFToWordPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const blob = await pdfToWord(buffer);
      setResult({ blob, filename: `${getBaseName(file.name)}.docx` });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t("pdfToWord.error"));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); setError(null); };

  return (
    <ToolLayout
      title={t("tools.pdfToWord.title")}
      description={t("pdfToWord.pageDescription")}
      icon="description"
      iconClass="bg-orange-50 text-orange-600"
    >
      <div className="space-y-4">
        <ToolCard>
          <FileDropzone
            onFiles={(f) => { setFile(f[0]); setResult(null); setError(null); }}
            files={file ? [file] : []}
          />
        </ToolCard>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
          <p className="font-semibold mb-1">{t("pdfToWord.limitations")}</p>
          <p>
            {t("pdfToWord.limitationsBody")}{" "}
            <a href="/ocr-pdf" className="underline font-medium">{t("pdfToWord.ocrToolLink")}</a> {t("pdfToWord.limitationsEnd")}
          </p>
        </div>

        {result ? (
          <ToolCard>
            <DownloadSuccess
              onDownload={() => downloadBlob(result.blob, result.filename)}
              onReset={reset}
              filename={result.filename}
            />
          </ToolCard>
        ) : (
          file && (
            <ToolCard>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-4">{error}</p>}
              <PrimaryButton onClick={handleConvert} loading={processing}>
                <span className="material-symbols-outlined text-[18px]">description</span>
                {t("pdfToWord.button")}
              </PrimaryButton>
            </ToolCard>
          )
        )}
      </div>
    </ToolLayout>
  );
}
