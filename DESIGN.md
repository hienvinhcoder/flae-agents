# FLAE Design System v3 — Linear-tight

> Approved direction: Clean Enterprise · Hybrid shell · Light default · Orange primary · Dark available.
> Replaces the previous glass/umber aesthetic. No heavy glass, glow, or orange gradients.

## Product context

FLAE is an **AI Company Memory** workspace. Users connect sources (Drive, Notion, Slack, GitHub), browse/ingest knowledge, chat with agents, and explore topics/graph. Primary jobs: find trusted company context fast, manage knowledge ingestion, run agents.

Key surfaces: Chat · Agents · Knowledge (library + graph) · Topics · Settings.
Auth: login/register. Shell wraps all `/dashboard/*` routes.

## Visual direction

- **Inspiration:** Linear / Notion workspace — calm, precise, high information clarity.
- **Density:** Comfortable (not ops-dense). Generous page padding, tight control chrome.
- **Surfaces:** Flat or 1px borders. Minimal shadows (dialogs/dropdowns only).
- **Accent usage:** Orange ONLY for primary CTA, focus rings, active nav, critical links. Neutrals do the rest.
- **Forbidden:** Purple/indigo themes, cream+terracotta editorial look, glassmorphism stacks, neon glow, serif display fonts, emoji as brand marks.

## Color tokens

### Brand / primary (orange)

| Token                  | Light     | Dark      | Usage                                 |
| ---------------------- | --------- | --------- | ------------------------------------- |
| `--primary`            | `#EA580C` | `#F97316` | CTA fill, active rail icon, key links |
| `--primary-foreground` | `#FFFFFF` | `#0C0A09` | Text on primary                       |
| `--primary-hover`      | `#C2410C` | `#FB923C` | Hover CTA                             |
| `--ring`               | `#EA580C` | `#F97316` | Focus ring 2px                        |

### Light mode (default)

| Token                    | Value     | Role                 |
| ------------------------ | --------- | -------------------- |
| `--background`           | `#FAFAF9` | App canvas           |
| `--foreground`           | `#1C1917` | Primary text         |
| `--muted`                | `#F5F5F4` | Subtle fills         |
| `--muted-foreground`     | `#78716C` | Secondary text       |
| `--card` / `--popover`   | `#FFFFFF` | Panels, menus        |
| `--border`               | `#E7E5E4` | Hairlines            |
| `--input`                | `#E7E5E4` | Input borders        |
| `--secondary`            | `#F5F5F4` | Secondary button bg  |
| `--secondary-foreground` | `#1C1917` |                      |
| `--accent`               | `#F5F5F4` | Hover rows           |
| `--destructive`          | `#DC2626` | Danger               |
| `--success`              | `#16A34A` | Success / indexed    |
| `--warning`              | `#D97706` | Warning / processing |

### Dark mode

| Token                    | Value     | Role             |
| ------------------------ | --------- | ---------------- |
| `--background`           | `#0C0A09` | App canvas       |
| `--foreground`           | `#FAFAF9` | Primary text     |
| `--muted`                | `#1C1917` | Subtle fills     |
| `--muted-foreground`     | `#A8A29E` | Secondary text   |
| `--card` / `--popover`   | `#1C1917` | Panels           |
| `--border`               | `#292524` | Hairlines        |
| `--input`                | `#292524` | Input borders    |
| `--secondary`            | `#1C1917` | Secondary button |
| `--secondary-foreground` | `#FAFAF9` |                  |
| `--accent`               | `#292524` | Hover rows       |
| `--destructive`          | `#F87171` | Danger           |
| `--success`              | `#4ADE80` | Success          |
| `--warning`              | `#FBBF24` | Warning          |

Rail/top-bar: same family as canvas; optional 1px `--border` separators. Do **not** use orange tinted backgrounds for chrome.

## Typography

| Role                 | Family             | Weight          | Notes                                      |
| -------------------- | ------------------ | --------------- | ------------------------------------------ |
| UI / body            | **Inter**          | 400 / 500 / 600 | Default everywhere                         |
| Display / page title | **Inter**          | 600             | Tracking -0.01em; no second display family |
| Mono                 | **JetBrains Mono** | 400 / 500       | IDs, hashes, code, tabular counts          |

Scale (approx): 12 muted · 13/14 body · 14/16 controls · 18/20 section · 24 page title.

## Spacing & radius

- Base unit: **4px**
- Page padding: `24px` (desktop), `16px` (mobile)
- Section gap: `24px`
- Control height: `36px` (compact) / `40px` (default)
- Rail width: **56px** collapsed (icons only); expanded optional later at 220px
- Top bar height: **52–56px**
- Radius: control **6** · panel/card **8** · dialog **12** · pill **9999** (status chips only)

## Elevation

- Default: none (border only)
- Dropdown / popover: `0 4px 16px rgba(0,0,0,0.08)` light · `0 4px 16px rgba(0,0,0,0.4)` dark
- Dialog: slightly stronger; no multi-layer colored shadows

## Motion

- Duration: 150ms controls · 200ms panels
- Easing: `cubic-bezier(0.2, 0, 0, 1)`
- Respect `prefers-reduced-motion`

## Layout structure — Hybrid shell

```
┌─────────────────────────────────────────────────────┐
│ Top bar: Logo | Workspace ▾ | spacer | Theme | User │
├────┬────────────────────────────────────────────────┤
│Rail│  Main content                                   │
│ ●  │  Page header (title + actions)                  │
│ ●  │  Toolbar / filters                              │
│ ●  │  Content (table/list preferred)                 │
│ ●  │                                                 │
└────┴────────────────────────────────────────────────┘
```

- **Top bar:** FLAE wordmark/mark · workspace switcher · (optional) command hint · theme toggle L/D · profile menu. Primary “Upload” / “Add source” lives in page actions, not chrome clutter.
- **Icon rail:** Chat · Agents · Knowledge · Topics · Settings. Active = orange icon + soft neutral pill behind icon (not orange fill bar). Tooltips on hover.
- **Main:** Full width; avoid nested cards. One primary panel border when grouping lists.
- **Mobile:** Top bar + hamburger; rail becomes bottom sheet or drawer.

## Components (rules)

### Button

- `primary`: orange fill, white text, hover darker/lighter by mode
- `secondary`: bordered / muted fill
- `ghost`: transparent, muted text
- `danger`: destructive
- Loading: spinner + disabled; min-height preserved

### Input / Select

- White/card fill, 1px border, focus ring orange 2px
- Label above, 13–14px semibold; error text destructive below

### Page header

- Eyebrow optional muted · Title 24/600 · Description one line muted · Actions right-aligned

### Table / list (Knowledge default)

- Header row muted · row hover accent · status badges (success/warning/muted/destructive soft chips)
- Prefer list/table over card grid as default view

### Badge / status

- Soft background + matching text; pill radius; no neon

### Dialog

- Centered, max-w-lg, card surface, border, overlay 40–50% black

### Empty / error

- Centered, muted icon, title + short copy + single primary action

## Theme behavior

- Default: **light**
- Persist user choice; offer System later if needed
- Toggle in top bar (Sun/Moon)
- All tokens switch via `.dark` / `data-theme="dark"` on root — no hardcoded light-only colors in components

## Content tone for mockups

Use realistic FLAE copy: workspace names, document titles (policies, Notion exports, Slack digests), ingestion statuses (pending / processing / ready / failed), agent names. Vietnamese or English UI labels OK; keep consistent within a draft.

## Fidelity constraint (always append to generation prompts)

Use ONLY the fonts, colors, spacing, and component styles defined in this design system. Do not introduce any fonts, colors, or visual styles not in the design system. No glassmorphism, no purple, no serif display, no orange gradients.
