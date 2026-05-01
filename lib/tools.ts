export interface Tool {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  category: ToolCategory;
  color: string; // Tailwind bg color class for icon container
}

export type ToolCategory = "organize" | "convert" | "edit" | "security";

export const TOOLS: Tool[] = [
  // Organize
  {
    id: "merge-pdf",
    title: "Merge PDF",
    description: "Combine multiple PDFs into one file.",
    icon: "merge",
    href: "/merge-pdf",
    category: "organize",
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: "split-pdf",
    title: "Split PDF",
    description: "Divide a PDF into separate files by page range.",
    icon: "cut",
    href: "/split-pdf",
    category: "organize",
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: "organize-pdf",
    title: "Reorder / Delete Pages",
    description: "Drag pages to reorder or click × to delete them.",
    icon: "grid_view",
    href: "/organize-pdf",
    category: "organize",
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: "add-page-numbers",
    title: "Add Page Numbers",
    description: "Stamp page numbers on every page of your PDF.",
    icon: "format_list_numbered",
    href: "/add-page-numbers",
    category: "organize",
    color: "bg-blue-50 text-blue-600",
  },
  // Convert
  {
    id: "pdf-to-jpg",
    title: "PDF to JPG",
    description: "Export each page as a high-quality JPEG image.",
    icon: "image",
    href: "/pdf-to-jpg",
    category: "convert",
    color: "bg-orange-50 text-orange-600",
  },
  {
    id: "jpg-to-pdf",
    title: "JPG to PDF",
    description: "Pack one or more images into a single PDF.",
    icon: "add_photo_alternate",
    href: "/jpg-to-pdf",
    category: "convert",
    color: "bg-orange-50 text-orange-600",
  },
  {
    id: "pdf-to-word",
    title: "PDF to Word",
    description: "Extract text from a PDF and save as a .docx file.",
    icon: "description",
    href: "/pdf-to-word",
    category: "convert",
    color: "bg-orange-50 text-orange-600",
  },
  // Edit
  {
    id: "compress-pdf",
    title: "Compress PDF",
    description: "Reduce file size while keeping acceptable quality.",
    icon: "compress",
    href: "/compress-pdf",
    category: "edit",
    color: "bg-teal-50 text-teal-600",
  },
  {
    id: "rotate-pdf",
    title: "Rotate PDF",
    description: "Rotate pages 90°, 180° or 270° in any PDF.",
    icon: "rotate_right",
    href: "/rotate-pdf",
    category: "edit",
    color: "bg-teal-50 text-teal-600",
  },
  {
    id: "watermark-pdf",
    title: "Watermark PDF",
    description: "Stamp custom text across all pages.",
    icon: "water",
    href: "/watermark-pdf",
    category: "edit",
    color: "bg-teal-50 text-teal-600",
  },
  {
    id: "sign-pdf",
    title: "Sign PDF",
    description: "Draw or type your signature and embed it.",
    icon: "draw",
    href: "/sign-pdf",
    category: "edit",
    color: "bg-teal-50 text-teal-600",
  },
  {
    id: "highlight-pdf",
    title: "Draw / Highlight PDF",
    description: "Draw freehand strokes or highlight any area on your PDF.",
    icon: "draw",
    href: "/highlight-pdf",
    category: "edit",
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    id: "stamp-pdf",
    title: "Stamp PDF",
    description: "Upload an image stamp and place it on any page.",
    icon: "approval",
    href: "/stamp-pdf",
    category: "edit",
    color: "bg-teal-50 text-teal-600",
  },
  {
    id: "crop-pdf",
    title: "Crop PDF",
    description: "Crop pages individually with a smooth touch-friendly crop box.",
    icon: "crop",
    href: "/crop-pdf",
    category: "edit",
    color: "bg-teal-50 text-teal-600",
  },
  {
    id: "ocr-pdf",
    title: "OCR PDF",
    description: "Extract text from scanned PDFs using OCR.",
    icon: "document_scanner",
    href: "/ocr-pdf",
    category: "edit",
    color: "bg-teal-50 text-teal-600",
  },
  // Security
  {
    id: "protect-pdf",
    title: "Protect PDF",
    description: "Lock your PDF with a password.",
    icon: "lock",
    href: "/protect-pdf",
    category: "security",
    color: "bg-red-50 text-red-600",
  },
  {
    id: "unlock-pdf",
    title: "Unlock PDF",
    description: "Remove password protection from a PDF.",
    icon: "lock_open",
    href: "/unlock-pdf",
    category: "security",
    color: "bg-red-50 text-red-600",
  },
];

export const CATEGORIES: { id: ToolCategory | "all"; label: string }[] = [
  { id: "all", label: "All Tools" },
  { id: "organize", label: "Organize" },
  { id: "convert", label: "Convert" },
  { id: "edit", label: "Edit" },
  { id: "security", label: "Security" },
];
