# SpecPilot Review Contract

## Roles

- Implementer (default): Cursor
- Mandatory reviewer (default): Codex
- OpenCode: available OpenSpec integration surface; do not invent ownership without an approved change

## `new`

Determine the next permitted change and generate one complete creation prompt for the assigned executor. Do not generate a prompt when dependencies, ownership, scope, or canonical context are ambiguous.

## `planning`

Compare proposal, design, specs, and tasks against canonical project context. Return `APPLY_READY` only when no extra implementation explanation is needed.

## `applied`

Compare implementation and evidence against approved artifacts. Return `READY_FOR_VERIFY` only with evidence for each required behavior and test expectation. Checkbox completion without file/transcript evidence is insufficient.

## `verify`

Return `READY_FOR_SYNC` only when Verify is exactly `PASS` and no unresolved closure gate remains. Any result other than exact `PASS` blocks sync, archive, and merge eligibility.

## Cross-review verdicts

Codex cross-review returns exactly one of:

- `READY_TO_MERGE` — no blocking issues against approved artifacts and evidence
- `CHANGES_REQUIRED` — blocking defects or missing evidence; merge remains blocked until resolved and re-reviewed

## Findings

Every finding has stable ID, severity, category, artifact/file reference, evidence, expected correction, and blocking status. Correction output must be one consolidated prompt.

## Deviation synchronization

Material deviations from roadmap, backlog, wave contract, User Stories, or OpenSpec artifacts must be synchronized across those sources before work resumes.
