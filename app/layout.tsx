import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "LocalPDF Engine - Free Online PDF Tools",
  description:
    "Merge, split, compress, convert, rotate, watermark and sign PDFs - all in your browser. No uploads, no server. 100% private and open source.",
  keywords: ["pdf editor", "merge pdf", "split pdf", "compress pdf", "free pdf tools", "online pdf"],
  openGraph: {
    title: "LocalPDF Engine - Free Online PDF Tools",
    description: "All PDF tools. Browser-only. Zero uploads.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className="flex flex-col min-h-screen">
        <I18nProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
