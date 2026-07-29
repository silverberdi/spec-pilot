## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w02`, slice `w02-s02-secret-detection-and-exclusion`, User Stories `001–003`, Cursor as implementer, dependencies on archived `w02-s01` + Wave 1 + Wave 0 foundation, exclusions) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no Prisma/DB migration, no `project.yaml` schema expansion, no immutable manifests/hashes/token estimates (`w02-s03`), no preview/approval (`w02-s04`), no DeepSeek product API calls, no delivery/Git-write/OpenSpec apply-verify-sync-archive controls, no auth/multiuser, no client-supplied path lists, no MIME/extension binary heuristics, no redacted file bodies, no weakening of SpecPilot repo CI secret scanning, and no later-wave scope; capture the check in `evidence/exclusions-check.txt`

## 2. Shared secret-scan contracts (US-001, `shared-libraries-baseline`)

- [x] 2.1 Extend `packages/shared-contracts` with `SecretScanRequest`, `SecretDetectorId`, `SecretFindingDto` (path + detectorId only), `UnscannablePathDto`, `SecretScanOkDto`, `SecretScanBlockedDto`, `SecretScanDto`, and closed scan blocked codes `unsafe_context_bundle` | `secret_scan_limit_exceeded` | `secret_scan_timeout` | `secret_scan_entry_unreadable` unioned with `ContextSourceResolveBlockedCode`; allow `secret_scan_failed` only on `ProjectErrorResponse` for HTTP 500; keep health, registration, configuration, discovery, dashboard, and resolve contracts intact; do not add Zod unless a later approved change requires it
- [x] 2.2 Add/update type guards to accept valid ok/blocked secret-scan shapes; require `candidatePathCount`/`findingCount`/`unscannableCount` iff `unsafe_context_bundle` and reject those counts on other blocked codes; reject findings with matched values/snippets/offsets/line numbers; reject unknown detector ids, unknown blocked codes (including `secret_scan_failed` in the 422 union), and ambiguous DTOs; cover acceptance and rejection paths in shared-contracts tests; do not introduce a separate domain package or shared UI kit

## 3. Detectors and safe reader (US-001, `secret-detection-and-exclusion`)

- [x] 3.1 Implement pure pattern detectors with exact binding regexes for `aws_access_key`, `generic_api_key_assignment`, `private_key_block`, `github_pat`, and `slack_token`; empty product allowlist; never return or log matched text/offsets/snippets/line numbers
- [x] 3.2 Implement `high_entropy_token` over `/[A-Za-z0-9+/=_-]{32,}/g` with Shannon entropy ≥ 4.5; stop entropy candidate processing after 20 positives per file while still running pattern detectors fully; dedupe findings to at most one `SecretFindingDto` per `(path, detectorId)`
- [x] 3.3 Implement TOCTOU-resistant reader: revalidate repository-relative path (reject absolute, leading `./`, `\`, `..`, NUL → `context_path_escape`); open with `O_RDONLY|O_NOFOLLOW` semantics; `fstat` same fd; require regular file; read from same fd; close in `finally`; map symlink/ELOOP/missing/non-regular/EACCES/EPERM/short read → `secret_scan_entry_unreadable` with no partial ok
- [x] 3.4 Implement classification: `fileSize` from open-fd `fstat`; `fileSize > 1048576` → `unscannable_content` without read/detectors and without counting toward `totalBytesRead`; NUL → unscannable; fatal UTF-8 (`TextDecoder` equivalent) → unscannable; empty file → clean scannable; no MIME/extension heuristics
- [x] 3.5 Enforce bounds: before reading eligible-size file if `totalBytesRead + fileSize > 52428800` → `secret_scan_limit_exceeded`; after read add exact bytes read; 30000 ms wall time excluding resolve with checks before open/after read/during detectors → `secret_scan_timeout`; no partial ok bodies

## 4. Secret-detection service and HTTP API (US-001, `local-project-registration` + `secret-detection-and-exclusion` + `context-source-resolution`)

- [x] 4.1 Implement `SecretDetectionService.scan(projectId, stage)` in `ProjectsModule`: always invoke `ContextSourceResolutionService.resolve` in-process; propagate resolve 404/422/500 outcomes without scanning; on resolve ok scan candidates only; apply exclusion/block policy per design D3; preserve resolve order in `eligiblePaths`; sort findings/unscannable per D6.1; no Prisma persistence of scan results
- [x] 4.2 Expose `POST /projects/:id/context-sources/secret-scan` with body `{ stage }`; map 404 `project_not_found`, 422 closed blocked codes (including `unsafe_context_bundle` with required safe counts only), and 500 `secret_scan_failed` with safe messages and no contents/match-text/stack/absolute-host leakage
- [x] 4.3 Confirm registration, configuration, discovery, dashboard, and resolve endpoints remain behaviorally unchanged and do not auto-run secret scan; confirm resolve still does not read candidate file bytes for scanning

## 5. Angular secret-scan outcomes (US-001/US-003, `angular-web-console-baseline`)

- [x] 5.1 Add a Spanish-first secret-scan surface with closed stage selector and explicit scan action distinct from resolve; show idle, loading, success (including empty `candidatePathCount === 0`), success-with-exclusions, and blocked/error states
- [x] 5.2 On success show stage, candidate/eligible counts, short hash prefix, finding/unscannable counts; display at most 200 eligible paths in server order and at most 50 findings as path + detectorId; on `unsafe_context_bundle` show message + three safe counts only; never show file contents or secret values; no pagination, preview, approval, or DeepSeek send actions

## 6. Automated tests and evidence (US-002, `application-test-baseline`)

- [x] 6.1 Add unit tests for detectors (each closed pattern + entropy + dedupe + no secret fields), classification (empty/oversize/NUL/invalid UTF-8), safe open/TOCTOU (path escape vs entry unreadable), limit accounting (oversize not in `totalBytesRead`; pre-read overflow; timeout), ordering, and exclusion/unsafe-block policy
- [x] 6.2 Add API/integration tests: clean success eligible equals candidates; planted closed-pattern secret → exclude or `unsafe_context_bundle` with counts only; empty candidates → 200; missing configuration → resolve-propagated 422; invalid stage → 422; unknown project → 404; mid-scan unreadable → 422; unexpected failure → 500 `secret_scan_failed` without leakage where practical; use temp-dir fixtures only (no tracked secret fixtures that weaken CI scanning)
- [x] 6.3 Add web tests for idle/loading/success/empty/exclusions/unsafe-counts/blocked; re-run existing registration, configuration, discovery, dashboard, resolve, health/readiness, `AppMetadata`, web shell, and shared-contracts suites and confirm they still pass; capture combined results under `evidence/success/`
- [x] 6.4 Record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable) in `evidence/impact-statements.md`

## 7. Governance validators and inventory sync (US-002/US-003)

- [x] 7.1 Synchronize `docs/context/**` and regenerate `package-summary.json` as needed for the secret-scan tree; capture integrity-consistent results in evidence
- [x] 7.2 Document copyable operator commands for secret-scan success/empty/blocked paths using hyphenated `/opsx-*` syntax where OpenSpec commands are referenced; capture in `evidence/operator-commands.md`
- [x] 7.3 Run `npm run quality-gates` and existing baseline/governance validators (including SpecPilot repo secret scan, unweakened) on the clean tree; capture passing output in `evidence/success/quality-gates-pass.txt` and `evidence/success/validators.txt`; stop on any failure
- [x] 7.4 Confirm no raw secrets returned/logged/persisted, no client path injection, closed detector/blocked codes only, no DB migration, and repo CI scanner unweakened; capture in `evidence/secret-safety-check.txt`

## 8. Operator-visible outcomes (US-003)

- [x] 8.1 Obtain and record operator confirmation that secret-scan clean success and at least one blocked unsafe/failure path work as documented in `evidence/human-validation.md`
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
