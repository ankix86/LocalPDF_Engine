"use client";

import { useMemo, useRef, useState } from "react";
import ToolLayout, { PrimaryButton, SecondaryButton, ToolCard } from "@/components/shared/ToolLayout";
import FileDropzone from "@/components/shared/FileDropzone";
import { cn } from "@/lib/utils";

type SourceMode = "url" | "html";
type PageSize = "Letter" | "A4" | "Legal";
type Orientation = "portrait" | "landscape";
type FitMode = "natural" | "fit-width" | "compact";
type MarginPreset = "none" | "small" | "normal" | "wide";

const MARGINS: Record<MarginPreset, string> = {
  none: "0in",
  small: "0.25in",
  normal: "0.5in",
  wide: "0.75in",
};

const FIT_MODES: { id: FitMode; label: string; description: string }[] = [
  {
    id: "natural",
    label: "Original",
    description: "Keep the page close to its own layout.",
  },
  {
    id: "fit-width",
    label: "Fit width",
    description: "Constrain wide content to the printable page.",
  },
  {
    id: "compact",
    label: "Compact",
    description: "Use tighter spacing for long pages and tables.",
  },
];

function normalizeWebsiteUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^(https?:|file:|data:|blob:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function makePrintCss({
  pageSize,
  orientation,
  margin,
  scale,
  fitMode,
}: {
  pageSize: PageSize;
  orientation: Orientation;
  margin: MarginPreset;
  scale: number;
  fitMode: FitMode;
}) {
  const scaleValue = Math.max(0.5, Math.min(1.4, scale / 100));
  const fitWidthCss =
    fitMode === "fit-width" || fitMode === "compact"
      ? `
        *, *::before, *::after { box-sizing: border-box; }
        img, video, canvas, svg, iframe { max-width: 100% !important; height: auto; }
        table { max-width: 100%; border-collapse: collapse; }
        pre, code { white-space: pre-wrap; overflow-wrap: anywhere; }
        body { overflow-wrap: anywhere; }
      `
      : "";
  const compactCss =
    fitMode === "compact"
      ? `
        body { line-height: 1.35; }
        p, ul, ol, blockquote, figure { margin-top: 0.55em; margin-bottom: 0.55em; }
        h1, h2, h3, h4 { page-break-after: avoid; break-after: avoid; }
        table, img, pre, blockquote, figure { break-inside: avoid; page-break-inside: avoid; }
      `
      : "";

  return `
    @page { size: ${pageSize} ${orientation}; margin: ${MARGINS[margin]}; }
    html { background: white; }
    body { margin: 0; background: white; color: #111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #localpdf-print-root {
      transform: scale(${scaleValue});
      transform-origin: top left;
      width: ${100 / scaleValue}%;
      min-height: 100%;
    }
    ${fitWidthCss}
    ${compactCss}
    @media screen {
      body { padding: 16px; }
      #localpdf-print-root { margin: 0 auto; }
    }
  `;
}

function buildPrintableHtml(rawHtml: string, css: string) {
  const styleTag = `<style id="localpdf-print-style">${css}</style>`;
  const rootOpen = `<div id="localpdf-print-root">`;
  const rootClose = "</div>";

  if (/<html[\s>]/i.test(rawHtml)) {
    let html = /<\/head>/i.test(rawHtml)
      ? rawHtml.replace(/<\/head>/i, `${styleTag}</head>`)
      : rawHtml.replace(/<html([^>]*)>/i, `<html$1><head><meta charset="utf-8" />${styleTag}</head>`);

    if (/<body([^>]*)>/i.test(html)) {
      html = html.replace(/<body([^>]*)>/i, `<body$1>${rootOpen}`);
      html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${rootClose}</body>`) : `${html}${rootClose}`;
    }

    return html;
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <base target="_blank" />
    ${styleTag}
  </head>
  <body>
    ${rootOpen}
      ${rawHtml}
    ${rootClose}
  </body>
</html>`;
}

export default function WebsiteToPDFPage() {
  const [mode, setMode] = useState<SourceMode>("url");
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("<h1>Paste or upload HTML to preview it here</h1><p>Use the controls above, then save as PDF from the print dialog.</p>");
  const [pageSize, setPageSize] = useState<PageSize>("Letter");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margin, setMargin] = useState<MarginPreset>("normal");
  const [scale, setScale] = useState(100);
  const [fitMode, setFitMode] = useState<FitMode>("fit-width");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const normalizedUrl = useMemo(() => normalizeWebsiteUrl(url), [url]);
  const printCss = useMemo(
    () => makePrintCss({ pageSize, orientation, margin, scale, fitMode }),
    [pageSize, orientation, margin, scale, fitMode]
  );
  const printableHtml = useMemo(() => buildPrintableHtml(html, printCss), [html, printCss]);

  const handleHtmlFile = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      setError(null);
      setMessage(null);
      setHtml(await file.text());
      setMode("html");
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed to read HTML file.");
    }
  };

  const printHtml = () => {
    setError(null);
    setMessage(null);
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      setError("Popup blocked. Allow popups for this site, then try again.");
      return;
    }
    win.document.open();
    win.document.write(printableHtml);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  const printUrl = () => {
    setError(null);
    setMessage(null);
    if (!normalizedUrl) {
      setError("Enter a website URL first.");
      return;
    }

    try {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
      setMessage("If the print dialog did not open, the website is blocking framed printing. Use Open in new tab and print from the browser.");
    } catch {
      window.open(normalizedUrl, "_blank", "noopener,noreferrer");
      setMessage("The website blocked framed printing. It was opened in a new tab so you can press Ctrl/Cmd + P and choose Save as PDF.");
    }
  };

  const openUrl = () => {
    if (!normalizedUrl) {
      setError("Enter a website URL first.");
      return;
    }
    window.open(normalizedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <ToolLayout
      title="Website / HTML to PDF"
      description="Convert webpages or local HTML into a PDF using the browser's high-fidelity print engine."
      icon="language"
      iconClass="bg-orange-50 text-orange-600"
    >
      <div className="space-y-4">
        <ToolCard>
          <div className="flex flex-col gap-4">
            <div className="inline-flex w-full rounded-full border border-slate-200 bg-slate-100 p-1 sm:w-auto">
              {(["url", "html"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item);
                    setMessage(null);
                    setError(null);
                  }}
                  className={cn(
                    "flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:flex-none",
                    mode === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  )}
                >
                  {item === "url" ? "Website URL" : "HTML file / paste"}
                </button>
              ))}
            </div>

            {mode === "url" ? (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="website-url">
                  Website link
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="website-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="min-h-11 flex-1 rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                  <SecondaryButton onClick={openUrl} disabled={!normalizedUrl}>
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    Open
                  </SecondaryButton>
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  Most public websites print best from their own page. If the preview is blocked, open it in a new tab, press Ctrl/Cmd + P, choose Save as PDF, and use the settings below in the print dialog.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="html-input">
                    Paste HTML
                  </label>
                  <textarea
                    id="html-input"
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    rows={8}
                    className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    spellCheck={false}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Upload local HTML</p>
                  <FileDropzone
                    onFiles={handleHtmlFile}
                    files={[]}
                    accept={{
                      "text/html": [".html", ".htm"],
                      "application/xhtml+xml": [".xhtml"],
                    }}
                    label="Drop HTML here"
                    sublabel="or tap to choose a local .html file"
                    className="min-h-[180px] py-8"
                  />
                </div>
              </div>
            )}
          </div>
        </ToolCard>

        <ToolCard>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Page size
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as PageSize)}
                className="min-h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option>Letter</option>
                <option>A4</option>
                <option>Legal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Orientation
              </label>
              <div className="grid grid-cols-2 rounded border border-slate-200 bg-slate-100 p-1">
                {(["portrait", "landscape"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setOrientation(item)}
                    className={cn(
                      "rounded px-3 py-2 text-sm font-semibold capitalize transition",
                      orientation === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Margins
              </label>
              <select
                value={margin}
                onChange={(e) => setMargin(e.target.value as MarginPreset)}
                className="min-h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm capitalize outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="none">None</option>
                <option value="small">Small</option>
                <option value="normal">Normal</option>
                <option value="wide">Wide</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Scale: {scale}%
              </label>
              <input
                type="range"
                min={50}
                max={140}
                step={5}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="min-h-11 w-full accent-teal-600"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {FIT_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFitMode(item.id)}
                className={cn(
                  "rounded-lg border p-4 text-left transition",
                  fitMode === item.id
                    ? "border-teal-500 bg-teal-50 text-teal-900"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                )}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="mt-1 block text-xs leading-relaxed">{item.description}</span>
              </button>
            ))}
          </div>
        </ToolCard>

        <ToolCard className="p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Preview</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === "url"
                  ? "Some websites block embedding. The Open button is the fallback for those pages."
                  : "This preview includes the print CSS, scale, fit mode, margins, and page size."}
              </p>
            </div>
            <PrimaryButton onClick={mode === "url" ? printUrl : printHtml} disabled={mode === "url" && !normalizedUrl}>
              <span className="material-symbols-outlined text-[18px]">print</span>
              Print / Save PDF
            </PrimaryButton>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {mode === "url" ? (
              normalizedUrl ? (
                <iframe
                  key={normalizedUrl}
                  ref={iframeRef}
                  src={normalizedUrl}
                  title="Website preview"
                  className="h-[70vh] min-h-[480px] w-full bg-white"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex min-h-[360px] items-center justify-center p-6 text-center text-sm text-slate-500">
                  Enter a website URL to load the preview.
                </div>
              )
            ) : (
              <iframe
                ref={iframeRef}
                srcDoc={printableHtml}
                title="HTML print preview"
                className="h-[70vh] min-h-[480px] w-full bg-white"
              />
            )}
          </div>
        </ToolCard>

        {message && <p className="text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded">{message}</p>}
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
      </div>
    </ToolLayout>
  );
}

