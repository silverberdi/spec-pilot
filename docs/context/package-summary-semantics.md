# Package Summary Semantics

`package-summary.json` is the inventory manifest for the SpecPilot canonical package.

## `fileCount` excludes itself

`fileCount` equals `len(files)` and **intentionally excludes** `package-summary.json` itself.

Also excluded from `files` / `fileCount`:

- generated OpenSpec integrations under `.cursor/commands`, `.cursor/skills`, `.codex/skills`, `.opencode/commands`, and `.opencode/skills`
- candidate baseline reconciliation artifacts listed under `candidateBaselineFiles`

Do not “fix” the count by adding `+1` for the summary file without changing the documented semantics.

## Regeneration

Use:

```bash
python3 scripts/regenerate-package-summary.py
```

The regenerator:

- inventories `README.md`, `bootstrap/**`, `docs/**`, and `openspec/config.yaml`
- excludes generated integrations and `package-summary.json` from `files` / `fileCount`
- records reconciliation candidate artifacts under `candidateBaselineFiles` (outside `fileCount`)
- refreshes `waveCount`, `sliceCount`, and `userStoryCount` from live docs

Expected live counts for this baseline:

- 12 waves
- 42 slices
- 126 User Stories

## Candidate baseline artifacts

Files such as `.gitignore`, `AGENTS.md`, `.cursor/rules/**`, and `scripts/**` created during baseline reconciliation are candidates for formal adoption through `w00-s01`. Their presence does not complete that slice or its User Stories.

## Roles reminder

Cursor is the only current implementer. Cline with DeepSeek is optional and read-only. Codex and OpenCode have no current project role. Generated integration inventories are not governance authority.
