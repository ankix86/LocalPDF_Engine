"use client";

import React, { useState, useRef, useEffect } from "react";

interface PageJumpInputProps {
  currentPage: number;
  totalPages: number;
  onJump: (pageIndex: number) => void;
  className?: string;
}

/**
 * Quick page jump input for mobile navigation
 * Allows direct page number entry
 */
export default function PageJumpInput({
  currentPage,
  totalPages,
  onJump,
  className = "",
}: PageJumpInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const pageNum = parseInt(inputValue, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onJump(pageNum - 1); // Convert to 0-indexed
      setIsOpen(false);
      setInputValue("");
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setInputValue(String(currentPage + 1));
        }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-sm hover:bg-slate-50 transition-colors ${className}`}
        aria-label="Jump to page"
      >
        <span className="material-symbols-outlined text-[16px]">search</span>
        <span>
          Page {currentPage + 1} / {totalPages}
        </span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white border-2 border-teal-500 shadow-md ${className}`}
    >
      <span className="material-symbols-outlined text-[16px] text-teal-600">
        search
      </span>
      <input
        ref={inputRef}
        type="number"
        min={1}
        max={totalPages}
        value={inputValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 150);
        }}
        className="w-12 text-xs font-medium text-center bg-transparent border-none outline-none"
        placeholder="##"
        aria-label="Enter page number"
      />
      <span className="text-xs text-slate-500">/ {totalPages}</span>
    </form>
  );
}
