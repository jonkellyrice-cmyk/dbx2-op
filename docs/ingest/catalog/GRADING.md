# How the tactical grades were set

Each Super, Ultimate, Evasive, Awoken, Super Soul and QQ Bang gets a 0–5 grade on each of the eight goals (spec §20.2: 1 = narrow or hard to use, 3 = broadly practical, 5 = highly reliable). The scorer turns a grade into 65% of the goal's score.

The grades in `catalog.json` are **MODEL** judgments: evidence `status: "model"`, `verification: "derived"`. Each one rests only on what the record already holds (the wiki's damage figure, hit count, Ki cost in bars, and whether it breaks guard, grabs, counters or teleports), and each says why in its `reason`. A goal that nothing recorded bears on stays **unknown**, never 0. Play testing can replace any grade later; change the grade and its reason together.

## From option scores to a loadout's score

For each goal the engine stacks the loadout's option scores: the best counts fully, the second at 35%, the third at 15% and each further one at 5%. A loadout has ten option slots, so that stack passes 100 easily. Xenoverse 2 therefore runs it through a curve that keeps rising and never reaches 100 (`XV2_COVERAGE_CURVE` in `src/domain/xv2/adapter.ts`): a stack of 60 scores 53, 100 scores 71, 135 scores 82 and 185 scores 90. The curve is a MODEL choice, not a game fact; tune it against real builds.

| Goal | What sets the grade |
|---|---|
| Burst damage | The wiki's damage per use: under 8% → 1, 8–14% → 2, 15–24% → 3, 25–34% → 4, 35% or more → 5. A source that only calls the damage low → 1. A QQ Bang's +5 to one kind of Super adds only about 6.66% damage with no attribute points in it, less with points (wiki), paid for by the other kind → 2. |
| Sustained damage | One or two hits → 1; ten or more tracking hits, or a volley you can keep firing → 3; a long multi-hit Ultimate → 4; a QQ Bang's +5 to both Basic Attacks and Ki Blast Supers (about 6.66% each at most) → 2. |
| Ki economy | Upfront cost: 1 bar → 4, 2 bars → 3, 3 bars → 2, 4 or more → 1. A cost you choose (1 to 5 bars) → 3. Ki Auto-Recovery that is always on → 4; a large one that needs a trigger → 3. A QQ Bang's top Max Ki boost (5, two more bars at levels 50-99, wiki) → 3: a bigger pool, not faster recovery. |
| Control | Guaranteed guard and stamina break → 5; a grab that catches moving opponents → 4; a counter, an unblockable hit, or holding the target in place → 3; knockback only → 2; nothing recorded beyond damage → 1. |
| Mobility | A buff to movement speed → 4; teleports behind the opponent → 3; teleports only as a follow-up → 2. |
| Crowd handling | Only when a source says it covers an area: an explosion that hits every enemy nearby → 3; "a wide range" with no area damage recorded → 2. |
| Survivability | A QQ Bang's top health boost (5, about +1,500 HP, roughly 15% of a bar) → 3; an escape that knocks attackers away → 3; blocks some incoming attacks, or a defensive Limit Burst → 2; makes you take more damage, or leaves you tired afterwards → 1. |
| Stamina safety | A QQ Bang's top stamina boost (5, about +2 bars) → 4; +5% stamina recovery → 2. An Evasive's cost (100 stamina is one bar): 1 bar → 4, 2 bars → 3, 3 bars → 2, 4 or more → 1. |
