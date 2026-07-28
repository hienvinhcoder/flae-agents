# Dashboard Home And Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Tailwind CSS v4 design system, shared primitives, reference-aligned authenticated shell, and typed static Dashboard Home at `/dashboard`.

**Architecture:** Keep `DESIGN.md` and `frontend/src/styles.css` as the human and executable sources of truth, then map those tokens through presentational shared components. The existing app shell is restyled rather than replaced, while the new `features/dashboard` domain owns typed fixtures and dashboard-specific panels. Existing authenticated routes and shell behavior remain intact.

**Tech Stack:** React 19, strict TypeScript, Tailwind CSS v4 CSS-first configuration, React Router, i18next, Lucide React, Vitest, React Testing Library, Playwright, axe-core.

---

## File Structure

### Design system and shared UI

- Modify `DESIGN.md` — document the reference palette, accessible orange foreground deviation, 10px base radius, compact dashboard density, and shell dimensions.
- Modify `frontend/src/styles.css` — replace the oversized-radius/shadow-heavy executable theme with the approved semantic tokens and Tailwind mappings.
- Modify `frontend/src/shared/ui/theme.test.tsx` — protect the new token and Tailwind contracts.
- Modify `frontend/src/shared/ui/Button.tsx` and `Button.test.tsx` — add outline and icon-only contracts while preserving loading semantics.
- Create `frontend/src/shared/ui/Card.tsx` and `Card.test.tsx` — reusable bordered surface with default, muted, and inverse variants.
- Create `frontend/src/shared/ui/Badge.tsx` and `Badge.test.tsx` — reusable category and status label.
- Modify `frontend/src/shared/ui/Input.tsx`, `Select.tsx`, `Table.tsx`, `Tabs.tsx`, `Dialog.tsx`, `PageHeader.tsx`, and `PageToolbar.tsx` plus their existing tests — align geometry and density without changing behavior.

### Dashboard domain

- Create `frontend/src/features/dashboard/types/dashboard.ts` — readonly dashboard model and constrained status/icon unions.
- Create `frontend/src/features/dashboard/dashboard-fixture.ts` and `dashboard-fixture.test.ts` — localized typed fixture builder.
- Create `frontend/src/features/dashboard/ui/DashboardHero.tsx` — inverse welcome hero and metric tiles.
- Create `frontend/src/features/dashboard/ui/KnowledgeGraphPreview.tsx` — static accessible graph preview.
- Create `frontend/src/features/dashboard/ui/RecentMemoryPanel.tsx` — recent updates and Knowledge link.
- Create `frontend/src/features/dashboard/ui/AgentContextPanel.tsx` — demo-only MCP connection panel.
- Create `frontend/src/features/dashboard/ui/ConnectedAgentsPanel.tsx` — agent statuses and Agents link.
- Create `frontend/src/features/dashboard/ui/RisksPanel.tsx` — non-color risk signals.
- Create `frontend/src/features/dashboard/ui/ConnectedSourcesPanel.tsx` — source cards and demo-only management action.
- Create `frontend/src/features/dashboard/pages/DashboardHomePage.tsx` and `DashboardHomePage.test.tsx` — page composition and user-visible behavior tests.

### Shell, navigation, and localization

- Modify `frontend/src/app/router/router.tsx` and `router.test.tsx` — render Home at the dashboard index and preserve Briefing.
- Modify `frontend/src/app/layout/admin-navigation.ts` and `admin-navigation.test.ts` — add exact-match Overview navigation.
- Create `frontend/src/app/layout/SidebarStatusCard.tsx` and `SidebarStatusCard.test.tsx` — indexing-status presentation extracted from the already-large sidebar.
- Create `frontend/src/app/layout/HeaderUtilities.tsx` — focused workspace, language, identity, and logout controls used by the search-led header.
- Modify `frontend/src/app/layout/AdminSidebar.tsx` and `AdminSidebar.test.tsx` — dark reference shell, 256px expansion, status card, and preserved accessible drawer.
- Modify `frontend/src/app/layout/AdminHeader.tsx` and `AdminHeader.test.tsx` — 64px search-led header with preserved workspace, locale, user, and logout controls.
- Modify `frontend/src/app/layout/AppShell.tsx` and `AppShell.test.tsx` — 256px layout offset, 64px header calculation, compact content container, and unchanged sync/error lifecycle.
- Modify `frontend/public/assets/i18n/en.json` and `vi.json` — Overview, shell demo labels, and Dashboard Home content.

### End-to-end verification

- Create `frontend/tests/e2e/dashboard-home.spec.ts` — Home content, route links, accessibility, and four viewport checks.
- Modify `frontend/tests/e2e/admin-shell.spec.ts` — update approved shell widths and header height while retaining collapse/drawer/reduced-motion coverage.

## Task 1: Lock The Reference Design-System Contract

**Files:**
- Modify: `DESIGN.md`
- Modify: `frontend/src/styles.css:1-338`
- Modify: `frontend/src/shared/ui/theme.test.tsx:1-348`
- Test: `frontend/src/shared/ui/reduced-motion.test.tsx`

- [ ] **Step 1: Replace the old theme expectations with failing reference-token assertions**

In `frontend/src/shared/ui/theme.test.tsx`, replace the old hex/radius arrays with this contract and retain the existing Tailwind/Vite integration assertions:

```ts
const expectedReferenceTokens = [
  ['--color-primary', 'oklch(70.5% 0.187 45)'],
  ['--color-primary-soft', 'oklch(93% 0.06 60)'],
  ['--color-canvas', 'oklch(98.5% 0.006 85)'],
  ['--color-surface', 'oklch(100% 0 0)'],
  ['--color-surface-raised', 'oklch(100% 0 0)'],
  ['--color-surface-interactive', 'oklch(94% 0.012 85)'],
  ['--color-divider', 'oklch(90% 0.015 80)'],
  ['--color-text', 'oklch(18% 0.02 60)'],
  ['--color-text-secondary', 'oklch(25% 0.02 60)'],
  ['--color-text-muted', 'oklch(48% 0.02 60)'],
  ['--color-on-primary', '#2a241c'],
  ['--sidebar', 'oklch(22% 0.02 60)'],
  ['--sidebar-foreground', 'oklch(94% 0.012 85)'],
  ['--sidebar-accent', 'oklch(28% 0.02 60)'],
  ['--sidebar-border', 'oklch(30% 0.02 60)'],
  ['--radius-control', '0.5rem'],
  ['--radius-card', '0.625rem'],
  ['--radius-dialog', '0.875rem'],
  ['--radius-pill', '9999px'],
] as const;

it('defines the approved dashboard reference tokens', () => {
  for (const [token, value] of expectedReferenceTokens) {
    expectToken(token, value);
  }
});

it('uses the accessible foreground approved for the orange surface', () => {
  expect(stylesheet).toMatch(/--color-on-primary:\s*#2a241c;/i);
  expect(contrastRatio('#2a241c', '#f97316')).toBeGreaterThanOrEqual(4.5);
});
```

Update the theme-mapping expectation so `--color-sidebar`, `--color-sidebar-foreground`, `--color-sidebar-accent`, and `--color-sidebar-border` are exposed through `@theme inline`.

Replace the old contrast test, which can only parse hex-valued source tokens, with explicit documented reference pairs and remove `readHexToken`:

```ts
it('meets contrast requirements for approved text pairings', () => {
  const pairings = [
    ['primary button label', '#2a241c', '#f97316', 4.5],
    ['body text on canvas', '#1f1b15', '#faf8f3', 4.5],
    ['muted text on card', '#6e6558', '#ffffff', 4.5],
    ['link on canvas', '#9a3412', '#faf8f3', 4.5],
    ['sidebar text', '#eae6db', '#2a241c', 4.5],
  ] as const;

  for (const [name, foreground, background, minimum] of pairings) {
    expect(contrastRatio(foreground, background), name).toBeGreaterThanOrEqual(minimum);
  }
});
```

- [ ] **Step 2: Run the focused theme tests and verify the intended failure**

Run:

```bash
cd frontend
npm test -- src/shared/ui/theme.test.tsx src/shared/ui/reduced-motion.test.tsx
```

Expected: FAIL because the current canvas, surface, radius, sidebar, and primary-foreground tokens do not match the approved contract.

- [ ] **Step 3: Implement the canonical CSS token block and mappings**

Replace the current color/radius/shadow source tokens in `frontend/src/styles.css` with the following values while retaining the existing font, spacing, motion, status, and breakpoint declarations:

```css
:root {
  color-scheme: light;

  --color-primary: oklch(70.5% 0.187 45);
  --color-primary-hover: oklch(66.5% 0.187 45);
  --color-primary-active: oklch(62.5% 0.187 45);
  --color-primary-soft: oklch(93% 0.06 60);
  --color-canvas: oklch(98.5% 0.006 85);
  --color-surface: oklch(100% 0 0);
  --color-surface-raised: oklch(100% 0 0);
  --color-surface-interactive: oklch(94% 0.012 85);
  --color-divider: oklch(90% 0.015 80);
  --color-border: oklch(90% 0.015 80);
  --color-border-control: #776f64;
  --color-border-strong: #4b443b;
  --color-text: oklch(18% 0.02 60);
  --color-text-secondary: oklch(25% 0.02 60);
  --color-text-muted: oklch(48% 0.02 60);
  --color-text-disabled: #7a746b;
  --color-on-primary: #2a241c;
  --color-link: #9a3412;
  --color-focus: #9a3412;
  --color-ai: #9a3412;
  --color-ai-soft: oklch(93% 0.06 60);
  --sidebar: oklch(22% 0.02 60);
  --sidebar-foreground: oklch(94% 0.012 85);
  --sidebar-accent: oklch(28% 0.02 60);
  --sidebar-border: oklch(30% 0.02 60);
  --color-success: #0f6b3d;
  --color-success-soft: #e1f2e8;
  --color-warning: #8a5a00;
  --color-warning-soft: #fff0c2;
  --color-danger: #b42318;
  --color-danger-soft: #fee4e2;
  --color-info: #1d5e91;
  --color-info-soft: #e0effa;

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-control: 0.5rem;
  --radius-lg: 0.625rem;
  --radius-xl: 0.875rem;
  --radius-card: 0.625rem;
  --radius-dialog: 0.875rem;
  --radius-pill: 9999px;

  --shadow-panel: 0 1px 2px oklch(20% 0.03 60 / 0.04);
  --shadow-overlay: 0 18px 48px -16px oklch(20% 0.03 60 / 0.28);
  --focus-ring: 0 0 0 4px rgba(154, 52, 18, 0.18);
}
```

Add these mappings inside the existing `@theme inline` block:

```css
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-border: var(--sidebar-border);
  --radius-ui-dialog: var(--radius-dialog);
```

Change `.surface-panel` to use the white raised surface, 10px radius, one-pixel border, and no inline shadow:

```css
.surface-panel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface-raised);
}
```

Remove the active `translateY` from `.button-primary` so pressed states do not move layout.

- [ ] **Step 4: Update `DESIGN.md` to match the executable theme**

Document the exact core table from the approved spec, the 256px expanded sidebar, 72px rail, 64px header, 1600px content maximum, and this explicit accessibility note:

```md
### Narrow reference deviation

The saved reference uses near-white small text on the orange primary surface. That
pairing measures approximately 2.72:1. FLAE keeps the reference orange but uses
`#2A241C` for small button and active-navigation text, producing approximately
5.48:1 contrast and meeting WCAG AA.
```

- [ ] **Step 5: Run theme tests and commit**

Run:

```bash
cd frontend
npm test -- src/shared/ui/theme.test.tsx src/shared/ui/reduced-motion.test.tsx
```

Expected: PASS.

Commit:

```bash
git add DESIGN.md frontend/src/styles.css frontend/src/shared/ui/theme.test.tsx
git commit -m "feat: align dashboard design tokens"
```

## Task 2: Add Card, Badge, And Complete Button Variants

**Files:**
- Create: `frontend/src/shared/ui/Card.tsx`
- Create: `frontend/src/shared/ui/Card.test.tsx`
- Create: `frontend/src/shared/ui/Badge.tsx`
- Create: `frontend/src/shared/ui/Badge.test.tsx`
- Modify: `frontend/src/shared/ui/Button.tsx`
- Modify: `frontend/src/shared/ui/Button.test.tsx`

- [ ] **Step 1: Write failing shared-primitive tests**

Create `Card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './Card';

describe('Card', () => {
  it('renders a semantic surface with selectable padding and variant', () => {
    render(<Card as="section" aria-label="Memory" padding="sm" variant="muted">Content</Card>);

    expect(screen.getByRole('region', { name: 'Memory' })).toHaveClass(
      'border', 'border-ui-divider', 'rounded-ui-panel', 'bg-ui-interactive', 'p-4',
    );
  });

  it('provides an inverse surface without changing content semantics', () => {
    render(<Card as="article" aria-label="Welcome" variant="inverse">Welcome</Card>);

    expect(screen.getByRole('article', { name: 'Welcome' })).toHaveClass(
      'bg-sidebar', 'text-sidebar-foreground',
    );
  });
});
```

Create `Badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './Badge';

describe('Badge', () => {
  it.each(['neutral', 'primary', 'success', 'warning', 'destructive'] as const)(
    'renders the %s semantic variant',
    (variant) => {
      render(<Badge variant={variant}>Connected</Badge>);
      expect(screen.getByText('Connected')).toHaveAttribute('data-variant', variant);
    },
  );
});
```

In `Button.test.tsx`, replace the existing `min-h-11` expectation with `min-h-10`, then add:

```tsx
it('uses the approved 40px minimum target', () => {
  render(<Button>Save</Button>);
  expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('min-h-10');
});

it('supports outline and icon-only contracts without shrinking the target', () => {
  render(<Button aria-label="Add source" size="icon" variant="outline">+</Button>);

  expect(screen.getByRole('button', { name: 'Add source' })).toHaveClass(
    'min-h-10', 'min-w-10', 'border-ui-divider', 'bg-ui-raised',
  );
});
```

- [ ] **Step 2: Run the tests and verify missing-module/prop failures**

Run:

```bash
cd frontend
npm test -- src/shared/ui/Card.test.tsx src/shared/ui/Badge.test.tsx src/shared/ui/Button.test.tsx
```

Expected: FAIL because `Card`, `Badge`, `size`, and `outline` do not exist.

- [ ] **Step 3: Implement `Card`**

Create `frontend/src/shared/ui/Card.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react';

type CardElement = 'article' | 'div' | 'section';
type CardPadding = 'none' | 'sm' | 'md';
type CardVariant = 'default' | 'inverse' | 'muted';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  children: ReactNode;
  padding?: CardPadding;
  variant?: CardVariant;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
};

const variantClasses: Record<CardVariant, string> = {
  default: 'border-ui-divider bg-ui-raised text-ui-ink',
  inverse: 'border-sidebar-border bg-sidebar text-sidebar-foreground',
  muted: 'border-ui-divider bg-ui-interactive text-ui-ink',
};

export function Card({
  as: Element = 'div',
  children,
  className = '',
  padding = 'md',
  variant = 'default',
  ...props
}: CardProps) {
  return (
    <Element
      {...props}
      className={`rounded-ui-panel border ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </Element>
  );
}
```

- [ ] **Step 4: Implement `Badge`**

Create `frontend/src/shared/ui/Badge.tsx`:

```tsx
import type { HTMLAttributes } from 'react';

export type BadgeVariant = 'destructive' | 'neutral' | 'primary' | 'success' | 'warning';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  destructive: 'bg-state-danger-soft text-state-danger',
  neutral: 'bg-ui-interactive text-ui-ink-secondary',
  primary: 'bg-brand-soft text-brand-text',
  success: 'bg-state-success-soft text-state-success',
  warning: 'bg-state-warning-soft text-state-warning',
};

export function Badge({ children, className = '', variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1 rounded-ui-status px-2 py-1 text-xs font-medium ${variantClasses[variant]} ${className}`}
      data-variant={variant}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 5: Implement the Button variants**

Replace `Button.tsx` with:

```tsx
import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonSize = 'default' | 'icon' | 'sm';
type ButtonVariant = 'danger' | 'ghost' | 'outline' | 'primary' | 'secondary';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  pill?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'min-h-10 px-4 py-2',
  icon: 'min-h-10 min-w-10 p-2',
  sm: 'min-h-10 px-3 py-1.5 text-sm',
};

const variantClasses: Record<ButtonVariant, string> = {
  danger: 'border-state-danger bg-state-danger-soft text-state-danger hover:bg-ui-interactive',
  ghost: 'border-transparent bg-transparent text-ui-ink-secondary hover:bg-ui-interactive hover:text-ui-ink',
  outline: 'border-ui-divider bg-ui-raised text-ui-ink hover:bg-ui-interactive',
  primary: 'button-primary border-transparent bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active',
  secondary: 'border-ui-divider bg-ui-interactive text-ui-ink hover:bg-ui-panel',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className = '',
    disabled,
    isLoading = false,
    loadingText = 'Loading',
    pill = false,
    size = 'default',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      aria-busy={isLoading || undefined}
      className={`inline-flex items-center justify-center gap-2 border font-semibold transition-colors duration-200 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 ${pill ? 'rounded-ui-status' : 'rounded-ui-control'} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      ref={ref}
    >
      {isLoading ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
      {isLoading ? loadingText : children}
    </button>
  );
});
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
cd frontend
npm test -- src/shared/ui/Card.test.tsx src/shared/ui/Badge.test.tsx src/shared/ui/Button.test.tsx
```

Expected: PASS.

Commit:

```bash
git add frontend/src/shared/ui/Card.tsx frontend/src/shared/ui/Card.test.tsx frontend/src/shared/ui/Badge.tsx frontend/src/shared/ui/Badge.test.tsx frontend/src/shared/ui/Button.tsx frontend/src/shared/ui/Button.test.tsx
git commit -m "feat: add dashboard surface primitives"
```

## Task 3: Align Existing Shared Components With Dashboard Density

**Files:**
- Modify: `frontend/src/shared/ui/Input.tsx`
- Modify: `frontend/src/shared/ui/Input.test.tsx`
- Modify: `frontend/src/shared/ui/Select.tsx`
- Modify: `frontend/src/shared/ui/Select.test.tsx`
- Modify: `frontend/src/shared/ui/Table.tsx`
- Modify: `frontend/src/shared/ui/Table.test.tsx`
- Modify: `frontend/src/shared/ui/Tabs.tsx`
- Modify: `frontend/src/shared/ui/Tabs.test.tsx`
- Modify: `frontend/src/shared/ui/Dialog.tsx`
- Modify: `frontend/src/shared/ui/Dialog.test.tsx`
- Modify: `frontend/src/shared/ui/PageHeader.tsx`
- Modify: `frontend/src/shared/ui/PageHeader.test.tsx`
- Modify: `frontend/src/shared/ui/PageToolbar.tsx`
- Modify: `frontend/src/shared/ui/PageToolbar.test.tsx`

- [ ] **Step 1: Add failing visual-contract assertions without changing behavioral tests**

Add these assertions to the existing focused tests:

```tsx
expect(screen.getByRole('textbox', { name: 'Email' })).toHaveClass(
  'min-h-10', 'rounded-ui-control', 'border-ui-line', 'bg-ui-raised', 'shadow-none',
);

expect(screen.getByRole('combobox', { name: 'Role' })).toHaveClass(
  'min-h-10', 'rounded-ui-control', 'border-ui-line', 'bg-ui-raised', 'shadow-none',
);

expect(screen.getByRole('row', { name: 'Ada' })).toHaveClass(
  'hover:bg-ui-interactive', 'motion-reduce:transition-none',
);

expect(screen.getByRole('tab', { name: 'Members' })).toHaveClass(
  'rounded-ui-control', 'min-h-10',
);
```

Replace the existing `min-h-11` expectations in `Input.test.tsx`, `Select.test.tsx`, and `Tabs.test.tsx` with `min-h-10`; preserve their reduced-motion assertions.

In `Dialog.test.tsx`, assert the dialog uses `rounded-ui-dialog`, `border-ui-divider`, and `bg-ui-raised`. In `PageHeader.test.tsx` and `PageToolbar.test.tsx`, assert compact gaps and divider-based surfaces rather than panel shadows.

- [ ] **Step 2: Run focused tests and verify failures**

Run:

```bash
cd frontend
npm test -- src/shared/ui/Input.test.tsx src/shared/ui/Select.test.tsx src/shared/ui/Table.test.tsx src/shared/ui/Tabs.test.tsx src/shared/ui/Dialog.test.tsx src/shared/ui/PageHeader.test.tsx src/shared/ui/PageToolbar.test.tsx
```

Expected: FAIL on the old shadow, height, radius, or density classes while all behavior assertions remain valid.

- [ ] **Step 3: Apply the approved Input and Select contracts**

Use these exact control class strings in `Input.tsx` and `Select.tsx`:

```ts
const inputClasses = 'min-h-10 w-full rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2 text-ui-ink shadow-none transition-colors duration-200 placeholder:text-ui-ink-muted hover:border-ui-line-strong focus:border-brand-text focus:outline-none motion-reduce:transition-none';

const selectClasses = 'min-h-10 w-full appearance-none rounded-ui-control border border-ui-line bg-ui-raised py-2 pl-3 pr-10 text-sm font-medium text-ui-ink shadow-none transition-colors duration-200 hover:border-ui-line-strong focus:border-brand-text focus:outline-none motion-reduce:transition-none';
```

- [ ] **Step 4: Apply the approved Table and Tabs contracts**

Use these exact class strings in the existing Table row/header and Tabs trigger locations without changing their render or keyboard logic:

```ts
const tableHeaderClasses = 'border-y border-ui-divider bg-ui-interactive/70 text-ui-ink-secondary';
const tableRowClasses = 'transition-colors duration-200 hover:bg-ui-interactive motion-reduce:transition-none';
const tabClasses = 'min-h-10 rounded-ui-control px-3 py-2 text-sm font-medium transition-colors duration-200 motion-reduce:transition-none';
```

- [ ] **Step 5: Apply the approved Dialog and page-layout contracts**

Use these exact class strings at the existing dialog panel, page header root, and toolbar root:

```ts
const dialogPanelClasses = 'w-full max-w-lg rounded-ui-dialog border border-ui-divider bg-ui-raised p-5 text-ui-ink shadow-ui-overlay sm:p-6';
const pageHeaderClasses = 'flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between';
const toolbarClasses = 'flex flex-wrap items-end gap-3 border-y border-ui-divider bg-ui-interactive/60 px-3 py-3 sm:px-4';
```

Keep visible labels, `aria-describedby`, tab keyboard behavior, dialog focus trapping, table mobile rendering, and all existing prop signatures unchanged.

- [ ] **Step 6: Run tests and commit**

Run the focused command from Step 2.

Expected: PASS.

Commit:

```bash
git add frontend/src/shared/ui/Input.tsx frontend/src/shared/ui/Input.test.tsx frontend/src/shared/ui/Select.tsx frontend/src/shared/ui/Select.test.tsx frontend/src/shared/ui/Table.tsx frontend/src/shared/ui/Table.test.tsx frontend/src/shared/ui/Tabs.tsx frontend/src/shared/ui/Tabs.test.tsx frontend/src/shared/ui/Dialog.tsx frontend/src/shared/ui/Dialog.test.tsx frontend/src/shared/ui/PageHeader.tsx frontend/src/shared/ui/PageHeader.test.tsx frontend/src/shared/ui/PageToolbar.tsx frontend/src/shared/ui/PageToolbar.test.tsx
git commit -m "refactor: align shared ui density"
```

## Task 4: Define Localized Dashboard Types And Fixture

**Files:**
- Create: `frontend/src/features/dashboard/types/dashboard.ts`
- Create: `frontend/src/features/dashboard/dashboard-fixture.ts`
- Create: `frontend/src/features/dashboard/dashboard-fixture.test.ts`
- Modify: `frontend/public/assets/i18n/en.json`
- Modify: `frontend/public/assets/i18n/vi.json`

- [ ] **Step 1: Write the failing fixture contract test**

Create `dashboard-fixture.test.ts`:

```ts
import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { createDashboardFixture } from './dashboard-fixture';

const t = ((key: string) => key) as unknown as TFunction;

describe('dashboard fixture', () => {
  it('provides stable identifiers and every approved section', () => {
    const fixture = createDashboardFixture(t);

    expect(fixture.metrics.map((item) => item.id)).toEqual([
      'documents', 'repositories', 'people', 'memory-nodes',
    ]);
    expect(fixture.graph.nodes.some((node) => node.kind === 'memory')).toBe(true);
    expect(fixture.recentMemory).toHaveLength(3);
    expect(fixture.agents.map((agent) => agent.status)).toEqual(['active', 'idle', 'active']);
    expect(fixture.risks.map((risk) => risk.severity)).toEqual(['warning', 'neutral', 'neutral']);
    expect(fixture.sources).toHaveLength(8);
    expect(new Set(fixture.sources.map((source) => source.id)).size).toBe(8);
  });
});
```

- [ ] **Step 2: Run the fixture test and verify missing-module failure**

Run:

```bash
cd frontend
npm test -- src/features/dashboard/dashboard-fixture.test.ts
```

Expected: FAIL because the dashboard types and fixture modules do not exist.

- [ ] **Step 3: Create the readonly model**

Create `types/dashboard.ts`:

```ts
export type AgentStatus = 'active' | 'idle';
export type DashboardIcon = 'agents' | 'documents' | 'memory' | 'people' | 'repositories' | 'sources';
export type RiskSeverity = 'neutral' | 'warning';
export type SourceStatus = 'available' | 'connected';

export interface DashboardMetric {
  readonly icon: DashboardIcon;
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface DashboardGraphNode {
  readonly id: string;
  readonly kind: 'decision' | 'document' | 'memory' | 'person' | 'project';
  readonly label: string;
}

export interface DashboardMemoryUpdate {
  readonly id: string;
  readonly source: string;
  readonly status: string;
  readonly title: string;
  readonly updatedAt: string;
}

export interface DashboardAgent {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly status: AgentStatus;
}

export interface DashboardRisk {
  readonly id: string;
  readonly label: string;
  readonly severity: RiskSeverity;
}

export interface DashboardSource {
  readonly detail: string;
  readonly id: string;
  readonly mark: string;
  readonly name: string;
  readonly status: SourceStatus;
}

export interface DashboardFixture {
  readonly agentContext: { readonly description: string; readonly title: string };
  readonly agents: readonly DashboardAgent[];
  readonly graph: { readonly description: string; readonly nodes: readonly DashboardGraphNode[]; readonly title: string };
  readonly hero: {
    readonly description: string;
    readonly emphasis: string;
    readonly prompts: readonly string[];
    readonly syncStatus: string;
    readonly title: string;
  };
  readonly metrics: readonly DashboardMetric[];
  readonly recentMemory: readonly DashboardMemoryUpdate[];
  readonly risks: readonly DashboardRisk[];
  readonly sources: readonly DashboardSource[];
}
```

- [ ] **Step 4: Add localized Dashboard Home copy**

Add a `DASHBOARD_HOME` object to both locale JSON files with the same key shape. Use these exact English values:

```json
{
  "TITLE": "Overview",
  "SYNC_STATUS": "Memory synced across 8 sources",
  "WELCOME": "Welcome back, Amelia",
  "DESCRIPTION": "Your company memory has ingested",
  "EMPHASIS": "2,341 new items in the last 24 hours",
  "PROMPT_PRICING": "What did we decide about Q3 pricing?",
  "PROMPT_OWNER": "Who owns the payments migration?",
  "PROMPT_RISKS": "Summarize risks flagged this week",
  "DOCUMENTS": "Documents",
  "REPOSITORIES": "Repositories",
  "PEOPLE": "People",
  "MEMORY_NODES": "Memory nodes",
  "KNOWLEDGE_GRAPH": "Knowledge graph",
  "KNOWLEDGE_GRAPH_DESCRIPTION": "Live relationships across people, projects, decisions, documents, and risks.",
  "RECENT_MEMORY": "Recent memory updates",
  "EXPLORE": "Explore",
  "VIEW_ALL": "View all",
  "AGENT_CONTEXT": "Give your AI agents context",
  "AGENT_CONTEXT_DESCRIPTION": "Connect Codex, Claude, Cursor, and OpenClaw to accurate company memory through MCP.",
  "CONNECTED_AGENTS": "Connected agents",
  "RISKS": "Risks & gaps",
  "CONNECTED_SOURCES": "Connected sources",
  "CONNECTED_SOURCES_DESCRIPTION": "Every source becomes part of your company memory in real time.",
  "MANAGE_CONNECTORS": "Manage connectors",
  "COPY_CONNECTION": "Copy connection",
  "VIEW_AGENTS": "View agents",
  "STATUS_ACTIVE": "Active",
  "STATUS_IDLE": "Idle",
  "STATUS_CONNECTED": "Connected",
  "STATUS_AVAILABLE": "Add",
  "WARNING": "Warning",
  "NOTICE": "Notice",
  "DEMO_ONLY": "Preview only; this action is not connected yet."
}
```

Use this exact Vietnamese object:

```json
{
  "TITLE": "Tổng quan",
  "SYNC_STATUS": "Bộ nhớ đã đồng bộ từ 8 nguồn",
  "WELCOME": "Chào mừng trở lại, Amelia",
  "DESCRIPTION": "Bộ nhớ doanh nghiệp của bạn đã tiếp nhận",
  "EMPHASIS": "2.341 mục mới trong 24 giờ qua",
  "PROMPT_PRICING": "Chúng ta đã quyết định gì về giá Q3?",
  "PROMPT_OWNER": "Ai phụ trách việc chuyển đổi hệ thống thanh toán?",
  "PROMPT_RISKS": "Tóm tắt các rủi ro được ghi nhận tuần này",
  "DOCUMENTS": "Tài liệu",
  "REPOSITORIES": "Kho mã nguồn",
  "PEOPLE": "Nhân sự",
  "MEMORY_NODES": "Nút bộ nhớ",
  "KNOWLEDGE_GRAPH": "Đồ thị tri thức",
  "KNOWLEDGE_GRAPH_DESCRIPTION": "Quan hệ trực tiếp giữa con người, dự án, quyết định, tài liệu và rủi ro.",
  "RECENT_MEMORY": "Cập nhật bộ nhớ gần đây",
  "EXPLORE": "Khám phá",
  "VIEW_ALL": "Xem tất cả",
  "AGENT_CONTEXT": "Cung cấp ngữ cảnh cho các trợ lý AI",
  "AGENT_CONTEXT_DESCRIPTION": "Kết nối Codex, Claude, Cursor và OpenClaw với bộ nhớ doanh nghiệp chính xác qua MCP.",
  "CONNECTED_AGENTS": "Trợ lý đã kết nối",
  "RISKS": "Rủi ro và khoảng trống",
  "CONNECTED_SOURCES": "Nguồn đã kết nối",
  "CONNECTED_SOURCES_DESCRIPTION": "Mỗi nguồn trở thành một phần của bộ nhớ doanh nghiệp theo thời gian thực.",
  "MANAGE_CONNECTORS": "Quản lý nguồn kết nối",
  "COPY_CONNECTION": "Sao chép kết nối",
  "VIEW_AGENTS": "Xem trợ lý",
  "STATUS_ACTIVE": "Đang hoạt động",
  "STATUS_IDLE": "Đang chờ",
  "STATUS_CONNECTED": "Đã kết nối",
  "STATUS_AVAILABLE": "Thêm",
  "WARNING": "Cảnh báo",
  "NOTICE": "Thông tin",
  "DEMO_ONLY": "Chỉ là bản xem trước; thao tác này chưa được kết nối."
}
```

- [ ] **Step 5: Build the typed localized fixture**

Create `dashboard-fixture.ts` with a `createDashboardFixture(t: TFunction): DashboardFixture` function. Populate it with the exact metric values `12.4k`, `38`, `214`, and `42.1k`; graph nodes for Company Memory, Q3 Pricing, Payments Migration, Amelia Reed, Enterprise Security, and Onboarding v2; three recent-memory rows; Codex/Cursor/OpenClaw agents; three risks; and Google Drive/Notion/Slack/GitHub/Linear/Confluence/Jira/Figma sources. Translate all headings and descriptive copy through `t('DASHBOARD_HOME.<KEY>')`; stable proper names and numeric fixture values remain literals.

The returned object must satisfy `DashboardFixture` without `any`:

```ts
import type { TFunction } from 'i18next';

import type { DashboardFixture } from './types/dashboard';

export function createDashboardFixture(t: TFunction): DashboardFixture {
  return {
    agentContext: {
      description: t('DASHBOARD_HOME.AGENT_CONTEXT_DESCRIPTION'),
      title: t('DASHBOARD_HOME.AGENT_CONTEXT'),
    },
    agents: [
      { id: 'codex', name: 'Codex', role: 'Repo assistant', status: 'active' },
      { id: 'cursor', name: 'Cursor', role: 'Engineering', status: 'idle' },
      { id: 'openclaw', name: 'OpenClaw', role: 'Ops automation', status: 'active' },
    ],
    graph: {
      description: t('DASHBOARD_HOME.KNOWLEDGE_GRAPH_DESCRIPTION'),
      nodes: [
        { id: 'memory', kind: 'memory', label: 'Company Memory' },
        { id: 'pricing', kind: 'decision', label: 'Q3 Pricing' },
        { id: 'payments', kind: 'project', label: 'Payments Migration' },
        { id: 'amelia', kind: 'person', label: 'Amelia Reed' },
        { id: 'security', kind: 'document', label: 'Enterprise Security' },
        { id: 'onboarding', kind: 'project', label: 'Onboarding v2' },
      ],
      title: t('DASHBOARD_HOME.KNOWLEDGE_GRAPH'),
    },
    hero: {
      description: t('DASHBOARD_HOME.DESCRIPTION'),
      emphasis: t('DASHBOARD_HOME.EMPHASIS'),
      prompts: [
        t('DASHBOARD_HOME.PROMPT_PRICING'),
        t('DASHBOARD_HOME.PROMPT_OWNER'),
        t('DASHBOARD_HOME.PROMPT_RISKS'),
      ],
      syncStatus: t('DASHBOARD_HOME.SYNC_STATUS'),
      title: t('DASHBOARD_HOME.WELCOME'),
    },
    metrics: [
      { icon: 'documents', id: 'documents', label: t('DASHBOARD_HOME.DOCUMENTS'), value: '12.4k' },
      { icon: 'repositories', id: 'repositories', label: t('DASHBOARD_HOME.REPOSITORIES'), value: '38' },
      { icon: 'people', id: 'people', label: t('DASHBOARD_HOME.PEOPLE'), value: '214' },
      { icon: 'memory', id: 'memory-nodes', label: t('DASHBOARD_HOME.MEMORY_NODES'), value: '42.1k' },
    ],
    recentMemory: [
      { id: 'pricing-decision', source: 'Notion', status: 'Decision', title: 'Q3 pricing decision', updatedAt: '4m ago' },
      { id: 'payments-plan', source: 'GitHub', status: 'Project', title: 'Payments migration plan', updatedAt: '9m ago' },
      { id: 'security-notes', source: 'Drive', status: 'Document', title: 'Enterprise security notes', updatedAt: '12m ago' },
    ],
    risks: [
      { id: 'stale-ownership', label: 'Stale ownership on 3 critical docs', severity: 'warning' },
      { id: 'missing-decision', label: 'Undocumented decision in #leadership', severity: 'neutral' },
      { id: 'duplicate-specs', label: 'Duplicate specs for onboarding v2', severity: 'neutral' },
    ],
    sources: [
      { detail: '8,214 files · synced 2m ago', id: 'drive', mark: 'G', name: 'Google Drive', status: 'connected' },
      { detail: '1,982 pages · synced 4m ago', id: 'notion', mark: 'N', name: 'Notion', status: 'connected' },
      { detail: '42 channels · streaming', id: 'slack', mark: 'S', name: 'Slack', status: 'connected' },
      { detail: '38 repos · 12 PRs today', id: 'github', mark: 'G', name: 'GitHub', status: 'connected' },
      { detail: '612 issues · synced 8m ago', id: 'linear', mark: 'L', name: 'Linear', status: 'connected' },
      { detail: 'Not connected', id: 'confluence', mark: 'C', name: 'Confluence', status: 'available' },
      { detail: 'Not connected', id: 'jira', mark: 'J', name: 'Jira', status: 'available' },
      { detail: 'Not connected', id: 'figma', mark: 'F', name: 'Figma', status: 'available' },
    ],
  };
}
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
cd frontend
npm test -- src/features/dashboard/dashboard-fixture.test.ts src/shared/i18n/index.test.ts
```

Expected: PASS.

Commit:

```bash
git add frontend/src/features/dashboard/types/dashboard.ts frontend/src/features/dashboard/dashboard-fixture.ts frontend/src/features/dashboard/dashboard-fixture.test.ts frontend/public/assets/i18n/en.json frontend/public/assets/i18n/vi.json
git commit -m "feat: add typed dashboard fixture"
```

## Task 5: Build The Hero And Knowledge Graph Preview

**Files:**
- Create: `frontend/src/features/dashboard/ui/DashboardHero.tsx`
- Create: `frontend/src/features/dashboard/ui/KnowledgeGraphPreview.tsx`
- Create: `frontend/src/features/dashboard/ui/dashboard-primary-panels.test.tsx`

- [ ] **Step 1: Write failing render and accessibility tests**

Create `dashboard-primary-panels.test.tsx` with these imports, fixture, and assertions:

```tsx
import type { TFunction } from 'i18next';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { createDashboardFixture } from '../dashboard-fixture';
import { DashboardHero } from './DashboardHero';
import { KnowledgeGraphPreview } from './KnowledgeGraphPreview';

const translateKeys = ((key: string) => key === 'DASHBOARD_HOME.KNOWLEDGE_GRAPH_DESCRIPTION'
  ? 'Live relationships across company memory'
  : key) as unknown as TFunction;
const fixture = createDashboardFixture(translateKeys);

render(
  <>
    <DashboardHero hero={fixture.hero} metrics={fixture.metrics} demoLabel="Preview only" />
    <KnowledgeGraphPreview graph={fixture.graph} exploreLabel="Explore" />
  </>,
  { wrapper: MemoryRouter },
);

expect(screen.getByRole('heading', { name: 'DASHBOARD_HOME.WELCOME' })).toBeInTheDocument();
expect(screen.getByText('12.4k')).toBeInTheDocument();
for (const button of screen.getAllByRole('button')) {
  expect(button).toBeDisabled();
}
expect(screen.getByRole('img', { name: /live relationships/i })).toBeInTheDocument();
expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/dashboard/knowledge/graph');
```

- [ ] **Step 2: Run the test and verify missing-component failures**

Run:

```bash
cd frontend
npm test -- src/features/dashboard/ui/dashboard-primary-panels.test.tsx
```

Expected: FAIL because both components are missing.

- [ ] **Step 3: Implement `DashboardHero`**

Use `Card variant="inverse"`, Lucide `FileText`, `GitBranch`, `Users`, and `Workflow`, and a typed icon map keyed by `DashboardIcon`. Render the hero as a two-column layout at large widths and metrics as a 2×2 grid. Prompt chips are disabled buttons with `disabled:opacity-100`, a visible `title={demoLabel}`, and no callback.

The component signature and root structure are:

```tsx
import { Bot, FileText, GitBranch, Plug, Users, Workflow, type LucideIcon } from 'lucide-react';

import { Card } from '../../../shared/ui/Card';
import type { DashboardFixture, DashboardIcon, DashboardMetric } from '../types/dashboard';

const metricIcons: Record<DashboardIcon, LucideIcon> = {
  agents: Bot,
  documents: FileText,
  memory: Workflow,
  people: Users,
  repositories: GitBranch,
  sources: Plug,
};

export interface DashboardHeroProps {
  demoLabel: string;
  hero: DashboardFixture['hero'];
  metrics: readonly DashboardMetric[];
}

export function DashboardHero({ demoLabel, hero, metrics }: DashboardHeroProps) {
  return (
    <Card as="section" aria-labelledby="dashboard-welcome" className="relative overflow-hidden p-6 sm:p-8" variant="inverse">
      <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-ui-status bg-sidebar-accent px-3 py-1 text-xs">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
            {hero.syncStatus}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl" id="dashboard-welcome">{hero.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-sidebar-foreground/70 sm:text-base">
            {hero.description} <strong className="font-medium text-brand">{hero.emphasis}</strong>.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {hero.prompts.map((prompt) => (
              <button className="min-h-10 rounded-ui-status bg-sidebar-accent px-3 py-2 text-xs text-sidebar-foreground/80 disabled:cursor-not-allowed disabled:opacity-100" disabled key={prompt} title={demoLabel} type="button">{prompt}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => {
            const Icon = metricIcons[metric.icon];
            return <div className="rounded-ui-panel border border-sidebar-border bg-sidebar-accent/60 p-3" key={metric.id}><Icon aria-hidden className="h-4 w-4 text-brand" /><strong className="mt-2 block text-lg">{metric.value}</strong><span className="text-xs text-sidebar-foreground/60">{metric.label}</span></div>;
          })}
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Implement `KnowledgeGraphPreview`**

Render an accessible `role="img"` container with `aria-label={graph.description}`, a decorative SVG edge layer, and six labeled nodes in a responsive grid. Use the memory node as the orange-highlighted center and neutral bordered nodes for the other kinds. The `Explore` action is a React Router `Link` to `/dashboard/knowledge/graph`.

```tsx
import { Link } from 'react-router-dom';

import { Card } from '../../../shared/ui/Card';
import type { DashboardFixture } from '../types/dashboard';

export interface KnowledgeGraphPreviewProps {
  exploreLabel: string;
  graph: DashboardFixture['graph'];
}

export function KnowledgeGraphPreview({ exploreLabel, graph }: KnowledgeGraphPreviewProps) {
  return (
    <Card as="section" aria-labelledby="dashboard-graph-title">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="font-semibold tracking-tight" id="dashboard-graph-title">{graph.title}</h2><p className="mt-1 text-sm text-ui-ink-muted">{graph.description}</p></div>
        <Link className="text-sm font-medium text-ui-link" to="/dashboard/knowledge/graph">{exploreLabel}</Link>
      </div>
      <div aria-label={graph.description} className="relative mt-5 min-h-64 overflow-hidden rounded-ui-panel border border-ui-divider bg-ui-interactive/50 p-4" role="img">
        <svg aria-hidden className="absolute inset-0 h-full w-full text-ui-divider" viewBox="0 0 600 260"><path d="M300 130 110 55M300 130 490 55M300 130 95 205M300 130 505 205M300 130 300 30" fill="none" stroke="currentColor" /></svg>
        <ul className="relative grid min-h-56 grid-cols-2 content-between gap-4 sm:grid-cols-3">
          {graph.nodes.map((node) => <li className={node.kind === 'memory' ? 'rounded-ui-panel border border-brand bg-brand px-3 py-2 text-center text-sm font-semibold text-brand-foreground' : 'rounded-ui-panel border border-ui-divider bg-ui-raised px-3 py-2 text-center text-sm'} key={node.id}>{node.label}</li>)}
        </ul>
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Run tests and commit**

Run the focused test from Step 2. Expected: PASS.

Commit:

```bash
git add frontend/src/features/dashboard/ui/DashboardHero.tsx frontend/src/features/dashboard/ui/KnowledgeGraphPreview.tsx frontend/src/features/dashboard/ui/dashboard-primary-panels.test.tsx
git commit -m "feat: add dashboard hero and graph preview"
```

## Task 6: Build Secondary Panels And Compose Dashboard Home

**Files:**
- Create: `frontend/src/features/dashboard/ui/RecentMemoryPanel.tsx`
- Create: `frontend/src/features/dashboard/ui/AgentContextPanel.tsx`
- Create: `frontend/src/features/dashboard/ui/ConnectedAgentsPanel.tsx`
- Create: `frontend/src/features/dashboard/ui/RisksPanel.tsx`
- Create: `frontend/src/features/dashboard/ui/ConnectedSourcesPanel.tsx`
- Create: `frontend/src/features/dashboard/pages/DashboardHomePage.tsx`
- Create: `frontend/src/features/dashboard/pages/DashboardHomePage.test.tsx`

- [ ] **Step 1: Write the failing page behavior test**

Create `DashboardHomePage.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { TestI18nProvider } from '../../../../tests/TestI18nProvider';
import { DashboardHomePage } from './DashboardHomePage';

function renderPage() {
  return render(<TestI18nProvider><MemoryRouter><DashboardHomePage /></MemoryRouter></TestI18nProvider>);
}

describe('DashboardHomePage', () => {
  it('renders every approved section in document order', () => {
    renderPage();
    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent);
    const approvedOrder = [
      'Welcome back, Amelia', 'Knowledge graph', 'Recent memory updates',
      'Give your AI agents context', 'Connected agents', 'Risks & gaps', 'Connected sources',
    ];
    const positions = approvedOrder.map((heading) => headings.indexOf(heading));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(screen.getByText('12.4k')).toBeInTheDocument();
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
  });

  it('keeps real destinations navigable and demo controls inert', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/dashboard/knowledge');
    expect(screen.getByRole('link', { name: 'View agents' })).toHaveAttribute('href', '/dashboard/agents');
    const mcp = screen.getByRole('region', { name: 'Give your AI agents context' });
    expect(within(mcp).getByRole('button', { name: 'Copy connection' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Manage connectors' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the test and verify missing-page failure**

Run:

```bash
cd frontend
npm test -- src/features/dashboard/pages/DashboardHomePage.test.tsx
```

Expected: FAIL because the page and secondary panels do not exist.

- [ ] **Step 3: Implement the recent-memory panel**

Each panel uses `Card`, semantic headings/lists, and narrow typed props:

```tsx
// RecentMemoryPanel.tsx
import { Link } from 'react-router-dom';

import { Badge } from '../../../shared/ui/Badge';
import { Card } from '../../../shared/ui/Card';
import type { DashboardMemoryUpdate } from '../types/dashboard';

export function RecentMemoryPanel({ items, title, viewAllLabel }: { items: readonly DashboardMemoryUpdate[]; title: string; viewAllLabel: string }) {
  return <Card as="section" aria-labelledby="recent-memory-title"><div className="flex items-center justify-between"><h2 className="font-semibold" id="recent-memory-title">{title}</h2><Link className="text-sm text-ui-link" to="/dashboard/knowledge">{viewAllLabel}</Link></div><ul className="mt-4 divide-y divide-ui-divider">{items.map((item) => <li className="grid gap-1 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-3" key={item.id}><strong className="text-sm">{item.title}</strong><span className="text-xs text-ui-ink-muted">{item.source} · {item.updatedAt}</span><Badge variant="primary">{item.status}</Badge></li>)}</ul></Card>;
}
```

- [ ] **Step 4: Implement the MCP context and connected-agent panels**

```tsx

// AgentContextPanel.tsx
import { Bot } from 'lucide-react';

import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';

export function AgentContextPanel({ copyLabel, description, demoLabel, title }: { copyLabel: string; description: string; demoLabel: string; title: string }) {
  return <Card as="section" aria-label={title} className="bg-sidebar text-sidebar-foreground" variant="inverse"><Bot aria-hidden className="h-5 w-5 text-brand" /><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-2 text-sm text-sidebar-foreground/70">{description}</p><Button className="mt-5 disabled:opacity-100" disabled title={demoLabel} variant="secondary">{copyLabel}</Button></Card>;
}

// ConnectedAgentsPanel.tsx
import { Link } from 'react-router-dom';

import { Badge } from '../../../shared/ui/Badge';
import { Card } from '../../../shared/ui/Card';
import type { AgentStatus, DashboardAgent } from '../types/dashboard';

export function ConnectedAgentsPanel({ agents, statusLabels, title, viewLabel }: { agents: readonly DashboardAgent[]; statusLabels: Record<AgentStatus, string>; title: string; viewLabel: string }) {
  return <Card as="section" aria-labelledby="connected-agents-title"><div className="flex items-center justify-between"><h2 className="font-semibold" id="connected-agents-title">{title}</h2><Link aria-label={viewLabel} className="text-sm text-ui-link" to="/dashboard/agents">{viewLabel}</Link></div><ul className="mt-4 grid gap-3">{agents.map((agent) => <li className="flex items-center gap-3" key={agent.id}><span aria-hidden className="grid h-8 w-8 place-items-center rounded-ui-control bg-ui-interactive text-xs font-semibold">{agent.name[0]}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{agent.name}</strong><span className="block text-xs text-ui-ink-muted">{agent.role}</span></span><Badge variant={agent.status === 'active' ? 'success' : 'neutral'}>{statusLabels[agent.status]}</Badge></li>)}</ul></Card>;
}
```

- [ ] **Step 5: Implement the risks panel**

```tsx

// RisksPanel.tsx
import { Info, TriangleAlert } from 'lucide-react';

import { Card } from '../../../shared/ui/Card';
import type { DashboardRisk } from '../types/dashboard';

export function RisksPanel({ noticeLabel, risks, title, warningLabel }: { noticeLabel: string; risks: readonly DashboardRisk[]; title: string; warningLabel: string }) {
  return <Card as="section" aria-labelledby="dashboard-risks-title"><h2 className="font-semibold" id="dashboard-risks-title">{title}</h2><ul className="mt-4 grid gap-3">{risks.map((risk) => <li className="flex items-start gap-3 rounded-ui-control bg-ui-interactive/70 p-3 text-sm" key={risk.id}>{risk.severity === 'warning' ? <TriangleAlert aria-label={warningLabel} className="mt-0.5 h-4 w-4 shrink-0 text-state-warning" /> : <Info aria-label={noticeLabel} className="mt-0.5 h-4 w-4 shrink-0 text-ui-ink-muted" />}<span>{risk.label}</span></li>)}</ul></Card>;
}
```

- [ ] **Step 6: Implement the connected-sources panel**

```tsx

// ConnectedSourcesPanel.tsx
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import type { DashboardSource, SourceStatus } from '../types/dashboard';

export function ConnectedSourcesPanel({ demoLabel, description, manageLabel, sources, statusLabels, title }: { demoLabel: string; description: string; manageLabel: string; sources: readonly DashboardSource[]; statusLabels: Record<SourceStatus, string>; title: string }) {
  return <Card as="section" aria-labelledby="connected-sources-title"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold" id="connected-sources-title">{title}</h2><p className="mt-1 text-sm text-ui-ink-muted">{description}</p></div><Button className="disabled:opacity-100" disabled title={demoLabel} variant="outline">{manageLabel}</Button></div><ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{sources.map((source) => <li className="rounded-ui-panel border border-ui-divider p-4" key={source.id}><div className="flex items-center justify-between"><span aria-hidden className="grid h-9 w-9 place-items-center rounded-ui-control bg-ui-interactive text-sm font-semibold">{source.mark}</span><Badge variant={source.status === 'connected' ? 'success' : 'neutral'}>{statusLabels[source.status]}</Badge></div><strong className="mt-3 block text-sm">{source.name}</strong><span className="mt-1 block text-xs text-ui-ink-muted">{source.detail}</span></li>)}</ul></Card>;
}
```

Use the imports shown for each file; do not use emoji or guessed brand paths.

- [ ] **Step 7: Compose the page**

Create `DashboardHomePage.tsx`:

```tsx
import { useTranslation } from 'react-i18next';

import { createDashboardFixture } from '../dashboard-fixture';
import { AgentContextPanel } from '../ui/AgentContextPanel';
import { ConnectedAgentsPanel } from '../ui/ConnectedAgentsPanel';
import { ConnectedSourcesPanel } from '../ui/ConnectedSourcesPanel';
import { DashboardHero } from '../ui/DashboardHero';
import { KnowledgeGraphPreview } from '../ui/KnowledgeGraphPreview';
import { RecentMemoryPanel } from '../ui/RecentMemoryPanel';
import { RisksPanel } from '../ui/RisksPanel';

export function DashboardHomePage() {
  const { t } = useTranslation();
  const fixture = createDashboardFixture(t);
  const demoLabel = t('DASHBOARD_HOME.DEMO_ONLY');

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-6 sm:gap-8">
      <DashboardHero demoLabel={demoLabel} hero={fixture.hero} metrics={fixture.metrics} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
        <KnowledgeGraphPreview exploreLabel={t('DASHBOARD_HOME.EXPLORE')} graph={fixture.graph} />
        <RecentMemoryPanel items={fixture.recentMemory} title={t('DASHBOARD_HOME.RECENT_MEMORY')} viewAllLabel={t('DASHBOARD_HOME.VIEW_ALL')} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <AgentContextPanel copyLabel={t('DASHBOARD_HOME.COPY_CONNECTION')} description={fixture.agentContext.description} demoLabel={demoLabel} title={fixture.agentContext.title} />
        <ConnectedAgentsPanel agents={fixture.agents} statusLabels={{ active: t('DASHBOARD_HOME.STATUS_ACTIVE'), idle: t('DASHBOARD_HOME.STATUS_IDLE') }} title={t('DASHBOARD_HOME.CONNECTED_AGENTS')} viewLabel={t('DASHBOARD_HOME.VIEW_AGENTS')} />
        <RisksPanel noticeLabel={t('DASHBOARD_HOME.NOTICE')} risks={fixture.risks} title={t('DASHBOARD_HOME.RISKS')} warningLabel={t('DASHBOARD_HOME.WARNING')} />
      </div>
      <ConnectedSourcesPanel demoLabel={demoLabel} description={t('DASHBOARD_HOME.CONNECTED_SOURCES_DESCRIPTION')} manageLabel={t('DASHBOARD_HOME.MANAGE_CONNECTORS')} sources={fixture.sources} statusLabels={{ available: t('DASHBOARD_HOME.STATUS_AVAILABLE'), connected: t('DASHBOARD_HOME.STATUS_CONNECTED') }} title={t('DASHBOARD_HOME.CONNECTED_SOURCES')} />
    </div>
  );
}
```

Import `AgentStatus`, `SourceStatus`, and the panel-specific model types from `types/dashboard.ts`; no panel declares duplicate status unions.

- [ ] **Step 8: Run tests, file-size check, and commit**

Run:

```bash
cd frontend
npm test -- src/features/dashboard
npm run check:file-size
```

Expected: PASS and every handwritten TypeScript file remains at or below 450 lines.

Commit:

```bash
git add frontend/src/features/dashboard frontend/public/assets/i18n/en.json frontend/public/assets/i18n/vi.json
git commit -m "feat: build dashboard home panels"
```

## Task 7: Make Dashboard Home The Exact Index Route

**Files:**
- Modify: `frontend/src/app/router/router.tsx`
- Modify: `frontend/src/app/router/router.test.tsx`
- Modify: `frontend/src/app/layout/admin-navigation.ts`
- Modify: `frontend/src/app/layout/admin-navigation.test.ts`
- Modify: `frontend/public/assets/i18n/en.json`
- Modify: `frontend/public/assets/i18n/vi.json`

- [ ] **Step 1: Write failing router and navigation tests**

Change the router index test to:

```tsx
import type { User } from '../../core/auth/user-schema';
import { TestI18nProvider } from '../../../tests/TestI18nProvider';

const authenticatedUser: User = {
  avatar_url: null,
  current_workspace_id: null,
  email: 'owner@example.com',
  firebase_uid: 'firebase-1',
  full_name: 'Owner',
  id: 'user-1',
  is_active: true,
  login_providers: ['google'],
};

it('renders Dashboard Home at the authenticated dashboard index without redirecting', async () => {
  useAuthStore.getState().setAuthenticated(authenticatedUser);
  const router = createMemoryRouter(createRouteObjects(<Outlet />), { initialEntries: ['/dashboard'] });
  render(<TestI18nProvider><QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider></TestI18nProvider>);

  expect(await screen.findByRole('heading', { name: 'Welcome back, Amelia' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/dashboard');
});

it('keeps Briefing directly addressable', async () => {
  useAuthStore.getState().setAuthenticated(authenticatedUser);
  const router = createMemoryRouter(createRouteObjects(<Outlet />), { initialEntries: ['/dashboard/briefing'] });
  render(<TestI18nProvider><QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider></TestI18nProvider>);

  expect(await screen.findByRole('heading', { name: 'Morning briefing' })).toBeInTheDocument();
});
```

Update `admin-navigation.test.ts` to expect an Overview item with `House`, exact `/dashboard` matching, and no false match for `/dashboard/briefing`:

```ts
expect(findActiveNavigationItem('/dashboard')?.key).toBe('NAV.OVERVIEW');
expect(findActiveNavigationItem('/dashboard/briefing')?.key).toBe('NAV.BRIEFING');
expect(findActiveNavigationItem('/dashboarding')).toBeUndefined();
```

- [ ] **Step 2: Run focused tests and verify failures**

Run:

```bash
cd frontend
npm test -- src/app/router/router.test.tsx src/app/layout/admin-navigation.test.ts
```

Expected: FAIL because `/dashboard` still redirects and Overview is not defined.

- [ ] **Step 3: Implement exact index routing and navigation**

In `router.tsx`, replace the dashboard index redirect with:

```tsx
{
  index: true,
  element: createLazyElement(() => import('../../features/dashboard/pages/DashboardHomePage').then(
    ({ DashboardHomePage }) => ({ default: DashboardHomePage }),
  )),
},
```

Add this first item to the focus group in `admin-navigation.ts`:

```ts
{
  exact: true,
  icon: House,
  key: 'NAV.OVERVIEW',
  to: '/dashboard',
},
```

Add `readonly exact?: boolean` to `AdminNavigationItem` and change matching to:

```ts
const matchesRoute = item.exact
  ? cleanPathname === item.to
  : cleanPathname === item.to || cleanPathname.startsWith(`${item.to}/`);
```

Add `NAV.OVERVIEW` as `Overview` and `Tổng quan` in the English and Vietnamese locale files.

- [ ] **Step 4: Run tests and commit**

Run the focused command from Step 2. Expected: PASS.

Commit:

```bash
git add frontend/src/app/router/router.tsx frontend/src/app/router/router.test.tsx frontend/src/app/layout/admin-navigation.ts frontend/src/app/layout/admin-navigation.test.ts frontend/public/assets/i18n/en.json frontend/public/assets/i18n/vi.json
git commit -m "feat: route dashboard home as overview"
```

## Task 8: Restyle And Decompose The Sidebar

**Files:**
- Create: `frontend/src/app/layout/SidebarStatusCard.tsx`
- Create: `frontend/src/app/layout/SidebarStatusCard.test.tsx`
- Modify: `frontend/src/app/layout/AdminSidebar.tsx`
- Modify: `frontend/src/app/layout/AdminSidebar.test.tsx`
- Modify: `frontend/src/app/layout/AppShell.tsx`
- Modify: `frontend/src/app/layout/AppShell.test.tsx`
- Modify: `frontend/public/assets/i18n/en.json`
- Modify: `frontend/public/assets/i18n/vi.json`

- [ ] **Step 1: Write failing sidebar visual and status tests**

Create `SidebarStatusCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TestI18nProvider } from '../../../tests/TestI18nProvider';
import { SidebarStatusCard } from './SidebarStatusCard';

it('presents indexing progress with text and meter semantics', () => {
  render(<TestI18nProvider><SidebarStatusCard /></TestI18nProvider>);
  expect(screen.getByText('Indexing status')).toBeInTheDocument();
  expect(screen.getByRole('meter', { name: 'Indexing progress' })).toHaveAttribute('aria-valuenow', '80');
  expect(screen.getByText('42,180 nodes · 128k edges')).toBeInTheDocument();
});
```

Update `AdminSidebar.test.tsx` to expect `lg:w-64`, dark sidebar utilities, the Overview active link at `/dashboard`, and indexing status only in expanded mode. Update `AppShell.test.tsx` to expect `lg:pl-64` instead of `lg:pl-[280px]`.

- [ ] **Step 2: Run tests and verify failures**

Run:

```bash
cd frontend
npm test -- src/app/layout/SidebarStatusCard.test.tsx src/app/layout/AdminSidebar.test.tsx src/app/layout/AppShell.test.tsx
```

Expected: FAIL because the status card is absent and expanded width remains 280px.

- [ ] **Step 3: Implement `SidebarStatusCard`**

Create:

```tsx
import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SidebarStatusCard() {
  const { t } = useTranslation();
  return (
    <section className="rounded-ui-panel border border-sidebar-border bg-sidebar-accent p-4 text-sidebar-foreground" aria-labelledby="sidebar-indexing-title">
      <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70"><Activity aria-hidden className="h-3.5 w-3.5" /><h2 className="font-medium" id="sidebar-indexing-title">{t('SHELL.INDEXING_STATUS')}</h2></div>
      <strong className="mt-2 block text-sm">{t('SHELL.INDEXING_FRESHNESS')}</strong>
      <div aria-label={t('SHELL.INDEXING_PROGRESS')} aria-valuemax={100} aria-valuemin={0} aria-valuenow={80} className="mt-3 h-1.5 overflow-hidden rounded-ui-status bg-sidebar-border" role="meter"><span className="block h-full w-4/5 bg-brand" /></div>
      <p className="mt-2 text-xs text-sidebar-foreground/60">42,180 nodes · 128k edges</p>
    </section>
  );
}
```

Add these exact `SHELL` entries:

```json
"INDEXING_STATUS": "Indexing status",
"INDEXING_FRESHNESS": "Live · 2s ago",
"INDEXING_PROGRESS": "Indexing progress"
```

```json
"INDEXING_STATUS": "Trạng thái lập chỉ mục",
"INDEXING_FRESHNESS": "Trực tiếp · 2 giây trước",
"INDEXING_PROGRESS": "Tiến độ lập chỉ mục"
```

- [ ] **Step 4: Restyle `AdminSidebar` without changing drawer behavior**

Preserve all focus trapping, mobile-close, tooltip, local preference, and route-change effects. Change only presentation and extracted content:

```tsx
<aside className={`fixed inset-y-0 left-0 z-40 hidden w-[72px] border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 motion-reduce:transition-none md:flex md:flex-col ${desktopLayout === 'expanded' ? 'lg:w-64' : 'lg:w-[72px]'}`}>
```

Use `text-sidebar-foreground`, `text-sidebar-foreground/60`, `bg-sidebar-accent`, and `border-sidebar-border` throughout desktop and mobile sidebar content. Use `bg-brand text-brand-foreground` for the active item, and remove hover scale/rotation from the brand and icons. Insert `<SidebarStatusCard />` above the collapse control only when `expanded` is true. Change the mobile dialog width to `w-64` and surface to `bg-sidebar text-sidebar-foreground`.

- [ ] **Step 5: Align the AppShell desktop offset**

Change `AppShell` offsets to:

```tsx
<div className={`transition-[padding] duration-200 motion-reduce:transition-none md:pl-[72px] ${sidebarLayout === 'expanded' ? 'lg:pl-64' : 'lg:pl-[72px]'}`}>
```

- [ ] **Step 6: Run tests, size check, and commit**

Run:

```bash
cd frontend
npm test -- src/app/layout/SidebarStatusCard.test.tsx src/app/layout/AdminSidebar.test.tsx src/app/layout/AppShell.test.tsx src/app/layout/admin-navigation.test.ts
npm run check:file-size
```

Expected: PASS; `AdminSidebar.tsx` remains below 450 lines after extraction.

Commit:

```bash
git add frontend/src/app/layout/SidebarStatusCard.tsx frontend/src/app/layout/SidebarStatusCard.test.tsx frontend/src/app/layout/AdminSidebar.tsx frontend/src/app/layout/AdminSidebar.test.tsx frontend/src/app/layout/AppShell.tsx frontend/src/app/layout/AppShell.test.tsx frontend/public/assets/i18n/en.json frontend/public/assets/i18n/vi.json
git commit -m "feat: restyle authenticated sidebar"
```

## Task 9: Build The Search-Led 64px Header And Shell Spacing

**Files:**
- Create: `frontend/src/app/layout/HeaderUtilities.tsx`
- Modify: `frontend/src/app/layout/AdminHeader.tsx`
- Modify: `frontend/src/app/layout/AdminHeader.test.tsx`
- Modify: `frontend/src/app/layout/AppShell.tsx`
- Modify: `frontend/src/app/layout/AppShell.test.tsx`
- Modify: `frontend/public/assets/i18n/en.json`
- Modify: `frontend/public/assets/i18n/vi.json`

- [ ] **Step 1: Write failing header tests**

Add to `AdminHeader.test.tsx`:

```tsx
it('renders a search-led header and marks unavailable actions as inert', async () => {
  await renderHeader(createProps());

  expect(screen.getByRole('banner')).toHaveClass('h-16');
  expect(screen.getByRole('searchbox', { name: 'Search company memory' })).toHaveAttribute('readonly');
  expect(screen.getByRole('button', { name: 'MCP' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Add source' })).toBeDisabled();
});

it('preserves workspace, language, user, and logout controls', async () => {
  await renderHeader(createProps({ logoutController: { error: null, isLoading: false, logout: vi.fn().mockResolvedValue(undefined) } }));
  expect(screen.getByRole('combobox', { name: 'Workspace' })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument();
  expect(screen.getByLabelText('WO')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
});
```

Update `AppShell.test.tsx` to expect main minimum height `min-h-[calc(100vh-4rem)]`, desktop padding `xl:px-8`, and no 76px header assumption.

- [ ] **Step 2: Run focused tests and verify failures**

Run:

```bash
cd frontend
npm test -- src/app/layout/AdminHeader.test.tsx src/app/layout/AppShell.test.tsx
```

Expected: FAIL because the current header exposes page context instead of search/MCP/source controls and is 76px at desktop.

- [ ] **Step 3: Extract the utility controls**

Keep the existing `AdminHeaderProps` interface so AppShell and tests retain workspace and route context compatibility. Extract the existing utility controls into `HeaderUtilities.tsx` with this complete interface and behavior:

```tsx
import { ChevronDown, Loader2, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { User } from '../../core/auth/user-schema';
import type { Workspace } from '../../features/settings/types/workspace';
import { Button } from '../../shared/ui/Button';
import { Skeleton } from '../../shared/ui/Skeleton';
import type { LogoutController, WorkspaceSyncStatus } from './AdminHeader';

export interface HeaderUtilitiesProps {
  currentWorkspaceId: string | null;
  language: string;
  logoutController?: LogoutController;
  onChangeLanguage: (language: string) => void;
  onSelectWorkspace: (workspaceId: string) => void;
  syncStatus: WorkspaceSyncStatus;
  user: User | null;
  workspaces: Workspace[];
  workspacesPending: boolean;
}

function userInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'U';
}

export function HeaderUtilities({ currentWorkspaceId, language, logoutController, onChangeLanguage, onSelectWorkspace, syncStatus, user, workspaces, workspacesPending }: HeaderUtilitiesProps) {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative w-32 sm:w-40 xl:w-52">
        <label className="sr-only" htmlFor="admin-header-workspace">{t('SHELL.WORKSPACE')}</label>
        {workspacesPending ? <div className="flex min-h-10 items-center rounded-ui-control border border-ui-divider bg-ui-raised px-3"><Skeleton label={t('SHELL.LOADING_WORKSPACES')} lines={1} /></div> : <><select className="min-h-10 w-full appearance-none truncate rounded-ui-control border border-ui-divider bg-ui-raised py-2 pl-3 pr-9 text-sm font-medium text-ui-ink" disabled={workspaces.length === 0 || syncStatus === 'syncing'} id="admin-header-workspace" onChange={(event) => onSelectWorkspace(event.target.value)} value={currentWorkspaceId ?? ''}>{workspaces.length === 0 ? <option value="">{t('SHELL.NO_WORKSPACE')}</option> : null}{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select>{syncStatus === 'syncing' ? <Loader2 aria-hidden className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-text motion-reduce:animate-none" /> : <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-ink-muted" />}</>}
      </div>
      <div className="relative hidden sm:block">
        <label className="sr-only" htmlFor="admin-header-language">{t('COMMON.LANGUAGE')}</label>
        <select className="min-h-10 w-[70px] appearance-none rounded-ui-control border border-ui-divider bg-ui-raised py-2 pl-3 pr-7 text-sm font-medium text-ui-ink" id="admin-header-language" onChange={(event) => onChangeLanguage(event.target.value)} value={language}><option value="vi">VI</option><option value="en">EN</option></select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ui-ink-muted" />
      </div>
      {user ? <span aria-label={userInitials(user.full_name)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-brand-foreground">{userInitials(user.full_name)}</span> : null}
      {logoutController ? <Button aria-label={t('COMMON.LOGOUT')} isLoading={logoutController.isLoading} loadingText={t('SHELL.LOGGING_OUT')} onClick={() => void logoutController.logout()} size="icon" variant="ghost"><LogOut aria-hidden className="h-4 w-4" /><span className="sr-only">{t('COMMON.LOGOUT')}</span></Button> : null}
    </div>
  );
}
```

- [ ] **Step 4: Implement the search-led `AdminHeader` composition**

Replace the icon/shared-component imports with:

```tsx
import { Command, Menu, Plug, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { User } from '../../core/auth/user-schema';
import type { Workspace } from '../../features/settings/types/workspace';
import { Button } from '../../shared/ui/Button';
import { HeaderUtilities } from './HeaderUtilities';
```

Render `sectionLabel` and `pageLabel` in a screen-reader-only context and replace the `AdminHeader` return value with this complete structure:

```tsx
<header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-ui-divider bg-ui-canvas/90 px-3 backdrop-blur-md sm:px-4 md:px-6 xl:px-8">
  <button aria-label={t('SHELL.OPEN_NAV')} className="grid min-h-10 min-w-10 place-items-center rounded-ui-control border border-ui-divider bg-ui-raised md:hidden" onClick={onOpenNavigation} type="button"><Menu aria-hidden className="h-5 w-5" /></button>
  <div className="sr-only"><span>{sectionLabel}</span><strong>{pageLabel}</strong></div>
  <Button aria-label={t('SHELL.SEARCH_MEMORY')} className="disabled:opacity-100 sm:hidden" disabled size="icon" title={t('SHELL.DEMO_ONLY')} variant="ghost"><Search aria-hidden className="h-4 w-4" /></Button>
  <div className="relative hidden min-w-0 flex-1 sm:block sm:max-w-xl">
    <label className="sr-only" htmlFor="admin-header-search">{t('SHELL.SEARCH_MEMORY')}</label>
    <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-ink-muted" />
    <input aria-describedby="admin-header-demo" className="h-10 w-full rounded-ui-control border border-transparent bg-ui-interactive pl-10 pr-14 text-sm placeholder:text-ui-ink-muted focus:border-brand-text focus:outline-none" id="admin-header-search" placeholder={t('SHELL.SEARCH_PLACEHOLDER')} readOnly role="searchbox" />
    <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-ui-divider bg-ui-canvas px-1.5 py-0.5 text-xs text-ui-ink-muted sm:block">⌘ K</kbd>
    <span className="sr-only" id="admin-header-demo">{t('SHELL.DEMO_ONLY')}</span>
  </div>
  <div className="ml-auto flex min-w-0 items-center gap-2">
    <Button aria-label="MCP" className="hidden disabled:opacity-100 lg:inline-flex" disabled size="sm" title={t('SHELL.DEMO_ONLY')} variant="ghost"><Command aria-hidden className="h-4 w-4" />MCP</Button>
    <Button aria-label={t('SHELL.ADD_SOURCE')} className="hidden disabled:opacity-100 xl:inline-flex" disabled size="sm" title={t('SHELL.DEMO_ONLY')}><Plug aria-hidden className="h-4 w-4" />{t('SHELL.ADD_SOURCE')}</Button>
    <HeaderUtilities currentWorkspaceId={currentWorkspaceId} language={language} logoutController={logoutController} onChangeLanguage={onChangeLanguage} onSelectWorkspace={onSelectWorkspace} syncStatus={syncStatus} user={user} workspaces={workspaces} workspacesPending={workspacesPending} />
  </div>
</header>
```

- [ ] **Step 5: Add shell translations and update AppShell geometry**

Add these exact shell translations:

English `SHELL` entries:

```json
"SEARCH_MEMORY": "Search company memory",
"SEARCH_PLACEHOLDER": "Ask FLAE anything about your company…",
"ADD_SOURCE": "Add source",
"DEMO_ONLY": "Preview only; this action is not connected yet."
```

Vietnamese `SHELL` entries:

```json
"SEARCH_MEMORY": "Tìm kiếm bộ nhớ doanh nghiệp",
"SEARCH_PLACEHOLDER": "Hỏi FLAE bất kỳ điều gì về doanh nghiệp của bạn…",
"ADD_SOURCE": "Thêm nguồn",
"DEMO_ONLY": "Chỉ là bản xem trước; thao tác này chưa được kết nối."
```

Change AppShell main geometry to:

```tsx
<main className="min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-5 md:px-6 md:py-6 xl:px-8 xl:py-8" id="main-content" tabIndex={-1}>
```

- [ ] **Step 6: Run tests and commit**

Run the focused command from Step 2. Expected: PASS.

Commit:

```bash
git add frontend/src/app/layout/HeaderUtilities.tsx frontend/src/app/layout/AdminHeader.tsx frontend/src/app/layout/AdminHeader.test.tsx frontend/src/app/layout/AppShell.tsx frontend/src/app/layout/AppShell.test.tsx frontend/public/assets/i18n/en.json frontend/public/assets/i18n/vi.json
git commit -m "feat: build search led dashboard header"
```

## Task 10: Add Responsive E2E Coverage And Run The Full Frontend Gate

**Files:**
- Create: `frontend/tests/e2e/dashboard-home.spec.ts`
- Modify: `frontend/tests/e2e/admin-shell.spec.ts`
- Modify only if failures reveal approved-scope defects: files listed in Tasks 1-9

- [ ] **Step 1: Write the Dashboard Home E2E test**

Create `dashboard-home.spec.ts`:

```ts
import { expect, expectNoA11yViolations, installAuthSession, test } from './fixtures';

const viewports = [
  { height: 812, width: 375 },
  { height: 1024, width: 768 },
  { height: 768, width: 1024 },
  { height: 900, width: 1440 },
] as const;

for (const viewport of viewports) {
  test(`renders Dashboard Home without horizontal overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installAuthSession(page);
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Welcome back, Amelia' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Connected sources' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('exposes real routes, inert demo controls, and an accessible page', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await installAuthSession(page);
  await page.goto('/dashboard');

  await expect(page.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/dashboard/knowledge/graph');
  await expect(page.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/dashboard/knowledge');
  await expect(page.getByRole('button', { name: 'Add source' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Manage connectors' })).toBeDisabled();
  await expectNoA11yViolations(page);
});
```

- [ ] **Step 2: Update shell viewport expectations**

In `admin-shell.spec.ts`, use these approved dimensions:

```ts
const responsiveViewports = [
  { expectedHeaderHeight: 64, expectedSidebarWidth: 0, height: 812, label: 'mobile', width: 375 },
  { expectedHeaderHeight: 64, expectedSidebarWidth: 72, height: 1024, label: 'tablet', width: 768 },
  { expectedHeaderHeight: 64, expectedSidebarWidth: 256, height: 768, label: 'desktop', width: 1024 },
  { expectedHeaderHeight: 64, expectedSidebarWidth: 256, height: 900, label: 'wide desktop', width: 1440 },
] as const;
```

Change reload/collapse assertions from 280px to 256px. Retain the mobile-drawer, rail-tooltip, focus restoration, and reduced-motion tests.

- [ ] **Step 3: Run the focused E2E suite and fix only approved-scope failures**

Run:

```bash
cd frontend
npm run test:e2e -- tests/e2e/dashboard-home.spec.ts tests/e2e/admin-shell.spec.ts
```

Expected: PASS at all four viewports with no axe violations or horizontal overflow.

- [ ] **Step 4: Run static quality gates**

Run:

```bash
cd frontend
npm run typecheck
npm run lint
npm run check:file-size
```

Expected: TypeScript exits 0 with no errors, ESLint exits 0 with no warnings, and every handwritten TypeScript file is at or below 450 lines.

- [ ] **Step 5: Run coverage and production build gates**

Run:

```bash
cd frontend
npm run test:coverage
npm run build
```

Expected:

- Vitest passes and frontend coverage remains at or above 75%.
- The Vite production build completes successfully.

- [ ] **Step 6: Review the final diff against the approved scope**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Expected: no whitespace errors; only design-system, shared UI, dashboard, shell, localization, route, and test files from this plan are changed. Do not stage `.superpowers/`, downloaded reference files, coverage output, or unrelated pre-existing worktree changes.

- [ ] **Step 7: Commit the verification coverage and any final approved-scope corrections**

```bash
git add frontend/tests/e2e/dashboard-home.spec.ts frontend/tests/e2e/admin-shell.spec.ts
git commit -m "test: verify dashboard home experience"
```

If a quality-gate correction changed a Task 1-9 file, stage that exact file in this same final commit and describe the correction in the commit body.

## Completion Checklist

- [ ] `/dashboard` renders Dashboard Home without a redirect.
- [ ] `/dashboard/briefing` and all existing authenticated routes still resolve.
- [ ] The sidebar is 256px expanded, 72px collapsed, dark, responsive, and keyboard accessible.
- [ ] The header is 64px, search-led, responsive, and preserves workspace/language/user/logout behavior.
- [ ] The Home page renders every approved section from typed localized fixtures.
- [ ] Demo controls are explicitly inert and real route links remain functional.
- [ ] Shared components contain no API, store, or feature business logic.
- [ ] Tokens, colors, radii, borders, density, and motion match the approved design system.
- [ ] Dark text on orange meets the approved 5.48:1 accessibility deviation.
- [ ] No horizontal overflow occurs at 375px, 768px, 1024px, or 1440px.
- [ ] Unit, integration, E2E, accessibility, type, lint, size, coverage, and build gates pass.
