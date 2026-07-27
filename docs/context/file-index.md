# SpecPilot Canonical File Index

Canonical context index for operator orientation. Formal integrity/generation rules are adopted through `w00-s01`.

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
| Nx workspace root | `package.json`, `package-lock.json`, `nx.json`, `tsconfig*.json`, Jest/Prettier configs |
| Web console | `apps/web/**` |
| API service | `apps/api/**` |
| Shared contracts | `packages/shared-contracts/**` |
| Prisma schema/migrations | `apps/api/prisma/**`, `apps/api/prisma.config.ts` |
| Project registration (API) | `apps/api/src/app/projects/**` |
| Project registration (web) | `apps/web` registration surface in `apps/web/src/app/*` |
| Local Compose runtime | `compose.yaml`, `compose.override.example.yaml` (local `compose.override.yaml` gitignored), `apps/api/Dockerfile`, `apps/web/Dockerfile`, `.dockerignore`, `.env.example` |
| Portable project contract (this repo) | `.specpilot/project.yaml` |
| Quality-gate orchestrator | `scripts/run-quality-gates.sh` (`npm run quality-gates`) |
| CI workflow (post-push) | `.github/workflows/ci-quality-gates.yml` |
| ESLint / Nx boundaries | `eslint.config.mjs`, project tags in `apps/*/project.json` and `packages/*/project.json` |

## Generated integrations (immutable)

| Surface | Path | Expected files |
|---|---|---|
| Cursor commands | `.cursor/commands/` | 12 |
| Cursor skills | `.cursor/skills/` | 12 |
| Codex skills | `.codex/skills/` | 12 |
| OpenCode commands | `.opencode/commands/` | 12 |
| OpenCode skills | `.opencode/skills/` | 12 |

Refresh only with `openspec update`. Generated Codex and OpenCode inventories are not a current project role; Cursor remains the only implementer.

## Repository-owned governance artifacts (adopted via w00-s01)

| Artifact | Path |
|---|---|
| Shared operator contract | `AGENTS.md` |
| Git ignore | `.gitignore` |
| Cursor project rules (manual) | `.cursor/rules/spec-pilot-governance.mdc` |
| Working policy | `docs/governance/working-policy.md` |
| Baseline validation | `scripts/validate-baseline.sh` |
| Quality gates | `scripts/run-quality-gates.sh` |
| Delivery graph validation | `scripts/validate-delivery-graph.py` |
| Secret scan | `scripts/scan-secrets.py` |
| Package summary regenerator | `scripts/regenerate-package-summary.py` |
| This index | `docs/context/file-index.md` |
| Summary semantics | `docs/context/package-summary-semantics.md` |

## Active change

- None (active OpenSpec change directory empty after archive of `chg-w00-s04-ci-quality-and-security-baseline`)
- Latest archived: `openspec/changes/archive/2026-07-26-chg-w00-s04-ci-quality-and-security-baseline`
- Prior archived: `openspec/changes/archive/2026-07-26-chg-w00-s03-postgresql-prisma-and-local-runtime`, `openspec/changes/archive/2026-07-26-chg-w00-s02-nx-angular-nest-baseline`, `openspec/changes/archive/2026-07-25-chg-w00-s01-repository-governance-and-openspec-foundation`
