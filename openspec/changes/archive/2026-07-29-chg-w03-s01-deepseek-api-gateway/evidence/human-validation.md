# Human validation — chg-w03-s01-deepseek-api-gateway

Status: **PASS**

Date/time: 2026-07-29T16:34:18-05:00 (operator script stamp `20260729T163418`)

Script: `openspec/changes/chg-w03-s01-deepseek-api-gateway/evidence/operator-human-validation.sh`  
Sanitized report: `/tmp/sp-w03-s01-operator-validation-20260729T163418.txt`  
Smoke capture: `evidence/success/operator-human-validation-smoke.txt`

## Runtime freshness

- Initial operator observation: first immediate `GET /health` after recreate returned connection reset (startup race).
- Agent diagnosis: `specpilot-api` **Up**, restarts=0, `GET /health` **200**, `DEEPSEEK_API_KEY` **present** (value never inspected), `DEEPSEEK_BASE_URL` **absent**.
- No implementation fix required; no SpecPilot rebuild needed for this validation run.
- `axioma-db-dev` snapshot unchanged end-to-end (started=2026-07-27T19:03:39Z, restarts=0).

## Results (sanitized)

| Check | Result |
| --- | --- |
| Real DeepSeek probe | **PASS** (HTTP 200) |
| stage | discovery |
| modelAlias | deepseek-flash |
| resolvedModelId | deepseek-v4-flash |
| schemaId | deepseek-gateway-probe-v1 |
| attemptCount | 1 |
| providerHttpStatus | 200 |
| latencyMs | 983 |
| usage | present |
| providerRequestId | absent |
| parsed schema | **PASS** (`ok=true`, probe id match; message present with safe length=16; message text **not** recorded) |
| invalid-stage (`new`) | **PASS** (422 `invalid_deepseek_probe_request`) |
| unknown-stage | **PASS** (422 `invalid_deepseek_probe_request`) |
| extra-field (`prompt`) | **PASS** (422 `invalid_deepseek_probe_request`) |
| missing-key (temp SpecPilot-owned container `:3001`, `.env` untouched) | **PASS** (422 `deepseek_not_configured`, attemptCount=0 log, no outbound markers) |
| general health without key (nokey harness) | **PASS** (200) |
| main health during/after nokey harness | **PASS** (200; key still present on main api) |
| secret-safety | **PASS** |
| no persistence / no provider-call table | **PASS** |
| axioma-db-dev untouched | **PASS** |
| cleanup / runtime restored | **PASS** |

## Explicit non-inclusions

Evidence intentionally omits: API key values, Authorization headers, raw request bodies, raw provider responses, `parsed.message` text, full headers, and `reasoning_content`.

## Gates after human validation

- `npm run quality-gates` → **QUALITY_GATES_OK** (includes baseline + repository secret scanner)
- `openspec validate --all --strict` → **27 passed, 0 failed**
- No provider-call Prisma model/migration/table
- `git diff` / status: no secret patterns; `.env` remains gitignored; `.env` not in status

## Operator sign-off

- Operator: confirmed prerequisites (`.env` gitignored; `DEEPSEEK_API_KEY` configured locally; api recreate completed; do not touch `axioma-db-dev`; never print key).
- Executor: Cursor agent via `operator-human-validation.sh`
- Result: **PASS**
