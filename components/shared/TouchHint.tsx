"use client";

import { useEffect, useState } from "react";
import { isTouchDevice } from "@/lib/touch-utils";

interface TouchHintProps {
  /** Context-specific hint text */
  text: string;
  /** Optional icon name (Material Symbols) */
  icon?: string;
  /** Show hint permanently or auto-hide after delay */
  persistent?: boolean;
  /** Auto-hide delay in ms (default: 4000) */
  autoHideDelay?: number;
  className?: string;
}

/**
 * Touch-first guidance component
 * Shows contextual hints above interactive areas
 */
export default function TouchHint({
  text,
  icon = "touch_app",
  persistent = false,
  autoHideDelay = 4000,
  className = "",
}: TouchHintProps) {
  const [visible, setVisible] = useState(true);
  const [isTouch] = useState(() => isTouchDevice());

  useEffect(() => {
    if (!persistent && visible) {
      const timer = setTimeout(() => setVisible(false), autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [persistent, visible, autoHideDelay]);

  if (!visible) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium shadow-sm animate-fade-in ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="material-symbols-outlined text-[16px] text-teal-600">
        {isTouch ? icon : "info"}
      </span>
      <span>{text}</span>
      {!persistent && (
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="ml-1 text-teal-600 hover:text-teal-800 transition-colors"
          aria-label="Dismiss hint"
        >
          <span className="material-symbols-outlined text-[14px]">close</span>
        </button>
      )}
    </div>
  );
}
