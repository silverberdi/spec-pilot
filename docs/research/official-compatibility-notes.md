# Official Compatibility Notes — verified 2026-07-24

- Angular 22 is active; official compatibility lists Node.js `^22.22.3 || ^24.15.0 || ^26.0.0` and TypeScript `>=6.0.0 <6.1.0` for Angular 22.0.x.
- OpenSpec official installation requires Node.js 20.19.0 or higher, but the repository should select a Node version satisfying both Angular and OpenSpec.
- OpenSpec supports custom workflow selection and Cursor, Codex, OpenCode, DeepSeek-adjacent tools through generated integrations. This repository already has Cursor, Codex, and OpenCode integrations generated; refresh them only with `openspec update`. Initial product delivery ownership remains Cursor (implementer) and Codex (reviewer).
- DeepSeek official current model IDs are `deepseek-v4-flash` and `deepseek-v4-pro`; legacy aliases are deprecated on 2026-07-24.
- PrimeNG major compatibility must be checked at implementation time. Do not assume a nonexistent PrimeNG 22 package merely because Angular 22 exists; select the latest officially compatible PrimeNG release and record the decision in the technical-foundation change.

Official sources:
- https://angular.dev/reference/versions
- https://angular.dev/reference/releases
- https://github.com/Fission-AI/OpenSpec/blob/main/docs/installation.md
- https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md
- https://github.com/Fission-AI/OpenSpec/blob/main/docs/commands.md
- https://github.com/Fission-AI/OpenSpec/blob/main/docs/workflows.md
- https://api-docs.deepseek.com/quick_start/pricing/
- https://primeng.org/ or the latest versioned PrimeNG installation documentation
