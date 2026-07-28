# Knowledge Workspace Refactor Design

**Date:** 2026-07-28  
**Route:** `/dashboard/knowledge`  
**Scope:** Frontend UI/UX refactor using existing data and APIs

## Context

FLAE is an AI Company Memory platform, but the current knowledge page reads primarily as a document-ingestion administration screen. Four equally weighted metric cards, three competing header actions, a grid/list switcher, and per-item actions create visual noise without helping users find and inspect workspace knowledge quickly.

This refactor turns the page into a focused knowledge workspace. It prioritizes finding and opening existing knowledge, keeps ingestion health visible without making it the page's central subject, and provides clear paths to add content or explore the knowledge graph.

## Goals

- Make finding and inspecting workspace knowledge the primary flow.
- Establish one clear primary action: upload a document.
- Keep processing health and failures visible in a compact form.
- Make document details available without disrupting desktop context.
- Reuse the current knowledge API, mutations, polling, schemas, and query cache.
- Preserve responsive behavior, keyboard access, and WCAG 2.2 AA expectations.

## Non-goals

- Adding semantic search, question answering, or full-content search.
- Adding connector management or new source integrations.
- Changing backend endpoints, schemas, or ingestion behavior.
- Refactoring the knowledge graph route.
- Adding bulk document operations.

## Recommended Experience

### 1. Compact page introduction

The page opens with an eyebrow, the title “Company knowledge,” and a concise explanation that this workspace contains the sources grounding FLAE's answers. Actions follow a strict hierarchy:

1. “Upload document” is the single primary orange action.
2. “Add content” is a secondary action.
3. “Open knowledge graph” is a lower-emphasis navigation link.

The header must stay compact enough that search and content remain visible in the first desktop viewport.

### 2. Search and health controls

A wide search input appears directly below the header and filters the existing document metadata: title, description, and file name. It must not imply semantic or extracted-content search.

The current status select is replaced by status chips with counts:

- All: every document.
- Ready: `completed`.
- Processing: `pending` and `processing`.
- Needs attention: `failed`.

The controls also show a concise result summary. Processing and failure counts remain visible here, replacing the four stat cards. A clear-search affordance appears when a query is present, and a clear-filters action appears when filters produce no results.

### 3. Two-column knowledge workspace

On large screens, the primary area uses two columns:

- A flexible main column contains the knowledge item list.
- A 320–360px sticky context rail contains the selected document details.

The list replaces both the table/grid switcher and card grid. Each row prioritizes:

- Title and description.
- Source type and updated date.
- Chunk count and uploader where available.
- A status indicator containing both an icon and text.

Opening a row selects the document. A failed row also exposes “Retry processing.” Delete is not repeated in every row; it remains available in the detail panel, separated from primary actions.

When no document is selected, the context rail explains how uploaded knowledge grounds FLAE and links to the knowledge graph. This gives the otherwise empty panel a product-relevant purpose.

On smaller screens, the list becomes a single column and document details use the existing accessible dialog pattern. Mobile must not render an unusably narrow fixed rail.

## Component Boundaries

`KnowledgeListPage` remains the route-level container. It owns dialog visibility, selected-document identity, retry bookkeeping, deletion confirmation, and composition of query state. Presentation is divided into focused feature components:

- `KnowledgeOverview`: page introduction, action hierarchy, and compact health summary.
- `KnowledgeFilters`: search field, status chips, counts, and result summary.
- `KnowledgeItemList`: loading, empty, and populated list rendering.
- `KnowledgeItemRow`: a single accessible knowledge item and its contextual retry action.
- `KnowledgeDetailWorkspace`: responsive desktop rail/mobile dialog orchestration.
- `KnowledgeDetailContent`: shared document metadata, ingestion progress, extracted content, errors, retry, and delete actions.

Filtering and count derivation should live in typed pure helpers so that UI components receive already-derived values. Components must remain within the knowledge feature; no new cross-feature abstraction is justified.

## State and Data Flow

`useKnowledge` remains the only server-state entry point and continues to use TanStack Query. The page does not copy query data into Zustand.

The page maintains only local interaction state:

- Search query.
- Selected status group.
- Selected document ID.
- Upload and manual-content dialog visibility.
- Workspace-scoped retry progress and retry errors.

Status groups are derived client-side from existing document statuses. Search remains an immediate local metadata filter. Existing polling continues while any document is pending or processing.

Selection must be cleared when a selected document is deleted or no longer exists in the active workspace. Retry progress and errors must remain scoped to the workspace where the operation began, preserving the existing race-safety behavior.

## Responsive and Accessible Behavior

- Use semantic headings in order: one `h1`, section `h2` elements, and detail subsections as `h3`.
- Use buttons and links for interactions; do not make a bare `div` clickable.
- Every icon-only action must have an accessible name.
- Status must use text and iconography in addition to color.
- Touch targets must be at least 40×40px.
- Focus indicators must use the shared focus token and remain visible on every interactive element.
- Status chips must expose their selected state with `aria-pressed`.
- Loading regions must expose a useful busy label.
- Motion is limited to existing short transitions and loading indicators, with reduced-motion support.
- At desktop widths, the detail rail is sticky without trapping keyboard focus.
- At mobile and tablet widths, details open in the existing focus-managed dialog.

## Visual Direction

The implementation follows `DESIGN.md`:

- The app canvas uses the warm background token.
- Parchment and raised surfaces are separated with 1px borders rather than inline shadows.
- Orange is reserved for the upload CTA and the most important selected state.
- Dashboard density stays compact; spacing follows the 4px grid.
- Typography is editorial and restrained, with technical metadata using the existing mono style where appropriate.
- Lucide icons are used exclusively.

The refactor removes decorative stat-card repetition, unnecessary elevation, large hover translations, and competing accent treatments from the knowledge page.

## Loading, Empty, and Error States

### Loading

Render skeletons that preserve the future list and context-rail layout. Do not replace the entire content area with a centered spinner.

### Empty knowledge base

Explain that uploaded or manually entered sources will become the evidence FLAE uses. Offer “Upload document” as the primary action and “Add content” as secondary.

### Empty filtered result

State that no knowledge matches the current query and status group, retain the controls, and offer a single “Clear filters” action.

### List error

Render the shared error state inside the list region with the existing retry query action. Header actions remain available.

### Detail error

Keep the list usable and show the error only in the context rail or mobile dialog. Do not replace the full page.

### Mutation errors

Show retry errors adjacent to the relevant failed item or inside its detail panel. Show delete errors inside the selected-document context. Upload and manual-content errors remain in their dialogs.

## Interaction Details

- Selecting a row requests its details through the existing `useKnowledge` detail query.
- Retrying a failed document disables only that document's retry control.
- Deleting requires the existing confirmation before calling the mutation.
- Successful deletion closes the detail view only when the API confirms deletion.
- Upload and manual-content dialogs keep their existing validation and mutation paths.
- View preference persistence is removed because the page has one intentional list presentation.

## Testing Strategy

Update and add Vitest/React Testing Library coverage for:

- Search across title, description, and file name.
- All four status groups, including the combined pending/processing group.
- Status counts and result summaries.
- Selecting a document and rendering shared detail content.
- Desktop context rail and mobile dialog behavior through deterministic responsive seams rather than brittle viewport-only assertions.
- Upload, manual content, retry, deletion, and their error states.
- Loading, empty-base, empty-filter, list-error, and detail-error states.
- Selection cleanup and workspace-scoped retry behavior.
- Accessible names, heading hierarchy, status text, `aria-pressed`, and keyboard-operable controls.

Run the focused knowledge tests, the complete frontend unit suite if practical, TypeScript checking, and the production build. Preserve or increase the repository's current frontend coverage.

## Acceptance Criteria

- Search and the knowledge list are visible without scrolling on a typical desktop viewport.
- Upload is the only primary-accent action in the page header.
- The four metric cards and grid/list switcher are removed.
- Users can distinguish ready, processing, and failed knowledge without relying on color.
- Selecting an item keeps list context visible on desktop and uses a dialog on smaller screens.
- Existing upload, manual entry, retry, delete, detail loading, and polling behavior continue to work.
- No backend or API contract changes are required.
- The page passes the focused tests, type-check, and production build.
