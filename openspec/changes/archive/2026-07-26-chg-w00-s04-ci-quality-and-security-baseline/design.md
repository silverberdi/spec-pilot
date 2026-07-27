## Context

Wave `w00` slices `w00-s01` (governance validators, secret scanning, delivery-graph checks), `w00-s02` (Nx 23 monorepo, Angular `apps/web`, NestJS/Fastify `apps/api`, `packages/shared-contracts`, Jest), and `w00-s03` (PostgreSQL/Prisma, Compose local runtime, Testcontainers evidence) are complete and archived. The workspace uses npm workspaces, Node.js 24.x, TypeScript 6.0.3, Nx 23.1.0, a single root `package-lock.json`, and no peer-dependency bypasses. Project tags are empty; there is no `.github/` CI ownership; Angular scaffolding used `linter: none`. Local validators (`scripts/validate-baseline.sh`, `scripts/scan-secrets.py`) exist but are not a mandatory pre-commit/push gate set and are not required remote CI gates.

`w00-s02` canonical `nx-monorepo-baseline` forbids CI workflow ownership for that slice and forbids Nx Cloud. Compose (`w00-s03`) is explicitly not CI ownership. Working policy is main-only: no feature branches, no Pull Requests; operator approval gates commit/push/Verify/sync/archive. Because delivery is push-to-`main`, any GitHub Actions workflow triggered by that push can only verify **after** the commit is already on `main`—it cannot pre-block entry onto `main`.

Stakeholders: SpecPilot operator (human validation and approvals); Cursor (sole implementer).

## Goals / Non-Goals

**Goals:**

- Provide `scripts/run-quality-gates.sh` as the **mandatory local** fail-closed quality-gate orchestrator. Cursor and the operator MUST NOT create the final commit or push unless the full local gate is `PASS`. This is the pre-commit/pre-push prevention control.
- Own a deterministic GitHub Actions workflow that runs the **same** orchestrator after `push` to `main` (and via `workflow_dispatch`) as **independent post-push remote verification**—visible, fail-closed on failure, requiring immediate correction, and **not** described as a pre-entry block onto `main`.
- Enforce Nx dependency boundaries via project tags and `@nx/enforce-module-boundaries` so forbidden app/package edges fail with human-readable reasons.
- Elevate existing baseline validation and secret scanning into the required gate set without weakening scanners for fixtures.
- Capture deterministic success-path and at least one meaningful blocked/failure-path evidence under this change’s `evidence/`, including full local gate `PASS` before operator-approved commit/push.
- Keep docs/context and `package-summary.json` synchronized; preserve main-only policy and Nx Cloud exclusion.

**Non-Goals:**

- Product domain modules, DeepSeek integration, authentication/multiuser, `apps/worker`.
- Playwright product E2E ownership; planning/product quality-gate product features (`w05` and later).
- Nx Cloud, remote caching tokens, or paid Nx SaaS.
- Using Docker Compose as the CI vehicle (Compose remains local runtime only).
- Automatically managed local Git hooks (pre-commit/pre-push hook installation or hook managers) in this slice.
- Full product lint/style redesign beyond what is required to enforce boundaries and run typecheck/test gates.
- Changing the main-only working policy or introducing PR-based branch protection / feature branches as a delivery model.
- Claiming that GitHub Actions alone prevents commits from entering `main`.
- Editing OpenSpec-generated integrations except via `openspec update`.

## Decisions

### D1 — GitHub Actions owns post-push remote CI; Compose stays local-only

CI ownership is a repository workflow under `.github/workflows/` (kebab-case name, e.g. `ci-quality-gates.yml`). Triggers: `push` to `main` and `workflow_dispatch` (manual operator run). No PR-triggered delivery workflow is required because SpecPilot does not use Pull Requests.

**Semantic binding:** because the workflow runs on (or after) `push` to `main`, remote CI is **post-push remote verification**, not a pre-merge or pre-entry gate onto `main`. A remote failure MUST be operator-visible, exit non-zero / fail the workflow, and require immediate correction on `main`. It MUST NOT be documented or specified as preventing the commit from entering `main`.

The workflow MUST NOT call `docker compose` as its gate runner; Compose remains the `w00-s03` local runtime.

- *Alternative considered:* local-only scripts without CI workflows. Rejected — the slice explicitly owns deterministic remote CI verification.
- *Alternative considered:* Compose-based CI jobs. Rejected — Compose MUST NOT be CI ownership (`docker-compose-local-runtime` / prior slice exclusions).
- *Alternative considered:* PR-only CI or branch-protection pre-merge checks. Rejected — conflicts with binding main-only / no-PR working policy.
- *Alternative considered:* describe Actions as blocking entry to `main`. Rejected — factually false under push-to-`main` triggers.

### D2 — Single gate orchestrator; local prevention vs remote verification

Introduce `scripts/run-quality-gates.sh` (with a root npm script alias that wraps it) as the ordered, fail-closed orchestrator and the **single source of truth** for the required gate set.

**Local pre-commit/pre-push gate (prevention):**

- Running the full orchestrator to `PASS` is **mandatory** before any final commit or push of this change’s implementation (and remains the standing operator/Cursor obligation for subsequent `main` work covered by these gates).
- Cursor and the operator MUST NOT create the final commit or push when the full local gate is not `PASS`.
- This slice does **not** add automatically managed local Git hooks; enforcement is procedural (working policy + evidence), not hook-installed.

**Remote post-push CI (independent verification):**

- GitHub Actions checks out the repo, sets up Node 24.x matching `package.json` `engines`, runs `npm ci`, then invokes the **same** orchestrator.
- Remote runs detect and fail closed on regressions that reached `main`; they do not replace the local mandatory gate.

Gate order (each step exits non-zero with a human-readable reason on failure; no silent continue):

1. **Install integrity** — `npm ci` (CI) or an explicit local install-integrity / clean-lockfile step before other gates so local and remote parity is real, not docs-only.
2. **Typecheck** — `nx run-many -t typecheck` (or project-equivalent targets present in the workspace).
3. **Dependency boundaries** — ESLint `@nx/enforce-module-boundaries` (see D3).
4. **Automated tests** — `nx run-many -t test` (existing Jest suites, including Testcontainers persistence tests).
5. **Baseline validation** — `scripts/validate-baseline.sh`.
6. **Secret scanning** — `scripts/scan-secrets.py` (standalone or via baseline orchestrator; the gate set MUST still fail if secret scan fails even if invoked only once—do not drop coverage).

Exact argv and any Nx project filters are fixed at apply and recorded in evidence. Pin Actions actions by major (or full SHA if design-at-apply chooses SHA pinning) and Node version from the locked toolchain.

- *Alternative considered:* duplicate gate commands only inside the workflow YAML. Rejected — drift risk vs local evidence; single orchestrator is the contract.
- *Alternative considered:* `nx affected` only. Rejected for foundation baseline — full `run-many` is deterministic and small enough; affected optimization can come later without changing the gate set.
- *Alternative considered:* install automatically managed Git hooks to force the local gate. Rejected for this slice — exclusions bind no auto-managed local Git hooks; procedural + evidence obligation is sufficient under operator approval.

### D3 — Nx tags + ESLint module-boundary enforcement

Introduce ESLint with `@nx/eslint-plugin` solely as needed to enforce module boundaries (workspace may keep broader lint rules minimal). Tag projects:

| Project | Tags (minimum) |
|---|---|
| `apps/web` | `type:app`, `scope:web` |
| `apps/api` | `type:app`, `scope:api` |
| `packages/shared-contracts` | `type:lib`, `scope:shared` |

Dependency constraints (binding intent):

- `type:app` MUST NOT depend on another `type:app`.
- `scope:web` MUST NOT depend on `scope:api` (and vice versa).
- Apps MAY depend on `scope:shared` / `type:lib`.
- `type:lib` MUST NOT depend on `type:app`.

A dedicated Nx target or root lint script runs the boundary rule and is part of the required gate set. Empty `tags: []` is replaced; new projects in later slices inherit the tagging convention via docs and this capability’s requirements.

- *Alternative considered:* custom Python/shell graph checker without ESLint. Rejected — Nx’s supported mechanism is `enforce-module-boundaries`; custom checkers drift from the project graph.
- *Alternative considered:* full Angular ESLint stylistic suite now. Rejected — out of scope; boundaries + typecheck/test/security gates are the slice capability. Broader lint policy can expand later without blocking this baseline.

### D4 — Supersede `w00-s02` “no CI ownership”; keep Nx Cloud off

Delta on `nx-monorepo-baseline`: the prohibition on CI workflow ownership applied to `w00-s02` scaffolding and is superseded for this slice—GitHub Actions workflows introduced here are allowed and required as post-push remote verification. Nx Cloud remains forbidden (`nx.json` analytics/cloud stay off; no Nx Cloud token). Automatically managed local Git hooks are not introduced.

- *Alternative considered:* leave the s02 requirement unchanged and only add a new CI capability. Rejected — conflicting canonical requirements would make Verify incoherent; an explicit delta is required.

### D5 — Tests in local gates and remote CI use Testcontainers where already required

Local gate runs and CI runners MUST provide Docker (or an equivalent socket) so existing `w00-s03` Testcontainers PostgreSQL tests can run as part of `nx run-many -t test`. Do not mark persistence integration tests as CI-skipped. Do not use SpecPilot Compose project resources as the CI database.

- *Alternative considered:* skip Testcontainers in CI and run only unit tests remotely. Rejected — proposal requires local/remote gates to invoke the established application test baseline; skipping persistence evidence weakens the gate.
- *Alternative considered:* start SpecPilot `compose.yaml` in CI for tests. Rejected — Compose is not CI ownership; Testcontainers remains the ephemeral CI/integration path.

### D6 — Failure-path evidence and closure gate evidence

Evidence minimum under `openspec/changes/chg-w00-s04-ci-quality-and-security-baseline/evidence/`:

1. **Local success (required for closure / before commit/push):** full `scripts/run-quality-gates.sh` exits `0` on a clean tree. Change closure MUST require this local full-gate `PASS` evidence before operator-approved commit/push of the implementation.
2. **Blocked/failure:** at least one induced, reversible failure—preferred: temporary forbidden dependency edge that fails the boundary gate, OR a clearly labeled secret-scan fixture path exercised then removed/neutralized (reuse s01 fixture discipline). Capture non-zero exit and human-readable reason; restore the tree so a subsequent clean run passes.
3. **Remote verification (when a push occurs):** workflow run log showing the same orchestrator invoked post-push is desirable corroboration but does **not** replace item 1, and MUST NOT be described as pre-entry blocking onto `main`.

Operator-facing docs list copyable local gate commands, state the commit/push prohibition when local gate is not `PASS`, and note hyphenated OpenSpec commands (`/opsx-apply`, `/opsx-verify`, etc.) where lifecycle steps are referenced.

- *Alternative considered:* evidence only from a green remote Actions run. Rejected — Verify must be reproducible locally; remote post-push logs alone cannot be the prevention control under main-only delivery.

### D7 — Security, privacy, observability

- Secret scanning and baseline validation become required gates; scanners MUST NOT be weakened to pass induced fixtures.
- No committed secrets; `.env` remains gitignored; CI secrets (if any) stay in the Actions secret store—this slice should need none beyond public checkout.
- No authentication changes; no remote product exposure.
- Observability: gate step logs, non-zero exits, workflow job summaries; no APM.

### D8 — Domain / API / UI / data model

No product domain model, API route, or UI feature changes in this slice. Contracts are operational: local gate orchestrator + post-push CI workflow exit codes and messages; Nx tag/constraint graph. Persistence schema unchanged.

### D9 — Docs, inventory, and lifecycle

After implementation: update `docs/context/**` as needed, regenerate `package-summary.json`, document local gate (prevention) vs remote CI (post-push verification) runbooks. Canonical sync and archive only after Verify exactly `PASS` with operator approval.

## Risks / Trade-offs

- [ESLint introduction conflicts with `linter: none` scaffolding] → Add minimal ESLint config focused on `@nx/enforce-module-boundaries`; avoid broad stylistic rule dumps; record config in evidence.
- [Testcontainers/Docker unavailable on GitHub-hosted runner configuration] → Use a runner setup with Docker available; if apply discovers incompatibility, stop and reconcile rather than skip persistence tests.
- [Gate runtime becomes long on every `main` push] → Acceptable for foundation; prefer `run-many` determinism over premature `affected` optimization; cache `npm` and Nx where Actions cache is safe without Nx Cloud.
- [Canonical `nx-monorepo-baseline` still forbids CI until sync] → Ship explicit delta in this change; sync only after Verify `PASS`.
- [Duplicate secret scan if baseline orchestrator already calls it] → Prefer one authoritative invocation in the gate script; document that local/remote gates still fail closed on secret findings.
- [Induced failure fixtures left in tree] → Follow s01 reversible fixture discipline; clean run must pass after evidence capture.
- [Remote CI fails only after a bad commit is already on `main`] → Accepted under main-only policy; mitigate with mandatory local full-gate `PASS` before commit/push, plus immediate-correction obligation on remote failure—do not invent PRs or pre-merge checks.
- [Operators expect PR checks / “CI blocked the merge” language while policy is main-only] → Document local prevention vs post-push remote verification; keep `push`/`main` + `workflow_dispatch` triggers; do not introduce a PR delivery model.
- [Procedural local gate skipped without hooks] → Closure requires local full-gate evidence; Cursor/operator commit/push prohibition when not `PASS`; no auto-managed Git hooks in this slice.
- [Scope creep into product lint/E2E/Nx Cloud/hooks] → Non-goals and exclusions are binding in tasks.

## Migration Plan

1. Add project tags to `apps/web`, `apps/api`, and `packages/shared-contracts`; add ESLint + `@nx/eslint-plugin` boundary config and a runnable boundary/lint target.
2. Add `scripts/run-quality-gates.sh` (and root npm script alias) implementing D2 order; fail closed per step; document mandatory local `PASS` before commit/push.
3. Add `.github/workflows/` CI workflow: Node 24.x, `npm ci`, Docker available for Testcontainers, invoke the same gate orchestrator; triggers `push` to `main` + `workflow_dispatch` as **post-push remote verification** only.
4. Confirm Nx Cloud remains disabled; no cloud tokens; no automatically managed local Git hooks.
5. Capture blocked/failure-path evidence (reversible); restore clean tree; capture **full local gate `PASS`** evidence required for closure.
6. Run governance validators; update docs/context and package-summary; document local prevention vs remote post-push verification.
7. Only after full local gate `PASS` evidence is recorded: with operator approval, commit on `main` (and push if requested). Cursor/operator MUST NOT commit or push if the local gate is not `PASS`.
8. After push (if any): treat GitHub Actions as independent remote verification; on remote failure, correct immediately on `main`.
9. With operator approval: Verify exactly `PASS`, sync canonical specs (new capabilities + deltas), archive.

**Rollback:** revert the slice’s commits on `main` (remove workflow, gate script, ESLint/boundary config, tag changes). Local `w00-s01` validators remain. No remote data stores or Compose project changes are required for rollback.

## Open Questions

- None blocking planning. Concrete GitHub Action action versions/SHA pins and any Nx ESLint package minors are resolved and evidenced at apply time against the locked Nx 23.1.0 toolchain. Gate command argv is fixed at apply and recorded under `evidence/`.
