## ADDED Requirements

### Requirement: Planning must reach APPLY_READY before apply
An OpenSpec change MUST NOT be applied until its proposal, design, specs, and tasks are complete, mutually consistent, and sufficient for Cursor to receive only `/opsx-apply` for that change (`APPLY_READY`).

#### Scenario: Incomplete planning blocks apply
- **WHEN** any required planning artifact is missing or inconsistent
- **THEN** the change MUST NOT be treated as `APPLY_READY` and MUST NOT be applied

### Requirement: Verify must be exactly PASS
OpenSpec Verify MUST return exactly `PASS` before sync or archive may proceed. `PASS WITH NOTES` MUST NOT authorize closure, sync, or archive.

#### Scenario: PASS WITH NOTES does not close
- **WHEN** Verify returns `PASS WITH NOTES` or any result other than exact `PASS`
- **THEN** sync and archive MUST remain blocked

#### Scenario: Exact PASS unlocks sync path
- **WHEN** Verify returns exactly `PASS` and no unresolved closure gate remains
- **THEN** the change MAY proceed to sync under operator approval

### Requirement: Sync precedes archive
Canonical specs and documentation MUST be synchronized only after Verify exactly `PASS`. Archive MUST occur only after successful synchronization and closure checks, each under operator approval.

#### Scenario: Archive blocked before sync
- **WHEN** Verify is exactly `PASS` but sync has not completed successfully
- **THEN** archive MUST remain blocked

### Requirement: Operator approval for lifecycle gates
Verify, sync, and archive MUST each require explicit operator approval before execution completes as a closure action.

#### Scenario: Lifecycle action awaits operator approval
- **WHEN** a Verify, sync, or archive action is proposed
- **THEN** the action MUST NOT be treated as completed closure without explicit operator approval
