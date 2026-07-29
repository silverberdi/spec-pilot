## 1. Binding and scope evidence (US-001)

- [x] 1.1 Record the change binding (wave `w03`, slice `w03-s01-deepseek-api-gateway`, User Stories `001–003`, Cursor as implementer, dependencies on archived Wave 2 + Wave 1 + Wave 0 foundation, exclusions of `w03-s02`/`w03-s03`/`w03-s04` and later-wave scope) in `evidence/binding.md`, traceable to proposal, design, and specs
- [x] 1.2 Verify the change scope contains no review-run orchestration, no budget reserve/reconcile/hard-block, no findings/prompts/history product surfaces, no provider-call Prisma migration, no `DEEPSEEK_BASE_URL` operator config, no `ReviewStage`/`new` on probe, no client prompts/keys/base URL/tools/messages, no repository/bundle/disclosure reads on probe, no auth/multiuser, no target-repo writes or delivery/Git-write/OpenSpec apply-verify-sync-archive controls, no weakening of SpecPilot repo CI secret scanning, and no alternate providers; capture the check in `evidence/exclusions-check.txt`

## 2. Shared DeepSeek contracts (US-001, `shared-libraries-baseline`)

- [x] 2.1 Extend `packages/shared-contracts` with closed `DeepseekProbeStage` (`discovery` | `planning` | `applied` | `verify`), probe request `{ stage?: DeepseekProbeStage }`, probe ok DTO (`attemptCount` 1..3, `providerHttpStatus` 200, optional safe `providerRequestId`, total `latencyMs`, `schemaId` `deepseek-gateway-probe-v1`, `parsed` exact local schema), and closed DeepSeek error codes on `ProjectErrorResponse`
- [x] 2.2 Add/update type guards to accept valid probe ok shapes; reject `stage` `new` and unknown stages; reject missing `attemptCount`/`providerHttpStatus`; reject invalid `parsed`; ensure DeepSeek codes are not members of context-bundle/disclosure blocked unions; cover acceptance and rejection in shared-contracts tests; do not add Zod or a separate domain/UI package

## 3. Persistence non-goals confirmation (US-001, `postgresql-prisma-persistence-baseline`)

- [x] 3.1 Confirm Prisma schema/migrations gain **no** provider-call, DeepSeek audit, review-run, budget, finding, prompt, auth, or user tables for this slice; capture the confirmation in evidence (no additive migration)

## 4. DeepSeek gateway port, catalog, and helpers (US-001, `deepseek-api-gateway` + `nestjs-fastify-api-baseline`)

- [x] 4.1 Implement `DeepseekGatewayPort` + Nest `DeepseekModule` in `apps/api` with production HTTP adapter fixed to `https://api.deepseek.com/chat/completions`, test fake via DI, optional test-only injected URL never sourced from yaml/DTOs/Angular/Compose, and `AbortController` per attempt
- [x] 4.2 Implement model catalog/alias resolution (`deepseek-flash`/`deepseek-v4-flash` → `deepseek-v4-flash`; `deepseek-pro`/`deepseek-v4-pro` → `deepseek-v4-pro`; reject legacy chat/reasoner) and `DeepseekProbeStage` → `review.models.<stage>` resolution from active configuration without budget enforcement
- [x] 4.3 Implement fixed outbound probe body constants (`stream` false, `temperature` 0, `max_tokens` 256, `response_format` json_object, `thinking` disabled, synthetic messages only) and ensure probe never reads repository/bundle/disclosure data
- [x] 4.4 Implement ordered provider-envelope + local `deepseek-gateway-probe-v1` validation (body ≤ 65536, choices length 1, `finish_reason` stop, non-empty content, fatal JSON.parse, exact schema, optional model compatibility) with non-retryable closed codes
- [x] 4.5 Implement deterministic retry matrix (`maxAttempts` 3, delays 500/1000 ms, no jitter, per-attempt 30s timeout, `Retry-After` cap 2000 ms, injected clock/sleeper) and final code mapping including `deepseek_insufficient_balance` and `deepseek_provider_unavailable` without collapsing into transport

## 5. Probe API surface (US-001, `local-project-registration` + `deepseek-api-gateway`)

- [x] 5.1 Expose `POST /projects/:id/deepseek/probe` accepting only `{ stage?: DeepseekProbeStage }` (default `discovery`); reject `new`/unknown/extra fields with `invalid_deepseek_probe_request`; return success metadata DTO; map missing/blank `DEEPSEEK_API_KEY` to `deepseek_not_configured` with zero HTTP attempts; never return raw upstream bodies, keys, or `reasoning_content`
- [x] 5.2 Confirm `GET /health` remains ok when the DeepSeek key is absent; confirm registration, configuration, discovery, dashboard, resolve, secret-scan, context-bundle, and disclosure flows do not auto-probe; confirm no update/delete gateway product endpoints

## 6. Compose and env wiring (US-001, `docker-compose-local-runtime`)

- [x] 6.1 Wire Compose API service to forward only `DEEPSEEK_API_KEY` from gitignored local env; update tracked `.env.example` with empty placeholder only; ensure `DEEPSEEK_BASE_URL` is not normal operator/Compose configuration; never touch foreign containers such as `axioma-db-dev`

## 7. Angular DeepSeek probe outcomes (US-001/US-003, `angular-web-console-baseline`)

- [x] 7.1 Add a Spanish-first DeepSeek probe surface with **Probar DeepSeek**, optional stage control limited to the four `DeepseekProbeStage` values (default discovery), and idle/loading/success/blocked states distinct from resolve/secret-scan/bundle/disclosure
- [x] 7.2 On success show resolved model, schema id, `attemptCount`, `latencyMs`, optional usage, and short `parsed.message` without raw provider dumps; copy MUST state the probe does not start a review run or reserve budget; no browser API-key or base-URL inputs

## 8. Automated tests and evidence (US-002, `application-test-baseline`)

- [x] 8.1 Add unit tests for alias resolution, stage default/four routes/rejection of `new`/unknown/extra fields, outbound constants, envelope validation matrix (empty/missing/multiple choices/`length`/invalid JSON/schema/model mismatch/oversize), and retry classification with injected clock/sleeper
- [x] 8.2 Add API/integration tests for probe success via fake port; missing key → `deepseek_not_configured` zero attempts; exact retry attempts/delays for network/timeout/429/500/503; `Retry-After` cap; no retry for 400/401/402/403/422 and semantic failures; `deepseek_insufficient_balance` / `deepseek_provider_unavailable`; `attemptCount` + total `latencyMs`; no repository/bundle/disclosure reads; no provider-call DB rows
- [x] 8.3 Add web tests for idle/loading/success/blocked probe outcomes; re-run existing registration, configuration, discovery, dashboard, resolve, secret-scan, context-bundle, disclosure, health/readiness, `AppMetadata`, web shell, and shared-contracts suites and confirm they still pass; capture combined results under `evidence/success/`
- [x] 8.4 Record impact statements (security/privacy, persistence, budget, migration, rollback — with explicit no-impact notes where applicable) in `evidence/impact-statements.md`

## 9. Governance validators and inventory sync (US-002/US-003)

- [x] 9.1 Synchronize `docs/context/**` and regenerate `package-summary.json` as needed for the DeepSeek gateway; capture integrity-consistent results in evidence
- [x] 9.2 Document copyable operator commands for probe success and blocked paths (including key via gitignored env only) using hyphenated `/opsx-*` syntax where OpenSpec commands are referenced; capture in `evidence/operator-commands.md`
- [x] 9.3 Run `npm run quality-gates` and existing baseline/governance validators (including SpecPilot repo secret scan, unweakened) on the clean tree; capture passing output in `evidence/success/quality-gates-pass.txt` and `evidence/success/validators.txt`; stop on any failure
- [x] 9.4 Confirm API key never appears in logs/DTOs/evidence, probe uses synthetic payload only, no provider-call persistence, general health remains healthy without the key, and repo CI scanner remains unweakened; capture in `evidence/secret-safety-check.txt`

## 10. Operator-visible outcomes (US-003)

- [x] 10.1 Obtain and record operator confirmation that probe success (resolved model + schema + attempt/latency metadata) and at least one blocked/failure path work as documented in `evidence/human-validation.md`
- [x] 10.2 Confirm no hidden deferred acceptance criteria remain across US-001/002/003; record the confirmation in `evidence/no-deferred-ac.md`

## 11. Closure gates (US-003)

- [x] 11.1 Confirm that human validation, tests, governance validators, secret-safety checks, and the full local quality gate are all `PASS`; report the complete results to the operator and obtain one explicit authorization for the continuous stop-on-failure closure sequence: Verify → sync → post-sync validation → archive → final validation → commit → push
- [x] 11.2 With operator authorization, run OpenSpec Verify and require exactly `PASS`; capture the output in `evidence/verify.txt`; stop and remediate on any other result
- [x] 11.3 After Verify exactly `PASS`, sync the nine capability specs (one new + eight modified) to canonical `openspec/specs/<capability>/spec.md`; capture sync evidence
- [x] 11.4 After sync, run `openspec validate --all --strict`, package-summary validation, delivery-graph validation, secret scan, baseline validation, and the full local quality gates; capture results and stop immediately on any failure
- [x] 11.5 Archive the change through the approved OpenSpec lifecycle; capture archive evidence and confirm no active changes remain
- [x] 11.6 After archive, run the complete final validation set, including OpenSpec validate/list, full local quality gates, package-summary, delivery-graph, secret scan, baseline, branch `main`, tracked/staged secret and `.env` checks, `git status`, and `git diff`; stop immediately on any failure
- [ ] 11.7 Only after every final validation is `PASS`, create one final closure commit on `main` with a message coherent with this slice and push to `origin/main` when authorized; do not create an implementation commit before Verify/sync/archive and do not require a second routine follow-up commit
- [ ] 11.8 After push, treat GitHub Actions as independent post-push remote verification; report its result when available and correct immediately on `main` if it fails; temporary absence of the remote result does not invalidate completed local closure evidence
