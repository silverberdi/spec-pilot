# Definition of Done

A slice is complete only when:

- every included User Story acceptance criterion has evidence;
- automated tests and deterministic checks pass (success and meaningful failure paths retained as file/transcript evidence);
- OpenSpec Verify is exactly `PASS` (not `PASS WITH NOTES` or any other result);
- required human validation is complete (including GitHub settings that local scripts cannot prove);
- docs and context are synchronized;
- cross-review is `READY_TO_MERGE` when required (Codex for this repository’s default review contract);
- delta specs are synchronized where applicable **before** archive;
- the change is archived;
- no hidden deferred work remains;
- the context pack/current state is regenerated and valid;
- merge eligibility is granted only after the above gates—draft PR visibility alone is insufficient.
