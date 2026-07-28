# Change binding

| Field | Value |
|---|---|
| Wave | `w01` |
| Slice | `w01-s04-project-dashboard` |
| Change | `chg-w01-s04-project-dashboard` |
| User Stories | `us-w01-s04-project-dashboard-001`, `us-w01-s04-project-dashboard-002`, `us-w01-s04-project-dashboard-003` |
| Implementer | Cursor |
| Dependencies | Archived `w01-s01` (`chg-w01-s01-project-registration`); archived `w01-s02` (`chg-w01-s02-project-configuration`); archived `w01-s03` (`chg-w01-s03-git-and-openspec-discovery`); Wave 0 foundation; ADR-002; ADR-003; ADR-004; main-only working policy |
| Traceability | `proposal.md`, `design.md`, `specs/**/*.md`, `tasks.md` |

## Exclusions (summary)

Auto-discovery/configuration refresh on dashboard load; `GET /dashboard`; full `lastDiscovery` blob on list rows; N+1 discovery GETs; client-side sort/filter/pagination/virtual scroll; DB migration (none expected); target-repo access from list; delivery controls; auth/multiuser; DeepSeek product API; reviews/findings/budget/prompts/context bundles; later-wave scope.
