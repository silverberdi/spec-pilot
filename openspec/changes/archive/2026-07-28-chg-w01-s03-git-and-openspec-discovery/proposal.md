## Why

Registered projects now have durable identity (`w01-s01`) and immutable validated configuration snapshots (`w01-s02`), but SpecPilot still cannot observe Git or OpenSpec delivery state for those repositories. This slice adds read-only inspection so operators—and later the project dashboard (`w01-s04`)—can reason about discovery health without mutating target repos or inventing a parallel lifecycle (ADR-002, ADR-004).

## What Changes

- Inspect Git state for registered local repositories using allowlisted, read-only Git/filesystem operations (for example branch/HEAD identity and working-tree cleanliness signals)—never arbitrary shell from operator input, and never Git write or delivery commands.
- Discover OpenSpec state for the same repositories via deterministic filesystem inspection and/or official OpenSpec CLI read outputs where available (active/archived changes, artifact completeness signals as defined in design)—without inventing an alternate OpenSpec lifecycle and without executing apply/verify/sync/archive workflows from SpecPilot.
- Persist operator-usable discovery outcomes linked to each `Project` (at minimum set `lastInspectedAt` on successful inspection; store structured discovery results as decided in design) so later dashboard health is not ad-hoc re-probing without a contract.
- Fail closed on missing path, non-Git trees, unreadable OpenSpec layout, inspection errors, or unsafe command surfaces: do not silently treat unknown/incomplete discovery as healthy.
- Expose an operator-visible discovery surface (API and minimal console outcomes for inspect/refresh or equivalent) with explicit success, blocked, empty, loading, and error behavior—not a multi-project discovery-health dashboard (`w01-s04`).
- Remain read-only toward target repositories: discovery MUST NOT create, modify, or delete files in the registered repository and MUST NOT run Cursor/Cline/OpenSpec/Git write/delivery/test/commit/PR workflows from SpecPilot.
- Add deterministic automated coverage for the primary success path (valid registered repo → Git + OpenSpec discovery outcomes + `lastInspectedAt`) and at least one meaningful blocked/failure path.
- Update docs/context inventory as needed; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w01` |
| Slice | `w01-s03-git-and-openspec-discovery` |
| Change | `chg-w01-s03-git-and-openspec-discovery` |
| User Stories | `us-w01-s03-git-and-openspec-discovery-001`, `us-w01-s03-git-and-openspec-discovery-002`, `us-w01-s03-git-and-openspec-discovery-003` |
| Implementer | Cursor |
| Dependencies | Archived `w01-s01` (`chg-w01-s01-project-registration`): durable `Project` registry, realpath identity, registration API/console; archived `w01-s02` (`chg-w01-s02-project-configuration`): validated `ProjectConfigurationVersion` snapshots and active linkage; ADR-002 OpenSpec authority; ADR-003 PostgreSQL-only; ADR-004 read-only initial release; binding main-only working policy; Wave 0 foundation (Nx/Angular/Nest, Prisma/Compose, quality gates) |
| Exclusions | Project dashboard / multi-project discovery-health listing UI (`w01-s04`); editing target repositories or executing delivery/Git write/OpenSpec apply-verify-sync-archive workflows from SpecPilot; remote repos without local checkout; authentication/multiuser; DeepSeek product API integration; reviews, findings, budget ledger, prompts, context bundles; Windows/Linux support; and all later-wave scope |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Makes Git and OpenSpec delivery state visible for registered projects so operators can trust discovery before dashboard and later review waves. |
| Security / privacy | Read-only allowlisted filesystem/Git/OpenSpec inspection of local paths already registered; no arbitrary shell from input; no target-repo writes; no secret file ingestion beyond existing configuration exclusions; no auth/multiuser. |
| Persistence | Updates `Project.lastInspectedAt` on successful discovery; may add bounded discovery-result persistence (fields/table) in Prisma/PostgreSQL as designed—still no reviews, findings, budgets, prompts, auth, or users. |
| UI / API | Discovery inspect/refresh (or equivalent) API and minimal console outcomes with clear success/blocked/empty/loading/error states; no full registry dashboard. |
| Tests | Automated success + blocked/failure evidence for Git/OpenSpec discovery and `lastInspectedAt` / outcome persistence; quality gates continue to apply. |
| Migration | Additive Prisma migration only if discovery-result schema is introduced; otherwise column usage of existing nullable `lastInspectedAt`; no production or ownership migration. |
| Rollback | Reversible by reverting schema/API/UI and rolling back the local migration/volume as documented; no destructive remote recovery. |
| Human validation | Operator confirms successful discovery for a valid registered repo and at least one blocked/failure path; explicit approval before commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `git-and-openspec-discovery`: Read-only inspection of Git and OpenSpec state for registered local projects; fail-closed outcomes; persist inspection timestamp and structured discovery results as designed; expose operator-visible API/console success and blocked/error paths; never mutate target repositories or execute delivery workflows.

### Modified Capabilities

- `local-project-registration`: Allow discovery to set `Project.lastInspectedAt` (and any discovery fields added on `Project`); supersede the requirement that `lastInspectedAt` MUST remain null until a later discovery slice.
- `postgresql-prisma-persistence-baseline`: Allow bounded discovery-result persistence and/or use of `lastInspectedAt` for this aggregate only (not reviews, findings, budgets, prompts, auth, or users).
- `shared-libraries-baseline`: Allow shared discovery request/response (or equivalent) contracts in `packages/shared-contracts` as needed by API and web; keep shared UI kits and extra domain packages out of scope.
- `angular-web-console-baseline`: Allow a minimal Git/OpenSpec discovery operator surface in `apps/web`; supersede the baseline “no product domain screens” exclusion for this slice’s discovery outcomes only (dashboard remains `w01-s04`).
- `application-test-baseline`: Extend automated test expectations to cover Git/OpenSpec discovery success and at least one meaningful blocked/failure path with reproducible evidence under this change.

## Impact

- **Repository files:** NestJS discovery/inspection module and routes; optional Prisma migration for discovery outcomes; Angular minimal discovery outcomes UI; shared contracts; docs/context and package-summary updates as needed.
- **Dependencies:** Reuse existing NestJS/Fastify, Angular/PrimeNG, Prisma/PostgreSQL, and test tooling; allowlisted Git and/or OpenSpec CLI invocation only where required and constrained; no new auth providers; no DeepSeek gateway; no worker app.
- **OpenSpec:** New `git-and-openspec-discovery` spec plus deltas for the modified baselines listed above; canonical sync only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No project dashboard (`w01-s04`); no target-repo mutation; no delivery command execution from SpecPilot; no auth; no review/budget/DeepSeek product features; no edits to OpenSpec-generated integrations except via `openspec update`.
- **Risk if skipped:** Dashboard and later review stages would invent ad-hoc Git/OpenSpec probing without a fail-closed contract, weakening ADR-002/ADR-004 and allowing unknown repository state to look operationally healthy.
