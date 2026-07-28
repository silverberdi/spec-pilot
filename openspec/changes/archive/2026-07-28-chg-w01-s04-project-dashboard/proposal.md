## Why

Registered projects now have durable identity (`w01-s01`), validated configuration (`w01-s02`), and persisted Git/OpenSpec discovery snapshots (`w01-s03`), but the console still lacks a multi-project surface that shows registry membership and discovery health together. This slice closes Wave 1 by displaying registered projects and discovery-health outcomes so operators can see empty, never-inspected, healthy, and blocked states without inventing ad-hoc probing or delivery controls.

## What Changes

- Provide an operator-visible project dashboard that lists registered projects and presents discovery-health status derived from persisted discovery outcomes (`lastInspectedAt` / `lastDiscovery`) and registration data—not by inventing a parallel discovery engine.
- Surface clear empty, loading, success, blocked/never-inspected, and error behavior for the multi-project view (and any supporting list/summary API contracts introduced or tightened in design).
- Fail closed: never present unknown, missing, or incomplete discovery as healthy; never silently continue with invalid list/detail state.
- Remain read-only toward target repositories: the dashboard MUST NOT mutate registered repos and MUST NOT execute Git write, OpenSpec apply/verify/sync/archive, Cursor/Cline delivery, test, commit, or PR workflows from SpecPilot.
- Reuse existing registration, configuration, and discovery APIs/contracts where sufficient; add only bounded shared DTOs or list/summary enrichment required for dashboard health presentation (as decided in design)—no new discovery mutation semantics beyond what `w01-s03` already defined.
- Add deterministic automated coverage for the primary success path (one or more registered projects with inspectable health presentation) and at least one meaningful empty or blocked/failure path.
- Update docs/context inventory as needed; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w01` |
| Slice | `w01-s04-project-dashboard` |
| Change | `chg-w01-s04-project-dashboard` |
| User Stories | `us-w01-s04-project-dashboard-001`, `us-w01-s04-project-dashboard-002`, `us-w01-s04-project-dashboard-003` |
| Implementer | Cursor |
| Dependencies | Archived `w01-s01` (`chg-w01-s01-project-registration`): durable `Project` registry and `GET /projects` list; archived `w01-s02` (`chg-w01-s02-project-configuration`): configuration linkage/outcomes; archived `w01-s03` (`chg-w01-s03-git-and-openspec-discovery`): persisted `lastDiscovery` / `lastInspectedAt` and discovery refresh/get contracts; ADR-002 OpenSpec authority; ADR-003 PostgreSQL-only; ADR-004 read-only initial release; binding main-only working policy; Wave 0 foundation |
| Exclusions | Auto-running discovery on every dashboard load as a substitute for explicit refresh semantics (unless design explicitly bounds a read-only list enrichment that does not mutate target repos); editing target repositories or executing delivery/Git write/OpenSpec apply-verify-sync-archive workflows from SpecPilot; remote repos without local checkout; authentication/multiuser; DeepSeek product API integration; reviews, findings, budget ledger, prompts, context bundles; Wave 2+ context/preview/approval and all later-wave scope |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Gives operators a single Spanish-first console view of registered projects and discovery health, completing Wave 1’s registry-and-discovery promise. |
| Security / privacy | Displays only already-registered project metadata and persisted discovery summaries; no arbitrary filesystem browsing; no secret file ingestion; no auth/multiuser; no target-repo writes. |
| Persistence | Prefers existing `Project` / `lastDiscovery` / `lastInspectedAt` / configuration linkage; additive schema only if design requires a bounded dashboard-specific projection—still no reviews, findings, budgets, prompts, auth, or users. |
| UI / API | Multi-project dashboard in `apps/web` with clear empty/loading/success/blocked/error outcomes; may tighten or extend list/summary API contracts for health presentation; retains existing per-project registration/configuration/discovery actions without becoming a delivery control plane. |
| Tests | Automated success + empty/blocked/failure evidence for dashboard listing and health presentation; quality gates continue to apply. |
| Migration | Additive only if a dashboard-specific persistence field is introduced; otherwise no migration; no production or ownership migration. |
| Rollback | Reversible by reverting API/UI (and any additive migration) as documented; no destructive remote recovery. |
| Human validation | Operator confirms dashboard empty state and at least one populated success/blocked health presentation; explicit approval before commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `project-dashboard`: Display registered projects and discovery-health outcomes in a Spanish-first multi-project console surface; derive health from persisted registration/discovery data; expose explicit empty, loading, success, blocked/never-inspected, and error behavior; remain read-only toward target repositories and exclude delivery controls.

### Modified Capabilities

- `local-project-registration`: Allow the dashboard to consume and, if needed, enrich the registered-project list contract for multi-project presentation (including configuration/discovery summary fields already persisted); supersede the “minimal registration surface only / not a discovery-health dashboard” exclusion for this slice.
- `git-and-openspec-discovery`: Allow the dashboard to present persisted discovery health (`lastInspectedAt` / `lastDiscovery` and closed blocked/ok outcomes) across projects; do not replace per-project discovery refresh/get semantics or invent a second discovery engine.
- `shared-libraries-baseline`: Allow shared dashboard/list/summary (or equivalent) contracts in `packages/shared-contracts` as needed by API and web; keep shared UI kits and extra domain packages out of scope.
- `angular-web-console-baseline`: Allow a multi-project project-dashboard operator surface in `apps/web`; supersede the baseline exclusion that deferred the discovery-health dashboard to `w01-s04` by delivering that surface now.
- `application-test-baseline`: Extend automated test expectations to cover dashboard listing/health success and at least one meaningful empty or blocked/failure path with reproducible evidence under this change.

## Impact

- **Repository files:** Angular multi-project dashboard UI; optional NestJS list/summary enrichment; shared contracts for health presentation; docs/context and package-summary updates as needed; optional additive Prisma only if design requires it.
- **Dependencies:** Reuse existing NestJS/Fastify, Angular/PrimeNG, Prisma/PostgreSQL, and test tooling; no new auth providers; no DeepSeek gateway; no worker app; no delivery runners.
- **OpenSpec:** New `project-dashboard` spec plus deltas for the modified capabilities listed above; canonical sync only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No target-repo mutation; no delivery command execution from SpecPilot; no auth; no review/budget/DeepSeek product features; no Wave 2+ context/approval; no edits to OpenSpec-generated integrations except via `openspec update`.
- **Risk if skipped:** Wave 1 would close without an operator-visible multi-project health surface, leaving discovery outcomes trapped in per-project flows and inviting ad-hoc dashboard invention in later slices.
