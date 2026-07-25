# SpecPilot — Canonical Project Package

SpecPilot is a local-first, multi-project delivery assurance console for OpenSpec-governed software projects. Its initial release adds a supervised DeepSeek validation layer around next-work guidance, planning readiness, applied implementation review, and Verify/sync readiness. It reads target repositories but does not edit them or execute delivery actions in the initial scope.

## Current development operating model

- Cursor is the only implementer of the SpecPilot codebase.
- Cline with DeepSeek may be used as an optional read-only validation assistant.
- Codex and OpenCode have no current development, review, validation, or governance role.
- Generated integrations for other tools may exist, but installed integration files do not assign project roles.
- OpenSpec remains the workflow authority.

## First-release technology direction

- macOS local deployment.
- Nx monorepo.
- Angular 22 web console with PrimeNG and PrimeIcons.
- NestJS API using Fastify.
- PostgreSQL with Prisma as the only operational persistence path.
- DeepSeek Flash and Pro under a configurable monthly hard cap, initially USD 10.
- Spanish-first UI, i18n-ready, light/dark/system appearance.
- No authentication initially; Google authentication is a later capability.
- Mandatory `.specpilot/project.yaml` in every registered repository.

## Canonical delivery hierarchy

`Roadmap → Wave → Slice → User Stories → OpenSpec tasks`

One slice normally maps to one lowercase kebab-case OpenSpec change. The package does not impose an unapproved branch or Pull Request model; repository governance must explicitly define one before it becomes binding.

## Bootstrap sequence

1. Create an empty repository named `spec-pilot` on `main`.
2. Copy this package into the repository root.
3. Initialize OpenSpec for Cursor using the official CLI. Optional integrations may be installed without assigning them project roles.
4. Reconcile and validate the imported baseline without creating an OpenSpec change.
5. Commit and publish the reviewed baseline.
6. Create `chg-w00-s01-repository-governance-and-openspec-foundation` through OpenSpec.
7. Stop when its planning artifacts are `APPLY_READY`; do not apply without explicit approval.

Imported documents are planning candidates, not completed implementation.
