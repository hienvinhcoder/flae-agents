# Theme Tokens — FLAE

## Compact summary

| Token / role | Value |
|---|---|
| canvas `--background` | `#141009` umber-black |
| ink `--foreground` | `#F5F0E8` |
| primary CTA | oklch accessible deep orange; vivid `#F97316` (`--orb-primary`) |
| amber / ember | `#FB923C` / `#7C2D12` |
| surfaces | glass `rgb(255 251 245 / 0.06–0.10)` |
| border / hairline | `rgb(255 251 245 / 0.12–0.14)` |
| muted text | `#B7AB9A` |
| sidebar | `rgb(20 16 9 / 0.65)` + blur |
| fonts | Plus Jakarta Sans (display), Inter (UI), JetBrains Mono |
| radius | control 10 · panel 14 · dialog 18 · pill 9999 |
| shadows | `--shadow-glass`, `--glow-primary`, glass blur 20–32px |
| utilities | `.glass-field`, `.glass-panel`, `.glass-button`, `.flae-button-primary` |

Canonical sources:
- `DESIGN.md` (repo root) — design system v2.0
- `frontend/src/styles.css` — CSS vars + `@theme inline` (Tailwind v4, no tailwind.config)

## styles.css (head / tokens region)

```css
@import "tailwindcss";

:root {
  color-scheme: dark;

  --background: #141009;
  --foreground: #f5f0e8;
  --card: var(--glass-surface-strong);
  --card-foreground: var(--foreground);
  --popover: var(--glass-surface-strong);
  --popover-foreground: var(--foreground);
  /*
   * --primary stays the deep accessible orange (not DESIGN.md's brighter
   * #F97316) so white text on CTAs keeps WCAG AA contrast (~4.8:1). The
   * brighter brand orange is expressed as glow/tint via --orb-primary.
   */
  --primary: oklch(70.487% 0.1867 47.604);
  --primary-foreground: oklch(98.951% 0.009 78.283);
  --primary-soft: rgb(249 115 22 / 0.16);
  --primary-control: var(--primary);
  --primary-control-hover: color-mix(in oklch, var(--primary), var(--foreground) 10%);
  --primary-control-active: color-mix(in oklch, var(--primary), var(--foreground) 18%);
  --primary-control-foreground: var(--primary-foreground);
  --secondary: var(--glass-surface);
  --secondary-foreground: var(--foreground);
  --muted: rgb(255 251 245 / 0.08);
  --muted-foreground: #b7ab9a;
  --accent: var(--secondary);
  --accent-foreground: var(--foreground);
  --destructive: oklch(0.62 0.21 27);
  --destructive-foreground: var(--primary-foreground);
  --border: rgb(255 251 245 / 0.12);
  --input: var(--border);
  --ring: var(--primary);
  --chart-1: oklch(0.68 0.2 42);
  --chart-2: oklch(0.75 0.13 175);
  --chart-3: oklch(0.62 0.11 230);
  --chart-4: oklch(0.82 0.16 84);
  --chart-5: oklch(0.78 0.14 70);
  /* Sidebar/nav surfaces follow the DESIGN.md nav-bar spec: umber at 0.65 + blur. */
  --sidebar: rgb(20 16 9 / 0.65);
  --sidebar-foreground: #eae3d6;
  --sidebar-primary: var(--primary-soft);
  --sidebar-primary-foreground: var(--orb-primary);
  --sidebar-accent: color-mix(in oklch, var(--sidebar), var(--sidebar-foreground) 8%);
  --sidebar-accent-foreground: var(--sidebar-foreground);
  --sidebar-border: color-mix(in oklch, var(--sidebar), var(--sidebar-foreground) 12%);
  --sidebar-ring: var(--ring);

  /* Compatibility aliases while feature modules migrate to canonical tokens. */
  --color-primary-cta: var(--primary-control);
  --color-primary-cta-hover: var(--primary-control-hover);
  --color-primary-cta-active: var(--primary-control-active);
  --color-primary-cta-foreground: var(--primary-control-foreground);
  --color-canvas: var(--background);
  --color-surface: var(--card);
  --color-surface-raised: var(--card);
  --color-surface-interactive: var(--muted);
  --color-divider: var(--border);
  --color-border: var(--border);
  --color-border-control: var(--muted-foreground);
  --color-border-strong: var(--foreground);
  --color-text: var(--foreground);
  --color-text-secondary: var(--secondary-foreground);
  --color-text-muted: var(--muted-foreground);
  --color-text-disabled: color-mix(in oklch, var(--muted-foreground), var(--background) 28%);
  --color-on-primary: var(--primary-control-foreground);
  --color-on-primary-cta: var(--color-primary-cta-foreground);
  --color-link: var(--orb-amber);
  --color-focus: var(--ring);
  --color-ai: var(--primary);
  --color-ai-soft: var(--primary-soft);
  --color-success: color-mix(in oklch, var(--chart-2), var(--foreground) 35%);
  --color-success-soft: color-mix(in oklch, var(--chart-2) 12%, var(--card));
  --color-warning: color-mix(in oklch, var(--chart-4), var(--foreground) 55%);
  --color-warning-soft: color-mix(in oklch, var(--chart-4) 18%, var(--card));
  --color-danger: color-mix(in oklch, var(--destructive), var(--foreground) 15%);
  --color-danger-soft: color-mix(in oklch, var(--destructive) 10%, var(--card));
  --color-info: var(--muted-foreground);
  --color-info-soft: var(--muted);

  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
  --font-display: "Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui,
    -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Monaco,
    Consolas, "Liberation Mono", monospace;

  --text-display: 4rem;
  --text-display-line-height: 1.04;
  --text-display-font-weight: 500;
  --text-body: 1rem;
  --text-body-line-height: 1.6;
  --text-body-font-weight: 400;
  --text-label: 0.75rem;
  --text-label-line-height: 1.2;
  --text-label-font-weight: 600;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;

  /* Radius scale per DESIGN.md: xs 4 / sm 6 / md 10 / lg 14 / xl 18 / xxl 24 / pill */
  --radius-xs: 0.25rem;
  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-control: 0.625rem;
  --radius-lg: 0.875rem;
  --radius-xl: 1.125rem;
  --radius-card: 0.875rem;
  --radius-dialog: 1.125rem;
  --radius-hero: 1.5rem;
  --radius-pill: 9999px;

  --shadow-panel: var(--shadow-glass);
  --shadow-overlay: var(--shadow-glass-pop);
  --focus-ring: 0 0 0 4px color-mix(in oklch, var(--ring) 22%, transparent);

  --motion-fast: 150ms;
  --motion-normal: 200ms;
  --motion-slow: 300ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  /* --- Glassmorphism system (dark warm field) --- */
  --glass-canvas: #141009;
  --glass-ink: #f5f0e8;
  --glass-ink-secondary: #b7ab9a;
  --glass-ink-muted: rgb(245 240 232 / 0.55);
  --glass-surface: rgb(255 251 245 / 0.06);
  --glass-surface-strong: rgb(255 251 245 / 0.1);
  --glass-line: rgb(255 251 245 / 0.14);
  --glass-highlight: rgb(255 251 245 / 0.08);
  --glass-danger: #f87171;
  --glass-blur: 20px;
  --glass-blur-lg: 32px;
  --orb-primary: #f97316;
  --orb-amber: #fb923c;
  --orb-ember: #7c2d12;
  --shadow-glass: 0 8px 32px rgb(0 0 0 / 0.35), inset 0 1px 0 var(--glass-highlight);
  --shadow-glass-pop: 0 16px 48px -12px rgb(0 0 0 / 0.5), inset 0 1px 0 var(--glass-highlight);
  --glow-primary: 0 0 24px rgb(249 115 22 / 0.35);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-soft: var(--primary-soft);
  --color-primary-control: var(--primary-control);
  --color-primary-control-hover: var(--primary-control-hover);
  --color-primary-control-active: var(--primary-control-active);
  --color-primary-control-foreground: var(--primary-control-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-brand: var(--primary-control);
  --color-brand-vivid: var(--primary);
  --color-brand-hover: var(--primary-control-hover);
  --color-brand-active: var(--primary-control-active);
  --color-brand-soft: var(--primary-soft);
  --color-brand-foreground: var(--primary-control-foreground);
  --color-brand-text: var(--color-link);
  --color-brand-cta: var(--color-primary-cta);
  --color-brand-cta-hover: var(--color-primary-cta-hover);
  --color-brand-cta-active: var(--color-primary-cta-active);
  --color-brand-cta-foreground: var(--color-primary-cta-foreground);
  --color-ui-canvas: var(--color-canvas);
  --color-ui-panel: var(--color-surface);
  --color-ui-raised: var(--color-surface-raised);
  --color-ui-interactive: var(--color-surface-interactive);
  --color-ui-divider: var(--color-divider);
  --color-ui-line: var(--color-border);
  --color-ui-line-strong: var(--color-border-strong);
  --color-ui-link: var(--color-link);
  --color-ui-focus: var(--color-focus);
  --color-ui-ink: var(--color-text);
  --color-ui-ink-secondary: var(--color-text-secondary);
  --color-ui-ink-muted: var(--color-text-muted);
  --color-ui-ink-disabled: var(--color-text-disabled);
  --color-accent-ai: var(--color-ai);
  --color-accent-ai-soft: var(--color-ai-soft);
  --color-state-success: var(--color-success);
  --color-state-success-soft: var(--color-success-soft);
  --color-state-warning: var(--color-warning);
  --color-state-warning-soft: var(--color-warning-soft);
  --color-state-danger: var(--color-danger);
  --color-state-danger-soft: var(--color-danger-soft);
  --color-state-info: var(--color-info);
  --color-state-info-soft: var(--color-info-soft);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
```
