# Package Summary Semantics

`package-summary.json` is the inventory manifest for the imported SpecPilot canonical package.

## `fileCount` excludes itself

`fileCount` equals `len(files)` and **intentionally excludes** `package-summary.json` itself.

Example at import time:

- 170 paths listed in `files`
- `package-summary.json` present on disk but not listed
- therefore 171 package-root files when counting the summary file as well
- generated OpenSpec integrations under `.cursor/commands`, `.cursor/skills`, `.codex/skills`, `.opencode/commands`, and `.opencode/skills` are excluded from this inventory

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

## Candidate baseline artifacts

Files such as `.gitignore`, `AGENTS.md`, `.cursor/rules/**`, and `scripts/**` created during baseline reconciliation are candidates for formal adoption through `w00-s01`. Their presence does not complete that slice or its User Stories.
