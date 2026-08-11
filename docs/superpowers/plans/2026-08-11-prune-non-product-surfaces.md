# Non-Product Surface Pruning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Morning Brief, Inbox, Reports, fixture-backed Dashboard, and the Temporal Greeting demo while making Chat the authenticated default.

**Architecture:** The frontend router and navigation expose only retained product features; deleted routes are not redirected or kept as compatibility aliases because the app is unreleased. The application worker keeps only real lightweight workflows, while its capacity-isolation test uses a test-local probe instead of shipping a demo workflow.

**Tech Stack:** React Router, React 19, TypeScript, Vitest, React Testing Library, Playwright, Temporal Python SDK, pytest, GitNexus.

---

## Blast radius

GitNexus reported LOW risk and no indexed execution processes for `BriefingPage`, `InboxPage`, `ReportsPage`, `DashboardHomePage`, and `GreetingWorkflow`. Lazy route imports and Temporal worker registration are only partially represented, so the static route, navigation, locale, worker, and E2E references listed below are mandatory scope.

## Target files

**Delete frontend source:**

- `frontend/src/features/briefing/`
- `frontend/src/features/inbox/`
- `frontend/src/features/reports/`
- `frontend/src/features/dashboard/`
- `frontend/src/features/supporting-pages.test.tsx`
- `frontend/src/shared/ui/PlaceholderPage.tsx`
- `frontend/tests/e2e/dashboard-home.spec.ts`

**Modify frontend:**

- `frontend/src/app/router/router.tsx`
- `frontend/src/app/router/router.test.tsx`
- `frontend/src/app/layout/admin-navigation.ts`
- `frontend/src/app/layout/admin-navigation.test.ts`
- `frontend/src/app/layout/AdminSidebar.test.tsx`
- `frontend/src/app/layout/AppShell.test.tsx`
- `frontend/public/assets/i18n/en.json`
- `frontend/public/assets/i18n/vi.json`
- `frontend/tests/e2e/admin-shell.spec.ts`
- `frontend/tests/e2e/auth.spec.ts`
- `frontend/tests/e2e/workspace.spec.ts`
- `frontend/tests/firebase/firebase-emulator-auth.spec.ts`

**Delete backend/demo:**

- `backend/app/temporal/activities/greet.py`
- `backend/app/temporal/workflows/greeting.py`
- `backend/app/schemas/temporal_demo.py`

**Modify backend:**

- `backend/app/temporal/activities/__init__.py`
- `backend/app/temporal/workflows/__init__.py`
- `backend/workers/flae_worker.py`
- `backend/tests/temporal/test_ingestion_worker_capacity.py`

**Delete obsolete migration documentation:**

- `docs/migrations/angular-to-react/acceptance-checklist.md`
- `docs/migrations/angular-to-react/api-contracts.md`
- `docs/migrations/angular-to-react/route-parity.md`

### Task 1: Specify the retained router contract

**Files:**

- Modify: `frontend/src/app/router/router.test.tsx`
- Modify: `frontend/src/app/router/router.tsx`

- [ ] **Step 1: Run impact analysis before editing router symbols**

Invoke:

```text
impact({
  target: "createRouteObjects",
  file_path: "frontend/src/app/router/router.tsx",
  direction: "upstream",
  includeTests: true,
  maxDepth: 3
})
```

Expected: LOW or MEDIUM risk. If HIGH or CRITICAL, report the direct consumers before editing.

- [ ] **Step 2: Replace parity-path tests with retained and removed route tests**

Use this route inventory in `router.test.tsx`:

```tsx
const retainedPaths = [
  "/",
  "/auth",
  "/auth/login",
  "/auth/register",
  "/invite",
  "/dashboard",
  "/dashboard/chat",
  "/dashboard/agents",
  "/dashboard/agents/new",
  "/dashboard/agents/agent-1/edit",
  "/dashboard/agents/agent-1/chat",
  "/dashboard/knowledge",
  "/dashboard/knowledge/graph",
  "/dashboard/topics",
  "/dashboard/topics/topic-1",
  "/dashboard/settings",
];

const removedPaths = [
  "/dashboard/briefing",
  "/dashboard/inbox",
  "/dashboard/reports",
];
```

Replace the existing parity and Dashboard Home tests with:

```tsx
it.each(retainedPaths)("matches retained route %s", (path) => {
  expect(matchRoutes(createRouteObjects(<Outlet />), path)).not.toBeNull();
});

it.each(removedPaths)("does not expose removed route %s", (path) => {
  expect(matchRoutes(createRouteObjects(<Outlet />), path)).toBeNull();
});

it("redirects the authenticated dashboard index to chat", async () => {
  useAuthStore.getState().setAuthenticated(authenticatedUser);
  const router = createMemoryRouter(createRouteObjects(<Outlet />), {
    initialEntries: ["/dashboard"],
  });
  const queryClient = new QueryClient();
  render(
    <TestI18nProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </TestI18nProvider>,
  );

  await waitFor(() => {
    expect(router.state.location.pathname).toBe("/dashboard/chat");
  });
});
```

Add `waitFor` to the Testing Library import and remove unused `screen` if the remaining test no longer uses it.

- [ ] **Step 3: Run the router test and verify it fails**

Run:

```bash
npm --prefix frontend run test -- router.test.tsx
```

Expected: FAIL because the dashboard still renders `DashboardHomePage` and removed routes still match.

- [ ] **Step 4: Replace the dashboard index and remove deleted lazy routes**

In `createRouteObjects`, make the dashboard children start with:

```tsx
children: [
  { index: true, element: <Navigate replace to="chat" /> },
  {
    path: "chat",
    element: createLazyElement(() =>
      import("../../features/chat/pages/ChatPage").then(({ ChatPage }) => ({
        default: ChatPage,
      })),
    ),
  },
```

Keep the existing retained `agents`, `knowledge`, `topics`, and `settings` entries unchanged. Delete the `briefing`, `inbox`, `reports`, and Dashboard Home imports/entries.

- [ ] **Step 5: Run the router test and verify it passes**

Run:

```bash
npm --prefix frontend run test -- router.test.tsx
```

Expected: PASS.

### Task 2: Restrict navigation to retained product features

**Files:**

- Modify: `frontend/src/app/layout/admin-navigation.test.ts`
- Modify: `frontend/src/app/layout/admin-navigation.ts`

- [ ] **Step 1: Run impact analysis for navigation**

Invoke:

```text
impact({
  target: "navigationGroups",
  file_path: "frontend/src/app/layout/admin-navigation.ts",
  direction: "upstream",
  includeTests: true,
  maxDepth: 3
})
```

Expected: direct consumers include the admin sidebar tests/components. Record them before editing.

- [ ] **Step 2: Change the exact expected navigation groups in the test**

The test expectation must become:

```tsx
expect(groups).toEqual([
  {
    id: "focus",
    key: "SHELL.NAV_GROUP_FOCUS",
    items: [
      {
        key: "NAV.CHAT",
        to: "/dashboard/chat",
        icon: MessageSquare,
      },
    ],
  },
  {
    id: "intelligence",
    key: "SHELL.NAV_GROUP_INTELLIGENCE",
    items: [
      { key: "NAV.AGENTS", to: "/dashboard/agents", icon: Bot },
      { key: "NAV.KNOWLEDGE", to: "/dashboard/knowledge", icon: BookOpen },
      {
        key: "SHELL.KNOWLEDGE_GRAPH",
        to: "/dashboard/knowledge/graph",
        icon: Network,
      },
      { key: "NAV.TOPICS", to: "/dashboard/topics", icon: Tags },
    ],
  },
  {
    id: "workspace",
    key: "SHELL.NAV_GROUP_WORKSPACE",
    items: [
      { key: "NAV.SETTINGS", to: "/dashboard/settings", icon: Settings },
    ],
  },
]);
```

Update the active-item cases so `/dashboard/chat` maps to `NAV.CHAT`; delete Overview and Briefing cases. Remove unused `FileText`, `House`, `Inbox`, and `Sparkles` imports.

- [ ] **Step 3: Run the navigation test and verify it fails**

```bash
npm --prefix frontend run test -- admin-navigation.test.ts
```

Expected: FAIL because deleted navigation items still exist.

- [ ] **Step 4: Apply the same retained groups to production navigation**

Make `navigationGroups` match the test exactly. Remove unused icon imports from `admin-navigation.ts`.

- [ ] **Step 5: Run navigation and sidebar tests**

```bash
npm --prefix frontend run test -- admin-navigation.test.ts
```

Expected: PASS.

### Task 3: Delete frontend feature bundles and stale locales

**Files:**

- Delete: all frontend source paths listed in “Delete frontend source”
- Modify: `frontend/public/assets/i18n/en.json`
- Modify: `frontend/public/assets/i18n/vi.json`

- [ ] **Step 1: Delete the approved feature and test paths**

Run:

```bash
git rm -r frontend/src/features/briefing
git rm -r frontend/src/features/inbox
git rm -r frontend/src/features/reports
git rm -r frontend/src/features/dashboard
git rm frontend/src/features/supporting-pages.test.tsx
git rm frontend/src/shared/ui/PlaceholderPage.tsx
git rm frontend/tests/e2e/dashboard-home.spec.ts
```

Expected: Git stages only those deletions.

- [ ] **Step 2: Remove deleted locale namespaces and keys**

In both locale files, make the `NAV` object contain only:

```json
"NAV": {
  "CHAT": "AI Chat",
  "AGENTS": "My Agent Team",
  "KNOWLEDGE": "Knowledge Base",
  "TOPICS": "Topics",
  "SETTINGS": "Settings"
}
```

Use the existing Vietnamese translations for retained keys in `vi.json`. Delete the complete `OVERVIEW` and `DASHBOARD_HOME` objects from both locale files.

- [ ] **Step 3: Verify no production source references deleted namespaces**

Run:

```bash
git grep -n -E 'NAV\.(OVERVIEW|BRIEFING|INBOX|REPORTS)|OVERVIEW\.|DASHBOARD_HOME\.' -- frontend/src frontend/tests
```

Expected: no matches after Tasks 3 and 4 are complete. Matches in shell/E2E tests identify the exact fixtures to update next.

### Task 4: Retarget shell and E2E coverage to retained routes

**Files:**

- Modify: `frontend/src/app/layout/AdminSidebar.test.tsx`
- Modify: `frontend/src/app/layout/AppShell.test.tsx`
- Modify: `frontend/tests/e2e/admin-shell.spec.ts`
- Modify: `frontend/tests/e2e/auth.spec.ts`
- Modify: `frontend/tests/e2e/workspace.spec.ts`
- Modify: `frontend/tests/firebase/firebase-emulator-auth.spec.ts`

- [ ] **Step 1: Update unit-test route fixtures**

Apply these exact route substitutions only in test setup and expectations:

```text
/dashboard/briefing -> /dashboard/chat
NAV.BRIEFING -> NAV.CHAT
Briefing -> AI Chat
```

Remove assertions for Inbox, Reports, and Overview navigation items. Keep all sidebar layout, focus, workspace synchronization, and cleanup assertions intact.

- [ ] **Step 2: Update shell E2E pages without weakening shell assertions**

Use `/dashboard/knowledge` as the stable retained page for responsive sidebar, drawer, tooltip, reduced-motion, and workspace tests. Replace Morning Briefing heading assertions with:

```ts
await expect(
  page.getByRole("heading", { name: "Knowledge base" }),
).toBeVisible();
```

In `auth.spec.ts`, add a dedicated default-route assertion:

```ts
test("opens Chat as the authenticated dashboard default", async ({ page }) => {
  await installAuthSession(page);
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/dashboard\/chat$/);
  await expect(
    page.getByRole("region", { name: "Workspace assistant chat" }),
  ).toBeVisible();
});
```

Keep the keyboard/logout test on `/dashboard/knowledge`.

- [ ] **Step 3: Run focused frontend tests**

```bash
npm --prefix frontend run test -- router.test.tsx admin-navigation.test.ts AdminSidebar.test.tsx AppShell.test.tsx
npm --prefix frontend run typecheck
```

Expected: PASS.

- [ ] **Step 4: Run shell and auth E2E tests**

```bash
npm --prefix frontend run test:e2e -- admin-shell.spec.ts auth.spec.ts workspace.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit frontend product pruning**

Before committing, invoke:

```text
detect_changes({scope: "staged"})
```

Expected: only application routing, admin navigation, shell, auth, and removed preview surfaces are affected.

Then run:

```bash
git add frontend
git commit -m "refactor: remove non-product frontend surfaces"
```

### Task 5: Remove the Temporal Greeting demo without weakening capacity coverage

**Files:**

- Delete: `backend/app/temporal/activities/greet.py`
- Delete: `backend/app/temporal/workflows/greeting.py`
- Delete: `backend/app/schemas/temporal_demo.py`
- Modify: `backend/app/temporal/activities/__init__.py`
- Modify: `backend/app/temporal/workflows/__init__.py`
- Modify: `backend/workers/flae_worker.py`
- Modify: `backend/tests/temporal/test_ingestion_worker_capacity.py`

- [ ] **Step 1: Add a test-local interactive probe**

Replace Greeting imports in `test_ingestion_worker_capacity.py` with:

```python
@activity.defn(name="interactive_probe_activity")
async def interactive_probe_activity(value: str) -> str:
    return value


@workflow.defn(name="InteractiveProbeWorkflow")
class InteractiveProbeWorkflow:
    @workflow.run
    async def run(self, value: str) -> str:
        return await workflow.execute_activity(
            interactive_probe_activity,
            value,
            start_to_close_timeout=timedelta(seconds=5),
        )
```

Add `workflow` to `from temporalio import activity, workflow`.

In the capacity test, register `InteractiveProbeWorkflow` and `interactive_probe_activity`, execute it with `"interactive"`, and retain:

```python
assert interactive_result == "interactive"
```

- [ ] **Step 2: Run the capacity test before production deletion**

```bash
uv run --project backend pytest backend/tests/temporal/test_ingestion_worker_capacity.py -q
```

Expected: PASS, proving the test no longer depends on shipped demo code.

- [ ] **Step 3: Remove Greeting registration and files**

Make `backend/app/temporal/workflows/__init__.py` contain:

```python
from app.temporal.workflows.invitation import WorkspaceInvitationWorkflow

__all__ = ["WorkspaceInvitationWorkflow"]
```

Remove Greeting imports and registrations from `flae_worker.py`. Remove the `greet` export from `activities/__init__.py`. Then run:

```bash
git rm backend/app/temporal/activities/greet.py
git rm backend/app/temporal/workflows/greeting.py
git rm backend/app/schemas/temporal_demo.py
```

- [ ] **Step 4: Verify the demo is absent**

```bash
git grep -n -E 'GreetingWorkflow|activities\.greet|def greet|temporal_demo' -- backend
```

Expected: no matches.

- [ ] **Step 5: Run backend worker and architecture tests**

```bash
uv run --project backend pytest backend/tests/temporal/test_ingestion_worker_capacity.py backend/tests/architecture -q
```

Expected: PASS.

- [ ] **Step 6: Delete obsolete Angular migration documentation**

```bash
git rm -r docs/migrations/angular-to-react
```

Expected: the three obsolete migration documents are staged for deletion.

- [ ] **Step 7: Commit demo and migration-document cleanup**

Invoke:

```text
detect_changes({scope: "staged"})
```

Expected: only the interactive worker registration/test and documentation are affected.

Then run:

```bash
git add backend
git commit -m "refactor: remove demo workflow and obsolete migration docs"
```

### Task 6: Verify Plan 1 completion

**Files:** None beyond this plan’s scope.

- [ ] **Step 1: Scan deleted product references**

```bash
git grep -n -E 'Morning briefing|NAV\.(OVERVIEW|BRIEFING|INBOX|REPORTS)|OVERVIEW\.|DASHBOARD_HOME\.|/dashboard/(briefing|inbox|reports)|GreetingWorkflow|temporal_demo' -- frontend backend docs ':!docs/superpowers/**'
```

Expected: no matches.

- [ ] **Step 2: Run full retained frontend verification**

```bash
npm --prefix frontend run test
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run build
```

Expected: all commands exit `0`.

- [ ] **Step 3: Run the relevant backend suite**

```bash
uv run --project backend pytest backend/tests/temporal backend/tests/architecture -q
```

Expected: PASS.

- [ ] **Step 4: Review Plan 1 change impact**

Invoke:

```text
detect_changes({scope: "compare", base_ref: "cleanup-base-2026-08-11"})
```

Expected: no knowledge ingestion, retrieval, database, authorization, or agent reasoning process is unexpectedly affected.
