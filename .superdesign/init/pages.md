# Page Dependency Trees

## /dashboard/knowledge (demo target)
Entry: `frontend/src/features/knowledge/pages/KnowledgeListPage.tsx`
Dependencies:
- `frontend/src/shared/ui/Button.tsx`
- `frontend/src/shared/ui/ErrorState.tsx`
- `frontend/src/shared/ui/PageHeader.tsx`
- `frontend/src/features/knowledge/ui/KnowledgeLibraryToolbar.tsx`
- `frontend/src/features/knowledge/ui/DocumentGrid.tsx`
- `frontend/src/features/knowledge/ui/DocumentTable.tsx`
- `frontend/src/features/knowledge/ui/DocumentDetailPanel.tsx`
- `frontend/src/features/knowledge/ui/UploadDialog.tsx`
- `frontend/src/features/knowledge/ui/TextInputDialog.tsx`
- Shell: `frontend/src/app/layout/AppShell.tsx` → AdminSidebar, AdminHeader

## /dashboard/chat
Entry: `frontend/src/features/chat/pages/ChatPage.tsx` → ChatExperience + ConversationSidebar, ChatComposer, messages

## /dashboard/agents
Entry: `frontend/src/features/agents/pages/AgentListPage.tsx` → AgentCard, PageHeader, EmptyState

## /dashboard/settings
Entry: `frontend/src/features/settings/pages/SettingsPage.tsx` → Tabs, WorkspaceGeneralPanel, WorkspaceMembersPanel

## /dashboard/knowledge/graph
Entry: `frontend/src/features/knowledge/pages/KnowledgeGraphPage.tsx` → GraphCanvas + filters/legend/toolbar
