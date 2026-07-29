## MODIFIED Requirements

### Requirement: Baseline schema is limited to a persistence probe model
The Prisma schema MUST retain the non-domain operational metadata probe model (for example `app_metadata` with a primary key, value, and timestamps) used to prove migration application and a typed client round trip. The schema MUST retain the bounded `Project` registration domain model with unique constraints on canonical `repositoryPath` and `slug`. This change MAY retain a bounded `ProjectConfigurationVersion` domain model and nullable `Project.configurationVersionId` active-snapshot linkage required by `project-yaml-configuration`, including a unique constraint on `(projectId, sourceHash)`. This change MAY add nullable `Project.lastDiscovery` JSON for the latest discovery snapshot required by `git-and-openspec-discovery` and MAY use existing nullable `Project.lastInspectedAt`. This change MAY retain an immutable append-only `ContextBundle` model required by `context-bundle-manifest`, including reverse relation `Project.contextBundles` with cascade delete, algorithm identity fields, `manifestHash`, safe JSON `entries`/`exclusions`, and no unique constraint on `manifestHash`. This change MAY retain append-only `ContextDisclosurePreviewSession` and `ContextDisclosureApproval` models required by `context-preview-and-approval`, including foreign keys to `Project` and `ContextBundle`, an approval foreign key to the preview session, policy identity fields, `previewIntegrityHash`, approval `contentTransmitted` literal-false snapshot only on the approval model, and reverse relations as needed—without adding `contentTransmitted` or approval columns onto `ContextBundle` and without persisting excerpts or file bodies on either disclosure model. This change (`chg-w03-s01-deepseek-api-gateway`) MUST NOT add provider-call, DeepSeek gateway audit, review-run, budget, finding, prompt, usage, authentication, or user tables, and MUST NOT introduce a Prisma migration for DeepSeek probe outcomes. The schema MUST NOT introduce immutable discovery-version history tables.

#### Scenario: Probe model remains present
- **WHEN** the Prisma schema is inspected after this change
- **THEN** the non-domain operational metadata probe model remains defined

#### Scenario: Disclosure audit models remain permitted without mutating ContextBundle
- **WHEN** the Prisma schema is inspected for disclosure persistence
- **THEN** bounded `ContextDisclosurePreviewSession` and `ContextDisclosureApproval` models may exist, `ContextBundle` remains free of `contentTransmitted` and approval columns, and no review, finding, budget, prompt, usage, authentication, or user tables are introduced

#### Scenario: DeepSeek probe adds no provider-call persistence
- **WHEN** the Prisma schema and migrations are inspected for `chg-w03-s01-deepseek-api-gateway`
- **THEN** no new provider-call / DeepSeek gateway audit migration or table is present and probe outcomes remain ephemeral

#### Scenario: Later-wave aggregates remain excluded
- **WHEN** the Prisma schema is inspected for later-wave aggregates
- **THEN** no review, finding, budget, prompt, usage, authentication, or user tables are present
