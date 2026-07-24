# Definition of Ready

A slice is ready to propose when:

- predecessor dependencies are satisfied;
- wave and slice scope are canonical;
- included User Stories and acceptance criteria exist;
- implementer and reviewer are assigned;
- expected change ID is declared;
- out-of-scope boundaries are explicit;
- target branch and validation expectations are known.

A change is `APPLY_READY` when proposal, design, specs, and tasks are complete, mutually consistent, validated, and sufficient for the executor to receive only `/opsx:apply <change>`.
