# FLAE React Design System

This document is the source of truth for the React SPA redesign. The direction is a dark, technical AI command center: quiet graphite surfaces, dense but readable information, and restrained color that makes system state and primary actions immediately legible.

## 1. Principles

1. **Operational clarity:** hierarchy, status, and next action must be understandable at a glance.
2. **Calm density:** favor compact, aligned information over oversized cards or decorative whitespace.
3. **Purposeful color:** neutrals carry structure; orange marks primary actions; purple marks AI output; semantic colors communicate state only.
4. **Progressive detail:** show the task summary first and reveal logs, metadata, or advanced controls on demand.
5. **Accessible by default:** semantic HTML, keyboard operation, visible focus, reduced motion, and WCAG 2.2 AA contrast are release requirements.

Use roughly 85% neutral surfaces, 10% text and borders, and no more than 5% brand or semantic accents. Avoid full-page orange, persistent glow, glass effects that reduce contrast, and neon cyberpunk decoration.

## 2. Color system

### Immutable brand palette

These variables are immutable. They must appear exactly in `frontend-react/src/styles.css`; React and TypeScript source must reference the variables or mapped Tailwind utilities instead of repeating the literals.

```css
:root {
  --color-primary: #f28c45;
  --color-primary-hover: #e77e37;
  --color-primary-active: #d96f26;
  --color-primary-soft: rgba(242, 140, 69, 0.1);
}
```

Primary controls use `--color-on-primary: #251309`, not white. It provides 7.32:1 contrast on the immutable primary color.

### Neutral palette

| Token | Value | Required use |
| --- | --- | --- |
| `--color-canvas` | `#0d0f12` | App shell and page background |
| `--color-surface` | `#15181d` | Navigation, cards, primary panels |
| `--color-surface-raised` | `#1c2026` | Menus, dialogs, inspectors |
| `--color-surface-interactive` | `#252a32` | Hovered rows and selected wells |
| `--color-divider` | `#303640` | Decorative separators only; never a control, state, or selection boundary |
| `--color-border` | `#697584` | Default control and panel boundaries; at least 3.08:1 on supported surfaces |
| `--color-border-strong` | `#7e8b9d` | Selected and emphasized boundaries; at least 4.72:1 on raised surfaces |
| `--color-text` | `#f4f2ee` | Headings and essential values |
| `--color-text-secondary` | `#c5c7cb` | Body copy and labels |
| `--color-text-muted` | `#969ba4` | Metadata and helper text |
| `--color-text-disabled` | `#686e78` | Disabled content only |

The divider token may separate already-distinct content regions, but it must not be the only visual indication of a control, selection, focus, error, or state. Do not communicate state through muted or disabled colors alone. Disabled controls also require native `disabled` or `aria-disabled` semantics.

### Semantic and AI states

| Meaning | Solid token and value | Soft token and value | Use |
| --- | --- | --- | --- |
| AI | `--color-ai: #ad91ff` | `--color-ai-soft: rgba(173, 145, 255, 0.12)` | Generated insight, agent reasoning, AI affordance |
| Success | `--color-success: #64d892` | `--color-success-soft: rgba(100, 216, 146, 0.12)` | Connected, healthy, complete |
| Warning | `--color-warning: #efbd62` | `--color-warning-soft: rgba(239, 189, 98, 0.12)` | Pending, stale, degraded |
| Danger | `--color-danger: #f07b7d` | `--color-danger-soft: rgba(240, 123, 125, 0.12)` | Error, failure, destructive action |
| Info | `--color-info: #75adf7` | `--color-info-soft: rgba(117, 173, 247, 0.12)` | Neutral notice or guidance |

Every status combines color with text, an icon, or both. Soft colors are backgrounds only; use the corresponding solid token for icons and indicators.

## 3. Typography

- UI: `Inter, Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Technical data: `"Geist Mono", "JetBrains Mono", "SFMono-Regular", Consolas, monospace`.
- Use mono only for code, IDs, hashes, paths, timestamps, environment names, and machine output.

| Role | Size / line height | Weight | Notes |
| --- | --- | --- | --- |
| Page title | `1.75rem / 2.1rem` | 700 | One per page; tight tracking |
| Section title | `1.125rem / 1.5rem` | 650 | Panel or workflow heading |
| Card title | `0.875rem / 1.25rem` | 650 | Compact information blocks |
| Body | `0.875rem / 1.375rem` | 400 | Default UI copy |
| Small | `0.75rem / 1.125rem` | 400 | Secondary detail |
| Label | `0.6875rem / 1rem` | 650 | Uppercase only for short group labels |

Body text must not drop below `0.875rem`; `0.75rem` is reserved for metadata. Keep readable text lines between 45 and 80 characters.

## 4. Spacing, shape, and depth

Spacing uses a four-pixel base. Only use the token scale: `--space-1` (4), `--space-2` (8), `--space-3` (12), `--space-4` (16), `--space-5` (20), `--space-6` (24), `--space-8` (32), `--space-10` (40), `--space-12` (48), and `--space-16` (64 pixels).

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | `4px` | Badges and compact indicators |
| `--radius-md` | `8px` | Inputs and buttons |
| `--radius-lg` | `12px` | Panels and cards |
| `--radius-xl` | `16px` | Dialogs and major overlays |
| `--radius-pill` | `999px` | Status pills only |
| `--shadow-panel` | `0 1px 0 rgba(255, 255, 255, 0.035), 0 16px 48px rgba(0, 0, 0, 0.28)` | Floating panels on canvas |
| `--shadow-overlay` | `0 24px 80px rgba(0, 0, 0, 0.48)` | Dialogs and command palette |
| `--focus-ring` | `0 0 0 3px rgba(242, 140, 69, 0.34)` | Additional focus separation around the 2px outline |

Hierarchy comes from surface, border, and spacing before shadow. Never stack shadows or add decorative glow.

## 5. Responsive layout

The shell is mobile-first with breakpoints at `sm 40rem`, `md 48rem`, `lg 64rem`, and `xl 80rem`.

- Below `md`, navigation becomes an overlay and detail inspectors become full-width sheets.
- From `md`, use a navigation/content split when it improves wayfinding.
- From `lg`, an optional inspector may form a third column; primary content remains at least 32rem wide.
- At `xl`, cap reading content near 90rem and use extra width for context, not stretched copy.
- Tables must preserve headers and meaning: allow horizontal scroll or switch to labeled rows. Never hide essential fields solely to fit width.
- Page padding is 16px below `md`, 24px from `md`, and 32px from `xl`.

## 6. Component token contracts

Shared UI primitives own their state styling. Feature code selects a supported variant and must not restyle primitive internals.

| Component | Token contract |
| --- | --- |
| Primary button | Primary, hover, active, on-primary, `--radius-md`, visible focus ring |
| Secondary button | Raised surface, strong border, text; interactive surface on hover |
| Destructive button | Danger and danger-soft; requires explicit action text |
| Input/select | Raised surface, border, text, muted placeholder; strong border on hover; focus ring on focus |
| Panel/card | Surface, border, `--radius-lg`; shadow only when visually detached |
| Navigation item | Transparent default; interactive surface hover; primary-soft selected state |
| Status badge | Semantic soft background plus solid icon/text and a written status |
| AI response | AI-soft container or AI indicator; body text remains standard text color |
| Dialog | Raised surface, `--radius-xl`, overlay shadow, labelled title and managed focus |
| Data row | Canvas/surface default and interactive hover; selection must remain visible without hover |

Tailwind 4 mappings in `styles.css` expose the complete component contract: brand colors and foreground, neutral surfaces/boundaries/text including disabled text, AI and semantic solid/soft colors, UI/code fonts, control/panel/dialog/status radii, and panel/overlay/focus shadows. Representative utilities include `bg-brand`, `text-brand-foreground`, `bg-ui-panel`, `border-ui-line`, `text-ui-ink-disabled`, `bg-accent-ai-soft`, `bg-state-danger-soft`, `rounded-ui-dialog`, and `shadow-ui-focus`. Prefer these utilities. Custom CSS is allowed only for reusable recipes, third-party integration, or behavior Tailwind cannot express clearly.

Application source must not repeat brand hex literals outside `frontend-react/src/styles.css`; the immutable contract block in this document is the documentation exception. Feature code must never create a local substitute for a global token.

## 7. Interaction, focus, and motion

- All interactive elements use native elements where available and have a visible hover, active, disabled, and focus-visible state.
- Focus uses a 2px primary outline, 3px offset, and `--focus-ring`; never remove focus without an equivalent replacement.
- Minimum pointer target is 44 by 44 pixels where space permits and never below 36 by 36 pixels for dense desktop controls.
- Motion durations are `--motion-fast` (120ms), `--motion-normal` (180ms), and `--motion-slow` (280ms) with `--ease-standard`.
- Animate opacity and transform for orientation or continuity, not decoration. Avoid layout-shifting transitions.
- Under `prefers-reduced-motion: reduce`, transitions and animations become effectively immediate and smooth scrolling is disabled.
- Loading operations expose text or `aria-live` state; do not rely on animation alone.

## 8. Accessibility release gate

- Text and essential icons meet WCAG 2.2 AA: 4.5:1 for normal text and 3:1 for large text and UI boundaries.
- Every control has an accessible name; every input has a programmatic label and associated error message.
- Keyboard users can reach, operate, and leave every interactive region in a logical order. No keyboard traps except managed modal focus.
- Landmarks, headings, lists, tables, and buttons use semantic HTML before ARIA.
- Dynamic success and error feedback is announced without moving focus unexpectedly.
- Zoom at 200% and layouts down to 320px remain usable without loss of content or function.
- Automated accessibility checks support but do not replace keyboard, focus, zoom, and screen-reader smoke testing.

Any exception to this system requires an explicit design review and an update to this document or the shared token layer; one-off overrides are not accepted.
