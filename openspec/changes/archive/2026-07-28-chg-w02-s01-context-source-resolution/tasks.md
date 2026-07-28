## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w02`, slice `w02-s01-context-source-resolution`, User Stories `001–003`, Cursor as implementer, dependencies on archived Wave 1 + Wave 0 foundation, exclusions) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no Prisma/DB migration, no per-stage `project.yaml` schema expansion, no secret-content scanning (`w02-s02`), no immutable manifests/hashes/token estimates (`w02-s03`), no preview/approval (`w02-s04`), no candidate file-byte reads, no DeepSeek product API calls, no delivery/Git-write/OpenSpec apply-verify-sync-archive controls, no auth/multiuser, no Git submodule detection subprocesses, no API pagination/per-path follow-up endpoints, and no later-wave scope; capture the check in `evidence/exclusions-check.txt`

## 2. Shared resolve contracts (US-001, `shared-libraries-baseline`)

- [x] 2.1 Extend `packages/shared-contracts` with `ReviewStage`, `ContextSourceResolveRequest`, `ContextSourceResolveOkDto`, `ContextSourceResolveBlockedDto`, `ContextSourceResolveDto`, and closed `ContextSourceResolveBlockedCode` exactly as design D6 (without `context_resolve_failed`); allow `context_resolve_failed` only on `ProjectErrorResponse` for HTTP 500; keep health, registration, configuration, discovery, and dashboard contracts intact; do not add Zod unless a later approved change requires it
- [x] 2.2 Add/update type guards to accept valid ok/blocked resolve shapes and reject unknown stages, unknown blocked codes (including `context_resolve_failed` in the 422 union), and ambiguous resolve DTOs; cover acceptance and rejection paths in shared-contracts tests; do not introduce a separate domain package or shared UI kit

## 3. Walker matcher and effective excludes (US-001, `context-source-resolution`)

- [x] 3.1 Pin `picomatch` (and types if required) at the API/workspace dependency set with binding options conceptually equivalent to `{ dot: true, nocase: false, nonegate: true }`; regenerate `package-summary.json`
- [x] 3.2 Implement pure pattern validation rejecting empty-after-trim, NUL, absolute, backslash, `..` segment, and uncompilable patterns as `invalid_context_patterns`
- [x] 3.3 Implement effective exclude union: snapshot excludes in stored order, then append missing mandatory patterns `**/.env`, `**/.env.*`, `**/*.pem`, `**/*.key`, `**/secrets/**` without mutating persisted `normalizedConfig`
- [x] 3.4 Implement `lstat`-based walk: out-of-tree symlink → `context_path_escape` (no partial results); in-tree symlink omit (no follow, no candidate); omit `.git` segment entries but count them; only regular files may match; nested regular directories walked without Git commands; never read candidate file bytes
- [x] 3.5 Enforce bounds: 100000 visited entries, 20000 matched files, 4194304 combined UTF-8 path bytes, 15000 ms wall time; on exceed return the closed limit/timeout code with no truncated success list; sort paths with exact JS `a < b`

## 4. Resolve service and HTTP API (US-001, `local-project-registration` + `context-source-resolution`)

- [x] 4.1 Implement `ContextSourceResolutionService.resolve(projectId, stage)` in `ProjectsModule`: require active configuration; validate stage; build effective excludes; walk/match; return ok or blocked outcomes per design D3–D7; no Prisma persistence of resolve results
- [x] 4.2 Expose `POST /projects/:id/context-sources/resolve` with body `{ stage }`; map 404 `project_not_found`, 422 closed blocked codes (including `context_entry_unreadable` for EACCES/EPERM), and 500 `context_resolve_failed` with safe messages and no path/stack/pattern/absolute-host leakage
- [x] 4.3 Confirm registration, configuration, discovery, and dashboard endpoints remain behaviorally unchanged and do not auto-run resolve

## 5. Angular resolve outcomes (US-001/US-003, `angular-web-console-baseline`)

- [x] 5.1 Add a Spanish-first context-source resolve surface with closed stage selector and explicit resolve action for the selected project; show idle, loading, success (including empty `pathCount === 0`), and blocked/error states
- [x] 5.2 Keep full `paths` from the API response in memory; display at most the first 200 paths in server order; when `pathCount > 200` show copy equivalent to `Mostrando 200 de N rutas`; show stage, path count, and short configuration hash prefix; do not add pagination, extra endpoints, content reading, per-path calls, preview/approval, or delivery controls

## 6. Automated tests and evidence (US-002, `application-test-baseline`)

- [x] 6.1 Add unit tests for matcher/walker covering include hit, exclude wins, dotfiles, case sensitivity, leading `!` not negation, invalid patterns, out-of-tree/in-tree symlinks, `.git` omit-but-count, nested repo without Git commands, mandatory exclude when snapshot omits one, visit/match/UTF-8/time bounds without truncation, and no file-content reads (spy)
- [x] 6.2 Add API/integration tests: success with expected fixture paths; empty success; missing configuration → 422 `configuration_not_found`; invalid stage → 422; unknown project → 404; hard repo path → 422; symlink escape → 422; unreadable entry → 422 where practical; unexpected failure → 500 `context_resolve_failed` without leakage where practical
- [x] 6.3 Add web tests for idle/loading/success/empty/blocked and the 200-path display-cap copy; re-run existing registration, configuration, discovery, dashboard, health/readiness, `AppMetadata`, web shell, and shared-contracts suites and confirm they still pass; capture combined results under `evidence/success/`
- [x] 6.4 Record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable) in `evidence/impact-statements.md`

## 7. Governance validators and inventory sync (US-002/US-003)

- [x] 7.1 Synchronize `docs/context/**` and regenerate `package-summary.json` as needed for the resolve tree; capture integrity-consistent results in evidence
- [x] 7.2 Document copyable operator commands for resolve success/empty/blocked paths using hyphenated `/opsx-*` syntax where OpenSpec commands are referenced; capture in `evidence/operator-commands.md`
- [x] 7.3 Run `npm run quality-gates` and existing baseline/governance validators (including secret scan) on the clean tree; capture passing output in `evidence/success/quality-gates-pass.txt` and `evidence/success/validators.txt`; stop on any failure
- [x] 7.4 Confirm no candidate file contents ingested, no real `.env` secrets committed, no delivery controls, closed stage/blocked codes only, and no DB migration introduced; capture in `evidence/secret-safety-check.txt`

## 8. Operator-visible outcomes (US-003)

- [x] 8.1 Obtain and record operator confirmation that resolve success for a valid registered project and at least one empty or blocked path work as documented in `evidence/human-validation.md`
- [x] 8.2 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record the confirmation in `evidence/no-deferred-ac.md`

## 9. Closure gates (US-003)

- [x] 9.1 Confirm that human validation, tests, governance validators, secret-safety checks, and the full local quality gate are all `PASS`; report the complete results to the operator and obtain one explicit authorization for the continuous stop-on-failure closure sequence: Verify → sync → post-sync validation → archive → final validation → commit → push
- [x] 9.2 With operator authorization, run OpenSpec Verify and require exactly `PASS`; capture the output in `evidence/verify.txt`; stop and remediate on any other result
- [x] 9.3 After Verify exactly `PASS`, sync the six capability specs (one new + five modified) to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence
- [x] 9.4 After sync, run `openspec validate --all --strict`, package-summary validation, delivery-graph validation, secret scan, baseline validation, and the full local quality gates; capture results and stop immediately on any failure
- [x] 9.5 Archive the change through the approved OpenSpec lifecycle; capture archive evidence and confirm no active changes remain
- [x] 9.6 After archive, run the complete final validation set, including OpenSpec validate/list, full local quality gates, package-summary, delivery-graph, secret scan, baseline, branch `main`, tracked/staged secret and `.env` checks, `git status`, and `git diff`; stop immediately on any failure
- [x] 9.7 Only after every final validation is `PASS`, create one final closure commit on `main` with a message coherent with this slice and push to `origin/main` when authorized; do not create an implementation commit before Verify/sync/archive and do not require a second routine follow-up commit
- [ ] 9.8 After push, treat GitHub Actions as independent post-push remote verification; report its result when available and correct immediately on `main` if it fails; temporary absence of the remote result does not invalidate completed local closure evidence
