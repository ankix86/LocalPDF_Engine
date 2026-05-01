"use client";

import Link from "next/link";
import { useState } from "react";
import { TOOLS, CATEGORIES, type ToolCategory } from "@/lib/tools";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory | "all">("all");

  const filtered =
    activeCategory === "all"
      ? TOOLS
      : TOOLS.filter((t) => t.category === activeCategory);

  return (
    <main>
      {/* Hero */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">
            <span className="material-symbols-outlined icon-filled text-[14px]">lock</span>
            100% browser-based · Nothing uploaded to any server
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            Every PDF tool you need,<br className="hidden sm:block" /> completely free
          </h1>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            Merge, split, compress, convert, rotate, watermark, sign, and stamp PDFs - all
            processed locally in your browser. No uploads. No accounts. Open source.
          </p>
        </div>
      </section>

      {/* Tools */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        {/* Category tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeCategory === cat.id
                  ? "bg-teal-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className="group bg-white rounded-lg border border-slate-200 p-5 hover:border-teal-300 hover:shadow-overlay transition-all duration-200"
            >
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4", tool.color)}>
                <span className="material-symbols-outlined text-[22px]">{tool.icon}</span>
              </div>
              <h2 className="font-semibold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                {tool.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{tool.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* About: privacy + workflow */}
      <section className="bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Your files stay on your device
            </h2>
            <p className="mt-3 text-slate-600 leading-relaxed">
              LocalPDF Engine runs entirely inside your browser. That means your PDFs are processed on your computer/phone,
              not uploaded to a server.
            </p>
          </div>

          {/* Simple visual flow */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: "folder_open",
                title: "1) Choose a file",
                body: "Pick a PDF from your device. It stays local.",
              },
              {
                icon: "bolt",
                title: "2) Edit in your browser",
                body: "Merge, split, crop, sign, compress, and more. Processing happens locally.",
              },
              {
                icon: "download",
                title: "3) Download the result",
                body: "Save the updated PDF. Nothing is sent anywhere.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="relative rounded-xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px] icon-filled">
                      {step.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{step.body}</p>
                  </div>
                </div>

                {/* Connector arrow (desktop only) */}
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-slate-300">
                  <span className="material-symbols-outlined text-[26px]">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>

          {/* Key promises */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: "cloud_off",
                title: "No uploads",
                body: "Your PDF never leaves your device.",
              },
              {
                icon: "visibility_off",
                title: "No tracking",
                body: "We don’t look at your files or collect their content.",
              },
              {
                icon: "lock",
                title: "Private by design",
                body: "Everything happens locally in your browser.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px] icon-filled">
                      {item.icon}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px] icon-filled">info</span>
              </div>
              <div>
                <p className="font-semibold text-amber-900">Important note</p>
                <p className="mt-1 text-sm text-amber-800 leading-relaxed">
                  Since everything runs on your device, very large files and OCR can take longer depending on your phone/computer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy callout */}
      <section className="bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-12 grid sm:grid-cols-3 gap-8 text-center">
          {[
            {
              icon: "lock",
              title: "100% Private",
              body: "Files never leave your device. All processing happens in the browser.",
            },
            {
              icon: "code",
              title: "Open Source",
              body: "Full source code on GitHub. Inspect, contribute or self-host freely.",
            },
            {
              icon: "bolt",
              title: "No Limits",
              body: "No file-size caps, no sign-up required, no watermarks added.",
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-teal-600 icon-filled text-[24px]">{icon}</span>
              </div>
              <h3 className="font-semibold text-slate-800">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
