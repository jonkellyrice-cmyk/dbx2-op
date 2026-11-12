# Gaps to fill

What the optimizer's data still doesn't know. This file is generated from `docs/ingest/catalog/character.json` and `catalog.json` by `npm run gaps`; a test fails if it falls out of date, so don't edit it by hand.

To fill a gap: add the source to `docs/ingest/catalog/sources.json` (with the page revision or date), put the value or description in `character.json` or `catalog.json` with `verification: "documented"`, then run `npm run gaps`.

| Gap | Count |
|---|---|
| Values the sources disagree on | 11 |
| Combo strings with no description | 34 |
| Numbers no source gives | 56 |
| Skills and other options: what's still unknown | 13 |

## Values the sources disagree on

Two sources give different answers, so the value is held as unknown until one is confirmed in game.

- **Frieza Race**
  - `high-basic-multiplier`: The wiki says high; a 2025 community guide says basic attack damage is on the low end of average (7th of 8 races).
- **Namekian**
  - `high-basic-multiplier`: The race page says third-highest; the CaC page says 'Low attack', and a 2025 community guide ranks Namekian basic attacks lowest (8th of 8).
  - `faster-stamina-regen`: The wiki says 20% faster; a 2025 community guide says 15% higher than other races. Held as unknown until confirmed.
- **Saiyan (male)**
  - `revive-damage`: The wiki gives +7.5% damage after reviving; a 2025 community guide gives a 10% damage boost ('Zenkai boost') for Saiyans. Held as unknown until confirmed.
- **Saiyan (female)**
  - `revive-damage`: The wiki gives +7.5% damage after reviving; a 2025 community guide gives a 10% damage boost ('Zenkai boost') for Saiyans. Held as unknown until confirmed.
- **Body type Thin**
  - `strike and basic damage bonus`: The CaC page's table gives thin 0% / 7%, average 3.5% / 3.5%, thick 7% / 0% (strike and basic / Ki Super); its prose says thin is +3% Ki and -3% strike, thick the opposite, average neutral. Unknown until one is confirmed in game.
  - `Ki Super damage bonus`: The CaC page's table gives thin 0% / 7%, average 3.5% / 3.5%, thick 7% / 0% (strike and basic / Ki Super); its prose says thin is +3% Ki and -3% strike, thick the opposite, average neutral. Unknown until one is confirmed in game.
- **Body type Average**
  - `strike and basic damage bonus`: The CaC page's table gives thin 0% / 7%, average 3.5% / 3.5%, thick 7% / 0% (strike and basic / Ki Super); its prose says thin is +3% Ki and -3% strike, thick the opposite, average neutral. Unknown until one is confirmed in game.
  - `Ki Super damage bonus`: The CaC page's table gives thin 0% / 7%, average 3.5% / 3.5%, thick 7% / 0% (strike and basic / Ki Super); its prose says thin is +3% Ki and -3% strike, thick the opposite, average neutral. Unknown until one is confirmed in game.
- **Body type Thick**
  - `strike and basic damage bonus`: The CaC page's table gives thin 0% / 7%, average 3.5% / 3.5%, thick 7% / 0% (strike and basic / Ki Super); its prose says thin is +3% Ki and -3% strike, thick the opposite, average neutral. Unknown until one is confirmed in game.
  - `Ki Super damage bonus`: The CaC page's table gives thin 0% / 7%, average 3.5% / 3.5%, thick 7% / 0% (strike and basic / Ki Super); its prose says thin is +3% Ki and -3% strike, thick the opposite, average neutral. Unknown until one is confirmed in game.

## Combo strings with no description

The string exists, but no source describes it. The in-game Combo List (pause menu, single-player mode) shows every string.

- **Frieza Race:** Light String (9L), Heavy String (5H), LHH, Alternating String (HLHLH), 5L3H, Grab, Light Break, Heavy Break
- **Namekian:** Grab, Light Break, Heavy Break
- **Saiyan (male):** 5L3H, Grab, Light Break, Heavy Break
- **Saiyan (female):** Grab, Light Break, Heavy Break
- **Majin (male):** Light String (9L), Heavy String (5H), LHH, Alternating String (HLHLH), 5L3H, Grab, Light Break, Heavy Break
- **Majin (female):** Light String (9L), Heavy String (5H), LHH, Alternating String (HLHLH), 5L3H, Grab, Light Break, Heavy Break

## Numbers no source gives

The source gives a direction or a ranking (for example "high health") but no number.

- **Frieza Race**
  - `low-base-health`: Their health is relatively low compared to other races. (The source gives a direction, not a number.)
  - `high-base-speed`: Their base speed is high. (The source gives a direction, not a number.)
  - `high-ki-super-multiplier`: They have a high multiplier for Ki Blast supers. (The source gives a direction, not a number.)
  - `stamina-while-attacking`: Their stamina recovers while attacking. (Rate not documented; spec §3.3 says to test it with specific moves rather than generalize.)
  - `ki-blast-stun`: Regular Ki attacks have a chance to stun the opponent. (The chance is not documented.)
- **Frieza Race (moveset)**
  - `hard-to-learn-strings`: It has also been noted by some that their combo strings can be difficult to learn/use compared to other races. (The source describes it, but gives no number.)
  - `stamina-during-combos`: Regens stamina during combos. (Already recorded as a race trait; repeated here because it comes from the strings. Rate not documented.)
- **Namekian**
  - `high-base-health`: Namekians have the second highest health stat from the CaC races, being only slightly behind Male Majins. (The source gives a direction or a ranking, not a number.)
  - `low-super-multipliers`: Lower for both super categories, being only a bit better than the worst for each. (The source gives a direction or a ranking, not a number.)
  - `slow-movement`: They are considerably slow in most movement categories, mostly tying or being equal with Male Majins. (The source gives a direction or a ranking, not a number.)
  - `low-health-regen`: Health regeneration is activated when low on health (red zone). (The regeneration rate and the exact red-zone threshold are not documented. A 2025 community guide puts the threshold at 10% of total health; not confirmed.)
- **Namekian (moveset)**
  - `stretching-reach`: Stretchy arms with substantially increased hit range. (The source describes it, but gives no number.)
  - `slower-combos`: Combos on the slower side, low hit priority in PvP. (The source describes it, but gives no number.)
- **Earthling (male)**
  - `middle-health`: They have the same health as Human Females, standing below Male Majins and Namekians, but above Saiyans and Frieza Race. (The source gives a direction or a ranking, not a number.)
  - `low-basic-multiplier`: Their basic damage multiplier is low, similar to female humans and Male Majins. (The source gives a direction or a ranking, not a number.)
  - `lowest-ki-super-multiplier`: They have the smallest multiplier of all races for Ki Blast Damage. (The source gives a direction or a ranking, not a number.)
  - `high-strike-multiplier`: They have the second highest multiplier for Strike damage, right below Majin Females. (The source gives a direction or a ranking, not a number.)
  - `passive-ki-regen`: They have a slight passive ki regeneration. (The regeneration rate is not documented.)
- **Earthling (male) (moveset)**
  - `strong-strings`: Arguably the best combo strings in the game. (An opinion in a community guide, written for Earthlings of both genders.)
  - `stun-setup`: Fourth attack will cause a notable stun on the opponent, which can allow the player to land various moves, even slow ones. (From the Alternating String (HLHLH).)
- **Earthling (female)**
  - `middle-health`: Their health is the same as Human Males, standing above the Saiyans, but below Namekians and Male Majins. (The source gives a direction or a ranking, not a number.)
  - `low-basic-multiplier`: Their basic damage multiplier is low, similar to male humans and Male Majins. (The source gives a direction or a ranking, not a number.)
  - `lowest-strike-multiplier`: They have the smallest multiplier of all races for Strike Damage. (The source gives a direction or a ranking, not a number.)
  - `high-ki-super-multiplier`: They have the second highest multiplier for Ki Blast supers, second only to Saiyan Females. (The source gives a direction or a ranking, not a number.)
  - `passive-ki-regen`: They have a slight passive ki regeneration. (The regeneration rate is not documented.)
- **Earthling (female) (moveset)**
  - `strong-strings`: Arguably the best combo strings in the game. (An opinion in a community guide, written for Earthlings of both genders.)
- **Saiyan (male)**
  - `low-health`: In terms of health, they stand in the lower half, just below humans, but above female Saiyans, Female Majins and Freeza Race. (The source gives a direction or a ranking, not a number.)
  - `highest-melee-multiplier`: They have the highest damage modifier on basic melee attacks. (The source gives a direction or a ranking, not a number.)
  - `lowest-basic-ki-multiplier`: They have the lowest damage modifier on basic ki blasts. (The source gives a direction or a ranking, not a number.)
  - `upper-half-supers`: In terms of both super damage they are below their female counterparts, but still in the upper half. (The source gives a direction or a ranking, not a number.)
  - `longer-buffs`: Males have stronger melee attacks and buffs last longer, but Super Moves aren't as strong. (How much longer is not documented.)
- **Saiyan (male) (moveset)**
  - `best-combo-damage`: Saiyan males have best combo damage output. (A ranking in a community guide; no number.)
- **Saiyan (female)**
  - `low-health`: Low health, standing right below their male counterparts and above female majins and Frieza race. (The source gives a direction or a ranking, not a number.)
  - `highest-ki-super-multiplier`: The highest ki blast damage multiplier. (The source gives a direction or a ranking, not a number.)
  - `high-strike-multiplier`: Decently high strike damage multiplier. (The source gives a direction or a ranking, not a number.)
  - `highest-charged-blast-multiplier`: They also possess the highest damage multiplier on Charged Ki Blasts. (The source gives a direction or a ranking, not a number.)
  - `lowest-melee-multiplier`: The lowest on basic melee attacks, being the exact opposite of SyMs in that regard. (The source gives a direction or a ranking, not a number.)
  - `better-ki-stamina-recovery`: Females can use Z Assists more frequently, better Ki and Stamina recovery, but lower health. (How much better is not documented.)
- **Saiyan (female) (moveset)**
  - `average-combo-damage`: Their combos are surprisingly average in damage. (An opinion in a community guide; no number.)
  - `online-timing`: The fourth attack is notorious about missing online, but can be remedied by slightly delaying it. (From the Alternating String (HLHLH).)
- **Majin (male)**
  - `max-health`: They also have the maximum possible Health attribute. (The source gives a direction or a ranking, not a number.)
  - `high-stamina`: This race has a whole lot of Stamina at its disposal. (The source gives a direction or a ranking, not a number.)
  - `high-stamina-damage-reduction`: They gain damage reduction when their stamina is filled past the first third of the bar. (How much damage is reduced is not documented. A 2025 community guide says 25% damage reduction while stamina is above 30%; not confirmed, and its threshold differs slightly from the wiki's 'first third'.)
  - `guard-break-vulnerability`: They receive more damage for the first third of the stamina bar after getting their guard broken. (How much more is not documented. A 2025 community guide says 150% damage taken when stamina is low or broken; not confirmed.)
  - `slow-stamina-recovery`: High defense but slow Stamina recovery. (The source gives a direction or a ranking, not a number.)
  - `slow-boost-dash`: Worst Dash speed for example is 0.69 for Male Majin (older community data quoted on the Majin Female page). (From an older Steam guide quoted on the wiki (before the March 2021 patch); not confirmed for the current version.)
- **Majin (male) (moveset)**
  - `slow-combos`: Male majins just kind of suck, they are extremely slow in their combos with not amazing damage output. (An opinion in a community guide; no number.)
  - `stretching-reach`: Stretchy arms with somewhat increased hit range. (The guide lists this for Majins without naming a gender; the wiki confirms it only for Majin Female.)
- **Majin (female)**
  - `balanced-attributes`: Most of their attributes are fairly balanced compared to other races, making them versatile and good for hybrid strike/ki builds. (The source gives a direction or a ranking, not a number.)
  - `high-strike`: They have some of the highest base strike damage in the game. (The source gives a direction or a ranking, not a number.)
  - `second-fastest`: They are the second-fastest race behind the Frieza Race. (The source gives a direction or a ranking, not a number.)
  - `long-reach`: They have extended reach by stretching, similar to Namekians, although not quite as far. (The source gives a direction or a ranking, not a number.)
  - `guard-break-recovery`: Approximately 50-60% Stamina Recovery Rate after having their guard broken (was previously 100% before it got nerfed). (The wiki gives an approximate figure (about 50-60%) after a March 2021 change and does not say what it is measured against; not an exact value.)
  - `lower-health`: Females have less health, but have shorter break duration which helps them avoid critical attacks. (Compared with male Majins; the exact amount is not documented.)
- **Majin (female) (moveset)**
  - `stretching-reach`: They have extended reach by stretching, similar to Namekians, although not quite as far. (The source describes it, but gives no number.)
  - `longest-step`: They cover the most distance with their step dash. (The source describes it, but gives no number.)

## Skills and other options: what's still unknown

From docs/ingest/catalog/catalog.json. Ungraded options score as unknown, not zero, until someone grades them.

- **Innocence Cannon**
  - `tactical grades`: not graded on any goal
  - `flags`: aoe, guard_break, stamina_break, armor_answer, super_armor, invulnerability, tracking, reposition, auto_dodge
- **God of Destruction's Anger**
  - `tactical grades`: not graded on any goal
  - `flags`: aoe, armor_answer, super_armor, invulnerability, projectile, tracking, reposition, auto_dodge
- **Reverse Launcher**
  - `tactical grades`: not graded on any goal
  - `flags`: aoe, guard_break, stamina_break, armor_answer, super_armor, invulnerability, tracking, auto_dodge
- **Consecutive Energy Blast**
  - `tactical grades`: not graded on any goal
  - `flags`: aoe, guard_break, stamina_break, armor_answer, super_armor, invulnerability, reposition, auto_dodge
  - `price`: zeni amount not recorded
- **Emperor's Death Beam**
  - `tactical grades`: not graded on any goal
  - `flags`: aoe, guard_break, stamina_break, armor_answer, super_armor, invulnerability, projectile, reposition, auto_dodge
  - `price`: tp_medal amount not recorded
- **Turn Golden**
  - `tactical grades`: not graded on any goal
