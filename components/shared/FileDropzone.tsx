"use client";

import { useCallback } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { cn, formatBytes } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface FileDropzoneProps {
  onFiles: (files: File[]) => void;
  accept?: Accept;
  maxFiles?: number;
  files?: File[];
  label?: string;
  sublabel?: string;
  className?: string;
}

export default function FileDropzone({
  onFiles,
  accept = { "application/pdf": [".pdf"] },
  maxFiles = 1,
  files = [],
  label,
  sublabel,
  className,
}: FileDropzoneProps) {
  const { t } = useTranslation();
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFiles(accepted);
    },
    [onFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    multiple: maxFiles !== 1,
  });

  const hasFiles = files.length > 0;
  const resolvedLabel = label ?? t("common.dropPdfHere");

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 select-none",
        isDragActive
          ? "border-teal-500 bg-teal-50"
          : "border-slate-300 bg-white hover:border-teal-400 hover:bg-slate-50",
        hasFiles ? "py-6" : "py-16",
        className
      )}
    >
      <input {...getInputProps()} />

      {!hasFiles ? (
        <>
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
            isDragActive ? "bg-teal-100" : "bg-slate-100"
          )}>
            <span className={cn(
              "material-symbols-outlined text-[32px]",
              isDragActive ? "text-teal-600" : "text-slate-400"
            )}>
              upload_file
            </span>
          </div>
          <div className="text-center px-4">
            <p className="font-semibold text-slate-700">{resolvedLabel}</p>
            <p className="text-sm text-slate-500 mt-1">
              {sublabel ?? (maxFiles > 1
                ? t("common.orClickToSelectMultiple", { max: maxFiles })
                : t("common.orClickToSelect"))}
            </p>
          </div>
          <div className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            {Object.values(accept).flat().join(", ")}
          </div>
        </>
      ) : (
        <div className="w-full px-4 space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 text-sm py-1.5">
              <span className="material-symbols-outlined text-teal-600 text-[20px]">
                picture_as_pdf
              </span>
              <span className="flex-1 truncate text-slate-700 font-medium">{f.name}</span>
              <span className="text-slate-400 shrink-0">{formatBytes(f.size)}</span>
            </div>
          ))}
          <p className="text-xs text-slate-400 pt-1 text-center">
            {t("common.clickOrDropToReplace")}
          </p>
        </div>
      )}
    </div>
  );
}
