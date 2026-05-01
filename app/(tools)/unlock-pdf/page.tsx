"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { unlockPDF } from "@/lib/pdf/protect";
import { downloadBlob, getBaseName } from "@/lib/utils";

export default function UnlockPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = await unlockPDF(buffer, password);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({ blob, filename: `${getBaseName(file.name)}-unlocked.pdf` });
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "";
      setError(
        msg.toLowerCase().includes("password") || msg.toLowerCase().includes("decrypt")
          ? "Wrong password. Please try again."
          : "Failed to unlock PDF. Ensure it is password-protected and you have the correct password."
      );
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setPassword(""); setResult(null); setError(null); };

  return (
    <ToolLayout
      title="Unlock PDF"
      description="Remove password protection from a PDF you own."
      icon="lock_open"
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
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Current password</label>
                  <p className="text-xs text-slate-500 mb-2">
                    Leave blank if the PDF has no user password but is owner-restricted.
                  </p>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter PDF password (or leave blank)"
                      className="w-full border border-slate-300 rounded px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {show ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

                <PrimaryButton onClick={handleUnlock} loading={processing}>
                  <span className="material-symbols-outlined text-[18px]">lock_open</span>
                  Remove Protection
                </PrimaryButton>
              </div>
            </ToolCard>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
