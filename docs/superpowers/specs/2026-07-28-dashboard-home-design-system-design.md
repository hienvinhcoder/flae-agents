# Dashboard Home And Design System

## Objective

Create a maintainable FLAE design-system foundation and one authenticated Dashboard Home that closely matches the supplied `FLAE Dashboard — AI Company Memory.html` reference. The work updates the shared authenticated shell so the complete Home experience—not only its content region—uses the reference layout and visual language.

The implementation remains within the frontend. It uses typed static fixtures for Dashboard Home and does not add backend endpoints, persistence, or new server-state behavior.

## Approved Direction

The selected approach is **token-first reference adaptation**.

The reference establishes the visual target: a warm off-white canvas, white bordered cards, a dark warm sidebar, restrained orange accent, compact information density, a search-led top bar, an inverse hero, and modular dashboard panels. FLAE will reproduce those characteristics through global semantic tokens, shared presentational primitives, the existing application shell, and dashboard-specific components instead of copying page-local utility classes.

## Scope

### In scope

- Align `DESIGN.md` with the approved reference where the current document and implementation differ.
- Configure the frontend-wide Tailwind CSS v4 theme through the existing CSS-first setup in `frontend/src/styles.css`.
- Preserve source CSS custom properties and expose semantic Tailwind utilities through `@theme inline`.
- Restyle the existing shared UI primitives needed by the authenticated product.
- Add only the missing shared presentational primitives required by Dashboard Home.
- Restyle the shared authenticated sidebar and top bar to match the reference.
- Add a lazy-loaded Dashboard Home at `/dashboard`.
- Keep `/dashboard/briefing` and every other published authenticated route available.
- Add a typed static Dashboard Home fixture.
- Add unit, integration, navigation, accessibility, and critical responsive coverage.

### Out of scope

- Backend API, database, Redis, realtime, or authentication changes.
- Dashboard persistence or live metrics.
- New connectors, MCP configuration, or source-management workflows.
- Redesigning the content of Briefing, Inbox, Chat, Agents, Knowledge, Topics, Reports, Settings, authentication, or invitation pages.
- Replacing React, Tailwind CSS, Lucide, React Router, TanStack Query, Zustand, or other established frontend infrastructure.
- Introducing another UI framework or a parallel token system.
- Making demo-only Dashboard Home controls trigger side effects.

## Reference Fidelity

The implementation should match the supplied reference in the following observable characteristics:

- A 256px expanded desktop sidebar with a dark warm neutral background.
- A compact brand block, vertically stacked navigation, active orange item, indexing-status card, and settings action.
- A 64px sticky top bar with a wide company-memory search field, MCP status, primary `Add source` action, and user avatar.
- A content canvas with 32px desktop padding and a 1600px maximum width.
- A dark inverse hero containing synchronization status, welcome copy, suggested prompts, and four metric tiles.
- White cards with one-pixel warm borders, compact headings, restrained radius, and little or no inline-card shadow.
- Dashboard sections for Knowledge graph, Recent memory updates, MCP agent context, Connected agents, Risks & gaps, and Connected sources.
- Orange as the only product accent within a view; green is reserved for positive operational status.

The page will adapt the reference to existing FLAE routes, translations, responsive shell behavior, and accessibility requirements. It will not copy extension-injected markup, Lovable branding, remote assets, or irrelevant scripts from the saved HTML.

## Design-System Contract

### Source of truth

- `DESIGN.md` defines the human-readable system.
- `frontend/src/styles.css` is the executable source of global tokens and Tailwind CSS v4 theme mappings.
- Components consume semantic utilities. They do not hardcode brand colors or introduce local token families.
- Tailwind CSS remains configured with the current Vite plugin and CSS-first `@theme inline` approach.
- No `tailwind.config.js` or `tailwind.config.ts` is introduced because the project already uses Tailwind CSS v4 CSS-first configuration.

### Core light tokens

The reference values become the canonical light theme:

| Role | CSS value |
|---|---|
| Canvas / background | `oklch(98.5% 0.006 85)` |
| Primary text | `oklch(18% 0.02 60)` |
| Card / raised surface | `oklch(100% 0 0)` |
| Secondary surface | `oklch(92% 0.018 85)` |
| Muted surface | `oklch(94% 0.012 85)` |
| Muted text | `oklch(48% 0.02 60)` |
| Border / input | `oklch(90% 0.015 80)` |
| Primary orange | `oklch(70.5% 0.187 45)` |
| Primary foreground | `#2A241C` |
| Primary soft | `oklch(93% 0.06 60)` |
| Sidebar | `oklch(22% 0.02 60)` |
| Sidebar foreground | `oklch(94% 0.012 85)` |
| Sidebar accent | `oklch(28% 0.02 60)` |
| Sidebar border | `oklch(30% 0.02 60)` |

Existing readable status colors remain semantic: green for success or connected, amber for warning or stale, and destructive red for risk or failure. Status presentation always pairs color with text or iconography.

The saved reference uses a near-white foreground on the orange primary surface. That pairing measures approximately 2.72:1 and does not meet WCAG AA for the small navigation and button text used by the design. FLAE therefore uses the approved dark warm foreground `#2A241C`, which measures approximately 5.48:1 on `#F97316`. This is the only intentional color deviation from the reference.

### Typography, spacing, and shape

- Inter remains the UI family; JetBrains Mono remains the technical data family.
- Body text uses a 15–16px base with readable line height.
- Dashboard headings use medium-to-semibold weight and tight tracking.
- Labels and metadata use 11–13px sizes; uppercase is limited to short system labels.
- Spacing follows a 4px base grid.
- `--radius` is `0.625rem` (10px); controls use approximately 8px, cards 10–14px, and pill statuses use a full radius.
- Inline cards rely on borders rather than shadows.
- Shadows are limited to popovers, dialogs, toasts, and intentional floating layers.
- Interaction transitions stay between 150ms and 220ms and are removed when reduced motion is requested.

### Semantic utility compatibility

The current `bg-ui-*`, `text-ui-*`, `border-ui-*`, `bg-brand`, status, radius, and shadow utilities remain available but map to the approved canonical tokens. This avoids breaking existing routes while preventing a second visual system. New shared components use the same semantic utilities.

## Shared Component Architecture

`frontend/src/shared/ui/` remains presentational. Shared components receive typed props and callbacks only and do not access routes, API clients, TanStack Query, or Zustand.

### Existing primitives to align

- `Button`: default, secondary, outline, ghost, destructive, and icon-only sizing; stable loading state; visible focus; no layout-shifting hover transform.
- `Input`: warm raised surface, one-pixel control border, placeholder hierarchy, invalid treatment, and accessible focus ring.
- `Select`: same control geometry and states as Input.
- `Tabs`: compact reference-aligned tabs with semantic selected state.
- `Dialog`: approved surface, overlay, focus handling, and elevation.
- `Table`: divider-based rows, no zebra stripes, muted hover, and accessible headers.
- `PageHeader` and `PageToolbar`: compact dashboard density and predictable responsive wrapping.
- `Skeleton`, `EmptyState`, `ErrorState`, and `Toast`: token alignment without business logic changes.

### Missing shared primitives

- `Card`: typed semantic container with default, muted, and inverse visual variants plus optional padding control.
- `Badge`: compact status and category labels with neutral, primary, success, warning, and destructive variants.

Dashboard-specific panels do not become shared components merely because they are cards. Their knowledge, agent, risk, connector, and memory semantics remain under `frontend/src/features/dashboard/ui/`.

## Authenticated Shell

### Sidebar

- Use the existing `AdminSidebar` and navigation model rather than adding a second shell.
- Add Overview as the first navigation item targeting `/dashboard`.
- Render a 256px expanded sidebar at large desktop widths.
- Preserve the existing 72px collapsed rail and user-controlled collapsed preference.
- Preserve the mobile drawer behavior and focus-safe close interaction.
- Use Lucide icons at consistent sizes and stroke treatment.
- Mark the active route with `aria-current="page"`, orange fill, and text/icon contrast.
- Present indexing status near the bottom of the expanded sidebar with a text status, progress indicator, freshness, and indexed totals.
- Keep Settings reachable at the bottom of navigation.

### Top bar

- Restyle `AdminHeader` into the reference search-led 64px sticky header.
- Use a labeled search input with the prompt `Ask FLAE anything about your company…` and a visible keyboard-hint treatment where space allows.
- Preserve workspace selection, language selection, current user identity, logout, workspace synchronization, and mobile-menu access.
- Present MCP status and `Add source` as demo-only visual controls in this scope; they must not produce side effects.
- Collapse lower-priority labels and controls progressively on tablet and mobile instead of allowing overflow.

Shared shell changes affect the frame of all authenticated routes. Their feature content and behavior remain unchanged.

## Dashboard Feature Architecture

Create a focused `frontend/src/features/dashboard/` domain with only the files and directories needed for this page.

### Page

- `pages/DashboardHomePage.tsx` orchestrates the approved sections and consumes one typed fixture object.
- The page performs no network access, global-store synchronization, timers, or effects.
- The page remains lazy-loaded at the route boundary.

### Feature UI

Use focused presentational units for:

- welcome and synchronization hero;
- summary metric grid;
- Knowledge graph preview;
- Recent memory updates;
- MCP agent-context card;
- Connected agents;
- Risks & gaps;
- Connected sources.

These components receive narrow typed props and callbacks. They do not import the fixture directly, inspect router state, or own data retrieval.

### Types and fixture

- Define explicit readonly types for hero copy, metrics, graph nodes and edges, memory updates, agents, risks, and sources.
- Store the fixture in a feature-local module, separate from page rendering.
- Use stable identifiers instead of array indexes for rendered keys.
- Represent status with constrained unions rather than arbitrary strings.
- Keep source and agent marks presentational and use Lucide or existing verified assets; do not guess external brand SVG paths.

## Content And Interaction

Dashboard Home renders sections in this order:

1. Welcome and synchronization hero with suggested prompt chips and four metrics.
2. Knowledge graph preview.
3. Recent memory updates.
4. MCP agent-context card.
5. Connected agents.
6. Risks & gaps.
7. Connected sources.

Existing destinations remain functional:

- `Explore` links to `/dashboard/knowledge/graph`.
- `View all` links to `/dashboard/knowledge`.
- Agent navigation links to `/dashboard/agents`.
- Settings links to `/dashboard/settings`.

Demo-only controls—including prompt chips, top-bar search submission, `Add source`, MCP connection, copy connection, and connector management—must be clearly non-operative and must not create external or persistent side effects. They may expose a concise accessible demo-state explanation. The visual treatment should remain close to the reference without presenting a false success state.

## Routing

- Replace the current `/dashboard` index redirect with a lazy-loaded `DashboardHomePage` element.
- Keep `/dashboard/briefing` unchanged and directly addressable.
- Add Overview to shared navigation without renaming, removing, or reusing any existing public path.
- Active-route matching treats `/dashboard` as an exact match so Overview does not remain active on every nested dashboard route.
- Add router and navigation tests covering the exact index behavior and active-item precedence.

## Responsive Behavior

### Desktop, 1024px and above

- Expanded sidebar is 256px; collapsed rail remains 72px.
- Top bar is 64px high.
- Main content uses 32px padding and a 1600px maximum width.
- Hero uses a two-column layout with copy and prompts on the left and four metric tiles on the right.
- Dashboard panels use the same multi-column hierarchy as the reference where content width allows.

### Tablet, 768px to 1023px

- Use the 72px sidebar rail.
- Reduce top-bar labels and secondary controls before reducing touch targets.
- Stack the hero metrics below its copy when necessary.
- Convert multi-panel rows to one or two columns based on available width.

### Mobile, below 768px

- Use the existing accessible drawer navigation.
- Keep a compact top bar with menu access and the primary search affordance.
- Stack every dashboard section in one column.
- Preserve at least 16px viewport padding and prevent horizontal scrolling at 375px.
- Keep controls and interactive targets at least 40px in each dimension.

## Accessibility

- Use semantic `nav`, `header`, `main`, `section`, heading, list, link, button, table, and form elements before adding ARIA.
- Provide an accessible name for every icon-only control and hide decorative icons.
- Maintain visible keyboard focus and logical focus order across the shell and page.
- Use `aria-current="page"` for active navigation.
- Provide text or icon labels for synchronization, connected, stale, risk, and agent states so color is never the sole signal.
- Maintain WCAG 2.2 AA contrast for body text, controls, status labels, borders required for control discovery, and focus indicators.
- Respect `prefers-reduced-motion`; disable non-essential pulses, graph motion, and entrance effects.
- Ensure the shell and page remain usable at 200% zoom without horizontal page scrolling.

## Data Flow And Error Handling

Dashboard Home has a deterministic local data flow:

1. `DashboardHomePage` imports one readonly typed fixture.
2. The page passes narrow slices to feature UI components.
3. Components render semantic, presentational output.
4. Existing links navigate through React Router.
5. Demo-only controls produce no network, persistence, clipboard, or external side effect.

Because the page uses a local fixture, it has no dashboard-specific loading, retry, empty, or server-error state. Existing shell workspace loading, workspace-selection errors, logout errors, route error boundaries, and authentication guards remain unchanged and continue to use the global error lifecycle.

## Testing And Verification

### Unit and integration tests

- Protect critical token values, semantic Tailwind mappings, focus styles, reduced-motion behavior, and contrast assumptions.
- Extend existing shared-component tests for variants, loading and disabled states, accessible names, and keyboard focus.
- Test `Card` and `Badge` variants through visible semantics rather than implementation details.
- Test Dashboard Home headings, section ordering, representative fixture values, status text, and existing route links.
- Test that demo-only controls do not invoke navigation or side-effect callbacks.
- Test `/dashboard` renders Home and `/dashboard/briefing` still renders Briefing.
- Test Overview exact-route activation and nested-route navigation precedence.
- Update shell tests for the reference-aligned sidebar and top bar while preserving workspace, language, logout, responsive-navigation, and synchronization behavior.

### End-to-end and build verification

- Add a critical Playwright Dashboard Home flow for desktop and mobile navigation.
- Verify layouts at 375px, 768px, 1024px, and 1440px.
- Verify no horizontal page scrolling at the required widths.
- Verify keyboard navigation, visible focus, mobile drawer operation, and reduced-motion behavior.
- Run frontend unit tests with coverage, type checking, linting, file-size checks, production build, and the relevant Playwright suite.
- Frontend coverage must remain at or above 75%.

## Acceptance Criteria

- `/dashboard` renders the new Dashboard Home without redirecting to Briefing.
- `/dashboard/briefing` and every other current authenticated route remain available.
- The expanded sidebar, top bar, hero, panels, spacing, typography, colors, borders, radii, and primary interactions closely match the supplied HTML reference.
- `DESIGN.md` and `frontend/src/styles.css` describe and implement one consistent design system.
- Tailwind CSS v4 remains CSS-first; no unnecessary Tailwind configuration file or competing token system is added.
- Shared UI remains presentational and feature-specific dashboard concepts stay under `features/dashboard/`.
- Dashboard Home uses typed static fixtures and performs no API or persistent side effect.
- Existing shell functionality for workspace selection, language, logout, synchronization feedback, sidebar collapse, and mobile navigation remains intact.
- The page is usable without horizontal scrolling at 375px, 768px, 1024px, and 1440px.
- Keyboard access, semantic structure, WCAG 2.2 AA contrast, non-color status cues, and reduced-motion support are verified.
- Relevant unit, integration, end-to-end, type, lint, file-size, build, and coverage checks pass.
