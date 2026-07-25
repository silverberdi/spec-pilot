## ADDED Requirements

### Requirement: Cursor is the only implementer
Cursor MUST be the only current implementer of the SpecPilot codebase. Cursor creates and updates OpenSpec planning artifacts, applies approved changes, edits repository files, runs validations, and maintains task evidence.

#### Scenario: Implementation ownership
- **WHEN** SpecPilot codebase or OpenSpec change implementation work is performed
- **THEN** Cursor is the declared implementer and no other tool is assigned implementation authority

### Requirement: Cline with DeepSeek is optional and read-only
When Cline with DeepSeek is used for validation, it MUST be optional and read-only. It MAY inspect planning or implementation evidence and suggest a ready-to-copy `/opsx-apply` or `/opsx-update` instruction for Cursor. It MUST NOT edit files, apply changes, create branches, commit, push, verify, sync, or archive.

#### Scenario: Cline validation remains non-mutating
- **WHEN** Cline with DeepSeek is used for validation
- **THEN** it produces inspection or suggested operator-facing instructions only and does not mutate the repository or perform lifecycle actions

### Requirement: Codex and OpenCode have no current project role
Codex and OpenCode MUST have no current development, review, validation, or governance role for SpecPilot. The presence of generated integrations for those tools MUST NOT assign an operational role.

#### Scenario: Generated integrations do not invent roles
- **WHEN** generated Codex or OpenCode integration files are present
- **THEN** those files MUST NOT be interpreted as assigning development, review, validation, or governance authority

### Requirement: No agent-specific review gates
Operating contracts MUST NOT require an agent-specific review verdict as a closure gate unless a later approved change explicitly introduces one.

#### Scenario: Closure without agent reviewer verdict
- **WHEN** a change meets evidence and Verify exactly `PASS` requirements
- **THEN** closure MUST NOT be blocked solely by the absence of a Codex, OpenCode, or other agent-specific review verdict
