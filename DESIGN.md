# FLAE Design System

FLAE is an AI Company Memory platform. The design system is warm, editorial, and confident — a workspace that feels human but built for machines. It pairs a signature orange with a soft parchment neutral to communicate warmth, clarity, and trust.

---

## 1. Brand Principles

- **Warm intelligence** — technology that feels alive, not sterile. Orange leads, neutrals ground.
- **Living knowledge** — surfaces suggest motion: graphs, streams, connections.
- **Signal over noise** — dense information, generous spacing, one accent at a time.
- **Human + agent** — legible for people, structured for LLMs (clear hierarchy, semantic tokens).

---

## 2. Color

All colors are declared as `oklch` CSS variables in `src/styles.css` and exposed as Tailwind utilities via `@theme inline`. Never hardcode hex or `text-white` / `bg-black` in components — always use semantic tokens.

### Core palette

| Token | Hex reference | Role |
|---|---|---|
| `--primary` | `#F97316` | FLAE orange — CTAs, active state, highlights, focus rings |
| `--primary-foreground` | `#FFFBF5` | Text on orange |
| `--primary-soft` | `#FCE1C7` | Tints, badges, hover backgrounds |
| `--secondary` | `#EAE6DB` | Parchment — cards, panels, muted surfaces |
| `--background` | `#FAF8F3` | App canvas |
| `--foreground` | `#1F1B15` | Primary text |
| `--muted` | `#F1EDE3` | Subtle backgrounds |
| `--muted-foreground` | `#6E6558` | Secondary text, meta |
| `--border` | `#E4DFD1` | Hairlines, dividers |
| `--sidebar` | `#2A241C` | Dark rail nav |
| `--sidebar-foreground` | `#EAE6DB` | Sidebar text |
| `--destructive` | `oklch(0.577 0.245 27)` | Errors, risks |

### Usage rules

- **One accent per view.** Orange is reserved for the primary action and the single most important status per section.
- **Neutrals do the heavy lifting.** Parchment + off-white surfaces layer with 1px borders instead of shadows.
- **Never combine orange with red** except in destructive confirmation flows.
- **Dark surfaces** (sidebar, inverse cards) use the sidebar token family, not `bg-black`.

### Semantic status

| Meaning | Token |
|---|---|
| Success / synced | `chart-2` (teal-green) |
| Warning / stale | `chart-4` (amber) |
| Risk / error | `destructive` |
| Info / neutral | `muted-foreground` |

---

## 3. Typography

**Display / headings:** Inter (or system-ui fallback), tight tracking, medium-to-semibold weight. Never bold + uppercase together.
**Body:** Inter, 15–16px base, 1.55 line-height.
**Mono (data, IDs, MCP payloads):** JetBrains Mono or ui-monospace.

### Scale

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Display (hero) | 44–56px | 600 | -0.02em |
| H1 | 32px | 600 | -0.015em |
| H2 | 24px | 600 | -0.01em |
| H3 | 18px | 600 | 0 |
| Body | 15px | 400 | 0 |
| Small / meta | 13px | 500 | 0 |
| Label / eyebrow | 12px | 600 uppercase | 0.08em |

---

## 4. Spacing & Layout

- **4px base grid.** Common steps: 4, 8, 12, 16, 24, 32, 48, 64.
- **Content max-width:** 1280px. Sidebar 240–260px. Right rail (context) 320px.
- **Card padding:** 20–24px. Section spacing: 48–64px vertical.
- **Density:** dashboard tables use 12px row padding, marketing surfaces use 24px+.

---

## 5. Radius, Border, Elevation

- **Radius:** base `--radius: 0.625rem` (10px). Buttons/inputs `md` (8px), cards `lg` (10px), modals/hero panels `xl` (14px), pill badges fully rounded.
- **Borders before shadows.** Default surface = `1px solid var(--border)` on a card token background.
- **Shadows** reserved for popovers, dropdowns, and floating toasts. Use soft, warm shadows:
  - `shadow-sm`: `0 1px 2px oklch(0 0 0 / 0.04)`
  - `shadow-md`: `0 8px 24px -12px oklch(0.2 0.03 60 / 0.15)`

---

## 6. Components

Built on shadcn/ui (`new-york` style). Extend via variants — never fork.

- **Button:** `default` (orange), `secondary` (parchment), `ghost`, `outline`, `destructive`. Icon-only buttons use `size="icon"` and always carry `aria-label`.
- **Card:** parchment or white surface, 1px border, optional 12px eyebrow label.
- **Badge:** pill, `primary-soft` bg + `primary` text, or muted variants for status.
- **Input / Textarea:** white surface, 1px border, orange focus ring (2px offset).
- **Sidebar:** dark rail, icon + label, active item uses `primary-soft` background with `primary` text.
- **Graph / node viz:** nodes in parchment with orange highlight for the active entity; edges in `border`, animated in `primary` when live.
- **Table:** zebra-free, 1px row divider, hoverable rows in `muted`.

### States

- **Hover:** background steps one token darker (e.g. `muted` → `secondary`).
- **Focus:** 2px `--ring` orange outline, 2px offset.
- **Disabled:** 50% opacity, no pointer events.
- **Loading:** skeletons in `muted`, shimmer via `tw-animate-css`.

---

## 7. Iconography

- **Library:** `lucide-react` only. Stroke 1.75, size 16 (inline), 18 (buttons), 20 (nav), 24 (hero).
- **No emoji** in product surfaces.
- Icons inherit `currentColor` — never hardcode fill.

---

## 8. Motion

- **Duration:** 150ms (micro), 220ms (default), 400ms (enter/exit).
- **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)` for UI; `ease-out` for entrances.
- **Graph pulses** and **live activity dots** animate at 1.6s ease-in-out infinite.
- Respect `prefers-reduced-motion`; disable non-essential motion.

---

## 9. Data Visualization

- Sequential: orange → parchment ramp.
- Categorical: `chart-1`…`chart-5` tokens.
- Always label axes; never rely on color alone (add shape/label for accessibility).

---

## 10. Accessibility

- Minimum contrast **4.5:1** for body, **3:1** for large text and icons.
- Every interactive element has a visible focus state and an accessible name.
- Hit target ≥ 40×40px on touch.
- Motion, color, and iconography each carry meaning independently.

---

## 11. Voice & Microcopy

- Direct, calm, technically literate. No hype, no exclamation marks.
- Verbs first in buttons: "Connect Notion", "Ask FLAE", "Open memory".
- Empty states describe what will appear here, not just "No data".
- Numbers get units and freshness ("2,431 memories · updated 3m ago").

---

## 12. Do / Don't

**Do**
- Use `bg-primary` for the single primary action per view.
- Layer parchment surfaces with 1px borders.
- Keep dashboards dense; keep marketing pages airy.

**Don't**
- Don't introduce a second accent color.
- Don't use pure white (`#FFF`) as the page background — use `--background`.
- Don't apply shadows to inline cards; use borders.
- Don't hardcode colors in components — extend tokens in `src/styles.css`.

---