# FALE Design System

Design system for AI company memory / knowledge graph / coding context app.

Primary Style:

```text
Warm Graphite
Dark
Technical
Focused
Premium
AI-native
```

Interface Goal:

```text
A dark, warm graphite, clear, and professional AI command center.
```

---

# 1. Design Principles

## 1.1 Visual Direction

Ember Console (Warm Graphite) is not a bright orange/red interface.

It is a dark warm graphite interface with orange accents to create a sense of energy, proactivity, and high compatibility with technical operations.

```text
Dark graphite background
Orange for primary actions
Purple for AI intelligence
Green for graph/system health
Yellow for warnings
Red only for errors
```

## 1.2 Color Usage Ratio

```text
85% neutral surfaces
10% typography and borders
5% orange + semantic accents
```

## 1.3 Do

* Use a dark warm graphite background as the foundation.
* Use orange for CTA, active state, and primary action.
* Use purple for AI answer, reasoning, agent, and generated insight.
* Use green for connected, success, resolved, and healthy graph.
* Use yellow for warning, pending, and possibly stale.
* Use red for error, failed, and destructive action.

## 1.4 Avoid

* Do not use orange as the full-page background.
* Do not use red as the main brand color.
* Do not use too much glow.
* Do not use light brown text with low contrast.
* Do not make the UI too neon/cyberpunk.

---

# 2. Color Tokens

## 2.1 Background

| Token    |       Hex | Tailwind Name | Usage                     |
| -------- | --------: | ------------- | ------------------------- |
| App      | `#11100F` | `bg-app`      | Main background           |
| Surface  | `#181716` | `bg-surface`  | Card, sidebar, panel      |
| Elevated | `#22201E` | `bg-elevated` | Modal, dropdown, popover  |
| Subtle   | `#1D1B19` | `bg-subtle`   | Table header, hover panel |

## 2.2 Border

| Token   |       Hex | Tailwind Name          | Usage                      |
| ------- | --------: | ---------------------- | -------------------------- |
| Default | `#302D2A` | `border-border`        | Card, input, divider       |
| Strong  | `#46413D` | `border-border-strong` | Active, selected, elevated |

## 2.3 Text

| Token     |       Hex | Tailwind Name         | Usage                   |
| --------- | --------: | --------------------- | ----------------------- |
| Primary   | `#F5F3F0` | `text-text-primary`   | Heading, important text |
| Secondary | `#C7C3BE` | `text-text-secondary` | Body text               |
| Muted     | `#8F8A84` | `text-text-muted`     | Metadata, helper text   |
| Disabled  | `#625E59` | `text-text-disabled`  | Disabled, placeholder   |

## 2.4 Brand

| Token          |                     Hex | Tailwind Name       | Usage           |
| -------------- | ----------------------: | ------------------- | --------------- |
| Primary        |               `#F28C45` | `bg-primary`        | Main CTA        |
| Primary Hover  |               `#E77E37` | `bg-primary-hover`  | Hover           |
| Primary Active |               `#D96F26` | `bg-primary-active` | Active/pressed  |
| Primary Soft   | `rgba(242,140,69,0.10)` | `bg-primary-soft`   | Soft background |

## 2.5 AI Accent

| Token    |                      Hex | Tailwind Name       | Usage              |
| -------- | -----------------------: | ------------------- | ------------------ |
| AI       |                `#A78BFA` | `text-ai` / `bg-ai` | AI states          |
| AI Hover |                `#8B5CF6` | `bg-ai-hover`       | AI hover           |
| AI Soft  | `rgba(167,139,250,0.10)` | `bg-ai-soft`        | AI card background |

## 2.6 Graph Accent

| Token      |                     Hex | Tailwind Name             | Usage                         |
| ---------- | ----------------------: | ------------------------- | ----------------------------- |
| Graph      |               `#5FC98A` | `text-graph` / `bg-graph` | Graph, success, healthy state |
| Graph Soft | `rgba(95,201,138,0.10)` | `bg-graph-soft`           | Success background            |

## 2.7 Semantic

| Token   |       Hex | Tailwind Name | Usage                   |
| ------- | --------: | ------------- | ----------------------- |
| Success | `#5FC98A` | `success`     | Connected, resolved     |
| Warning | `#E9B949` | `warning`     | Possibly stale, pending |
| Error   | `#E26D6D` | `error`       | Failed, destructive     |
| Info    | `#6EA8E5` | `info`        | Info state              |

---

# 3. Tailwind Config

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        app: "#11100F",
        surface: "#181716",
        elevated: "#22201E",
        subtle: "#1D1B19",

        border: {
          DEFAULT: "#302D2A",
          strong: "#46413D",
        },

        text: {
          primary: "#F5F3F0",
          secondary: "#C7C3BE",
          muted: "#8F8A84",
          disabled: "#625E59",
        },

        primary: {
          DEFAULT: "#F28C45",
          hover: "#E77E37",
          active: "#D96F26",
          soft: "rgba(242,140,69,0.10)",
        },

        ai: {
          DEFAULT: "#A78BFA",
          hover: "#8B5CF6",
          soft: "rgba(167,139,250,0.10)",
        },

        graph: {
          DEFAULT: "#5FC98A",
          soft: "rgba(95,201,138,0.10)",
        },

        success: "#5FC98A",
        warning: "#E9B949",
        error: "#E26D6D",
        info: "#6EA8E5",
      },

      boxShadow: {
        soft: "none",
        elevated: "0 16px 56px rgba(0,0,0,0.36)",
        primary: "none",
        ai: "none",
      },

      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "12px",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

# 4. Typography

## 4.1 Font Family

Primary UI font:

```css
Inter, Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Mono font:

```css
"Geist Mono", "JetBrains Mono", "SF Mono", Consolas, monospace
```

Use mono font for:

```text
Code
API path
Commit hash
Database name
Environment variable
Technical metadata
```

## 4.2 Type Scale

| Usage         | Tailwind Class                                                |
| ------------- | ------------------------------------------------------------- |
| Display       | `text-[30px] font-bold tracking-tight`                        |
| Page Title    | `text-2xl font-semibold tracking-[-0.02em]`                   |
| Section Title | `text-[17px] font-semibold tracking-[-0.01em]`                |
| Card Title    | `text-sm font-semibold`                                       |
| Body          | `text-[13px] leading-5`                                       |
| Small         | `text-xs leading-[18px]`                                      |
| Label         | `text-[10px] font-semibold uppercase tracking-[0.08em]`        |

## 4.3 Text Color

| Usage        | Class                                   |
| ------------ | --------------------------------------- |
| Heading      | `text-text-primary`                     |
| Body         | `text-text-secondary`                   |
| Metadata     | `text-text-muted`                       |
| Placeholder  | `placeholder:text-text-disabled`        |
| Disabled     | `text-text-disabled`                    |
| Link         | `text-primary hover:text-primary-hover` |
| AI highlight | `text-ai`                               |

---

# 5. Spacing

Use Tailwind default spacing scale.

Recommended spacing:

| Usage            | Class         |
| ---------------- | ------------- |
| App page padding | `p-6` / `p-8` |
| Mobile padding   | `p-4`         |
| Card padding     | `p-5`         |
| Section gap      | `gap-6`       |
| Grid gap         | `gap-4`       |
| Form gap         | `space-y-3`   |
| Inline gap       | `gap-2`       |

---

# 6. Radius

| Component | Class          |
| --------- | -------------- |
| Button    | `rounded-md` hoặc `rounded-lg`   |
| Input     | `rounded-lg`   |
| Card      | `rounded-xl`   |
| Modal     | `rounded-xl`   |
| Badge     | `rounded-full` |
| Avatar    | `rounded-full` |

---

# 7. Shadows

| Usage            | Class             |
| ---------------- | ----------------- |
| Default card     | `none`            |
| Modal / Popover  | `shadow-elevated` |
| Primary CTA glow | `none`            |
| AI glow          | `none`            |

Use shadow only for elevated panels.

Good usage:

```text
Modal
Dropdown
Popover
Floating action panel
```

Avoid:

```text
Every card
Every sidebar item
Every button
```

---

# 8. Base Layout Classes

## App Body

```text
min-h-screen bg-app text-text-secondary antialiased
```

## Default Surface

```text
bg-surface border border-border rounded-xl
```

## Elevated Surface

```text
bg-elevated border border-border-strong rounded-xl shadow-elevated
```

## Divider

```text
border-border
```

---

# 9. Component Class Recipes

## 9.1 Button

### Primary Button

Use for main action.

```text
inline-flex items-center justify-center rounded-lg border border-primary/20 bg-primary px-4 py-2 text-sm font-semibold text-app transition hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-primary/20
```

### Secondary Button

Use for neutral action.

```text
inline-flex items-center justify-center rounded-lg border border-border bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition hover:border-border-strong hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-primary/10
```

### Ghost Button

Use for low emphasis action.

```text
inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-white/[0.04] hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/10
```

### AI Button

Use for AI-specific action.

```text
inline-flex items-center justify-center rounded-lg border border-ai/20 bg-ai-soft px-4 py-2 text-sm font-semibold text-ai transition hover:bg-ai/20 focus:outline-none focus:ring-2 focus:ring-ai/25
```

### Destructive Button

Use for dangerous action.

```text
inline-flex items-center justify-center rounded-lg border border-error/20 bg-error/10 px-4 py-2 text-sm font-semibold text-error transition hover:bg-error/20 focus:outline-none focus:ring-2 focus:ring-error/25
```

---

## 9.2 Card

### Default Card

```text
rounded-xl border border-border bg-surface p-5
```

### Elevated Card

```text
rounded-xl border border-border-strong bg-elevated p-5 shadow-elevated
```

### AI Card

```text
rounded-xl border border-ai/20 bg-ai-soft p-5
```

### Warning Card

```text
rounded-xl border border-warning/20 bg-warning/10 p-5
```

### Error Card

```text
rounded-xl border border-error/20 bg-error/10 p-5
```

---

## 9.3 Input

### Text Input

```text
w-full rounded-lg border border-border bg-app px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15
```

### Textarea

```text
min-h-28 w-full rounded-lg border border-border bg-app px-3 py-2 text-sm leading-5 text-text-primary placeholder:text-text-disabled outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15
```

### Search Input

```text
w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15
```

---

## 9.4 Badge

### Base Badge

```text
inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium
```

### Connected Badge

```text
border-success/20 bg-success/10 text-success
```

### Syncing Badge

```text
border-primary/20 bg-primary-soft text-primary
```

### AI Badge

```text
border-ai/20 bg-ai-soft text-ai
```

### Warning Badge

```text
border-warning/20 bg-warning/10 text-warning
```

### Error Badge

```text
border-error/20 bg-error/10 text-error
```

### Info Badge

```text
border-info/20 bg-info/10 text-info
```

---

## 9.5 Sidebar

### Sidebar Container

```text
h-screen w-[232px] border-r border-border bg-surface
```

### Sidebar Item

```text
flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary
```

### Sidebar Active Item

```text
flex h-8 items-center gap-2 rounded-md px-2.5 bg-primary/10 text-primary relative before:absolute before:left-0 before:top-2 before:h-4 before:w-0.5 before:rounded-full before:bg-primary
```

---

## 9.6 Table

### Table Wrapper

```text
overflow-hidden rounded-xl border border-border bg-surface
```

### Table Header

```text
bg-subtle text-text-muted
```

### Table Row

```text
border-t border-border text-text-secondary hover:bg-white/[0.04]
```

### Table Cell

```text
px-4 py-3 text-[13px]
```

---

## 9.7 Modal

### Backdrop

```text
fixed inset-0 bg-app/80 backdrop-blur-md
```

### Modal Panel

```text
rounded-xl border border-border-strong bg-surface p-6 shadow-elevated
```

---

## 9.8 Dropdown / Popover

### Container

```text
rounded-lg border border-border-strong bg-elevated p-2 shadow-elevated
```

### Item

```text
rounded-md px-3 py-2 text-[13px] text-text-secondary transition hover:bg-white/[0.04] hover:text-text-primary
```

---

## 9.9 Citation Chip

```text
inline-flex items-center rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/20
```

---

# 10. Graph Colors

## 10.1 Node Colors

| Node Type | Class                       |
| --------- | --------------------------- |
| Project   | `bg-primary text-app`       |
| Decision  | `bg-primary-hover text-app` |
| Document  | `bg-ai text-app`            |
| Person    | `bg-purple-400 text-app`    |
| System    | `bg-graph text-app`         |
| Customer  | `bg-pink-400 text-app`      |
| Risk      | `bg-warning text-app`       |
| Stale     | `bg-error text-app`         |

## 10.2 Edge Colors

| Edge Type   | Class                     |
| ----------- | ------------------------- |
| Default     | `stroke-text-muted/20`    |
| Active      | `stroke-primary`          |
| AI Inferred | `stroke-ai stroke-dashed` |
| Verified    | `stroke-graph`            |
| Warning     | `stroke-warning`          |
| Error       | `stroke-error`            |

---

# 11. Forms

## Label

```text
text-[13px] font-medium text-text-primary
```

## Helper Text

```text
text-xs text-text-muted
```

## Error Text

```text
text-xs text-error
```

## Form Group

```text
space-y-1.5
```

## Form Section

```text
space-y-4
```

---

# 12. States

## Hover

Default hover:

```text
hover:bg-white/[0.04] hover:text-text-primary
```

Border hover:

```text
hover:border-border-strong
```

Primary hover:

```text
hover:bg-primary-hover
```

AI hover:

```text
hover:bg-ai/20
```

## Focus

Default focus:

```text
focus:outline-none focus:ring-2 focus:ring-primary/10
```

Input focus:

```text
focus:border-primary focus:ring-2 focus:ring-primary/15
```

Primary focus:

```text
focus:ring-primary/20
```

## Disabled

```text
opacity-50 pointer-events-none cursor-not-allowed
```

## Loading

```text
animate-pulse
```

Spinner:

```text
h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent
```

---

# 13. Icons

Recommended icon libraries:

```text
Lucide
Heroicons
Phosphor Icons
```

Icon style:

```text
Outline
Rounded
Simple
1.5px or 2px stroke
```

Icon color:

| Usage   | Class                 |
| ------- | --------------------- |
| Default | `text-text-secondary` |
| Muted   | `text-text-muted`     |
| Active  | `text-primary`        |
| AI      | `text-ai`             |
| Success | `text-success`        |
| Warning | `text-warning`        |
| Error   | `text-error`          |

---

# 14. Status Rules

Status should not rely on color only.

Good:

```text
Yellow badge + "Possibly stale"
Green badge + "Connected"
Red badge + "Failed"
Purple badge + "AI generated"
```

Avoid:

```text
Only colored dot without label
```

---

# 15. Accessibility

Minimum contrast:

```text
Normal text: 4.5:1
Large text: 3:1
UI component boundaries: 3:1
```

Rules:

```text
All buttons, inputs, links must have focus state.
Do not use muted text for critical information.
Do not rely on color only for status.
Long AI answers should use leading-5 or leading-6.
Clickable areas should be at least 32px tall.
```

---

# 16. Class Recipes Summary

## App

```text
min-h-screen bg-app text-text-secondary antialiased
```

## Card

```text
rounded-xl border border-border bg-surface p-5
```

## Elevated Card

```text
rounded-xl border border-border-strong bg-elevated p-5 shadow-elevated
```

## Primary Button

```text
inline-flex items-center justify-center rounded-lg border border-primary/20 bg-primary px-4 py-2 text-sm font-semibold text-app transition hover:bg-primary-hover active:bg-primary-active
```

## Secondary Button

```text
inline-flex items-center justify-center rounded-lg border border-border bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition hover:border-border-strong hover:bg-subtle
```

## Input

```text
w-full rounded-lg border border-border bg-app px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15
```

## Badge Base

```text
inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium
```

## Citation Chip

```text
inline-flex items-center rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/20
```

## Sidebar Item

```text
flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-text-secondary transition hover:bg-white/[0.04] hover:text-text-primary
```

## Sidebar Active Item

```text
flex h-8 items-center gap-2 rounded-md px-2.5 bg-primary/10 text-primary relative before:absolute before:left-0 before:top-2 before:h-4 before:w-0.5 before:rounded-full before:bg-primary
```

---

# 17. Final Rule

Ember Console (Warm Graphite) should feel like:

```text
A warm graphite, focused AI command center.
```

Not:

```text
A red/orange theme.
```

Use orange as a signal.
Use purple for intelligence.
Use green for healthy knowledge.
Use dark warm graphite neutral for the foundation.
