## MODIFIED Requirements

### Requirement: Baseline schema is limited to a persistence probe model
The Prisma schema MUST retain the non-domain operational metadata probe model (for example `app_metadata` with a primary key, value, and timestamps) used to prove migration application and a typed client round trip. The schema MUST retain the bounded `Project` registration domain model with unique constraints on canonical `repositoryPath` and `slug`. This change MAY retain a bounded `ProjectConfigurationVersion` domain model and nullable `Project.configurationVersionId` active-snapshot linkage required by `project-yaml-configuration`, including a unique constraint on `(projectId, sourceHash)`. This change MAY add nullable `Project.lastDiscovery` JSON for the latest discovery snapshot required by `git-and-openspec-discovery` and MAY use existing nullable `Project.lastInspectedAt`. This change MAY add an immutable append-only `ContextBundle` model required by `context-bundle-manifest`, including reverse relation `Project.contextBundles` with cascade delete, algorithm identity fields, `manifestHash`, safe JSON `entries`/`exclusions`, and no unique constraint on `manifestHash`. The schema MUST NOT introduce immutable discovery-version history tables. The schema MUST NOT introduce product domain models or tables for reviews, findings, budgets, prompts, usage, authentication, users, or disclosure/transmission audit aggregates.

#### Scenario: Probe model remains present
- **WHEN** the Prisma schema is inspected after this change
- **THEN** the non-domain operational metadata probe model remains defined

#### Scenario: ContextBundle is permitted without later-wave aggregates
- **WHEN** the Prisma schema is inspected for product domain tables introduced by this change
- **THEN** a bounded immutable `ContextBundle` model may exist with `Project.contextBundles` reverse relation, and no review, finding, budget, prompt, usage, authentication, user, or disclosure-transmission audit models are introduced

#### Scenario: Later-wave aggregates remain excluded
- **WHEN** the Prisma schema is inspected for later-wave aggregates
- **THEN** no review, finding, budget, prompt, usage, authentication, or user tables are present
