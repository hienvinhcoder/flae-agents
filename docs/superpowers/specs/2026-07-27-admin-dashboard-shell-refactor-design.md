# Admin Dashboard Shell Refactor Design

**Date:** 2026-07-27
**Status:** Approved for implementation planning
**Scope:** The shared admin shell at `/dashboard/*`

## Objective

Refactor the admin dashboard shell so navigation is easier to scan, scales to more modules, uses screen space efficiently, and behaves consistently across desktop, tablet, and mobile. The feature pages rendered inside the shell remain functionally unchanged.

The implementation must follow the root `DESIGN.md` contract. In particular, it keeps the light orange-and-cream palette, Inter and JetBrains Mono typography roles, 40px panel radius, 18px control radius, compact operational hierarchy, and restrained 150-300ms motion.

## User Experience

### Desktop

At viewport widths of 1024px and above, the sidebar starts in the expanded A layout. A control at the bottom of the sidebar switches between:

- **Expanded A:** a 280px sidebar with the FLAE brand, workspace identity, section labels, icons, navigation labels, Settings, and the collapse control.
- **Collapsed B:** a 72px navigation rail containing the same destinations as icons, with accessible names and hover/focus tooltips.

The user's explicit desktop choice is stored in `localStorage` and restored on later visits in the same browser. A missing, invalid, or inaccessible stored value falls back to expanded A without blocking rendering.

### Tablet

From 768px through 1023px, the shell uses collapsed rail B so the main content retains enough width. The stored desktop preference is not overwritten by this responsive override.

### Mobile

Below 768px, the persistent sidebar is removed from the page flow. The header menu button opens an expanded A-style drawer with a backdrop. The drawer closes after route selection, backdrop activation, or pressing Escape. Focus stays inside the open drawer and returns to the menu button after it closes.

## Information Architecture

Navigation destinations remain unchanged and are grouped for faster scanning:

- **Focus:** Briefing, Chat, Inbox.
- **Intelligence:** Agents, Knowledge, Knowledge Graph, Topics, Reports.
- **Workspace:** Settings.

Grouping is presentational only. Existing URLs, route matching, translations, authorization, and feature ownership do not change.

## Shell Composition

The shell contains three stable regions:

1. **Sidebar:** brand, workspace identity, grouped primary navigation, Settings, and the desktop expand/collapse control.
2. **Utility header:** mobile drawer trigger, current page context, workspace selector, language selector, user identity, and logout action.
3. **Content region:** synchronization or error banners followed by the existing route outlet.

The utility header stays sticky. The main content padding and sidebar offsets change at the same breakpoints so fixed elements never obscure content or cause horizontal page scrolling.

## Component Boundaries

### `AppShell`

`AppShell` remains the orchestration boundary. It owns workspace loading and selection, synchronization banners, logout integration, mobile drawer state, and rendering the route outlet. It passes focused data and callbacks to the extracted shell components.

### `AdminSidebar`

`AdminSidebar` owns the visual navigation structure and renders the same navigation model in expanded, collapsed, and drawer presentations. It receives the current presentation state and callbacks rather than reading application stores directly.

### `AdminHeader`

`AdminHeader` renders the utility controls and mobile menu trigger. Workspace selection and logout behavior remain controlled by `AppShell` so existing data flow and error handling are preserved.

### `useSidebarLayout`

`useSidebarLayout` owns the desktop expanded/collapsed preference. It validates persisted input, defaults to expanded A, writes changes defensively, and exposes a small state-and-toggle interface. Responsive presentation remains driven by shared breakpoints and must not mutate the stored desktop choice.

### Navigation Model

The route, translation key, icon, and group for each destination live in one typed navigation configuration. Both sidebar presentations render from this configuration to prevent navigation drift.

## Interaction Details

- Interactive targets are at least 44px in both dimensions where space allows.
- Active routes use a soft orange surface, a distinct orange indicator, stronger text, and `aria-current="page"`; status is not communicated by color alone.
- Collapsed navigation items retain accessible names and show labels on hover and keyboard focus.
- The sidebar width transition uses the existing standard easing and completes in about 200ms.
- `prefers-reduced-motion: reduce` removes non-essential width, drawer, and backdrop transitions.
- Hover, active, disabled, and focus-visible states do not change layout dimensions.
- The mobile backdrop and drawer use a clear z-index order below the skip link and above page content.
- Existing skip navigation remains the first keyboard-accessible control and targets the main content region.

## State And Data Flow

The refactor adds no server data and makes no API changes.

1. `AppShell` loads workspaces and reads the authenticated user as it does today.
2. `useSidebarLayout` supplies the validated desktop preference.
3. Breakpoints determine whether the effective presentation is expanded, collapsed, or drawer without modifying the preference.
4. Sidebar route selection continues through React Router `NavLink` components.
5. Workspace changes, synchronization messages, language changes, and logout continue through their existing controllers.

## Error Handling

- Workspace loading and synchronization retain the existing skeleton, status, retry, and alert behavior.
- Failure to read or write `localStorage` is non-fatal; the shell renders expanded A and remains usable.
- An invalid persisted layout value is ignored and replaced on the next successful user toggle.
- The mobile drawer closes on navigation even if the destination later renders an error boundary.
- The shell must remain navigable if user profile text, workspace names, or translated labels are unusually long; labels truncate without hiding their accessible names.

## Responsive And Accessibility Requirements

The implementation will be verified at 375px, 768px, 1024px, and 1440px. At each width:

- The page has no unintended horizontal scrolling.
- Fixed and sticky controls do not cover content.
- Keyboard focus is visible and follows a logical order.
- Collapsed icons expose text alternatives.
- Mobile drawer focus management and Escape dismissal work.
- Essential text and controls meet WCAG AA contrast using the semantic colors from `DESIGN.md`.

## Testing Strategy

### Unit And Integration Tests

- Expanded A is the default when no valid preference exists.
- The desktop toggle switches A to B and B to A.
- A valid choice is restored from `localStorage`.
- Storage access failures fall back safely.
- Navigation grouping and active-route semantics are rendered correctly.
- The mobile drawer opens, traps focus, closes by Escape and route selection, and restores trigger focus.
- Existing workspace selection, synchronization, logout, and skip-link tests continue to pass.

### Browser Verification

- Exercise the shell at 375px, 768px, 1024px, and 1440px.
- Verify the desktop preference survives reload.
- Verify tablet presentation does not overwrite the stored desktop preference.
- Verify layout transitions respect reduced-motion preferences.
- Run the existing authenticated dashboard navigation and logout flow.

### Quality Gates

Run the focused shell tests, frontend typecheck, lint, production build, file-size check, and relevant Playwright dashboard tests.

## Non-Goals

- Redesigning Briefing or any other feature page.
- Changing routes, permissions, workspace APIs, authentication, or server state.
- Adding a new color mode, competing design system, command palette, or navigation destinations.
- Persisting layout preference to the backend or synchronizing it across browsers.

## Acceptance Criteria

The refactor is complete when the shared dashboard shell uses expanded A by default on desktop, allows a persistent switch to collapsed B, uses B on tablet and an accessible A-style drawer on mobile, preserves existing dashboard behavior, follows `DESIGN.md`, and passes the defined automated and responsive checks.
