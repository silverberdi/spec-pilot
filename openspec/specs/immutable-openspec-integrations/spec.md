# immutable-openspec-integrations

## Purpose

Immutability of generated OpenSpec integrations and refresh-only-via-openspec update.

## Requirements

### Requirement: Generated integrations are immutable except via openspec update
OpenSpec-generated integrations under tool-specific directories (including Cursor commands/skills and any installed Codex or OpenCode generated surfaces) MUST NOT be manually edited. Refresh MUST occur only through official `openspec update`.

#### Scenario: Manual edit of generated integration is prohibited
- **WHEN** an operator or implementer considers changing a generated integration file
- **THEN** the change MUST be performed only by running `openspec update`, not by hand-editing the generated file

### Requirement: Integration inventory drift fails validation
Baseline validation MUST verify that generated integration directories match the expected inventory recorded in canonical context. Inventory drift MUST fail validation with guidance to run `openspec update` rather than manual edits.

#### Scenario: Inventory matches expected counts
- **WHEN** generated integration directories match the expected inventory
- **THEN** the inventory check passes as part of baseline validation

#### Scenario: Inventory drift is blocked
- **WHEN** generated integration files are added or removed outside `openspec update`
- **THEN** validation fails with a non-zero exit status and instructs refresh via `openspec update`

### Requirement: Installed integrations do not assign roles
The presence of generated integrations MUST NOT assign development, review, validation, or governance roles to Codex, OpenCode, or any tool beyond the roles declared in operating contracts.

#### Scenario: Integration presence is non-authoritative
- **WHEN** generated integrations exist for tools without a current project role
- **THEN** those integrations remain installable but confer no project authority
