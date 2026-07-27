## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w01`, slice `w01-s01-project-registration`, User Stories `001–003`, Cursor as implementer, dependencies on archived `w00` foundation, exclusions) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no `project.yaml` parse/schema/versioning or `ProjectConfigurationVersion` (`w01-s02`), no Git/OpenSpec discovery (`w01-s03`), no project dashboard / discovery-health UI (`w01-s04`), no target-repo writes or delivery command execution, no auth/multiuser, no DeepSeek product API, no reviews/findings/budget/prompts, and no later-wave scope; capture the check in `evidence/exclusions-check.txt`

## 2. Shared registration contracts (US-001, `shared-libraries-baseline`)

- [x] 2.1 Extend `packages/shared-contracts` with `RegisterProjectRequest`, `ProjectDto`, and `ProjectErrorResponse` (`{ code, message }`) plus minimal runtime validators/type guards; keep health contracts intact; do not add Zod unless a later approved change requires it
- [x] 2.2 Enforce `displayName` max length **120** in shared validators; cover success and invalid/blocked payload paths in shared-contracts tests; do not introduce a separate domain package or shared UI kit

## 3. Project persistence model (US-001, `postgresql-prisma-persistence-baseline`)

- [x] 3.1 Add Prisma `Project` model (id UUID, unique canonical `repositoryPath`, unique kebab-case `slug`, `displayName` length-bound to 120, `status`, `registeredAt`, nullable `lastInspectedAt`); retain `AppMetadata` unchanged; omit `ProjectConfigurationVersion` and all other product aggregates
- [x] 3.2 Generate the additive migration under `apps/api/prisma/migrations/` with PostgreSQL unique constraints on `repositoryPath` and `slug`; leave the migration files ready to be included in the single final closure commit; apply the migration with `prisma migrate deploy` for tests and evidence; do not create Git commits during implementation; do not edit a migration after it has been applied—any correction MUST be a new migration

## 4. Registration domain and HTTP API (US-001, `local-project-registration`)

- [x] 4.1 Implement filesystem preflight port/adapter (read-only `stat`/`access`/`realpath`): absolute-path checks, existence, realpath canonicalization, readable directory, `.specpilot/project.yaml` presence as regular file inside the canonical directory (no YAML parse), and no writes to the target repository
- [x] 4.2 Implement Projects application service: derive slug from canonical basename; apply `displayName` trim/default/max-120 rules; persist only the canonical realpath; treat symlink aliases to the same real directory as `duplicate_repository_path`; never store an alternate symlink identity
- [x] 4.3 Map blocked outcomes to HTTP **422** with exact codes (`empty_repository_path`, `relative_repository_path`, `repository_not_found`, `repository_not_directory`, `repository_not_readable`, `project_yaml_missing`, `project_yaml_not_regular_file`, `invalid_derived_slug`, `invalid_display_name`) and stable `{ code, message }` bodies; never insert a partial row
- [x] 4.4 Expose `POST /projects` (201 + `ProjectDto` on success), `GET /projects` (list for empty-state), and `GET /projects/:id` (200 or 404 `project_not_found`); map unexpected failures to safe HTTP **500** without stack traces, extra internal paths, or file contents
- [x] 4.5 Enforce D10 concurrency: keep unique constraints as the final guarantee; precheck may improve feedback but must not replace constraints; catch Prisma unique violations and map deterministically to HTTP **409** with `duplicate_repository_path` or `duplicate_project_slug`; never rely on check-then-insert alone
- [x] 4.6 Wire `ProjectsModule` (controller, service, Prisma adapter, filesystem adapter) into `AppModule` without breaking existing `/health` and `/health/ready` contracts

## 5. Angular registration flow (US-001/US-003, `angular-web-console-baseline`)

- [x] 5.1 Add a minimal Spanish-first registration surface in `apps/web` (PrimeNG-consistent) with path input and optional display name; call the projects API via the existing local environment base URL
- [x] 5.2 Implement explicit empty (including empty `GET /projects` list), loading, success (201 summary), and blocked/error (422/409/`project_not_found` message) outcomes; do not build a discovery-health dashboard or theme-switcher product features

## 6. Automated tests and evidence (US-002, `application-test-baseline`)

- [x] 6.1 Add unit tests (temp-dir / no Docker where practical) for empty/relative path, not found, not directory, not readable, missing YAML, YAML not regular file, invalid derived slug, `displayName` over 120, and symlink/alias → same realpath duplicate; capture outputs under `evidence/success/` and `evidence/failure/` as applicable
- [x] 6.2 Add Testcontainers PostgreSQL API/integration tests: migrate deploy; successful `POST /projects` against a temp repo with `.specpilot/project.yaml` (persisted path is realpath); at least one 422 blocked path with no row; unique-constraint → 409 mapping; confirm fixture repos are not modified by SpecPilot writes
- [x] 6.3 Add web tests for empty/loading/success/blocked-error registration states against mocked API responses
- [x] 6.4 Re-run existing health/readiness, `AppMetadata`, web shell, and shared-contracts suites and confirm they still pass; capture combined results under `evidence/success/`
- [x] 6.5 Record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable) in `evidence/impact-statements.md`

## 7. Governance validators and inventory sync (US-002/US-003)

- [x] 7.1 Synchronize `docs/context/**` and regenerate `package-summary.json` as needed for the registration tree; capture integrity-consistent results in evidence
- [x] 7.2 Document copyable operator commands for API/web registration success and blocked paths using hyphenated `/opsx-*` syntax where OpenSpec commands are referenced; capture in `evidence/operator-commands.md`
- [x] 7.3 Run `npm run quality-gates` and existing baseline/governance validators (including secret scan) on the clean tree; capture passing output in `evidence/success/quality-gates-pass.txt` and `evidence/success/validators.txt`; stop on any failure
- [x] 7.4 Confirm no committed operator home paths as fixture identities, no secret file contents ingested, no real `.env` secrets committed, and no target-repo mutation; capture in `evidence/secret-safety-check.txt`

## 8. Operator-visible outcomes (US-003)

- [x] 8.1 Obtain and record operator confirmation that registration success and at least one blocked path behave as documented in `evidence/human-validation.md`
- [x] 8.2 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record the confirmation in `evidence/no-deferred-ac.md`

## 9. Closure gates (US-003)

- [x] 9.1 Confirm that human validation, tests, governance validators, secret-safety checks, and the full local quality gate are all `PASS`; report the complete results to the operator and obtain one explicit authorization for the continuous stop-on-failure closure sequence: Verify → sync → post-sync validation → archive → final validation → commit → push

- [x] 9.2 With operator authorization, run OpenSpec Verify and require exactly `PASS`; capture the output in `evidence/verify.txt`; stop and remediate on any other result

- [x] 9.3 After Verify exactly `PASS`, sync the five capability specs (one new + four modified) to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence

- [x] 9.4 After sync, run `openspec validate --all --strict`, package-summary validation, delivery-graph validation, secret scan, baseline validation, and the full local quality gates; capture results and stop immediately on any failure

- [x] 9.5 Archive the change through the approved OpenSpec lifecycle; capture archive evidence and confirm no active changes remain

- [x] 9.6 After archive, run the complete final validation set, including OpenSpec validate/list, full local quality gates, package-summary, delivery-graph, secret scan, baseline, branch `main`, tracked/staged secret and `.env` checks, `git status`, and `git diff`; stop immediately on any failure

- [x] 9.7 Only after every final validation is `PASS`, create one final closure commit on `main` with a message coherent with this slice and push to `origin/main` when authorized; do not create an implementation commit before Verify/sync/archive and do not require a second routine follow-up commit

- [x] 9.8 After push, treat GitHub Actions as independent post-push remote verification; report its result when available and correct immediately on `main` if it fails; temporary absence of the remote result does not invalidate completed local closure evidence
