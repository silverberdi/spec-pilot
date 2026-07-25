# closure-evidence-and-process-gates

## Purpose

Evidence-backed closure, documentation/context sync requirements, and prohibition of agent-specific review gates / PASS WITH NOTES closure.

## Requirements

### Requirement: Evidence is required for completion claims
A User Story, slice, or wave MUST NOT be marked complete without reproducible evidence. Task checkboxes alone MUST NOT constitute completion.

#### Scenario: Checkbox-only claim is rejected
- **WHEN** tasks are checked but deterministic evidence outputs are missing
- **THEN** the work MUST NOT be treated as complete

### Requirement: Change-scoped evidence layout
Closure evidence for this change MUST live under the change's `evidence/` directory, including success outputs and at least one meaningful blocked or failure path per required validator, with traceability to the approved proposal, design, specs, and tasks.

#### Scenario: Success and failure evidence exist
- **WHEN** closure evidence is reviewed for this change
- **THEN** the evidence directory contains captured success outputs and at least one failure-path capture per required validator

### Requirement: Documentation and context must be synchronized before closure
Documentation and current context MUST be synchronized before slice closure. No hidden deferred acceptance criteria MAY remain.

#### Scenario: Unsynchronized context blocks closure
- **WHEN** implementation is otherwise complete but context or documentation is out of date
- **THEN** closure MUST remain blocked until synchronization is complete

### Requirement: Operator-facing commands use hyphenated OpenSpec syntax
Operator-facing commands and prompts MUST be complete, copyable, and use the generated hyphenated OpenSpec command syntax (for example `/opsx-apply`, `/opsx-update`, `/opsx-verify`, `/opsx-sync`, `/opsx-archive`).

#### Scenario: Copyable hyphenated commands
- **WHEN** an operator consults operator-facing instructions produced for this repository
- **THEN** lifecycle commands appear in hyphenated `/opsx-*` form and are copyable without additional invention

### Requirement: No PASS WITH NOTES closure and no agent-specific review gate
Closure gates MUST require OpenSpec Verify exactly `PASS`. `PASS WITH NOTES` MUST NOT authorize closure. No agent-specific review verdict is required unless a later approved change introduces one.

#### Scenario: Exact PASS is the only Verify closure result
- **WHEN** Verify does not return exactly `PASS`
- **THEN** the change MUST NOT close, sync, or archive
