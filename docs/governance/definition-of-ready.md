# Definition of Ready

A slice is ready to propose when:

- predecessor dependencies are satisfied;
- wave and slice scope are canonical;
- included User Stories and acceptance criteria exist;
- Cursor is identified as the implementer;
- expected change ID is declared;
- out-of-scope boundaries are explicit;
- validation expectations and any required human decisions are known.

A change is `APPLY_READY` when proposal, design, specs, and tasks are complete, mutually consistent, validated, and sufficient for Cursor to receive only `/opsx-apply <change>`.
