# w03 — Deepseek Review Engine

## Goal

Deliver the deepseek review engine capabilities defined by the roadmap while preserving the current release boundaries and OpenSpec governance.

## Slices

### `w03-s01-deepseek-api-gateway`

Integrate V4 Flash/Pro with structured outputs.

Expected change: `chg-w03-s01-deepseek-api-gateway`

### `w03-s02-review-run-orchestration`

Persist and execute review run state machine.

Expected change: `chg-w03-s02-review-run-orchestration`

### `w03-s03-budget-and-usage-control`

Estimate, reserve, reconcile, and hard-block monthly budget.

Expected change: `chg-w03-s03-budget-and-usage-control`

### `w03-s04-findings-prompts-and-history`

Persist findings and consolidated prompts with history.

Expected change: `chg-w03-s04-findings-prompts-and-history`

## Wave closure

All slices satisfy their acceptance criteria, deterministic checks pass, OpenSpec Verify is exactly `PASS`, documentation/context is synchronized, changes are synced and archived, and any explicitly required human approval is complete.
