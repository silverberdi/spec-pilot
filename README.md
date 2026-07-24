# SpecPilot — Canonical Project Package

SpecPilot is a local-first, multi-project delivery assurance console for OpenSpec-governed software projects. Its first release adds a supervised DeepSeek validation layer around `new`, planning readiness, applied implementation review, and verify/sync readiness. It does not edit repositories or execute delivery actions in the initial scope.

## Canonical product statement

SpecPilot reduces context switching, planning defects, scope drift, and premature OpenSpec transitions by reading a registered project's canonical context, evaluating evidence, and producing one structured verdict plus one ready-to-copy instruction for the assigned executor.

## First-release technology direction

- macOS local deployment.
- Nx monorepo.
- Angular 22 web console with PrimeNG and PrimeIcons.
- NestJS API using Fastify.
- PostgreSQL with Prisma as the only operational persistence store.
- DeepSeek V4 Flash and DeepSeek V4 Pro.
- OpenSpec as the delivery authority.
- No authentication initially; Google authentication is the first post-MVP capability.
- Mandatory `.specpilot/project.yaml` in every registered repository.

## How this package is used

1. Work in the existing `spec-pilot` Git repository on `main` (already initialized; no commits yet until the governed baseline is reviewed).
2. OpenSpec 1.6.0 is already installed with schema `spec-driven`, profile `custom`, delivery `both`, and all 12 workflows active (including `update`).
3. Cursor, Codex, and OpenCode integrations already exist. Refresh them only with official `openspec update`; do not edit generated integration files manually.
4. Give Cursor `bootstrap/cursor-bootstrap-prompt.md` for baseline reconciliation only.
5. Cursor must reconcile the imported package, validate cross-document consistency, and prepare candidate baseline artifacts. Do not create the first OpenSpec change until the governed baseline is committed and published. Never treat imported documents as completed implementation.

## Delivery hierarchy

`Roadmap → Wave → Slice → User Stories → OpenSpec tasks`

One slice normally maps to one lowercase kebab-case OpenSpec change named `chg-<slice-id>`.

## First expected change (after baseline commit)

`chg-w00-s01-repository-governance-and-openspec-foundation`
