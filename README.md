# Game Optimization Template

Find the best build for a goal in any TTRPG or video game, explain every number, and hand the
player a clean printed report.

You describe a game once, as an **adapter**: its choices, rules, scores and interactions. The
template then gives you:

- a **search** (PNC-Lite: attention plus a full fallback, so the best legal option is never hidden);
- **Auto Build**: fill the open slots for a request, keep the player's own picks, improve them with
  hindsight, and look two picks ahead for setups that only pay off later;
- **explained recommendations** for every slot, including a warning when a swap would break
  another pick;
- an optional **comparison** with reference points (other classes, archetypes, meta builds);
- **build import/export** as checked JSON;
- a **report** with a cover, goal radar, growth by level, milestones, comparison charts and an
  explained entry for every choice, printable or downloadable as a **server-rendered PDF** in a
  clean or an illustrated parchment theme.

The repository ships with a small made-up game, **Toy Skirmish**, as the worked example.

## Start here

0. Read [`BUILDING_A_GAME_OPTIMIZER.md`](BUILDING_A_GAME_OPTIMIZER.md): the whole process for turning
   this template into an optimizer for a real game, start to finish, and which step comes next.
   [`ingest-template/`](ingest-template/README.md) is the example of the documents step 2 produces.
1. Read [`docs/OPTIMIZATION_TEMPLATE.md`](docs/OPTIMIZATION_TEMPLATE.md): what each file does, how
   to add a game step by step, and the rules every game must keep.
2. Read `src/domain/toy-game/` (catalog, rules, scoring, benchmarks, adapter). Copy its shape for
   your game.
3. Run it: `npm install`, `npm run dev`, then open the app.

Checks: `npm test`, `npm run typecheck`, `npm run arch:check`, and after `npm run build`,
`npm run test:ui` (set `REPORT_CHROMIUM_PATH` to a local Chrome to include the PDF).

[`TEMPLATE_AUDIT.md`](TEMPLATE_AUDIT.md) records how this template was extracted from a Lancer
encounter optimizer and a Pathfinder 2e Kineticist optimizer. Both are in this repository's git
history before the template commit, as large reference implementations.

## Design philosophy

**Recommendation first, editing second.** Produce a strong complete draft the player can then
edit. Anything the player sets is a constraint; anything left open is the optimizer's to fill.
A partly specified build is valid input.

**Explainable optimization.** No black-box answers. Say which choices work together, which
weakness a pick covers, what is redundant, where choices compete for the same actions, and why one
option beat another. Show the actual pick-to-pick relationship, not just "good together".

**Hard constraints are not suggestions.** Legality and the player's explicit limits stay separate
from the score. Never break a rule to reach a target; build the strongest legal answer and say
plainly when the target could not be reached.

**Don't solve it by brute force.** Prefer better composition and real synergy over raw stacking
of one stat. Diminishing returns are built in: the second and third option for the same job are
worth less than the first.

## Kinds of interaction the optimizer should understand

Evaluate packages, not just single choices. The adapter's relations express these:

- **Synergy**: two choices reinforce each other.
- **Weakness coverage**: one choice covers another's failure state. Count each weakness covered
  once, not again for every extra cover.
- **Redundancy**: two choices solve the same problem; the second is worth less.
- **Anti-synergy**: a combination undermines itself. Lower the score, don't just warn.
- **Setup and payoff**: one choice is much better when another is present (the toy's Mark Target
  and Hunter's Focus). The two-step lookahead in Auto Build exists for these.
- **Chains**: three or more choices form a sequence worth more than its pairs.
- **Action-economy conflict**: strong choices that compete for the same actions or turn.
- **Reaction competition**: reactions that trigger from the same event or exceed the reaction budget.
- **Spatial fit**: range, adjacency, zones, movement and line of sight.
- **Reliability and tempo**: always-on, once per round, recharge and once per fight are not equal.
- **Opportunity cost**: slots are scarce; what stronger option does this pick displace?
- **Legality versus preference**: legality is yes or no; the score is not.
