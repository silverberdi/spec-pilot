# SpecPilot Agent Operating Contract

This file is a **candidate baseline artifact**. Formal adoption, verification, and completion happen through `w00-s01` / `chg-w00-s01-repository-governance-and-openspec-foundation`. Presence here does not complete that slice or its User Stories.

## Product

SpecPilot is a local-first macOS multi-project assurance console for OpenSpec-governed delivery.

Canonical stack (future waves; not in `w00-s01`):

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
- Verify must be exactly `PASS` (no PASS WITH NOTES)
- Imported/package docs are planning candidates until adopted by a change with evidence

## OpenSpec environment (already initialized)

- OpenSpec 1.6.0, schema `spec-driven`, profile `custom`, delivery `both`
- Active workflows include `update` plus propose, explore, new, continue, apply, ff, sync, archive, bulk-archive, verify, onboard
- Generated integrations under `.cursor/`, `.codex/`, and `.opencode/` are immutable; refresh only with `openspec update`

## Roles

- Implementer (default): Cursor
- Mandatory reviewer (default): Codex
- OpenCode is an available integration surface; do not invent ownership without an approved change

## Baseline vs delivery

1. Baseline reconciliation reconciles docs and candidate artifacts only.
2. Do not create the first OpenSpec change until the governed baseline is committed and published.
3. First expected change: `chg-w00-s01-repository-governance-and-openspec-foundation`
4. That change excludes Nx, Angular, PrimeNG, NestJS, PostgreSQL, Prisma, Docker, DeepSeek, authentication, and all `w00-s02+` / future-wave implementation.

## Safety

- Never commit secrets, credentials, or live `.env` files.
- Prefer deterministic validation scripts under `scripts/`.
- Do not treat checkbox completion as evidence.
