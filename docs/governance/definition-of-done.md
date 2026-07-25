# Definition of Done

A slice is complete only when:

- every included User Story acceptance criterion has evidence;
- automated tests and deterministic checks pass;
- OpenSpec Verify is exactly `PASS` (operator-approved); `PASS WITH NOTES` is not closure;
- required human validation is complete;
- documentation and context are synchronized;
- delta specs are synchronized where applicable (after Verify `PASS`, under operator approval);
- the change is archived through the approved lifecycle (under operator approval);
- no hidden deferred work remains;
- the current context/index is regenerated and valid;
- final commit/push on `main`, if any, occurs only with explicit operator approval after applicable validations are reported.

No agent-specific review verdict is required unless a future, explicitly approved change introduces one.
