## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w01`, slice `w01-s03-git-and-openspec-discovery`, User Stories `001–003`, Cursor as implementer, dependencies on archived `w01-s01`/`w01-s02` + Wave 0 foundation, exclusions) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no project dashboard / multi-project discovery-health UI (`w01-s04`), no target-repo writes or delivery/Git-write/OpenSpec apply-verify-sync-archive execution, no PATH/global OpenSpec CLI resolution, no auth/multiuser, no DeepSeek product API calls, no reviews/findings/budget ledger/prompts/context bundles, no immutable discovery-version history table, and no later-wave scope; capture the check in `evidence/exclusions-check.txt`

## 2. Shared discovery contracts (US-001, `shared-libraries-baseline`)

- [x] 2.1 Extend `packages/shared-contracts` with `ProjectDiscoveryDto`, closed `GitDiscoveryBlockedCode` / `OpenSpecDiscoveryBlockedCode` unions, and hard/API discovery codes (`discovery_not_found`, `discovery_refresh_failed`, plus existing repository/`project_not_found` codes as needed); keep health, registration, and configuration contracts intact; do not add Zod unless a later approved change requires it
- [x] 2.2 Implement type guards that accept valid ok/blocked Git and OpenSpec unions and reject unknown blocked codes and ambiguous shapes (`ok` with `code`, `blocked` without `code`, missing required ok fields); cover success and invalid payload paths in shared-contracts tests; do not introduce a separate domain package or shared UI kit

## 3. Discovery persistence model (US-001, `postgresql-prisma-persistence-baseline`)

- [x] 3.1 Add nullable Prisma `Project.lastDiscovery` JSON column; retain existing nullable `lastInspectedAt`, `AppMetadata`, `ProjectConfigurationVersion`, and registration fields; omit discovery-version history tables and reviews/findings/budgets/prompts/auth/users
- [x] 3.2 Generate the additive migration under `apps/api/prisma/migrations/`; leave migration files ready for the single final closure commit; apply with `prisma migrate deploy` for tests and evidence; do not create Git commits during implementation; do not edit a migration after it has been applied—any correction MUST be a new migration

## 4. Git inspector port (US-001, `git-and-openspec-discovery`)

- [x] 4.1 Implement allowlisted Git inspection via `child_process.execFile` only (never `exec`, never shell) with `cwd` = canonical `repositoryPath`, timeout **5000** ms, maxBuffer **1048576** bytes, and env `GIT_TERMINAL_PROMPT=0`, `GIT_OPTIONAL_LOCKS=0`, `LC_ALL=C`
- [x] 4.2 Wire fixed argv only: `git rev-parse --is-inside-work-tree`, `git rev-parse --abbrev-ref HEAD`, `git rev-parse HEAD`, `git status --porcelain=v1`, and optional upstream rev-parse; do not accept operator-provided flags, commands, pathspecs, revisions, or environment values
- [x] 4.3 Map outcomes per design/specs: `not_a_git_repository`; `git_inspection_timeout` on required-command timeout; `git_inspect_failed` otherwise; ok path enforces 40 lowercase hex `headSha` (or null only for confirmed unborn HEAD), `branch` null only when detached, `dirty` from porcelain, missing upstream → `upstream: null` without blocking

## 5. OpenSpec inspector port (US-001, `git-and-openspec-discovery`)

- [x] 5.1 Implement filesystem-primary OpenSpec inspection with path containment under canonical `repositoryPath`; resolve paths safely; do not follow out-of-tree symlinks or inspect outside the boundary; map escapes to `openspec_path_escape`; inspect names/metadata/existence only (no content ingestion)
- [x] 5.2 Enforce bounds: max **500** active change directories; max **10000** combined specs-tree entries visited; archive counts immediate regular directories only (no recursion); do not follow symlinks during traversal; map overflows to `openspec_inspection_limit_exceeded`
- [x] 5.3 Implement exact artifact presence: active names from immediate regular dirs under `openspec/changes` excluding `archive`; `hasProposal`/`hasDesign`/`hasTasks` only for direct regular `proposal.md`/`design.md`/`tasks.md`; `hasSpecs` only for `specs/<capability>/spec.md` regular files; empty active list with valid root → `ok`; missing root → `openspec_root_missing`
- [x] 5.4 Optional CLI enrichment using only `<repositoryPath>/node_modules/.bin/openspec` as a regular executable inside the repo; `execFile` with fixed `list --json`, cwd = repositoryPath, same timeout/buffer; never PATH/global binary; never other OpenSpec commands; absent/failed/unusable CLI → `cliAvailable: false` without blocking filesystem success

## 6. Discovery service and HTTP API (US-001, `git-and-openspec-discovery` + `local-project-registration`)

- [x] 6.1 Implement `DiscoveryService.refreshDiscovery` / `getDiscovery` in `ProjectsModule`: hard-path failures → 422/404 without field updates; completed cycles (including blocked subsystems) → HTTP 200 + atomic `lastDiscovery` + `lastInspectedAt` update; unexpected mid-refresh → 500 `discovery_refresh_failed` without field updates; discovery independent of `configurationVersionId`
- [x] 6.2 Expose `POST /projects/:id/discovery/refresh` and `GET /projects/:id/discovery` (`discovery_not_found` when never inspected); keep `GET /projects` / `GET /projects/:id` free of the full discovery blob; keep registration/configuration behavior unchanged (`lastInspectedAt` null on register; no auto-discovery)
- [x] 6.3 Ensure API runtime includes `git` (Dockerfile/Compose adjustment if needed); confirm no target-repository mutation and no delivery workflow execution from SpecPilot

## 7. Angular discovery outcomes (US-001/US-003, `angular-web-console-baseline`)

- [x] 7.1 Extend the Spanish-first console with an explicit discovery refresh action for a known project id when the list is non-empty, showing empty/never-inspected, loading, success (Git + OpenSpec summaries + last inspection time), and blocked/error states for refresh/get outcomes
- [x] 7.2 Do not build a multi-project discovery-health dashboard, theme-switcher product features, or delivery command runners; keep copy read-only / inspection-only

## 8. Automated tests and evidence (US-002, `application-test-baseline`)

- [x] 8.1 Add unit tests for Git non-repo / timeout / headSha validation / detached branch / dirty porcelain / non-interactive env; OpenSpec missing root, empty ok, artifact booleans, arbitrary markdown not counting as specs, path escape, inspection limits, local-CLI absent/fail non-blocking, never PATH; capture outputs under `evidence/success/` and `evidence/failure/` as applicable
- [x] 8.2 Add Testcontainers PostgreSQL API/integration tests: refresh success persists fields; non-git → 200 blocked Git + persist; OpenSpec blocked limit/escape/root outcomes → 200 + persist where practical; hard path → 422 without field updates; get before refresh → 404 `discovery_not_found`; unexpected → 500 `discovery_refresh_failed` where practical; register still returns `lastInspectedAt: null`; confirm fixture repos are not modified by SpecPilot writes
- [x] 8.3 Add shared-contracts tests for valid/unknown/ambiguous `ProjectDiscoveryDto` unions and web tests for discovery empty/loading/success/blocked-error states against mocked API responses
- [x] 8.4 Re-run existing registration, configuration, health/readiness, `AppMetadata`, web shell, and shared-contracts suites and confirm they still pass; capture combined results under `evidence/success/`
- [x] 8.5 Record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable) in `evidence/impact-statements.md`

## 9. Governance validators and inventory sync (US-002/US-003)

- [x] 9.1 Synchronize `docs/context/**` and regenerate `package-summary.json` as needed for the discovery tree; capture integrity-consistent results in evidence
- [x] 9.2 Document copyable operator commands for discovery refresh success/blocked and get never-inspected paths using hyphenated `/opsx-*` syntax where OpenSpec commands are referenced; capture in `evidence/operator-commands.md`
- [x] 9.3 Run `npm run quality-gates` and existing baseline/governance validators (including secret scan) on the clean tree; capture passing output in `evidence/success/quality-gates-pass.txt` and `evidence/success/validators.txt`; stop on any failure
- [x] 9.4 Confirm no PATH OpenSpec usage, no target-repo mutation, no secret file contents ingested, no real `.env` secrets committed, and closed discovery codes only; capture in `evidence/secret-safety-check.txt`

## 10. Operator-visible outcomes (US-003)

- [x] 10.1 Obtain and record operator confirmation that discovery refresh success and at least one blocked/failure path (plus get-before-refresh behavior) work as documented in `evidence/human-validation.md`
- [x] 10.2 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record the confirmation in `evidence/no-deferred-ac.md`

## 11. Closure gates (US-003)

- [x] 11.1 Confirm that human validation, tests, governance validators, secret-safety checks, and the full local quality gate are all `PASS`; report the complete results to the operator and obtain one explicit authorization for the continuous stop-on-failure closure sequence: Verify → sync → post-sync validation → archive → final validation → commit → push
- [x] 11.2 With operator authorization, run OpenSpec Verify and require exactly `PASS`; capture the output in `evidence/verify.txt`; stop and remediate on any other result
- [x] 11.3 After Verify exactly `PASS`, sync the six capability specs (one new + five modified) to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence
- [x] 11.4 After sync, run `openspec validate --all --strict`, package-summary validation, delivery-graph validation, secret scan, baseline validation, and the full local quality gates; capture results and stop immediately on any failure
- [x] 11.5 Archive the change through the approved OpenSpec lifecycle; capture archive evidence and confirm no active changes remain
- [x] 11.6 After archive, run the complete final validation set, including OpenSpec validate/list, full local quality gates, package-summary, delivery-graph, secret scan, baseline, branch `main`, tracked/staged secret and `.env` checks, `git status`, and `git diff`; stop immediately on any failure
- [x] 11.7 Only after every final validation is `PASS`, create one final closure commit on `main` with a message coherent with this slice and push to `origin/main` when authorized; do not create an implementation commit before Verify/sync/archive and do not require a second routine follow-up commit
- [x] 11.8 After push, treat GitHub Actions as independent post-push remote verification; report its result when available and correct immediately on `main` if it fails; temporary absence of the remote result does not invalidate completed local closure evidence
