## MODIFIED Requirements

### Requirement: Baseline schema is limited to a persistence probe model
The Prisma schema MUST retain the non-domain operational metadata probe model (for example `app_metadata` with a primary key, value, and timestamps) used to prove migration application and a typed client round trip. The schema MUST retain the bounded `Project` registration domain model with unique constraints on canonical `repositoryPath` and `slug`. This change MAY retain a bounded `ProjectConfigurationVersion` domain model and nullable `Project.configurationVersionId` active-snapshot linkage required by `project-yaml-configuration`, including a unique constraint on `(projectId, sourceHash)`. This change MAY add nullable `Project.lastDiscovery` JSON for the latest discovery snapshot required by `git-and-openspec-discovery` and MAY use existing nullable `Project.lastInspectedAt`. This change MAY retain an immutable append-only `ContextBundle` model required by `context-bundle-manifest`, including reverse relation `Project.contextBundles` with cascade delete, algorithm identity fields, `manifestHash`, safe JSON `entries`/`exclusions`, and no unique constraint on `manifestHash`. This change MAY retain append-only `ContextDisclosurePreviewSession` and `ContextDisclosureApproval` models required by `context-preview-and-approval`, including foreign keys to `Project` and `ContextBundle`, an approval foreign key to the preview session, policy identity fields, `previewIntegrityHash`, approval `contentTransmitted` literal-false snapshot only on the approval model, and reverse relations as needed—without adding `contentTransmitted` or approval columns onto `ContextBundle` and without persisting excerpts or file bodies on either disclosure model. This change (`chg-w03-s02-review-run-orchestration`) MAY add `ReviewRun`, append-only `ReviewRunTransition`, and append-only `ContextDisclosureTransmission` models required by `review-run-orchestration`, including UNIQUE `ContextDisclosureTransmission.reviewRunId`, optional inverse `ReviewRun.transmission`, no scalar `ReviewRun.transmissionId`, and a partial unique index enforcing at most one non-terminal run per project. Probe outcomes MUST remain ephemeral without a provider-call ledger table. The schema MUST NOT introduce budget-ledger, finding, prompt-history, authentication, or user tables, and MUST NOT introduce immutable discovery-version history tables.

#### Scenario: Probe model remains present
- **WHEN** the Prisma schema is inspected after this change
- **THEN** the non-domain operational metadata probe model remains defined

#### Scenario: Review-run aggregates are permitted without budget or findings tables
- **WHEN** the Prisma schema is inspected for this change
- **THEN** `ReviewRun`, `ReviewRunTransition`, and `ContextDisclosureTransmission` may exist, `ReviewRun` has no `transmissionId` scalar, `reviewRunId` on transmission is unique, and no budget, finding, prompt-history, authentication, or user tables are introduced

#### Scenario: DeepSeek probe adds no provider-call ledger
- **WHEN** probe succeeds or fails
- **THEN** no provider-call ledger table is required and probe outcomes remain ephemeral

#### Scenario: Later-wave aggregates remain excluded
- **WHEN** the Prisma schema is inspected for later-wave aggregates beyond this slice
- **THEN** no budget-ledger, finding, prompt-history, authentication, or user tables are present
