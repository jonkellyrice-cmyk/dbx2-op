# Building a game optimizer from this template

This is the whole process, start to finish, for turning this template (generic engine, toy game,
placeholder UI) into a real optimizer for one game. Read it before doing anything else. Every step
says what goes in, what comes out, and when it is done.

## The root documents

| File | What it is | When to read it |
| --- | --- | --- |
| `BUILDING_A_GAME_OPTIMIZER.md` | This file: the process. | First. |
| `README.md` | What the template does and its design philosophy. | Second. |
| `ingest-template/` | A complete example ingest bundle (step 2), filled in for the toy game, with a validator. Copy it to start a game. | Before step 2. |
| `docs/OPTIMIZATION_TEMPLATE.md` | How the code is laid out, how to write an adapter, rules every game keeps. | Before step 4. |
| `ARCHITECTURE.md` | Layer rules the boundary check enforces. | Before writing code. |
| `TEMPLATE_AUDIT.md` | History: how the template was extracted from the Lancer and Kineticist optimizers. | Only for reference. |
| `CLAUDE.md`, `AGENTS.md` | Coding policies for agents. | Before writing code. |

## The idea in one paragraph

You can't log and score hundreds of options until you know how the game works and what "good"
means. So the process runs from the outside in: first a **framework** (the mechanics, written down,
and the optimization problem, made exact), then a **small slice** of real data to prove the
framework, then the **exhaustive catalog**, and only then **judgment**: community research and an
audit that check the theory against how the game actually plays. Most interactions are not wired by
hand; they come out of the catalog data through rules written once in step 4. What the data can't
express, the audit adds as authored judgment.

## The process

```
1  Target                     what exactly is being optimized
2  Research and ingest docs   mechanics spec + optimization profile + acceptance cases
3  Spin off                   new repo from this template, named for the game
4  Wire the framework         adapter built from the ingest docs, catalog nearly empty
5  Small slice                5-10 real options, light community check, light audit
6  Fill the catalog           every option, schema-checked
7  Interactions and scoring   review generated relations, tune, author judgment calls
8  Community research         what thousands of players actually found
9  Full audit                 theory against practice, findings become tests
10 Verify and maintain        real measurements, patches, re-research, re-audit
```

### 1. Target

Pick the game **and** the exact decision being optimized. "Xenoverse 2" is too broad; "a
Xenoverse 2 custom character's loadout for a chosen mission type" is a target.

- **Out:** one paragraph: the game, the build being chosen, who uses the optimizer and for what,
  and what is explicitly out of scope.
- **Done when:** someone else could say whether a given feature is in or out of scope.

### 2. Research and ingest documents

Research how the game works (official sources first, community wikis for granular mechanics, with
dates and patch versions). Write the **ingest bundle** by copying `ingest-template/` and replacing
its toy example section by section; its `README.md` explains each file, and
`tests/validate_bundle.py` checks the result:

| File | Holds | Format |
| --- | --- | --- |
| `spec.md` | The mechanics: entities, resources, slots, effects, triggers, stacking, state, legality, with GAME / MODEL / VERIFY labels and sources. The *why*. | Prose (Markdown, stable section numbers). Not .docx: tables and code blocks don't survive conversion. |
| `optimizer-profile.yaml` | The optimization problem, exact: goals, decision slots vs context, rules, scoring rubric, relation generators, blockers, presets, benchmark metrics, acceptance cases. The *what*. | Machine-readable. Every entry cites its spec section (`spec_ref: "§8.3"`). |
| `schema/*.schema.json` | The shape of each catalog record, with each field marked required-for-optimizer, optional or documentation-only. | JSON Schema. |
| `catalog/` | Option records. Empty or a few records at this step; the slice at step 5; everything at step 6. | JSON, validated by the schemas. |
| `tests/` | Acceptance cases, and the bundle validator. | YAML; Python. |
| `community-findings.yaml` | Empty at this step; filled in steps 5 and 8. | Machine-readable. |

The spec describes the game; the profile describes the problem. Keep them separate, with one
source of truth for each fact: enums and IDs live in the YAML and schemas, and the prose refers to
them by name.

The profile must answer every one of these, or an LLM will guess:

- **Goals:** a closed list of 4-8, each with an id, label, definition, what 0 and 100 look like,
  which fields feed it, and the advice shown when a build is weak there.
- **Decision vs context:** which build fields the optimizer chooses, which the player supplies
  (character, level, mode, owned items), which are out of scope. Say how anything continuous
  (stat points) is made discrete.
- **Slots:** one row each: id, label, count, unlock condition, which options may go there.
- **Rules:** numbered (R-001...), each with a condition, the slot it reports against, and the exact
  player-facing message. These become `validate()` and `legalOptions()`.
- **Scoring rubric:** for each goal, criteria that rate **one option from catalog data alone**
  (rule-derived formulas and 0-5 tactical grades with anchors), and the policy for unknown values
  (shown as unknown, never scored as 0). Every option grades every goal, known or unknown.
  Play-test measurements describe whole builds and go in benchmarks, never in option ratings:
  otherwise nothing can be scored until testing is done.
- **Relation generators:** rules that produce synergy, anti-synergy and redundancy from structured
  catalog fields (an effect that names another option's id; two options filling the same job). They
  read structured fields, never names or prose (see "Don't guess from names" in
  `docs/OPTIMIZATION_TEMPLATE.md`). Confirmed relations add points to their goal; VERIFY
  candidates are explained but add nothing until confirmed.
- **Blockers:** hard requirements per mode or preset ("must have an answer to armored bosses"),
  flagged separately from the score.
- **Presets:** 4-6 named starting points (playstyles, modes, requests) with goal ranks.
- **Benchmarks:** metrics with units, split into computable-from-catalog and needs-measurement;
  reference builds to compare against; unmeasured figures are `null`.
- **Acceptance cases:** 3-5 "given this, the optimizer should prefer that, because..." cases,
  each marked confirmed or provisional.
- **IDs:** the slug convention every cross-reference uses (`skill.super.dodon-ray`).

- **Out:** the bundle above, with an empty or near-empty catalog.
- **Done when:** every question above has an answer or an explicit VERIFY / undecided entry.

The exact format of every file is in `ingest-template/`, filled in for the toy game.

### 3. Spin off

Create a new repository from this template and rename it for the game (package name, app title,
README). Put the ingest bundle in it as `docs/ingest/`, and keep `tests/validate_bundle.py`
passing as the bundle changes.

- **Done when:** the spun-off repo builds and its tests pass with the toy game still in place.

### 4. Wire the framework

Build the game's adapter from the ingest bundle, following `docs/OPTIMIZATION_TEMPLATE.md` and
copying `src/domain/toy-game/`. Each part of the profile has a home in the contract
(`src/kernel/optimization/contract.ts`):

| Profile | Code |
| --- | --- |
| goals | `goals` (`GoalInfo`: label, color, `plays`, `gapAdvice`) |
| decision slots | `slots()` |
| rules | `legalOptions()` and `validate()`, through one shared check |
| scoring rubric | `rate()`, every point a `Contribution` with honest `evidence` |
| relation generators, authored relations | `relations()` |
| presets | `presets` |
| benchmarks | `benchmarks` |
| acceptance cases | tests in `tests/` |
| blockers | `blockers` on the adapter, named by presets; flagged in the UI and report |
| unknown grades, candidate relations | `Rating.unknown` (shown as "not graded yet") and `Relation.state: "candidate"` (explained, not counted) |

Load the catalog from data files validated against the schemas rather than hand-typing options
into TypeScript, so step 6 is data entry, not coding. The toy game keeps its catalog in code
because it is tiny.

- **Out:** the game's adapter, wired, with an empty or placeholder catalog; the toy game removed.
- **Done when:** typecheck, boundary check and contract tests pass; acceptance cases exist as tests
  (failing or skipped-with-reason is fine until the catalog exists, but say which).

### 5. Small slice

Catalog **5-10 real options** that cover different slot families and at least one known
interaction. Run them through everything: legality, scoring, relations, Auto Build, the report.

- **Light community check:** collect a handful of "everyone knows X" claims about these options
  (format in step 8).
- **Light audit:** can the framework express what matters? If an expert says "good because it's
  safe on a miss" and no field captures that, the schema needs a field.
- **Fix the spec, profile, schema and wiring now.** This is the cheapest point to change the
  framework.
- **Done when:** the slice's results make sense to someone who knows the game, and every gap found
  is fixed or recorded.

### 6. Fill the catalog

Enter every option. Each record is validated against the schema as it goes in; unknown values are
recorded as unknown with a VERIFY flag, never guessed. Record exact in-game wording separately from
normalized effects. Date and version every entry.

- **Done when:** the catalog is complete for the target's scope and every record passes the schema.

### 7. Interactions and scoring

The generators from step 4 now produce most relations from the catalog. This step is review and
tuning, not hand-wiring every pair:

1. Review the generated relations: the strongest ones for nonsense, and options left with none.
2. Author by hand only the judgment calls the data can't express, as `tactical` evidence with the
   reason written down.
3. Tune weights in the documented scoring tables until the acceptance cases pass.

- **Done when:** acceptance cases pass and every hand-authored relation has a reason.

### 8. Community research

The mechanics research says how the game is supposed to work; the community knows how it plays,
across thousands of players. Collect:

- **Meta builds per mode**, with roughly how widely they're used (these become benchmark peers and
  acceptance cases);
- **better than it looks**: sleeper picks and combos players rely on;
- **worse than it looks**: options that read well and disappoint in play, and why;
- **mechanics that differ from the documentation**: hidden interactions, wrong tooltips,
  undocumented caps or stacking;
- **context splits**: strong in one mode, weak in another.

Record each claim in `community-findings.yaml`:

```yaml
- id: C-001
  claim: "<what players say>"
  context: { mode: <mode>, patch: "<version>" }
  sources: [{ ref: "<url or name>", date: <YYYY-MM-DD> }]
  agreement: single | several | broad      # how widely it is agreed
  tested_by_us: false
  optimizer_says: "<what our optimizer currently does>"
  status: open | confirmed | rejected | outdated
  resolution: "<filled by the audit>"
```

Weigh claims with care:

- older than the latest relevant patch: weaker evidence;
- popular is not the same as strong (builds spread because they're easy or because a known player
  used them);
- context gets dropped ("broken" often means PvP only, or one boss);
- ten posts repeating one video are one source.

- **Done when:** each mode the target covers has meta builds and the main for/against claims
  recorded.

### 9. Full audit

Optimization has a semantic side that numbers and generated relations miss. The audit checks the
theory against practice, using the community findings. It is done by someone who did not do the
wiring: a person who knows the game, or a fresh model given only the ingest bundle, the catalog and
the optimizer's output, not the reasoning behind the wiring.

Checklist:

1. **Top builds per preset:** the top 5-10 Auto Builds for each preset. Would an experienced player
   call them sensible?
2. **Meta builds:** do the community's meta builds score well? If not, either the scoring misses
   something or the community is wrong; decide which.
3. **Every community claim:** work through `community-findings.yaml` and resolve each one.
4. **Missing and false interactions:** every well-known combo produces a relation; the strongest
   generated relations make sense.
5. **Coverage:** options with no relations, options near zero on every goal, goals almost nothing
   scores on, options never recommended by any preset. These are usually data gaps.
6. **Explanations:** read the report's reasons. Technically true but misleading ("high damage" on a
   move that rarely hits) is a finding.

Resolving disagreements:

- **Community says it works in play, theory says no:** the community usually wins on play. Fix with
  a `tactical` rating or relation citing the finding, or a schema field if the spec couldn't express
  the reason.
- **Community says the mechanic is X, theory says Y:** test it in-game if possible and go with the
  result; otherwise mark it VERIFY and show the uncertainty in the report.
- **Claim is outdated or out of context:** record why, so the next audit doesn't reopen it.

Every finding ends one of four ways: a generator fix, an authored `tactical` rating or relation with
its reason, a spec or schema change, or a deliberate "no change" with its reason. **Every confirmed
finding becomes an acceptance case**, so a later patch or catalog edit can't quietly undo it.

- **Done when:** every finding and every community claim has a resolution, and the new acceptance
  cases pass.

### 10. Verify and maintain

- Replace provisional benchmark figures with real measurements; anything unmeasured stays `null`.
- Resolve VERIFY items as they are tested.
- When the game patches: version the catalog and the spec (don't rewrite history), re-run the
  community research for what changed, and re-audit the affected options. The acceptance cases
  catch regressions.

## Rules that hold at every step

- **Unknown is not zero.** Record unknown as unknown; never invent a number.
- **Label the evidence.** Rule-derived, explicit, tactical or heuristic in code; GAME, MODEL or
  VERIFY in the spec.
- **One source of truth per fact.** The YAML and schemas hold the exact values; the prose explains
  them.
- **Framework before catalog.** Don't enter hundreds of options against a schema that hasn't
  survived a small slice.
- **Judgment is written down.** Every authored rating and relation says why; every audit decision
  becomes a test.

## Where this repository is now

This is DBX2-op, the Dragon Ball Xenoverse 2 optimizer, spun off from the template.

- **Step 1 (target), done:** a custom character's loadout (4 Supers, 2 Ultimates, Evasive,
  Awoken, Super Soul, QQ Bang, attribute spread) for a chosen kind of play.
- **Step 2 (ingest), done:** the v3.1 bundle in `docs/ingest/`. Its validator passes; the
  catalog is still empty.
- **Step 3 (spin off), done:** this repository, renamed.
- **Step 4 (wire the framework), done:** `src/domain/xv2/` is the Xenoverse 2 adapter, and the
  home page runs it.
  - **Profile:** `profile.ts` is the profile as code. `tests/xv2-bundle.test.ts` fails if it
    drifts from the YAML, and also checks every catalog record against the bundle's schemas.
  - **Scoring:** `scoring.ts` ports the bundle's reference engine (grades, capability counts, cost
    fitness, the 0.6 coverage rule, unknown never zero).
  - **Relations:** catalog relation records count when confirmed; generators G-001 to G-003 give
    candidates.
  - **Rank weights:** the profile's table (8, 6, 4, 3, 2, 1, 1, 1), not the template's linear one.
  - **Attribute points:** chosen from named spreads (`spreads.ts`, MODEL, ungraded).
  - **Context:** race/gender and the scenario flags are player context (`Build.context`), not slots.
  - **Tests:** all ten acceptance cases run in `tests/xv2-acceptance.test.ts` against the bundle's
    fixtures, with the engine contract checks.
- **Not wired yet, waiting for the data they need:**
  - R-003/R-004 (earned points and stat caps; the check exists as `checkAttributeBudget` and is
    tested);
  - R-006 (ownership), R-008 (DLC and unlocks), R-010 (mode rules), R-011 (level);
  - generators G-004 to G-006 (they need measured costs or target data);
  - turning a named spread into exact points.

  Unknown legality is never reported as a failure.
- **Kept on purpose:** the toy game, at `/toy`, as the engine's worked example and browser-test
  target. The process says to remove it, but the engine's own tests depend on it.

**The next step is step 5: the small slice.** Enter 5-10 real records (the owner's Ice build) into
`docs/ingest/catalog/catalog.json`, see how the optimizer handles them, and fix the framework
where they show a gap.
