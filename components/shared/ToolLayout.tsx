"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface ToolLayoutProps {
  title: string;
  description: string;
  icon: string;
  iconClass?: string;
  children: React.ReactNode;
}

export default function ToolLayout({
  title,
  description,
  icon,
  iconClass = "bg-teal-50 text-teal-600",
  children,
}: ToolLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Tool header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            All Tools
          </Link>

          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center shrink-0", iconClass)}>
              <span className="material-symbols-outlined text-[26px]">{icon}</span>
            </div>
            <div>
              <h1 className="text-h2 font-semibold text-slate-900">{title}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tool content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

/* ── Shared card wrapper ── */
export function ToolCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white rounded-lg border border-slate-200 shadow-card p-6", className)}>
      {children}
    </div>
  );
}

/* ── Action button styles ── */
export function PrimaryButton({
  onClick,
  disabled,
  loading,
  children,
  className,
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 bg-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {loading && (
        <span className="material-symbols-outlined text-[18px] animate-spin">
          progress_activity
        </span>
      )}
      {children}
    </button>
  );
}

export function SecondaryButton({
  onClick,
  disabled,
  children,
  className,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium px-5 py-2.5 rounded hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ── Progress bar ── */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-sm text-slate-600">{label}</p>}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

/* ── Download success state ── */
export function DownloadSuccess({
  onDownload,
  onReset,
  filename,
  sizeBytes,
}: {
  onDownload: () => void;
  onReset: () => void;
  filename?: string;
  sizeBytes?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
        <span className="material-symbols-outlined text-teal-600 icon-filled text-[36px]">
          check_circle
        </span>
      </div>
      <div>
        <p className="font-semibold text-slate-800 text-lg">Done!</p>
        {filename && (
          <p className="text-sm text-slate-500 mt-1">
            {filename}
            {sizeBytes !== undefined && ` · ${Math.round(sizeBytes / 1024)} KB`}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-2 bg-teal-600 text-white text-sm font-semibold px-6 py-2.5 rounded hover:bg-teal-700 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Download
        </button>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium px-5 py-2.5 rounded hover:bg-slate-50 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Start Over
        </button>
      </div>
    </div>
  );
}
