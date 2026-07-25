# Delivery Methodology

## Hierarchy

`Roadmap → Wave → Slice → User Stories → OpenSpec tasks`

## Operating roles

- Cursor owns SpecPilot planning and implementation.
- Cline with DeepSeek may perform optional read-only validation and return a suggested `/opsx-apply` or `/opsx-update` instruction for Cursor.
- Codex and OpenCode have no current project role.
- Installed integrations never imply implementation or review responsibility.

## Rules

- Every slice has exactly one expected OpenSpec change unless an approved exception is documented.
- IDs and change names are lowercase kebab-case.
- Imported package artifacts are planning candidates, not completed implementation.
- No hidden deferred acceptance criteria.
- Deviations require synchronized roadmap/backlog/wave/User Story/OpenSpec updates before work resumes.
- No agent-specific review verdict is required unless a later approved change introduces one.

## Working policy (binding)

See `docs/governance/working-policy.md`. Summary:

- All SpecPilot work is performed directly on `main`.
- No branches are created per OpenSpec change.
- Pull Requests are not used.
- No `slice/* → wave/* → main` hierarchy is adopted.
- Cursor must not switch branches.
- Cursor must not create commits or push without explicit operator approval.
- Applicable validations must run and be reported before every commit or push.
- The operator retains final approval over commit, push, Verify, sync, and archive.

## Lifecycle gates and operator approval

- Planning must be `APPLY_READY` before apply.
- Verify, sync, and archive each require explicit operator approval.
- Verify must be exactly `PASS`; `PASS WITH NOTES` is not closure.
- Sync follows Verify `PASS`; archive follows successful sync and closure checks.
