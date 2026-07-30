# Human validation — chg-w03-s02-review-run-orchestration

Operator/executor: Cursor (implementer) on behalf of operator request for tasks 11.1–11.2  
Date/time (UTC): `2026-07-30T01:45:27Z`  
Runtime: SpecPilot compose (`specpilot-api`, `specpilot-postgres`, `specpilot-web`); rebuilt API before HV; migration `20260729200000_add_review_run_orchestration` applied  
Script: `evidence/operator-human-validation.sh`  
Smoke: `evidence/success/operator-human-validation-smoke.txt` → `HUMAN_VALIDATION_SMOKE=PASS` (pass_count=67, fail_count=0)  
Sanitized report: `evidence/success/operator-human-validation-report.txt`

## Runtime freshness

| Check | Result |
|---|---|
| `GET /health` main API | PASS 200 |
| `POST .../review-runs` route live | PASS (`project_not_found` for unknown project) |
| Migration applied | PASS |
| Tables `review_runs` / `review_run_transitions` / `context_disclosure_transmissions` | PASS |
| Partial unique index `review_runs_one_inflight_per_project` | PASS |
| No `review_runs.transmission_id` scalar | PASS |
| No budget/findings/prompt-history/auth/user tables | PASS |

## A. Successful review-run — PASS

| Field | Safe value |
|---|---|
| HTTP | 201 |
| state | `completed` |
| stage | `new` |
| project/run/bundle/approval ids | UUIDs length 36 (not echoed) |
| manifestHash | length 64 |
| transition sequence | `null→requested→preparing_context→budget_check→running→validating_response→completed` (6) PASS |
| budgetCheckStatus | `not_enforced` |
| schemaId | `review-run-orchestration-v1` |
| promptTemplateId | `review-run-orchestration-v1` |
| modelAlias / resolvedModelId | `deepseek-flash` / `deepseek-v4-flash` |
| verdict | stage-valid (`blocked` — provider assessment; run state completed) |
| rationale | length 49 (content not recorded) |
| attemptCount | 1 (≥ 1) |
| latencyMs | 1211 |
| usage | present |
| transmission | exactly one; outcome `completed` |
| GET transitions ordered | PASS |
| list shape | bare array; no excerpts / full transmission objects PASS |

Real DeepSeek profile `review_run_orchestration` used. No excerpts/prompts/raw bodies/keys recorded.

## B. Blocked before provider — PASS

| Field | Result |
|---|---|
| HTTP | 201 |
| state | `blocked` |
| closed blockedCode | closed review-run blocked code (zero provider transmission) |
| ContextDisclosureTransmission delta | 0 |
| Wave 2 `content_transmitted` | remains `false` |

## C. Failed after provider (invalid-key temp SpecPilot container `:3002`) — PASS

| Field | Result |
|---|---|
| HTTP | 201 |
| state | `failed` |
| attemptCount | ≥ 1 (invocation began) |
| transmission | exactly one; outcome `provider_failed` or `response_invalid` |
| second logical gateway call | none (`review_run_gateway` events ≤ 1) |
| main `.env` / main API key | untouched (presence-only check) |
| temp container | removed |

## D. Missing-key (empty-key temp SpecPilot container `:3001`) — PASS

| Field | Result |
|---|---|
| temp `/health` | 200 |
| main `/health` during harness | 200 |
| state / failedCode | `failed` / `deepseek_not_configured` |
| attemptCount | 0 |
| transmission delta | 0 |
| main runtime restored | PASS |
| main `.env` | intact (not modified) |

## E. Concurrency + stale recovery — PASS

| Case | Result |
|---|---|
| Non-stale in-flight | HTTP 409 `review_run_in_progress`; no new run |
| Stale (>180000 ms) | prior run → `failed` + `review_run_interrupted` transition; new run HTTP 201 |
| Stale transmission / replay | zero transmissions on stale run; no automatic provider replay |
| Partial unique index | authoritative (enforced) |

## F. Persistence / immutability — PASS

| Check | Result |
|---|---|
| No `ReviewRun.transmissionId` | PASS |
| `ContextDisclosureTransmission.reviewRunId` UNIQUE | PASS |
| Inverse transmission load on GET | PASS |
| Transitions append-only | PASS |
| Terminal immutability (completed remains) | PASS |
| ContextBundle / Approval not mutated; `contentTransmitted=false` | PASS |
| No budget/findings/prompt/auth/user tables | PASS |

## Cross-cutting

| Check | Result |
|---|---|
| Secret-safety (no keys/excerpts/prompts/raw bodies in evidence) | PASS |
| Cleanup disposable projects/dirs + temp containers | PASS |
| `axioma-db-dev` untouched | PASS (status/started/restarts unchanged) |

## Operator confirmation checklist

- [x] Successful review-run path works as documented
- [x] At least one blocked path works as documented
- [x] At least one failed path (post-provider) works as documented
- [x] Missing-key harness works without mutating main `.env`
- [x] Concurrency + stale recovery confirmed
- [x] Spanish console surface was already covered by automated web tests; live API HV covers orchestration contracts
- [x] Evidence contains only sanitized metadata

**11.1 result: PASS**
