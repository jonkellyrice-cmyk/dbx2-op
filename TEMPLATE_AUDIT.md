# Game Optimization Template: Audit

Date: 2026-11-11 · Status: **carried out**. The template (PR #2) and the strip PRs that followed it
implement this audit. The Lancer, Kineticist and Foundry code it lists as STRIP is removed from the
working tree and remains in git history. The file paths below describe the repository as it was
when audited.

## What this repo is today

One Next.js app with two optimizer modes (`app/page.tsx` switches between them):

1. **Lancer encounter optimizer.** A GM builds NPC encounters for a sitrep. It ships with a
   Foundry VTT companion module for importing, scanning and recording combat.
2. **PF2e Kineticist build optimizer.** A player ranks goals. The app searches the 63 element
   sets for the best level-20 builds, plans levels 1–20 and exports a printed build summary as a PDF.

Both modes run on the same idea. Take a legal pool of options, score each option on several
independent goals, search it with **PNC-Lite** (attention shortlist plus a full fallback), and
explain every number. The template should keep that engine and the kineticist's reporting and PDF
pipeline. The game-specific catalogs, rules and screens should go.

Legend: **KEEP** = keep as is (maybe renamed). **GENERALIZE** = keep how it works, take the game
content out of it. **STRIP** = delete.

---

## Part 1: Useful for any game (keep or generalize)

### 1.1 Optimization core

| What | Where | Verdict | Notes |
|---|---|---|---|
| PNC-Lite search (`shortlistByAttention`, `evaluateWithFallback`, `SearchTrace`) | `src/domain/optimization/pnc-search.ts`, `tests/pnc-search.test.ts` | **KEEP** | Already game-neutral. It's the heart of the template. A shortlist never makes a legal option illegal, and the fallback still guarantees the optimum. |
| Multi-goal score vectors with explained contributions (`ScoreVector`, `Contribution{axis,value,reason,condition,sources,evidence}`, `Rating`, `uncertainties`) | `src/domain/kineticist/objectives.ts` (types block) | **GENERALIZE** | Make the goal list a type parameter instead of the fixed 7 kineticist goals. The evidence tags (`rule-derived` / `explicit` / `tactical` / `mechanical heuristic`) are worth keeping as they are. |
| A single table holding every tunable weight, each one documented | `src/domain/kineticist/scoring.ts` (`SCORING`) + `docs/kineticist-scoring.md` | **GENERALIZE** | Keep the pattern: one documented weight table plus named effect classifiers, never inline magic numbers. The contents are kineticist-only. |
| Goal weighting: rank, tie or exclude goals; `weightsFromRanks`; `primaryObjective`; whole-build value with best-first diminishing returns, a backup option per goal, and a "flavor" nudge | `src/application/kineticist/auto-build.ts` | **GENERALIZE** | It works for any game where a build has several goals. Pull out `wholeBuildValue` and `weightsFromRanks` from the kineticist slot logic. |
| Auto Build: fill only the open choices, leave the user's own picks alone, refine greedy picks with hindsight, optional "cover the basics" pass, exact-set constraint with theme tie-break | `src/application/kineticist/auto-build.ts` (AUTO.005–.010) | **GENERALIZE** | Every optimizer target wants these features. |
| Plan recommender: rank every legal option for a slot against picks before *and* after it, conditional options with requirements listed, bounded two-step lookahead pairs | `src/application/kineticist/plan-optimizer.ts` | **GENERALIZE** | Slot, prerequisite and anchor are generic ideas. The Omnikinesis/Reflow swap section is kineticist-only. |
| Progression plan: the best pick at each level actually played, then converge on the final build through respec/retrain steps | `src/application/kineticist/level-plan.ts` | **GENERALIZE** | Turn "Reflow at 11 / double at 17" into an optional respec rule that each game adapter supplies. Games with no levels can skip it. |
| Precomputed "top builds" over an enumerated option space, a generator script, a Web Worker to recompute off the main thread, and revalidation through the import validator on load | `src/application/kineticist/top-build-generator.ts`, `top-builds.ts`, `presentation/web/kineticist/top-builds.worker.ts`, `scripts/generate-kineticist-top-builds.ts` | **GENERALIZE** | Replace the "63 element sets" with an enumeration that the adapter defines. Delete `top-builds.json`. |
| Role presets plus a role ranking with letter grades (relative to the best role, average of the top 3) and a "comparable scale" guard | `role-presets.ts`, `role-fit.ts`, `scripts/generate-kineticist-role-ranking.ts` | **GENERALIZE** | Keep `rankRoles`, `topMean`, `letterGrade` and `comparableWeights` as they are. Make preset contents per game. Delete `role-ranking.json`. |
| Gate/structural choices scored against the whole build, separate from feat-like picks | `src/application/kineticist/gate-optimizer.ts` | **GENERALIZE** | Many games have non-pick decisions (subclass, ancestry, frame, talent tree branch). |
| Legality validation: each prerequisite checked at the level it was acquired; future choices can't make earlier picks legal; issues reported honestly ("No selection", "Invalid", "Inactive") | `src/domain/kineticist/build.ts` (BUILD.010, PROGRESSION.010) | **GENERALIZE** | Keep the validator's shape (`validateBuild → {known, acquired, issues}`) as the adapter contract. |
| Relations between picks (synergy, coverage, action competition), with rule-derived and tactical relations kept apart | `src/domain/kineticist/relations.ts` | **GENERALIZE** | The relation types and the "role overlap alone is not redundancy" rule carry over to any game. |
| Synergy taxonomy (positive synergy, weakness coverage, redundancy/diminishing returns, anti-synergy, setup→payoff, chains, action-economy conflict, reaction competition, spatial compatibility, reliability/tempo, opportunity cost) | `README.md` §5 (Lancer write-up) | **GENERALIZE** | It's written for Lancer but holds for any game. Move it into a design doc for the template. |
| Action-economy valuation ("value limited action opportunities, don't add up every effect") | `src/domain/kineticist/action-economy.ts`, `turns.ts` | **GENERALIZE** | The idea is generic. The 3-action/aura rules are PF2e. |

### 1.2 Report and PDF (the most valuable part)

| What | Where | Verdict | Notes |
|---|---|---|---|
| Server-side PDF rendering: headless Chromium, JavaScript off, network blocked except an allow-list of font hosts, print media, each step named so errors say where it failed, local-Chrome env override | `src/infrastructure/adapters/pdf/kineticist-pdf.adapter.ts` | **KEEP** (rename) | Rename to `report-pdf.adapter.ts`. Rename the env var `KINETICIST_CHROMIUM_PATH` to something like `REPORT_CHROMIUM_PATH`. |
| PDF HTTP handler: size cap under the Vercel 4.5 MB limit, JSON validation, safe filename, logging | `src/composition/kineticist-pdf.ts`, `app/api/kineticist-pdf/route.ts` | **KEEP** (rename) | Move to `/api/report-pdf`. Rename the `kin-print-root` marker check to something like `report-print-root`. |
| Vercel/Next config for Chromium (`serverExternalPackages`, `outputFileTracingIncludes`) | `next.config.*` | **KEEP** | Update the route path. |
| Client snapshot to static HTML: clone the print root, drop the toolbar, inline the cover image as a data URI, inline every stylesheet, send it to the server and download the blob | `build-summary.tsx` (`summaryHtml`, `downloadPdf`) | **GENERALIZE** | Pull into a reusable `ReportDocument` / `usePdfExport` hook. |
| Print system: `@page` letter size with 16 mm margins, a full-bleed cover page through named `@page cover`, iOS print-engine detection and fallback, page-break rules, light color scheme forced in print, an Escape-to-close modal portal | `build-summary.tsx` (style block) | **GENERALIZE** | Keep how it works. Turn the parchment colors into theme tokens. |
| Decorative frame assets (SVG corner flourishes, seeded paper grain, parchment gradients) | `build-summary.tsx` (`corner`, `pageCorner`, `GRAIN`, `PARCHMENT`) | **GENERALIZE** | A good default "fantasy" theme. Make it one theme option so a sci-fi game can swap it. |
| Report layout: cover, "at a glance", "About this build" story, growth by level, level-by-level play, early picks / loadouts, leveling guide, comparison to peers, full detail, optimization analysis, sources and access | `build-summary.tsx` | **GENERALIZE** | Keep the section skeleton and let each adapter fill in its sections. Rename "Gate junction benefits" and "Levels 1–10 early picks" to adapter-defined section names. |
| Report data model: ordered printable record of every choice (`buildSummary`, `buildPicks`, `rulesText`, `FeatAnalysis` with best goals and reasons) | `src/application/kineticist/build-summary.ts` | **GENERALIZE** | It becomes the adapter's "choice record" contract. |
| Build story generator: headline, sections, signature picks, milestones with advice, per-goal "what it's good at" and "how to cover the gap" text tables, thresholds (`ONLINE`, `USEFUL`, `SHOWPIECE`) | `src/application/kineticist/build-story.ts` | **GENERALIZE** | Keep the engine. Move the voice tables (`ELEMENT_VOICE`, `GOAL_PLAY`, `GAP_ADVICE`) into adapter content. |
| Per-level metrics (`levelPoint`/`LevelPoint`: coverage, overall, impulses, elements) | `build-story.ts` (STORY.020) | **GENERALIZE** | Turn `blastPerAction`/`elements` into an adapter-defined list of metric series. |
| Charts: goal radar (N-axis), goal growth sparklines (small multiples, one scale), per-level bar chart with step highlight, unlock timeline, all with accessible `aria-label` data | `presentation/web/kineticist/build-charts.tsx` | **GENERALIZE** | They only need an `axes` list, a color map and series. `INK` should become theme tokens. |
| Peer comparison charts: ranked peer bars with average line, rank strip with lower-is-better handling, trend line inside a peer band with labels that don't collide | `presentation/web/kineticist/comparison-charts.tsx` | **KEEP** (light generalize) | Almost game-neutral already. Rename "Kineticist (study)" to "Reference baseline". |
| Peer-benchmark framework: a value ranked within a reference pool, null means "not modeled" (never zero), units always printed, honest captions, unmeasured axes listed | `src/application/kineticist/class-comparison.ts` (types, CLASS_COMPARE.020/.040/.050/.060) | **GENERALIZE** | Keep `PeerMetric`, `Peer`, `TrendPoint`, `AxisPanel`, `ordinal`, `metricText`. The apex-item math, Fire-Kineticist scaling and the 29-class data are PF2e. |

### 1.3 UI pieces

| What | Where | Verdict |
|---|---|---|
| Three-step flow: priorities, then top builds, then your build (edit and explore) | `kineticist-explorer.tsx` | **GENERALIZE** (the flow; the slot and gate panels are kineticist-only) |
| Priority ranking picker (rank, tie, exclude; `describeRanks` as "A = B > C"; localStorage persistence) | `priority-ranking.tsx` | **GENERALIZE** |
| Collapsible advanced sections that remember open/closed | `advanced-section.tsx` | **KEEP** (rename the `lcm-kin-` storage key) |
| Score badges that don't rely on color alone | `score-badges.tsx` | **GENERALIZE** (axes and colors as props) |
| Bounded relationship-neighborhood graph with accessible node controls | `relationship-graph.tsx` | **GENERALIZE** |
| Mechanical details / "Sources and accuracy" panel (audited effects and unresolved source gaps shown) | `mechanical-details.tsx` | **GENERALIZE** |
| Build overview: goal profile plus a tappable level timeline | `build-overview.tsx` | **GENERALIZE** |
| Versioned build import/export that doesn't trust imported structure (size cap, version check, whitelisted keys) | `src/domain/kineticist/persistence.ts` | **GENERALIZE** (the validator is kineticist-shaped; the guard pattern is generic) |
| Lancer SVG synergy graph (SSR-safe tooltips, edge bundling) | `encounter-synergy-graph.tsx`, `domain/lancer/encounter-graph.ts` | **GENERALIZE** (the layout and bundling are generic; it reads Lancer catalog names) |

### 1.4 Patterns from the Lancer side worth keeping

These are in Lancer files, but each idea fits any optimizer. Pull the idea out and leave the Lancer code behind.

| What | Where | Why it's generic |
|---|---|---|
| Hard constraints: pinning/locks, global exclusions (`forbiddenClassIds`/`forbiddenTemplateIds`), manual overrides of global bans | `roster-optimizer.ts`, README "Global encounter-wide…" | Any optimizer needs "never pick X" and "always keep Y". |
| Randomize among the top fraction (`randomize`, `topFraction`, injectable `random`) | `roster-optimizer.ts` | Variety without giving up quality. Deterministic in tests. |
| Search diagnostics and per-slot decision trace (`SearchDiagnostics`, `CandidateDecisionTrace`) | `roster-optimizer.ts` | Explains why the optimizer chose what it chose. |
| Unmet-role-aware attention and progress guidance | `roster-optimizer.ts`, tests `roster-attention*` | This is how PNC-Lite gets its unmet-role input. |
| Baseline benchmark harness (fixed scenarios, repeats, median time, stability signature, yield + injectable clock) | `pnc-baseline-benchmark.ts` | Regression guard when changing the search. |
| Bounded deterministic suggestion search that never mutates input | `encounter-assistant.ts` | "Suggest 5 improvements" for any build. |
| Two-axis design: difficulty/strength vs. dynamism/fun, with an agency penalty for stacked denial | `encounter-design.ts`, `dynamism-objective.ts`, `selected-build-dynamism.ts` | Optimizing for fun as well as power fits any game. "Installed doesn't mean activated" is a good rule to keep. |
| Evidence completeness ledger: every catalog item gets a disposition, counts recomputed from the live catalog, "neutral is not useless" | `tactical-evidence-audit.ts`, `TACTICAL_DYNAMISM_AUDIT.md` | Keeps hand-authored scoring data honest. |
| Versioned transfer format with structural validation | `encounter-transfer.ts` | The pattern for exporting to any VTT or tool. |
| Capability text search across the catalog | `capability-search.ts`, `npc-capability-finder.tsx` | "Find options that do X". |
| Mode switch that keeps each mode's state, plus its Playwright test (hydration clean, desktop and mobile) | `app/page.tsx`, `tests/ui/mode-stability.test.mjs` | Keep if the template hosts several adapters. Otherwise keep only the hydration test. |

### 1.5 Architecture, tooling and CI

| What | Where | Verdict |
|---|---|---|
| Clean layers (kernel → domain → application → infrastructure/presentation → composition → app) and the boundary checker | `scripts/check-boundaries.mjs`, `ARCHITECTURE.md` | **KEEP** |
| Ports and adapters (clock, id generator, telemetry) and the `Result` primitive | `src/application/ports/*`, `src/infrastructure/adapters/system|telemetry/*`, `src/kernel/*` | **KEEP** |
| CI: tests, typecheck, boundary check, build, UI stability | `.github/workflows/verify.yml` | **KEEP** (rename "Lancer correctness verification") |
| MDV repo-engine scripts (block index, symbol index, deps graph, patch plan/apply, verify) | `scripts/repo-engine-scripts/*`, `scripts/script-docs/*` | **KEEP** (tooling). Delete the generated `scripts/repo-engine-outputs/*` and regenerate. |
| `CLAUDE.md`, `AGENTS.md` | root | **KEEP** |

---

## Part 2: Lancer-specific (strip)

**Domain (`src/domain/lancer/`, all 51 files).** This covers:
- `catalog.ts` (2,208 lines of NPC classes, templates and features)
- `recommendations.ts` (1,253), `optimizer.ts` (956), `roster-optimizer.ts` (308)
- `combat-normalization.ts`, `build-resolver.ts`, `encounter-*`
- the sitreps and their evaluators: control, escort, extraction, gauntlet, holdout, recon (`*-evaluator.ts` and `*-sitrep.ts`), plus `sitreps.ts` and `sitrep-budget.ts`
- `party-*` (party capability extraction, semantic interpreter, counterplay, counter objective)
- `cross-build-relations.ts`, `tactical-*` (evidence catalog, completion, neutral, audit, counterplay, interactions)
- `naho-counter-highlights.ts`
- all `foundry-*` (mapping audit and gate, semantic verification, mechanical certification, native construction, NPC preview, actor runtime contract, certification reconciliation, feature comparison)
- `model/types.ts`

Take the patterns in §1.4 out first, then delete the folder.

**UI:** `src/presentation/web/lancer/*` (`encounter-maker.tsx` is 1,280 lines, plus `party-hangar.tsx`, `npc-capability-finder.tsx`, the synergy graph and `index.ts`). Also `src/presentation/web/foundry-audit.tsx`, `app/foundry/audit/page.tsx` and `app/api/foundry/module.zip/route.ts`.

**Foundry VTT module:** everything under `public/foundry/lancer-combat-maker/`: `module.json`, the encounter schema, and 18 scripts (bridge, scanner, semantic scanner, NPC importer, party export, combat recorder, events, store, session, export, normalizer, UIs). Also `scripts/build-foundry-normalizer.mjs` and the `foundry:build` step in `npm run build`.
> Optional idea to keep: recording real combats (Phase 4) to calibrate predictions against what actually happened at the table works for any game. The code itself is Lancer 3.1.3 and Foundry only.

**Docs:**
- `FOUNDRY_BRIDGE_README.md` and `TACTICAL_DYNAMISM_AUDIT.md`
- `docs/foundry/*` (including two JSON ledgers of 6.8k and 7.4k lines)
- most of `README.md` (168 KB of Lancer changelog and design). Keep the §1 philosophy ("recommendation first, editing second", "explainable optimization", "hard constraints are not suggestions", "difficulty should not be solved by brute force") and the §5 synergy taxonomy, rewritten without Lancer terms.

**Tests:** 56 of the 57 files in `tests/domain/` are Lancer or Foundry (`build-resolver`, `combat-*`, `cross-build-*`, `encounter-*`, `foundry-*`, `*-sitrep`, `party-*`, `roster-*`, `tactical-*`, and so on). The other one is `examples.test.ts` (see Part 4).

**Config:** the "Lancer encounter optimizer" button and mode in `app/page.tsx`, and the Lancer name in the CI workflow.

## Part 3: Pathfinder Kineticist-specific (strip, after generalizing Part 1)

**Domain (`src/domain/kineticist/`):**
- Rules and data: `aon-catalog.json` (5,833 lines), `aon-manifest.json`, `aon-spell-references.json`, `aon-verified.ts`, `catalog-names.ts`, `healing-data.json`, `junction-review.json`, `mechanics-review-manifest.json`
- `effect-catalog.ts` (per-element effects for Air, Earth, Fire, Metal, Water, Wood), `blast.ts` (Elemental Blast)
- `gate-effects.ts`, `junctions.ts`, `rules.ts` (thresholds, Reflow), `universal-feats.ts`, `modifiers.ts`, `healing.ts`, `mechanics.ts`
- `flavor.ts` (hand-scored spectacle per feat)
- The kineticist **contents** of `scoring.ts`, `objectives.ts`, `build.ts`, `relations.ts`, `turns.ts`, `action-economy.ts` and `persistence.ts`. Their generic shapes move out first (§1.1).

**Application (`src/application/kineticist/`):**
- `optimizer.ts` (Omnikinesis/Reflow swaps), `element-overview.ts`
- `class-benchmarks.json` and `control-benchmarks.json` (the 29-class PF2e study, 180 KB)
- the apex-item and Fire-Kineticist math in `class-comparison.ts`
- `top-builds.json` and `role-ranking.json` (generated output)
- the PF2e voice tables in `build-story.ts`
- `SLOT_LABELS` and the gate and junction wording in `build-summary.ts`

**UI:** `element-overview.tsx` and `gate-planner.tsx`, and the PF2e copy in `kineticist-explorer.tsx` (element and blast-style selectors, gate and threshold controls, "Search official feats", AoN links). Also the hard-coded title in `build-summary.tsx`: "Pathfinder Kineticist Optimizer - Level N …".

**Assets:** `public/kineticist/cover.jpg`. Keep a cover-image slot in the report and leave the image itself to each adapter.

**Scripts:** `scripts/audit-kineticist.py`. Make the two `kineticist:*` npm scripts generic.

**Docs:** `docs/kineticist-*.md` (phases 1–4, action economy, auto build, element overview, gate optimization, scoring) and `docs/kineticist-acceptance-evidence.json`. `kineticist-scoring.md` is a good example of how to document scoring, so keep it as a sample for adapter docs.

**Tests:** the 20 `tests/kineticist-*.test.ts` files and `tests/fixtures/kineticist-builds.json`. Some describe generic behavior (auto-build refinement, top builds, build summary). Rewrite those against a toy adapter instead of deleting them.

## Part 4: Unrelated leftovers (strip)

These come from older templates, not from either optimizer:
- `src/app_feature/feature.tsx`: a 793-line **time calculator**, wired through `src/app/page.tsx` and `src/app/layout.tsx`. `tsconfig` excludes `src/app/**`.
- `src/app/api/premium/route.ts`: an echo stub.
- `docs/semantic/*` and `docs/spec/*`: the time calculator's intent, plan and roadmap (ads, Stripe and so on).
- The `examples` sample domain: `src/domain/examples/*`, `src/application/use-cases/*-example*`, `src/presentation/http/*`, `src/presentation/web/examples/*`, `src/data/tables/exampletable.ts`, `app/api/examples/route.ts`, `src/infrastructure/adapters/memory/example-repository.adapter.ts`, `tests/application/create-example.test.ts`, `tests/domain/examples.test.ts`. It's sample scaffolding, so either strip it or swap it for a toy game adapter.
- Empty or near-empty files: `src/storage/storage.ts`, `src/storage/adapters/adapters.ts`, `src/lib/lib.ts`, the empty `lcm-foundry-candidates.json`, `scripts/repo-engine-outputs/patches/hello-from-patch.txt`.
- `package.json` name `architectural-template`. `.env.example` (`APP_NAME=Architectural Template`, `EXAMPLE_NAME_MAX_LENGTH`).
- Dependencies `next`, `react` and others set to `"latest"`. Pin them in the template.

## Part 5: Proposed template shape (for the next step)

A **game adapter** contract that each target implements, so the engine, report and PDF never import game code directly:

```
GameAdapter<Goal, Option, Build>
  goals: readonly Goal[]                    // axes for scores, radar and badges
  options / catalog + source records        // with verification status
  slots(build), legalOptions(build, slot), validate(build) -> {known, acquired, issues}
  intrinsicScores(option, build) -> {scores, contributions}
  relations(a, b, build) -> Relation[]
  progression?: {levels, respec rule}       // optional
  enumerations?: top-build sets             // optional
  roles?: presets                           // optional
  benchmarks?: peer pools + metrics         // optional
  report: section fillers, story voice tables, metric series, theme, cover image, title format
  persistence: version + import validator
```

Generic layer: `domain/optimization/*` (PNC-Lite, goal weighting, auto-build, plan, progression, top builds, role fit, peer comparison), `application/report/*` (choice record, story, level points), `presentation/web/report/*` (document, charts, PDF hook), `infrastructure/adapters/pdf/report-pdf.adapter.ts`, `/api/report-pdf`.

## Open questions for you

1. Should the template ship with a small **toy adapter** (a made-up mini-game) so the tests and the PDF have something to run against? I'd recommend it.
2. Keep the **multi-mode switch** (several games in one app), or one adapter per deployed app?
3. Keep the **Foundry VTT bridge** pattern as an optional, empty module skeleton, or drop VTT integration completely?
4. Keep the **parchment / fantasy theme** as the default PDF theme, or make the default neutral and offer parchment as an option?
5. Is the Lancer encounter optimizer worth preserving in its own repo before stripping? (`Lancer-combat-maker` is already registered and may already be that.)
