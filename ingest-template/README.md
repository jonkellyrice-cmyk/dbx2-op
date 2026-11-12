# Ingest template

The ingest bundle is what you write at **step 2** of
[`BUILDING_A_GAME_OPTIMIZER.md`](../BUILDING_A_GAME_OPTIMIZER.md): the documents an LLM (or a
person) reads to wire a game into this template. This folder is a complete, working example of
one, filled in for **Toy Skirmish**, the made-up game in `src/domain/toy-game/`, so each section
can be traced to the code it becomes.

**To start a new game:** copy this folder into the spun-off repository (`docs/ingest/`), then
replace every `<placeholder>`, `FILL:` note and toy value. Keep the structure, the section numbers
and the validator.

## The files

| File | Holds | Becomes (process step 4) |
|---|---|---|
| `spec.md` | **Why**: the game's mechanics (Part A, §1-9) and the reasoning behind the optimization problem (Part B, §10-20). Every section has a checklist and a toy example. | Comments and docs; the reasoning behind every rule and weight. |
| `optimizer-profile.yaml` | **What**: goals and their criteria, decision slots, legality rules, scoring, relation generators, presets, blockers, benchmarks, acceptance registry. | `goals`, `slots()`, `validate()` / `legalOptions()`, `rate()`, `relations()`, `presets`, `benchmarks`. |
| `schema/*.schema.json` | **Shape**: the record formats and controlled vocabulary (`vocabulary.schema.json` holds the enums you replace). | The catalog loader's validation. |
| `catalog/options.json` | Option records in the real format. The toy catalog here is a **slice** (11 of 17 options), the size step 5 asks for. | The adapter's option data. |
| `tests/acceptance-cases.yaml` | "Given this, expect that" cases, each naming the test that checks it or saying it isn't written yet. | Tests in `tests/`. |
| `tests/validate_bundle.py` | Structural checks: every record matches its schema; every id, rule, generator and `spec_ref` resolves; weights sum to 1; every option grades every goal. Game-neutral. | Run it before wiring anything. |
| `community-findings.yaml` | Player-community claims and how the audit resolved them (steps 8-9). | Authored ratings, relations, acceptance cases. |

Source of truth: schemas hold shapes and enums; the YAML holds decisions; the prose explains them.
If two disagree, fix it; never guess.

```bash
pip install pyyaml "jsonschema>=4.18"
python3 tests/validate_bundle.py      # run from this folder
```

## Three rules learned from the first real bundle

The first real ingest bundle (a Dragon Ball Xenoverse 2 spec, version 3) was thorough and honest
about unknowns. Three of its design choices would have stopped the optimizer working, and this
template fixes them:

1. **Rate options from the catalog; measure builds separately** (`spec.md` §13). It took 50-65%
   of most goals from build-level play-test measurements and required 60% coverage, so with no
   measurements yet five of its eight goals could never be scored, and nothing could be ranked.
   Here, goal criteria read only catalog data (`tactical_grade`, `rule_derived`, ...);
   measurements live in `benchmarks`.
2. **Tactical grades need a home** (`schema/option.schema.json`). It defined a 0-5 grade type, but
   no record had a field to hold one, so every judgment-based criterion had nothing to read. Here
   every option grades every goal, known or explicitly unknown.
3. **Score confirmed relations** (`spec.md` §14). It made every relation explain-only, so synergy
   could never change a recommendation and the engine's lookahead had nothing to find. Here,
   confirmed relations add their band's points; only VERIFY candidates are explain-only.

Its other strengths are kept: GAME / MODEL / VERIFY labels, unknown never zero, numbered rules with
`unverified` outcomes, relation generators over typed effect clauses, blockers kept apart from
legality, ownership as a filter rather than a goal, and stable `spec_ref` anchors.

## Where the toy example differs from the toy code

The toy code was written before this bundle, so a few things are still hand-written there:

- Its relations are authored by hand in `catalog.ts`. Here generators G-001 to G-004 produce most
  of them from the effect clauses. One weight differs: Heavy Blow + Whirlwind is −15 in the code
  and the `moderate` band (10) here.
- Its scores come from authored 0-100 numbers. Here they come from 0-5 grades plus a
  damage-per-action formula.
- Its unknown goals, candidate relations and blockers each appear once: Iron Skin's Support
  grade, Bulwark Stance + Second Wind, and the Bodyguard preset's guard requirement.
