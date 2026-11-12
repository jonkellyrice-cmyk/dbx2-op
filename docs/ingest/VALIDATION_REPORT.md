# XV2 Mechanics Specification v3.1 — Validation Report

**Release:** 2026-11-11  
**Status:** PASS — reference schema and acceptance suite  
**Scope:** optimizer ingest contracts, not live game-mechanics verification or production build performance

## Checks performed

| Gate | Result | Evidence |
|---|---|---|
| JSON Schema 2020-12 with `referencing.Registry` | PASS | 14 schema files compiled; profile, fixtures and findings registry validated |
| Closed goal set | PASS | The profile's goal IDs equal `vocabulary.schema.json/$defs/GoalId`; no validator-owned goal list |
| Decision slots | PASS | 11 IDs derived from profile, duplicates rejected; no validator-owned slot count |
| Single-option catalog scoring | PASS | Each option schema requires per-goal tactical grades; A-009 proves every goal can score with all benchmark peers unmeasured |
| Unknown / known zero / N/A | PASS | A-003 exercises unknown; A-010 verifies N/A drop with a reason |
| Relations | PASS | A-004 candidate remains explain-only; A-008 confirmed synthetic +10 relation flips a tied ranking |
| Conditional blockers | PASS | A-005 tests scenario-gated Expert Mission armor requirement |
| Legality | PASS | A-001 duplicate assignment + legalOptions, A-002 archetype restriction, A-007 attribute budget |
| Scenarios | PASS | Six preset benchmark references resolve to six declared scenarios; target/test results intentionally null |
| Community findings | PASS | Empty `community-findings.yaml`; wrapper and claim schemas verified |
| Cross references | PASS | Rule, generator, blocker, relation, slot, option, acceptance and `spec_ref` references checked |
| Synthetic fixture isolation | PASS | All fixture options in `tests/fixtures/`; production `catalog/` is empty |

## Mandatory negative-mutation tests

All five deliberately altered copies of the ingest data were rejected:

1. First goal's criteria weights increased to 1.1 → **goal sum** error.
2. Required goal removed from an option's `tactical_grades` → **schema required-property** error.
3. Acceptance case changed to nonexistent option ID → **unresolved option reference** error.
4. Acceptance case given nonexistent `§99.99` reference → **spec anchor** error.
5. Integer tactical grade replaced by string `"three"` → **schema type** error.

## Change log — v3.0 → v3.1

1. Replaced benchmark-gated `measured_minmax` goal criteria with catalog-only ordinal, saturated capabilities and known feature / low-weight resource cost heuristics. Measurements remain in benchmarks.
2. Added a compulsory eight-goal `TacticalGrades` object to skill, Awoken, Super Soul and QQ Bang schemas; unknown and known 0 have separate semantics.
3. Added `scoring.relation_bands` (minor +/−5, moderate +/−10, major +/−30) and confirmed-only, non-overlapping signed pair adjustments; candidate relations stay explain-only. Updated relation schema and all generators.
4. Removed the repeated `owned_only` paragraph in §22.3.
5. Updated §22.1 to list all six YAML presets, including `solo-boss`.
6. Added a scenario registry with six benchmark scenario IDs, mode, target, conditions and protocol; unselected target and unmeasured metrics remain null.
7. Replaced the old structural-only validator's hard-coded lists, old `RefResolver`, tautological acceptance assertions, and length threshold. Added executable subset and negative mutation suite, early fail-stop and reference resolution.
8. Added `community-findings.yaml` and strict registry/claim schemas. It begins empty; confirmed findings must be resolved and represented by an acceptance case.
9. Added `catalog_coverage` to preserve unknown versus absent evidence when rule-deriving option scores.

## Xenoverse 2-specific cautions

- **Upfront cost is not sustained effectiveness.** Some moves have multi-stage expenditure, long recovery, situational refunds or excellent damage per bar. The catalog cost criterion is deliberately only 15% of the option goal and should not be advertised as actual DPS or long-run Ki efficiency.
- **Relation bands are optimizer points, not game multipliers.** Even when a causal synergy is known, its marginal importance may depend on mission, skill timing and player input. Without a justified band and non-overlap proof, it stays `candidate`.
- **QQ Bangs are not tactical skills.** Uniform required grade keys simplify adapter ingestion but may be `unknown` until stat-derived judgments are supported. No action-like effects should be imputed to gear.
- **Armor blockers are boss-specific.** Choosing Expert Mission mode does not inherently mean a verified armor answer is a mandatory hard blocker.
- **Race passives are context, not catalog-equipped option IDs.** A future relation endpoint type may need to include context modifiers; do not fabricate an item record to force such relations.

**Interpretation:** PASS verifies that the **specified contracts and synthetic tests** agree. It does not independently verify the game's live patch behavior, the quality of tactical grades from a real catalog, or the predictive accuracy of the optimizer.
