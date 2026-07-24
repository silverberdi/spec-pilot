# Package Summary Semantics

`package-summary.json` is the inventory manifest for the SpecPilot canonical package.

## `fileCount` excludes itself

`fileCount` equals `len(files)` and **intentionally excludes** `package-summary.json` itself.

- Paths listed in `files` are the imported package inventory.
- `package-summary.json` is present on disk but not listed.
- Generated OpenSpec integrations under `.cursor/commands`, `.cursor/skills`, `.codex/skills`, `.opencode/commands`, and `.opencode/skills` are excluded from this inventory.

Do not “fix” the count by adding `+1` for the summary file without changing the documented semantics.

## Regeneration

Use:

```bash
python3 scripts/regenerate-package-summary.py
```

The regenerator:

- inventories `README.md`, `bootstrap/**`, `docs/**`, and `openspec/config.yaml`
- excludes generated integrations and `package-summary.json` from `files` / `fileCount`
- records formally adopted baseline artifacts under `adoptedBaselineFiles` (outside `fileCount`)
- keeps `candidateBaselineFiles` empty after `w00-s01` adoption (or lists any remaining candidates)
- refreshes `waveCount`, `sliceCount`, and `userStoryCount` from live docs

## Adopted baseline artifacts (`w00-s01`)

The following were formally adopted by `chg-w00-s01-repository-governance-and-openspec-foundation`
and are tracked under `adoptedBaselineFiles` (still outside `fileCount`):

- `.gitignore`
- `AGENTS.md`
- `.cursor/rules/spec-pilot-governance.mdc`
- `scripts/validate-baseline.sh`
- `scripts/validate-delivery-graph.py`
- `scripts/scan-secrets.py`
- `scripts/regenerate-package-summary.py`

Adoption here does **not** complete `w00-s02+` or future-wave product scaffolding.
