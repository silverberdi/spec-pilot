## Why

`w01-s01` registers local repositories with presence-only `.specpilot/project.yaml` checks, so SpecPilot still cannot trust or reuse the portable contract contents. Later discovery and dashboard slices need immutable, schema-validated configuration snapshots linked to each `Project`; this slice delivers parse, validate, version, and persist behavior now so `w01-s03`/`w01-s04` are not built on unvalidated YAML.

## What Changes

- Parse and schema-validate `.specpilot/project.yaml` for registered local repositories against the portable contract (`schemaVersion`, required sections, kebab-case machine IDs, include/exclude normalization, and secret-path exclusion rules from `docs/configuration/project-yaml-contract.md` / ADR-005).
- Persist immutable `ProjectConfigurationVersion` snapshots in PostgreSQL (normalized content, source hash, validation result) and link the active version on the `Project` record (`configurationVersionId`).
- Fail closed on parse/schema/validation errors: do not silently treat invalid YAML as valid configuration, and do not leave the project pointing at an unverified active snapshot.
- Expose an operator-visible configuration surface (API and minimal console outcomes for inspect/refresh or equivalent) with explicit success, blocked, empty, loading, and error behavior—not a project dashboard (`w01-s04`).
- Remain read-only toward target repositories: configuration handling MUST NOT edit, write, or execute commands inside the registered repository.
- Add deterministic automated coverage for the primary success path (valid YAML → persisted version + project linkage) and at least one meaningful blocked/failure path (invalid/unparseable YAML or schema violation).
- Update docs/context inventory as needed; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w01` |
| Slice | `w01-s02-project-configuration` |
| Change | `chg-w01-s02-project-configuration` |
| User Stories | `us-w01-s02-project-configuration-001`, `us-w01-s02-project-configuration-002`, `us-w01-s02-project-configuration-003` |
| Implementer | Cursor |
| Dependencies | Archived `w01-s01` (`chg-w01-s01-project-registration`): durable `Project` registry, realpath identity, presence-only YAML eligibility, registration API/console; ADR-003 PostgreSQL-only; ADR-005 portable `.specpilot/project.yaml` contract; binding main-only working policy; Wave 0 foundation (Nx/Angular/Nest, Prisma/Compose, quality gates) |
| Exclusions | Git and OpenSpec discovery inspection (`w01-s03`); project dashboard / discovery-health listing UI (`w01-s04`); editing target repositories or executing delivery/Git/OpenSpec commands from SpecPilot; remote repos without local checkout; authentication/multiuser; DeepSeek product API integration; reviews, findings, budget enforcement beyond declaring contract fields, prompts, context bundles; Windows/Linux support; and all later-wave scope |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Turns presence-only registration into trusted, versioned project configuration so discovery and console features can reason about validated portable contracts. |
| Security / privacy | Reads `.specpilot/project.yaml` from local repos; absolute paths stay in SpecPilot DB only; secret-bearing paths remain excluded by contract rules; no auth/multiuser; must not write into target repos; snapshot storage must not ingest `.env`/key/secret file contents from the repository tree. |
| Persistence | Introduces `ProjectConfigurationVersion` and `Project.configurationVersionId` (active snapshot linkage) in Prisma/PostgreSQL; supersedes the `w01-s01` exclusion of configuration-version tables for this aggregate only. Reviews, findings, budget accounts, prompts, and auth remain out of scope. |
| UI / API | Configuration inspect/refresh (or equivalent) API and minimal console outcomes with clear success/blocked/empty/loading/error states; no full registry dashboard. |
| Tests | Automated success + blocked/failure evidence for parse/validate/persist and project linkage; quality gates continue to apply. |
| Migration | Additive Prisma migration for configuration-version schema and project FK/column on empty/local databases; no production or ownership migration. |
| Rollback | Reversible by reverting schema/API/UI and rolling back the local migration/volume as documented; no destructive remote recovery. |
| Human validation | Operator confirms successful configuration snapshot for a valid project.yaml and at least one blocked invalid path; explicit approval before commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `project-yaml-configuration`: Parse, schema-validate, version, and persist immutable `ProjectConfigurationVersion` snapshots from `.specpilot/project.yaml`; link the active version on `Project`; fail closed on invalid configuration; remain read-only toward target repositories; expose operator-visible API/console outcomes for success and blocked/error paths.

### Modified Capabilities

- `local-project-registration`: Allow configuration snapshot creation/linkage for registered projects; supersede the `w01-s01` requirement that registration MUST NOT create `ProjectConfigurationVersion` / configuration snapshot linkage (presence-only eligibility rules remain unless this change explicitly extends post-registration configuration handling).
- `postgresql-prisma-persistence-baseline`: Allow a bounded `ProjectConfigurationVersion` domain model and `Project.configurationVersionId` linkage; supersede the probe/registration-only exclusion of configuration-version tables for this aggregate only (not reviews, findings, budgets, prompts, auth, or users).
- `shared-libraries-baseline`: Allow shared configuration request/response (or equivalent) contracts in `packages/shared-contracts` as needed by API and web; keep shared UI kits and extra domain packages out of scope.
- `angular-web-console-baseline`: Allow a minimal project-configuration operator surface in `apps/web`; supersede the baseline “no product domain screens” exclusion for this slice’s configuration outcomes only (dashboard remains `w01-s04`).
- `application-test-baseline`: Extend automated test expectations to cover project.yaml parse/validate/persist success and at least one meaningful blocked/failure path with reproducible evidence under this change.

## Impact

- **Repository files:** Prisma schema/migration for `ProjectConfigurationVersion` and project linkage; NestJS configuration parse/validate/persist module/routes; Angular minimal configuration outcomes UI; shared contracts; docs/context and package-summary updates as needed.
- **Dependencies:** Reuse existing NestJS/Fastify, Angular/PrimeNG, Prisma/PostgreSQL, and test tooling; add a YAML parse/validate library only if required and locked at the root; no new auth providers; no DeepSeek gateway; no worker app.
- **OpenSpec:** New `project-yaml-configuration` spec plus deltas for the modified baselines listed above; canonical sync only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No Git/OpenSpec discovery (`w01-s03`); no dashboard (`w01-s04`); no target-repo mutation; no auth; no review/budget/DeepSeek product features; no edits to OpenSpec-generated integrations except via `openspec update`.
- **Risk if skipped:** Discovery and dashboard would invent ad-hoc YAML reading without immutable versioning, weakening ADR-005 (portable contract + centralized snapshots) and allowing invalid configuration to look operationally healthy.
