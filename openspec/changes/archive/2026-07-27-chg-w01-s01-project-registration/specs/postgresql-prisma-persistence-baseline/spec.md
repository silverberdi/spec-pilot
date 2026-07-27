## MODIFIED Requirements

### Requirement: Baseline schema is limited to a persistence probe model
The Prisma schema MUST retain the non-domain operational metadata probe model (for example `app_metadata` with a primary key, value, and timestamps) used to prove migration application and a typed client round trip. This change MAY add a bounded `Project` registration domain model (and only the registration fields required by `local-project-registration`) with unique constraints on canonical `repositoryPath` and `slug`. The schema MUST NOT introduce product domain models or tables for configuration versions, reviews, findings, budgets, prompts, usage, authentication, or users. `ProjectConfigurationVersion` remains out of scope for this change.

#### Scenario: Probe model remains present
- **WHEN** the Prisma schema is inspected after this change
- **THEN** the non-domain operational metadata probe model remains defined

#### Scenario: Project registration model is permitted
- **WHEN** the Prisma schema is inspected for product domain tables introduced by this change
- **THEN** a bounded `Project` registration model may be present with unique `repositoryPath` and `slug`, and no configuration-version, review, finding, budget, prompt, usage, authentication, or user models are introduced

#### Scenario: Other product aggregates remain excluded
- **WHEN** the Prisma schema is inspected for later-wave aggregates
- **THEN** no `ProjectConfigurationVersion`, review, finding, budget, prompt, usage, authentication, or user tables are present
