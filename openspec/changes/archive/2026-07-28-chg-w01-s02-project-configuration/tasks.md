## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w01`, slice `w01-s02-project-configuration`, User Stories `001–003`, Cursor as implementer, dependencies on archived `w01-s01` + Wave 0 foundation, exclusions) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no Git/OpenSpec discovery (`w01-s03`), no project dashboard / discovery-health UI (`w01-s04`), no target-repo writes or delivery command execution, no auth/multiuser, no DeepSeek product API calls, no reviews/findings/budget ledger/prompts/context bundles, no raw YAML stored in PostgreSQL, and no later-wave scope; capture the check in `evidence/exclusions-check.txt`

## 2. Shared configuration contracts (US-001, `shared-libraries-baseline`)

- [x] 2.1 Extend `packages/shared-contracts` with `ProjectConfigurationVersionDto`, `configurationVersionId: string | null` on `ProjectDto`, and binding `RegisterProjectResponse` (`ProjectDto & { configuration: attached | blocked }`); keep health and existing registration request/error contracts intact; do not add Zod unless a later approved change requires it
- [x] 2.2 Implement type guards that enforce the discriminated `configuration` union (attached requires `version` only; blocked requires `error` only; attached requires `configurationVersionId === version.id`; blocked requires `configurationVersionId === null`); cover success and ambiguous/invalid payload paths in shared-contracts tests; do not introduce a separate domain package or shared UI kit

## 3. Configuration persistence model (US-001, `postgresql-prisma-persistence-baseline`)

- [x] 3.1 Add Prisma `ProjectConfigurationVersion` model (`id`, `projectId`, `schemaVersion`, `sourceHash`, `normalizedConfig` JSON, `validatedAt`, `createdAt`) and nullable `Project.configurationVersionId` FK; retain `AppMetadata` and existing `Project` registration fields; omit reviews, findings, budgets, prompts, auth, and users; do not store raw YAML
- [x] 3.2 Generate the additive migration under `apps/api/prisma/migrations/` with unique `(projectId, sourceHash)` and the active FK; leave migration files ready for the single final closure commit; apply with `prisma migrate deploy` for tests and evidence; do not create Git commits during implementation; do not edit a migration after it has been applied—any correction MUST be a new migration

## 4. Parse / validate / version pipeline (US-001, `project-yaml-configuration`)

- [x] 4.1 Add the locked `yaml` dependency at the workspace root (if not already present) and implement a read-only configuration reader that loads exact `.specpilot/project.yaml` bytes from the project's canonical `repositoryPath` without writing to the target repository
- [x] 4.2 Enforce the hard size limit of **262144** bytes before parse; on overflow return `project_yaml_too_large` with no parse, no snapshot, and no `configurationVersionId` move
- [x] 4.3 Compute `sourceHash` as SHA-256 hexadecimal lowercase of the exact source bytes with no pre-hash normalization of line endings, whitespace, key order, or YAML content; build `normalizedConfig` separately after validation
- [x] 4.4 Implement schema validation for `schemaVersion: 1` per design/specs (required keys, kebab-case machine IDs, portable repository fields, include/exclude normalization into `normalizedConfig`, mandatory secret-exclude merge, `executor.tool === 'cursor'`, read-only validation assistant when enabled, non-negative finite `monthlyBudgetUsd` when present) with the documented machine-readable codes
- [x] 4.5 Persist only successfully validated versions; insert version + update `Project.configurationVersionId` in a **single PostgreSQL transaction**; never update existing version columns; same-hash for a `projectId` is idempotent via unique `(projectId, sourceHash)`; byte-different content creates a new version even if `normalizedConfig` matches

## 5. Attach-on-register and configuration HTTP API (US-001, `local-project-registration` + `project-yaml-configuration`)

- [x] 5.1 Keep `POST /projects` eligibility presence-only from `w01-s01`; insert the `Project` first; never roll back the Project for later attach failures
- [x] 5.2 After insert, attempt configuration attach; on success return HTTP **201** `RegisterProjectResponse` with `configuration.status === 'attached'`, `version`, and matching `configurationVersionId`; on expected filesystem/size/parse/schema attach failures return **201** with `configuration.status === 'blocked'`, specific `code`, and `configurationVersionId === null` (no version row)
- [x] 5.3 Map unexpected attach Prisma/filesystem/infrastructure failures to HTTP **201** `configuration.status === 'blocked'` with `code` `configuration_attach_failed`, safe message, no partial snapshot, no pointer move; log internally without exposing stacks, YAML contents, or extra paths
- [x] 5.4 Expose `POST /projects/:id/configuration/refresh` (200 + version on success; **422** for expected blocked codes with no pointer move; **500** `configuration_refresh_failed` for unexpected infra) and `GET /projects/:id/configuration` (200 active version; **404** `project_not_found` vs `configuration_not_found`)
- [x] 5.5 Extend `GET /projects` and `GET /projects/:id` `ProjectDto` responses with `configurationVersionId`; keep pre-insert eligibility **422/409/500** behavior from `w01-s01` unchanged

## 6. Angular configuration outcomes (US-001/US-003, `angular-web-console-baseline`)

- [x] 6.1 Extend the Spanish-first registration surface to render `RegisterProjectResponse.configuration` (attached summary vs blocked reason/`code`) after every **201**; do not claim configuration success when status is `blocked`
- [x] 6.2 Add an explicit “Actualizar configuración” refresh action for a known project id when the list is non-empty, with empty/loading/success/blocked/error states for refresh **200/422/500**; do not build a discovery-health dashboard or theme-switcher product features

## 7. Automated tests and evidence (US-002, `application-test-baseline`)

- [x] 7.1 Add unit tests for parse success/failure, `project_yaml_too_large`, unsupported schemaVersion, invalid machine id, secret-exclude merge, invalid executor, exact-byte hashing (line-ending-only differences → different hashes / new versions), same-hash idempotency, fail-closed prior-pointer retention, and no updates to existing version rows; capture outputs under `evidence/success/` and `evidence/failure/` as applicable
- [x] 7.2 Add Testcontainers PostgreSQL API/integration tests: migrate deploy; register valid YAML → **201** attached with FK; register invalid/oversize YAML → **201** blocked with null FK and no version row; unexpected attach path → **201** `configuration_attach_failed`; refresh expected **422** and unexpected **500** `configuration_refresh_failed`; same-byte refresh idempotent; `GET` configuration 200/404 differentiated codes; confirm fixture repos are not modified by SpecPilot writes
- [x] 7.3 Add shared-contracts tests for attached/blocked/ambiguous `RegisterProjectResponse` unions and web tests for attach/refresh empty/loading/success/blocked-error states against mocked API responses
- [x] 7.4 Re-run existing registration, health/readiness, `AppMetadata`, web shell, and shared-contracts suites and confirm they still pass; capture combined results under `evidence/success/`
- [x] 7.5 Record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable) in `evidence/impact-statements.md`

## 8. Governance validators and inventory sync (US-002/US-003)

- [x] 8.1 Synchronize `docs/context/**` and regenerate `package-summary.json` as needed for the configuration tree; capture integrity-consistent results in evidence
- [x] 8.2 Document copyable operator commands for register attach success/blocked and configuration refresh success/blocked paths using hyphenated `/opsx-*` syntax where OpenSpec commands are referenced; capture in `evidence/operator-commands.md`
- [x] 8.3 Run `npm run quality-gates` and existing baseline/governance validators (including secret scan) on the clean tree; capture passing output in `evidence/success/quality-gates-pass.txt` and `evidence/success/validators.txt`; stop on any failure
- [x] 8.4 Confirm no committed operator home paths as fixture identities, no secret file contents ingested, no raw YAML persisted, no real `.env` secrets committed, and no target-repo mutation; capture in `evidence/secret-safety-check.txt`

## 9. Operator-visible outcomes (US-003)

- [x] 9.1 Obtain and record operator confirmation that configuration attach success and at least one blocked path (plus refresh behavior) work as documented in `evidence/human-validation.md`
- [x] 9.2 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record the confirmation in `evidence/no-deferred-ac.md`

## 10. Closure gates (US-003)

- [x] 10.1 Confirm that human validation, tests, governance validators, secret-safety checks, and the full local quality gate are all `PASS`; report the complete results to the operator and obtain one explicit authorization for the continuous stop-on-failure closure sequence: Verify → sync → post-sync validation → archive → final validation → commit → push

- [x] 10.2 With operator authorization, run OpenSpec Verify and require exactly `PASS`; capture the output in `evidence/verify.txt`; stop and remediate on any other result

- [x] 10.3 After Verify exactly `PASS`, sync the six capability specs (one new + five modified) to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence

- [x] 10.4 After sync, run `openspec validate --all --strict`, package-summary validation, delivery-graph validation, secret scan, baseline validation, and the full local quality gates; capture results and stop immediately on any failure

- [x] 10.5 Archive the change through the approved OpenSpec lifecycle; capture archive evidence and confirm no active changes remain

- [x] 10.6 After archive, run the complete final validation set, including OpenSpec validate/list, full local quality gates, package-summary, delivery-graph, secret scan, baseline, branch `main`, tracked/staged secret and `.env` checks, `git status`, and `git diff`; stop immediately on any failure

- [x] 10.7 Only after every final validation is `PASS`, create one final closure commit on `main` with a message coherent with this slice and push to `origin/main` when authorized; do not create an implementation commit before Verify/sync/archive and do not require a second routine follow-up commit

- [ ] 10.8 After push, treat GitHub Actions as independent post-push remote verification; report its result when available and correct immediately on `main` if it fails; temporary absence of the remote result does not invalidate completed local closure evidence
