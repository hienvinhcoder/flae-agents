# Knowledge Modals + App Motion — Design Spec

**Date:** 2026-09-22  
**Status:** Direction locked (Dropzone Composer); awaiting user review before implementation plan  
**Related:** `docs/superpowers/specs/2026-09-22-flae-ui-redesign-design.md` (Linear-tight tokens)

## Goal

Redesign the three Knowledge modals (Upload, Add text, Document detail) with a cohesive Linear Dropzone Composer UX, and add light app-wide CSS motion so FLAE feels smoother. Stay on Linear-tight Clean Enterprise (orange primary, light default + dark, flat surfaces). No business-logic or API changes (single-file upload remains).

## Decisions (locked)

| Topic | Choice |
|---|---|
| Modals in scope | UploadDialog, TextInputDialog, DocumentDetailPanel |
| Visual / UX direction | **Linear Dropzone Composer** (Superdesign Candidate A) |
| Rejected | Light polish-only; Stepper Ingest (Candidate B) |
| Motion scope | App-wide light: shared Dialog + Knowledge list/grid + shell micro-motion |
| Motion tech | CSS tokens + keyframes only — no Framer Motion |
| Upload API | Single-file submit (PDF / MD / TXT); UI may show type chips |
| Reduced motion | Honor `prefers-reduced-motion` (existing repo pattern) |

## Architecture

```
styles.css (motion tokens + keyframes + utilities)
        ↓
shared/ui/Dialog (enter / exit / overlay; optional size)
        ↓
UploadDialog | TextInputDialog | DocumentDetailPanel
        ↓
KnowledgeListPage (same mutate APIs)

Shell (AdminSidebar / AppShell) + Knowledge list/grid
  → utility classes only (no new motion library)
```

Optional small presentational pieces under `features/knowledge/ui/` (e.g. dropzone, file chip) — keep presentational; forms still use RHF + Zod.

### Motion tokens

Add to `frontend/src/styles.css` (align with existing `--ease-standard` if present):

| Token | Intent |
|---|---|
| `--duration-fast` | ~150ms — hover, rail indicator |
| `--duration-normal` | ~220ms — dialog enter, row appear |
| `--duration-slow` | ~320ms — dialog exit / page enter |
| `--ease-standard` | shared easing curve |

Keyframes / utilities:

- `ui-fade-in` / `animate-ui-overlay` — backdrop
- `ui-scale-in` / `animate-ui-panel` — dialog panel (~0.96 → 1) or subtle rise (~8px)
- `ui-slide-up` / `animate-ui-enter` — page main / list rows (very subtle)
- Optional short stagger on first ≤4–6 Knowledge rows/cards only
- All animations disabled or near-instant under `prefers-reduced-motion`

### Shared `Dialog`

- Keep a11y: focus trap, Escape, return focus, `aria-modal`, labelled title
- Enter: overlay fade + panel scale/rise
- Exit: reverse briefly, then unmount
- Submitting / non-dismissible: block Escape, overlay dismiss, close button
- Optional `size`: default `lg` (`max-w-lg`); detail may use `xl` (`max-w-xl`)

### App-wide micro-motion (light)

| Surface | Motion |
|---|---|
| Dialog overlay/panel | Fade + scale/rise enter/exit |
| Icon rail active item | Color / indicator transition (`duration-fast`) |
| Rail tooltip | Fade in |
| Knowledge main | One-shot `ui-enter` on mount |
| Document grid/table | Subtle appear for first few items; no infinite badge pulse |
| Buttons / controls | Existing hover transitions only |

Forbidden: glow, purple gradients, glass stacks, perpetual decorative loops, motion that conveys meaning without a text/ARIA equivalent.

## Modal UX — Linear Dropzone Composer

Shared rules: dialog radius 12px; consistent form rhythm; footer Cancel secondary + primary CTA right-aligned; loading locks dismiss; Inter + Linear-tight tokens; orange only on primary CTA and focus.

Reference draft: [Linear Dropzone Composer](https://p.superdesign.dev/draft/d28ee3de-2af4-48fd-95b9-dd79a4a2b531)

### UploadDialog

- **Hero dropzone:** drag-drop + browse; dashed border → solid / orange accent on drag-over; icon + short copy; type chips (PDF, MD, TXT)
- **Selected file:** removable file chip (name + size); clearing resets file input
- **Fields:** Title (required), Description (optional)
- **Uploading:** progress affordance in footer / under CTA; dismiss locked
- **Validation:** existing Zod rules (type, max size, title); helper copy via i18n
- **API:** still one `File` per submit

### TextInputDialog

- Same dialog family (chrome, spacing, footer language) as Upload
- Title required; description optional/secondary
- Content: intentional editor surface (padding, border, focus ring) — not a naked default textarea
- Footer: Cancel + Save

### DocumentDetailPanel

- Product-sheet hierarchy: identity (title) + status badge, file meta, description, ingestion progress, content preview
- Footer: Retry (when failed) + Delete danger; close via Dialog chrome
- Loading skeleton / ErrorState without hard layout jump
- Width: `max-w-xl` when needed

## Error handling

- Mutation failure: dialog stays open; `role="alert"` shows error
- Success: reset form (upload/text) → close after exit animation
- Detail load error: ErrorState inside panel (unchanged semantics)
- Dropzone: invalid type/size surfaced as field error (same schema), not silent ignore

## Testing

- Dialog: open/close, Escape, focus return, reduced-motion, exit before unmount
- Upload: dropzone select/browse, clear file chip, drag-over state (where testable), validation, submit, submitting locks dismiss
- Text / Detail: behavior tests updated for new markup
- CSS: reduced-motion contract (extend `reduced-motion.test.tsx` if needed)
- No API/schema semantic changes unless new i18n keys

## Out of scope

- Multi-file / batch upload API
- Stepper Ingest flow (Candidate B)
- Framer Motion / new animation libraries
- Knowledge page shell redesign, backend, Knowledge Graph overhaul
- Pixel-perfect Superdesign parity (structural match)

## Superdesign

| | |
|---|---|
| Project | [FLAE Knowledge Modals + Motion](https://superdesign.dev/teams/291fdf76-26fa-4795-b5a9-a63662d032ac/projects/32ddb001-9adc-4eaa-96c2-939818038c80?live=1) |
| **Active (locked)** | [Linear Dropzone Composer](https://p.superdesign.dev/draft/d28ee3de-2af4-48fd-95b9-dd79a4a2b531) |
| Baseline | [Early reproduce/refine](https://p.superdesign.dev/draft/54e24ba4-a6a7-447a-861c-1fd2f27c26b3) |
| Not chosen | [Stepper Ingest](https://p.superdesign.dev/draft/e007874e-916c-469a-b9eb-647a5ed3877e) |
| Resume key | `.superdesign/resume.json` → `/dashboard/knowledge/modals` |

## Success criteria

1. Upload uses a clear dropzone + file chip UX; Add text and Detail share the same dialog family.
2. Opening/closing modals feels smooth; reduced-motion users get instant open/close.
3. Shell + Knowledge show light motion without distraction or infinite loops.
4. Existing upload/manual/detail flows and tests still pass; single-file API unchanged.
