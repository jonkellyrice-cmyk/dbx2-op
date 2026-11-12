# Optimization template: how to build an optimizer here

Read this before adding or changing an optimization target. The pieces below are game-neutral.
**`src/domain/toy-game` is the worked example. Copy its shape and replace its contents.**

## What the template does

You pick a game and a request ("glass cannon", "keep the party alive"). The template then:

1. **Searches** every legal choice, slot by slot. It uses PNC-Lite: attention decides what gets
   looked at first, but every legal option is still evaluated, so attention never hides the best one.
2. **Scores** each choice on several independent goals, from 0 to 100, with a written reason
   behind every point.
3. **Builds**: fills the open slots, keeps the player's own picks, improves its own picks with
   hindsight once the whole build is known, then looks two picks ahead for setups that only pay off
   with a later pick.
4. **Compares** the build with reference points on measured figures, if the game supplies them.
5. **Explains** the build: a cover, a plain-language story, growth by level, milestones, the
   comparison, and one explained entry per choice. All of it prints, or downloads as a PDF rendered
   on the server, in a clean or an illustrated parchment theme.
6. **Saves and loads** builds as JSON files, checked against the game on import.

## Where things live

| Layer | File | Role | Game-specific? |
|---|---|---|---|
| kernel | `src/kernel/optimization/contract.ts` | `OptimizationAdapter`: the only seam between the engine and a game | no |
| domain | `src/domain/optimization/pnc-search.ts` | PNC-Lite attention search with full fallback | no |
| domain | `src/domain/toy-game/catalog.ts` | Goals, options, authored interactions, presets | **yes: replace** |
| domain | `src/domain/toy-game/rules.ts` | Slots, legality (`selectionReasons`), validation | **yes: replace** |
| domain | `src/domain/toy-game/scoring.ts` | `SCORING` weights, `rate`, `relations` | **yes: replace** |
| domain | `src/domain/toy-game/benchmarks.ts` | Optional reference archetypes and how a build is measured against them | **yes: replace or omit** |
| domain | `src/domain/toy-game/adapter.ts` | Assembles the adapter, including its report theme and cover | **yes: replace** |
| application | `src/application/optimization/goal-weights.ts` | Ranks to weights, request text, letter grades | no |
| application | `src/application/optimization/evaluate.ts` | Pick-in-build rating, goal coverage, build value (`ENGINE` weights) | no |
| application | `src/application/optimization/recommend.ts` | Ranked, explained options for one slot | no |
| application | `src/application/optimization/auto-build.ts` | Greedy fill, hindsight refinement, two-step lookahead (`LOOKAHEAD`) | no |
| application | `src/application/optimization/report.ts` | Report data: profile, level curve, story, choices | no |
| application | `src/application/optimization/peer-comparison.ts` | Rank measured figures among reference points (unmeasured is never zero; ties share a place) | no |
| application | `src/application/optimization/persistence.ts` | Build export and checked import | no |
| presentation | `src/presentation/web/optimizer-template/optimizer-template.tsx` | Placeholder UI for any adapter: request, build, import/export, report | no |
| presentation | `src/presentation/web/optimizer-template/report-document.tsx` | Printable report: themes, cover, running header, page numbers, PDF download | no |
| presentation | `src/presentation/web/optimizer-template/goal-charts.tsx` | Radar and per-level sparklines for any goal list | no |
| presentation | `src/presentation/web/optimizer-template/comparison-charts.tsx` | Peer bars and rank strips for the comparison | no |
| presentation | `src/presentation/web/optimizer-template/toy-example.tsx` | Binds the UI to one adapter | **yes: one per game** |
| composition / app | `src/composition/report-pdf.ts`, `app/api/report-pdf/route.ts` | PDF route: validates the request | no |
| infrastructure | `src/infrastructure/adapters/pdf/report-pdf.adapter.ts` | Headless Chrome, scripts off, every request blocked except web fonts | no |
| tests | `tests/optimization-template.test.ts` | Contract checks run over every adapter, plus engine behavior | add your adapter to `ADAPTERS` |
| tests | `tests/ui/template-ui.test.mjs` | Browser test: hydration, auto build, persistence, report, import/export, PDF | update the labels if your screen differs |

Dependencies only point downward (`npm run arch:check` enforces it). A game's domain folder may
import the kernel contract but not `src/domain/optimization` or another game. The engine gets
the game only through the adapter, and `app/` reaches the UI only through `presentation`.

## Adding a new optimization target, step by step

1. **Write the rules down first** (as `catalog.ts`'s header comment does). If you can't state
   the rule, the engine can't respect it.
2. **Catalog** (`src/domain/<game>/catalog.ts`): goals with `plays`/`gapAdvice` text, then options.
   Record mechanical facts (level, cost, prerequisites, exclusions) separately from your
   authored judgment (`base` scores).
3. **Rules** (`rules.ts`): slots per level, and **one** `selectionReasons(build, slot, option)` that
   both `legalOptions` and `validate` use. That way the picker can never offer something
   validation rejects. Check prerequisites at the level the option is acquired: a later pick can't
   make an earlier one legal.
4. **Scoring** (`scoring.ts`): every tunable number goes in one documented `SCORING` table. Each
   point is added through a `Contribution` with honest `evidence`: `rule-derived`, `explicit`,
   `tactical` or `heuristic`.
5. **Relations**: write them by hand (synergy, anti-synergy, redundancy), each with a reason and
   evidence. Use tag rules only where the rules text really applies to a tag (as the toy's
   origins do).
6. **Presets**: a few named requests, as the toy's are. These are the "optimization examples"
   a user starts from.
7. **Optional extras**: `benchmarks` (reference points measured on real figures, as in
   `benchmarks.ts`; never on the optimizer's own 0-100 scores) and `report` (theme, running header,
   cover text or image).
8. **Adapter** (`adapter.ts`): assemble it exactly like `TOY_ADAPTER`.
9. **Tests**: add the adapter to `ADAPTERS` in `tests/optimization-template.test.ts` (the contract
   checks run automatically). Then add tests that pin your game's tricky rules, the way the toy
   tests pin "prerequisite at acquisition level".
10. **UI**: copy `toy-example.tsx` for your adapter and render it from `app/page.tsx`.

## Rules every target must keep

- **Explain every number.** A score whose contributions don't add up to it is a bug (a contract
  test checks this).
- **Attention narrows the order, never the legal set.** Never drop a legal option to save time;
  PNC-Lite's fallback exists for this.
- **The player's picks are theirs.** Auto Build fills open slots and only revisits picks it made.
- **Show broken rules; don't hide them.** If a recommendation would break another slot (a removed
  prerequisite, a new exclusion), it is listed under "Breaks". Invalid builds are flagged, never
  silently repaired.
- **Don't guess from names.** Don't infer effects or synergies from option names or prose
  patterns. Author them.
- **Unknown isn't zero.** If something wasn't measured, say so rather than scoring it 0. An
  adapter lists the goals it couldn't judge an option on in `Rating.unknown`; the report then says
  "not graded yet" and shows "?" instead of the 0 (the toy's Iron Skin does this for Support).
- **Unconfirmed isn't counted.** A relation with `state: "candidate"` is explained wherever the
  pair appears but adds nothing until its evidence confirms it (the toy's Bulwark Stance + Second
  Wind).
- **Requirements are checked, not assumed.** A preset can name `blockers`: hard requirements of
  the request, defined on the adapter, each returning met, not met or can't tell. The UI and report
  flag them; they are not game rules (the toy's Bodyguard needs a guard option).
- **Scores aren't win rates.** The report says so; keep it that way.

## How other kinds of game map onto the contract

These are short placeholders to show the contract stretches beyond character builds:

| Target | Slot | Option | Goals | Relation example | Progression |
|---|---|---|---|---|---|
| TTRPG character (toy; the PF2e Kineticist optimizer in git history) | feat or talent slot per level | feat, talent, origin | damage, defense, support, mobility | setup → payoff (Mark Target → Hunter's Focus) | levels |
| Video game loadout (action RPG) | equipment slot (head, weapon, ring…) | item | damage, survivability, speed, utility | set bonus; two items sharing one cooldown | gear tiers or none (`maxLevel: 1`) |
| Party or encounter composition (the Lancer optimizer in git history) | roster position | unit or NPC class plus template | pressure, durability, control, variety | defender covers an artillery unit's weakness | encounter budget tiers |
| Deck or skill bar (card game, MMO hotbar) | deck or bar position | card or skill | tempo, value, consistency | combo pieces; two cards competing for one resource | none |

Non-pick decisions (class, subclass, gate, frame) are slots too. If a game needs more build state
than `{level, picks}`, model it as slots first. Widen the contract only if that truly can't work.

## Known limits of the template engine

- The search is greedy, then single swaps, then pairs of slots. It does not search three-slot
  chains; give such chains an authored relation so the pair search sees them.
- Pair search tries `LOOKAHEAD` (4) best options per slot plus up to 4 options with an authored
  synergy. Raise it for games where setups are buried deeper, and watch the time it takes.
- Scores are judgments, not simulations. Nothing here plays out a fight.
- Larger features from the original optimizers that are not in the template yet (precomputed top
  builds per combination with a Web Worker, role rankings over them, damage-by-level bands against
  reference classes) are in git history; `TEMPLATE_AUDIT.md` says where.

## Running it

- App: `npm run dev`.
- Checks: `npm test`, `npm run typecheck`, `npm run arch:check`.
- PDF locally: set `REPORT_CHROMIUM_PATH` to a local Chrome or Chromium, then use **Build report / PDF → Download PDF**.
- Browser test: `npm run build`, then `REPORT_CHROMIUM_PATH=/path/to/chrome npm run test:ui`.
