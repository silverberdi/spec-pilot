## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w01`, slice `w01-s04-project-dashboard`, User Stories `001–003`, Cursor as implementer, dependencies on archived `w01-s01`/`w01-s02`/`w01-s03` + Wave 0 foundation, exclusions) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no auto-discovery or configuration refresh on dashboard load, no `GET /dashboard`, no full `lastDiscovery` blob on list rows, no N+1 discovery GETs, no client-side sorting/filtering/pagination/virtual scrolling, no DB migration unless a hard gap forces a design revision, no target-repo filesystem/Git/OpenSpec access from list, no delivery controls (apply/verify/sync/archive, Git write, commit, PR), no auth/multiuser, no DeepSeek product API calls, no reviews/findings/budget ledger/prompts/context bundles, and no later-wave scope; capture the check in `evidence/exclusions-check.txt`

## 2. Shared dashboard contracts (US-001, `shared-libraries-baseline`)

- [x] 2.1 Extend `packages/shared-contracts` with `DiscoveryHealthStatus`, `ProjectDiscoveryHealthDto`, and required `ProjectDto.discoveryHealth`; keep health, registration, configuration, and discovery snapshot contracts intact; do not add Zod unless a later approved change requires it
- [x] 2.2 Update `isProjectDto` (and related guards) to require closed `discoveryHealth` unions and reject missing/unknown `status` or subsystem statuses; cover acceptance and rejection paths in shared-contracts tests; do not introduce a separate domain package or shared UI kit

## 3. Fail-closed health derivation (US-001, `project-dashboard`)

- [x] 3.1 Implement pure `deriveDiscoveryHealth(projectId, lastInspectedAt, lastDiscovery)` per design D2.1 matrix: both-null → `never_inspected`; exactly-one-null → `invalid`; type-guard fail → `invalid`; `projectId` mismatch → `invalid`; inspectedAt instant mismatch → `invalid`; both subsystems ok → `ok`; one/both blocked → `blocked`; never map partial/inconsistent persistence to `never_inspected` or `ok`
- [x] 3.2 Implement the closed Spanish `summaryMessage` mapper (Git/OpenSpec codes + invalid generic); never copy persisted subsystem `message` fields, raw JSON, stacks, paths, commands, or parser internals; compose Git fragment first, OpenSpec second, joined by one space when both blocked
- [x] 3.3 Add unit tests covering the full derivation matrix and exact mapper strings; capture outputs under `evidence/success/`

## 4. Enriched list/detail API (US-001, `local-project-registration` + `project-dashboard`)

- [x] 4.1 Enrich `ProjectsService.toDto` so every `ProjectDto` includes derived `discoveryHealth`; apply to `POST /projects` 201, `GET /projects`, and `GET /projects/:id`; leave configuration and discovery refresh/get DTOs unchanged unless they already embed `ProjectDto`
- [x] 4.2 Change `GET /projects` ordering to `registeredAt` DESC then `id` ASC; do not add `GET /dashboard`; do not return the full `lastDiscovery` blob on list/detail `ProjectDto`; do not open target-repository paths during list/detail enrichment
- [x] 4.3 Confirm newly registered projects return `discoveryHealth` never_inspected (`inspectedAt` null, subsystem statuses `unknown`, `summaryMessage` null) and invalid rows still return HTTP 200 on list/detail

## 5. Angular multi-project dashboard (US-001/US-003, `angular-web-console-baseline` + `project-dashboard`)

- [x] 5.1 Add a Spanish-first multi-project dashboard surface that loads `GET /projects` and shows empty, loading, populated, and error states; for each row show at least displayName, slug, discovery health label, inspectedAt when present, and configuration linkage hint separate from discovery health
- [x] 5.2 Preserve API list order by default; do not add client-side sorting, filtering, pagination, or virtual scrolling; do not auto-run discovery or configuration refresh on dashboard load; keep explicit per-project discovery refresh available without delivery controls
- [x] 5.3 Confirm the surface has no apply/verify/sync/archive, commit, PR, DeepSeek, budget, or review controls; keep copy Spanish-first and i18n-ready

## 6. Automated tests and evidence (US-002, `application-test-baseline`)

- [x] 6.1 Add API/integration tests: empty `GET /projects`; `POST /projects` 201 embeds never_inspected health; after discovery refresh list shows derived `ok` or `blocked`; multiple projects prove `registeredAt` DESC / `id` ASC ordering; invalid/partial persistence yields `invalid` without failing the list HTTP 200 where practical
- [x] 6.2 Add web tests for dashboard empty/loading/populated health labels, order preservation matching API response order, and at least one blocked or never_inspected presentation plus list error handling
- [x] 6.3 Re-run existing registration, configuration, discovery, health/readiness, `AppMetadata`, web shell, and shared-contracts suites and confirm they still pass; capture combined results under `evidence/success/`
- [x] 6.4 Record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable) in `evidence/impact-statements.md`

## 7. Governance validators and inventory sync (US-002/US-003)

- [x] 7.1 Synchronize `docs/context/**` and regenerate `package-summary.json` as needed for the dashboard tree; capture integrity-consistent results in evidence
- [x] 7.2 Document copyable operator commands for dashboard empty/populated/blocked-health paths using hyphenated `/opsx-*` syntax where OpenSpec commands are referenced; capture in `evidence/operator-commands.md`
- [x] 7.3 Run `npm run quality-gates` and existing baseline/governance validators (including secret scan) on the clean tree; capture passing output in `evidence/success/quality-gates-pass.txt` and `evidence/success/validators.txt`; stop on any failure
- [x] 7.4 Confirm no target-repo access from list, no secret file contents ingested, no real `.env` secrets committed, no delivery controls, and closed health/status codes only; capture in `evidence/secret-safety-check.txt`

## 8. Operator-visible outcomes (US-003)

- [x] 8.1 Obtain and record operator confirmation that dashboard empty state and at least one populated success/blocked/never-inspected health presentation work as documented in `evidence/human-validation.md`
- [x] 8.2 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record the confirmation in `evidence/no-deferred-ac.md`

## 9. Closure gates (US-003)

- [x] 9.1 Confirm that human validation, tests, governance validators, secret-safety checks, and the full local quality gate are all `PASS`; report the complete results to the operator and obtain one explicit authorization for the continuous stop-on-failure closure sequence: Verify → sync → post-sync validation → archive → final validation → commit → push
- [x] 9.2 With operator authorization, run OpenSpec Verify and require exactly `PASS`; capture the output in `evidence/verify.txt`; stop and remediate on any other result
- [x] 9.3 After Verify exactly `PASS`, sync the six capability specs (one new + five modified) to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence
- [x] 9.4 After sync, run `openspec validate --all --strict`, package-summary validation, delivery-graph validation, secret scan, baseline validation, and the full local quality gates; capture results and stop immediately on any failure
- [x] 9.5 Archive the change through the approved OpenSpec lifecycle; capture archive evidence and confirm no active changes remain
- [x] 9.6 After archive, run the complete final validation set, including OpenSpec validate/list, full local quality gates, package-summary, delivery-graph, secret scan, baseline, branch `main`, tracked/staged secret and `.env` checks, `git status`, and `git diff`; stop immediately on any failure
- [ ] 9.7 Only after every final validation is `PASS`, create one final closure commit on `main` with a message coherent with this slice and push to `origin/main` when authorized; do not create an implementation commit before Verify/sync/archive and do not require a second routine follow-up commit
- [ ] 9.8 After push, treat GitHub Actions as independent post-push remote verification; report its result when available and correct immediately on `main` if it fails; temporary absence of the remote result does not invalidate completed local closure evidence
