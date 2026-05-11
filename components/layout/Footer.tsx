"use client";

import { useTranslation } from "@/lib/i18n";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
        <p className="text-sm text-slate-400">
          {t("footer.poweredBy")}{" "}
          <a
            href="https://pdf-lib.js.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600 transition-colors"
          >
            pdf-lib
          </a>{" "}
          &amp;{" "}
          <a
            href="https://mozilla.github.io/pdf.js"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600 transition-colors"
          >
            PDF.js
          </a>
        </p>
      </div>
    </footer>
  );
}
