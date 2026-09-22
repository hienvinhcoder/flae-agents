# Extractable Components

## Layout
### AdminSidebar
- Source: `frontend/src/app/layout/AdminSidebar.tsx`
- Category: layout
- Description: Primary nav rail with brand, Chat/Agents/Knowledge/Topics, settings
- Extractable props: desktopLayout, mobileOpen, onCloseMobile, onToggleDesktop
- Hardcoded: FLAE brand mark, nav labels/icons, layout classes

### AdminHeader
- Source: `frontend/src/app/layout/AdminHeader.tsx`
- Category: layout
- Description: Sticky top bar with MCP status, Add Source, workspace utilities
- Extractable props: pageLabel, sectionLabel, workspace/user sync handlers
- Hardcoded: MCP/Add Source demo buttons, glass header styles

### AppShell
- Source: `frontend/src/app/layout/AppShell.tsx`
- Category: layout
- Description: Authenticated chrome wrapping Outlet
- Extractable props: fetchWorkspaces, syncSelection, logoutController

## Feature (knowledge)
### KnowledgeLibraryToolbar
- Source: `frontend/src/features/knowledge/ui/KnowledgeLibraryToolbar.tsx`
- Category: basic
- Description: Search + status filter + grid/list toggle
- Extractable props: search, status, viewMode, change handlers

### DocumentGrid
- Source: `frontend/src/features/knowledge/ui/DocumentGrid.tsx`
- Category: basic
- Description: Document card grid for Company Memory library
- Extractable props: documents, loading, action callbacks
