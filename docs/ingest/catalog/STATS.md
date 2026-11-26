# Character stats: the model and its sources

`src/domain/xv2/stats.ts` computes a character's health, Ki, Stamina and four damage ratings from level, race/gender, height, body type, attribute points and QQ Bang arrows. It follows the **Xenoverse 2 Stat Calculator v2** (created by Exxod; data collection and formula testing by Rechow and Durp), source key `CALC-V2`. The tables are in `stat-calculator.json`, copied from the calculator's Backend sheet on 2026-11-26.

## Formulas

Each stat is a level multiplier times one plus the sum of additive PSC modifiers:

| Stat | Formula |
|---|---|
| Health | L_HP × (1 + points + QQ + race + height) × 10 |
| Max Ki, Max Stamina | min(L × (1 + points + QQ), 1500) |
| Basic Attack, Basic Ki Blast, Strike Super, Ki Blast Super | L_Damage × (1 + points + QQ + race + body type) × 200 |

- **Attribute points:** 0.002 each for Health and the three damage attributes. For Ki and Stamina, 0.0048 each up to 125 points, then 0.2/75 each up to 200. Basic Attack points feed both Basic Attack and Basic Ki Blast.
- **QQ Bang arrows (−5 to +5):** 0.02 each for Health and damage, 0.08 each for Ki and Stamina. One QQ arrow equals four clothing arrows.
- **Level multipliers:** a lookup table for levels 1–199. It is not linear, so missing levels are never interpolated.
- **Units:** 10,000 HP is one health bar; 100 Ki or 100 Stamina is one bar; Ki and Stamina stop at 1,500 (15 bars).
- The damage ratings describe the character's underlying offence, not the damage of any one attack.

## Checked against

`tests/xv2-stats.test.ts` holds the engine to:
- the calculator's level table (all 199 levels are in `stat-calculator.json`) and its attribute-point coefficients (the formula matched all 201 rows of the sheet's table when imported);
- the per-point and per-arrow values at levels 1, 99, 120 and 199;
- the points needed for 15 Ki bars at level 199 for every QQ Bang Ki arrow count.

The model agrees with the wiki's Attributes page (R3):
- About 42 points buy one Ki bar at level 99 (500 × 0.0048 × 42 ≈ 101 Ki).
- A +5 Ki QQ Bang adds two bars there (500 × 0.4).
- A +5 damage QQ Bang adds about 6.66% to a base PSC of 1.5, and less as points are added.

## In the app

The player enters what the game shows: level, race, height, body type, points per attribute, and the QQ Bang. `src/domain/xv2/derived.ts` passes those to the engine and the app lists the results beside the build: health, Ki and Stamina bars, the four damage ratings, and points used against the level's allowance.

They also change scores, in two ways:
- **Damage.** A Strike or Ki Blast skill's burst and sustained scores are multiplied by the character's reach for that kind: its damage total (1 + race + body type + points + QQ Bang arrows) over the best possible total (2.15: the best race and body type, 200 points, a +5 QQ Bang). Level is left out because it multiplies every character alike. The cut appears as its own line in the score's reasons. It needs race and body type; without them damage scores are left unscaled.
- **Ki and Stamina costs.** A cost is judged against the character's own gauge (3 bars out of 7.6) once level, race, height and body type are set. Until then the profile's default scale of 5 bars is used.

Health does not change a score yet.

The game doesn't show health or damage numbers, so they can't be read off a stat screen. What a player can check is the number of Ki and Stamina bars.

## Not modeled yet

- Clothing other than QQ Bangs.
- Transformations, Super Souls, reinforcement skills, Limit Bursts and conditional racial bonuses (combat-state modifiers applied after the base ratings).
- The calculator's display rounding, and the damage of individual attacks.

## Where it disagrees with other sources

- **Height:** the calculator adds 0, 0.025, 0.075 or 0.1 to the health PSC (shortest to tallest). That is a much smaller spread than the wiki's 95%–110% health multipliers in `character.json`.
- **Body type:** the calculator's weight table adds 0.1 (thin: Basic Ki Blast and Ki Blast Supers; thick: Basic Attack and Strike Supers) or 0.05 to everything (average). Against a base PSC near 1.45, +0.1 is about +7%, which matches the CaC page's 7% table.

Both disputes stay recorded as such in `character.json` until confirmed in game. See `community-findings.yaml` C-004.
