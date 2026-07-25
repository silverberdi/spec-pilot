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
- Planning must be `APPLY_READY` before apply.
- Verify must be exactly `PASS`; `PASS WITH NOTES` is not closure.
- Sync follows Verify `PASS`; archive follows successful sync and closure checks.
- No hidden deferred acceptance criteria.
- Deviations require synchronized roadmap/backlog/wave/User Story/OpenSpec updates before work resumes.

## Branch and Pull Request policy

The package does not impose a universal `slice/* → wave/* → main` model. The first governance change must document the branch and Pull Request policy actually approved for this repository before that policy becomes binding.
