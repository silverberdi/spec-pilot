# Business Intent

## Problem

OpenSpec-driven delivery across Cursor, Codex, and other executors requires repeated manual work: locating canonical context, determining the next valid change, reviewing proposal/design/specs/tasks, identifying missing coverage or future-scope leakage, checking applied implementation, and drafting corrective prompts. This creates context switching, inconsistent review quality, and premature transitions.

## Intent

SpecPilot provides a vendor-neutral assurance layer between OpenSpec and AI executors. It reads evidence, evaluates readiness, and produces deterministic workflow verdicts with a single consolidated prompt or command for the assigned executor.

## Initial business value

- Reduce time spent transporting context between tools.
- Detect planning defects before `apply`.
- Detect implementation gaps before `verify`.
- Prevent `sync` when Verify is not exactly `PASS` or evidence is incomplete.
- Preserve a complete local audit trail in PostgreSQL.
- Keep DeepSeek API spending under a configurable monthly hard cap, initially USD 10.
- Establish reusable multi-project foundations before introducing automation.

## Non-commercial starting position

The initial product is for local personal use without authentication. The architecture must support later Google authentication and project ownership without implementing premature multi-tenancy.
