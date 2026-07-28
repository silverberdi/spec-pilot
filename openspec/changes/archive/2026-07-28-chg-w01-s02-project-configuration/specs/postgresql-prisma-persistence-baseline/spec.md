## MODIFIED Requirements

### Requirement: Baseline schema is limited to a persistence probe model
The Prisma schema MUST retain the non-domain operational metadata probe model (for example `app_metadata` with a primary key, value, and timestamps) used to prove migration application and a typed client round trip. The schema MUST retain the bounded `Project` registration domain model with unique constraints on canonical `repositoryPath` and `slug`. This change MAY add a bounded `ProjectConfigurationVersion` domain model and a nullable `Project.configurationVersionId` active-snapshot linkage required by `project-yaml-configuration`, including a unique constraint on `(projectId, sourceHash)`. The schema MUST NOT introduce product domain models or tables for reviews, findings, budgets, prompts, usage, authentication, or users.

#### Scenario: Probe model remains present
- **WHEN** the Prisma schema is inspected after this change
- **THEN** the non-domain operational metadata probe model remains defined

#### Scenario: Project and configuration version models are permitted
- **WHEN** the Prisma schema is inspected for product domain tables introduced by this change
- **THEN** a bounded `Project` model with unique `repositoryPath` and `slug` may be present together with a bounded `ProjectConfigurationVersion` model, unique `(projectId, sourceHash)`, and nullable `Project.configurationVersionId`, and no review, finding, budget, prompt, usage, authentication, or user models are introduced

#### Scenario: Later-wave aggregates remain excluded
- **WHEN** the Prisma schema is inspected for later-wave aggregates
- **THEN** no review, finding, budget, prompt, usage, authentication, or user tables are present
