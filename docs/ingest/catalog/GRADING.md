# How the tactical grades were set

Each Super, Ultimate, Evasive, Awoken, Super Soul and QQ Bang gets a 0–5 grade on each of the eight goals (spec §20.2: 1 = narrow or hard to use, 3 = broadly practical, 5 = highly reliable). The scorer turns a grade into 65% of the goal's score.

The grades in `catalog.json` are **MODEL** judgments: evidence `status: "model"`, `verification: "derived"`. Each one rests only on what the record already holds (the wiki's damage figure, hit count, Ki cost in bars, and whether it breaks guard, grabs, counters or teleports), and each says why in its `reason`. A goal that nothing recorded bears on stays **unknown**, never 0. Play testing can replace any grade later; change the grade and its reason together.

| Goal | What sets the grade |
|---|---|
| Burst damage | The wiki's damage per use: under 8% → 1, 8–14% → 2, 15–24% → 3, 25–34% → 4, 35% or more → 5. A source that only calls the damage low → 1. |
| Sustained damage | One or two hits → 1; ten or more tracking hits, or a volley you can keep firing → 3; a long multi-hit Ultimate → 4. |
| Ki economy | Upfront cost: 1 bar → 4, 2 bars → 3, 3 bars → 2, 4 or more → 1. A cost you choose (1 to 5 bars) → 3. |
| Control | Guaranteed guard and stamina break → 5; a grab that catches moving opponents → 4; a counter, or holding the target in place → 3; knockback only → 2; nothing recorded beyond damage → 1. |
| Mobility | A buff to movement speed → 4; teleports behind the opponent → 3; teleports only as a follow-up → 2. |
| Crowd handling | Only when a source says it covers an area: "a wide range" with no area damage recorded → 2. |
| Survivability | Blocks some incoming attacks → 2; makes you take more damage → 1. |
| Stamina safety | No grades yet: nothing recorded so far bears on it. |
