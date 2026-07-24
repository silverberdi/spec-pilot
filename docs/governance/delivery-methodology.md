# Delivery Methodology

## Hierarchy

`Roadmap → Wave → Slice → User Stories → OpenSpec tasks`

## OpenSpec environment authority

- CLI: `1.6.0`
- Schema: `spec-driven`
- Profile: `custom`
- Delivery: `both`
- Active workflows include `update` plus propose, explore, new, continue, apply, ff, sync, archive, bulk-archive, verify, onboard

## Rules

- Every slice has exactly one expected OpenSpec change unless an approved exception is documented.
- IDs and change names are lowercase kebab-case; expected change name is `chg-<slice-id>`.
- Imported package artifacts are planning candidates until adopted by a change with evidence.
- One executor owns a slice end-to-end; the other executor performs cross-review when the wave contract requires it.
- Default implementer: Cursor. Mandatory reviewer: Codex. OpenCode is an integration surface only.
- Verify must be exactly `PASS` before synchronized closure (no `PASS WITH NOTES`).
- Sync applicable delta specs before archive; archive only after Verify `PASS` and remaining DoD gates.
- No hidden deferred acceptance criteria.
- Deviations require synchronized roadmap/backlog/wave/User Story/OpenSpec updates before work resumes.

## Branch model

`slice/* → wave/* → main`

- Slice PRs target the active wave branch.
- Wave PRs target `main`.
- Direct pushes to protected integration branches are invalid process.
- A draft PR may exist for visibility; it is non-merge-eligible until Definition of Done, exact Verify `PASS`, Codex `READY_TO_MERGE` (when required), and human GitHub validation are satisfied.

## Immutable generated integrations

Do not hand-edit `.cursor/commands/`, `.cursor/skills/`, `.codex/skills/`, `.opencode/commands/`, or `.opencode/skills/`. Refresh only with `openspec update`.
