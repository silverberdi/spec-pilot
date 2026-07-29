## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w02`, slice `w02-s04-context-preview-and-approval`, User Stories `001–003`, Cursor as implementer, dependencies on archived `w02-s01` + `w02-s02` + `w02-s03` + Wave 1 + Wave 0 foundation, exclusions) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no DeepSeek product API calls or provider transmission, no `contentTransmitted: true`, no review runs/budget/prompts, no mutation of `ContextBundle`, no update/delete product endpoints for bundles/preview sessions/approvals, no client-supplied excerpts/paths/ranges/file bodies, no auth/multiuser, no delivery/Git-write/OpenSpec apply-verify-sync-archive controls, no weakening of SpecPilot repo CI secret scanning, and no later-wave scope; capture the check in `evidence/exclusions-check.txt`

## 2. Shared disclosure contracts (US-001, `shared-libraries-baseline`)

- [x] 2.1 Extend `packages/shared-contracts` with preview ok DTO (`previewSessionId`, `previewPolicyId` `bounded-selected-text-v1`, `approvalPolicyId` `explicit-disclosure-approval-v1`, `previewIntegrityHash`, `createdAt`, `expiresAt`, ephemeral excerpt items), approval request exactly `{ previewSessionId; manifestHash; decision: 'approved' }`, approval ok DTO (both policy ids, `previewIntegrityHash`, `previewSessionId`, `contentTransmitted` literal `false`), disclosure status ok DTO, latest approval list wrapper, and closed disclosure error codes on `ProjectErrorResponse`
- [x] 2.2 Add/update type guards to accept valid preview/approval/status/latest shapes; require approval `contentTransmitted === false`; reject `contentTransmitted` on bundle ok and preview-session identity fields; reject approval requests missing `previewSessionId`; reject `contentTransmitted: true`; cover acceptance and rejection in shared-contracts tests; do not add Zod or a separate domain/UI package

## 3. Prisma preview session and approval models (US-001, `postgresql-prisma-persistence-baseline`)

- [x] 3.1 Add append-only `ContextDisclosurePreviewSession` with metadata-only fields (`previewPolicyId`, `previewIntegrityHash`, `itemCount`, `previewedCodePointCount`, `expiresAt = createdAt + 15m`, identity fields copied from bundle); no excerpts/bodies/decoded text/raw bytes columns; FK to `Project` and `ContextBundle`; index on `(projectId, contextBundleId, createdAt)`
- [x] 3.2 Add append-only `ContextDisclosureApproval` with FK `previewSessionId` → preview session (Restrict), FKs to `Project`/`ContextBundle`, both policy ids, `previewIntegrityHash`, `decision` `approved`, `contentTransmitted` literal-false snapshot, indexes for latest-by-stage and `previewSessionId`; no unique constraint; no mutation of `ContextBundle` columns; generate and commit the additive migration; confirm no review/finding/budget/prompt/auth/user tables

## 4. Canonical extract and integrity helpers (US-001, `context-preview-and-approval`)

- [x] 4.1 Implement pure helpers for fatal UTF-8 decode (no CRLF→LF normalization), full-file exact decoded-text excerpt, multi-range ascending non-overlapping extraction with single `'\n'` separators between non-contiguous ranges, and rejection of invalid/overlapping/out-of-bounds ranges as integrity mismatch
- [x] 4.2 Implement canonical `previewIntegrityHash` (SHA-256 lowercase hex over compact JSON with binding key order; per-item `excerptHash` over exact UTF-8 excerpt bytes; exclude `createdAt`/`expiresAt`/`previewSessionId`) plus coverage fingerprint comparison including both policy ids

## 5. ContextDisclosureService (US-001, `context-preview-and-approval`)

- [x] 5.1 Implement preview: load bundle; verify each entry `contentHash`; build canonical excerpts within bounds; compute integrity hash; insert session only after full success; return ephemeral items + session identity; create no session on any failure; empty bundles still create empty sessions
- [x] 5.2 Implement approve with mandatory check order: required session → expired → decision → `disclosure_manifest_mismatch` → binding mismatch → policy mismatch → full integrity re-check + hash equality → insert approval; create no approval row on any failure; never mutate bundle or preview session
- [x] 5.3 Implement disclosure-status (`approvalRequired` via covering fingerprint) and latest approvals (`stage` + `limit=1`); map 500s to `disclosure_preview_failed` / `disclosure_approval_failed` with zero rows on unexpected failures

## 6. HTTP API surface (US-001, `local-project-registration` + `context-preview-and-approval`)

- [x] 6.1 Expose `POST .../context-bundles/:bundleId/preview`, `POST .../context-bundles/:bundleId/disclosure-approvals`, `GET .../context-bundles/:bundleId/disclosure-status`, and `GET .../disclosure-approvals?stage=&limit=1`; no update/delete routes; reject client excerpts/paths/ranges/bodies and non-binding hashes other than `manifestHash`
- [x] 6.2 Confirm registration, configuration, discovery, dashboard, resolve, secret-scan, and context-bundle create/get/latest remain behaviorally unchanged and do not auto-preview or auto-approve; confirm bundle DTOs still forbid `contentTransmitted`

## 7. Angular disclosure outcomes (US-001/US-003, `angular-web-console-baseline`)

- [x] 7.1 Add a Spanish-first disclosure surface with explicit vista previa and aprobar divulgación actions distinct from resolve, secret-scan, and create manifesto; show idle, loading, success (including empty), and blocked/error states; optional status/latest load
- [x] 7.2 On preview success show both policy ids, session/expiry/integrity prefixes, `approvalRequired`, and at most 20 excerpts (`Mostrando 20 de N entradas` when capped); on approval success show both policy ids and `contentTransmitted: no`; copy MUST state approval does not send to DeepSeek and preview expires in 15 minutes; no DeepSeek send controls

## 8. Automated tests and evidence (US-002, `application-test-baseline`)

- [x] 8.1 Add unit tests for canonical extraction (CRLF full-file fidelity, multi-range separators, invalid ranges), `previewIntegrityHash` stability/sensitivity, coverage fingerprint including policy ids, and bounds fail-closed behavior
- [x] 8.2 Add API/integration tests for the binding matrix: preview→approve success; missing `previewSessionId` → `disclosure_preview_required`; expired → `disclosure_preview_expired`; foreign session → binding/required; policy mismatch; mutate-after-preview → integrity mismatch no approval; unchanged success; coverage invalidation on policy id change; failed preview creates no session; failed approval creates no row; session DB has no excerpt/body; bundle immutable; use temp-dir fixtures only
- [x] 8.3 Add web tests for idle/loading/success/empty/blocked disclosure outcomes with both policy ids and 20-entry cap; re-run existing registration, configuration, discovery, dashboard, resolve, secret-scan, context-bundle, health/readiness, `AppMetadata`, web shell, and shared-contracts suites and confirm they still pass; capture combined results under `evidence/success/`
- [x] 8.4 Record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable) in `evidence/impact-statements.md`

## 9. Governance validators and inventory sync (US-002/US-003)

- [x] 9.1 Synchronize `docs/context/**` and regenerate `package-summary.json` as needed for disclosure preview/approval; capture integrity-consistent results in evidence
- [x] 9.2 Document copyable operator commands for preview→approve success and blocked paths using hyphenated `/opsx-*` syntax where OpenSpec commands are referenced; capture in `evidence/operator-commands.md`
- [x] 9.3 Run `npm run quality-gates` and existing baseline/governance validators (including SpecPilot repo secret scan, unweakened) on the clean tree; capture passing output in `evidence/success/quality-gates-pass.txt` and `evidence/success/validators.txt`; stop on any failure
- [x] 9.4 Confirm no raw secrets/bytes persisted on sessions/approvals, mandatory preview→approval binding held, `contentTransmitted` only as literal false on approvals, `ContextBundle` immutable, and repo CI scanner unweakened; capture in `evidence/secret-safety-check.txt`

## 10. Operator-visible outcomes (US-003)

- [x] 10.1 Obtain and record operator confirmation that preview→approve success (session + policy ids + excerpts, then approval with `contentTransmitted: no`) and at least one blocked/failure path work as documented in `evidence/human-validation.md`
- [x] 10.2 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record the confirmation in `evidence/no-deferred-ac.md`

## 11. Closure gates (US-003)

- [x] 11.1 Confirm that human validation, tests, governance validators, secret-safety checks, and the full local quality gate are all `PASS`; report the complete results to the operator and obtain one explicit authorization for the continuous stop-on-failure closure sequence: Verify → sync → post-sync validation → archive → final validation → commit → push
- [x] 11.2 With operator authorization, run OpenSpec Verify and require exactly `PASS`; capture the output in `evidence/verify.txt`; stop and remediate on any other result
- [x] 11.3 After Verify exactly `PASS`, sync the seven capability specs (one new + six modified) to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence
- [x] 11.4 After sync, run `openspec validate --all --strict`, package-summary validation, delivery-graph validation, secret scan, baseline validation, and the full local quality gates; capture results and stop immediately on any failure
- [x] 11.5 Archive the change through the approved OpenSpec lifecycle; capture archive evidence and confirm no active changes remain
- [x] 11.6 After archive, run the complete final validation set, including OpenSpec validate/list, full local quality gates, package-summary, delivery-graph, secret scan, baseline, branch `main`, tracked/staged secret and `.env` checks, `git status`, and `git diff`; stop immediately on any failure
- [x] 11.7 Only after every final validation is `PASS`, create one final closure commit on `main` with a message coherent with this slice and push to `origin/main` when authorized; do not create an implementation commit before Verify/sync/archive and do not require a second routine follow-up commit
- [x] 11.8 After push, treat GitHub Actions as independent post-push remote verification; report its result when available and correct immediately on `main` if it fails; temporary absence of the remote result does not invalidate completed local closure evidence
