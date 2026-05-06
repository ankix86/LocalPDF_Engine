"use client";

import { useEffect, useState } from "react";
import { renderAllPageThumbnails } from "@/lib/pdf/core";
import { cn } from "@/lib/utils";
import { isTouchDevice } from "@/lib/touch-utils";

interface PDFThumbnailsProps {
  file: File | null;
  selectedPages?: Set<number>;      // 0-indexed
  onTogglePage?: (index: number) => void;
  showLabels?: boolean;
  columns?: number;
  className?: string;
  /** Called when thumbnails finish loading */
  onLoaded?: (count: number) => void;
  /** Enable horizontal scroll on mobile (default: false) */
  mobileHorizontalScroll?: boolean;
}

export default function PDFThumbnails({
  file,
  selectedPages,
  onTogglePage,
  showLabels = true,
  columns = 4,
  className,
  onLoaded,
  mobileHorizontalScroll = false,
}: PDFThumbnailsProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTouch] = useState(() => isTouchDevice());

  useEffect(() => {
    if (!file) {
      setThumbnails([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    file.arrayBuffer().then((buf) => {
      if (cancelled) return;
      return renderAllPageThumbnails(buf, 0.35);
    }).then((thumbs) => {
      if (cancelled || !thumbs) return;
      setThumbnails(thumbs);
      onLoaded?.(thumbs.length);
    }).catch((err) => {
      if (!cancelled) setError(err?.message ?? "Failed to render pages");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [file, onLoaded]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 gap-3 text-slate-500">
        <span className="material-symbols-outlined animate-spin text-teal-500">progress_activity</span>
        <span className="text-sm">Rendering pages…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 py-4">
        <span className="material-symbols-outlined text-[20px]">error</span>
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (thumbnails.length === 0) return null;

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
    6: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6",
  }[columns] ?? "grid-cols-4";

  // Mobile horizontal scroll mode
  if (mobileHorizontalScroll && isTouch) {
    return (
      <div className={cn("overflow-x-auto touch-scroll pb-2 -mx-2 px-2", className)}>
        <div className="flex gap-3" style={{ minWidth: "min-content" }}>
          {thumbnails.map((src, i) => {
            const selected = selectedPages?.has(i) ?? false;
            return (
              <div
                key={i}
                onClick={() => onTogglePage?.(i)}
                className={cn(
                  "group relative rounded border-2 overflow-hidden transition-all shrink-0",
                  onTogglePage ? "cursor-pointer active:scale-95" : "",
                  selected
                    ? "border-teal-500 shadow-md ring-2 ring-teal-200"
                    : "border-slate-200"
                )}
                style={{ width: "120px" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Page ${i + 1}`}
                  className="w-full h-auto block"
                  style={{ aspectRatio: "1 / 1.414", objectFit: "cover" }}
                />
                {selected && (
                  <div className="absolute inset-0 bg-teal-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-teal-600 icon-filled text-[32px]">
                      check_circle
                    </span>
                  </div>
                )}
                {showLabels && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent py-1.5 px-2">
                    <span className="text-white text-xs font-semibold">{i + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Standard grid layout
  return (
    <div className={cn(`grid gap-3 ${gridCols}`, className)}>
      {thumbnails.map((src, i) => {
        const selected = selectedPages?.has(i) ?? false;
        return (
          <div
            key={i}
            onClick={() => onTogglePage?.(i)}
            className={cn(
              "group relative rounded border-2 overflow-hidden transition-all",
              onTogglePage ? "cursor-pointer active:scale-95" : "",
              selected
                ? "border-teal-500 shadow-md ring-2 ring-teal-200"
                : "border-slate-200 hover:border-slate-400"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Page ${i + 1}`}
              className="w-full h-auto block"
              style={{ aspectRatio: "1 / 1.414", objectFit: "cover" }}
            />
            {selected && (
              <div className="absolute inset-0 bg-teal-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-teal-600 icon-filled text-[32px]">
                  check_circle
                </span>
              </div>
            )}
            {showLabels && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent py-1 px-2">
                <span className="text-white text-[10px] font-medium">{i + 1}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
