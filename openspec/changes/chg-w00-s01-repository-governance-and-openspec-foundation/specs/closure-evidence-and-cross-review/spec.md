## ADDED Requirements

### Requirement: Definition of Done gates
A slice MUST be considered complete only when every included User Story acceptance criterion has evidence, deterministic checks pass, OpenSpec Verify is exactly `PASS`, required human validation is complete, docs/context are synchronized, required cross-review is `READY_TO_MERGE`, applicable delta specs are synced, the change is archived, no hidden deferred work remains, and final context integrity is valid.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC5), `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC5), `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC1, AC5)

#### Scenario: Missing evidence blocks done
- **WHEN** any bound User Story lacks evidence for an acceptance criterion
- **THEN** the slice MUST NOT be marked complete

### Requirement: Mandatory Codex cross-review
Codex MUST perform cross-review for this change and MUST return exactly one of `READY_TO_MERGE` or `CHANGES_REQUIRED`.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC1, AC3)

#### Scenario: Ready to merge
- **WHEN** Codex finds no blocking issues against approved artifacts and evidence
- **THEN** the review verdict MUST be `READY_TO_MERGE`

#### Scenario: Changes required
- **WHEN** Codex finds blocking defects or missing evidence
- **THEN** the review verdict MUST be `CHANGES_REQUIRED` and merge eligibility MUST remain blocked

### Requirement: Human validation for external GitHub settings
Branch protection, required reviewers, and other GitHub settings that cannot be proven by local scripts MUST be validated by a human operator with recorded evidence before merge eligibility.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC1, AC3)

#### Scenario: Local scripts insufficient for GitHub protection proof
- **WHEN** only local validation scripts have passed
- **THEN** merge eligibility MUST still require recorded human validation for applicable external GitHub settings

### Requirement: Persistence and UI impact explicitly none
Closure documentation for this change MUST state that persistence impact is none and product UI/API impact is none for `w00-s01`, thereby satisfying UI acceptance criteria that apply only when a UI surface exists.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC4), `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC4), `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC4)

#### Scenario: No-impact statements present
- **WHEN** proposal/design/closure evidence are reviewed
- **THEN** they MUST explicitly record no operational persistence impact and no product UI/API surface for this slice

### Requirement: Draft visibility without premature merge
A draft PR MAY be opened for visibility, but the slice MUST NOT become merge-eligible until all closure gates defined by the canonical methodology are satisfied.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC1)

#### Scenario: Draft PR exists while gates open
- **WHEN** a draft PR is open and Verify, Codex review, or human GitHub validation is incomplete
- **THEN** the PR MUST remain non-merge-eligible

### Requirement: Closure evidence retains auditable error and success records
Closure evidence for all three bound User Stories MUST include retained file/transcript records of deterministic validation success and at least one meaningful failure path, plus Verify and cross-review artifacts, without requiring database persistence.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC3, AC5), `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC3, AC5), `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC3, AC5)

#### Scenario: Closure checklist references evidence paths
- **WHEN** the closure evidence checklist is produced
- **THEN** it MUST map each acceptance criterion for `us-w00-s01-repository-governance-and-openspec-foundation-001`, `us-w00-s01-repository-governance-and-openspec-foundation-002`, and `us-w00-s01-repository-governance-and-openspec-foundation-003` to concrete evidence paths
