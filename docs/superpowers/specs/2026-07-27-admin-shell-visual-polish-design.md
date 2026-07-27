# Admin Shell Visual Polish Design

**Date:** 2026-07-27
**Status:** Approved design direction, pending written-spec review
**Scope:** Visual refinement of the shared dashboard header and navigation shell

## Objective

Polish the existing admin header and sidebar so they feel more premium, intentional, and visually coherent without changing the approved responsive shell behavior or any feature-page functionality. The selected direction is **Editorial Command Deck**: a warm, refined operational interface with clear hierarchy, restrained depth, and fewer card-like containers.

The implementation must follow the root `DESIGN.md` contract and the semantic tokens in `frontend/src/styles.css`. It keeps the light orange-and-cream palette, Inter and JetBrains Mono typography roles, 18px control radius, 40px major-panel radius, and restrained 150-300ms motion.

## Design Principles

- Create hierarchy through alignment, typography, spacing, and subtle surface changes rather than adding more boxes.
- Keep the shell compact enough for operational work while giving brand and page context clearer visual priority.
- Use orange as a controlled navigational signal, not as broad decoration.
- Preserve flat, calm backgrounds with subtle borders and shadows; do not add gradients or glassmorphism.
- Keep feature-page content visually and functionally outside this refinement.

## Sidebar Composition

### Expanded Desktop Layout A

The expanded sidebar remains exactly 280px wide and retains the current brand, workspace identity, grouped navigation, Settings destination, and collapse control.

- The sidebar uses a warm shared panel surface with a subtle right divider.
- The brand block has stronger editorial hierarchy: a compact orange mark, spaced FLAE wordmark, and small mono product descriptor.
- Workspace identity becomes a concise identification strip rather than a prominent standalone card. It keeps the building icon, accessible workspace label, and truncation behavior.
- Navigation group headings use JetBrains Mono, uppercase technical treatment, and restrained spacing.
- Standard navigation items remain mostly flat. Their surface appears on hover or active state rather than every item reading as a button.
- The active destination uses a pale orange surface, a visible orange left indicator, stronger text, and `aria-current="page"`.
- The collapse control sits quietly at the bottom as a utility action. It is visually subordinate to navigation and does not look like an unrelated card.

### Collapsed Desktop And Tablet Layout B

The rail remains exactly 72px wide and uses the same navigation model.

- Brand, navigation icons, active indicator, group separators, and collapse/expand control align to one vertical rhythm.
- Tooltips use the shared raised surface, semantic borders, and restrained panel shadow.
- Hover, focus, and active states do not resize controls or shift surrounding content.
- The tablet responsive override continues to use B without mutating the stored desktop preference.

### Mobile Drawer

The drawer keeps the expanded A information architecture and existing accessibility behavior.

- Brand and workspace presentation match the refined desktop sidebar at mobile density.
- The close control remains visible and easy to reach without competing with the brand.
- Route selection, backdrop activation, Escape, pathname changes, and breakpoint changes retain their current dismissal behavior.
- Focus trapping, focus restoration, and body scroll locking remain unchanged except where visual wrappers require test updates.

## Header Composition

The sticky header becomes a clear command strip rather than a row of unrelated controls. It uses a 76px minimum height on desktop and a 64px minimum height on mobile.

### Left Context Zone

- The navigation group appears as a small mono eyebrow.
- The current page label appears directly below it with stronger weight and size.
- Long translated labels truncate without changing accessible names.

### Right Utility Zone

- Workspace selection, language selection, user identity, and logout are grouped into one aligned utility cluster.
- The workspace selector gains clearer internal hierarchy while remaining a native accessible `select`.
- User identity is presented as one compact avatar-and-name cluster on wider screens.
- Logout stays available as a secondary action with a stable accessible name and loading state.
- Controls share a consistent height, border treatment, and focus behavior.

### Surface And Separation

- The header uses the shared raised/canvas surface with a subtle bottom divider and restrained depth.
- The outer header remains full-width within the content region; it does not become a floating pill or rounded card.
- No decorative gradients, oversized title treatment, or unrelated global actions are introduced.

## Responsive Behavior

### 1440px And 1024px

- Expanded A is the default unless the persisted user preference is collapsed.
- The left page context remains readable while utility controls stay aligned to the right.
- At 1440px, the user cluster may show name and email. At 1024px, it shows the avatar and name while hiding the email before any utility control becomes cramped.

### 768px

- The 72px rail remains in page flow.
- Header context and optional identity text reduce before workspace or language controls lose usability.
- No fixed element overlaps content, and the page has no horizontal overflow.

### 375px

- Persistent sidebar is absent and the menu button opens the accessible drawer.
- The header prioritizes the menu trigger, workspace selection, and essential utility actions.
- Non-essential context and identity text hide responsively while accessible names remain available.

## Interaction And Motion

- Hover and focus feedback use semantic surface, border, text, and focus-ring changes.
- Motion remains within 150-200ms for shell controls and about 200ms for sidebar width changes.
- Controls do not scale, translate, or change dimensions on hover.
- `prefers-reduced-motion: reduce` continues to remove non-essential transitions.
- Keyboard focus remains visible and follows the existing logical order.

## Component Boundaries

### `AdminSidebar`

Retains navigation rendering, expanded/collapsed/mobile presentations, tooltips, mobile focus management, and dismissal behavior. Cohesive visual subcomponents may be extracted if needed to keep the file below 450 lines.

### `AdminHeader`

Remains presentational. It receives all workspace, language, user, and logout state through typed props. Small presentational units such as workspace control or user utility may be extracted if that improves readability and testability.

### `AppShell`

Keeps orchestration and layout offsets. It should require only narrowly scoped class or composition updates if header dimensions change. Workspace loading, synchronization, routing, authentication, and outlet behavior must not change.

## Accessibility Requirements

- Preserve semantic `nav`, `header`, buttons, labels, native selects, and dialog behavior.
- Maintain WCAG 2.2 AA contrast for text, borders needed for understanding, focus indicators, and active navigation states.
- Keep every primary interactive target at least 44px in both dimensions.
- Active navigation continues to use text weight, `aria-current`, and a geometric indicator in addition to color.
- Collapsed navigation continues to expose accessible names and hover/focus tooltips.
- Visible focus, drawer focus trap, Escape handling, focus restoration, and reduced motion must remain covered by tests.

## Testing Strategy

### Unit And Integration

- Header renders the intended context hierarchy and retains accessible labels for native controls.
- User and logout controls preserve stable accessible names and loading behavior.
- Expanded, collapsed, tablet, and drawer sidebar presentations retain their current semantics.
- Active navigation, grouped labels, tooltip behavior, and mobile dismissal continue to work.
- AppShell workspace selection, synchronization messages, route content, and layout preference remain unchanged.

### Browser Verification

- Inspect the shell at 375px, 768px, 1024px, and 1440px.
- Verify no horizontal scrolling or obscured content.
- Verify header controls remain usable with long workspace, user, and translated labels.
- Verify desktop A/B persistence, tablet override, mobile drawer behavior, keyboard focus, and reduced motion.
- Compare the implementation against the approved Editorial Command Deck visual direction.

### Quality Gates

Run focused layout tests, the full frontend Vitest suite, typecheck, lint, production build, file-size validation, relevant Playwright shell scenarios, and `git diff --check`.

## Non-Goals

- Changing navigation destinations, grouping, routing, permissions, or persistence behavior.
- Changing workspace APIs, synchronization, authentication, language switching, or logout behavior.
- Redesigning dashboard feature pages or adding new dashboard actions.
- Adding a search command palette, notification center, dark mode, gradients, or new design tokens.
- Replacing native selects with custom comboboxes.

## Acceptance Criteria

The refinement is complete when the header and sidebar match the approved Editorial Command Deck direction, preserve all current shell behavior, remain accessible and responsive at the required breakpoints, use only shared semantic design tokens, keep all source files at or below 450 lines, and pass the defined automated quality gates.
