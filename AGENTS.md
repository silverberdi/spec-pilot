# SpecPilot Agent Operating Contract

Adopted operating contract for Cursor, Codex, and OpenCode on this repository.
Formal adoption is delivered by `chg-w00-s01-repository-governance-and-openspec-foundation`
(`w00` / `w00-s01-repository-governance-and-openspec-foundation`). Presence of later-wave
product docs does **not** complete `w00-s02+` or future waves.

## Product

SpecPilot is a local-first macOS multi-project assurance console for OpenSpec-governed delivery.

Canonical stack (future waves; **not** in `w00-s01`):

- Nx monorepo
- Angular 22 + PrimeNG + PrimeIcons
- NestJS + Fastify
- PostgreSQL + Prisma
- DeepSeek V4 Flash and Pro under a USD 10 monthly hard cap
- Mandatory `.specpilot/project.yaml`
- Read-only initial product behavior
- Google authentication only after the initial unauthenticated phase

## Delivery authority

- Hierarchy: `Roadmap → Wave → Slice → User Stories → OpenSpec tasks`
- Machine IDs and change names: lowercase kebab-case (`chg-<slice-id>`)
- Branch model: `slice/* → wave/* → main` (slice PRs target the wave branch)
- Verify must be exactly `PASS` (no PASS WITH NOTES)
- Imported/package docs remain planning context until adopted by a change with evidence
- Deviations require synchronized roadmap/backlog/wave/User Story/OpenSpec updates before work resumes

## OpenSpec environment (authority)

- OpenSpec CLI `1.6.0`, schema `spec-driven`, profile `custom`, delivery `both`
- Active workflows include `update` plus propose, explore, new, continue, apply, ff, sync, archive, bulk-archive, verify, onboard
- Generated integrations under `.cursor/commands/`, `.cursor/skills/`, `.codex/skills/`, `.opencode/commands/`, and `.opencode/skills/` are **immutable**; refresh only with official `openspec update` (never hand-edit)

## Roles

- Implementer (default): Cursor
- Mandatory reviewer (default): Codex
- OpenCode is an available integration surface; do not invent ownership or multi-agent orchestration without an approved change

## Scope for this foundation slice

Bound User Stories:

- `us-w00-s01-repository-governance-and-openspec-foundation-001`
- `us-w00-s01-repository-governance-and-openspec-foundation-002`
- `us-w00-s01-repository-governance-and-openspec-foundation-003`

**Persistence impact:** none. **Product UI/API impact:** none.

**Exclusions:** Nx, Angular, PrimeNG, NestJS, PostgreSQL, Prisma, Docker, DeepSeek, authentication, application runtime, GitHub Actions implementation, and all `w00-s02+` / future-wave implementation.

## Safety

- Never commit secrets, credentials, or live `.env` files.
- Prefer deterministic validation scripts under `scripts/`.
- Do not treat checkbox completion as evidence; retain file/transcript evidence for success and failure paths.
