# FLAE UI Redesign (Linear-tight) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Linear-tight Clean Enterprise UI — orange primary, light default + dark mode, hybrid top-bar + icon-rail shell — starting with tokens/primitives, then shell, then Knowledge.

**Architecture:** CSS variables in `frontend/src/styles.css` (`:root` light, `.dark` dark) become the single runtime source of truth aligned with `DESIGN.md`. A small Zustand theme store toggles `document.documentElement.classList`. Hybrid shell replaces expanded-sidebar chrome. Feature pages inherit tokens; Knowledge is the first page explicitly re-laid out. No backend changes.

**Tech Stack:** React 19, Vite, Tailwind v4 (`@theme inline`), Zustand, Vitest + RTL, existing `shared/ui` primitives.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-22-flae-ui-redesign-design.md`
- Tokens: `DESIGN.md` v3 Linear-tight (orange `#EA580C` light / `#F97316` dark; light default)
- Forbidden: glass stacks, glow, purple, serif display, orange gradients
- Fonts: Inter (UI/display), JetBrains Mono (mono); do not use Plus Jakarta Sans for UI after migration
- Radius: control 6px · panel 8px · dialog 12px
- Shell: top bar 52–56px + icon rail 56px; Knowledge list/table is default view
- Keep TanStack Query / feature folder / i18n patterns; no business-logic rewrites
- Commits only when the user explicitly asks (do not auto-commit)
- Match Superdesign drafts structurally (not pixel-perfect): Light `864a5302-…`, Dark `3f439c1f-…`

---

## File structure

| Path | Responsibility |
|---|---|
| `DESIGN.md` | Canonical written tokens (already v3) |
| `frontend/src/styles.css` | `:root` light + `.dark` dark tokens; `@theme inline`; deprecate glass utilities as flat aliases |
| `frontend/src/shared/ui/theme.test.tsx` | Contract tests for token values + Tailwind mappings |
| `frontend/src/core/stores/theme-store.ts` | Persist `light` \| `dark`; apply/remove `.dark` on `<html>` |
| `frontend/src/core/stores/theme-store.test.ts` | Unit tests for preference + DOM class |
| `frontend/src/app/providers/*` or `main.tsx` | Hydrate theme before paint |
| `frontend/src/app/layout/ThemeToggle.tsx` | Top-bar sun/moon control |
| `frontend/src/app/layout/AppShell.tsx` | Hybrid chrome composition |
| `frontend/src/app/layout/AdminHeader.tsx` | Becomes slim top bar (brand + workspace + theme + user) |
| `frontend/src/app/layout/AdminSidebar.tsx` | Becomes 56px icon rail (tooltips); drop expanded-lg primary path for v1 |
| `frontend/src/app/layout/AdminSidebar.test.tsx` / `AppShell.test.tsx` | Update shell expectations |
| `frontend/src/shared/ui/Button.tsx` (+ peers) | Radius/height; drop glass-specific classes |
| `frontend/src/features/knowledge/pages/KnowledgeListPage.tsx` | Align header/panel classes to new spacing |
| `frontend/src/features/knowledge/ui/*` | Soften glass/ui-ink classes → token utilities |

---

### Task 1: Lock new theme contract tests (TDD)

**Files:**
- Modify: `frontend/src/shared/ui/theme.test.tsx`
- Test: same file

**Interfaces:**
- Consumes: none
- Produces: failing contract that defines exact light `:root` values from `DESIGN.md`

- [ ] **Step 1: Rewrite `referenceTokens` for light `:root`**

Replace the glass/umber expectations with Linear-tight light values (exact strings that will appear in `styles.css`):

```ts
const referenceTokens = [
  ['--background', '#FAFAF9'],
  ['--foreground', '#1C1917'],
  ['--card', '#FFFFFF'],
  ['--card-foreground', 'var(--foreground)'],
  ['--popover', '#FFFFFF'],
  ['--popover-foreground', 'var(--foreground)'],
  ['--primary', '#EA580C'],
  ['--primary-foreground', '#FFFFFF'],
  ['--primary-hover', '#C2410C'],
  ['--primary-control', 'var(--primary)'],
  ['--primary-control-hover', 'var(--primary-hover)'],
  ['--primary-control-active', '#9A3412'],
  ['--primary-control-foreground', 'var(--primary-foreground)'],
  ['--secondary', '#F5F5F4'],
  ['--secondary-foreground', '#1C1917'],
  ['--muted', '#F5F5F4'],
  ['--muted-foreground', '#78716C'],
  ['--accent', '#F5F5F4'],
  ['--accent-foreground', 'var(--foreground)'],
  ['--destructive', '#DC2626'],
  ['--destructive-foreground', '#FFFFFF'],
  ['--border', '#E7E5E4'],
  ['--input', '#E7E5E4'],
  ['--ring', '#EA580C'],
  ['--sidebar', '#FAFAF9'],
  ['--sidebar-foreground', '#1C1917'],
  ['--sidebar-primary', 'var(--primary)'],
  ['--sidebar-primary-foreground', 'var(--primary)'],
  ['--sidebar-accent', '#F5F5F4'],
  ['--sidebar-border', '#E7E5E4'],
  ['--radius-control', '0.375rem'],
  ['--radius-card', '0.5rem'],
  ['--radius-dialog', '0.75rem'],
  ['--radius-pill', '9999px'],
  ['--shadow-panel', 'none'],
  ['--shadow-overlay', '0 4px 16px rgba(0, 0, 0, 0.08)'],
] as const;
```

Also add a new test that asserts `.dark` block defines dark tokens:

```ts
it('defines dark-mode tokens under .dark', () => {
  expect(stylesheet).toMatch(/\.dark\s*\{[^}]*--background:\s*#0C0A09;/s);
  expect(stylesheet).toMatch(/\.dark\s*\{[^}]*--primary:\s*#F97316;/s);
  expect(stylesheet).toMatch(/\.dark\s*\{[^}]*--card:\s*#1C1917;/s);
});
```

Update `color-scheme` expectation: `:root` must use `color-scheme: light` (not `dark`).

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd frontend && npm test -- --run src/shared/ui/theme.test.tsx`
Expected: FAIL on old token values / missing `.dark`

- [ ] **Step 3: Do not implement yet** — Task 2 implements CSS

---

### Task 2: Rewrite `styles.css` tokens (light + dark)

**Files:**
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/shared/ui/theme.test.tsx`

**Interfaces:**
- Consumes: Task 1 contract strings
- Produces: runtime CSS variables for all components

- [ ] **Step 1: Set `:root` to light Linear-tight tokens**

At top of `:root`:

```css
:root {
  color-scheme: light;

  --background: #FAFAF9;
  --foreground: #1C1917;
  --card: #FFFFFF;
  --card-foreground: var(--foreground);
  --popover: #FFFFFF;
  --popover-foreground: var(--foreground);
  --primary: #EA580C;
  --primary-foreground: #FFFFFF;
  --primary-hover: #C2410C;
  --primary-soft: rgb(234 88 12 / 0.12);
  --primary-control: var(--primary);
  --primary-control-hover: var(--primary-hover);
  --primary-control-active: #9A3412;
  --primary-control-foreground: var(--primary-foreground);
  --secondary: #F5F5F4;
  --secondary-foreground: #1C1917;
  --muted: #F5F5F4;
  --muted-foreground: #78716C;
  --accent: #F5F5F4;
  --accent-foreground: var(--foreground);
  --destructive: #DC2626;
  --destructive-foreground: #FFFFFF;
  --border: #E7E5E4;
  --input: #E7E5E4;
  --ring: #EA580C;
  --sidebar: #FAFAF9;
  --sidebar-foreground: #1C1917;
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary);
  --sidebar-accent: #F5F5F4;
  --sidebar-border: #E7E5E4;
  --sidebar-ring: var(--ring);

  --font-display: var(--font-sans);
  --radius-control: 0.375rem;
  --radius-card: 0.5rem;
  --radius-dialog: 0.75rem;
  --radius-pill: 9999px;
  --shadow-panel: none;
  --shadow-overlay: 0 4px 16px rgba(0, 0, 0, 0.08);
  --focus-ring: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
}
```

Keep existing `--color-*` / `--ui-*` compatibility aliases pointing at these canonical tokens so feature classes (`text-ui-ink`, etc.) keep working during migration.

- [ ] **Step 2: Add `.dark` overrides**

```css
.dark {
  color-scheme: dark;

  --background: #0C0A09;
  --foreground: #FAFAF9;
  --card: #1C1917;
  --card-foreground: var(--foreground);
  --popover: #1C1917;
  --popover-foreground: var(--foreground);
  --primary: #F97316;
  --primary-foreground: #0C0A09;
  --primary-hover: #FB923C;
  --primary-soft: rgb(249 115 22 / 0.16);
  --primary-control: var(--primary);
  --primary-control-hover: var(--primary-hover);
  --primary-control-active: #FDBA74;
  --primary-control-foreground: var(--primary-foreground);
  --secondary: #1C1917;
  --secondary-foreground: #FAFAF9;
  --muted: #1C1917;
  --muted-foreground: #A8A29E;
  --accent: #292524;
  --accent-foreground: var(--foreground);
  --destructive: #F87171;
  --destructive-foreground: #0C0A09;
  --border: #292524;
  --input: #292524;
  --ring: #F97316;
  --sidebar: #0C0A09;
  --sidebar-foreground: #FAFAF9;
  --sidebar-primary: var(--primary);
  --sidebar-primary-foreground: var(--primary);
  --sidebar-accent: #1C1917;
  --sidebar-border: #292524;
  --shadow-overlay: 0 4px 16px rgba(0, 0, 0, 0.4);
}
```

- [ ] **Step 3: Neutralize glass utilities**

Map `.glass-field`, `.glass-panel`, `.glass-button` to flat backgrounds/borders (no blur/glow). Keep class names so existing JSX does not break. Remove or neutralize `--glow-primary` usage in `.flae-button-primary` (solid primary fill only).

- [ ] **Step 4: Run theme tests — expect PASS**

Run: `cd frontend && npm test -- --run src/shared/ui/theme.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit only if user asked**

```bash
git add frontend/src/styles.css frontend/src/shared/ui/theme.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): adopt Linear-tight light/dark design tokens

EOF
)"
```

---

### Task 3: Theme preference store + bootstrap

**Files:**
- Create: `frontend/src/core/stores/theme-store.ts`
- Create: `frontend/src/core/stores/theme-store.test.ts`
- Modify: `frontend/src/app/main.tsx` (call `applyTheme` before render)
- Create: `frontend/src/app/layout/ThemeToggle.tsx`
- Create: `frontend/src/app/layout/ThemeToggle.test.tsx`

**Interfaces:**
- Consumes: CSS `.dark` from Task 2
- Produces:
  - `useThemeStore(): { theme: 'light' | 'dark'; setTheme(theme); toggleTheme() }`
  - `applyStoredTheme(): void` — reads `localStorage['flae_theme']`, defaults `'light'`, sets/removes `document.documentElement.classList 'dark'`

- [ ] **Step 1: Write failing store tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { applyStoredTheme, useThemeStore } from './theme-store';

describe('theme-store', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    useThemeStore.setState({ theme: 'light' });
  });

  it('defaults to light and does not add .dark', () => {
    applyStoredTheme();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists dark and applies .dark class', () => {
    useThemeStore.getState().setTheme('dark');
    expect(localStorage.getItem('flae_theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd frontend && npm test -- --run src/core/stores/theme-store.test.ts`
Expected: FAIL (module missing)

- [ ] **Step 3: Implement store**

```ts
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'flae_theme';

function applyDom(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function readStoredTheme(): ThemeMode {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'dark' ? 'dark' : 'light';
}

export function applyStoredTheme() {
  const theme = readStoredTheme();
  useThemeStore.setState({ theme });
  applyDom(theme);
}

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyDom(theme);
    set({ theme });
  },
  toggleTheme: () => {
    get().setTheme(get().theme === 'light' ? 'dark' : 'light');
  },
}));
```

- [ ] **Step 4: Call `applyStoredTheme()` at top of `main.tsx` before `createRoot(...).render`**

- [ ] **Step 5: Implement `ThemeToggle` button**

```tsx
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../core/stores/theme-store';
import { Button } from '../../shared/ui/Button';

export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <Button
      aria-label={isDark ? t('SHELL.THEME_LIGHT') : t('SHELL.THEME_DARK')}
      onClick={toggleTheme}
      size="icon"
      type="button"
      variant="ghost"
    >
      {isDark ? <Sun aria-hidden className="h-4 w-4" /> : <Moon aria-hidden className="h-4 w-4" />}
    </Button>
  );
}
```

Add i18n keys `SHELL.THEME_LIGHT` / `SHELL.THEME_DARK` in existing locale JSON files (en + vi).

- [ ] **Step 6: Run store + toggle tests — expect PASS**

Run: `cd frontend && npm test -- --run src/core/stores/theme-store.test.ts src/app/layout/ThemeToggle.test.tsx`

---

### Task 4: Shared UI primitives — radius / no glass

**Files:**
- Modify: `frontend/src/shared/ui/Button.tsx`, `Input.tsx`, `Select.tsx`, `Dialog.tsx`, `Card.tsx`, `Badge.tsx`, `Tabs.tsx`
- Modify matching `*.test.tsx` only if class assertions break

**Interfaces:**
- Consumes: new `--radius-*` and colors from Task 2
- Produces: primitives that look Correct on light canvas without glass classes

- [ ] **Step 1: Update Button variants**

Ensure `primary` uses `bg-primary-control text-primary-control-foreground` (no glow class dependency). Keep `rounded-ui-control`. Remove any `flae-button-primary` requirement from Button if the utility is glow-based — either neutralize the utility (Task 2) or drop the class from Button.

- [ ] **Step 2: Dialog overlay**

Use `bg-background/50` (light) which becomes correct under `.dark` automatically; keep `rounded-ui-dialog`, `shadow-ui-overlay`.

- [ ] **Step 3: Run shared UI tests**

Run: `cd frontend && npm test -- --run src/shared/ui/`
Expected: PASS (update snapshots/class assertions if needed)

---

### Task 5: Hybrid shell — top bar + icon rail

**Files:**
- Modify: `frontend/src/app/layout/AppShell.tsx`
- Modify: `frontend/src/app/layout/AdminHeader.tsx`
- Modify: `frontend/src/app/layout/AdminSidebar.tsx`
- Modify: `frontend/src/app/layout/HeaderUtilities.tsx` (as needed)
- Modify: `frontend/src/app/layout/AppShell.test.tsx`, `AdminSidebar.test.tsx`
- Optionally simplify/remove: `SidebarStatusCard` from default rail (demo meter not in approved drafts)

**Interfaces:**
- Consumes: `ThemeToggle`, `navigationGroups`, workspace hooks already used by `AppShell`
- Produces: desktop layout = top bar full width + left rail 56px + main `pl-[56px]` (or `md:pl-14`)

- [ ] **Step 1: Write/adjust AppShell test for hybrid chrome**

```tsx
it('renders hybrid top bar and icon rail', () => {
  // render AppShell with router stubs as existing tests do
  expect(screen.getByRole('banner')).toBeInTheDocument();
  expect(screen.getByRole('navigation')).toBeInTheDocument();
  // rail links present
  expect(screen.getByRole('link', { name: /chat/i })).toBeInTheDocument();
});
```

Update/remove assertions that require expanded `lg:w-64` sidebar or `admin-shell-theme` glass cascade.

- [ ] **Step 2: Run — expect FAIL on old layout assumptions**

- [ ] **Step 3: Refactor `AdminHeader`**

Structure:

```tsx
<header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-3 md:px-4">
  {/* mobile nav open */}
  {/* brand mark + FLAE wordmark (link to /dashboard/chat) */}
  {/* workspace switcher from HeaderUtilities (extract left cluster) */}
  <div className="ml-auto flex items-center gap-2">
    <ThemeToggle />
    {/* language + profile from HeaderUtilities */}
  </div>
</header>
```

Remove disabled MCP / Add Source from chrome (or keep behind a single optional menu later). Page-level actions own Upload/Add Source.

- [ ] **Step 4: Refactor `AdminSidebar` to 56px icon rail**

- Fixed `w-14` (56px) on `md+`
- Icons only; `aria-label` from i18n; tooltip on hover (reuse `RailTooltipPortal` if present)
- Active item: muted pill behind icon + `text-primary` icon (not orange filled bar)
- Mobile: keep dialog/drawer behavior
- For v1: **remove expanded desktop mode** (`lg:w-64`) to match approved hybrid; delete `useSidebarLayout` toggle from chrome if unused

- [ ] **Step 5: Update `AppShell` padding**

```tsx
<div className="min-h-screen bg-background text-foreground">
  <AdminSidebar ... />
  <div className="md:pl-14">
    <AdminHeader ... />
    <main className={isChatWorkbenchPath(...) ? '...' : 'min-h-[calc(100vh-3.5rem)] px-4 py-5 md:px-6'}>
      <Outlet />
    </main>
  </div>
</div>
```

Drop `glass-field` wrapper class (or leave it if neutralized in Task 2).

- [ ] **Step 6: Run shell tests**

Run: `cd frontend && npm test -- --run src/app/layout/`
Expected: PASS

---

### Task 6: Knowledge library alignment

**Files:**
- Modify: `frontend/src/features/knowledge/pages/KnowledgeListPage.tsx`
- Modify: `frontend/src/features/knowledge/ui/KnowledgeLibraryToolbar.tsx`
- Modify: `frontend/src/features/knowledge/ui/DocumentTable.tsx`, `DocumentGrid.tsx`, `StatusBadge.tsx` (classNames only)
- Modify: `frontend/src/features/knowledge/pages/KnowledgeListPage.test.tsx` if needed

**Interfaces:**
- Consumes: new shell + tokens
- Produces: Knowledge page matching draft hierarchy (header actions, bordered library panel, list default)

- [ ] **Step 1: Replace hard-coded glass/ui classes on page chrome**

Page root / panel:

```tsx
<section className="flex flex-col gap-6">
  <PageHeader
    actions={/* Open graph outline, Add text secondary, Upload primary */}
    description={...}
    eyebrow={...}
    title={...}
  />
  <section className="overflow-hidden rounded-ui-panel border border-border bg-card">
    {/* library title row + toolbar + table/grid */}
  </section>
</section>
```

Prefer `border-border`, `bg-card`, `text-foreground`, `text-muted-foreground` over `ui-ink*` / glass classes where touched.

- [ ] **Step 2: Keep default view mode `list`** (already `DEFAULT_VIEW_MODE = "list"`)

- [ ] **Step 3: Run Knowledge tests**

Run: `cd frontend && npm test -- --run src/features/knowledge/`
Expected: PASS

---

### Task 7: Smoke remaining surfaces + acceptance check

**Files:**
- Touch only if broken by token rename: auth pages, chat chrome classes that hard-code umber hexes
- Modify: `frontend/src/shared/ui/plain-link-theme.test.ts` if link color still expects `--orb-amber`

**Interfaces:**
- Consumes: Tasks 2–6
- Produces: green frontend unit suite for touched areas; manual checklist

- [ ] **Step 1: Grep for leftover brand violations in shell paths**

```bash
cd frontend && grep -RIn "orb-primary\|glow-primary\|#141009\|glass-field" src/app/layout src/shared/ui src/styles.css | head -50
```

Fix stragglers in shell/primitives/styles only (feature deep polish can wait for Phase 4).

- [ ] **Step 2: Point `--color-link` at `var(--primary)` in `styles.css`** (replace orb-amber)

- [ ] **Step 3: Run focused frontend tests**

Run: `cd frontend && npm test -- --run src/shared/ui src/app/layout src/core/stores src/features/knowledge`
Expected: PASS

- [ ] **Step 4: Manual acceptance (engineer)**

1. Cold load → light theme, no `.dark` on `<html>`
2. Toggle → dark; reload → still dark
3. Desktop: top bar + 56px rail; Knowledge list readable
4. Primary buttons orange; no purple/glass glow on shell
5. Chat route still full-bleed workbench under new chrome

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Light default + dark tokens | 1–2 |
| Theme toggle + persist | 3 |
| Orange primary only | 2, 4 |
| Hybrid shell | 5 |
| Knowledge first feature | 6 |
| Primitives inherit tokens | 4 |
| Compatibility / no big-bang every page | 2 aliases + 7 |
| Phase 4 Chat/Agents/Settings polish | Deferred (token inheritance via Task 2; explicit layout polish later) |
| Backend unchanged | N/A |

## Out of this plan (follow-up)

- Dedicated Superdesign → code for Chat / Agents / Graph pages
- System theme (`prefers-color-scheme`) auto mode
- Removing Plus Jakarta font package from `package.json`
- Full purge of every `ui-ink*` / `glass-*` class across all features

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-09-22-flae-ui-redesign.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — same session, batch with checkpoints  

Which approach?
