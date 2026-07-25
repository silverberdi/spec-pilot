# SpecPilot Operating Contract

## Authority and scope

OpenSpec is the delivery authority for SpecPilot. Delivery follows:

`Roadmap → Wave → Slice → User Stories → OpenSpec tasks`

The active wave, slice, expected change, and bound User Stories must be read from the canonical repository sources before work begins. Later-slice and future-wave scope must not be introduced into an active change.

## Current development roles

- **Cursor is the only current implementer of the SpecPilot codebase.** Cursor creates and updates OpenSpec planning artifacts, applies approved changes, edits repository files, runs validations, and maintains task evidence.
- **Cline with DeepSeek is optional and read-only when used for validation.** It may inspect planning or implementation evidence and suggest a ready-to-copy `/opsx-apply` or `/opsx-update` instruction for Cursor. It must not edit files, apply changes, create branches, commit, push, verify, sync, or archive.
- **Codex and OpenCode have no current development, review, validation, or governance role.** Generated integrations may exist, but their presence does not assign an operational role.
- Future product capabilities may integrate additional tools or runtimes. Those future integration targets do not participate in developing SpecPilot unless a later approved change explicitly says otherwise.

## OpenSpec lifecycle

1. Create or select the expected lowercase kebab-case change.
2. Produce complete proposal, design, specs, and tasks.
3. Reach `APPLY_READY` before implementation.
4. Cursor applies the approved change and records deterministic evidence.
5. OpenSpec Verify must be exactly `PASS` (operator-approved).
6. Synchronize canonical specs and documentation only after Verify `PASS` (operator-approved).
7. Archive only after successful synchronization and closure checks (operator-approved).

`PASS WITH NOTES` does not authorize closure.

## Generated integrations

Generated OpenSpec integrations are immutable and may be refreshed only with `openspec update`. Do not manually edit generated commands or skills under tool-specific integration directories.

Installed integration support must not be interpreted as project participation or governance authority.

## Working policy (binding)

- All SpecPilot work is performed directly on `main`.
- Do not create branches per OpenSpec change.
- Do not use Pull Requests.
- Do not adopt a `slice/* → wave/* → main` branch hierarchy.
- Cursor must not switch branches.
- Cursor must not create commits or push without explicit operator approval.
- Before every commit or push, run applicable validations and report their results to the operator.
- The operator retains final approval over commit, push, Verify, sync, and archive.
- Canonical details: `docs/governance/working-policy.md`.

## Safety and repository discipline

- Never commit secrets, credentials, tokens, cookies, private keys, or sensitive request/response bodies.
- Prefer reversible, non-destructive recovery steps.
- Do not claim a User Story, slice, or wave complete without the required evidence and exact Verify `PASS`.
- Do not treat imported or pre-existing artifacts as completed delivery merely because they are present.
- Machine identifiers, paths used as IDs, and OpenSpec change names must use lowercase kebab-case where applicable.
- Use the generated hyphen command syntax in operator-facing instructions, such as `/opsx-apply`, `/opsx-update`, `/opsx-verify`, `/opsx-sync`, and `/opsx-archive`.
