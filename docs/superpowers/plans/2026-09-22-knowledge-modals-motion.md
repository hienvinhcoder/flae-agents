# Knowledge Modals (Dropzone Composer) + App Motion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Linear Dropzone Composer UX for Knowledge Upload / Add text / Document detail modals, plus light CSS app-wide motion (Dialog, shell rail, Knowledge list).

**Architecture:** Reuse existing `--motion-*` / `--ease-standard` tokens in `styles.css`; add enter utilities and teach `Dialog` enter/exit before unmount. Knowledge modals stay RHF+Zod; Upload gains a presentational dropzone + file chip. Shell and Knowledge apply utility classes only. No API or schema semantic changes (single-file upload).

**Tech Stack:** React 19, Vite, Tailwind v4, Vitest + RTL, react-hook-form, Zod, i18next, existing `shared/ui` primitives.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-22-knowledge-modals-motion-design.md`
- Superdesign active draft (structural match, not pixel-perfect): `d28ee3de-2af4-48fd-95b9-dd79a4a2b531` (Linear Dropzone Composer)
- Linear-tight tokens / `DESIGN.md` v3 — orange primary only on CTA + focus; no glass, glow, purple
- Motion: CSS only; reuse `--motion-fast` (150ms), `--motion-normal` (200ms), `--motion-slow` (300ms), `--ease-standard`
- Honor existing `@media (prefers-reduced-motion: reduce)` block
- Keep TanStack Query mutations / upload API single-file; no Framer Motion
- Commits only when the user explicitly asks (do not auto-commit)
- File size limit remains 450 lines per source file

---

## File structure

| Path | Responsibility |
|---|---|
| `frontend/src/styles.css` | `ui-fade-in` / `ui-scale-in` / `ui-slide-up` keyframes + utility classes |
| `frontend/src/shared/ui/reduced-motion.test.tsx` | Extend contract for new keyframes still gated by reduced-motion |
| `frontend/src/shared/ui/Dialog.tsx` | Enter/exit animation; optional `size` |
| `frontend/src/shared/ui/Dialog.test.tsx` | A11y + exit-before-unmount + size class |
| `frontend/src/features/knowledge/ui/FileDropzone.tsx` | Presentational dropzone + hidden file input |
| `frontend/src/features/knowledge/ui/FileDropzone.test.tsx` | Browse / drag / clear / disabled |
| `frontend/src/features/knowledge/ui/FileChip.tsx` | Selected file name/size + clear |
| `frontend/src/features/knowledge/ui/UploadDialog.tsx` | Dropzone Composer layout |
| `frontend/src/features/knowledge/ui/UploadDialog.test.tsx` | Update + dropzone coverage |
| `frontend/src/features/knowledge/ui/TextInputDialog.tsx` | Matching dialog family + content surface |
| `frontend/src/features/knowledge/ui/TextInputDialog.test.tsx` | Update markup expectations |
| `frontend/src/features/knowledge/ui/DocumentDetailPanel.tsx` | Product-sheet hierarchy + `size="xl"` |
| `frontend/src/features/knowledge/ui/DocumentDetailPanel.test.tsx` | Update hierarchy assertions |
| `frontend/public/assets/i18n/en.json` + `vi.json` | Dropzone / chip / helper copy |
| `frontend/src/app/layout/AdminSidebar.tsx` | Rail active transition classes |
| `frontend/src/app/layout/RailTooltipPortal.tsx` (or tooltip styles) | Fade-in if tooltip is CSS-driven |
| `frontend/src/features/knowledge/pages/KnowledgeListPage.tsx` | `animate-ui-enter` on main content |
| `frontend/src/features/knowledge/ui/DocumentGrid.tsx` / `DocumentTable.tsx` | Light stagger on first items |

---

### Task 1: Motion utilities in CSS

**Files:**
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/shared/ui/reduced-motion.test.tsx`

**Interfaces:**
- Consumes: existing `--motion-fast|normal|slow`, `--ease-standard`
- Produces: classes `animate-ui-overlay`, `animate-ui-panel`, `animate-ui-panel-out`, `animate-ui-overlay-out`, `animate-ui-enter`, `animate-ui-stagger` (optional data attribute for delay)

- [ ] **Step 1: Extend reduced-motion test to require new keyframe names exist and remain under reduced-motion**

```ts
import { describe, expect, it } from 'vitest';

import css from '../../styles.css?raw';

describe('motion accessibility', () => {
  it('disables animations, transitions, and smooth scrolling when reduced motion is requested', () => {
    const reducedMotion = css.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/)?.[0] ?? '';

    expect(reducedMotion).toContain('transition-duration: 0.01ms');
    expect(reducedMotion).toContain('animation-duration: 0.01ms');
    expect(reducedMotion).toContain('scroll-behavior: auto');
  });

  it('defines ui enter/exit keyframes for dialog and page motion', () => {
    expect(css).toContain('@keyframes ui-fade-in');
    expect(css).toContain('@keyframes ui-fade-out');
    expect(css).toContain('@keyframes ui-scale-in');
    expect(css).toContain('@keyframes ui-scale-out');
    expect(css).toContain('@keyframes ui-slide-up');
    expect(css).toContain('.animate-ui-overlay');
    expect(css).toContain('.animate-ui-panel');
    expect(css).toContain('.animate-ui-enter');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL on missing keyframes**

Run: `cd frontend && npm test -- --run src/shared/ui/reduced-motion.test.tsx`  
Expected: FAIL — `@keyframes ui-fade-in` (or similar) not found

- [ ] **Step 3: Add keyframes + utilities before the reduced-motion block in `styles.css`**

```css
@keyframes ui-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes ui-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes ui-scale-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes ui-scale-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(4px) scale(0.98);
  }
}

@keyframes ui-slide-up {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-ui-overlay {
  animation: ui-fade-in var(--motion-normal) var(--ease-standard) both;
}

.animate-ui-overlay-out {
  animation: ui-fade-out var(--motion-fast) var(--ease-standard) both;
}

.animate-ui-panel {
  animation: ui-scale-in var(--motion-normal) var(--ease-standard) both;
}

.animate-ui-panel-out {
  animation: ui-scale-out var(--motion-fast) var(--ease-standard) both;
}

.animate-ui-enter {
  animation: ui-slide-up var(--motion-slow) var(--ease-standard) both;
}

.animate-ui-stagger > *:nth-child(-n + 6) {
  animation: ui-slide-up var(--motion-normal) var(--ease-standard) both;
}

.animate-ui-stagger > *:nth-child(1) { animation-delay: 0ms; }
.animate-ui-stagger > *:nth-child(2) { animation-delay: 30ms; }
.animate-ui-stagger > *:nth-child(3) { animation-delay: 60ms; }
.animate-ui-stagger > *:nth-child(4) { animation-delay: 90ms; }
.animate-ui-stagger > *:nth-child(5) { animation-delay: 120ms; }
.animate-ui-stagger > *:nth-child(6) { animation-delay: 150ms; }
```

Keep the existing `@media (prefers-reduced-motion: reduce)` block unchanged so it zeroes these animations.

- [ ] **Step 4: Re-run test — expect PASS**

Run: `cd frontend && npm test -- --run src/shared/ui/reduced-motion.test.tsx`  
Expected: PASS

---

### Task 2: Animated `Dialog` with optional size

**Files:**
- Modify: `frontend/src/shared/ui/Dialog.tsx`
- Modify: `frontend/src/shared/ui/Dialog.test.tsx`

**Interfaces:**
- Consumes: `animate-ui-overlay`, `animate-ui-panel`, `animate-ui-overlay-out`, `animate-ui-panel-out`
- Produces: `DialogProps` gains optional `size?: 'lg' | 'xl'` (default `'lg'`); keeps `open`, `onClose`, `title`, `description?`, `dismissible?`, `closeLabel?`

- [ ] **Step 1: Add failing tests for size class and exit delay**

Append to `Dialog.test.tsx`:

```ts
  it('applies xl max width when size is xl', () => {
    render(
      <Dialog onClose={vi.fn()} open size="xl" title="Wide">
        <p>Body</p>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Wide' })).toHaveClass('max-w-xl');
  });

  it('keeps the dialog mounted until exit animation ends when closing', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog onClose={onClose} open title="Animated">
        <button type="button">Inside</button>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Animated' })).toBeInTheDocument();

    rerender(
      <Dialog onClose={onClose} open={false} title="Animated">
        <button type="button">Inside</button>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Animated' });
    expect(dialog).toBeInTheDocument();
    expect(dialog.className).toMatch(/animate-ui-panel-out|ui-scale-out/);

    // Simulate animationend on overlay/panel (implementation listens on panel or overlay)
    dialog.dispatchEvent(new Event('animationend', { bubbles: true }));
    expect(screen.queryByRole('dialog', { name: 'Animated' })).not.toBeInTheDocument();
  });
```

Adjust the exit assertion to match the class the implementation actually puts on the panel (`animate-ui-panel-out`).

- [ ] **Step 2: Run Dialog tests — expect FAIL**

Run: `cd frontend && npm test -- --run src/shared/ui/Dialog.test.tsx`  
Expected: FAIL — no `size` / no exit keep-alive

- [ ] **Step 3: Implement Dialog enter/exit + size**

Replace `Dialog` body with this pattern (preserve focus trap / Escape / return-focus logic from current file):

```tsx
export interface DialogProps extends PropsWithChildren {
  closeLabel?: string;
  description?: string;
  dismissible?: boolean;
  onClose: () => void;
  open: boolean;
  size?: 'lg' | 'xl';
  title: string;
}

const sizeClass = { lg: 'max-w-lg', xl: 'max-w-xl' } as const;

export function Dialog({
  children,
  closeLabel = 'Close dialog',
  description,
  dismissible = true,
  onClose,
  open,
  size = 'lg',
  title,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [present, setPresent] = useState(open);
  const [phase, setPhase] = useState<'in' | 'out'>(open ? 'in' : 'out');

  useEffect(() => {
    if (open) {
      setPresent(true);
      setPhase('in');
      return undefined;
    }
    if (present) setPhase('out');
    return undefined;
  }, [open, present]);

  useEffect(() => {
    if (!present || phase !== 'in') return undefined;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const elements = focusableElements(panel ?? document.body);
    (elements.find((el) => !el.hasAttribute('data-dialog-close')) ?? elements[0] ?? panel)?.focus();
    return () => returnFocusRef.current?.focus();
  }, [present, phase]);

  if (!present) return null;

  const overlayMotion = phase === 'in' ? 'animate-ui-overlay' : 'animate-ui-overlay-out';
  const panelMotion = phase === 'in' ? 'animate-ui-panel' : 'animate-ui-panel-out';

  return (
    <div
      className={`fixed inset-0 z-50 grid place-items-center bg-background/50 p-4 ${overlayMotion}`}
      role="presentation"
    >
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`w-full ${sizeClass[size]} rounded-ui-dialog border border-border bg-popover p-5 text-popover-foreground shadow-ui-overlay sm:p-6 ${panelMotion}`}
        onAnimationEnd={(event) => {
          if (phase === 'out' && event.target === event.currentTarget) {
            setPresent(false);
          }
        }}
        onKeyDown={(event) => {
          /* keep existing Escape + Tab trap; only call onClose when dismissible */
        }}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        {/* existing header + children */}
      </div>
    </div>
  );
}
```

Copy the existing header/children JSX and focus-trap `onKeyDown` from the current `Dialog.tsx` — do not drop a11y. When `phase === 'out'`, still call `onClose` only from user actions (Escape/X); unmount is driven by `open={false}` from parent after `onClose`, then exit animation, then `present=false`.

**Parent contract (unchanged):** parent sets `open={false}` after `onClose`. Dialog must animate out when `open` flips false while still mounted.

- [ ] **Step 4: Run Dialog tests — expect PASS**

Run: `cd frontend && npm test -- --run src/shared/ui/Dialog.test.tsx`  
Expected: PASS (including prior focus/Escape tests)

---

### Task 3: `FileDropzone` + `FileChip`

**Files:**
- Create: `frontend/src/features/knowledge/ui/FileDropzone.tsx`
- Create: `frontend/src/features/knowledge/ui/FileChip.tsx`
- Create: `frontend/src/features/knowledge/ui/FileDropzone.test.tsx`
- Modify: `frontend/public/assets/i18n/en.json`, `frontend/public/assets/i18n/vi.json`

**Interfaces:**
- Consumes: none (presentational)
- Produces:

```ts
export interface FileDropzoneProps {
  accept: string; // ".pdf,.md,.txt"
  disabled?: boolean;
  error?: string;
  file: File | undefined;
  hint: string;
  id: string;
  label: string;
  onClear: () => void;
  onFileChange: (file: File | undefined) => void;
  browseLabel: string;
  dropLabel: string;
  typesLabel: string; // e.g. "PDF · MD · TXT"
  clearLabel: string;
}
```

- [ ] **Step 1: Add i18n keys**

In `en.json` under `KNOWLEDGE`:

```json
"DROPZONE_TITLE": "Drop file here or browse",
"DROPZONE_BROWSE": "Browse files",
"DROPZONE_TYPES": "PDF, Markdown, or text · up to 50 MB",
"FILE_CHIP_CLEAR": "Remove file",
"UPLOAD_PROGRESS": "Uploading document…"
```

Mirror Vietnamese in `vi.json` (natural VI copy, same keys).

- [ ] **Step 2: Write failing FileDropzone tests**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FileDropzone } from './FileDropzone';

const baseProps = {
  accept: '.pdf,.md,.txt',
  browseLabel: 'Browse files',
  clearLabel: 'Remove file',
  dropLabel: 'Drop file here or browse',
  file: undefined as File | undefined,
  hint: '',
  id: 'knowledge-file',
  label: 'Document file',
  onClear: vi.fn(),
  onFileChange: vi.fn(),
  typesLabel: 'PDF, Markdown, or text · up to 50 MB',
};

describe('FileDropzone', () => {
  it('calls onFileChange when a file is chosen via the input', async () => {
    const onFileChange = vi.fn();
    const user = userEvent.setup();
    render(<FileDropzone {...baseProps} onFileChange={onFileChange} />);
    const file = new File(['hello'], 'guide.md', { type: 'text/markdown' });
    await user.upload(screen.getByLabelText('Document file'), file);
    expect(onFileChange).toHaveBeenCalledWith(file);
  });

  it('shows a removable chip when a file is selected', async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    const file = new File(['hello'], 'guide.md', { type: 'text/markdown' });
    render(<FileDropzone {...baseProps} file={file} onClear={onClear} />);
    expect(screen.getByText('guide.md')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run test — expect FAIL (module missing)**

Run: `cd frontend && npm test -- --run src/features/knowledge/ui/FileDropzone.test.tsx`  
Expected: FAIL — cannot resolve `./FileDropzone`

- [ ] **Step 4: Implement `FileChip` + `FileDropzone`**

`FileChip.tsx`:

```tsx
export function FileChip({
  clearLabel,
  disabled,
  name,
  onClear,
  sizeLabel,
}: {
  clearLabel: string;
  disabled?: boolean;
  name: string;
  onClear: () => void;
  sizeLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-ui-control border border-border bg-card px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{sizeLabel}</p>
      </div>
      <button
        aria-label={clearLabel}
        className="grid min-h-9 min-w-9 place-items-center rounded-ui-control text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        disabled={disabled}
        onClick={onClear}
        type="button"
      >
        {/* X icon from lucide-react */}
      </button>
    </div>
  );
}
```

`FileDropzone.tsx` (structure):

- Visually hidden or sr-only `<input type="file" id={id} accept={accept} />` labeled by `label`
- Clickable/drag region with `role="button"` or label wrapping; `onDragOver` preventDefault + `data-active` / class `border-primary` when dragging
- When `file` set → render `FileChip` instead of empty drop prompt
- Format size with a tiny helper: `${(bytes / 1024).toFixed(1)} KB` or MB when ≥ 1_048_576
- Show `error` with `text-destructive` + `id={`${id}-error`}` and `aria-invalid` on input
- `disabled` blocks input + drag

Keep under 450 lines; no API calls.

- [ ] **Step 5: Re-run FileDropzone tests — expect PASS**

Run: `cd frontend && npm test -- --run src/features/knowledge/ui/FileDropzone.test.tsx`  
Expected: PASS

---

### Task 4: Redesign `UploadDialog`

**Files:**
- Modify: `frontend/src/features/knowledge/ui/UploadDialog.tsx`
- Modify: `frontend/src/features/knowledge/ui/UploadDialog.test.tsx`
- Modify: `frontend/src/features/knowledge/pages/KnowledgeListPage.test.tsx` (only if selectors break)

**Interfaces:**
- Consumes: `FileDropzone`, `Dialog`, existing `createUploadDocumentSchema` / `UploadDocumentForm`
- Produces: same `UploadDialogProps` as today (`open`, `onClose`, `onSubmit`, `isSubmitting`, `error?`)

- [ ] **Step 1: Update UploadDialog tests for dropzone labels**

Keep submit/validation behavior. Change file selection to use label `Document file` (still) via `FileDropzone`. Add:

```ts
  it('renders dropzone helper copy', () => {
    render(
      <UploadDialog
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        open
      />,
    );
    expect(screen.getByText(/PDF, Markdown, or text/i)).toBeInTheDocument();
  });
```

Wrap with i18n test harness the same way existing `UploadDialog.test.tsx` does.

- [ ] **Step 2: Run UploadDialog tests — expect FAIL on helper copy**

Run: `cd frontend && npm test -- --run src/features/knowledge/ui/UploadDialog.test.tsx`  
Expected: FAIL until UI wired

- [ ] **Step 3: Rewrite UploadDialog JSX to Dropzone Composer**

- Replace native `<input type="file">` block with:

```tsx
<Controller
  control={control}
  name="file"
  render={({ field: { onChange, value } }) => (
    <FileDropzone
      accept=".pdf,.md,.txt"
      browseLabel={t('KNOWLEDGE.DROPZONE_BROWSE')}
      clearLabel={t('KNOWLEDGE.FILE_CHIP_CLEAR')}
      disabled={isSubmitting}
      dropLabel={t('KNOWLEDGE.DROPZONE_TITLE')}
      error={errors.file?.message}
      file={value}
      id="knowledge-file"
      label={t('KNOWLEDGE.DOCUMENT_FILE_LABEL')}
      onClear={() => {
        onChange(undefined);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }}
      onFileChange={(file) => {
        onChange(file);
        if (file && !getValues('title')) {
          setValue('title', file.name.replace(/\.[^.]+$/, ''), { shouldValidate: true });
        }
      }}
      typesLabel={t('KNOWLEDGE.DROPZONE_TYPES')}
    />
  )}
/>
```

If `FileDropzone` owns the input ref internally, drop `fileInputRef` from UploadDialog and reset via `onClear` + RHF `reset()`.

- Keep Title + Description `Input`s and footer Cancel / Upload
- When `isSubmitting`, show muted progress text under footer using `t('KNOWLEDGE.UPLOAD_PROGRESS')` (optional thin progress bar with `aria-hidden` indeterminate CSS)
- `Dialog` title/description unchanged keys

- [ ] **Step 4: Run UploadDialog + KnowledgeListPage upload tests — expect PASS**

Run:

```bash
cd frontend && npm test -- --run \
  src/features/knowledge/ui/UploadDialog.test.tsx \
  src/features/knowledge/pages/KnowledgeListPage.test.tsx
```

Expected: PASS

---

### Task 5: Redesign `TextInputDialog`

**Files:**
- Modify: `frontend/src/features/knowledge/ui/TextInputDialog.tsx`
- Modify: `frontend/src/features/knowledge/ui/TextInputDialog.test.tsx`

**Interfaces:**
- Consumes: `Dialog` (default size)
- Produces: same props as today

- [ ] **Step 1: Assert content surface class in test**

```ts
  it('renders an intentional content editor surface', () => {
    render(
      <TextInputDialog isSubmitting={false} onClose={vi.fn()} onSubmit={vi.fn()} open />,
    );
    const area = screen.getByLabelText(/content/i); // or getByRole with name from i18n
    expect(area).toHaveClass('min-h-44', 'rounded-ui-control', 'border-input');
  });
```

Align selector with existing i18n harness labels.

- [ ] **Step 2: Run test — expect FAIL if class list differs**

- [ ] **Step 3: Update markup**

- Same header/footer rhythm as Upload (`grid gap-5`, footer `flex justify-end gap-3`)
- Description field can use optional hint muted copy if desired (no required schema change)
- Textarea classes:

```tsx
className="min-h-44 w-full resize-y rounded-ui-control border border-input bg-card px-3 py-3 text-foreground shadow-none transition-colors duration-200 placeholder:text-muted-foreground hover:border-ui-line-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 motion-reduce:transition-none"
```

- [ ] **Step 4: Re-run TextInputDialog tests — expect PASS**

Run: `cd frontend && npm test -- --run src/features/knowledge/ui/TextInputDialog.test.tsx`  
Expected: PASS

---

### Task 6: Redesign `DocumentDetailPanel`

**Files:**
- Modify: `frontend/src/features/knowledge/ui/DocumentDetailPanel.tsx`
- Modify: `frontend/src/features/knowledge/ui/DocumentDetailPanel.test.tsx`

**Interfaces:**
- Consumes: `Dialog` with `size="xl"`
- Produces: same props as today

- [ ] **Step 1: Update test to expect dialog + status + footer actions**

Keep existing retry/delete coverage. Add:

```ts
  expect(screen.getByRole('dialog')).toHaveClass('max-w-xl');
```

(Only if `size="xl"` is applied on the dialog panel.)

- [ ] **Step 2: Run — expect FAIL without size**

- [ ] **Step 3: Restructure panel content**

```tsx
<Dialog
  closeLabel={t('SHELL.CLOSE_DIALOG')}
  onClose={onClose}
  open={open}
  size="xl"
  title={document?.title ?? t('KNOWLEDGE.DOCUMENT_DETAILS')}
>
  {/* loading / error unchanged */}
  {document ? (
    <div className="grid max-h-[70vh] gap-5 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-4">
        <StatusBadge status={document.status} />
        <span className="text-sm text-muted-foreground">
          {document.file_name || t('KNOWLEDGE.MANUAL_TEXT')}
        </span>
      </div>
      {document.description ? (
        <p className="text-sm text-muted-foreground">{document.description}</p>
      ) : null}
      <IngestionProgress document={document} />
      {/* error_message + content_text blocks unchanged semantics */}
      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        {/* Retry + Delete unchanged */}
      </div>
    </div>
  ) : null}
</Dialog>
```

Use token classes (`text-foreground` / `text-muted-foreground` / `border-border`) instead of leftover `ui-ink*` if still present.

- [ ] **Step 4: Re-run DocumentDetailPanel tests — expect PASS**

Run: `cd frontend && npm test -- --run src/features/knowledge/ui/DocumentDetailPanel.test.tsx`  
Expected: PASS

---

### Task 7: Shell + Knowledge micro-motion

**Files:**
- Modify: `frontend/src/app/layout/AdminSidebar.tsx` (active NavLink classes)
- Modify: `frontend/src/features/knowledge/pages/KnowledgeListPage.tsx`
- Modify: `frontend/src/features/knowledge/ui/DocumentGrid.tsx` and/or `DocumentTable.tsx`
- Modify tests only if class assertions break (`AdminSidebar.test.tsx`, list page tests)

**Interfaces:**
- Consumes: `animate-ui-enter`, `animate-ui-stagger`
- Produces: no new public APIs

- [ ] **Step 1: Add/adjust a lightweight shell test expectation**

In `AdminSidebar.test.tsx`, assert active link includes transition utility, e.g. `transition-colors` (already likely present) — if missing, add:

```ts
expect(activeLink.className).toMatch(/transition-colors/);
```

- [ ] **Step 2: Apply motion classes**

- Rail `NavLink`: ensure `transition-colors duration-150` / `motion-reduce:transition-none` on icon button; active indicator uses `bg-primary` without glow
- Tooltip portal: if CSS-based, add `animate-ui-overlay` or short opacity transition on show
- `KnowledgeListPage`: wrap main column / page body with `className="… animate-ui-enter"`
- `DocumentGrid` list container: add `animate-ui-stagger` on the grid of cards when not loading
- `DocumentTable` `tbody`: add `animate-ui-stagger` on rows when not loading

Do **not** animate skeletons or empty states.

- [ ] **Step 3: Run affected layout + knowledge tests**

```bash
cd frontend && npm test -- --run \
  src/app/layout/AdminSidebar.test.tsx \
  src/app/layout/AppShell.test.tsx \
  src/features/knowledge/pages/KnowledgeListPage.test.tsx \
  src/features/knowledge/ui/DocumentGrid.tsx \
  src/features/knowledge/ui/DocumentTable.test.tsx
```

Fix `DocumentGrid` path to `DocumentGrid.test.tsx` if that file exists; otherwise skip.  
Expected: PASS

---

### Task 8: Full verification

**Files:** none new

- [ ] **Step 1: Run focused suite**

```bash
cd frontend && npm test -- --run \
  src/shared/ui/Dialog.test.tsx \
  src/shared/ui/reduced-motion.test.tsx \
  src/features/knowledge/ui/FileDropzone.test.tsx \
  src/features/knowledge/ui/UploadDialog.test.tsx \
  src/features/knowledge/ui/TextInputDialog.test.tsx \
  src/features/knowledge/ui/DocumentDetailPanel.test.tsx \
  src/features/knowledge/pages/KnowledgeListPage.test.tsx
```

Expected: all PASS

- [ ] **Step 2: Manual smoke (dev server)**

1. Open Knowledge → Upload → drag + browse + clear chip + submit  
2. Add text → save  
3. Open detail → retry/delete affordances  
4. Toggle OS reduced-motion (or DevTools) → dialogs open/close instantly  
5. Confirm rail hover/active still crisp, no glow

- [ ] **Step 3: Commit only if the user asks**

Do not commit in this task unless explicitly requested.

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Motion tokens / keyframes / reduced-motion | Task 1 |
| Dialog enter/exit + optional size | Task 2 |
| Dropzone + file chip Upload UX | Tasks 3–4 |
| TextInputDialog family + content surface | Task 5 |
| DocumentDetailPanel product-sheet + xl | Task 6 |
| Shell + Knowledge micro-motion | Task 7 |
| Single-file API / no Framer / tests | Tasks 4, 8 |
| Superdesign Dropzone Composer structural match | Tasks 3–6 |

## Placeholder / consistency notes

- Reuse `--motion-*` names from `styles.css` (not invent `--duration-*`).
- `FileDropzoneProps.onFileChange` / `onClear` naming is consistent across Tasks 3–4.
- Dialog `size: 'lg' | 'xl'` is the only Dialog API addition.
