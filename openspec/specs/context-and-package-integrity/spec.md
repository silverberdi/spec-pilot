# context-and-package-integrity

## Purpose

Canonical context index, package-summary regeneration/integrity, and candidate-baseline semantics.

## Requirements

### Requirement: Canonical context index is maintained
The repository MUST maintain a canonical context index that identifies package inventory areas, generated-integration locations, and candidate baseline artifacts subject to formal adoption.

#### Scenario: Context index enumerates adoption surfaces
- **WHEN** an operator consults the canonical context index
- **THEN** it distinguishes imported package inventory, generated integrations, and candidate baseline artifacts

### Requirement: Package summary integrity semantics
`package-summary.json` MUST inventory the canonical package and MUST intentionally exclude itself from `files` / `fileCount`. Generated OpenSpec integrations MUST be excluded from that inventory. Candidate baseline reconciliation artifacts MUST be tracked outside `fileCount` until formally adopted.

#### Scenario: fileCount excludes package-summary itself
- **WHEN** `package-summary.json` is regenerated
- **THEN** `fileCount` equals the length of `files` and does not include `package-summary.json` itself

#### Scenario: Candidate baseline files are tracked outside fileCount
- **WHEN** candidate baseline artifacts exist
- **THEN** they are recorded under candidate-baseline tracking outside `fileCount`

### Requirement: Regeneration is the single path to refresh package summary
Package summary regeneration MUST use the repository-owned regenerator script. Baseline validation MUST fail when counts or inventory are inconsistent with live docs.

#### Scenario: Successful regeneration restores integrity
- **WHEN** the regenerator is run after coherent documentation updates
- **THEN** `package-summary.json` matches live inventory semantics and baseline validation can pass the integrity check

#### Scenario: Count mismatch fails validation
- **WHEN** documented wave, slice, or User Story counts disagree with live docs or the summary inventory
- **THEN** validation fails with a clear reason and non-zero exit status
