# Toolchain — chg-w00-s02-nx-angular-nest-baseline

Recorded during `/opsx-apply` on 2026-07-25. Updated after planning reconciliation (Nx 22 → Nx 23).

## Node.js

| Item | Value |
|---|---|
| Official Angular 22 Node range (angular.dev) | `^22.22.3 \|\| ^24.15.0 \|\| ^26.0.0` |
| Selected runtime | Node.js `24.18.0` (LTS Krypton) |
| npm | `11.16.0` (bundled with Node 24.18.0) |
| Notes | Host may default to an older 24.x; select `24.18.0` via nvm before install/scaffold. |

## Conflict: Nx 22 discarded during apply

| Item | Detail |
|---|---|
| Prior binding | Nx major 22 (`nx` / `@nx/*` at `22.7.7`) with Angular major 22 |
| Failure | `@nx/angular@22.7.7` peer range did not admit `@angular/build` 22 |
| Side effect | Partial `apps/web` scaffold was created; install path attempted Angular 21 (`~21.2.0` in root `package.json`) |
| Decision | Keep Angular 22; move to Nx major 23 with minimum `23.1.0`; identical `nx` / `@nx/*` versions; no `--legacy-peer-deps` / `--force` |
| Official combination | `@nx/angular@23.1.0` peers include `@angular/build` `>= 20.0.0 < 23.0.0` (covers Angular 22) |

## Binding majors / resolved targets

Concrete minor/patch versions below are the apply-time targets after reconciliation. Exact lockfile resolutions are confirmed after clean `npm install` / `npm ci` in the root `package-lock.json`.

| Component | Major constraint | Target version |
|---|---|---|
| Nx (`nx` and all `@nx/*`) | 23, identical, minimum `23.1.0` | `23.1.0` |
| Angular (`@angular/*`) | 22 | `22.0.8` |
| PrimeNG | 22 | `22.0.0` |
| PrimeIcons | as required by PrimeNG 22 | `primeicons@8.0.0` and/or `@primeicons/angular@8.x` per PrimeNG 22 install guidance |
| Official themes package | required by PrimeNG 22 | `@primeuix/themes` / `@primeuix/styles` as resolved with PrimeNG 22.0.0 |
| NestJS (`@nestjs/*`) | 11 | `11.1.28` |
| Fastify (via `@nestjs/platform-fastify`) | 5 | Fastify major 5 through `@nestjs/platform-fastify@11.1.28` |
| TypeScript | Angular 22 range `>=6.0.0 <6.1.0` | `6.0.3` |

## Lockfile-confirmed resolutions (after clean install)

| Package | Resolved |
|---|---|
| `nx` / all `@nx/*` | `23.1.0` |
| `@angular/core` / `@angular/build` | `22.0.8` |
| `primeng` | `22.0.0` |
| `primeicons` | `8.0.0` |
| `@primeuix/themes` | `3.0.0` |
| `@nestjs/core` / `@nestjs/platform-fastify` | `11.1.28` |
| `typescript` | `6.0.3` |

## Cleanup performed (task 2.3)

| Action | Result |
|---|---|
| Inspected `apps/web` | Incomplete package-based stub (no `package.json`); produced under failed Nx 22 / Angular 21 path |
| Removed | Entire `apps/web` tree |
| Retained | `apps/api` Nest scaffold sources; `packages/shared-contracts` |
| Root manifests | Rewrote `package.json` to Nx `23.1.0` (identical `@nx/*`); removed Angular 21 and Nx 22 entries; deleted stale `package-lock.json` and `node_modules` |
| Reinstall | Clean `npm install` without `--legacy-peer-deps` or `--force`; lockfile regenerated for Nx 23.1.0 |

## Package manager policy

- npm workspaces only
- Root `package.json` private with `workspaces: ["apps/*", "packages/*"]`
- Single root `package-lock.json`
- pnpm / Yarn / Bun prohibited
- Nx Cloud disabled
- CI generation disabled
- `npm install` / `npm ci` without `--legacy-peer-deps`, `--force`, or other peer-dependency bypass
