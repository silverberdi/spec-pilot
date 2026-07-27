## Why

Wave 0 delivered governance, the Nx/Angular/Nest baseline, PostgreSQL/Prisma, and quality gates, but SpecPilot still cannot register a local repository as a first-class project. Later `w01` slices (configuration snapshots, Git/OpenSpec discovery, dashboard) depend on a durable, validated project registry entry; this slice establishes register-and-validate behavior now so discovery and console features are not built on an undefined registry.

## What Changes

- Add local project registration: accept a local macOS repository path, validate registration eligibility, and persist a `Project` record in PostgreSQL (installation-specific absolute path stored in SpecPilot DB only—not in portable YAML).
- Enforce registration preflight validation that fails closed when the path is missing/inaccessible, is not a directory, lacks required `.specpilot/project.yaml` presence, or would duplicate an already-registered repository path or slug; do not silently continue with invalid state.
- Keep validation in this slice bounded to registration eligibility and `.specpilot/project.yaml` **presence** (and any minimal identity fields needed to create the Project record). Full parse, schema validation, versioning, and immutable configuration snapshots belong to `w01-s02`.
- Expose an operator-visible registration surface (API and minimal console flow) with explicit success, blocked, empty, loading, and error outcomes for the registration action—not a full project dashboard (`w01-s04`).
- Remain read-only toward target repositories: registration MUST NOT edit, write, or execute commands inside the registered repository.
- Add deterministic automated coverage for the primary registration success path and at least one meaningful blocked/failure path.
- Update docs/context inventory as needed; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w01` |
| Slice | `w01-s01-project-registration` |
| Change | `chg-w01-s01-project-registration` |
| User Stories | `us-w01-s01-project-registration-001`, `us-w01-s01-project-registration-002`, `us-w01-s01-project-registration-003` |
| Implementer | Cursor |
| Dependencies | Archived `w00` foundation (`chg-w00-s01` … `chg-w00-s04`): governance validators, Nx monorepo with `apps/web`/`apps/api`/shared contracts, PostgreSQL+Prisma+Compose local runtime, mandatory local quality gates and remote CI; ADR-003 PostgreSQL-only persistence; ADR-005 portable `.specpilot/project.yaml` contract; binding main-only working policy |
| Exclusions | Full `project.yaml` parse/schema validation/versioning and `ProjectConfigurationVersion` snapshots (`w01-s02`); Git and OpenSpec discovery inspection (`w01-s03`); project dashboard / discovery-health listing UI (`w01-s04`); editing target repositories or executing delivery/Git/OpenSpec commands from SpecPilot; remote repos without local checkout; authentication/multiuser; DeepSeek product API integration; reviews, findings, budget, prompts, context bundles; Windows/Linux support; and all later-wave scope |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Enables SpecPilot’s first product capability—registering and validating local OpenSpec repositories—so later `w01` slices can attach configuration, discovery, and dashboard behavior to real project records. |
| Security / privacy | Registration reads local filesystem paths and requires `.specpilot/project.yaml` presence; absolute paths stay in PostgreSQL only; no auth/multiuser; must not write into target repos; secret-bearing content is not ingested beyond path/metadata needed for registration. |
| Persistence | Introduces bounded `Project` (and related identity/status fields) domain persistence in Prisma/PostgreSQL; supersedes the `w00-s03` “no product domain tables” probe-only constraint for this model only. Configuration version snapshots remain out of scope. |
| UI / API | Minimal registration API and console flow with clear success/blocked/empty/loading/error states; no full registry dashboard. |
| Tests | Automated success + blocked/failure evidence for registration/validation; quality gates continue to apply. |
| Migration | Additive Prisma migration for Project registration schema on empty/local databases; no production or ownership migration. |
| Rollback | Reversible by reverting schema/API/UI and rolling back the local migration/volume as documented; no destructive remote recovery. |
| Human validation | Operator confirms register success and at least one blocked path; explicit approval before commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `local-project-registration`: Register and validate local repositories—path eligibility, required `.specpilot/project.yaml` presence, uniqueness, durable `Project` persistence, and operator-visible API/console outcomes with explicit success and fail-closed blocked/error behavior; read-only toward target repositories.

### Modified Capabilities

- `postgresql-prisma-persistence-baseline`: Allow a bounded Project registration domain model in Prisma/PostgreSQL; supersede the probe-only “no product domain tables” rule for Project registration fields only (not configuration versions, reviews, findings, budget, auth, or other later aggregates).
- `angular-web-console-baseline`: Allow a minimal project-registration operator surface in `apps/web`; supersede the baseline “no product domain screens” exclusion for this slice’s registration flow only (dashboard remains `w01-s04`).
- `shared-libraries-baseline`: Allow shared registration request/response (or equivalent) contracts in `packages/shared-contracts` as needed by API and web; keep shared UI kits and extra domain packages out of scope.
- `application-test-baseline`: Extend automated test expectations to cover local project registration success and at least one meaningful blocked/failure path with reproducible evidence under this change.

## Impact

- **Repository files:** Prisma schema/migration for Project registration; NestJS registration module/routes; Angular registration UI flow; shared contracts; docs/context and package-summary updates as needed.
- **Dependencies:** Reuse existing NestJS/Fastify, Angular/PrimeNG, Prisma/PostgreSQL, and test tooling; no new auth providers; no DeepSeek gateway; no worker app.
- **OpenSpec:** New `local-project-registration` spec plus deltas for the modified baselines listed above; canonical sync only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No `w01-s02` configuration versioning; no Git/OpenSpec discovery; no dashboard; no target-repo mutation; no auth; no review/budget/DeepSeek product features; no edits to OpenSpec-generated integrations except via `openspec update`.
- **Risk if skipped:** Later `w01` slices would invent ad-hoc project identity and path handling, weakening the portable-contract + centralized-state model (ADR-005) and blocking bounded discovery/dashboard delivery.
