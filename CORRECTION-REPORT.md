# SpecPilot Correction Report

## Canonical package (final)

- Product: SpecPilot
- Waves: 12
- Slices: 42
- User Stories: 126
- Active OpenSpec changes: 0
- Lifecycle: `baseline-reconciled-awaiting-commit`

### Governance and roles (canonical)

- Cursor is the only current implementer of the SpecPilot codebase.
- Cline with DeepSeek is optional and read-only when used for validation.
- Codex and OpenCode have no current development, review, validation, or governance role.
- Generated OpenSpec integrations may exist; their presence does not assign an operational role.
- Mandatory Codex reviewer, cross-review gates, and `READY_TO_MERGE` closure semantics are not part of this baseline.
- An unapproved universal `wave/*` / `slice/*` branch model is not part of this baseline.

### Delivery binding (canonical)

- Expected change naming remains `chg-<slice-id>`.
- First expected change after the baseline commit:
  `chg-w00-s01-repository-governance-and-openspec-foundation`
- Bound stories for that change: `...-001`, `...-002`, `...-003`
- Baseline reconciliation is split from first-change creation: no OpenSpec change is created until after the reviewed baseline commit.

### Package inventory semantics (canonical)

- `package-summary.json` inventories the imported canonical package and intentionally excludes itself from `files` / `fileCount`.
- Generated OpenSpec integrations are excluded from that inventory.
- Candidate baseline reconciliation artifacts are tracked outside `fileCount` until formally adopted through `w00-s01`.
- No User Story, slice, or wave is completed merely because corrected planning artifacts are present.
- No product implementation (`apps/`, `packages/`, root `package.json`) exists yet.

## Local migration / recovery actions (non-canonical)

These notes record how the corrected baseline was brought into this working tree. They are operational history only and are not product truth.

- Replaced contaminated or inconsistent baseline content with the corrected SpecPilot package.
- Removed Content Factory example contamination from SpecPilot-owned artifacts.
- Rebuilt all 126 User Stories with correct parent/change binding and distinct purpose.
- Normalized expected change identifiers to `chg-<slice-id>`.
- Removed hardcoded unverified compatibility/model claims from SpecPilot governance and research notes where they did not belong.
- Repaired baseline validation tooling so it matches the intentionally preserved repository state while the corrected baseline awaits its reviewed commit.
- Regenerated `package-summary.json` with `scripts/regenerate-package-summary.py` after context reconciliation.
- No baseline commit or push is claimed by this report; the corrected baseline remains awaiting review and commit.
