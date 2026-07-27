# Admin Dashboard UI Refactor Design

**Date:** 2026-07-27  
**Status:** Approved design, pending written-spec review  
**Scope:** Every authenticated route under `/dashboard`, including the shared sidebar, header, page layouts, feature UI, responsive behavior, and user-visible async states

## Objective

Refactor the complete FLAE admin dashboard into one coherent enterprise interface while preserving all current routes, APIs, data contracts, state ownership, permissions, and business behavior.

The selected visual direction is **Editorial Command Deck** at **Balanced** information density. The interface should feel warm, operational, and intentional: strong typography and alignment, restrained depth, clear information hierarchy, and fewer unnecessary card containers.

The root `DESIGN.md` remains the visual source of truth. The implementation must use the semantic tokens in `frontend/src/styles.css`, including the orange-and-cream light palette, Inter and JetBrains Mono typography roles, 18px control radius, 40px major-panel radius, semantic status colors, and restrained 150-300ms motion.

## Scope

### Included

- Shared dashboard shell: sidebar, collapsed rail, mobile drawer, header, content offsets, workspace context, language, user identity, and logout.
- Dashboard overview pages: Briefing, Inbox, and Reports.
- Explorer pages: Agents, Knowledge, and Topics lists.
- Workbench pages: Chat, Agent chat, Knowledge graph, and Topic detail.
- Configuration pages: Agent configuration and Workspace settings.
- Shared dashboard primitives for page headings, toolbars, metrics, data surfaces, statuses, loading, empty, error, progress, and responsive composition.
- Existing dialogs and detail panels used within dashboard routes.
- Vietnamese and English user-visible UI affected by the refactor.
- Responsive and accessibility behavior at the shell, page, and shared-component levels.

### Excluded

- Authentication, registration, invitation, and other routes outside `/dashboard`.
- Backend, API, database, query-key, and response-schema changes.
- New product features, navigation destinations, permissions, search capabilities, notifications, or command palettes.
- Dark mode or a second theme.
- Changes to published route paths or feature business workflows.

## Design Direction

### Editorial Command Deck

- Create hierarchy with alignment, typography, spacing, and subtle surface changes rather than wrapping every section in a card.
- Use orange as a controlled signal for primary actions, active navigation, focus, and important highlights.
- Keep canvas, panel, raised surface, borders, and status roles visually distinct.
- Use JetBrains Mono for technical labels, metadata, group headings, timestamps, and small status context.
- Use Inter for page titles, body copy, controls, and data labels.
- Avoid gradients, glassmorphism, decorative effects, excessive pills, oversized headings, and ornamental charts.
- Preserve feature-specific utility without allowing each feature to invent a separate visual system.

### Balanced Density

- Keep interactive targets at least 44px while using compact internal spacing for operational screens.
- Give page headings and major work surfaces enough breathing room without reducing useful data visibility.
- Use tighter rows for tables and activity lists than for forms, summary metrics, or explanatory states.
- Let mobile layouts stack and simplify rather than shrinking desktop layouts below usable dimensions.

## Architecture

The refactor follows three presentation layers:

1. **Shell layer** in `frontend/src/app/layout/` owns global dashboard composition and shell-only behavior.
2. **Shared presentation layer** in `frontend/src/shared/ui/` provides typed, presentational primitives with no API calls, feature business logic, or global-store access.
3. **Feature composition layer** in `frontend/src/features/<feature>/` combines feature hooks, route state, mutations, and shared presentation primitives.

`AppShell` remains the orchestration boundary for workspace, authentication, language, navigation state, synchronization messages, and the route outlet. Feature pages continue to own feature data and interactions.

Shared components should expose focused typed props and composition slots. They must not become a catch-all dashboard framework or accept feature-specific unions that couple unrelated domains.

## Admin Shell

### Sidebar

The existing responsive model remains unchanged:

- Desktop defaults to a 280px expanded sidebar and can persistently collapse to a 72px rail.
- Tablet uses the 72px rail without overwriting the stored desktop preference.
- Mobile removes the persistent sidebar and uses an accessible drawer.

The visual treatment uses:

- A compact orange brand mark, spaced FLAE wordmark, and mono product descriptor.
- A concise workspace identity strip rather than a standalone promotional card.
- Mono navigation group headings and stable vertical rhythm.
- Mostly flat inactive navigation items with visible hover and focus feedback.
- An active state combining pale orange surface, orange geometric indicator, stronger text, and `aria-current="page"`.
- A visually subordinate collapse control at the bottom.
- Raised semantic tooltips for the collapsed rail.

The drawer retains focus trapping, Escape dismissal, backdrop dismissal, route-change dismissal, breakpoint dismissal, body scroll locking, and focus restoration.

### Header

The header is a sticky command strip with two zones:

- **Context zone:** navigation group or route context as a mono eyebrow, followed by the current page label.
- **Utility zone:** workspace selector, language selector, user identity, and logout aligned as one control cluster.

The header keeps native accessible selects. Controls share height, border, focus, and disabled-state treatment. Long workspace names, user names, emails, and translated labels truncate visually without losing accessible names.

At narrower widths, optional context and identity details hide before essential controls become unusable. Mobile prioritizes the menu trigger, workspace selection, language, and logout.

### Page Frame

Every dashboard page uses a consistent frame containing only the slots it needs:

- Optional mono eyebrow or section context.
- Page title.
- Concise supporting description.
- Optional status or metadata.
- Primary and secondary action slots.
- Optional toolbar below the heading.

The frame provides consistent content width, responsive padding, vertical rhythm, and heading semantics. It does not own feature data or feature actions.

## Page Archetypes

### 1. Overview

Used by Briefing, Inbox, and Reports summary screens.

Composition:

- Page frame and contextual primary action.
- Optional metric band for high-value summary values.
- Prioritized signal, event, or report list.
- Clear timestamps, provenance, severity, and status.
- Purposeful empty state when no signals or reports exist.

Overview pages should read as editorial summaries rather than generic card grids.

### 2. Explorer

Used by Agent list, Knowledge list, and Topic list.

Composition:

- Page frame with create, upload, or other primary action.
- Shared toolbar for search, filters, view options, and contextual actions.
- Table or grid selected according to the existing feature behavior.
- Pagination or incremental navigation where already supported.
- Detail panel or route navigation using current behavior.

Tables retain semantic headers and responsive alternatives. Mobile may hide secondary columns or move metadata into stacked rows, but it must not remove essential information or actions.

### 3. Workbench

Used by Chat, Agent chat, Knowledge graph, and Topic detail.

Composition:

- Full-height working region below the shared shell.
- Feature toolbar for controls that directly affect the active work surface.
- Primary canvas, conversation, or detail surface.
- Optional collapsible sidebar or inspector panel.
- Stable composer or action region where applicable.

Workbench pages minimize decorative containers and preserve maximum usable space. Scroll ownership must be explicit so the shell, primary surface, and side panels do not create competing page scrollbars.

### 4. Configuration

Used by Agent configuration and Workspace settings.

Composition:

- Page frame and clear save or publish action.
- Section navigation through existing routes or accessible tabs.
- Grouped form sections with labels, help text, validation, and status feedback.
- Sticky or consistently located save feedback when forms are long.
- Visually separated danger zones only where destructive actions already exist.

The Zod schema remains the validation source where forms already use React Hook Form. This UI refactor does not introduce duplicate validation state.

## Shared Presentation System

The implementation may add or refine focused shared components when at least two features need the same visual and behavioral contract. Likely candidates include:

- `PageHeader` for page context, title, description, metadata, and actions.
- `PageToolbar` for search, filters, view controls, and contextual actions.
- `MetricBand` or focused metric primitives for summary values.
- Data-row and responsive table presentation built on the existing shared table.
- Shared status, progress, empty, loading, and error states.
- Inspector or detail-panel framing where multiple workbench pages need it.

Existing shared primitives such as Button, Input, Select, Table, Tabs, Dialog, Skeleton, Toast, and ErrorState should be refined rather than duplicated. Feature-only UI stays inside its feature directory.

Do not add a shared abstraction merely because two components look temporarily similar. A shared component requires a stable semantic and interaction contract.

## State And Data Flow

- All server state remains in TanStack Query hooks owned by the relevant feature.
- Zustand remains limited to genuinely shared client state such as authentication and active workspace.
- Feature pages transform query data into typed presentational props during render or in feature hooks.
- Shared UI never calls APIs, reads feature query caches, or accesses global stores.
- Network requests continue through typed API modules with normalized errors.
- The refactor must not copy query data into Zustand or add effects for render-time derivation.
- Existing WebSocket, SSE, Redis-backed realtime behavior, and synchronization contracts remain unchanged.

## Loading, Empty, Error, And Mutation States

### Loading

- Skeletons match the approximate shape and hierarchy of the final page.
- Workbench loading preserves the primary surface dimensions to avoid layout jumps.
- Background refetching does not replace already usable content with a full-page spinner.

### Empty

- Empty states explain what is absent, why it matters, and the next available action.
- The CTA uses an existing authorized workflow; the refactor does not invent product capabilities.
- Empty states remain concise and feature-specific rather than using one generic illustration everywhere.

### Error

- Query errors use normalized frontend-friendly messages and a retry at the smallest useful scope.
- Page-level errors preserve the shared shell and page context.
- Mutation failures keep user input intact and provide an alert or toast with a clear recovery path.
- Connection-wide failures continue through the existing global failure lifecycle and connection dialog.

### Mutations And Realtime Status

- Pending actions disable duplicate submission and retain a stable accessible label.
- Success and failure feedback uses text or icons in addition to color.
- Important dynamic updates use appropriately scoped `aria-live` regions.
- Realtime and synchronization statuses avoid noisy repeated announcements.

## Responsive Behavior

Required verification widths are 375px, 768px, 1024px, and 1440px.

### 1440px

- Expanded sidebar is the default unless the user persisted the rail.
- Utility identity may show name and email.
- Explorer and workbench layouts can use side panels without compressing the primary surface.

### 1024px

- Desktop sidebar preference remains effective.
- Optional user email and secondary metadata hide before controls wrap.
- Multi-column page sections reduce deliberately rather than scaling text or controls down.

### 768px

- The persistent 72px rail remains in layout flow.
- Header context and optional identity details reduce.
- Explorer tables use responsive column priorities or stacked rows.
- Workbench secondary panels collapse when necessary.

### 375px

- The sidebar becomes a drawer.
- Essential header controls remain reachable without horizontal scrolling.
- Page context moves into the content heading when header space is limited.
- Metrics, forms, and summary sections stack to one column.
- Toolbars wrap or move secondary actions into an accessible overflow control.
- Tables provide a usable stacked representation when horizontal scrolling would make primary tasks impractical.

No viewport may have content hidden behind fixed shell elements or produce page-level horizontal overflow.

## Accessibility

- Use semantic HTML before ARIA.
- Preserve logical heading hierarchy across the shell and pages.
- Maintain WCAG 2.2 AA contrast for text, meaningful borders, status indicators, and focus states.
- Keep visible focus and predictable keyboard order.
- Keep primary interactive targets at least 44px in both dimensions.
- Preserve drawer focus trap, Escape handling, focus restoration, and body scroll locking.
- Use `aria-current`, text weight, and geometry in addition to color for active navigation.
- Label all native and custom controls programmatically.
- Associate validation errors and supporting text with their inputs.
- Provide non-color status cues.
- Respect `prefers-reduced-motion` for transitions and animations.
- Avoid hover-only access to information or actions.

## Motion

- Use 150-200ms transitions for controls, active states, panels, and sidebar width changes.
- Use a small number of restrained entrance or state-change animations only where they clarify hierarchy.
- Never scale or resize controls on hover.
- Do not animate large work surfaces unnecessarily.
- Reduced-motion mode removes non-essential transitions and animations.

## Testing Strategy

### Unit And Integration

- Shared primitives test visible behavior, keyboard access, accessible names, loading, disabled, error, and responsive contracts where practical.
- Shell tests cover expanded, rail, tablet, and drawer behavior; persistence; active navigation; tooltips; focus handling; and workspace synchronization.
- Each feature page retains or adds integration coverage for the same user workflows after migration.
- Tests should query by semantic role, label, and visible text instead of styling implementation details except for explicit design-token contracts.

### End-To-End

Playwright coverage should include:

- Navigation through every dashboard destination.
- Expanded/rail persistence and mobile drawer behavior.
- Header workspace and language controls.
- Representative Overview, Explorer, Workbench, and Configuration workflows.
- Search/filter or equivalent exploration behavior where already supported.
- Chat composition and conversation scrolling.
- Knowledge graph controls and detail-panel behavior.
- Settings navigation, validation, and save feedback.
- Long translated labels, long workspace names, and long user identity content.
- Keyboard navigation, reduced motion, and absence of page-level horizontal overflow.

### Quality Gates

- Frontend Vitest suite and coverage at or above 75%.
- TypeScript typecheck.
- ESLint with zero warnings.
- Production build.
- File-size validation, keeping source files at or below the repository threshold.
- Relevant Playwright suites at the required viewport widths.
- `git diff --check`.

## Migration Strategy

Implementation should be staged to reduce behavioral regression:

1. Refine semantic tokens and shared primitives without changing feature composition.
2. Complete the shared shell and responsive page frame.
3. Build and test the four page-archetype contracts.
4. Migrate Overview pages.
5. Migrate Explorer pages.
6. Migrate Workbench pages.
7. Migrate Configuration pages.
8. Consolidate duplicated feature UI only where stable shared contracts emerge.
9. Complete responsive, accessibility, full-suite, and browser verification.

Each stage must leave migrated routes functional and tested. Existing routes must not be temporarily removed or redirected during the migration.

## Non-Goals

- Reorganizing navigation groups or destinations.
- Replacing TanStack Query, Zustand, React Router, React Hook Form, or Zod.
- Rewriting feature API clients or backend services.
- Introducing a dashboard-specific token system that competes with `frontend/src/styles.css`.
- Creating a monolithic dashboard component library or catch-all feature.
- Adding speculative charts, metrics, filters, or actions that current product behavior does not support.
- Redesigning public authentication and invitation experiences.

## Acceptance Criteria

The refactor is complete when:

- Every route under `/dashboard` uses the approved Editorial Command Deck direction at Balanced density.
- Sidebar, rail, drawer, header, and page frame form one responsive and accessible shell.
- All dashboard pages map cleanly to an approved archetype without losing existing behavior.
- Shared UI is typed, presentational, semantic, and free of API or global-store access.
- Loading, empty, error, mutation, and realtime states use a consistent user-visible grammar.
- All routes remain stable and all current data and business flows continue to work.
- The UI has no page-level horizontal overflow at 375px, 768px, 1024px, or 1440px.
- Keyboard access, visible focus, contrast, target size, reduced motion, and screen-reader announcements meet the stated accessibility contract.
- Automated quality gates pass and frontend coverage remains at or above 75%.
