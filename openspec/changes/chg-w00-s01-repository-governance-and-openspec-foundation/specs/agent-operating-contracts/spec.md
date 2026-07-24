## ADDED Requirements

### Requirement: Shared implementer and reviewer roles
The default implementer MUST be Cursor and the mandatory reviewer MUST be Codex for this slice unless an approved change documents a different assignment.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC1)

#### Scenario: Roles declared on the first change
- **WHEN** change artifacts for `chg-w00-s01-repository-governance-and-openspec-foundation` are read
- **THEN** implementer MUST be `cursor` and mandatory reviewer MUST be `codex`

### Requirement: Shared operating contract publication
`AGENTS.md` and related governance rules MUST publish a shared operating contract covering product authority, delivery hierarchy, OpenSpec immutability policy for generated integrations, safety rules, and baseline-versus-delivery distinction.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC1)

#### Scenario: Candidate contract is formally adopted
- **WHEN** this change completes adoption tasks for `AGENTS.md` and Cursor governance rules
- **THEN** those files MUST no longer be described as unadopted candidates in current-state documentation without evidence of remaining gaps

### Requirement: OpenCode surface without invented ownership
OpenCode MUST remain an available OpenSpec integration surface, and operators MUST NOT invent OpenCode ownership or runtime orchestration responsibilities without an approved change.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC1)

#### Scenario: OpenCode mentioned within bounds
- **WHEN** operating contracts reference OpenCode
- **THEN** they MUST describe it as an integration surface and MUST NOT assign unapproved multi-agent orchestration duties from later waves

### Requirement: No checkbox-only completion
Agents MUST NOT treat checkbox completion as sufficient evidence that a User Story or slice is done.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC3), `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC3), `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC3)

#### Scenario: Evidence required
- **WHEN** a task checkbox is marked complete
- **THEN** corresponding deterministic command output, Verify result, review verdict, or human-validation note MUST exist as evidence

### Requirement: Auditable file evidence for outcomes
Because this slice has no operational database persistence, success and failure validation outcomes MUST remain auditable via retained file or transcript evidence recorded for the change.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC3), `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC3), `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC3)

#### Scenario: Failure-path evidence retained
- **WHEN** a meaningful failure-path validation run is executed for delivery-graph or secret-scan checks
- **THEN** operators MUST retain the non-zero exit transcript as file evidence referenced by the closure checklist
