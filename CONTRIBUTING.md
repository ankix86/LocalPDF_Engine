# Contributing to LocalPDF Engine

Thank you for your interest in contributing to LocalPDF Engine! This document provides guidelines and instructions for getting involved.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Testing](#testing)
- [Documentation](#documentation)

---

## 🤝 Code of Conduct

This project adheres to the Contributor Covenant. By participating, you are expected to:

- Be respectful and inclusive
- Welcome diverse perspectives
- Focus on constructive feedback
- Report inappropriate behavior to maintainers

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher (or yarn/pnpm)
- **Git** installed and configured
- A modern code editor (VS Code recommended)
- Familiarity with React, TypeScript, and Next.js basics

### Fork & Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/ankix86/localpdf-engine.git
   cd localpdf-engine
   ```
---

## 🔧 Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.local` file (if needed):

```bash
# .env.local
NEXT_PUBLIC_APP_NAME=LocalPDF Engine
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. Run Linter

```bash
npm run lint
```

### 5. Build for Production

```bash
npm run build
npm start
```

---

## 📁 Project Structure Guide

```
localpdf-engine/
│
├── app/                              # Next.js App Router
│   ├── (tools)/                      # Dynamic route group for tools
│   │   ├── merge-pdf/page.tsx
│   │   ├── split-pdf/page.tsx
│   │   └── [other-tools]/
│   ├── layout.tsx                    # Root layout (metadata, providers)
│   ├── page.tsx                      # Home page / dashboard
│   └── globals.css                   # Global Tailwind imports
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx               # Navigation header
│   │   └── Footer.tsx               # Footer component
│   └── shared/
│       ├── FileDropzone.tsx          # File upload component
│       ├── PDFThumbnail.tsx          # PDF preview thumbnail
│       └── ToolLayout.tsx            # Shared tool page wrapper
│
├── lib/
│   ├── pdf/                          # PDF processing logic
│   │   ├── compress.ts               # Compression algorithm
│   │   ├── convert.ts                # Format conversion
│   │   ├── core.ts                   # Core PDF utilities
│   │   ├── merge.ts                  # PDF merging
│   │   ├── ocr.ts                    # OCR functionality
│   │   ├── organize.ts               # Page organization
│   │   ├── pagenumbers.ts            # Page numbering
│   │   ├── pdftoword.ts              # PDF to Word conversion
│   │   ├── protect.ts                # PDF protection
│   │   ├── rotate.ts                 # Page rotation
│   │   ├── split.ts                  # PDF splitting
│   │   └── watermark.ts              # Watermarking
│   ├── tools.ts                      # Tool registry & metadata
│   └── utils.ts                      # Common utilities
│
├── assets/
│   └── mockup_images/                # UI mockups & screenshots
│       ├── desktopview.png
│       └── phoneview.png
│
├── public/                           # Static files
├── DESIGN.md                         # Design system documentation
├── CLAUDE.md                         # Architecture overview
├── README.md                         # Project README
├── CONTRIBUTE.md                     # This file
├── next.config.mjs                   # Next.js configuration
├── tailwind.config.ts                # Tailwind CSS config
├── tsconfig.json                     # TypeScript config
└── package.json                      # Dependencies & scripts
```

---

## 💻 Coding Standards

### TypeScript & Code Quality

- **Use TypeScript** - No `any` types without justification
- **Strict mode enabled** - Follow compiler strictness
- **ESLint compliance** - Run `npm run lint` before committing
- **Naming conventions:**
  - Components: PascalCase (`FileUpload.tsx`)
  - Functions/variables: camelCase (`handleFileUpload`)
  - Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)

### React Best Practices

- Use functional components with hooks
- Avoid prop drilling - use Context API when appropriate
- Memoize expensive computations with `useMemo`
- Optimize re-renders with `useCallback`
- Keep components focused and single-responsibility

### TypeScript Patterns

```typescript
// ✅ Good - Type-safe with explicit types
interface FileUploadProps {
  onFileSelect: (file: File) => void;
  maxSize: number;
  acceptedFormats: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  maxSize,
  acceptedFormats,
}) => {
  // Implementation
};

// ❌ Avoid - Implicit any types
export const FileUpload = ({ onFileSelect, maxSize }) => {
  // Implementation
};
```

### File Organization

- One component per file
- Keep related utilities in the same directory
- Import order: Node → External → Internal → Relative
- Export named exports unless there's a single default

### Styling Rules

- Use Tailwind CSS classes for styling
- Refer to `DESIGN.md` for design tokens
- Follow the color and spacing system
- Keep inline styles minimal

---

## 📝 Commit Guidelines

Follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

- **feat** - New feature
- **fix** - Bug fix
- **docs** - Documentation changes
- **style** - Code style changes (formatting, missing semicolons, etc.)
- **refactor** - Code refactoring without feature changes
- **perf** - Performance improvements
- **test** - Adding or updating tests
- **chore** - Dependency updates, tool configuration

### Examples

```bash
# Feature
git commit -m "feat(pdf): add batch processing for multiple files"

# Bug fix
git commit -m "fix(ui): correct button alignment on mobile view"

# Documentation
git commit -m "docs: add OCR setup instructions"

# Performance
git commit -m "perf(compress): optimize compression algorithm"
```

### Commit Best Practices

- Make small, logical commits
- Each commit should be buildable and testable
- Write clear, descriptive messages
- Reference issues when applicable: `fix #123`

---

## 🔄 Pull Request Process

### Before Submitting

1. **Keep your fork updated:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create a feature branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```

3. **Make your changes** following coding standards

4. **Test thoroughly:**
   ```bash
   npm run lint
   npm run build
   npm run dev  # Manual testing
   ```

5. **Push to your fork:**
   ```bash
   git push origin feat/your-feature-name
   ```

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] ESLint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Changes tested locally
- [ ] Commit messages are clear and descriptive
- [ ] Related issues referenced in description
- [ ] No unrelated changes in the PR
- [ ] Documentation updated if needed

### Pull Request Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe the testing approach

## Screenshots (if applicable)
Add UI screenshots for visual changes

## Related Issues
Closes #123

## Checklist
- [ ] Tests pass
- [ ] Lint passes
- [ ] Build succeeds
```

### Review Process

- At least one maintainer review required
- Address feedback respectfully
- Push updates to the same branch
- Don't force-push after review starts
- Wait for approval before merging

---

## 🐛 Reporting Issues

### Before Reporting

- Search existing issues to avoid duplicates
- Check if it's already fixed in latest code
- Test with latest development version

### Issue Template

```markdown
## Description
Clear description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. ...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 10]
- Browser: [e.g., Chrome 120]
- Node version: [e.g., 18.0.0]

## Screenshots/Logs
Attach relevant screenshots or error logs
```

---

## ✨ Feature Requests

### Suggesting Enhancements

1. Check the [roadmap](README.md#-roadmap) first
2. Search existing issues
3. Use the feature request template:

```markdown
## Description
Clear explanation of the feature

## Use Case
Why is this useful? Who benefits?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches or existing solutions

## Additional Context
Screenshots, mockups, or references
```

---

## 🧪 Testing

### Running Tests

```bash
npm run test          # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

### Writing Tests

- Test critical business logic
- Test edge cases and error handling
- Use descriptive test names
- Keep tests focused and isolated

### Test File Naming

- Feature file: `feature.ts`
- Test file: `feature.test.ts`
- Located in same directory as code

---

## 📚 Documentation

### When to Document

- New features or API changes
- Complex algorithms or workflows
- Setup or configuration instructions
- Breaking changes

### Documentation Standards

- Write in clear, concise English
- Use code examples where helpful
- Keep formatting consistent
- Update related docs together

### Files to Update

- **New tool:** Update `lib/tools.ts` registry
- **Architecture change:** Update `CLAUDE.md`
- **New UI patterns:** Update `DESIGN.md`
- **Setup changes:** Update `CONTRIBUTE.md`

---

## 🎯 Areas We Need Help With

1. **Bug Fixes** - Check labeled "good first issue"
2. **Performance** - Optimize PDF processing
3. **UI/UX** - Improve mobile responsiveness
4. **Testing** - Add comprehensive tests
5. **Documentation** - Improve clarity and examples
6. **New Tools** - Add more PDF utilities
7. **Accessibility** - Enhance WCAG compliance
8. **Localization** - Add language support

---

## ❓ Questions & Support

- **GitHub Discussions:** Ask questions in the community forum
- **Issues:** Report bugs or suggest features
- **Email:** Contact maintainers directly
- **Documentation:** Check `README.md` and `CLAUDE.md`

---

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [PDF.js Guide](https://mozilla.github.io/pdf.js/)
- [pdf-lib Documentation](https://pdf-lib.js.org/)

---

## 📊 Development Workflow Diagram

```
1. Fork on GitHub
   ↓
2. Clone locally
   ↓
3. Create feature branch
   ↓
4. Make changes + commit
   ↓
5. Test locally (npm run lint, build)
   ↓
6. Push to fork
   ↓
7. Create Pull Request
   ↓
8. Address review feedback
   ↓
9. Merge to main
   ↓
10. Celebrate! 🎉
```

---

## 🚀 Your First Contribution

### Recommended First Steps

1. Set up development environment
2. Read through `DESIGN.md` and `CLAUDE.md`
3. Find an issue labeled "good first issue"
4. Create a feature branch
5. Make improvements
6. Submit a pull request
7. Iterate on feedback

### Good First Issues

- Documentation improvements
- Bug fixes in non-critical areas
- Refactoring existing code
- UI/UX enhancements
- Performance optimizations

---

## 🙏 Recognition

All contributors are recognized in:
- **Project README** - Contributors section
- **CHANGELOG** - Listed in releases
- **GitHub** - Shown in contributors graph

---

## 📖 Additional Resources

- [Git Workflow Guide](https://git-scm.com/book/en/v2)
- [GitHub Collaboration Guide](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests)
- [Semantic Versioning](https://semver.org/)
- [Keep a CHANGELOG](https://keepachangelog.com/)

---

## 💡 Tips for Success

1. **Start small** - Fix a typo, improve a comment
2. **Ask for help** - Open a discussion if unsure
3. **Read code** - Learn from existing implementations
4. **Test thoroughly** - Catch issues before submission
5. **Be patient** - Reviews take time
6. **Be respectful** - Everyone is volunteering
7. **Have fun!** - Building together is rewarding

---

**Thank you for contributing to LocalPDF Engine! 🎉**

Together we're building the most private, powerful PDF toolkit on the web.

---

## Quick Command Reference

```bash
# Clone and setup
git clone https://github.com/YOUR_USERNAME/localpdf-engine.git
cd localpdf-engine
npm install

# Create feature branch
git checkout -b feat/your-feature

# Development
npm run dev        # Start dev server
npm run lint       # Check linting
npm run build      # Build for production
npm start          # Start production build

# Commit
git add .
git commit -m "feat(scope): description"
git push origin feat/your-feature

# Clean up
git branch -d feat/your-feature
```

---

**Made with ❤️ by the LocalPDF Engine community.**
