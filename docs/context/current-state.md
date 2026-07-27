# Current State

Lifecycle: `w00-s04-archived`

- Product name: SpecPilot
- Repository: `spec-pilot`
- Active wave: `w00`
- Active change: none (archived `chg-w00-s04-ci-quality-and-security-baseline`)
- Completed archived slices: `w00-s01` … `w00-s04-ci-quality-and-security-baseline`
- Cursor is the only current implementer.
- Working policy: main-only (no per-change branches, no Pull Requests).
- Quality gates: mandatory local `npm run quality-gates` before commit/push; GitHub Actions `.github/workflows/ci-quality-gates.yml` is post-push remote verification only.
- Nx dependency boundaries enforced via tags + `@nx/enforce-module-boundaries`.
- Persistence baseline from `w00-s03` retained.
- Next: begin `w01` when authorized.
