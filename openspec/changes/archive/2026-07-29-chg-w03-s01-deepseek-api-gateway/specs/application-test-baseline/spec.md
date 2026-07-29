## MODIFIED Requirements

### Requirement: Evidence is captured under the change directory
Deterministic automated test, quality-gate, and related Verify outputs for the active change MUST be captured under that change’s `evidence/` directory (or the archived change evidence path after archive). For `chg-w03-s01-deepseek-api-gateway`, evidence MUST live under `openspec/changes/chg-w03-s01-deepseek-api-gateway/evidence/` (or its archive path). Persistence integration tests MUST continue to use Testcontainers PostgreSQL where already required. This capability MUST NOT transfer Playwright product e2e ownership into this slice. Mandatory Verify evidence MUST include the full local quality-gate orchestrator `PASS` run where quality gates apply; GitHub Actions may supply independent post-push remote verification logs but MUST NOT replace local full-gate evidence and MUST NOT be treated as a pre-entry block onto `main`.

#### Scenario: Evidence files are present for Verify under the active change
- **WHEN** quality-gate and application-test evidence is prepared for Verify of `chg-w03-s01-deepseek-api-gateway`
- **THEN** reproducible command outputs exist under that change’s `evidence/` directory, including full local quality-gate `PASS` output when gates are run for closure, and do not depend on Playwright product e2e

#### Scenario: Testcontainers evidence remains permitted for persistence
- **WHEN** API persistence integration evidence is captured as part of the required automated test set
- **THEN** Testcontainers PostgreSQL may be used and the resulting outputs are recorded under the active change `evidence/` directory

#### Scenario: Remote CI does not replace local gate evidence
- **WHEN** a GitHub Actions post-push workflow run log is available
- **THEN** it may corroborate remote verification but MUST NOT substitute for the required local full quality-gate `PASS` evidence

## ADDED Requirements

### Requirement: DeepSeek gateway probe success and blocked paths are covered by automated tests
Automated tests MUST cover DeepSeek gateway probe success with a fake port and at least the following blocked or failure paths with reproducible evidence under this change: default `discovery` and all four `DeepseekProbeStage` routes; rejection of `new`, unknown stages, and extra fields; exact outbound body constants; valid one-choice `finish_reason` `stop`; empty content; missing choices/message/content; multiple choices; `finish_reason` `length`; invalid provider envelope JSON; invalid content JSON; local schema mismatch; returned model mismatch; response body over 65536 bytes; no retry for semantic/envelope failures; exact retry attempts/delays for network, timeout, 429, 500, and 503 using injected clock/sleeper; `Retry-After` cap; no retry for 400/401/402/403/422; `deepseek_insufficient_balance` and `deepseek_provider_unavailable` classification; `attemptCount` and total `latencyMs` semantics; missing key makes zero HTTP attempts; API key never appears in logs, DTOs, or evidence; probe never reads repository, bundle, or disclosure data. Web tests MUST cover idle/loading/success/blocked probe outcomes. Shared-contracts tests MUST cover probe DTO guards including rejection of `stage` `new`.

#### Scenario: Probe success path is covered with a fake port
- **WHEN** automated API tests exercise a successful structured probe against a fake DeepSeek port
- **THEN** the ok contract including `attemptCount`, `providerHttpStatus` 200, and `deepseek-gateway-probe-v1` parsed body is asserted

#### Scenario: Stage validation matrix is covered
- **WHEN** automated tests exercise default discovery, all four stages, and rejection of `new`/unknown/extra fields
- **THEN** assertions prove the binding stage rules without live DeepSeek network calls

#### Scenario: Retry and classification matrix is covered without real waits
- **WHEN** automated tests exercise transient retries and terminal classifications with an injected sleeper
- **THEN** attempt counts, delays, and closed codes match the design matrix and tests do not sleep in real time

#### Scenario: Secret and isolation safety is covered
- **WHEN** automated tests exercise missing-key and success/failure logging/DTO capture
- **THEN** zero HTTP attempts occur when the key is missing, the API key never appears in artifacts, and no repository/bundle/disclosure reads are performed
