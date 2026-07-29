## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w02`, slice `w02-s03-context-bundle-manifest`, User Stories `001–003`, Cursor as implementer, dependencies on archived `w02-s01` + `w02-s02` + Wave 1 + Wave 0 foundation, exclusions) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no content preview/approval (`w02-s04`), no DeepSeek product API calls, no budget reservation, no review runs, no delivery/Git-write/OpenSpec apply-verify-sync-archive controls, no auth/multiuser, no client-supplied paths/hashes/ranges/content, no `contentTransmitted` field, no update/delete product endpoints for bundles, no weakening of SpecPilot repo CI secret scanning, and no later-wave scope; capture the check in `evidence/exclusions-check.txt`

## 2. Shared same-bytes pipeline refactor (US-001, `secret-detection-and-exclusion`)

- [x] 2.1 Refactor secret-scan internals into a shared same-bytes scanning engine (resolve → open/read once → classify → detect) that can optionally expose ephemeral clean-file material to trusted in-process consumers; keep public `POST .../secret-scan` HTTP behavior unchanged (no clean bytes, hashes, line ranges, or tokens in responses)
- [x] 2.2 Preserve exact oversize semantics in the shared engine: `fileSize > 1048576` → `unscannable_content`, no read, no detectors, no clean bytes, no `totalBytesRead` increment; preserve limit/timeout/unreadable/`unsafe_context_bundle` codes as `SecretScanBlockedCode`
- [x] 2.3 Add/keep regression coverage proving public secret-scan still returns clean eligible paths, exclusions, and blocked outcomes without building or persisting manifests

## 3. Shared context-bundle contracts (US-001, `shared-libraries-baseline`)

- [x] 3.1 Extend `packages/shared-contracts` with create request `{ stage }`, `ContextBundleLineRangeDto`, `ContextBundleEntryDto`, `ContextBundleExclusionDto`, `ContextBundleOkDto` (`manifestSchemaVersion` `1`, `selectionPolicyId` `full-file-lines-v1`, `tokenEstimatorId` `unicode-codepoints-div-4-v1`, no `contentTransmitted`), `ContextBundleBlockedDto`, `ContextBundleDto`, latest list wrapper, and `ContextBundleBlockedCode` exactly equal to `SecretScanBlockedCode`; allow `context_bundle_failed`, `context_bundle_not_found`, and `invalid_context_bundle_query` on `ProjectErrorResponse` (or query-error contract) only—not in the blocked union
- [x] 3.2 Add/update type guards to accept valid ok/blocked/latest shapes; require unsafe counts iff `unsafe_context_bundle`; reject removed codes `context_bundle_limit_exceeded`, `context_bundle_timeout`, and `context_bundle_entry_unreadable`; reject `contentTransmitted`, file bodies, and decoded text on ok DTOs; cover acceptance and rejection in shared-contracts tests; do not add Zod or a separate domain/UI package

## 4. Prisma ContextBundle model (US-001, `postgresql-prisma-persistence-baseline`)

- [x] 4.1 Add immutable append-only `ContextBundle` Prisma model with algorithm identity fields, `manifestHash`, counts, safe JSON `entries`/`exclusions`, `createdAt`, `configurationVersionId` string without FK, index on `(projectId, stage, createdAt)`, no unique constraint on `manifestHash`, and no `contentTransmitted` column
- [x] 4.2 Wire `Project.contextBundles` reverse relation with cascade delete; generate and commit the additive migration; confirm no review/finding/budget/prompt/auth/user/disclosure-audit tables are introduced

## 5. Manifest helpers and ContextBundleService (US-001, `context-bundle-manifest`)

- [x] 5.1 Implement pure helpers for SHA-256 hex over explicit bytes, full-file line ranges (`full-file-lines-v1`), Unicode code-point token estimates (`unicode-codepoints-div-4-v1`), and full canonical `manifestHash` with binding key order including exclusions and counts (excluding `id`/`createdAt`)
- [x] 5.2 Implement `ContextBundleService.create/get/latest` in `ProjectsModule`: call shared engine with clean-byte material; never reopen paths; build full safe manifest in memory; insert one complete row in a single Prisma transaction only after success; map construction exceptions and Prisma/infra failures exclusively to HTTP 500 `context_bundle_failed` with zero rows
- [x] 5.3 Enforce create outcomes: empty candidates → 201 empty bundle; oversize+clean → 201 with exclusion + entry; all excluded → propagate 422 `unsafe_context_bundle` counts-only with zero rows; propagate shared-pipeline blocked codes unchanged

## 6. HTTP API surface (US-001, `local-project-registration` + `context-bundle-manifest` + `context-source-resolution`)

- [x] 6.1 Expose `POST /projects/:id/context-bundles` (201 ok / 422 blocked / 500 `context_bundle_failed`), `GET /projects/:id/context-bundles/:bundleId` (200 / 404 `context_bundle_not_found`), and `GET /projects/:id/context-bundles?stage=&limit=1` (200 list; invalid query → 422 `invalid_context_bundle_query` not blocked-union); no update/delete routes
- [x] 6.2 Confirm registration, configuration, discovery, dashboard, resolve, and public secret-scan endpoints remain behaviorally unchanged and do not auto-create bundles; confirm resolve still does not read candidate file bytes itself

## 7. Angular context-bundle outcomes (US-001/US-003, `angular-web-console-baseline`)

- [x] 7.1 Add a Spanish-first context-bundle surface with closed stage selector and explicit create action distinct from resolve and secret-scan; optional load-latest via GET `limit=1`; show idle, loading, success (including empty), and blocked/error states
- [x] 7.2 On success show stage, `entryCount`, `totalTokenEstimate`, short hash prefixes, algorithm ids, exclusion counts; display at most 200 entries with path, short contentHash, tokenEstimate, and line-range summary; on `unsafe_context_bundle` show message + three safe counts only; never show file contents, secrets, approval, DeepSeek send, or transmission flags

## 8. Automated tests and evidence (US-002, `application-test-baseline`)

- [x] 8.1 Add unit tests for hashing, line ranges, Unicode token estimates, canonical `manifestHash` matrix (stable identical material; changed exclusion; changed policy/estimator id; entry order; id/createdAt excluded), and same-bytes single-open spies (one open/read; same byte object across detect/hash/line/token; mutation-after-read does not reread; no raw bytes in DTO/DB)
- [x] 8.2 Add API/integration tests: clean → 201 persisted; empty → 201; oversize+clean → 201 exclusion+entry; sole oversize → 422 unsafe counts-only no row; limit overflow → `secret_scan_limit_exceeded` no row; timeout → `secret_scan_timeout` no row; injected construction failure → 500 `context_bundle_failed` no row; Prisma failure → 500 no partial row; GET/latest; invalid latest query; recreate identical material → new UUID same `manifestHash`; public secret-scan regression green; use temp-dir fixtures only
- [x] 8.3 Add web tests for idle/loading/success/empty/unsafe-counts/blocked; re-run existing registration, configuration, discovery, dashboard, resolve, secret-scan, health/readiness, `AppMetadata`, web shell, and shared-contracts suites and confirm they still pass; capture combined results under `evidence/success/`
- [x] 8.4 Record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable) in `evidence/impact-statements.md`

## 9. Governance validators and inventory sync (US-002/US-003)

- [x] 9.1 Synchronize `docs/context/**` and regenerate `package-summary.json` as needed for the context-bundle tree; capture integrity-consistent results in evidence
- [x] 9.2 Document copyable operator commands for context-bundle success/empty/blocked paths using hyphenated `/opsx-*` syntax where OpenSpec commands are referenced; capture in `evidence/operator-commands.md`
- [x] 9.3 Run `npm run quality-gates` and existing baseline/governance validators (including SpecPilot repo secret scan, unweakened) on the clean tree; capture passing output in `evidence/success/quality-gates-pass.txt` and `evidence/success/validators.txt`; stop on any failure
- [x] 9.4 Confirm no raw secrets/bytes returned/logged/persisted, same-bytes invariant held, no `contentTransmitted`, closed blocked codes only (`ContextBundleBlockedCode` = `SecretScanBlockedCode`), append-only create/get/latest only, and repo CI scanner unweakened; capture in `evidence/secret-safety-check.txt`

## 10. Operator-visible outcomes (US-003)

- [x] 10.1 Obtain and record operator confirmation that context-bundle clean success (hashes + token estimate + algorithm ids) and at least one blocked/failure path work as documented in `evidence/human-validation.md`
- [x] 10.2 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record the confirmation in `evidence/no-deferred-ac.md`

## 11. Closure gates (US-003)

- [x] 11.1 Confirm that human validation, tests, governance validators, secret-safety checks, and the full local quality gate are all `PASS`; report the complete results to the operator and obtain one explicit authorization for the continuous stop-on-failure closure sequence: Verify → sync → post-sync validation → archive → final validation → commit → push
- [x] 11.2 With operator authorization, run OpenSpec Verify and require exactly `PASS`; capture the output in `evidence/verify.txt`; stop and remediate on any other result
- [x] 11.3 After Verify exactly `PASS`, sync the eight capability specs (one new + seven modified) to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence
- [x] 11.4 After sync, run `openspec validate --all --strict`, package-summary validation, delivery-graph validation, secret scan, baseline validation, and the full local quality gates; capture results and stop immediately on any failure
- [x] 11.5 Archive the change through the approved OpenSpec lifecycle; capture archive evidence and confirm no active changes remain
- [x] 11.6 After archive, run the complete final validation set, including OpenSpec validate/list, full local quality gates, package-summary, delivery-graph, secret scan, baseline, branch `main`, tracked/staged secret and `.env` checks, `git status`, and `git diff`; stop immediately on any failure
- [x] 11.7 Only after every final validation is `PASS`, create one final closure commit on `main` with a message coherent with this slice and push to `origin/main` when authorized; do not create an implementation commit before Verify/sync/archive and do not require a second routine follow-up commit
- [x] 11.8 After push, treat GitHub Actions as independent post-push remote verification; report its result when available and correct immediately on `main` if it fails; temporary absence of the remote result does not invalidate completed local closure evidence
