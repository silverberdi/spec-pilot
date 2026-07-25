# Scope

## Initial release in scope

- Register multiple local macOS repositories.
- Require and validate `.specpilot/project.yaml`.
- Support generic OpenSpec projects and optional configurable wave/slice enrichment.
- Discover Git and OpenSpec state without modifying the target repository.
- Build stage-specific minimal context bundles.
- Detect and exclude secrets and prohibited paths.
- Use DeepSeek V4 Flash and Pro through the official API.
- Enforce a configurable monthly USD budget with an initial hard cap of USD 10.
- Review `new`, planning, applied implementation, and Verify readiness.
- Persist projects, configuration versions, runs, evidence metadata, findings, prompts, token usage, and costs in PostgreSQL.
- Angular 22 + PrimeNG console in Spanish, i18n-ready, light/dark/system.
- Copy generated prompts and commands explicitly from the UI.

## Explicitly out of scope for initial release

- Editing target repositories.
- Running Cursor, Cline, Codex, OpenCode, OpenSpec workflows, Git, tests, commits, Pull Requests, sync, archive, or merges from SpecPilot.
- Authentication and multiuser behavior.
- Remote repositories without a local checkout.
- Windows or Linux support.
- Providers other than DeepSeek.
- Autonomous loops or silent retries that spend budget.
- Trusting task checkboxes without evidence.
