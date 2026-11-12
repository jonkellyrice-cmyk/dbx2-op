# <GAME NAME>: Mechanics Specification and Optimization Contract

**Version:** <spec version> · **Date:** <YYYY-MM-DD> · **Content version:** <patch, edition or DLC set>
· **Platforms:** <if they differ>

> **How to use this template.** Copy the whole `ingest-template/` folder, rename it for your game,
> and replace every `<placeholder>`. Each section says what goes in it, gives a checklist, and shows
> a filled-in **Toy example** from Toy Skirmish, the made-up game this repository ships with
> (`src/domain/toy-game/`). Delete the toy examples as you replace them. Keep the section numbers
> and anchors: the YAML and JSON files cite them as `spec_ref: "§11"`.
>
> Part A describes **the game**. Part B describes **the optimization problem**. A real spec's Part A
> is usually long (the first real one ran to 17 sections); Part B is about the same size for every
> game. Don't put catalog data (the full list of options) here: that goes in `catalog/`.

**Source-of-truth rule.** JSON Schemas (`schema/`) hold record shapes, enums and ID rules.
`optimizer-profile.yaml` holds the optimization decisions. This prose explains them and records the
evidence for how the game behaves. If two of them disagree, that is an error to fix, never a reason
to guess.

---

# Part A: The game

# §1 Scope, notation and evidence
<a id="sec-1"></a>

**What goes here:** what the spec covers and what it doesn't, the content version it describes, and
the notation used everywhere else.

Use these labels on every claim about the game:

| Label | Meaning |
|---|---|
| **GAME** | Established behavior: printed rules, official documentation, or repeatable observation. Cite a source key. |
| **MODEL** | Our own convention or analysis vocabulary. Not a claim about the game's internals. |
| **VERIFY** | Unconfirmed, disputed or version-sensitive. Treated as unknown until tested. |

Keep three "no value" states apart; never collapse them into one another or into zero:

| State | Meaning |
|---|---|
| `unknown` | It has a value; we don't know it yet. |
| `not_applicable` | The field doesn't apply to this record. |
| `known` + `false` / `0` | We know the value, and it is false or zero. |

Checklist:
- [ ] Content version and date stated.
- [ ] What is in scope (systems) and out of scope (cosmetics, modes not covered).
- [ ] Source keys `[R1]`, `[R2]`... defined in §20.

> **Toy example.** Covers Toy Skirmish as printed in `src/domain/toy-game/catalog.ts`, levels 1-5,
> one character class (the Wanderer). Out of scope: party composition, enemies, maps. Every rule
> here is **GAME** with source `[R1]` (the toy rulebook comment), because the toy game is defined
> by that text.

# §2 Entities and runtime state
<a id="sec-2"></a>

**What goes here:** the small set of record types the game can be described with, and how they
relate. Keep three things apart even when the game's UI blurs them: what the player **owns**, what
is **equipped** in a build, and what is **active** during play.

| Entity | Contains | Relationship |
|---|---|---|
| <Character> | <level, class, stats> | <selects one build> |
| <Build / loadout> | <one option per slot> | <chosen before play> |
| <Option> | <cost, effects, tags> | <goes in one slot family> |
| <Effect clause> | <trigger, operation, duration> | <an option has zero or more> |

Checklist:
- [ ] Every entity the optimizer reads is named.
- [ ] Owned vs equipped vs active are separate records, if the game has ownership at all.

> **Toy example.** Wanderer (level 1-5) → Build (six slots) → Option (origin, technique, talent or
> signature) → Effect clauses. There is no ownership: every option is always available
> (`not_applicable` for acquisition, see §8).

# §3 Resources and costs
<a id="sec-3"></a>

**What goes here:** every resource a build spends or gains (mana, actions, stamina, cooldowns,
currency during play), its maximum, how it regenerates, and what happens at zero.

Checklist:
- [ ] Each resource: current/maximum, regeneration rule, spend timing (upfront, per tick, on hit).
- [ ] What zero means for each (can't act, knocked out, nothing).
- [ ] Rates that depend on state are described as rules, not as one number.

> **Toy example.** One resource: **3 actions per turn**, refreshed every turn. An option costs 0
> (passive), 1 or 2 actions per use. A 2-action option leaves only 1 action for anything else that
> turn. [GAME, R1]

# §4 How play resolves
<a id="sec-4"></a>

**What goes here:** the actions a player takes and how their outcomes are decided: attacks and
damage, defense, movement, contact outcomes (hit, block, miss), statuses. Only as deep as the
optimizer needs.

Checklist:
- [ ] Each outcome type and what it triggers (on hit, on block, on use).
- [ ] Damage, defense and movement formulas, or VERIFY where unknown.
- [ ] Distinctions that look alike but aren't (damage reduction vs immunity vs evasion).

> **Toy example.** An attack deals its dice (1d6 averages 3.5). Armor and damage reduction subtract
> per hit. Speed is squares moved per action; base 5. No misses: every attack hits. [GAME, R1]

# §5 Option families and the shared option record
<a id="sec-5"></a>

**What goes here:** each family of choosable option (skills, feats, items, cards...), what the
families share, and what each adds. This is where the fields of `schema/option.schema.json` are
explained.

Separate dimensions that are independent: an option's **family** (which slot it goes in), its
**classification** (attack type, school), and its **role tags** (what jobs it does). One option can
do several jobs.

Checklist:
- [ ] Every family, with the slot it fills.
- [ ] Fields every option has (id, name, family, level, cost, tags, effects, eligibility).
- [ ] Fields a family adds.
- [ ] Which fields are REQUIRED-FOR-OPTIMIZER, OPTIONAL, DOCUMENTATION-ONLY (§17).

> **Toy example.** Four families: **origin** (passive, level 1), **technique** (active, levels
> 1-2), **talent** (passive, level 3), **signature** (level 5). Every option has a level, an action
> cost, tags (`attack`, `guard`, `movement`, `setup`, `payoff`, `scales`...), optional `requires`
> (a prerequisite option) and `excludes` (options it can't be taken with). [GAME, R1]

# §6 Effects: clauses, triggers and stacking
<a id="sec-6"></a>

**What goes here:** how an option's effects are written as independent **effect clauses**, each
with its own trigger, conditions, operation, magnitude, duration and stacking rule. This is what
lets relations be generated from data (§14) instead of written by hand.

Trigger vocabulary (adapt): `always`, `on_use`, `on_hit`, `on_event`, `while_condition`,
`threshold_entry`, `periodic`. Stacking vocabulary: `additive`, `multiplicative`, `refresh`,
`replace`, `capped`, `exclusive_group`, `unknown`.

Checklist:
- [ ] Every trigger and operation the game uses has a vocabulary entry in `schema/vocabulary.schema.json`.
- [ ] Each clause names other options **by ID** when it depends on them (never by display name).
- [ ] Stacking rules stated, or `unknown` (never assumed additive).

> **Toy example.** Hunter's Focus has one clause:
> `trigger: on_hit · predicate: target.marked_by == technique.mark-target · operation: add ·
> property: damage · magnitude: +2 · stacking: additive`. Because the predicate names
> `technique.mark-target` by ID, relation generator G-001 (§14) produces the setup-then-payoff
> synergy without anyone writing the pair by hand. [GAME, R1]

# §7 Character and progression
<a id="sec-7"></a>

**What goes here:** levels, what each level unlocks (slots, points, caps), stat allocation, and
anything else that changes which builds are possible.

Checklist:
- [ ] Level range and what each level grants.
- [ ] Slot unlock table (also in the YAML `decision_slots`).
- [ ] Point budgets and per-stat caps, with how they're unlocked.
- [ ] Respec rules.

> **Toy example.** Levels 1-5. Level 1: an origin and a technique. Level 2: a technique. Level 3: a
> talent. Level 4: a technique. Level 5: a signature. No stat points. [GAME, R1]

# §8 Acquisition and ownership
<a id="sec-8"></a>

**What goes here:** how options are obtained (shops, drops, quests, DLC), whether ownership is
per account or per character, and what is random. Unknown drop rates and rotations stay `null`.

Checklist:
- [ ] Every acquisition route, with prerequisites and repeatability.
- [ ] Ownership scope (account vs character).
- [ ] Whether the optimizer filters by ownership (an input filter) or scores acquisition cost (a
      separate "what to farm next" mode). It is never a hidden goal.

> **Toy example.** `not_applicable`: every option is available at its level.

# §9 Ordering, precedence and open mechanics
<a id="sec-9"></a>

**What goes here:** the order things resolve in, and the questions where two rules collide
("does this bonus stack with that one?"). List each open question with how it will be resolved.
An LLM must not paper over a gap this section has already admitted.

| Collision or open question | Status | How to resolve |
|---|---|---|
| <two damage bonuses: additive or multiplicative?> | VERIFY | <controlled test> |

> **Toy example.** Damage bonuses (Sellsword +1, Hunter's Focus +2, Mark Target's +1 for allies)
> are additive per hit [GAME, R1]. Open question, for illustration: "Does Bulwark Stance's
> movement limit apply to Dash?" Status VERIFY; resolve by a rules ruling.

---

# Part B: The optimization problem

# §10 Optimization contract and the target
<a id="sec-10"></a>

**What goes here:** the exact decision being optimized (process step 1), what goes in and what
comes out, and the source-of-truth rule.

The optimizer receives a player context, a catalog, a preset (or the player's own goal ranking)
and optionally a partly filled build. It returns legality results, goal scores with their reasons
(or explicit unknowns), relations, blocker results and a recommended build with explanations. It
never invents an option, a number or a measurement.

> **Toy example.** Target: "Choose a Wanderer's six picks (levels 1-5) for a requested playstyle."
> Out of scope: party composition, encounter design.

# §11 Goals
<a id="sec-11"></a>

**What goes here:** a **closed** list of 4-8 goals, defined in `optimizer-profile.yaml` under
`goals`. Each goal has a definition, what 0 and 100 look like, the inputs that feed it, and the
advice shown when a build is weak there. Goals are independent: one option can score on several.
Roles and tags (§5) are inputs to goals; they are not goals themselves.

Checklist:
- [ ] 4-8 goals, no overlaps (two goals measuring the same thing make every build look stronger
      there).
- [ ] Every goal can be scored **from catalog data** at the option level (§13). A goal that only a
      play test can measure belongs in benchmarks (§16), not here.
- [ ] 0 and 100 anchors are concrete.

> **Toy example.** Four goals: `damage`, `defense`, `support`, `mobility`.

# §12 Decisions, context and legality
<a id="sec-12"></a>

**What goes here:** which build fields the optimizer chooses (decision slots), which the player
supplies (context), which are ignored (out of scope), and the numbered legality rules.

**Decision / context / out of scope.** Every build field goes in exactly one bucket. Continuous
choices (stat points) say how they are made discrete (named spreads, steps of 10, exact integers),
and that the discretization is a search method, not a game rule.

**Rules.** Each rule has an ID (`R-001`...), what it applies to, the test, the slot it is reported
against, the exact player-facing message, and what happens when the data needed is unknown
(`unverified`: possibly legal, needs checking; never silently legal). `validate()` and
`legalOptions()` apply the same rules; the picker never offers something validation rejects.

> **Toy example.** Decision: the six slots. Context: the level. Rules R-001 to R-006 in the YAML:
> option family matches the slot; option level ≤ slot level; slot is unlocked at the build's level;
> no option twice; a prerequisite must be taken **at or before** the dependent option's slot level
> (a later pick can't legalize an earlier one); exclusions apply in both directions.

# §13 Scoring: option ratings and build metrics
<a id="sec-13"></a>

**What goes here:** how catalog fields become 0-100 goal scores. There are two levels, and they
must stay apart:

1. **Option rating** (the adapter's `rate()`): what one option contributes to each goal, computed
   **from catalog data only**: rule-derived facts and authored tactical grades. Every point carries
   evidence: `rule-derived`, `explicit`, `tactical` or `heuristic`. This is what the search uses,
   so it must work before anyone has played a single test.
2. **Build metrics** (benchmarks, §16): measured or computed figures for a whole build (damage per
   turn, clear time, survival time). They compare builds with reference builds and calibrate the
   option ratings. They are never required to rate an option.

> **Lesson from the first real bundle.** Its goals took 50-65% of their weight from build-level
> measurements and needed 60% coverage. With no measurements yet, five of its eight goals could
> never be scored, so the optimizer couldn't rank anything until in-game testing was done. Rate
> options from the catalog; measure builds separately.

**Criteria.** Each goal lists criteria with weights summing to 1. Criterion methods:

| Method | Score | Unknown input |
|---|---|---|
| `tactical_grade` | `20 × grade` (grade 0-5 from the option's `tactical_grades`) | criterion unknown |
| `rule_derived` | a stated formula over known catalog fields | criterion unknown |
| `count_saturation` | `100 × min(count, n) / n` (n is a MODEL parameter) | criterion unknown |
| `boolean_coverage` | known true = 100, known false = 0 | criterion unknown |

**Tactical grades** are judgment, written down: each option record has a `tactical_grades` entry
for **every** goal, on a 0-5 scale with anchors (1 = narrow or unreliable, 3 = works with ordinary
limits, 5 = reliable and repeatable), a `reason`, and evidence. A known 0 means "verified to do
nothing for this goal". A grade nobody has judged yet is `status: unknown`, never 0. Requiring
every goal means a missing grade can't be mistaken for either. Grades are reviewed in the audit
(§19).

**Unknowns.** An unknown criterion contributes nothing and lowers the goal's **coverage** (the
known share of its weight). Below `minimum_goal_coverage`, the goal is reported unknown, not 0. A
`not_applicable` criterion (damage per action for an option that doesn't attack) is dropped from
the goal's weights instead, with its reason.

**Goal weights from ranks.** The preset or the player ranks goals; the rank-to-weight rule lives in
the YAML so it is never invented per request.

> **Engine note.** The adapter applies the coverage rule and lists the goals that fall below it
> in `Rating.unknown`. The engine then keeps their score at 0 for the search, but the report shows
> "?" and says "not graded yet", so a missing grade is never presented as a measured zero.

> **Toy example.** `damage` = 0.7 × `tactical_grade` + 0.3 × `rule_derived` (average damage per
> action, normalized to the strongest attack). Heavy Blow: grade 3 → 60; 10.5 average for 2
> actions = 5.25 per action, the best in the catalog → 100; score 0.7×60 + 0.3×100 = 72.
> Coverage 1.0. Iron Skin's `support` grade is `unknown` and `support` has no other criterion,
> so its coverage there is 0: it is reported unknown, not 0 (acceptance case A-005).

# §14 Relations and generators
<a id="sec-14"></a>

**What goes here:** how pairs of options interact. A relation is
`(a, b, kind, goal, weight band, reason, evidence)`; kind is `synergy`, `anti_synergy` or
`redundancy`.

**Most relations are generated, not written.** A generator is a rule over structured catalog
fields (effect clauses, costs, tags), never over names or prose. Write generators once (process
step 4); the catalog fills them in (step 6); the audit reviews what they produce (step 9).

**Scoring policy.** A **confirmed** relation (its evidence supports both the cause and the size)
adds its weight band's points to the goal, as the template engine does with `Relation.weight`. A
**candidate** relation (VERIFY evidence) is shown in explanations but adds nothing until confirmed.
A relation never re-counts something the option rating already credited.

> **Lesson from the first real bundle.** It made every relation explain-only. Then synergy never
> changes a recommendation, and the engine's lookahead (which finds setup-then-payoff pairs) has
> nothing to find. Score confirmed relations; hold back candidates.

**Hand-authored relations** are for judgment the data can't express. Each has a reason and
`tactical` evidence.

> **Toy example.** Generators G-001 to G-004 reproduce the toy's relations from data:
> G-001 (a clause names another option) → Mark Target + Hunter's Focus synergy;
> G-002 (two 2-action options) → Heavy Blow + Whirlwind anti-synergy;
> G-003 (two always-on damage reductions) → Shield Wall + Iron Skin redundancy;
> G-004 (an always-on clause whose predicate is a tag) → Sellsword + every `attack` option.
> Hand-authored: Dash + Quick Strike ("dash into reach and still strike"), a table judgment.

# §15 Presets, blockers and acquisition policy
<a id="sec-15"></a>

**What goes here:**

- **Presets:** 4-6 named starting points (playstyles, modes, requests), each ranking the goals.
  If the game has modes that change what is good, a mode is a preset (plus blockers), not a
  separate optimizer.
- **Blockers:** hard requirements for a preset or mode ("must have an answer to armored bosses"),
  evaluated after legality and scoring. A failing build is flagged, not just ranked lower. Blockers
  are not game legality.
- **Acquisition policy:** ownership is an input filter; acquisition cost, if wanted, is a separate
  "what to farm next" mode. Never a hidden goal.

> **Toy example.** Presets: Glass cannon (damage 1, mobility 2), Bodyguard (defense 1, support 2),
> Party support (support 1, defense 2), Balanced (all 1). Blocker B-001 for Bodyguard: the build
> must include at least one option tagged `guard`.

# §16 Benchmarks and reference builds
<a id="sec-16"></a>

**What goes here:** build-level metrics with units, split into **computable from the catalog**
and **needs measurement**, plus reference builds measured the same way. A figure nobody measured
is `null`, never 0, and is left out of comparisons rather than ranked last. Measure on the game's
printed or observed numbers, never on the optimizer's own 0-100 scores.

> **Toy example.** Metrics: best attack (average damage), damage taken off each hit (points),
> speed (squares), all computable. Reference archetypes Knight, Ranger, Cleric, Rogue and Mage;
> the Mage's speed was never measured, so it is `null` (see `src/domain/toy-game/benchmarks.ts`).

# §17 Catalog records, IDs and data lineage
<a id="sec-17"></a>

**What goes here:** the field tiers for each record type, the ID convention, and how evidence is
attached.

- **Field tiers.** REQUIRED-FOR-OPTIMIZER: the key must be present (its value may be explicitly
  unknown). OPTIONAL: useful enrichment. DOCUMENTATION-ONLY: display or archive detail.
- **IDs.** Lowercase kebab-case slugs with a family namespace: `<family>.<slug>`. IDs never change
  when a display name does. Every cross-reference uses IDs.
- **Evidence.** Each record has an evidence envelope (`status: game|model|verify`, source keys,
  version); individual claims can carry their own.
- **Versioning.** When the game patches, version records; don't rewrite history.
- Record exact in-game wording separately from the normalized effect.

> **Toy example.** `technique.mark-target`, `talent.hunters-focus`, `origin.sellsword`. See the
> records in `catalog/`.

# §18 Acceptance cases
<a id="sec-18"></a>

**What goes here:** 5-10 "given this, expect that, because..." cases in
`tests/acceptance-cases.yaml`, each `confirmed` (follows from the rules) or `provisional` (rests on
a gameplay premise still being verified). They become the adapter's tests. Every confirmed audit
finding (§19) is added here, so a later change can't quietly undo it.

> **Toy example.** Eight cases. Each names the test in `tests/optimization-template.test.ts` that
> checks it, or says the test still has to be written (A-001, A-008), which is the honest
> state of a fresh bundle.

# §19 Community findings and audit
<a id="sec-19"></a>

**What goes here:** a pointer to `community-findings.yaml` and a summary of the latest audit.
The process (what to collect, how to weigh claims, the audit checklist, how disagreements are
resolved) is in `BUILDING_A_GAME_OPTIMIZER.md`, steps 8 and 9.

> **Toy example.** Two claims in `community-findings.yaml`: one confirmed (it became acceptance
> case A-008) and one still open.

# §20 Version notes and sources
<a id="sec-20"></a>

**What goes here:** the change log, and the source list with keys, URLs and the date each was
checked. Prefer official sources for what exists; community sources for granular mechanics, with
their date and patch.

| Key | Source | Checked |
|---|---|---|
| [R1] | <title, URL> | <YYYY-MM-DD> |

> **Toy example.** [R1] Toy Skirmish rulebook: the header comment of
> `src/domain/toy-game/catalog.ts`. Change log: 1.0, first version.
