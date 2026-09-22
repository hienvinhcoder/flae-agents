# FLAE frontend UI/UX redesign (Linear-tight)

## Status

**Accepted** (visual direction + design system + Superdesign shell/Knowledge drafts reviewed by product owner).

Next step: implementation plan (`writing-plans`) after this spec is confirmed in-repo.

## Intent

Replace the current glass/umber dark-first UI with a **Clean Enterprise (Linear-tight)** system that:

1. Uses **orange** as the only brand primary.
2. Ships **light (default)** and **dark** themes from the same token set.
3. Uses a **hybrid shell**: top bar + icon rail (not the current expanded-sidebar-first chrome).
4. Improves layout clarity and UX density without ops-console clutter.

Canonical visual tokens live in [`DESIGN.md`](../../../DESIGN.md) (synced with `.superdesign/design-system.md`).

## Approved decisions

| Decision | Choice |
|---|---|
| Visual family | A — Clean Enterprise (Linear / Notion-like) |
| Shell | 3 — Hybrid (top bar + 56px icon rail) |
| Default theme | Light |
| Primary | Orange `#EA580C` (light) / `#F97316` (dark) |
| Typography | Inter UI; JetBrains Mono for mono |
| Surfaces | Flat + 1px borders; minimal shadows |
| Forbidden | Glass stacks, glow, purple/indigo, serif display, orange gradients |

## Superdesign references

Project: [FLAE Redesign Linear-tight](https://superdesign.dev/teams/291fdf76-26fa-4795-b5a9-a63662d032ac/projects/e32120a5-2d85-471f-99c0-9ffd056e4421)

| Draft | Role | Preview |
|---|---|---|
| `864a5302-b3fb-4b24-a938-65e1fcfe1a03` | Shell + Knowledge — **Light** (source of truth for light chrome) | https://p.superdesign.dev/draft/864a5302-b3fb-4b24-a938-65e1fcfe1a03 |
| `3f439c1f-7b95-4f8d-b1d0-d6005eb64dc6` | Shell + Knowledge — **Dark** | https://p.superdesign.dev/draft/3f439c1f-7b95-4f8d-b1d0-d6005eb64dc6 |

Implementation must match these drafts structurally (hybrid chrome, Knowledge list-first). Pixel-perfect parity is not required; token fidelity and layout hierarchy are.

## Scope

### In scope (phased)

**Phase 1 — Foundation**

- Rewrite `frontend/src/styles.css` tokens for light + dark (remove glass/umber/orb glow as defaults).
- Theme provider: light default, dark class/data attribute, persist preference, top-bar toggle.
- Update shared primitives (`Button`, `Input`, `Select`, `Dialog`, `Card`, `Badge`, `Table`, `PageHeader`, …) to new radius/heights/colors.
- Update `DESIGN.md` is already v3; keep it as the single written source of truth.

**Phase 2 — Shell**

- Replace `AppShell` / `AdminSidebar` / `AdminHeader` with hybrid layout:
  - Top bar: brand, workspace switcher, theme toggle, user menu.
  - Icon rail: Chat, Agents, Knowledge, Topics, Settings (tooltips; orange active treatment per DS).
- Mobile: drawer/sheet for nav; keep skip-link and a11y patterns.
- Remove demo chrome that fights the new layout only if it conflicts (MCP/Add Source placement can move into page actions where drafts show them).

**Phase 3 — Knowledge (first feature surface)**

- Align `KnowledgeListPage` + toolbar/table/grid/dialogs with new spacing and list-default UX.
- Status badges use semantic soft chips (success/warning/destructive/muted).

**Phase 4 — Remaining dashboard surfaces**

- Chat, Agents, Topics, Settings, Knowledge graph, Auth pages: apply same tokens + shell; no one-off palettes.
- Prefer iterative page alignment over big-bang rewrites of business logic.

### Out of scope (this redesign)

- Backend / ingestion / RAG behavior.
- New product features not already in the app.
- Marketing/landing redesign (unless separately requested).
- System theme auto-follow (optional later; toggle L/D is enough for v1).

## Architecture notes

```
DESIGN.md (tokens + rules)
    │
    ▼
frontend/src/styles.css  (:root light + .dark)
    │
    ├── ThemeToggle / preference store
    ├── shared/ui/* primitives
    └── app/layout/* hybrid shell
            └── feature pages (Knowledge first, then others)
```

- Keep TanStack Query / Zustand / feature folder rules unchanged.
- Do not invent new color tokens in components; map Tailwind theme aliases to CSS variables.
- Plus Jakarta Sans may remain installed briefly but should not be used as UI font after migration (Inter only for UI/display).

## UX rules (implementation checklist)

1. Orange only for primary CTA, focus ring, active rail, critical links.
2. Default Knowledge view remains **list/table**; grid is secondary.
3. No nested card-in-card chrome; one bordered panel for library content.
4. Comfortable padding (page ~24px); control height 36–40px; radius 6/8/12.
5. Both themes must pass readable contrast for body text and primary buttons.
6. `prefers-reduced-motion` respected on transitions.

## Acceptance criteria

- [ ] Light is the default for new sessions; dark is reachable via toggle and persists.
- [ ] Hybrid shell matches approved drafts on desktop (top bar + icon rail + main).
- [ ] Primary actions render orange; no purple/glass glow leftovers on dashboard chrome.
- [ ] Knowledge library usable in both themes (header, filters, table, dialogs).
- [ ] Shared primitives used by Chat/Agents/Settings inherit tokens without per-page hex colors.
- [ ] Existing unit/RTL tests for shell/knowledge updated; no intentional a11y regressions (focus, labels, skip link).
- [ ] `DESIGN.md` and runtime tokens stay consistent.

## Risks

- Large CSS token rename can break one-off feature classes (`glass-*`, `orb-*`, `ui-ink-*`). Mitigate with a short deprecation map or mechanical find/replace in Phase 1.
- Chat workbench full-bleed layout must still work inside the new shell (rail + top bar chrome).
- i18n strings stay; only chrome/layout changes.

## Non-goals for “done”

Shipping every page pixel-identical to Superdesign is not required. **Done for Phase 1–3** means foundation + shell + Knowledge match the approved system; other pages are token-correct and usable, with visual polish follow-ups allowed.
