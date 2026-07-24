## ADDED Requirements

### Requirement: Generated integrations are immutable
Files under `.cursor/commands/`, `.cursor/skills/`, `.codex/skills/`, `.opencode/commands/`, and `.opencode/skills/` MUST be treated as immutable generated artifacts and MUST NOT be manually edited.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC1)

#### Scenario: Manual edit is invalid
- **WHEN** a change modifies a generated integration file by hand
- **THEN** the modification MUST be rejected in review and reverted

### Requirement: Official refresh only via openspec update
Generated integrations MUST be refreshed only through the official `openspec update` command and MUST NOT be refreshed by any other method.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC1)

#### Scenario: Allowed refresh path
- **WHEN** integrations must be regenerated after OpenSpec workflow/config changes
- **THEN** operators MUST run `openspec update` and MUST NOT hand-copy or patch generated skill/command files

### Requirement: Integration inventory expectations
Baseline validation MUST verify expected generated file counts for each integration inventory surface used by this repository (12 Cursor commands, 12 Cursor skills, 12 Codex skills, 12 OpenCode commands, 12 OpenCode skills) unless an approved change updates those expectations.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC2)

#### Scenario: Inventory mismatch fails validation
- **WHEN** any integration inventory count differs from the expected value
- **THEN** baseline validation MUST fail
