# Toolchain pins — chg-w00-s04-ci-quality-and-security-baseline

| Component | Version / pin |
|---|---|
| Node.js (local evidence host) | v24.13.1 (engines: ^24.15.0; CI uses Node 24.x via actions/setup-node) |
| Nx | 23.1.0 (nx and all @nx/* identical) |
| eslint | 9.39.5 |
| @eslint/js | 9.39.5 |
| @nx/eslint | 23.1.0 |
| @nx/eslint-plugin | 23.1.0 |
| typescript-eslint | 8.65.0 |
| TypeScript | 6.0.3 (existing) |
| actions/checkout | v4 |
| actions/setup-node | v4 |
| Workflow Node | '24' |
| Typecheck gate | `tsc --noEmit` on shared-contracts lib + api/web app tsconfigs (`npm run typecheck`); Nx `emitDeclarationOnly` typecheck targets left unused by the gate due to web spec moduleResolution incompatibility |

Install: clean `npm install` without `--legacy-peer-deps` or `--force`.
Nx Cloud: disabled (`nx.json` analytics: false).
Typescript sync generator: disabled in `nx.json` (`sync.disabledTaskSyncGenerators: ["@nx/js:typescript-sync"]`) to avoid broken project-reference typecheck.
