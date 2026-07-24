# Review State Machine

## Review stages and valid verdicts

### `new`

- `ready_to_create`
- `blocked`
- `changes_required` only when an existing candidate prompt/configuration must be corrected

### `planning`

- `apply_ready`
- `changes_required`
- `blocked`

### `applied`

- `ready_for_verify`
- `changes_required`
- `blocked`

### `verify`

- `ready_for_sync`
- `changes_required`
- `blocked`

## Hard invariants

- `apply_ready` cannot include blocking findings.
- `ready_for_verify` cannot rely only on checked tasks.
- `ready_for_sync` requires evidence that OpenSpec Verify returned exactly `PASS`.
- A budget failure produces `blocked` with reason `budget_blocked`.
- Missing canonical context produces `blocked`, not a guessed result.
- Every completed result includes a model, configuration hash, context manifest hash, token usage, and cost.
