# SpecPilot Review Contract

This document describes product review stages; it does not establish an agent-specific review gate.

## `new`

Determine the next permitted change and generate one complete creation prompt for Cursor. Do not generate a prompt when dependencies, scope, or canonical context are ambiguous.

## `planning`

Compare proposal, design, specs, and tasks against canonical project context. Return `APPLY_READY` only when no extra implementation explanation is needed; otherwise return one consolidated correction prompt.

## `applied`

Compare implementation and evidence against approved artifacts. Return `READY_FOR_VERIFY` only with evidence for each required behavior and test expectation.

## `verify`

Return `READY_FOR_SYNC` only when Verify is exactly `PASS` and no unresolved closure gate remains.

## Findings

Every finding has a stable ID, severity, category, artifact/file reference, evidence, expected correction, and blocking status. Correction output must be one consolidated prompt.
