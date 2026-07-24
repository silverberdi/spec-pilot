# SpecPilot Canonical File Index

Context index for operator orientation. Integrity regeneration is part of
`chg-w00-s01-repository-governance-and-openspec-foundation`.

## Package inventory (imported)

| Area | Path |
|---|---|
| Entry | `README.md` |
| Bootstrap | `bootstrap/cursor-bootstrap-prompt.md` |
| Bootstrap | `bootstrap/first-change-brief.md` |
| Bootstrap | `bootstrap/validation-checklist.md` |
| Product | `docs/product/**` |
| Architecture | `docs/architecture/**` |
| Configuration | `docs/configuration/**` |
| Context | `docs/context/**` |
| Decisions | `docs/decisions/**` |
| Governance | `docs/governance/**` |
| Roadmap | `docs/roadmap/roadmap.md` |
| Waves | `docs/waves/*/wave-contract.md` |
| Backlog | `docs/backlog/backlog-index.md` |
| User Stories | `docs/backlog/user-stories/*.md` |
| Security | `docs/security/**` |
| Testing | `docs/testing/**` |
| Research | `docs/research/**` |
| OpenSpec config | `openspec/config.yaml` |
| Package manifest | `package-summary.json` (counts other package files; excludes itself) |

## Generated integrations (immutable)

| Surface | Path | Expected files |
|---|---|---|
| Cursor commands | `.cursor/commands/` | 12 |
| Cursor skills | `.cursor/skills/` | 12 |
| Codex skills | `.codex/skills/` | 12 |
| OpenCode commands | `.opencode/commands/` | 12 |
| OpenCode skills | `.opencode/skills/` | 12 |

Refresh only with `openspec update`. Never hand-edit these trees.

## Adopted baseline artifacts (`w00-s01`)

| Artifact | Path |
|---|---|
| Shared operator contract | `AGENTS.md` |
| Git ignore | `.gitignore` |
| Cursor project rules | `.cursor/rules/spec-pilot-governance.mdc` |
| Baseline validation | `scripts/validate-baseline.sh` |
| Delivery graph validation | `scripts/validate-delivery-graph.py` |
| Secret scan | `scripts/scan-secrets.py` |
| Package summary regenerator | `scripts/regenerate-package-summary.py` |
| This index | `docs/context/file-index.md` |
| Summary semantics | `docs/context/package-summary-semantics.md` |
| Current state | `docs/context/current-state.md` |

## Active first change

- Wave: `w00`
- Slice: `w00-s01-repository-governance-and-openspec-foundation`
- Change: `chg-w00-s01-repository-governance-and-openspec-foundation`
- Stories: `us-w00-s01-repository-governance-and-openspec-foundation-001`, `us-w00-s01-repository-governance-and-openspec-foundation-002`, `us-w00-s01-repository-governance-and-openspec-foundation-003`
- Persistence / UI-API impact: none
