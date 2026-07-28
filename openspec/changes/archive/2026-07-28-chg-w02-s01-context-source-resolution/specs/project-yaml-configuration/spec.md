## ADDED Requirements

### Requirement: Active configuration snapshots remain consumable for context-source resolution without schema expansion
`project-yaml-configuration` MUST continue to supply immutable active `ProjectConfigurationVersion` snapshots whose `normalizedConfig.context.include` and `context.exclude` are consumable by `context-source-resolution`. This change MUST NOT expand `schemaVersion: 1` with per-stage source-profile overlays. Context-source resolution MAY defensively union mandatory secret-path excludes at resolve time without modifying persisted `normalizedConfig` or any `ProjectConfigurationVersion` row. Parse, validate, version, attach, refresh, and get behaviors defined by this capability remain authoritative and MUST NOT be weakened.

#### Scenario: Resolution consumes include and exclude without rewriting snapshots
- **WHEN** context-source resolution reads the active configuration for a project
- **THEN** it uses `normalizedConfig.context.include` and `context.exclude` as inputs and does not update the `ProjectConfigurationVersion` row or persisted `normalizedConfig`

#### Scenario: No per-stage YAML overlays are introduced
- **WHEN** the portable `schemaVersion: 1` contract is inspected for this change
- **THEN** no `context.stages` (or equivalent per-stage include/exclude overlay) schema expansion is required or delivered
