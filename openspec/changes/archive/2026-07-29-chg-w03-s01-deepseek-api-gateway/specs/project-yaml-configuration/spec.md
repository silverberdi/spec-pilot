## ADDED Requirements

### Requirement: Active configuration model routing is consumable for DeepSeek probe without budget enforcement
`project-yaml-configuration` MUST continue to supply immutable active `ProjectConfigurationVersion` snapshots whose `normalizedConfig.review.provider` and `review.models` (`discovery`, `planning`, `applied`, `verify`) are consumable by `deepseek-api-gateway` probe resolution. This change MUST NOT expand `schemaVersion: 1`, MUST NOT add budget enforcement, reservation, or hard-block semantics (owned by `w03-s03`), and MUST NOT rewrite persisted configuration rows during probe. Parse, validate, version, attach, refresh, and get behaviors remain authoritative and MUST NOT be weakened.

#### Scenario: Probe resolves models from the active snapshot
- **WHEN** DeepSeek probe reads the active configuration for a registered project
- **THEN** it uses `normalizedConfig.review.provider` and `review.models.<DeepseekProbeStage>` as inputs and does not update the `ProjectConfigurationVersion` row

#### Scenario: Budget fields are not enforced by this change
- **WHEN** `review.monthlyBudgetUsd` is present on the active snapshot and probe is invoked
- **THEN** this capability does not reserve, reconcile, or hard-block budget as part of probe execution
