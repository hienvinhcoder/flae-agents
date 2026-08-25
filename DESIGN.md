# FLAE Design System

FLAE is an AI Company Memory platform. The design language is **glassmorphism** — translucent, frosted-glass surfaces floating over a warm, glowing gradient field. It feels luminous, layered, and intelligent: knowledge as light refracting through depth. The signature FLAE orange stays the single accent, now expressed as glow and tint rather than flat fill.

---

## 1. Brand Principles

- **Warm intelligence, rendered in light.** Glass surfaces + an ambient orange glow communicate warmth and clarity without sterility.
- **Depth through translucency.** Layers are stacked frosted panes, not flat cards — the UI reads as a living, dimensional space.
- **Signal over noise.** One accent (orange) at a time. Glass stays quiet; content stays legible.
- **Human + agent.** Legible for people, structured for LLMs — clear hierarchy, semantic tokens, predictable contrast.

---

## 2. Color

Colors are declared as CSS variables in `src/styles.css` and exposed as Tailwind utilities via `@theme inline`. Glassmorphism requires **alpha channels**, so surface tokens use `rgb()` / `oklch()` with transparency — never hardcode values in components, always use semantic tokens.

### Background field

The canvas is a deep warm base with **fixed ambient orbs** (large blurred radial gradients) behind all content. The orbs are what the glass blurs and refracts.

| Token | Value | Role |
|---|---|---|
| `--background` | `#141009` | Deep warm canvas (near-black umber) |
| `--orb-primary` | `#F97316` | Orange glow orb (top-left / focal) |
| `--orb-amber` | `#FB923C` | Secondary warm orb |
| `--orb-ember` | `#7C2D12` | Deep ember orb (bottom, grounding) |
| `--orb-blur` | `140px` | Blur radius applied to orbs |

Orbs sit at low opacity (≈ 0.35) and are `position: fixed` + `pointer-events: none` so they never intercept interaction.

### Glass surfaces

| Token | Value | Role |
|---|---|---|
| `--glass` | `rgb(255 251 245 / 0.06)` | Default frosted panel fill |
| `--glass-strong` | `rgb(255 251 245 / 0.10)` | Elevated panel / hover fill |
| `--glass-border` | `rgb(255 251 245 / 0.14)` | 1px hairline on glass edges |
| `--glass-highlight` | `rgb(255 251 245 / 0.08)` | Inset top-edge light catch |

### Core palette

| Token | Value | Role |
|---|---|---|
| `--primary` | `#F97316` | FLAE orange — CTAs, active state, focus rings, glow |
| `--primary-foreground` | `#FFFBF5` | Text on orange |
| `--primary-soft` | `rgb(249 115 22 / 0.16)` | Orange tint, badges, hover backgrounds |
| `--foreground` | `#F5F0E8` | Primary text (warm off-white) |
| `--muted-foreground` | `#B7AB9A` | Secondary text, meta |
| `--border` | `rgb(255 251 245 / 0.12)` | Hairlines, dividers |
| `--sidebar` | `rgb(20 16 9 / 0.55)` | Frosted dark rail nav |
| `--sidebar-foreground` | `#EAE3D6` | Sidebar text |
| `--destructive` | `oklch(0.62 0.21 27)` | Errors, risks |

### Usage rules

- **One accent per view.** Orange is reserved for the primary action and the single most important status per section. Express it as glow/tint, not large flat fills.
- **Glass does the heavy lifting.** Panels are translucent + blurred, separated by 1px `--glass-border` and a soft shadow — not solid backgrounds.
- **Never combine orange with red** except in destructive confirmation flows.
- **Keep text on readable glass.** Where text sits, raise the panel to `--glass-strong` or add a scrim so contrast holds (see §10).

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

On glass, keep body text at `--foreground` and never below 15px — thin light text on translucent surfaces loses legibility fast.

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
- **Layer gaps:** give glass panes breathing room (≥ 16px) so the blur field reads as depth, not noise.

---

## 5. Radius, Border, Elevation

- **Radius:** base `--radius: 0.75rem` (12px) — glass reads softer. Buttons/inputs `md` (10px), cards `lg` (14px), modals/hero panels `xl` (18px), pill badges fully rounded.
- **The glass recipe.** Every frosted surface combines:
  1. `background: var(--glass)` (or `--glass-strong`)
  2. `backdrop-filter: blur(var(--blur-glass))` + `-webkit-backdrop-filter`
  3. `border: 1px solid var(--glass-border)`
  4. `box-shadow: var(--shadow-glass)` (includes the inset top highlight)
- **Blur scale:**
  - `--blur-glass`: `20px` — standard panels, cards, nav
  - `--blur-glass-lg`: `32px` — modals, command palette, hero panels
- **Shadows** are soft, layered, and warm — they anchor glass to the field:
  - `--shadow-glass`: `0 8px 32px rgb(0 0 0 / 0.35), inset 0 1px 0 var(--glass-highlight)`
  - `--shadow-pop`: `0 16px 48px -12px rgb(0 0 0 / 0.5), inset 0 1px 0 var(--glass-highlight)` — popovers, dropdowns, toasts
- The **inset top highlight** simulates light catching the glass edge — keep it on every raised pane.

---

## 6. Components

Built on shadcn/ui (`new-york` style). Extend via variants — never fork. Apply the glass recipe (§5) to surface components.

- **Button:** `default` (orange, with a subtle `0 0 24px rgb(249 115 22 / 0.35)` glow), `secondary` (frosted glass), `ghost`, `outline` (glass-border), `destructive`. Icon-only buttons use `size="icon"` and always carry `aria-label`.
- **Card:** frosted glass pane (`--glass`), 1px `--glass-border`, inset top highlight, optional 12px eyebrow label.
- **Badge:** pill, `primary-soft` bg + `primary` text, or muted glass variants for status.
- **Input / Textarea:** `--glass` surface, 1px `--glass-border`, orange focus ring (2px offset) + faint orange glow on focus.
- **Sidebar:** frosted dark rail (`--sidebar`), icon + label, active item uses `primary-soft` background with `primary` text.
- **Graph / node viz:** nodes as small frosted chips with orange highlight for the active entity; edges in `border`, animated in `primary` when live.
- **Table:** zebra-free, 1px row divider in `border`, hoverable rows lift to `--glass-strong`.
- **Modal / Command palette:** `--glass-strong` + `--blur-glass-lg` + `--shadow-pop`, centered over a darkened scrim.

### States

- **Hover:** surface steps up one level (`--glass` → `--glass-strong`); border brightens slightly.
- **Focus:** 2px `--ring` orange outline, 2px offset, plus a soft orange glow.
- **Disabled:** 50% opacity, no pointer events, blur removed for flatness.
- **Loading:** skeletons in `--glass-strong`, shimmer via `tw-animate-css`.

---

## 7. Iconography

- **Library:** `lucide-react` only. Stroke 1.75, size 16 (inline), 18 (buttons), 20 (nav), 24 (hero).
- **No emoji** in product surfaces.
- Icons inherit `currentColor` — never hardcode fill. On glass, icons use `--foreground` or `--muted-foreground`.

---

## 8. Motion

- **Duration:** 150ms (micro), 220ms (default), 400ms (enter/exit).
- **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)` for UI; `ease-out` for entrances.
- **Glass entrances** fade + rise 8px with a slight blur-in (opacity 0→1, `filter: blur(8px)→0`).
- **Graph pulses**, **live activity dots**, and **ambient orb drift** animate at 1.6s ease-in-out infinite (orbs drift slowly, ≈ 20s, to keep the field alive without distraction).
- Respect `prefers-reduced-motion`; disable orb drift and non-essential motion.

---

## 9. Data Visualization

- Sequential: orange → warm-neutral ramp.
- Categorical: `chart-1`…`chart-5` tokens, tuned to read on dark glass.
- Chart panels sit on `--glass-strong` so gridlines and labels stay legible.
- Always label axes; never rely on color alone (add shape/label for accessibility).

---

## 10. Accessibility

Glassmorphism's main risk is contrast — enforce these strictly:

- Minimum contrast **4.5:1** for body, **3:1** for large text and icons, measured **against the worst-case background** (brightest orb behind the glass), not just the base canvas.
- If a glass panel can't hold contrast over an orb, raise it to `--glass-strong` or add a scrim (`rgb(20 16 9 / 0.4)`) behind the content area.
- Never place body text directly on the background field — always on a glass pane.
- Every interactive element has a visible focus state (orange ring + glow) and an accessible name.
- Hit target ≥ 40×40px on touch.
- Motion, color, and iconography each carry meaning independently.
- Provide a `backdrop-filter` fallback: where unsupported, panels fall back to a solid `--glass-strong`-equivalent opaque fill.

---

## 11. Voice & Microcopy

- Direct, calm, technically literate. No hype, no exclamation marks.
- Verbs first in buttons: "Connect Notion", "Ask FLAE", "Open memory".
- Empty states describe what will appear here, not just "No data".
- Numbers get units and freshness ("2,431 memories · updated 3m ago").

---

## 12. Do / Don't

**Do**
- Use `bg-primary` (with a soft glow) for the single primary action per view.
- Layer frosted glass panes with 1px `--glass-border` + inset top highlight.
- Keep the ambient orb field fixed and subtle; let glass refract it.
- Keep dashboards dense; keep marketing pages airy.
- Verify contrast over the brightest orb, not just the base background.

**Don't**
- Don't introduce a second accent color.
- Don't use flat opaque cards — surfaces should be translucent + blurred.
- Don't blur so heavily that text loses edge clarity; keep body text crisp.
- Don't stack more than 3 glass layers deep — depth becomes mud.
- Don't hardcode colors or blur values in components — extend tokens in `src/styles.css`.
