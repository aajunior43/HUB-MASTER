# Editor de PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `Ferramentas PDF` into a responsive local PDF workspace with visual page selection, file ordering, safer compression, password feedback, and clear processing results.

**Architecture:** Keep PDF transformation logic in `src/lib/pdfUtils.ts`. Extract reusable UI primitives from `src/pages/PdfUtils.tsx`: upload, page workspace, file queue, status and result card. Each tab composes those primitives and owns only its operation-specific state.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, shadcn-style UI components, Lucide icons, `@cantoo/pdf-lib`, Vitest, Testing Library.

## Global Constraints

- Processing remains local and must not upload documents to external services.
- Preserve the original file and always generate a copy.
- Use the existing UI system and `src/lib/pdfUtils.ts` APIs where possible.
- Use correct UTF-8 Portuguese copy; never promise unlimited processing.
- Every behavior change gets a failing test before implementation.
- Do not modify unrelated user changes already present in the worktree.

---

### Task 1: Establish testable PDF workspace models and helpers

**Files:**
- Create: `src/components/pdf-editor/pdfTypes.ts`
- Create: `src/components/pdf-editor/pdfEditorUtils.ts`
- Create: `src/components/pdf-editor/pdfEditorUtils.test.ts`
- Modify: `src/lib/pdfUtils.ts` only if a small missing helper is required

**Interfaces:**
- `PdfPageItem = { id: string; sourceIndex: number; pageNumber: number; selected: boolean; rotation: number }`.
- `PdfEditorFile = { id: string; file: File; buffer: ArrayBuffer; pages: number; thumbnails: string[] }`.
- `togglePageSelection(items, pageNumber): PdfPageItem[]`.
- `invertPageSelection(items): PdfPageItem[]`.
- `reorderItems(items, fromIndex, toIndex): PdfPageItem[]`.
- `getSelectedPageNumbers(items): number[]`.
- `getPasswordStrength(password): 'fraca' | 'media' | 'forte'`.

- [ ] **Step 1: Write failing tests** for selection, inversion, reordering, selected-page ordering, and password strength.
- [ ] **Step 2: Run `npm test -- src/components/pdf-editor/pdfEditorUtils.test.ts` and confirm failure because the helpers do not exist.**
- [ ] **Step 3: Implement the smallest pure helpers with immutable array operations.**
- [ ] **Step 4: Run the focused test and confirm all helper cases pass.**
- [ ] **Step 5: Commit with `git add src/components/pdf-editor && git commit -m "test: add pdf editor state helpers"`.**

### Task 2: Build the upload, status, and result primitives

**Files:**
- Create: `src/components/pdf-editor/PdfDropzone.tsx`
- Create: `src/components/pdf-editor/PdfProcessingStatus.tsx`
- Create: `src/components/pdf-editor/PdfResultCard.tsx`
- Create: `src/components/pdf-editor/PdfDropzone.test.tsx`

**Interfaces:**
- `PdfDropzone({ multiple, disabled, onFiles })` accepts click and drop, validates PDF MIME/extension, and reports files through `onFiles(File[])`.
- `PdfResultCard({ result })` receives `{ name, bytes, originalBytes?, reductionPercent? }` and exposes download-again behavior.
- `PdfProcessingStatus({ state, message })` supports `idle | loading | success | error`.

- [ ] **Step 1: Write failing tests** for accepted PDF files, rejected non-PDF files, disabled upload, and accessible dropzone labeling.
- [ ] **Step 2: Run the focused tests and confirm they fail for missing components/behavior.**
- [ ] **Step 3: Implement the primitives using existing `Button`, `Card`, `Alert`, and `Progress` components.**
- [ ] **Step 4: Run focused tests and confirm pass.**
- [ ] **Step 5: Commit with `git add src/components/pdf-editor && git commit -m "feat: add pdf upload and result states"`.**

### Task 3: Build the visual page workspace

**Files:**
- Create: `src/components/pdf-editor/PdfThumbnailRail.tsx`
- Create: `src/components/pdf-editor/PdfWorkspace.tsx`
- Create: `src/components/pdf-editor/PdfWorkspace.test.tsx`

**Interfaces:**
- `PdfThumbnailRail({ pages, activePage, onActivePageChange, onToggleSelection, onReorder })`.
- `PdfWorkspace({ pages, activePage, zoom, onZoomChange, onActivePageChange, onToggleSelection, onReorder, onRotate, onDuplicate, onRemove })`.

- [ ] **Step 1: Write failing tests** for page count, active-page navigation, selected state, keyboard activation, and reorder callback.
- [ ] **Step 2: Run the focused tests and confirm expected failures.**
- [ ] **Step 3: Implement thumbnail rail and main preview with zoom controls, previous/next buttons, page counter, and responsive vertical layout.**
- [ ] **Step 4: Add keyboard focus styles, `aria-current`, `aria-pressed`, labels, and disabled boundaries.**
- [ ] **Step 5: Run focused tests and confirm pass.**
- [ ] **Step 6: Commit with `git add src/components/pdf-editor && git commit -m "feat: add visual pdf page workspace"`.**

### Task 4: Add file queue and shared tool shell

**Files:**
- Create: `src/components/pdf-editor/PdfFileQueue.tsx`
- Create: `src/components/pdf-editor/PdfToolShell.tsx`
- Create: `src/components/pdf-editor/PdfFileQueue.test.tsx`

**Interfaces:**
- `PdfFileQueue({ files, onReorder, onRemove })` displays thumbnail, filename, pages, size, drag handle, keyboard reorder controls, and remove action.
- `PdfToolShell({ icon, title, description, children, tips })` provides the main card, responsive sidebar, privacy note, and processing status region.

- [ ] **Step 1: Write failing tests** for queue ordering, removal, accessible reorder controls, and responsive shell headings.
- [ ] **Step 2: Run focused tests and confirm failure.**
- [ ] **Step 3: Implement queue and shell, reusing `PdfDropzone` and existing UI components.**
- [ ] **Step 4: Run focused tests and confirm pass.**
- [ ] **Step 5: Commit with `git add src/components/pdf-editor && git commit -m "feat: add reusable pdf tool shell"`.**

### Task 5: Refactor `PdfUtils.tsx` to use the workspace

**Files:**
- Modify: `src/pages/PdfUtils.tsx`
- Create: `src/pages/PdfUtils.test.tsx`

- [ ] **Step 1: Write failing tests** for the four tabs, local-processing copy, merge requiring two files, extraction selection, and generated-result rendering.
- [ ] **Step 2: Run focused tests and confirm failure against the current UI.**
- [ ] **Step 3: Replace duplicated dropzone/iframe/layout code with the shared components while preserving existing PDF utility calls.**
- [ ] **Step 4: Implement merge file queue, extraction page workspace, and result state with repeat download.**
- [ ] **Step 5: Add tab overflow behavior for small screens and correct all Portuguese copy to UTF-8.**
- [ ] **Step 6: Run the focused page tests and confirm pass.**
- [ ] **Step 7: Commit with `git add src/pages/PdfUtils.tsx src/pages/PdfUtils.test.tsx && git commit -m "feat: redesign pdf tools workspace"`.**

### Task 6: Improve compression and password protection safeguards

**Files:**
- Modify: `src/pages/PdfUtils.tsx`
- Create: `src/components/pdf-editor/PdfCompressionOptions.tsx`
- Create: `src/components/pdf-editor/PdfProtectionForm.tsx`
- Create: `src/components/pdf-editor/PdfProtectionForm.test.tsx`

- [ ] **Step 1: Write failing tests** for maximum-compression warning/confirmation, password mismatch, short password, show/hide password, and strength labels.
- [ ] **Step 2: Run focused tests and confirm failure.**
- [ ] **Step 3: Implement explicit compression warning and confirmation using `AlertDialog`; implement protection form with visibility toggle and strength feedback.**
- [ ] **Step 4: Wire generated byte sizes and reduction percentage into `PdfResultCard`.**
- [ ] **Step 5: Run focused tests and confirm pass.**
- [ ] **Step 6: Commit with `git add src/pages/PdfUtils.tsx src/components/pdf-editor && git commit -m "feat: add pdf safety and result feedback"`.**

### Task 7: Integrate thumbnails and verify build quality

**Files:**
- Modify: `src/lib/pdfUtils.ts` if thumbnail rendering needs a shared export.
- Modify: `src/components/pdf-editor/*` only for integration fixes.
- Modify: `src/pages/PdfUtils.tsx` only for integration fixes.

- [ ] **Step 1: Run `npm run typecheck` and fix only PDF-editor type errors.**
- [ ] **Step 2: Run `npm run lint` and fix only PDF-editor lint errors.**
- [ ] **Step 3: Run `npm test` and confirm the complete frontend suite passes.**
- [ ] **Step 4: Run `npm run build` and confirm production build succeeds.**
- [ ] **Step 5: Start the app with `npm run dev`, inspect `/pdf-utils` at desktop and mobile widths, and verify upload, page selection, reordering, compression warning, protection form, and result card.**
- [ ] **Step 6: Commit final integration fixes with `git add src/lib/pdfUtils.ts src/components/pdf-editor src/pages/PdfUtils.tsx && git commit -m "chore: verify pdf editor integration"`.**

## Self-review

- Spec coverage: visual preview, thumbnails, selection, ordering, compression warning, protection feedback, result details, accessibility, responsive behavior, local-processing copy, and UTF-8 copy are covered by Tasks 1–7.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps are used.
- Type consistency: shared types and component prop names are defined in Tasks 1–4 before their consumers in Tasks 5–6.
- Scope: no OCR, internal text editing, digital signing, or permanent storage is introduced.
