# Openspec Verified Lifecycle

## Purpose

Capability adopted by `chg-w00-s01-repository-governance-and-openspec-foundation`.

## Requirements

### Requirement: OpenSpec remains delivery authority
SpecPilot delivery MUST use the installed OpenSpec environment (CLI `1.6.0`, schema `spec-driven`, profile `custom`, delivery `both`) and MUST NOT invent a parallel lifecycle.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC1)

#### Scenario: Environment matches canonical baseline
- **WHEN** operators inspect OpenSpec configuration for this repository
- **THEN** schema MUST be `spec-driven`, profile MUST be `custom`, delivery MUST be `both`, and active workflows MUST include `update` plus propose, explore, new, continue, apply, ff, sync, archive, bulk-archive, verify, and onboard

### Requirement: Exact Verify PASS
Verify MUST accept only the exact result `PASS`. Results such as `PASS WITH NOTES` or any non-`PASS` outcome MUST block synchronized closure.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC5), `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC5), `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC2, AC5)

#### Scenario: Verify PASS allows closure progression
- **WHEN** OpenSpec Verify returns exactly `PASS` and no unresolved closure gate remains
- **THEN** the change MAY proceed to sync and archive per ordered gates

#### Scenario: Non-exact PASS blocks closure
- **WHEN** Verify returns any value other than exactly `PASS`
- **THEN** sync, archive, and merge eligibility MUST remain blocked

### Requirement: Sync before archive ordering
Delta specs MUST be synchronized to main specs where applicable before the change is archived, and archive MUST NOT occur while Verify is not exactly `PASS` or while required closure gates remain open.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC5), `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC5), `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC5)

#### Scenario: Ordered closure
- **WHEN** implementation evidence is complete and Verify is exactly `PASS`
- **THEN** operators MUST sync applicable delta specs, then archive, then regenerate final context integrity artifacts

### Requirement: Deviation synchronization
Material deviations from roadmap, backlog, wave contract, User Stories, or OpenSpec artifacts MUST be synchronized across those sources before work resumes.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC1, AC5)

#### Scenario: Scope deviation detected
- **WHEN** accepted work would change slice scope or User Story binding
- **THEN** roadmap/wave/backlog/User Story/OpenSpec artifacts MUST be updated together before implementation continues
