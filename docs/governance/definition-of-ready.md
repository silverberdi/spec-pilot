# Definition of Ready

A slice is ready to propose when:

- predecessor dependencies are satisfied;
- wave and slice scope are canonical;
- included User Stories and acceptance criteria exist;
- implementer and reviewer are assigned (default: Cursor / Codex);
- expected change ID is declared as `chg-<slice-id>` (lowercase kebab-case);
- out-of-scope boundaries are explicit;
- target branch follows `slice/* → wave/* → main` and validation expectations are known;
- OpenSpec environment authority is understood (CLI `1.6.0`, schema `spec-driven`, profile `custom`, delivery `both`, workflows including `update`).

A change is `APPLY_READY` when proposal, design, specs, and tasks are complete, mutually consistent, validated, and sufficient for the executor to receive only `/opsx:apply <change>`.
