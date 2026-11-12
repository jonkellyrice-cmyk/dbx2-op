# Dragon Ball Xenoverse 2 — Mechanics Specification v3.1

This is an **optimizer-ingest bundle**, not a finished optimizer or an exhaustive game catalog. Mechanical claims remain versioned as `GAME` (documented/observed), `MODEL` (schema/optimizer judgment), or `VERIFY` (unresolved). Unknown is explicitly `null`; a known zero is not unknown.

## Ingest order

1. Read [`spec.md`](spec.md) (§§1–26). Sections 1–17 preserve game mechanics; §§18–26 describe the optimizer contract, including the v3.1 changes.
2. Load [`schema/vocabulary.schema.json`](schema/vocabulary.schema.json), then [`optimizer-profile.yaml`](optimizer-profile.yaml). The schema owns allowed goal IDs, types, and IDs; the profile owns weights, slot definitions, criteria, presets, blockers, derivations and relations.
3. Validate each eventual option using `schema/skill.schema.json`, `schema/super-soul.schema.json`, `schema/awoken.schema.json`, or `schema/qq-bang.schema.json`. Every option must include a grade for **every** goal and `catalog_coverage` (completeness of evidence-bearing fields).
4. **`rate(option)`** uses only that option's catalog data and the profile. A known grade 0 counts as zero; an unknown grade remains null. N/A criteria with reasons leave the applicable denominator. No measured benchmark field is used for this call.
5. **`relations(a,b)`** yields candidates or confirmed relations. Candidates explain only; confirmed, non-overlapping, independently justified interactions apply the profile's signed bands (+/−5, 10, 30 **score points**). Those are optimizer weights, **not** XV2 damage multipliers.
6. Validate/legalOptions, apply contextual hard blockers, and compare **whole builds** using [`benchmarks`](optimizer-profile.yaml) only after scenario definitions and measurements exist. Empty benchmarks are intentional.
7. Use [`community-findings.yaml`](community-findings.yaml) as a claims inbox. `confirmed` findings require a resolution and acceptance case; it begins empty.

## Validation

```bash
python tests/validate_bundle.py
```

Requires `PyYAML`, `jsonschema`, and `referencing` (Python packages). Uses modern `referencing.Registry` / `Resource`, not `RefResolver`.

The validator verifies all 14 JSON Schemas, dynamic goal/slot membership, uniqueness, cross-references, complete preset rankings, criterion sums, schema references and source anchors. **Ten executable acceptance fixtures** test catalog-only scoring and actual conditional behavior through `tests/contract_engine.py`. It also runs **five deliberately corrupted inputs**, requiring each to fail validation.

Files under `tests/fixtures/` are **synthetic test objects only**. They are not validated gameplay observations, production catalog options, or claims about Xenoverse 2 abilities. The `catalog/` folder remains intentionally unpopulated.

## Design caveats

- Single-option ordinal grades are explicit, inspectable catalog judgments; they are not measured DPS or measured move reliability. Unknown grades remain unknown.
- Cost fitness is a low-weight, transparent proxy. An inexpensive move can still be weak, awkward or unavailable in its actual setup.
- Confirmed relation bands require evidence of a *marginal* pair benefit beyond the two individual ratings; mere thematic or role overlap is not enough.
- QQ Bangs affect stats rather than being active attacks. The same eight required tactical grade slots apply to them for uniform adapter shape, but should be graded from stat evidence, or left unknown.
- Most Expert Missions do not automatically require a particular armor answer. Scenario-specific blockers are conditional.
- Race passives are currently context; cross-entity/context relations need a future endpoint extension rather than fake skill IDs.

## Bundle map

- `spec.md`: human rationale with stable `§` anchors
- `optimizer-profile.yaml`: normative option scoring, relations, rules, benchmark scenario registry, presets
- `schema/*.schema.json`: strict machine contracts, including community findings
- `community-findings.yaml`: empty community-claim registry
- `catalog/README.md`: empty production catalog placeholder
- `tests/fixtures/`: **synthetic** catalog-like records and a confirmed synthetic relation
- `tests/acceptance-cases.yaml`: golden cases with `covered_by`
- `tests/contract_engine.py`: executable *subset* of adapter contracts, **not a complete game optimizer**
- `tests/validate_bundle.py`: schema, semantic, functional, and mutation verification
- `VALIDATION_REPORT.md`: build QA results and caveats
