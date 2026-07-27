## Why

`w00-s01`–`w00-s03` delivered governance validators, an Nx/Angular/Nest baseline, and PostgreSQL/Prisma with Compose local runtime, but SpecPilot still has no owned quality-gate orchestrator, enforced Nx dependency boundaries, or independent remote CI verification. Later waves need a deterministic gate set: mandatory local prevention before commit/push, plus post-push GitHub Actions verification that fails closed when remote checks detect regressions.

## What Changes

- Add `scripts/run-quality-gates.sh` as the **mandatory local** fail-closed quality-gate orchestrator. Cursor and the operator MUST NOT create the final commit or push when the full local gate is not `PASS`. This is the pre-commit/pre-push prevention control under the main-only, no-PR working policy.
- Add a deterministic GitHub Actions CI workflow under `.github/workflows/` that runs the **same** orchestrator after `push` to `main` (and via `workflow_dispatch`) as an **independent remote verification**. Remote CI validates after the push; it does **not** pre-block entry onto `main`. A remote failure must be visible, fail closed, and require immediate correction.
- Enforce Nx dependency boundaries (tags/constraints and dependency-boundary lint) so apps and packages cannot take forbidden dependency edges.
- Wire existing baseline validation and secret scanning into the required local/remote quality gate set so credential-like content and governance integrity failures fail closed.
- Define and implement the required quality gates (install integrity, typecheck, dependency-boundary lint, automated tests from the application baseline, baseline validation, and secret scanning)—each must fail closed with human-readable reasons. Do not introduce automatically managed local Git hooks in this slice.
- Capture deterministic success-path and at least one meaningful blocked/failure-path evidence under this change’s `evidence/` directory, including full local gate `PASS` evidence before any operator-approved commit/push of the implementation.
- Update docs/context inventory as needed; leave OpenSpec-generated integrations untouched except via `openspec update`.

### Binding

| Field | Value |
|---|---|
| Wave | `w00` |
| Slice | `w00-s04-ci-quality-and-security-baseline` |
| Change | `chg-w00-s04-ci-quality-and-security-baseline` |
| User Stories | `us-w00-s04-ci-quality-and-security-baseline-001`, `us-w00-s04-ci-quality-and-security-baseline-002`, `us-w00-s04-ci-quality-and-security-baseline-003` |
| Implementer | Cursor |
| Dependencies | Completed and archived `chg-w00-s01-repository-governance-and-openspec-foundation` (baseline validation, secret scanning, delivery-graph validators); archived `chg-w00-s02-nx-angular-nest-baseline` (Nx monorepo, apps, shared contracts, application tests); archived `chg-w00-s03-postgresql-prisma-and-local-runtime` (Prisma/Postgres and Compose local runtime—Compose remains local runtime only, not CI ownership); binding main-only working policy (no feature branches, no Pull Requests) |
| Exclusions | Product domain modules (project registry, reviews, findings, budget, prompts, etc.); DeepSeek product API integration; authentication/multiuser; `apps/worker` product scaffolding; Playwright product E2E ownership; Nx Cloud; using Docker Compose as the CI vehicle; automatically managed local Git hooks; Pull Requests or feature-branch delivery; changing the main-only working policy; planning/product quality-gate product features belonging to later waves (e.g. `w05`); and all later-wave scope |

### Impact statements

| Area | Impact |
|---|---|
| Business value | Establishes fail-closed local prevention before commit/push plus independent post-push remote verification so foundation work on `main` stays verifiable and later waves inherit a bounded regression bar. |
| Security / privacy | Elevates secret scanning and baseline integrity into the required local/remote gate set; no authentication or multiuser model; secrets must not be committed or weakened to pass fixtures. |
| Persistence | No new product schema; local gates and remote CI may use ephemeral/Testcontainers Postgres only as needed to run existing persistence tests—Compose remains local runtime, not CI ownership. |
| UI / API | No product UI/API feature work; operator-facing gate/CI docs and clear success vs blocked gate outcomes. |
| Tests | Automated and/or scripted evidence for full local gate success and at least one meaningful failure path; existing application-test baseline suites remain required where local/remote gates invoke them. |
| Migration | No production data migration; gate/CI config introduction is additive and reversible by removing workflow and gate config files. |
| Rollback | Revert CI workflow(s), boundary config, and gate wiring; local validators from `w00-s01` remain available. |
| Human validation | Operator confirms local gate commands and failure behavior; full local gate `PASS` evidence is required before commit/push; explicit approval before commit, push, Verify, sync, or archive. |

## Capabilities

### New Capabilities

- `deterministic-ci-pipeline`: Owned GitHub Actions workflow that invokes the same quality-gate orchestrator after `push` to `main` (and via `workflow_dispatch`) as independent remote verification—fail-closed and visible on failure, distinct from Docker Compose local runtime, and **not** described as a pre-entry block onto `main`.
- `nx-dependency-boundaries`: Nx tag/constraint dependency-boundary enforcement that blocks forbidden dependency edges between apps and packages with explicit, human-readable failure.
- `required-quality-gates`: The foundation required gate set orchestrated by `scripts/run-quality-gates.sh` (install integrity, typecheck, dependency-boundary lint, automated tests, baseline validation, secret scanning), mandatory locally before commit/push, with deterministic success and blocked/failure behavior; the same orchestrator is what remote CI re-runs post-push.

### Modified Capabilities

- `baseline-validation-and-secret-scanning`: Require that existing standalone/orchestrated baseline validation and secret scanning are invoked as part of the required local/remote quality gate set without weakening scanner behavior for fixtures.
- `nx-monorepo-baseline`: Supersede the `w00-s02` “no CI workflow ownership” exclusion for this later slice so GitHub Actions CI may be introduced here; keep Nx Cloud excluded; do not introduce automatically managed local Git hooks.
- `application-test-baseline`: Extend expectations so the required local/remote quality gates invoke the established application test suites (including Testcontainers persistence tests where already required), record Verify evidence under this change’s `evidence/` path, and supersede the `w00-s03` wording that evidence must not rely on CI ownership / must live only under the s03 evidence path—for this slice’s Verify evidence—without transferring Playwright product E2E ownership into this slice.

## Impact

- **Repository files:** GitHub Actions workflow under `.github/workflows/`, `scripts/run-quality-gates.sh` (and root npm script alias), Nx dependency-boundary tags/constraints and boundary-lint config, docs/context and package-summary updates as needed.
- **Dependencies:** GitHub Actions runner tooling; reuse existing Node/Nx/Jest/Prisma/Testcontainers and `scripts/validate-baseline.sh` / `scripts/scan-secrets.py`; no Nx Cloud; no automatically managed local Git hooks; no new product runtime services.
- **OpenSpec:** New capability specs under this change plus deltas for `baseline-validation-and-secret-scanning`, `nx-monorepo-baseline`, and `application-test-baseline`; canonical sync only after Verify exactly `PASS` and operator-approved sync.
- **Systems not touched:** No product domain modules; no DeepSeek gateway; no auth; no `apps/worker`; no Playwright product E2E ownership; no Compose-as-CI; no PR/feature-branch delivery model; no edits to OpenSpec-generated integrations except via `openspec update`.
- **Risk if skipped:** Later slices would land on `main` without a mandatory local pre-commit/push gate and without independent post-push remote verification, allowing governance, dependency, and secret regressions to go undetected until much later.
