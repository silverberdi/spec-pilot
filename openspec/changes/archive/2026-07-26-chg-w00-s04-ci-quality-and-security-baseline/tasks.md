## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w00`, slice `w00-s04-ci-quality-and-security-baseline`, User Stories `001–003`, Cursor as implementer, dependencies on archived `chg-w00-s01` / `chg-w00-s02` / `chg-w00-s03`, exclusions) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no product domain modules, no DeepSeek product integration, no authentication/multiuser, no `apps/worker`, no Playwright product E2E ownership, no Nx Cloud, no Compose-as-CI, no automatically managed local Git hooks, no Pull Requests or feature branches, no change to the main-only working policy, and no later-wave scope; capture the check in `evidence/exclusions-check.txt`

## 2. Nx dependency boundaries (US-001, `nx-dependency-boundaries`)

- [x] 2.1 Set project tags: `apps/web` → `type:app`,`scope:web`; `apps/api` → `type:app`,`scope:api`; `packages/shared-contracts` → `type:lib`,`scope:shared`; confirm empty `tags: []` are replaced; record in `evidence/tags.txt`
- [x] 2.2 Add minimal ESLint + `@nx/eslint-plugin` configuration focused on `@nx/enforce-module-boundaries` with the binding constraints from design D3 (no app→app; no web↔api; libs must not depend on apps; apps may depend on shared); resolve package versions compatible with Nx 23.1.0 via clean `npm install` without peer bypass; record versions in `evidence/toolchain.md`
- [x] 2.3 Provide a dedicated Nx target or root script that runs the boundary check and can be invoked by the quality-gate orchestrator; capture a clean success run under `evidence/success/boundaries.txt`

## 3. Required quality gates orchestrator (US-001, `required-quality-gates`)

- [x] 3.1 Add `scripts/run-quality-gates.sh` as the single fail-closed orchestrator implementing design D2 order: install integrity → typecheck → dependency-boundary lint → `nx run-many -t test` (including Testcontainers suites; not CI-skipped) → `scripts/validate-baseline.sh` → secret scanning (`scripts/scan-secrets.py`, without dropping coverage); each step MUST exit non-zero with a human-readable reason on failure
- [x] 3.2 Add a root npm script alias that wraps `scripts/run-quality-gates.sh`; record exact argv in `evidence/gate-commands.md`
- [x] 3.3 Document that the full local gate `PASS` is mandatory before commit/push, that Cursor/operator MUST NOT commit or push when the gate is not `PASS`, and that this slice does not install automatically managed local Git hooks; capture in `evidence/operator-commands.md`
- [x] 3.4 Confirm no automatically managed local Git hooks or hook managers were introduced by this change; capture in `evidence/exclusions-check.txt` or `evidence/no-git-hooks.txt`

## 4. Deterministic post-push CI (US-001, `deterministic-ci-pipeline`)

- [x] 4.1 Add `.github/workflows/` kebab-case workflow (e.g. `ci-quality-gates.yml`) with triggers `push` to `main` and `workflow_dispatch` only (no PR delivery workflow); pin Actions/Node versions; record pins in `evidence/toolchain.md`
- [x] 4.2 Configure the workflow to: checkout; set up Node 24.x per `package.json` engines; run `npm ci` without peer bypass; ensure Docker (or equivalent) is available for Testcontainers; invoke the same `scripts/run-quality-gates.sh` (or npm alias); fail the workflow on non-zero exit; MUST NOT use Docker Compose as the gate runner; MUST NOT describe CI as a pre-entry block onto `main`
- [x] 4.3 Confirm Nx Cloud remains disabled (no cloud token/config); capture in `evidence/nx-cloud-check.txt`
- [x] 4.4 Update operator docs to state clearly: local orchestrator = pre-commit/pre-push prevention; GitHub Actions = independent post-push remote verification that fails closed and requires immediate correction; remote CI does not prevent entry onto `main`

## 5. Wire existing validators into the gate set (US-001/002, `baseline-validation-and-secret-scanning`)

- [x] 5.1 Ensure `scripts/run-quality-gates.sh` invokes baseline validation and secret scanning as required steps without weakening scanners for fixtures
- [x] 5.2 Confirm standalone `scripts/validate-baseline.sh` and `scripts/scan-secrets.py` remain runnable individually in addition to the quality-gate orchestrator

## 6. Application tests under gates (US-002, `application-test-baseline`)

- [x] 6.1 Confirm the quality-gate orchestrator runs established web, API, shared-contracts, and Testcontainers persistence suites via `nx run-many -t test` and does not mark persistence tests as CI-skipped
- [x] 6.2 Confirm SpecPilot Compose is not used as the CI/test database vehicle inside the gate run; Testcontainers remains the ephemeral integration path
- [x] 6.3 Re-run existing application suites as part of a full local gate run and capture combined results under `evidence/success/`

## 7. Deterministic success and failure evidence (US-002)

- [x] 7.1 Capture at least one reversible blocked/failure path (preferred: temporary forbidden dependency edge that fails the boundary gate, OR a clearly labeled secret-scan fixture exercised then removed/neutralized); store non-zero output and human-readable reason under `evidence/failure/`; restore the tree
- [x] 7.2 After restore, capture full local `scripts/run-quality-gates.sh` exit `0` under `evidence/success/quality-gates-pass.txt` (required for closure before commit/push)
- [x] 7.3 Record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable) in `evidence/impact-statements.md`
- [x] 7.4 Record that remote Actions logs, if later available after push, are corroboration only and do not replace local full-gate `PASS` evidence

## 8. Docs, inventory, and governance sync (US-002/US-003)

- [x] 8.1 Update `docs/context/**` as needed for CI/gates/boundaries; regenerate `package-summary.json`; capture integrity-consistent results in evidence
- [x] 8.2 Document copyable local gate commands and remote CI semantics using hyphenated `/opsx-*` syntax where OpenSpec commands are referenced; finalize `evidence/operator-commands.md`
- [x] 8.3 Run baseline/governance validators on the clean tree (including secret scan) and capture passing output in `evidence/success/validators.txt`
- [x] 8.4 Confirm toolchain pins (Node, Nx ESLint packages, Actions majors/SHAs) are recorded and lockfile remains clean without peer bypass

## 9. Operator-visible outcomes (US-003)

- [x] 9.1 Obtain and record operator confirmation that local gate success, local gate failure, and the documented local-prevention vs post-push-remote-verification semantics behave as specified in `evidence/human-validation.md`
- [x] 9.2 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record in `evidence/no-deferred-ac.md`

## 10. Closure gates (US-003)

- [x] 10.1 Confirm full local quality-gate `PASS` evidence from task 7.2 exists; if it is missing or not `PASS`, stop immediately and do not proceed with closure
- [x] 10.2 Report implementation results, reversible failure-path evidence, application tests, governance validators, human validation, and the full local quality-gate `PASS` to the operator; obtain one explicit authorization for the continuous stop-on-failure closure sequence: Verify → sync → post-sync validation → archive → final validation → commit → push
- [x] 10.3 With operator authorization, run OpenSpec Verify and require exactly `PASS`; capture output in `evidence/verify.txt`; stop and remediate on any other result
- [x] 10.4 After Verify exactly `PASS`, sync the six capability specs (three new + three modified) to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence
- [x] 10.5 After sync, run `openspec validate --all`, package-summary validation, delivery-graph validation, secret scan, baseline validation, and the full local quality gates; capture results and stop immediately on any failure
- [x] 10.6 Archive the change through the approved OpenSpec lifecycle; capture archive evidence and confirm no active changes remain
- [x] 10.7 After archive, run the complete final validation set: OpenSpec validate/list, full local quality gates, package-summary, delivery-graph, secret scan, baseline, branch `main`, secret/license/.env checks, `git status`, and `git diff`; stop immediately on any failure
- [x] 10.8 Only after every final validation is `PASS`, create one final closure commit on `main` with a message coherent with this slice and push to `origin/main` when authorized; do not create an implementation commit before Verify/sync/archive and do not require a second routine follow-up commit
- [x] 10.9 After push, treat GitHub Actions as independent post-push remote verification; report the workflow result when available; if it fails, correct immediately on `main` with a corrective commit; do not describe Actions as a pre-entry block, and do not treat temporary absence of the remote result as invalidating the completed local closure evidence
