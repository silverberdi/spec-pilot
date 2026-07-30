## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w03`, slice `w03-s02-review-run-orchestration`, User Stories `001–003`, Cursor as implementer, dependencies on archived `w03-s01` + Wave 2 + Wave 1 + Wave 0 foundation, exclusions of `w03-s03`/`w03-s04` and later-wave scope) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no budget estimate/reserve/reconcile/hard-block, no findings ledger/prompt-history product surfaces, no Waves 4–7 stage-depth product logic, no `ReviewRun.transmissionId` scalar, no mutation of Wave 2 aggregates / no `contentTransmitted=true`, no client-supplied excerpts/prompts/schemas/messages, no silent latest-bundle substitution, no automatic bundle recreation, no worker/SSE/cancel endpoint requirement, no auth/multiuser, no target-repo writes or delivery/Git-write/OpenSpec apply-verify-sync-archive controls, no weakening of SpecPilot repo CI secret scanning, and no alternate providers; capture the check in `evidence/exclusions-check.txt`

## 2. Shared review-run contracts (US-001, `shared-libraries-baseline`)

- [x] 2.1 Extend `packages/shared-contracts` with review-run create request `{ stage: ReviewStage; contextBundleId: string; changeId?: string }`, lifecycle states, stage-valid verdict unions, transition DTOs, safe transmission metadata DTOs, list wrappers, and closed review-run error codes from the specs
- [x] 2.2 Add/update type guards for create validation (`changeId` rules, reject unknown fields), ok/list DTOs without excerpts/prompts/raw bodies, and ensure review-run codes are not collapsed into disclosure/bundle blocked unions; cover acceptance and rejection in shared-contracts tests; do not add Zod or a separate domain/UI package

## 3. Prisma migration and persistence shape (US-001, `postgresql-prisma-persistence-baseline`)

- [x] 3.1 Add additive Prisma models `ReviewRun`, append-only `ReviewRunTransition`, and append-only `ContextDisclosureTransmission` with UNIQUE `reviewRunId`, optional inverse `ReviewRun.transmission`, **no** `ReviewRun.transmissionId`, safe metadata-only transmission fields, and Project reverse relations/indexes
- [x] 3.2 Add PostgreSQL partial unique index on `review_runs(project_id)` WHERE state IN (`requested`, `preparing_context`, `budget_check`, `running`, `validating_response`); confirm no budget/finding/prompt-history/auth/user tables; capture migration evidence

## 4. Gateway generalization (US-001, `deepseek-api-gateway` + `nestjs-fastify-api-baseline`)

- [x] 4.1 Generalize `DeepseekGatewayPort` to return discriminated `DeepseekStructuredExecutionResult` (`status` ok|failed, `invocationBegan`, `attemptCount`, `latencyMs`, safe optional metadata only—no keys/excerpts/raw bodies/reasoning)
- [x] 4.2 Add outbound profile `review_run_orchestration` with `promptTemplateId`/`schemaId` `review-run-orchestration-v1`, `max_tokens` 1024, server-built bounded context items only; keep probe profile and public probe DTO/behavior unchanged via service mapping
- [x] 4.3 Ensure `invocationBegan=false`/`attemptCount=0` only before first outbound attempt (e.g. missing key); `invocationBegan=true`/`attemptCount>=1` once outbound starts; cover with gateway unit tests

## 5. Review-run orchestration module and state machine (US-001, `review-run-orchestration` + `nestjs-fastify-api-baseline`)

- [x] 5.1 Create Nest `ReviewRunsModule`/service consuming Prisma + `DEEPSEEK_GATEWAY_PORT`; implement atomic state+`ReviewRunTransition` writes, terminal immutability, success sequence `null→requested→preparing_context→budget_check→running→validating_response→completed`, and blocked/failed transition rules from design
- [x] 5.2 Implement create-time stale recovery (`staleRunTtlMs=180000`): non-stale → HTTP 409 `review_run_in_progress`; stale → atomic `failed` + transition `review_run_interrupted` then create new run; map partial-unique violations to 409
- [x] 5.3 Implement preparing-context pipeline: explicit bundle load/ownership/stage checks; disclosure coverage lookup distinguishing `review_disclosure_approval_required` vs `review_disclosure_policy_mismatch`; safe reread + `contentHash`; `extractExcerpt`; recompute `previewIntegrityHash`; bounded payload all-or-nothing; zero provider attempts and zero transmission on prereq/integrity/limit failures
- [x] 5.4 Implement `budget_check` with `budgetCheckStatus=not_enforced` only (no budget tables/codes/claims)
- [x] 5.5 Implement running/validating_response using gateway result mapping A/B/C: no transmission when `invocationBegan=false`; exactly one transmission when true; `provider_failed` vs `response_invalid` outcomes; completed requires schema/verdict/rationale + completed transmission; post-provider TX failure must not re-invoke DeepSeek

## 6. Review-run API surface (US-001, `local-project-registration` + `review-run-orchestration`)

- [x] 6.1 Expose `POST /projects/:id/review-runs` (sync create+execute; 201 for terminal completed/blocked/failed; 422 invalid without row; 409 conflict without new row; 404 unknown project; 500 only before row persistence failure)
- [x] 6.2 Expose `GET /projects/:id/review-runs/:runId` with transitions + optional safe transmission via inverse relation; `GET /projects/:id/review-runs?stage?&limit?` (default 20, max 50, newest first; empty `[]`; list may include `hasTransmission`/`transmissionOutcome` only)
- [x] 6.3 Confirm Wave 2 aggregates are never mutated, `contentTransmitted` stays false, no update/delete/cancel endpoints, and probe routes remain unchanged

## 7. Angular review-run outcomes (US-001/US-003, `angular-web-console-baseline`)

- [x] 7.1 Add Spanish-first review-run surface with stage, explicit `contextBundleId`, conditional `changeId`, **Iniciar revisión**, and idle/loading/success/blocked/empty/error states distinct from probe/disclosure
- [x] 7.2 Show safe metadata (run id, stage, change id, bundle id/hash, approval id, state, transitions, `budgetCheckStatus not_enforced`, model, schema, `promptTemplateId`, usage/latency, verdict/rationale, codes); never show excerpts/prompts/raw responses/reasoning/findings/remaining budget/delivery controls or API-key inputs

## 8. Compose and env (US-001, `docker-compose-local-runtime`)

- [x] 8.1 Confirm Compose continues to forward only `DEEPSEEK_API_KEY` for API (probe + review-run); no committed secrets; no operator `DEEPSEEK_BASE_URL`; never touch foreign containers such as `axioma-db-dev`

## 9. Automated tests and evidence (US-002, `application-test-baseline`)

- [x] 9.1 Add unit/integration coverage for create validation (`new` changeId rules; planning/applied/verify require valid changeId; reject unknown fields; no latest substitution; stage mismatch)
- [x] 9.2 Add coverage for approval missing vs policy mismatch; integrity mismatch before provider; bounds before provider; excerpts reaching fake gateway in exact order; transmission mapping (none / provider_failed / response_invalid / completed); unique `reviewRunId`; no `transmissionId`; inverse load; post-provider Prisma failure without second DeepSeek call
- [x] 9.3 Add coverage for transition atomicity/terminal immutability; partial-unique concurrency race; stale recovery after 180000 ms; non-stale 409; completed/blocked/failed retrievable without content/prompts/raw bodies; probe regression still green
- [x] 9.4 Add web tests for idle/loading/success/blocked/empty review-run outcomes; re-run shared-contracts, API, and web suites; capture combined results under `evidence/success/`
- [x] 9.5 Record impact statements (security/privacy, persistence, budget, migration, rollback—with explicit no-impact notes where applicable) in `evidence/impact-statements.md`

## 10. Governance validators and inventory sync (US-002/US-003)

- [x] 10.1 Synchronize `docs/context/**` and regenerate `package-summary.json` as needed for review-run orchestration; capture integrity-consistent results in evidence
- [x] 10.2 Document copyable operator commands for review-run success and blocked/failed paths (including key via gitignored env only) using hyphenated `/opsx-*` syntax where OpenSpec commands are referenced; capture in `evidence/operator-commands.md`
- [x] 10.3 Run `npm run quality-gates` and existing baseline/governance validators (including SpecPilot repo secret scan, unweakened) against the full active-change working state (implementation may still be uncommitted); confirm existing changes belong only to this active change, that there are no unexpected or unrelated files/changes, and that no secrets or `.env` values appear in tracked/staged files; do **not** require a clean `git status` before Verify/sync/archive/commit (a clean working tree is required only after the final closure commit and push); capture passing output in `evidence/success/quality-gates-pass.txt` and `evidence/success/validators.txt`; stop on any failure
- [x] 10.4 Confirm API key/excerpts/prompts/raw responses never appear in logs/DTOs/evidence/Prisma, Wave 2 rows remain unmutated, and repo CI scanner remains unweakened; capture in `evidence/secret-safety-check.txt`

## 11. Operator-visible outcomes (US-003)

- [x] 11.1 Obtain and record operator confirmation that a successful review-run path and at least one blocked/failure path work as documented in `evidence/human-validation.md`
- [x] 11.2 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record the confirmation in `evidence/no-deferred-ac.md`

## 12. Closure gates (US-003)

- [x] 12.1 Confirm that human validation, tests, governance validators, secret-safety checks, and the full local quality gate are all `PASS`; report the complete results to the operator and obtain **one** explicit authorization covering the entire continuous stop-on-failure closure sequence: Verify → sync → post-sync validation → archive → final validation → commit → push (including approval of the protected publish prompt to `origin/main` as part of this same continuous authorization)
- [x] 12.2 With operator authorization, run OpenSpec Verify and require exactly `PASS`; capture the output in `evidence/verify.txt`; stop and remediate on any other result
- [x] 12.3 After Verify exactly `PASS`, sync the eleven capability specs (one new + ten modified) to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence
- [x] 12.4 After sync, run `openspec validate --all --strict`, package-summary validation, delivery-graph validation, secret scan, baseline validation, and the full local quality gates; capture results and stop immediately on any failure
- [x] 12.5 Archive the change through the approved OpenSpec lifecycle; capture archive evidence and confirm no active changes remain
- [x] 12.6 After archive, run the complete final validation set, including OpenSpec validate/list, full local quality gates, package-summary, delivery-graph, secret scan, baseline, branch `main`, tracked/staged secret and `.env` checks, `git status`, and `git diff`; stop immediately on any failure
- [x] 12.7 Only after every final validation is `PASS`, create **one** final closure commit on `main` with a message coherent with this slice and push to `origin/main`; the single authorization obtained in 12.1 covers both commit and push—do **not** request a second routine authorization before commit or before push; stop only for a real failure, scope change, destructive operation, secret/license issue, or risk to foreign resources; the protected publish prompt to `origin/main` is approved as part of the continuous 12.1 authorization; do not create an implementation commit before Verify/sync/archive and do not require a second routine follow-up commit
- [ ] 12.8 After push, treat GitHub Actions as independent post-push remote verification; report its result when available and correct immediately on `main` if it fails; temporary absence of the remote result does not invalidate completed local closure evidence
