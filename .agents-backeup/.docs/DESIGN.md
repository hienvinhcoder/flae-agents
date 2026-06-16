# FALE Design System

Design system for AI company memory / knowledge graph / coding context app.

Primary Style:

```text
Warm
Dark
Technical
Focused
Premium
AI-native
```

Interface Goal:

```text
A dark, warm, clear, and professional AI command center.
```

---

# 1. Design Principles

## 1.1 Visual Direction

Sunset Fire Dark Mode is not a bright orange/red interface.

It is a dark, warm interface with orange accents to create a sense of energy, proactivity, and compatibility with the Fire element.

```text
Dark warm background
Orange for primary actions
Purple for AI intelligence
Green for graph/system health
Yellow for warnings
Red only for errors
```

## 1.2 Color Usage Ratio

```text
70% dark warm neutral
20% sunset orange
10% purple / green / semantic colors
```

## 1.3 Do

* Use a dark warm background as the foundation.
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
| App      | `#140F0B` | `bg-app`      | Main background           |
| Surface  | `#1F1711` | `bg-surface`  | Card, sidebar, panel      |
| Elevated | `#2A1D14` | `bg-elevated` | Modal, dropdown, popover  |
| Subtle   | `#201712` | `bg-subtle`   | Table header, hover panel |

## 2.2 Border

| Token   |       Hex | Tailwind Name          | Usage                      |
| ------- | --------: | ---------------------- | -------------------------- |
| Default | `#3F2A1A` | `border-border`        | Card, input, divider       |
| Strong  | `#5A3822` | `border-border-strong` | Active, selected, elevated |

## 2.3 Text

| Token     |       Hex | Tailwind Name         | Usage                   |
| --------- | --------: | --------------------- | ----------------------- |
| Primary   | `#FFF7ED` | `text-text-primary`   | Heading, important text |
| Secondary | `#FCD7AA` | `text-text-secondary` | Body text               |
| Muted     | `#DDB991` | `text-text-muted`     | Metadata, helper text   |
| Disabled  | `#8A6A4F` | `text-text-disabled`  | Disabled, placeholder   |

## 2.4 Brand

| Token          |                     Hex | Tailwind Name       | Usage           |
| -------------- | ----------------------: | ------------------- | --------------- |
| Primary        |               `#FB923C` | `bg-primary`        | Main CTA        |
| Primary Hover  |               `#F97316` | `bg-primary-hover`  | Hover           |
| Primary Active |               `#EA580C` | `bg-primary-active` | Active/pressed  |
| Primary Soft   | `rgba(251,146,60,0.14)` | `bg-primary-soft`   | Soft background |

## 2.5 AI Accent

| Token    |                      Hex | Tailwind Name       | Usage              |
| -------- | -----------------------: | ------------------- | ------------------ |
| AI       |                `#C084FC` | `text-ai` / `bg-ai` | AI states          |
| AI Hover |                `#A855F7` | `bg-ai-hover`       | AI hover           |
| AI Soft  | `rgba(192,132,252,0.14)` | `bg-ai-soft`        | AI card background |

## 2.6 Graph Accent

| Token      |                     Hex | Tailwind Name             | Usage                         |
| ---------- | ----------------------: | ------------------------- | ----------------------------- |
| Graph      |               `#4ADE80` | `text-graph` / `bg-graph` | Graph, success, healthy state |
| Graph Soft | `rgba(74,222,128,0.12)` | `bg-graph-soft`           | Success background            |

## 2.7 Semantic

| Token   |       Hex | Tailwind Name | Usage                   |
| ------- | --------: | ------------- | ----------------------- |
| Success | `#4ADE80` | `success`     | Connected, resolved     |
| Warning | `#FBBF24` | `warning`     | Possibly stale, pending |
| Error   | `#F87171` | `error`       | Failed, destructive     |
| Info    | `#60A5FA` | `info`        | Info state              |

---

# 3. Tailwind Config

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        app: "#140F0B",
        surface: "#1F1711",
        elevated: "#2A1D14",
        subtle: "#201712",

        border: {
          DEFAULT: "#3F2A1A",
          strong: "#5A3822",
        },

        text: {
          primary: "#FFF7ED",
          secondary: "#FCD7AA",
          muted: "#DDB991",
          disabled: "#8A6A4F",
        },

        primary: {
          DEFAULT: "#FB923C",
          hover: "#F97316",
          active: "#EA580C",
          soft: "rgba(251,146,60,0.14)",
        },

        ai: {
          DEFAULT: "#C084FC",
          hover: "#A855F7",
          soft: "rgba(192,132,252,0.14)",
        },

        graph: {
          DEFAULT: "#4ADE80",
          soft: "rgba(74,222,128,0.12)",
        },

        success: "#4ADE80",
        warning: "#FBBF24",
        error: "#F87171",
        info: "#60A5FA",
      },

      boxShadow: {
        soft: "0 8px 32px rgba(0,0,0,0.24)",
        elevated: "0 16px 56px rgba(0,0,0,0.36)",
        primary: "0 0 32px rgba(251,146,60,0.18)",
        ai: "0 0 32px rgba(192,132,252,0.18)",
      },

      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
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

| Usage         | Tailwind Class                        |
| ------------- | ------------------------------------- |
| Display       | `text-4xl font-bold tracking-tight`   |
| Page Title    | `text-3xl font-bold tracking-tight`   |
| Section Title | `text-xl font-semibold`               |
| Card Title    | `text-base font-semibold`             |
| Body          | `text-sm leading-6`                   |
| Small         | `text-xs leading-5`                   |
| Label         | `text-[11px] uppercase tracking-wide` |

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
| Button    | `rounded-lg`   |
| Input     | `rounded-xl`   |
| Card      | `rounded-2xl`  |
| Modal     | `rounded-2xl`  |
| Badge     | `rounded-full` |
| Avatar    | `rounded-full` |

---

# 7. Shadows

| Usage            | Class             |
| ---------------- | ----------------- |
| Default card     | `shadow-soft`     |
| Modal / Popover  | `shadow-elevated` |
| Primary CTA glow | `shadow-primary`  |
| AI glow          | `shadow-ai`       |

Use glow only for important elements.

Good usage:

```text
Primary CTA
Selected graph node
AI insight card
Active agent
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
bg-surface border border-border rounded-2xl
```

## Elevated Surface

```text
bg-elevated border border-border-strong rounded-2xl shadow-elevated
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
inline-flex items-center justify-center rounded-lg border border-primary/40 bg-primary px-4 py-2 text-sm font-semibold text-app shadow-primary transition hover:bg-primary-hover active:bg-primary-active focus:outline-none focus:ring-2 focus:ring-ai/30
```

### Secondary Button

Use for neutral action.

```text
inline-flex items-center justify-center rounded-lg border border-border bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition hover:border-border-strong hover:bg-subtle focus:outline-none focus:ring-2 focus:ring-ai/30
```

### Ghost Button

Use for low emphasis action.

```text
inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-white/5 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-ai/30
```

### AI Button

Use for AI-specific action.

```text
inline-flex items-center justify-center rounded-lg border border-ai/30 bg-ai-soft px-4 py-2 text-sm font-semibold text-ai transition hover:bg-ai/20 focus:outline-none focus:ring-2 focus:ring-ai/30
```

### Destructive Button

Use for dangerous action.

```text
inline-flex items-center justify-center rounded-lg border border-error/30 bg-error/10 px-4 py-2 text-sm font-semibold text-error transition hover:bg-error/20 focus:outline-none focus:ring-2 focus:ring-error/30
```

---

## 9.2 Card

### Default Card

```text
rounded-2xl border border-border bg-surface p-5 shadow-soft
```

### Elevated Card

```text
rounded-2xl border border-border-strong bg-elevated p-5 shadow-elevated
```

### AI Card

```text
rounded-2xl border border-ai/30 bg-ai-soft p-5 shadow-ai
```

### Warning Card

```text
rounded-2xl border border-warning/30 bg-warning/10 p-5
```

### Error Card

```text
rounded-2xl border border-error/30 bg-error/10 p-5
```

---

## 9.3 Input

### Text Input

```text
w-full rounded-xl border border-border bg-app px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled outline-none transition focus:border-ai focus:ring-2 focus:ring-ai/30
```

### Textarea

```text
min-h-28 w-full rounded-xl border border-border bg-app px-3 py-2 text-sm leading-6 text-text-primary placeholder:text-text-disabled outline-none transition focus:border-ai focus:ring-2 focus:ring-ai/30
```

### Search Input

```text
w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20
```

---

## 9.4 Badge

### Base Badge

```text
inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium
```

### Connected Badge

```text
border-success/30 bg-success/10 text-success
```

### Syncing Badge

```text
border-primary/30 bg-primary-soft text-primary
```

### AI Badge

```text
border-ai/30 bg-ai-soft text-ai
```

### Warning Badge

```text
border-warning/30 bg-warning/10 text-warning
```

### Error Badge

```text
border-error/30 bg-error/10 text-error
```

### Info Badge

```text
border-info/30 bg-info/10 text-info
```

---

## 9.5 Sidebar

### Sidebar Container

```text
h-screen w-64 border-r border-border bg-surface
```

### Sidebar Item

```text
flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-white/5 hover:text-text-primary
```

### Sidebar Active Item

```text
flex items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-3 py-2 text-sm font-medium text-primary
```

---

## 9.6 Table

### Table Wrapper

```text
overflow-hidden rounded-2xl border border-border bg-surface
```

### Table Header

```text
bg-subtle text-text-muted
```

### Table Row

```text
border-t border-border text-text-secondary hover:bg-white/5
```

### Table Cell

```text
px-4 py-3 text-sm
```

---

## 9.7 Modal

### Backdrop

```text
fixed inset-0 bg-app/80 backdrop-blur-md
```

### Modal Panel

```text
rounded-2xl border border-border-strong bg-surface p-6 shadow-elevated
```

---

## 9.8 Dropdown / Popover

### Container

```text
rounded-xl border border-border-strong bg-elevated p-2 shadow-elevated
```

### Item

```text
rounded-lg px-3 py-2 text-sm text-text-secondary transition hover:bg-white/5 hover:text-text-primary
```

---

## 9.9 Citation Chip

Use for source reference.

```text
inline-flex items-center rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/20
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
| Default     | `stroke-text-muted/30`    |
| Active      | `stroke-primary`          |
| AI Inferred | `stroke-ai stroke-dashed` |
| Verified    | `stroke-graph`            |
| Warning     | `stroke-warning`          |
| Error       | `stroke-error`            |

---

# 11. Forms

## Label

```text
text-sm font-medium text-text-primary
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
space-y-2
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
hover:bg-white/5 hover:text-text-primary
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
focus:outline-none focus:ring-2 focus:ring-ai/30
```

Input focus:

```text
focus:border-ai focus:ring-2 focus:ring-ai/30
```

Primary focus:

```text
focus:ring-primary/30
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
Long AI answers should use leading-6 or leading-7.
Clickable areas should be at least 40px tall.
```

---

# 16. Class Recipes Summary

## App

```text
min-h-screen bg-app text-text-secondary antialiased
```

## Card

```text
rounded-2xl border border-border bg-surface p-5 shadow-soft
```

## Elevated Card

```text
rounded-2xl border border-border-strong bg-elevated p-5 shadow-elevated
```

## Primary Button

```text
inline-flex items-center justify-center rounded-lg border border-primary/40 bg-primary px-4 py-2 text-sm font-semibold text-app shadow-primary transition hover:bg-primary-hover active:bg-primary-active
```

## Secondary Button

```text
inline-flex items-center justify-center rounded-lg border border-border bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition hover:border-border-strong hover:bg-subtle
```

## Input

```text
w-full rounded-xl border border-border bg-app px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled outline-none transition focus:border-ai focus:ring-2 focus:ring-ai/30
```

## Badge Base

```text
inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium
```

## Citation Chip

```text
inline-flex items-center rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/20
```

## Sidebar Item

```text
flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-white/5 hover:text-text-primary
```

## Sidebar Active Item

```text
flex items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-3 py-2 text-sm font-medium text-primary
```

---

# 17. Final Rule

Sunset Fire Dark Mode should feel like:

```text
A warm, focused AI command center.
```

Not:

```text
A red/orange theme.
```

Use orange as a signal.
Use purple for intelligence.
Use green for healthy knowledge.
Use dark warm neutral for the foundation.

```
```
