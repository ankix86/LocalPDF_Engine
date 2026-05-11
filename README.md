# LocalPDF Engine

> A powerful, privacy-first browser-based PDF toolkit. **100% client-side processing** - your PDFs never leave your device.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 🎯 Features

- ✅ **100% Client-Side Processing** - No server uploads, no cloud dependency
- ✅ **Privacy Guaranteed** - Your PDFs are processed entirely in your browser
- ✅ **15+ PDF Tools** - Convert, merge, split, compress, watermark, and more
- ✅ **Intuitive UI** - Modern, responsive design for desktop and mobile
- ✅ **Real-Time Preview** - See changes instantly as you edit
- ✅ **No Installation Required** - Works directly in your browser
- ✅ **Open Source** - Full transparency, community-driven

---

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| **Merge PDF** | Combine multiple PDFs into one |
| **Split PDF** | Extract specific pages from a PDF |
| **Compress PDF** | Reduce file size while maintaining quality |
| **Protect PDF** | Add password protection to PDFs |
| **Unlock PDF** | Remove password protection |
| **Rotate PDF** | Rotate pages 90°, 180°, or 270° |
| **Add Page Numbers** | Insert page numbers with custom styling |
| **Watermark PDF** | Add text or image watermarks |
| **Stamp PDF** | Apply stamps to specific pages |
| **Draw / Highlight PDF** | Draw freehand strokes or highlight text and annotations |
| **OCR PDF** | Extract text from scanned documents |
| **PDF to JPG** | Convert pages to high-quality images |
| **JPG to PDF** | Create PDFs from image files |
| **PDF to Word** | Extract content to Word documents |
| **Organize PDF** | Reorder, delete, or duplicate pages |

---

## 📱 User Interface

### Desktop View
![Desktop Interface](./assets/mockup_images/desktopview.png)
---

## 🔒 Privacy & Security Architecture

All processing happens **locally in your browser**. Here's the complete data flow:

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR BROWSER (CLIENT)                       │
│                                                                   │
│  ┌──────────────┐         ┌──────────────────┐                 │
│  │  Your Files  │────────▶│  PDF.js Library  │                 │
│  │  (Never      │         │  (Renders pages  │                 │
│  │   uploaded)  │         │   in memory)     │                 │
│  └──────────────┘         └──────────────────┘                 │
│         ▲                           │                           │
│         │                           ▼                           │
│         │                  ┌──────────────────┐                │
│         │                  │  Fabric.js       │                │
│         │                  │  (Interactive    │                │
│         │                  │   editing layer) │                │
│         │                  └──────────────────┘                │
│         │                           │                           │
│         │                           ▼                           │
│         │                  ┌──────────────────┐                │
│         │                  │  pdf-lib         │                │
│         │                  │  (PDF mutations) │                │
│         │                  └──────────────────┘                │
│         │                           │                           │
│         │◀──────────────────────────┘                           │
│         │                                                        │
│    ✅ DOWNLOAD                                                  │
│    (Your edited PDF)                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                        ❌ NO SERVER ❌
                   ❌ NO CLOUD UPLOAD ❌
                  ❌ NO DATA TRACKING ❌
```

### Why LocalPDF Engine?

| Aspect | LocalPDF Engine | Traditional Cloud Tools |
|--------|-----------------|------------------------|
| **Data Privacy** | 🔐 100% private | ⚠️ Uploaded to servers |
| **Processing Speed** | ⚡ Instant | 🐢 Depends on network |
| **No Account Needed** | ✅ Yes | ❌ Requires registration |
| **Offline Support** | ✅ Works offline | ❌ Requires internet |
| **No Data Retention** | ✅ Guaranteed | ❌ Files stored on servers |
| **Cost** | ✅ Free | ⚠️ Often paid per operation |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Modern web browser with JavaScript enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/localpdf-engine.git
cd localpdf-engine

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

---

## 🏗️ Project Structure

```
localpdf-engine/
├── app/                      # Next.js app directory
│   ├── (tools)/             # Dynamic tool routes
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── components/
│   ├── layout/              # Header, Footer
│   └── shared/              # Reusable components
├── lib/
│   ├── pdf/                 # PDF processing logic
│   ├── tools.ts             # Tool definitions
│   └── utils.ts             # Utility functions
├── assets/
│   └── mockup_images/       # UI mockups
└── public/                  # Static assets
```

---

## 🔧 Tech Stack

- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **PDF Processing:**
  - [PDF.js](https://mozilla.github.io/pdf.js/) - Rendering
  - [pdf-lib](https://pdf-lib.js.org/) - Manipulation
  - [Fabric.js](http://fabricjs.com/) - Interactive editing
- **OCR:** [Tesseract.js](https://tesseract.projectnaptha.com/)
- **Document Export:** [docx](https://github.com/dolanmiu/docx)
- **Compression:** JSZip

---

## 📖 Usage Guide

### Basic Workflow

1. **Upload PDF** - Drag and drop or click to select
2. **Choose Tool** - Select the operation you want to perform
3. **Configure** - Adjust settings in the sidebar
4. **Preview** - See changes in real-time
5. **Download** - Export your processed PDF

### Example: Merge PDFs

1. Open the "Merge PDF" tool
2. Upload multiple PDFs in order
3. Preview the merged result
4. Click "Download" to save

### Example: Add Watermark

1. Open the "Watermark PDF" tool
2. Upload your PDF
3. Enter watermark text and customize appearance
4. Click "Apply" to preview
5. Download the watermarked PDF

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:
- Setting up your development environment
- Code standards and conventions
- Pull request process
- Bug reporting
- Feature requests

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with love using:
- [Mozilla PDF.js](https://mozilla.github.io/pdf.js/)
- [pdf-lib](https://pdf-lib.js.org/)
- [Fabric.js](http://fabricjs.com/)
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)

---

## 🔐 Privacy Policy

Your data is your own. LocalPDF Engine operates with complete transparency:

- ✅ No analytics tracking
- ✅ No cookies
- ✅ No third-party data sharing
- ✅ No server-side processing
- ✅ No user accounts required

**Your PDFs are never sent to any server.**

---

## 🚦 Roadmap

- [ ] Batch processing for multiple files
- [ ] Custom template creation
- [ ] Advanced OCR with language support
- [ ] Form filling automation
- [ ] Signature verification
- [ ] Cloud storage integration (optional, user opt-in)
- [ ] Mobile app (React Native)
- [ ] Browser extensions

---

## 📊 Stats

- **14+ Tools** ready to use
- **100% Client-Side** processing
- **0% Data** sent to servers
- **∞ Free** forever

---

**Made with ❤️ for privacy-conscious users everywhere.**
