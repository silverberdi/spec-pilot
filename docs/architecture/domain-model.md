# Domain Model

## Aggregates

### Project

Represents a registered local repository and its active configuration snapshot.

Key fields: `projectId`, `slug`, `displayName`, `repositoryPath`, `status`, `configurationVersionId`, `registeredAt`, `lastInspectedAt`.

### ProjectConfigurationVersion

Immutable normalized snapshot of `.specpilot/project.yaml` with source hash and validation result.

### ReviewRun

One analysis request for one project, stage, and optional change.

States: `requested`, `preparing_context`, `budget_check`, `running`, `validating_response`, `completed`, `blocked`, `failed`, `cancelled`.

### ContextBundle

Immutable manifest of files, ranges, hashes, token estimate, exclusions, and disclosure decision used for a run.

### ReviewResult

Structured verdict, rationale, findings, next action, generated prompt/command, confidence, and evidence references.

### BudgetAccount

Tracks monthly configured limit, reserved estimate, actual usage, and remaining budget.

## Value objects

`ProjectId`, `ChangeId`, `ReviewStage`, `Verdict`, `FindingSeverity`, `ModelId`, `Money`, `TokenUsage`, `FileHash`, `RepositoryPath`, `PromptArtifact`.
