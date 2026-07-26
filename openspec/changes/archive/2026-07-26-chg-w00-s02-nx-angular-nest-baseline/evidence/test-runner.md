# Test runner — chg-w00-s02-nx-angular-nest-baseline

Selected runner: **Jest** (via `@nx/jest` and `jest-preset-angular` for web).

Rationale:
- Nx 23.1.0 generators for Nest (`api`) and the shared JS library defaulted to / were configured with Jest.
- Angular `web` was generated with `--unitTestRunner=jest` for consistency across `web`, `api`, and `shared-contracts`.
- Jest and Vitest are not mixed.

Recorded: 2026-07-25 during `/opsx-apply`.
