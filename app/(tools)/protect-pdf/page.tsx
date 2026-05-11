"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { protectPDF } from "@/lib/pdf/protect";
import { downloadBlob, getBaseName } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export default function ProtectPDFPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && password !== confirm;

  const handleProtect = async () => {
    if (!file || !password || mismatch) return;
    setProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = await protectPDF(buffer, password);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({ blob, filename: `${getBaseName(file.name)}-protected.pdf` });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? t("protect.error"));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setPassword(""); setConfirm(""); setResult(null); setError(null); };

  return (
    <ToolLayout
      title={t("tools.protectPdf.title")}
      description={t("protect.pageDescription")}
      icon="lock"
      iconClass="bg-red-50 text-red-600"
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
              onFiles={(f) => { setFile(f[0]); setResult(null); setError(null); }}
              files={file ? [file] : []}
            />
          </ToolCard>

          {file && (
            <ToolCard>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">{t("protect.password")}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("protect.enterPassword")}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">{t("protect.confirmPassword")}</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={t("protect.reenterPassword")}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  {mismatch && (
                    <p className="text-xs text-red-500 mt-1">{t("protect.mismatch")}</p>
                  )}
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

                <PrimaryButton onClick={handleProtect} loading={processing} disabled={!password || mismatch}>
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  {t("protect.button")}
                </PrimaryButton>
              </div>
            </ToolCard>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
