# Delivery Graph And Id Validation

## Purpose

Capability adopted by `chg-w00-s01-repository-governance-and-openspec-foundation`.

## Requirements

### Requirement: Delivery graph structural integrity
A deterministic validator MUST verify that every wave directory maps to one wave id, every slice belongs to exactly one wave, every User Story belongs to exactly one declared slice, and every slice declares expected change `chg-<slice-id>`.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC1, AC2)

#### Scenario: Canonical counts validate
- **WHEN** `scripts/validate-delivery-graph.py` runs against the canonical docs tree
- **THEN** it MUST confirm 12 waves, 42 slices, and 126 User Stories with consistent cross-references and exit successfully

#### Scenario: Broken story-to-slice reference fails
- **WHEN** a User Story file declares a slice or expected change that does not match its filename-derived ids
- **THEN** the validator MUST exit non-zero and report the inconsistency

### Requirement: Lowercase kebab-case enforcement in validation
The delivery-graph validator MUST reject non-kebab-case machine IDs for waves, slices, User Stories, and expected changes.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC2, AC3)

#### Scenario: Non-kebab change id fails
- **WHEN** an expected change id contains invalid characters for lowercase kebab-case
- **THEN** validation MUST fail

### Requirement: No completed delivery claims without evidence
Validation and docs checks for this foundation change MUST treat imported package docs and candidate baseline files as non-completed implementation until adoption evidence exists.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC1), `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC1)

#### Scenario: Presence is not completion
- **WHEN** candidate scripts or `AGENTS.md` exist on disk before adoption tasks finish
- **THEN** operators MUST NOT mark bound User Stories complete solely because those files are present
