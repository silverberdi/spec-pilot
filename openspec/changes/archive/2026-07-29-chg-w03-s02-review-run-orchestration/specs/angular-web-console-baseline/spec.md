## ADDED Requirements

### Requirement: Minimal Spanish-first review-run console outcomes
`apps/web` MUST expose a Spanish-first review-run operator surface with idle, loading, success, blocked, empty, and error outcomes. The surface MUST accept stage, explicit `contextBundleId`, and conditional `changeId`, and MUST offer an action to start a review run via `POST /projects/:id/review-runs`. Success views MUST show run id, stage, change id when present, explicit context bundle id/hash, approval id when present, final state, transitions, `budgetCheckStatus` `not_enforced` with copy that budget enforcement is not active, model alias/id, schema id, `promptTemplateId`, usage/latency when present, verdict/rationale when present, and `blockedCode`/`failedCode` when present. The surface MUST NOT show excerpts, prompt text, provider request bodies, raw responses, reasoning, findings, remaining budget, or delivery controls, and MUST NOT collect API keys.

#### Scenario: Success shows safe run metadata without excerpts
- **WHEN** create returns a completed run
- **THEN** the UI shows verdict and safe metadata and does not render excerpts or prompt text

#### Scenario: Empty list shows empty state
- **WHEN** list returns an empty array for the selected project
- **THEN** the UI shows an empty outcome rather than success or error

#### Scenario: Blocked outcome shows blockedCode
- **WHEN** create returns terminal `blocked` with a closed code
- **THEN** the UI shows the blocked state and the safe `blockedCode`
