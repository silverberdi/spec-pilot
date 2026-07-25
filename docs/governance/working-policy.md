# Working Policy

This policy is binding for SpecPilot repository work.

## Main-only workflow

- All SpecPilot work is performed directly on `main`.
- No branches are created per OpenSpec change.
- Pull Requests are not used.
- No `slice/* → wave/* → main` (or similar) branch hierarchy is adopted.
- Cursor must not switch branches.
- Cursor must not create commits or push without explicit operator approval.
- Before every commit or push, applicable validations must be executed and their results reported to the operator.
- The operator retains final approval over commit, push, Verify, sync, and archive.

## Operator-facing OpenSpec commands

Use the generated hyphenated command syntax, for example:

- `/opsx-apply`
- `/opsx-update`
- `/opsx-verify`
- `/opsx-sync`
- `/opsx-archive`
