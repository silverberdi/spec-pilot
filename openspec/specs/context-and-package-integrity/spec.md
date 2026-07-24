# Context And Package Integrity

## Purpose

Capability adopted by `chg-w00-s01-repository-governance-and-openspec-foundation`.

## Requirements

### Requirement: Package summary self-exclusion semantics
`package-summary.json` MUST maintain documented semantics where `fileCount` equals `len(files)` and intentionally excludes `package-summary.json` itself from `files` / `fileCount`.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC1, AC2)

#### Scenario: Semantics check passes
- **WHEN** package-summary semantics validation runs
- **THEN** it MUST assert `fileCountExcludesSelf` is true, `fileCount == len(files)`, and `package-summary.json` is absent from `files`

### Requirement: Deterministic regeneration
Operators MUST regenerate `package-summary.json` using `scripts/regenerate-package-summary.py`, which MUST inventory package paths (`README.md`, `bootstrap/**`, `docs/**`, `openspec/config.yaml`), exclude generated OpenSpec integrations from `files` / `fileCount`, and refresh wave/slice/story counts from live docs.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC2), `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC5)

#### Scenario: Regeneration refreshes counts
- **WHEN** the regenerator runs successfully
- **THEN** `waveCount`, `sliceCount`, and `userStoryCount` MUST match the live documentation graph

### Requirement: Context index integrity
The repository MUST maintain a context file index and current-state document that accurately describe lifecycle status, immutable integration policy, and first-change binding after adoption.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC5), `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC5)

#### Scenario: Current state updated after first change exists
- **WHEN** this OpenSpec change exists and adoption progresses
- **THEN** `docs/context/current-state.md` MUST be updated so baseline-era claims that “no OpenSpec change exists” are no longer stale

### Requirement: Candidate versus adopted baseline tracking
Until formally adopted by this change with evidence, reconciliation-created artifacts MUST remain distinguishable from completed delivery; after adoption, documentation MUST reflect adopted status without claiming later-slice completion.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC1)

#### Scenario: Adoption updates semantics docs
- **WHEN** baseline scripts and `AGENTS.md` are formally adopted
- **THEN** context/package semantics documentation MUST describe that adoption and MUST NOT mark `w00-s02+` work complete
