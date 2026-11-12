# v3.1 adapter acceptance

Run from any directory: `python path/to/xv2/tests/validate_bundle.py`.

All `tests/fixtures/` option and relation records are **synthetic**. They are intentionally not included in `catalog/`. A fixture with `state: confirmed` establishes a known test premise for the scoring engine, NOT a confirmed gameplay synergy.

Every case in `acceptance-cases.yaml` has a `covered_by` field. Non-null values refer to executable test functions inside `validate_bundle.py`. The reference functions in `contract_engine.py` implement the subset of rate, pairwise relation, legality and blockers needed to validate the contract; they are not a complete adapter or PvE simulator.

The validator performs schema validation before semantic references and stops that phase on malformed data. It uses `referencing.Registry` and `Resource`. It derives goal IDs from `GoalId` in vocabulary.schema.json; slot IDs/counts from optimizer-profile.yaml; all ID references are checked against the profile and synthetic test fixture registry. There is no document-length threshold or hard-coded list of eight goals/eleven slots in validator logic.

The five negative mutation checks ensure that a goal weighted to 1.1, a missing grade, an unknown option reference, an invalid `spec_ref`, and an invalid grade type are all rejected.
