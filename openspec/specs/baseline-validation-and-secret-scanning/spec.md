# Baseline Validation And Secret Scanning

## Purpose

Capability adopted by `chg-w00-s01-repository-governance-and-openspec-foundation`.

## Requirements

### Requirement: Baseline validation entrypoint
The repository MUST provide `scripts/validate-baseline.sh` as a deterministic validation entrypoint that orchestrates OpenSpec checks, integration inventories, delivery-graph validation, package-summary semantics checks, secret scanning, and relevant git hygiene assertions appropriate to the current lifecycle phase.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC1, AC2), `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC2)

#### Scenario: Successful validation exits clean
- **WHEN** repository state satisfies adopted validation rules for the current phase
- **THEN** `scripts/validate-baseline.sh` MUST exit 0 and print an explicit success summary

#### Scenario: Failed check exits non-zero
- **WHEN** any required validation step fails
- **THEN** `scripts/validate-baseline.sh` MUST exit non-zero and identify failing checks

### Requirement: Phase-aware baseline assertions
After the governed baseline commit and creation of this first change, validation MUST NOT require the obsolete baseline-only assertion that zero active OpenSpec changes exist; it MUST still block product scaffolding excluded from this slice.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC1)

#### Scenario: Active first change does not fail phase-aware validation solely by existing
- **WHEN** only the expected first change directory exists under `openspec/changes` (plus archive scaffold)
- **THEN** phase-aware validation MUST allow that state while still failing on unexpected product scaffolding such as `apps/`, `packages/`, or root `package.json`

### Requirement: Secret scanning fail-closed
`scripts/scan-secrets.py` MUST scan tracked repository content with heuristic secret patterns, exclude generated OpenSpec integration trees from that scan per policy, and fail closed when disallowed secret-like material is detected.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC2, AC3)

#### Scenario: Clean tree passes
- **WHEN** no disallowed secret patterns are present in scanned files
- **THEN** secret scanning MUST exit 0

#### Scenario: Detected secret fails
- **WHEN** a scanned file contains a disallowed credential pattern that is not allowlisted as documentation example
- **THEN** secret scanning MUST exit non-zero and block validation success

### Requirement: No secrets committed
Operators MUST NOT commit live `.env` files, credentials, API keys, or private key material as part of this change.
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC3), `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC1)

#### Scenario: Secret commit attempt blocked by policy and scan
- **WHEN** a live secret file is introduced into the working tree
- **THEN** `.gitignore` rules and/or secret scanning MUST prevent successful validation closure

### Requirement: Explicit safe auditable validation outcomes
Validation and secret-scan tools MUST produce explicit, safe success and failure outcomes, and operators MUST retain auditable file or transcript evidence of those outcomes for this slice (no operational database persistence).
**Traces to:** `us-w00-s01-repository-governance-and-openspec-foundation-001` (AC3), `us-w00-s01-repository-governance-and-openspec-foundation-002` (AC3), `us-w00-s01-repository-governance-and-openspec-foundation-003` (AC3)

#### Scenario: Failure outcome is explicit and retained
- **WHEN** `scripts/validate-baseline.sh`, `scripts/validate-delivery-graph.py`, or `scripts/scan-secrets.py` fails
- **THEN** the tool MUST exit non-zero with an explicit failure indication, and the transcript MUST be retained as change evidence

#### Scenario: Success outcome is explicit and retained
- **WHEN** the same validators succeed
- **THEN** they MUST exit 0 with an explicit success indication, and the transcript MUST be retained as change evidence
