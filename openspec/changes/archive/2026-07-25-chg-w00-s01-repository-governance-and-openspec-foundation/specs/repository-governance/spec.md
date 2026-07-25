## ADDED Requirements

### Requirement: Main-only working policy is binding
The repository governance documentation SHALL record that all SpecPilot work is performed directly on `main`, that no branches are created per OpenSpec change, that Pull Requests are not used, and that no `slice/* → wave/* → main` (or similar) branch hierarchy is adopted.

#### Scenario: Main-only policy is documented
- **WHEN** an operator inspects the adopted repository governance documentation
- **THEN** the documentation states that SpecPilot work is performed on `main` only, without per-change branches, Pull Requests, or a `slice/*` / `wave/*` branch hierarchy

### Requirement: Cursor must not switch branches or self-commit
Repository governance and related operator contracts SHALL require that Cursor must not switch branches and must not create commits or push without explicit operator approval.

#### Scenario: Unauthorized commit or push is prohibited
- **WHEN** Cursor has not received explicit operator approval to commit or push
- **THEN** Cursor MUST NOT create a commit or push

#### Scenario: Branch switching is prohibited
- **WHEN** SpecPilot delivery work is in progress
- **THEN** Cursor MUST remain on `main` and MUST NOT create or switch to another branch for the change

### Requirement: Validations precede commit and push
Before every commit or push, applicable repository validations MUST be executed and their results reported to the operator. The operator retains final approval over commit, push, Verify, sync, and archive.

#### Scenario: Validations reported before operator approval
- **WHEN** a commit or push is requested
- **THEN** applicable validations have been run, their results have been reported, and the operator has given explicit approval before the commit or push proceeds

### Requirement: Repository governance artifacts are adopted
The SpecPilot repository SHALL formally adopt binding operating contracts (`AGENTS.md`), ignore policy (`.gitignore`), and repository-owned Cursor rules where applicable, as distinct from OpenSpec-generated integrations.

#### Scenario: Governance artifacts are present and distinct from generated integrations
- **WHEN** governance adoption is verified
- **THEN** `AGENTS.md` and `.gitignore` are present, any repository-owned Cursor rules are treated as manual governance surfaces, and OpenSpec-generated integrations are not treated as those manual surfaces

### Requirement: Candidate presence is not completion
The presence of imported or candidate baseline governance files MUST NOT by itself be treated as completed delivery for this slice or its User Stories.

#### Scenario: Candidate files alone do not close the slice
- **WHEN** candidate governance files exist but required evidence and Verify exactly `PASS` are missing
- **THEN** the slice MUST NOT be marked complete
