"use client";

import { useState } from "react";
import ToolLayout, { ToolCard, PrimaryButton, DownloadSuccess } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { protectPDF } from "@/lib/pdf/protect";
import { downloadBlob, getBaseName } from "@/lib/utils";

export default function ProtectPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && password !== confirm;

  const handleProtect = async () => {
    if (!file || !password) return;
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setProcessing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = await protectPDF(buffer, password);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({ blob, filename: `${getBaseName(file.name)}-protected.pdf` });
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed to protect PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setFile(null); setPassword(""); setConfirm(""); setResult(null); setError(null); };

  return (
    <ToolLayout
      title="Protect PDF"
      description="Lock your PDF with a password so only authorized users can open it."
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
              onFiles={(f) => { setFile(f[0]); setResult(null); }}
              files={file ? [file] : []}
            />
          </ToolCard>

          {file && (
            <ToolCard>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a strong password"
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

                <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">Confirm password</label>
                  <input
                    type={show ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                      mismatch ? "border-red-400 bg-red-50" : "border-slate-300"
                    }`}
                  />
                  {mismatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

                <PrimaryButton
                  onClick={handleProtect}
                  loading={processing}
                  disabled={!password || !confirm || mismatch}
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  Protect PDF
                </PrimaryButton>
              </div>
            </ToolCard>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
