# DRAGON BALL XENOVERSE 2

**Mechanics Specification & Optimization Adapter Contracts — Version 3.1**

**Release:** 11 November 2026 · **Target:** PC / Xbox / PlayStation / Switch · **Format:** Markdown + machine-readable companion

**Read first:** The game-mechanics analysis from Version 2.0 is preserved in §§1–17. Version 3.0 introduced the optimization layer; Version 3.1 makes single-option ratings catalog-only, relations score-bearing when confirmed, and the ingest tests executable in §§18–26 and the accompanying YAML/JSON schemas. Schemas are *documentation and adapter models*, not official or reverse-engineered game engine classes.

A non-exhaustive, schema-first specification of the systems, properties, states, inputs and interactions that govern Dragon Ball Xenoverse 2. Designed for build engineering, testing, documentation and adapter implementation.

Scope: gameplay and character-build mechanics. Not a catalog of every move, Super Soul, item or reward.

**READ FIRST** The contracts in this reference are an analytical documentation model—not reverse-engineered game classes, official data types, or a promise that every field is visible in the user interface. Game rules are separated from proposed schema vocabulary.

## Historical change: Version 1.0 → 2.0

| V1.0: conceptual overview            | V2.0: explicit specification                                                                           |
|--------------------------------------|--------------------------------------------------------------------------------------------------------|
| Explains each system’s purpose       | Defines record fields, value domains, invariants, events, states and lifecycle                         |
| Lists tactical roles for moves       | Separates damage class from tactical behavior, tags and execution mechanics                            |
| Describes Super Souls generally      | Models each Soul as independent conditional effect clauses plus charged-blast and Limit Burst metadata |
| Introduces buffs and transformations | Formalizes effect lifetimes, mutual exclusion, state changes, and precedence questions                 |
| Mentions unlock channels             | Defines reward and acquisition contracts: price, prerequisites, RNG, entitlement and ownership         |

## Navigation

Sections 01–17 preserve the Version 2.0 mechanics chapters; §§18–26 add optimizer contracts. Jump to [§18](#sec-18) for the formal problem, [§19](#sec-19) for goals/slots/legality, [§20](#sec-20) for scoring, [§21](#sec-21) for relations, [§22](#sec-22) for scenarios, [§23](#sec-23) for benchmarks, [§24](#sec-24) for data contracts, and [§25](#sec-25) for acceptance cases.

01 — Scope, notation and evidence

02 — Core entity map and runtime state

03 — Health, Ki and stamina contracts

04 — Input, movement and universal actions

05 — Attacks, contact and defensive resolution

06 — Shared skill schema and four Super categories

07 — Ultimate, Evasive and Awoken specializations

08 — Super Souls, charged blasts and Limit Burst

09 — Effects, triggers, buffs and status ailments

10 — Transformation state machine

11 — Character, race and progression schemas

12 — Equipment, QQ Bangs, inventory and presets

13 — Progression, rewards and acquisition contracts

14 — Cross-system ordering and interaction rules

15 — Build engineering and reproducible tests

16 — Machine-readable-style templates and vocabulary

17 — Version notes, unresolved mechanics and sources

# §1 Scope, notation and evidence
<a id="sec-1"></a>

## §1.1 How to read a contract
<a id="sec-1-1"></a>

Every contract in this document uses the same conceptual layers. Identity says what the record refers to. Eligibility states whether it may be selected or activated. Inputs describe how the user invokes it. Costs and resources define economic constraints. Effects are separate clauses, each with its own trigger and lifetime. Transitions describe changes of state. Acquisition describes how a character or account obtains the object. Evidence indicates the support level.

| Notation                        | Meaning                                                                                                                          |
|---------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| Required / optional / repeated  | A field may be necessary for a complete description, conditionally present, or a list of several objects.                        |
| null / unknown / not_applicable | Not assigned; presently unverified; or conceptually irrelevant. These must not be conflated.                                     |
| enum                            | A controlled vocabulary of possible field values, not a claim about internal game constants.                                     |
| condition + event               | A trigger event occurs, then eligibility predicates are evaluated; a persistent condition can also govern ongoing activation.    |
| invariant                       | A rule that should remain true across all applicable instances.                                                                  |
| GAME / MODEL / VERIFY           | GAME = established observed/documented behavior; MODEL = our schema convention; VERIFY = version-sensitive or disputed mechanic. |
| \[R#\]                          | Bibliographic source key. Source is cited by URL in Section 17.                                                                  |

## §1.2 Scope boundaries and confidence
<a id="sec-1-2"></a>

- GAME rules describe ordinary unmodded Xenoverse 2. A mod proposal does not become a vanilla mechanic simply because it is technically imaginable.

- MODEL vocabulary is deliberately broad enough to capture unusual moves, Super Souls, raids and conditional effects; an individual item does not necessarily populate all fields.

- VERIFY flags identify claims requiring instrumented testing, patch-specific sources or a precise per-skill reference. Never insert a made-up numerical duration or damage multiplier.

- The current public level cap is 199 following Future Saga Chapter 4 (July 2026); some older community pages still display 180. \[R2, R11\]

- Skill classifications, unlocks, Limit Bursts and balance numbers can vary with content version, platform or event rotation.

## §1.3 Universal event vocabulary
<a id="sec-1-3"></a>

| Temporal anchor                           | Examples / meaning                                                                              |
|-------------------------------------------|-------------------------------------------------------------------------------------------------|
| pre-battle                                | Character creation, saved preset selection, inventory availability, mission loadout validation. |
| battle start                              | Start-of-match effects; initial resource values; entrance and mission modifiers.                |
| pre-action / on activation                | Check input/state/cost; commit or reject a skill.                                               |
| startup / active / recovery               | Animation intervals; hitbox eligibility; vulnerability and cancel restrictions.                 |
| on attempt / on hit / on block / on miss  | Different trigger events; do not assume a skill requires damage to trigger an effect.           |
| on threshold cross / while threshold held | Once on entering a range versus continuously while the condition remains true.                  |
| on KO / revive / mission end              | Lifecycle events with distinct ownership and reward consequences.                               |

# §2 Core entity map and runtime state
<a id="sec-2"></a>

## §2.1 Entity relationship contract
<a id="sec-2-1"></a>

The game can be represented by a small connected graph of reusable records. These are analytical relationships—not engine file names.

| Entity               | Contains / references                                                       | Key relationship                                                              |
|----------------------|-----------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| Account              | Entitlements, currencies, unlock flags, shared inventories                  | An account can hold multiple CaCs and shared unlocks.                         |
| Character / CaC      | Identity, archetype, level, attributes, appearance, equipment, presets      | A character selects one active preset on mission entry.                       |
| Preset / loadout     | 4 Supers, 2 Ultimates, 1 Evasive, 1 Awoken, 1 Super Soul, gear              | A preset chooses abilities; it is not a runtime skill-swap interface.         |
| Combatant state      | Current HP/Ki/stamina, position, lock-on, animation, effects, active Awoken | A mission creates runtime state from character + loadout + mission modifiers. |
| Skill                | Input, cost, timing, hit(s), effects, tags, eligibility                     | One skill can emit several hits/events and several independent effects.       |
| Super Soul           | Passive effect clauses, charged Ki Blast behavior, Limit Burst data         | Triggers observe events and apply modifiers to combatants or teams.           |
| Effect instance      | Source, target, start time, expiry, stacking behavior, magnitude            | Several sources may modify the same attribute or state.                       |
| Reward / acquisition | Source, gate, entitlement, currency, item, probability if known             | Obtaining an item is separate from equipping and activating it.               |

## §2.2 Combatant runtime-state schema
<a id="sec-2-2"></a>

### CombatantState

| Field / type            | Allowed values or structure                                                     | Behavior / constraint                                        |
|-------------------------|---------------------------------------------------------------------------------|--------------------------------------------------------------|
| identity: ref           | account_id, character_id, archetype, level                                      | Identity persists; temporary mission IDs may differ.         |
| resources: object       | health, ki, stamina; current/max                                                | Max may change from stats, equipment, skills or effects.     |
| location: object        | position, altitude, facing, velocity                                            | Needed to resolve reach, trajectory, chase and rear attacks. |
| target: ref\|null       | locked-on enemy or none                                                         | Target changes targeting and some commands.                  |
| action_state: enum      | neutral, moving, guarding, startup, active, recovery, stun, knockback, KO, etc. | Determines valid action transitions.                         |
| guard_state: enum       | none, holding, guarding-hit, exact guard, broken                                | Guard interactions differ from evasions and armor.           |
| break_state: enum       | normal, low, depleted, broken, recovering                                       | Do not collapse empty gauge and formal break into one flag.  |
| awoken_state: ref\|null | currently active transformation + stage                                         | Distinct from the skill assigned to the Awoken slot.         |
| effect_instances: list  | buffs, ailments, passives, temporary restrictions                               | Every instance tracks source and end conditions.             |
| team_state: ref         | allies, KOs, Limit Burst availability                                           | Some actions and triggers are team-scoped.                   |
| mode_context: enum      | story, PQ, Expert Mission, raid, PvP, training, etc.                            | Enemy rules and eligibility can vary by mode.                |

## §2.3 Action-state invariants
<a id="sec-2-3"></a>

- A controller input does not guarantee action execution: actor state, mode, target, resources and animation timing must permit it.

- Being near zero stamina is a resource condition; being stamina-broken is an action restriction with its own recovery.

- Hitstun, knockback, paralysis, guardstun and armor are separate statuses even if each can interrupt a combo.

- Active transformation, assigned Awoken Skill and transformation-related appearance are separate concepts.

# §3 Resource contracts: Health, Ki and stamina
<a id="sec-3"></a>

## §3.1 Shared resource field schema
<a id="sec-3-1"></a>

### ResourceGauge

| Field / type                 | Allowed values or structure                                  | Behavior / constraint                                  |
|------------------------------|--------------------------------------------------------------|--------------------------------------------------------|
| resource_kind: enum          | health \| ki \| stamina \| other mission gauge               | The three main combat gauges are HP, Ki and stamina.   |
| current / maximum: number    | nonnegative, bounded; unit per resource                      | A gauge has a current value and a maximum.             |
| regen_rules: list            | passive, conditional, skill-assisted, damage/attack-assisted | Each rule has eligibility, rate and suppressors.       |
| spend_rules: list            | fixed, per tick, held, conditional, follow-up                | Cost timing differs across skills.                     |
| restore / drain events: list | instant amount, % of max, over-time                          | Sources include attacks, souls, allies and items.      |
| thresholds: list             | empty, below percentage, full, custom threshold              | Threshold-based effects may test current or max.       |
| failure_state: enum\|null    | KO, blocked action, stamina break, transformation loss       | Zero does not have the same meaning for all resources. |
| display_rules: object        | bar segmentation, color, warning animation                   | Visual state is not always a complete numeric display. |

## §3.2 Individual resource semantics
<a id="sec-3-2"></a>

| Gauge   | How it normally changes                                                                                                                | Zero / extreme consequence                                                                           |
|---------|----------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| Health  | Damage decreases it; healing, regeneration or item effects may restore it.                                                             | At zero: KO/defeat state, subject to mission revive rules.                                           |
| Ki      | Gained by attacks and damage interactions, charge-type skills, passives, items; spent on most Supers/Ultimates and certain follow-ups. | Insufficient Ki rejects a Ki-gated action. A transformation only ends if its own rule says so.       |
| Stamina | Recovers conditionally; spent by evasive/vanish/dash defenses, some moves and upkeep; guarding damage may deplete it.                  | Can enter formal break state, temporarily denying guarding/stamina-consuming options until recovery. |

## §3.3 Stamina recovery as a state-dependent function
<a id="sec-3-3"></a>

Do not document stamina regeneration as one universal number. The effective rate depends on current action, ground versus air, race, transformation, Super Soul and temporary effects. Frieza Race characters have a reported ability to recover stamina during basic attacking and relatively favorable airborne recovery; test interactions with specific moves rather than generalizing to every Super. \[R3, R10, R13\]

| Condition / event     | Required specification fields                      | Example distinction                                                                  |
|-----------------------|----------------------------------------------------|--------------------------------------------------------------------------------------|
| Neutral / standing    | eligible, base rate, delay                         | Standing on the ground may recover faster than sustained flight for some archetypes. |
| Movement / airborne   | movement family, grounded flag, suppressors        | Flight and Step movement should not be treated identically.                          |
| Basic combo           | basic_attack flag, combo step, race override       | A race-specific passive may permit recovery while basic attacks are active.          |
| Stamina break         | break cause, recovery speed, end condition         | Broken-gauge recovery has distinct restrictions.                                     |
| Transformation upkeep | per-second drain, suppression, form-specific rules | Kaioken is a different resource model than Ultra Instinct.                           |
| Buff / Super Soul     | rate multiplier, trigger, duration, stack group    | More regeneration does not reduce per-dodge stamina cost.                            |

## §3.4 Spend-and-restore transaction
<a id="sec-3-4"></a>

1.  Validate action eligibility and available resource against cost model.

2.  Commit fixed startup cost, or establish a charge/drain rule for a held or extended action.

3.  Execute startup, active hits, and recovery; issue on-hit/on-block/on-miss events as appropriate.

4.  Apply skill, soul and racial restoration/drain clauses in their appropriate trigger windows.

5.  Update UI and check thresholds, break states, KO or form-specific deactivation rules.

**MODEL** The ordering above is a documentation model. Precise engine frame ordering and simultaneous-event precedence are not publicly specified; resolve critical exceptions in Training Mode.

## §3.5 Stamina-break contract
<a id="sec-3-5"></a>

### BreakState

| Field / type             | Allowed values or structure                                              | Behavior / constraint                                                   |
|--------------------------|--------------------------------------------------------------------------|-------------------------------------------------------------------------|
| cause: enum              | guard depletion, heavy/light break attack, skill-induced break, scripted | Different break causes may have different stun/recovery.                |
| entry_event: event       | at hit/contact/guard depletion                                           | Must distinguish depletion from forced break.                           |
| restricted_actions: list | guard, defensive vanish, evasive, other stamina-cost action              | Baseline inability to act with stamina; exact restricted list can vary. |
| recovery_rule: object    | replenishment curve, timing, cancel conditions                           | Do not infer a universal break duration.                                |
| exit_event: event        | break gauge restored and state cleared                                   | Returning to normal may differ from merely gaining some stamina.        |

# §4 Controller inputs, movement and universal actions
<a id="sec-4"></a>

## §4.1 Context-dependent input contract
<a id="sec-4-1"></a>

### InputAction

| Field / type               | Allowed values or structure                                  | Behavior / constraint                             |
|----------------------------|--------------------------------------------------------------|---------------------------------------------------|
| input_chord: list          | single button, held modifier, simultaneous buttons           | Buttons can be remapped and conflict by context.  |
| timing: enum               | tap, hold, release, repeat, double press, directional        | Execution depends on input timing.                |
| actor_precondition: set    | grounded, airborne, guard, hitstun, combo, target locked     | Same button can mean Jump, chase or Vanish.       |
| priority / buffering: rule | action precedence, buffer window, disallowed states          | Engine specifics require empirical confirmation.  |
| resource_cost: rule        | fixed, conditional, free                                     | Cost can vary by offense/defense context.         |
| effect / transition        | move, teleport, change orientation, attack, guard, use skill | Animation commitment and cancel window may apply. |

## §4.2 Default Xbox Type A input map
<a id="sec-4-2"></a>

| Input          | Baseline action                              | Contextual caveat                                                                    |
|----------------|----------------------------------------------|--------------------------------------------------------------------------------------|
| X / Y          | Light / heavy basic attack                   | Heavy attacks may charge; input combinations route to different combos.              |
| B / hold B     | Basic / charged Ki Blast                     | Charged blast subtype can be altered by Soul or Awoken.                              |
| A              | Jump / ascend / context Vanish or follow-up  | Meaning depends on movement, combo, guard and being hit.                             |
| LB             | Guard                                        | Exact Guard depends on timing; guard plus another button can be a different command. |
| RB             | Lock-on / target selection context           | Not itself a locomotion input.                                                       |
| LT + movement  | Boost Dash / quick Step                      | Tap/hold and analog movement distinguish actions.                                    |
| A + X          | Burst Dash family                            | Reverse Burst Dash can use follow-up input; verify layout in-game.                   |
| RT + X/Y/B/A   | Four Super slots                             | Skill activation still subject to state/cost.                                        |
| LT + RT + X/Y  | Two Ultimate slots                           | Cannot activate unless resource/state eligibility is satisfied.                      |
| LT + RT + A    | Evasive Skill                                | Most use stamina; animation can interrupt incoming sequences.                        |
| LT + RT + B    | Awoken Skill                                 | Availability and activation cost depend on equipped transformation.                  |
| LB + B         | Grab / Throw                                 | Throws may answer guarding but depend on range and active state.                     |
| D-pad / sticks | Items, scouter, quest view, target selection | Custom mappings differ; consult controller settings.                                 |

**CAUTION** The publisher’s Xbox One manual documents the core actions, but some examples and costs predate years of balance patches. Treat it as authority for control families, not all current frame values. \[R1\]

## §4.3 Movement action vocabulary
<a id="sec-4-3"></a>

| Mechanic                    | Precondition / cost class                              | Tactical output                                                      |
|-----------------------------|--------------------------------------------------------|----------------------------------------------------------------------|
| Step                        | Movement; generally no explicit skill slot             | Brief reposition, angle adjustment, avoidance.                       |
| Step Vanish                 | Step + timed jump input                                | Short disappear/reposition; distinguish from stamina-paid Z-Vanish.  |
| Boost Dash                  | Direction + boost control; movement drain model        | Sustained rapid flight; can chain dash attacks.                      |
| Burst Dash                  | Target or directional initiation; stamina commitment   | Rapid pursuit/engagement kick, sometimes a punish tool.              |
| Reverse Burst Dash          | Burst Dash follow-up                                   | Relocates to rear attack path; can punish certain protected attacks. |
| Offensive Z-Vanish          | During combo or guard context; variable cost           | Relocate behind or ahead to extend offense.                          |
| Defensive Z-Vanish          | During eligible hitstun; typically higher stamina cost | Escape a continuing enemy combo.                                     |
| Air Recovery                | Eligible post-knockback window                         | Recover control; not synonymous with an Evasive.                     |
| Rear / charged rear attack  | Back direction + attack                                | Punishes opponents behind you; can threaten guard or break.          |
| Knockback chase / follow-up | After particular blow-away states                      | Continues pressure after displacement.                               |

# §5 Attacks, targeting and contact resolution
<a id="sec-5"></a>

## §5.1 Attack instance contract
<a id="sec-5-1"></a>

### AttackInstance

| Field / type              | Allowed values or structure                                               | Behavior / constraint                                              |
|---------------------------|---------------------------------------------------------------------------|--------------------------------------------------------------------|
| source: ref               | combatant, skill, combo step, projectile, environmental                   | Each individual hit/event has an owner and origin.                 |
| damage_class: enum        | basic_light, basic_heavy, basic_ki, strike_skill, blast_skill, non_damage | Damage class affects stat scaling, not the complete tactical role. |
| delivery: enum            | melee, projectile, beam, area, persistent field, grab, counter            | Delivery determines collision and possible reflection.             |
| geometry: object          | range, radius, arc, line, height, travel speed                            | Hits may be spatially limited even with lock-on.                   |
| target_rule: enum         | locked target, aim vector, nearest, self, ally, area                      | Some skills track; others require prediction.                      |
| hit_timing: object        | startup, active frames, hit intervals, recovery                           | Important to interruptibility and total risk.                      |
| contact_outcomes: list    | hit, guarded, perfect-guarded, evaded, whiff, armored                     | Each can trigger different secondary effects.                      |
| hit_reaction: enum        | flinch, stagger, knockback, launch, knockdown, paralysis, none            | Reaction determines follow-up windows.                             |
| guard_interaction: object | blockable, guard pressure, unblockable, guard-break                       | A blockable hit can still threaten stamina.                        |
| armor_interaction: object | armor-piercing, armor-damage, clashes, exception                          | Super Armor is not damage immunity.                                |
| secondary_effects: list   | resource theft, debuff, movement, buff, forced state                      | An attack can accomplish many roles.                               |
| follow_up: object         | optional input, time window, cost, cancel result                          | Multistage attacks should not be flattened into one hit.           |

## §5.2 Contact resolution vocabulary
<a id="sec-5-2"></a>

| Outcome                        | Meaning                                                  | Common build impact                                                     |
|--------------------------------|----------------------------------------------------------|-------------------------------------------------------------------------|
| Hit                            | Attack connects and target accepts hit effects.          | Damage, stagger, paralysis, stamina damage may fire.                    |
| Block / guard                  | Guard absorbs or reduces effect under guard rules.       | Guard pressure, stamina loss and guard-break remain possible.           |
| Just Guard / Exact Guard       | Timed defensive guard that produces a special outcome.   | Can change resources and pushback compared with ordinary block.         |
| Whiff                          | No valid target collision.                               | May still trigger on-use effects; no on-hit effect.                     |
| Dodge / vanish                 | Target avoids collision during eligible window.          | Tracking and active duration determine whether subsequent hits connect. |
| Super Armor contact            | Damage may land without ordinary hitstun.                | Attack cannot be assumed to interrupt the armored target.               |
| Invulnerable contact           | Damage/hit application suppressed by special protection. | No equivalent to Super Armor; check attack-specific exceptions.         |
| Counter / absorption           | Incoming interaction becomes a trigger for response.     | Can convert defense into damage, Ki or positioning.                     |
| Clash / projectile interaction | Projectiles or beams may collide, cancel or reflect.     | Relevant to ranged safety and expert mission mechanics.                 |

## §5.3 Hit reactions and control
<a id="sec-5-3"></a>

A clean stun-lock is not guaranteed by a multihit animation. Each hit has its own timing, hit reaction and knockback trajectory. Some enemies can Vanish or Evasive between hits. Breaking stamina reduces those choices, but a stunned enemy may still recover when the particular state ends. Low-level basic Ki Blasts can produce brief interruptions; charged Ki Blasts may have distinct stun, homing, bomb, rush or power behavior. \[R1, R4, R7\]

| Status / response                          | Contract properties to record                                                  |
|--------------------------------------------|--------------------------------------------------------------------------------|
| hitstun / stagger                          | duration class, escape eligibility, counter eligibility, hit-reaction category |
| guardstun                                  | guard advantage, continuation, stamina depletion, perfect guard possibility    |
| knockback / launch                         | velocity, displacement, chase window, recovery eligibility                     |
| hard knockdown / heavy break               | wake-up behavior, break restrictions, post-impact vulnerability                |
| paralysis / shock / sleep / freeze         | source, duration, cleansing, ability restrictions, boss resistance             |
| poison / slow / blindness                  | tick frequency, value, duration, stacking and removal                          |
| armor / damage reduction / invulnerability | what is resisted: stun, HP damage, grab, guard break, resource loss            |

## §5.4 Combo and cancel contract
<a id="sec-5-4"></a>

### ComboRoute

| Field / type            | Allowed values or structure                                | Behavior / constraint                                                |
|-------------------------|------------------------------------------------------------|----------------------------------------------------------------------|
| archetype / actor       | specific race/gender or playable cast preset               | Combo animations and hitboxes are not universal.                     |
| input sequence          | light/heavy, directional, charged, jump, chase             | Input order determines route.                                        |
| hit conditions          | range, elevation, target reaction                          | Some routes are less stable at atypical height.                      |
| branch / cancel windows | step, basic Ki Blast, Super, Z-Vanish, knockback follow-up | Not every action cancels from every animation.                       |
| escape opportunities    | defensive vanish, evasive, guard, recovery                 | Useful combo duration is limited by enemy resources and states.      |
| resource implications   | Ki built, stamina spent, opponent resources pressured      | The economically best combo need not have the highest direct damage. |

# §6 Universal skill contract and Super subclasses
<a id="sec-6"></a>

## §6.1 Skill-slot architecture
<a id="sec-6-1"></a>

| Slot class      | Quantity | Primary resource / characteristic                                                   |
|-----------------|----------|-------------------------------------------------------------------------------------|
| Super Attack    | 4        | Four classifications: Strike, Ki Blast, Power-Up, Other.                            |
| Ultimate Attack | 2        | Often higher commitment/cost; can include Strike, Blast, Power-Up, Other mechanics. |
| Evasive Skill   | 1        | Primarily defensive/interruption; typically stamina-costed, sometimes offensive.    |
| Awoken Skill    | 1        | Transformation or special stance/state; own activation and maintenance rules.       |

## §6.2 Complete shared skill record
<a id="sec-6-2"></a>

### SkillDefinition — identity and acquisition

| Field / type         | Allowed values or structure                              | Behavior / constraint                                            |
|----------------------|----------------------------------------------------------|------------------------------------------------------------------|
| id / display_name    | unique key, localized label                              | Stable ID is preferable to text alone.                           |
| slot_family: enum    | super, ultimate, evasive, awoken                         | Separates equip slot from attack classification.                 |
| classification: enum | strike, ki_blast, power_up, other, special               | A type label does not force an attack to have only one function. |
| associated_character | one or more source characters                            | Flavor, not necessarily equip restriction.                       |
| rarity / description | if exposed, translated flavor and mechanical text        | Record exact game wording separately from normalized behavior.   |
| availability: object | race, gender, cast/CaC, DLC, patch, mode                 | Some skills cannot be equipped by all characters.                |
| acquisition: list    | shop, instructor, PQ, expert mission, event, progression | Multiple routes may exist.                                       |

### SkillDefinition — execution

| Field / type             | Allowed values or structure                                        | Behavior / constraint                                         |
|--------------------------|--------------------------------------------------------------------|---------------------------------------------------------------|
| activation_input         | selected slot plus optional hold/tap/follow-up                     | Single-press, repeat-to-extend, hold-to-extend are different. |
| activation_preconditions | actor state, target, range, altitude, form, HP threshold           | If condition fails, action may not activate.                  |
| cost_schedule            | Ki/stamina/health, startup vs ticks vs follow-ups                  | Include zero-cost and resource-generating skills.             |
| timeline                 | startup, active, recovery, interrupt/cancel windows                | Precise frame values may remain unknown.                      |
| aim / tracking           | lock-on, free aim, homing, angle, retarget                         | Tracking can change over multiple stages.                     |
| geometry / reach         | range, AoE radius, projectile travel, proximity                    | Spatial requirements explain whiffs.                          |
| animation / VFX / SFX    | reference IDs if known; presentation only unless it defines hitbox | Visual appearance and damage collision are distinct.          |
| stage_count / branches   | one-stage, multistage, conditional extension                       | Each stage may consume cost and spawn hits.                   |
| self movement            | dash, teleport, displacement, launch, guard break                  | A skill can both move and attack.                             |

### SkillDefinition — effects and counters

| Field / type         | Allowed values or structure                                | Behavior / constraint                                       |
|----------------------|------------------------------------------------------------|-------------------------------------------------------------|
| hits: list           | damage class, multi-hit, stun, guard/armor interaction     | Multiple hits may have different properties.                |
| effects: list        | buff, debuff, healing, regen, status, Ki/stamina drain     | Each is an independently triggered EffectClause.            |
| counter_mode         | reactive window, trigger type, response                    | Counters should identify which incoming classes they catch. |
| safety_flags         | armor, invulnerability, reversal, guardability             | Must distinguish all three.                                 |
| cancel_links         | combo entry/exit, supers, evade, step                      | Hard to infer solely from description text.                 |
| end_condition        | animation complete, released input, exhausted resource, KO | Held attacks may end for several reasons.                   |
| mode_modifiers       | boss armor, raid exception, PvP normalization              | Special targets may change reliability.                     |
| source / test result | reference, build version, verified cases                   | Enables reproducible builds and corrections.                |

## §6.3 Tactical-role tags are many-to-many
<a id="sec-6-3"></a>

| Role tag                            | Definition                                                    | Can appear on                            |
|-------------------------------------|---------------------------------------------------------------|------------------------------------------|
| damage / burst / sustained          | Output over a short window / over repeated ticks.             | Strike, Ki Blast, Ultimate, Evasive      |
| gap_close / escape / reposition     | Change distance, angle or relative position.                  | Strike, Ki Blast, Other, Evasive         |
| stamina_break / guard_break         | Restrict opponent stamina defenses or guarding.               | Strike, Ki Blast, Ultimate, special      |
| interrupt / hitstun / crowd_control | Stop active actions, deny turns or influence several targets. | Strike, Ki Blast, Evasive, Ultimate      |
| resource_generate / steal / deny    | Restore self resources or deplete opponent resources.         | Super, Ultimate, Super Soul, Evasive     |
| armor / iframe / counter            | Resist, avoid or answer incoming attacks.                     | Power-Up, Other, Evasive, transformation |
| buff / debuff / heal                | Modify stats or status over an interval.                      | Power-Up, Other, Ultimate, soul          |

**KEY RULE** A Ki Blast Super that teleports and stamina-breaks remains a Ki Blast Super. Damage class and role tags are independent dimensions. \[R4\]

## §6.4 Super category specializations
<a id="sec-6-4"></a>

| Category | Common mechanics                                                  | Must not assume                                                   |
|----------|-------------------------------------------------------------------|-------------------------------------------------------------------|
| Strike   | Melee collisions, lunges, grabs, counters, close-range extension. | Not always short-ranged; not always blockable; not purely damage. |
| Ki Blast | Beam, projectile, energy shockwave, AoE, traps, homing.           | Not always long-ranged; does not guarantee high tracking.         |
| Power-Up | Temporary buffs, pose effects, special resource state, armor.     | Does not necessarily deal damage or persist indefinitely.         |
| Other    | Charging, mobility, protection, utility, control, recovery.       | Not an inferior or purely nonoffensive category.                  |

# §7 Ultimate, Evasive and Awoken specializations
<a id="sec-7"></a>

## §7.1 Ultimate Attack extension contract
<a id="sec-7-1"></a>

### UltimateSpec extends SkillDefinition

| Field / type          | Allowed values or structure                            | Behavior / constraint                                    |
|-----------------------|--------------------------------------------------------|----------------------------------------------------------|
| launch_commitment     | wind-up, cinematic, armor, startup exposure            | An Ultimate is not automatically safe.                   |
| target_lock_model     | single opponent, aimed beam, AoE, search target        | Tracking may be different before and after lock-on.      |
| damage_schedule       | burst, repeated, continuous, hold-to-extend            | Extra Ki spending may increase hit count.                |
| resource_spend        | fixed initial cost, variable drain, per extra volley   | A move may consume more than its minimum listed Ki.      |
| break_interaction     | breaks guard, exploits broken target, not applicable   | Repeated hitstun is not necessarily stamina breaking.    |
| multi_target_behavior | pierce, splash, retarget, local AoE                    | Team battle value differs from duel value.               |
| failure / whiff risk  | block, move out of range, vanish, miss due to altitude | Reliability matters more than peak training-room damage. |

## §7.2 Evasive Skill extension contract
<a id="sec-7-2"></a>

### EvasiveSpec extends SkillDefinition

| Field / type                   | Allowed values or structure                              | Behavior / constraint                                       |
|--------------------------------|----------------------------------------------------------|-------------------------------------------------------------|
| activation_states              | hitstun, knockback, guard, neutral, other                | Different Evasives work in different states.                |
| escape_window                  | instant response, travel, brief immunity, counter hitbox | Do not infer iframes from visual flourish.                  |
| stamina_cost / variants        | usually 2 or 3 bars; exceptional costs possible          | Skill-specific, patch-sensitive.                            |
| reaction_to_attack             | cancel stun, repel, stun pursuer, teleport, guard        | An explosive Evasive can be both defense and crowd control. |
| armor / grab / boss exceptions | countered or resisted attack types                       | Not every Evasive defeats every armored or grab attack.     |
| follow-up availability         | cancel into guard, movement, combo or Supers             | Getting back to neutral quickly can be the main benefit.    |

## §7.3 Awoken Skill extension contract
<a id="sec-7-3"></a>

### AwokenSpec extends SkillDefinition

| Field / type        | Allowed values or structure                             | Behavior / constraint                                                |
|---------------------|---------------------------------------------------------|----------------------------------------------------------------------|
| form_family / stage | unique form ID, stage, branching levels                 | Some transformations select different tiers based on Ki.             |
| entry_condition     | minimum Ki, mission state, species, no conflicting form | Required threshold may not be spent.                                 |
| activation_cost     | Ki or stamina consumed, if any                          | Cost and gate must be separate fields.                               |
| maintenance         | none, per-second drain, state-dependent upkeep          | Zero drain does not imply no downside.                               |
| stat_modifiers      | damage, defense, speed, Ki recovery, stamina recovery   | Modifiers can affect only certain attack types.                      |
| action_override     | basic combo, charged blast, additional charge/control   | Replace and add are different.                                       |
| defensive_behavior  | auto dodge, counter, armor, altered vanish              | Triggers can spend stamina without passive drain.                    |
| cancel_conditions   | stamina break, resource failure, voluntary cancel, KO   | Form-specific, not global.                                           |
| exit / transition   | cleanup, reversion, exceptional animation               | Changing form should not implicitly grant stacking unless permitted. |

## §7.4 Tactical distinction: limit of single-slot labels
<a id="sec-7-4"></a>

An Ultimate that creates a persistent 360-degree damaging field is a crowd-control/area-denial tool. An Ultimate that fires many accurate projectiles is sustained single-target damage and may incidentally stagger. Their slot family is the same, but their role contracts differ. Likewise, an Evasive can protect against knockback and attack nearby enemies without being a conventional damage skill.

# §8 Super Soul contract, charged Ki Blasts and Limit Burst
<a id="sec-8"></a>

## §8.1 Core Super Soul object
<a id="sec-8-1"></a>

A Super Soul is a single equipped item with identity, acquisition, a charged-Ki-Blast modifier where applicable, a Limit Burst package and zero or more independently activated effect clauses. A Soul does not have one universal trigger or one universal lifetime. \[R5, R6\]

### SuperSoulDefinition — identity, equipment and acquisition

| Field / type              | Allowed values or structure                             | Behavior / constraint                                               |
|---------------------------|---------------------------------------------------------|---------------------------------------------------------------------|
| id / name                 | canonical ID, localized quote label                     | Quoted text is not a reliable unique key by itself.                 |
| associated_character      | cast-character attribution; optional                    | Association need not restrict CaC use.                              |
| rarity / level            | displayed star level or tier; optional                  | Do not confuse rarity with effect magnitude.                        |
| description / version     | exact displayed text + normalized interpretation        | Capture patch/language of item tooltip.                             |
| equipment_slot            | one Super Soul per preset                               | Cannot equip multiple souls in one standard preset.                 |
| eligibility               | character/mode/DLC/partner customization limits         | Some souls are not CaC-equippable.                                  |
| acquisition_options: list | Zeni, TP/STP shop, PQ, raid, mix, gift, DLC             | Price, availability and random drops are route-specific.            |
| inventory_instance        | quantity and preset reservation/ownership               | A copy held in a different preset may not be free for another CaC.  |
| charged_ki_blast_type     | race default, homing, rush, power, paralyze, bomb, etc. | Can alter the basic charged blast; form precedence must be checked. |
| limit_burst: object       | preset type, stats/effects, team scope                  | Separate active action from passive effect clauses.                 |
| effect_clauses: list      | zero or more EffectClause records                       | Each clause has its own trigger, limit, magnitude, duration.        |

## §8.2 Acquisition option and pricing contract
<a id="sec-8-2"></a>

### AcquisitionOption

| Field / type          | Allowed values or structure                                                    | Behavior / constraint                                               |
|-----------------------|--------------------------------------------------------------------------------|---------------------------------------------------------------------|
| source_type           | item shop, TP shop, STP shop, PQ, instructor, event, mix shop, raid, NPC, wish | Different routes may coexist.                                       |
| cost                  | currency kind + amount; or recipe ingredients                                  | Do not put a TP price in the Soul itself if multiple routes differ. |
| availability_window   | permanent, rotating, event-limited, DLC-gated                                  | Rotation is not guaranteed by owning the currency.                  |
| prerequisite          | story, mission completion, instructor, advancement test, DLC                   | Prerequisites may be account- or character-scoped.                  |
| reward_rule           | purchase, deterministic unlock, probability drop, quest rank                   | Random eligibility is not the same as guaranteed award.             |
| repeatability         | repeatable, once per save, once per character, unknown                         | Affects farming and additional-copy feasibility.                    |
| availability_evidence | source + date + platform                                                       | Especially important for rotating shop stock.                       |

## §8.3 EffectClause — independent activation unit
<a id="sec-8-3"></a>

### EffectClause

| Field / type                | Allowed values or structure                                                    | Behavior / constraint                                       |
|-----------------------------|--------------------------------------------------------------------------------|-------------------------------------------------------------|
| effect_id / source          | unique clause key; Super Soul or skill ID                                      | Multiple clauses in one soul are evaluated separately.      |
| trigger_mode                | always, on_event, when_condition_true, threshold_crossed, periodic             | A continuous threshold is not a one-shot event.             |
| event                       | battle_start, attack_used, hit, block, KO, ally_revive, form_enter, etc.       | Optional for always-on effects.                             |
| predicates: list            | self HP %, opponent Ki %, skill ID, race, target state, team state             | AND/OR grouping needs to be explicit.                       |
| operation / target_stat     | add %, multiply, set, restore, drain, regenerate, alter action, inflict status | Some effects alter rules rather than stats.                 |
| recipient / source          | self, opponent, teammate, all allies, team, area                               | Effect target is not always the attacker.                   |
| magnitude / units           | flat, %, tier S/M/L/XL/XXL, seconds, bars                                      | Tier labels are approximations unless exact value verified. |
| duration_kind               | instant, timed, maintained-while-true, until_match_end                         | Each clause can have a distinct lifetime.                   |
| cooldown / activation_limit | none, once_per_battle, once_per_life, N stacks, per event                      | Do not assume a soul is consumed when a clause fires.       |
| stacking_policy             | coexist, refresh, replace, accumulate_up_to_N, exclusive_group                 | Exact game policy varies; unknown means unknown.            |
| end_event / suppression     | timer, condition false, transformation exit, KO, match end                     | Suppression may be different from termination.              |
| message / activation cue    | HUD text or audio; optional                                                    | An effect may work without prominent visual feedback.       |

## §8.4 Common trigger grammar
<a id="sec-8-4"></a>

| Trigger form          | Semantics                                                            | Example pattern (illustrative)                |
|-----------------------|----------------------------------------------------------------------|-----------------------------------------------|
| always                | Modifier exists whenever soul is equipped and effect not suppressed. | Always: reduce a damage type taken.           |
| on event              | Fire when a discrete event occurs.                                   | On charged Ki Blast hit: apply status.        |
| on threshold entry    | Fire once when state crosses a boundary.                             | On HP falling below 25%: heal briefly.        |
| while condition holds | Apply only during a maintained predicate.                            | While Ki is full: grant damage bonus.         |
| once per battle       | After first successful trigger, flag clause spent.                   | Once on transformation activation: gain buff. |
| periodic / repeated   | Repeat at interval, perhaps while a predicate holds.                 | While HP low: restore HP per second.          |
| on timer              | Fire after match time or elapsed effect duration.                    | After a delay: grant bonus.                   |
| on allied event       | Observe teammate KO, revive, skill or combat success.                | When ally revives: apply team effect.         |

## §8.5 Magnitude and stacking vocabulary
<a id="sec-8-5"></a>

Super Soul tooltips use broad S, M, L, XL and XXL magnitude labels. A common community approximation is S≈5%, M≈10%, L≈15%, XL≈20% and XXL≈25% or more, but exceptions exist and different stats can implement the same label differently. For engineering, store the label and measured numeric value separately. \[R5\]

| Stack behavior  | Definition                                                                                        |
|-----------------|---------------------------------------------------------------------------------------------------|
| coexist         | Separate effects can be active simultaneously; final modifier composition still needs validation. |
| additive        | Sum modifiers in same quantity (e.g., +10 percentage points each).                                |
| multiplicative  | Apply factors to a base or intermediate value; differs from additive accumulation.                |
| refresh         | New application resets or extends a timer, not necessarily its magnitude.                         |
| replace         | Latest or higher-priority effect removes a competing prior effect.                                |
| stacked capped  | Repeated triggers build stacks to a specified maximum.                                            |
| exclusive group | Only one effect of a particular family can remain active.                                         |
| suppressed      | Effect exists but is temporarily ineligible; it may resume later.                                 |

## §8.6 Charged Ki Blast type contract
<a id="sec-8-6"></a>

### ChargedBasicBlast

| Field / type      | Allowed values or structure                             | Behavior / constraint                                              |
|-------------------|---------------------------------------------------------|--------------------------------------------------------------------|
| source_precedence | race baseline / Super Soul / Awoken override            | Exact precedence is transformation-dependent and should be tested. |
| charge_timing     | hold basic Ki Blast input, charge tiers, release        | Charging and firing are not the same as a Ki Blast Super.          |
| blast_type        | race default, rush, homing, bomb, power, paralyze, etc. | Types affect trajectory, contact and secondary effects.            |
| hit_behavior      | damage, stagger, paralysis, homing, explosion           | Status and effect duration are separate fields.                    |
| resource_cost     | typically no Super-slot Ki cost                         | May coexist with special form-specific functions.                  |

## §8.7 Limit Burst contract
<a id="sec-8-7"></a>

### LimitBurstDefinition

| Field / type           | Allowed values or structure                                           | Behavior / constraint                         |
|------------------------|-----------------------------------------------------------------------|-----------------------------------------------|
| association            | provided by equipped Super Soul                                       | Not a separate normal skill slot.             |
| activation             | dedicated battle input / hold                                         | Uses game-provided Limit Burst control.       |
| scope / availability   | one activation per team per quest/battle                              | Team members compete for a shared use. \[R6\] |
| effect_package         | damage/defense, auto recovery, super armor, revive effects, drawbacks | Varies by Super Soul.                         |
| scaling                | may strengthen with downed teammates                                  | Do not substitute one universal magnitude.    |
| duration / termination | finite; specific effect timing                                        | Record each effect lifetime.                  |
| restrictions           | game mode, team activation, KO, other UI limitations                  | CPU behavior and mission rules can differ.    |

## §8.8 Example: one Soul, multiple independently triggered effects
<a id="sec-8-8"></a>

Illustrative structure (not an exact transcription of a particular item): clause A is an always-on Ki Blast damage bonus; clause B activates once when HP falls below a threshold and restores stamina for several seconds. The clauses do not share the same trigger or duration. Their common parent supplies the item name, availability, charged-blast type and Limit Burst metadata.

| Clause | Trigger                    | Effect                | Lifetime / limit                |
|--------|----------------------------|-----------------------|---------------------------------|
| A      | always                     | +Ki Blast damage      | continuous while equipped       |
| B      | HP crosses below threshold | stamina auto recovery | timed; once per battle          |
| C      | on specific skill use      | flat Ki restoration   | instant; may trigger repeatedly |

**VERIFY** The third clause above illustrates the model needed for Dodon Ray-type synergy. Always verify whether Ki is restored on use, hit, or guard before designing a resource loop.

## §8.9 Worked example: a real Super Soul with two trigger modes
<a id="sec-8-9"></a>

The community-documented Super Soul “I’m neither Kami nor Piccolo...” illustrates why the parent item and its effect clauses must be normalized separately. The Soul has a continuous Ki Blast bonus, a separate conditional health-regeneration effect when stamina is full, a Rush charged-Ki-Blast type, and a Limit Burst associated with revival-gauge recovery. The source lists PQ 30 as its acquisition route. This is an example record, not a comprehensive catalog. \[R5\]

| Part                   | Normalized value                                                          | Why it matters                                                         |
|------------------------|---------------------------------------------------------------------------|------------------------------------------------------------------------|
| Identity / acquisition | Piccolo-associated Super Soul; Parallel Quest 30                          | The item exists independently from the behaviors it grants.            |
| Effect clause A        | \[Always\] Ki Blast skill damage +10%                                     | Continuous passive; no once-per-battle trigger.                        |
| Effect clause B        | \[While stamina = 100%\] Health Auto-Recovery; source lists 0.6% max HP/s | Maintained predicate; ceases when condition fails.                     |
| Charged basic Ki Blast | Rush                                                                      | A basic-blast property unrelated to these damage and recovery clauses. |
| Limit Burst            | Revive Gauge Auto-Recovery                                                | Separate team-scoped activation, not an always-on effect.              |

**VERSION** As with all per-item percentages, numerical values in examples should be rechecked after balance patches. \[R5\]

# §9 Effects, buffs, debuffs and status ailments
<a id="sec-9"></a>

## §9.1 One effect system, many sources
<a id="sec-9-1"></a>

The same abstract EffectClause model should describe bonuses from a pose, a Super Soul, an Awoken form, a racial trait, an equipment item or a mission rule. Source identity matters because removal and stacking can depend on it. \[R8\]

### EffectInstance — runtime record

| Field / type               | Allowed values or structure                              | Behavior / constraint                                          |
|----------------------------|----------------------------------------------------------|----------------------------------------------------------------|
| definition / instance ID   | effect family and specific occurrence                    | Two instances may share a definition but have separate timers. |
| source / owner / recipient | skill, soul, race, equipment or quest                    | Needed to remove form-tied effects.                            |
| start / end conditions     | start event, timestamp, duration or persistent predicate | Instant effects can have no active lifetime.                   |
| modification target        | stat, resource, action rule, status, control override    | Not all effects affect a numeric stat.                         |
| magnitude / rate           | flat, %, per-second, chance, cap                         | Periodic regen requires a tick/rate model.                     |
| status flags               | active, paused, blocked, expired, removed                | An expired effect differs from an unavailable one.             |
| stack group and order      | coexist, refresh, overwrite, cap, unknown                | Never presume numerical composition.                           |
| immunity / cleanse tags    | resistible, cleansable, boss immune, special mode        | Status abilities may perform differently on bosses.            |

## §9.2 Effect families and mechanical properties
<a id="sec-9-2"></a>

| Effect family            | Examples of target fields                                   | Important distinction                                                |
|--------------------------|-------------------------------------------------------------|----------------------------------------------------------------------|
| Offensive modifier       | basic, Strike, Ki Blast, all attacks, charged basic blasts  | Do not apply Ki Blast Super scaling to a Strike skill.               |
| Defensive modifier       | damage taken, damage type resistance, guard effect          | Damage reduction ≠ Super Armor ≠ invulnerability.                    |
| Resource modifier        | Ki restoration, stamina regen, max Ki, max stamina          | Increase in maximum does not imply refill unless explicitly defined. |
| Movement modifier        | run/fly speed, step, dash, teleport behavior                | Speed can change spacing and combo reliability.                      |
| Control modifier         | hitstun, knockback, heavy break, paralysis, stagger         | Control effect may be resisted even if damage lands.                 |
| Status ailment           | poison, paralysis, shock, sleep, slow, blindness            | Need application rules, duration, cleanse, boss immunity.            |
| Input or action override | added charge input, replaced charged blast, special counter | Changes available actions, not simply a stat.                        |
| Team / mission modifier  | revive speed, ally effect, reward/EXP/Zeni                  | Effects can operate outside direct combat damage.                    |

## §9.3 Armor, guard and invulnerability are orthogonal
<a id="sec-9-3"></a>

| Protection             | What it does                                                | What it does not guarantee                                       |
|------------------------|-------------------------------------------------------------|------------------------------------------------------------------|
| Super Armor            | Reduces/prevents ordinary hit reaction for eligible hits.   | No guaranteed HP protection, grab immunity or break immunity.    |
| Damage reduction       | Reduces an eligible damage amount.                          | No prevention of stagger or attack interruption.                 |
| Invulnerability window | Suppression of eligible hit/damage during specified frames. | Cannot be inferred from a teleport animation alone.              |
| Counter window         | Listens for particular incoming attacks and responds.       | Does not cover types excluded from its trigger.                  |
| Guard                  | Defensive state with guard damage/resource rules.           | Can lose to grabs or guard-break behaviors.                      |
| Auto dodge             | Conditional evasion when eligible attack arrives.           | May consume stamina, fail during own animations, or be bypassed. |

## §9.4 Duration and refresh resolution
<a id="sec-9-4"></a>

6.  Check whether the effect source is still equipped, active or eligible.

7.  Evaluate the triggering event or continuously held predicate.

8.  Apply effect instance and resolve conflicts with active stack groups.

9.  Tick periodic changes and decrement duration only under the correct time rule.

10. At expiry, source removal, KO, cleanse or a conflicting effect, remove or suppress the instance according to its contract.

# §10 Transformation lifecycle and precedence
<a id="sec-10"></a>

## §10.1 Awoken state machine
<a id="sec-10-1"></a>

| BASE / UNTRANSFORMED → confirm Awoken equipped and entry requirements met                |
|------------------------------------------------------------------------------------------|
| ACTIVATING → commit applicable cost, animation and entry effects                         |
| ACTIVE FORM / STAGE → apply modifiers, action overrides and upkeep rules                 |
| EXIT TRIGGER → player cancel, stamina break, upkeep failure, KO or special mode rule     |
| CLEANUP / TRANSITION → remove form-specific overrides and restore permitted base actions |

## §10.2 Transformation transition contract
<a id="sec-10-2"></a>

### TransformationTransition

| Field / type          | Allowed values or structure                                | Behavior / constraint                                                     |
|-----------------------|------------------------------------------------------------|---------------------------------------------------------------------------|
| from_state / to_state | base→form, stage→stage, form→base                          | Unmodded XV2 typically has one actively equipped Awoken path.             |
| event                 | Awoken activation, repeated input, deactivation, break, KO | Entering a new form is not a generic combat-loadout switch.               |
| eligibility           | resource gate, race, DLC, cooldown/other form              | Gate must be checked before effects are applied.                          |
| payment               | consume or only require resources                          | Do not assume threshold = amount spent.                                   |
| override_install      | replace charged blast, basic combos, movement, actions     | Override may add functions or replace them.                               |
| ongoing_state         | drains, buffs, passive costs, toggles                      | Costs on auto dodge are not upkeep.                                       |
| termination_cleanup   | remove bonuses, restore prior action graph                 | No automatic inheritance of form-only buffs unless explicitly documented. |

## §10.3 Interaction rule: assignment vs active form
<a id="sec-10-3"></a>

Equipped Awoken Skill is the action available in a preset. Active Awoken form is a current combat state. They are not interchangeable fields. Any proposed dual-loadout combat mod must therefore specify the behavior when a preset’s Awoken assignment changes while another transformation remains active; vanilla Xenoverse 2 does not provide that independent live preset swap.

## §10.4 Ultra Instinct case profile (not a move catalog)
<a id="sec-10-4"></a>

| Mechanic                | Contract interpretation                                                | Build consequence                                                       |
|-------------------------|------------------------------------------------------------------------|-------------------------------------------------------------------------|
| Manual Ki charging      | Adds a guard + heavy input for a built-in charge behavior              | One Super slot can be used for something other than charging.           |
| Auto dodge              | Conditional defensive behavior; stamina cost when it actually triggers | No continuous stamina drain, but repeated automatic dodges have a cost. |
| Counter follow-up       | Optional response with separate resource cost                          | Player can choose whether counterattacking is economical.               |
| Basic Ki Blast variants | Changes regular Ki Blast actions in form                               | Additional tactical options without an equipped Super.                  |
| Damage bonus            | No built-in universal offense multiplier in documented UI form         | Utility must compensate for lost Golden form damage.                    |
| Deactivation            | Form-specific break/deactivation conditions                            | Do not confuse empty Ki with stamina break.                             |

**VERIFY** Use \[R7\] for the then-current listed effects; exact patch values and which normal versus charged Ki Blast inputs are overridden should be checked in-game when authoring per-form records.

# §11 Character archetype, attributes and levels
<a id="sec-11"></a>

## §11.1 Character definition schema
<a id="sec-11-1"></a>

### CharacterDefinition

| Field / type            | Allowed values or structure                                     | Behavior / constraint                                       |
|-------------------------|-----------------------------------------------------------------|-------------------------------------------------------------|
| race / gender archetype | Saiyan M/F; Earthling M/F; Majin M/F; Namekian; Frieza Race     | Eight CaC combat archetypes from five races.                |
| height / body type      | creation-scale values                                           | May affect HP, speed, damage emphasis and reach.            |
| base animation set      | light/heavy route, basic Ki Blast, movement, grabs              | Fixed by archetype unless changed by special forms or mods. |
| racial passives         | recovery, buffs at thresholds, regeneration, item effectiveness | Each racial effect needs trigger/effect semantics.          |
| level / experience      | current level, EXP, level gate                                  | Level adds base growth and may grant attribute points.      |
| attribute allocations   | six nonnegative integer investments                             | Bounded by current per-stat unlock.                         |
| equip / inventory refs  | QQ Bang, clothes, Soul, skills, item set                        | Current preset does not erase account unlocks.              |
| story and gate flags    | Guru, Whis, instructors, transformations, PQs                   | Character gates may differ from account-shared flags.       |

## §11.2 Archetype overview — qualitative, not numeric tier list
<a id="sec-11-2"></a>

| Archetype               | Characteristic to model                                                   | Evidence-sensitive caveat                                                       |
|-------------------------|---------------------------------------------------------------------------|---------------------------------------------------------------------------------|
| Male / female Saiyan    | Damage-oriented stat profiles; transformation access; distinct combo sets | Do not apply one gender’s attack multipliers to the other.                      |
| Male / female Earthling | Ki auto-recovery and full-Ki bonuses; distinct offensive scaling          | Verify full-Ki threshold and rounding.                                          |
| Male / female Majin     | Defensive/recovery differences; fast female break recovery                | Passives differ by sex; do not generalize.                                      |
| Namekian                | Health, item potency, stamina regen and low-HP healing                    | Healing thresholds and rates need precise version tests.                        |
| Frieza Race             | Speed, Ki Blast strengths, special stamina recovery while attacking       | Strong fit for attack-led stamina economy; avoid blanket “all actions recover.” |

## §11.3 Six allocatable attributes
<a id="sec-11-3"></a>

| Attribute       | Primary mechanical target                           | Important limit of inference                                       |
|-----------------|-----------------------------------------------------|--------------------------------------------------------------------|
| Max Health      | Maximum HP                                          | Does not directly increase damage resistance.                      |
| Max Ki          | Ki bar capacity                                     | More maximum Ki is not automatically faster Ki generation.         |
| Max Stamina     | Stamina bar capacity                                | More bars expand escape budget; may affect full-break refill time. |
| Basic Attacks   | Basic melee/normal Ki Blast damage where applicable | Does not generally scale Strike or Blast Supers.                   |
| Strike Supers   | Strike-class special-attack damage                  | Not the same as strike-related statuses or break probability.      |
| Ki Blast Supers | Ki Blast-class special-attack damage                | Not the same as normal Ki Blast behavior or all resource effects.  |

## §11.4 Level, base growth and allocation contract
<a id="sec-11-4"></a>

### LevelProgression

| Field / type              | Allowed values or structure                                  | Behavior / constraint                                           |
|---------------------------|--------------------------------------------------------------|-----------------------------------------------------------------|
| current_level / max_level | 1 to current unlocked cap (199 ceiling as of Nov 2026)       | Cap unlocks differ from current level.                          |
| experience_requirement    | EXP required for next level; curve                           | Do not substitute one linear formula.                           |
| base_stat_growth          | HP, attack scaling and other hidden level-related parameters | Leveling improves more than allocated attributes alone.         |
| attribute_points_awarded  | level-dependent number of new points                         | Total points need not grow uniformly level-to-level.            |
| unspent / allocated       | sum of all six attributes and remaining points               | Cannot allocate more than total awarded.                        |
| per_stat_cap              | default 100; later 125; later 200 with gates                 | Cap unlocks are independent of amount of points earned.         |
| unlock_gate               | Guru/Whis or other current game rules                        | Account-shared and character-specific flags must be identified. |
| respec                    | Dragon Ball wish or other supported method                   | Respec changes allocation, not race or all inventory ownership. |

**VERSION** As of the July 2026 Future Saga Chapter 4 update the maximum level increased from 180 to 199. The fandom Level page was still showing 180 when checked, so the newer patch reporting takes precedence for that specific field. \[R11, R12\]

## §11.5 Growth and derived-stat composition
<a id="sec-11-5"></a>

Treat an effective statistic as a composition of base race/gender values, level growth, allocated attributes, body-size effects, clothing or QQ Bang adjustments, Super Soul conditions, transformation modifiers and transient effects. A “+5” QQ Bang indicator is not five spendable attribute points. Exact additive/multiplicative composition should be measured before publishing numeric simulator outputs. \[R3, R9, R10\]

# §12 Equipment, inventory, items and presets
<a id="sec-12"></a>

## §12.1 Equipable item schema
<a id="sec-12-1"></a>

### EquipmentItem

| Field / type         | Allowed values or structure                                      | Behavior / constraint                                          |
|----------------------|------------------------------------------------------------------|----------------------------------------------------------------|
| item_id / type       | clothing, QQ Bang, Super Soul, accessory, consumable             | Different item classes affect stats differently.               |
| equip_slot           | upper, lower, hands, feet, accessory, QQ Bang, Soul, battle item | Item class determines slot count.                              |
| stats: object        | six attribute modifiers if applicable                            | Accessories generally cosmetic.                                |
| acquisition / rarity | shop, mixing, PQ, wish, raid, DLC                                | Keep source-specific entitlement data.                         |
| stack / quantity     | inventory count, reserved copy, consumable count                 | Ownership and equip-availability are separate.                 |
| restrictions         | character/race/mode/DLC                                          | Not every item is usable everywhere.                           |
| source_version       | patch and event date                                             | Rotating items can disappear from shops without being deleted. |

## §12.2 QQ Bang manufacturing contract
<a id="sec-12-2"></a>

### QQBangRecipe / result

| Field / type        | Allowed values or structure                          | Behavior / constraint                                     |
|---------------------|------------------------------------------------------|-----------------------------------------------------------|
| input_A / input_B   | two clothing items                                   | Inputs are consumed or used under mixing rules.           |
| mixing_item         | mix capsule / special mixing component               | Quality influences result possibilities.                  |
| price               | Zeni mixing cost                                     | Cost belongs to recipe transaction.                       |
| result_grade        | star/quality tier                                    | Up to 6-star QQ Bang supported. \[R9\]                    |
| attribute_modifiers | six signed attribute arrows                          | Overrides clothing attribute adjustments when equipped.   |
| randomness          | probabilistic outcome distribution, possibly unknown | Do not promise deterministic output from materials alone. |

## §12.3 Presets, ownership and account scope
<a id="sec-12-3"></a>

| Record                               | Scope / rule                                                                                                                  |
|--------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| Account-wide currency / unlock flags | Zeni/medals and many content unlocks are shared; exact exceptions must be recorded.                                           |
| CaC-specific progress                | Level, attributes, story progress and some cap-increase steps may require independent completion.                             |
| Owned Skill                          | Skill unlocks can be shared among custom characters subject to DLC/eligibility; not equivalent to additional skill slots.     |
| Super Soul copy                      | Inventory copy may be occupied by a different CaC or saved preset; check duplicate availability. \[R5\]                       |
| Preset                               | Saved combination of gear and skills selectable before battle; vanilla game does not permit full loadout swaps during combat. |
| Battle item                          | Consumable with slot/usage constraints; test whether allowed in particular mission modes.                                     |

## §12.4 Item and mix effect edge cases
<a id="sec-12-4"></a>

Consumables can restore resources, apply team effects, or be restricted by game mode. The contract must specify when activation is permitted, who receives the effect, whether it is consumed, stack rules, and whether quest rules prohibit it. A mix recipe must not be described as simply “costing Zeni” when ingredients are the primary constraint.

# §13 Acquisition, rewards, quests and progression gating
<a id="sec-13"></a>

## §13.1 Reward source contract
<a id="sec-13-1"></a>

### RewardSource

| Field / type                | Allowed values or structure                                            | Behavior / constraint                                 |
|-----------------------------|------------------------------------------------------------------------|-------------------------------------------------------|
| source_id / activity        | story mission, PQ, expert mission, raid, instructor, shop, event, wish | Stable key must identify the specific content.        |
| entry_prerequisites         | story flag, advancement rank, DLC, quest, online state                 | Player may see content before rewards are obtainable. |
| success_condition           | win, protect ally, time, rank, hidden objective                        | Ultimate Finish can have extra prerequisites.         |
| reward_table                | guaranteed, weighted RNG, first-clear, event, selection                | List probabilities as unknown unless verified.        |
| reward_item                 | skill, Soul, costume, currency, experience, character                  | Reward item is separate from an unlock flag.          |
| per_character/account       | ownership or unlock propagation                                        | Distinguish transferable unlock from story progress.  |
| repeatability               | one-time, repeatable, rotating, event-limited                          | Critical to farming expected cost.                    |
| difficulty / mode modifiers | AI roster, enemy armor, allies, health, raids                          | Affects practical farming reliability.                |

## §13.2 ShopOffer record
<a id="sec-13-2"></a>

### ShopOffer

| Field / type         | Allowed values or structure                | Behavior / constraint                                |
|----------------------|--------------------------------------------|------------------------------------------------------|
| item + vendor        | shop item identifier; shop family          | Regular Zeni shop is not TP medal rotation.          |
| currency + price     | Zeni, TP, STP; integer amount              | Possible separate offers for same object.            |
| rotation / window    | permanent, weekly rotation, event-specific | Do not infer a future date without current evidence. |
| stock / restrictions | entitlement, unlock, DLC, quantities       | Availability may depend on player save or account.   |
| acquisition outcome  | item copy or skill unlock                  | Not always another inventory copy.                   |

## §13.3 Farming economics contract
<a id="sec-13-3"></a>

| Measure                   | Working definition                                 | Reason                                                    |
|---------------------------|----------------------------------------------------|-----------------------------------------------------------|
| Expected unlock cost      | Attempts × expected time × resource expense        | Rare drops can dominate optimal farming.                  |
| Clear reliability         | Wins / attempts with a given build                 | Glass-cannon peak damage may farm worse.                  |
| Targets defeated / minute | Relevant kills under quest conditions              | Area control often beats single-target burst.             |
| Resource uptime           | Time with enough Ki/stamina to respond             | Reduces downtime and defensive failures.                  |
| Quest gating progress     | Story, instructor and reward prerequisites cleared | Ice can unlock content for future characters.             |
| Mode compatibility        | Solo AI allies, raids, online limitation           | Avoid evaluating a solo build using PvP-only assumptions. |

# §14 Cross-system interaction rules
<a id="sec-14"></a>

## §14.1 A practical order-of-operations model
<a id="sec-14-1"></a>

11. Select character archetype, level, allocations, equipped preset, QQ Bang, Soul and mission parameters.

12. Construct effective base stats and persistent passive effect definitions. Keep dynamic triggers dormant until their events/conditions occur.

13. On an input, evaluate contextual legality (actor state, lock, distance, form, resources).

14. If valid, commit action and resource transaction according to the skill’s cost schedule.

15. Advance animation and spatial events; resolve contact against guard, dodge, invulnerability, armor and other target states.

16. For the resulting hit/guard/miss/KO events, evaluate all eligible skill, soul, race, effect and mission triggers.

17. Apply state/resource/stat changes; enforce stacking, thresholds, action overrides, break/recovery and transformation termination.

18. Emit a trace of all events and repeat until action, battle or mission completion.

**MODEL** This order is a recommended analysis pipeline, not a reverse-engineered statement about the game engine’s exact frame order. \[R1–R10\]

## §14.2 Precedence questions the schema must make explicit
<a id="sec-14-2"></a>

| Collision                             | Correct question to ask                                                                  |
|---------------------------------------|------------------------------------------------------------------------------------------|
| Super Soul vs Awoken charged Ki Blast | Which source controls normal and charged basic Ki Blast type while the form is active?   |
| Two damage bonuses                    | Are factors additive, multiplicative, capped or an exclusive-group replacement?          |
| Power-Up refresh                      | Does applying another pose replace the first pose or refresh its duration?               |
| Stamina restoration while broken      | Does the skill restore current stamina, accelerate recovery or fail while broken?        |
| Auto dodge vs active attack           | Is auto dodge eligible during startup, recovery, basic combo and guard?                  |
| On-use Soul + missed attack           | Is the trigger issued on activation, on hit or after animation resolves?                 |
| Guard-break + armor                   | Does attack ignore guard, remove stamina or simply produce repeated damage with no stun? |
| Ki at zero + active Awoken            | Is form’s upkeep funded by Ki or stamina, or is it passive?                              |

## §14.3 Multirole skill pattern library
<a id="sec-14-3"></a>

| Pattern                       | Two or more roles                                        | Design value                                  |
|-------------------------------|----------------------------------------------------------|-----------------------------------------------|
| Attack + resource generation  | Deal or threaten damage while restoring Ki/stamina.      | Replaces a separate charge/recovery slot.     |
| Tracking + teleport           | Seek enemy and reposition user.                          | Combines gap closing and offense.             |
| Hit + stamina break           | Damage and deny escape options.                          | Combines control and damage setup.            |
| AoE + pressure relief         | Damage nearby enemies and discourage approach.           | Combines crowd clear and defense.             |
| Evasive + enemy disruption    | Escape hitstun and knock back pursuers.                  | Combines recovery and counter-pressure.       |
| Awoken + action addition      | Transform and gain Ki Charge, counter or blast override. | Converts Awoken slot into utility multiplier. |
| Soul + skill-specific trigger | Alter one move’s behavior and reward its normal usage.   | Can change the role of an existing ability.   |

# §15 Build-engineering and verification protocol
<a id="sec-15"></a>

## §15.1 Role coverage matrix
<a id="sec-15-1"></a>

Use role compression as an optimization objective, but do not confuse maximum tag count with best build. Cover the mission’s necessary jobs reliably, with manageable activation costs and coherent follow-ups. Every role tag must have an actual executable trigger.

| Role                 | Questions to test                                                                |
|----------------------|----------------------------------------------------------------------------------|
| Ki economy           | How do I refill Ki under pressure? What is the net Ki per attack/second?         |
| Stamina safety       | How often can I escape? Does the build spend stamina on offense or auto dodge?   |
| Single-target damage | Can I land high damage consistently without enormous startup or whiff exposure?  |
| Guard / armor answer | What specifically works against guarding, Super Armor or boss rules?             |
| Crowd handling       | Do I have AoE, retargeting or enemy approach denial?                             |
| Mobility and pursuit | Can I close distance without burning too much stamina?                           |
| Pressure / control   | Can I interrupt enemy attacks, extend hitstun or force breaks?                   |
| Recovery / support   | Can I heal, revive or protect an ally if the mode demands it?                    |
| Input ergonomics     | Does the skill demand repeated taps, holds, strict timing or complex follow-ups? |
| Acquisition burden   | Is the component locked by DLC, rotation, rare drops or mentor gates?            |

## §15.2 Measurement record
<a id="sec-15-2"></a>

### BuildTest

| Field / type              | Allowed values or structure                              | Behavior / constraint                             |
|---------------------------|----------------------------------------------------------|---------------------------------------------------|
| game / patch / platform   | version, platform, DLC state                             | Critical for patch-sensitive claims.              |
| character config          | race/gender, level, stats, body size, QQ Bang            | Allows damage and recovery replication.           |
| loadout                   | Super slots x4, Ultimates x2, Evasive, Awoken, Soul      | Full context, not a skill in isolation.           |
| test target               | enemy, level, guard state, armor, mission, AI type       | Different targets change contact outcomes.        |
| trial protocol            | distance, altitude, lock, state, input, repeated N times | Controls confounds.                               |
| metrics                   | damage, contact rate, Ki net, stamina net, time, hitstun | Reliability and economy matter as much as damage. |
| observations / exceptions | whiff behavior, break, input failure, counterexample     | Document negative results.                        |
| conclusion status         | confirmed, plausible, disputed, untested                 | Never promote anecdote to universal rule.         |

## §15.3 Example engineering case: Ice
<a id="sec-15-3"></a>

| Interaction                                   | Hypothesis                                                             | Validation protocol                                                               |
|-----------------------------------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| Ultra Instinct + Frieza Race stamina recovery | Offense can partly replenish stamina consumed by auto dodge.           | Record stamina over identical airborne melee strings with and without auto dodge. |
| Ultra Instinct charge action                  | Frees a Super slot without a separate charging skill.                  | Equip four combat Supers; measure effective Ki refill at guard + heavy.           |
| Dodon Ray + matching Soul                     | A skill can become offensive Ki generation, replacing static charging. | Check Ki change on use, whiff, guard and hit separately.                          |
| AoE Ultimate + AI aggression                  | Approaching enemies increase expected hit rate of a local explosion.   | Record hit count by starting distance and number of enemies.                      |
| Tracking mobility blast                       | One Super combines gap closing and damage.                             | Measure final distance, Ki cost and tracking reliability at several altitudes.    |

## §15.4 Historical conceptual scorecard
<a id="sec-15-4"></a>

> **V3 precedence:** This 0–5 scorecard is a design precursor, not the canonical ranking method. §20 and `optimizer-profile.yaml` define the only executable 0–100 goal rubric, evidence policy, and rank weights.

Score a build against the actual mission rather than against generic peak DPS. A simple 0–5 rubric can rate role coverage, hit consistency, skill-slot efficiency, resource sustainability, survivability, input simplicity, and unlock accessibility. Weight categories by the player’s mission, and record hard blockers separately (for example, “cannot handle guarded target”).

# §16 Canonical vocabulary and reusable record templates
<a id="sec-16"></a>

## §16.1 Legacy illustrative enums (documentation model)
<a id="sec-16-1"></a>

> **V3 precedence:** The following table is retained as an *illustrative V2 vocabulary* only; it is not a second enum registry. The **normative** IDs and enums for machine records live in `schema/vocabulary.schema.json`. Any mismatches must be resolved as vocabulary migrations, not guessed.

| Domain               | Suggested controlled values                                                                                          |
|----------------------|----------------------------------------------------------------------------------------------------------------------|
| slot_family          | super \| ultimate \| evasive \| awoken                                                                               |
| super_classification | strike \| ki_blast \| power_up \| other                                                                              |
| attack_delivery      | melee \| beam \| projectile \| area \| persistent_field \| grab \| counter \| non_damage                             |
| targeting            | self \| locked_enemy \| nearest_enemy \| free_aim \| all_enemies \| ally \| team \| area                             |
| cost_model           | none \| fixed \| on_hit \| on_followup \| per_tick \| held \| variable \| health_cost                                |
| trigger_mode         | always \| on_event \| while_condition \| threshold_entry \| timed \| periodic                                        |
| effect_operation     | add \| multiply \| set \| restore \| drain \| regen \| replace_action \| apply_status \| clear_status \| modify_rule |
| duration_kind        | instant \| timed \| while_condition \| until_KO \| until_form_exit \| until_match_end                                |
| activation_limit     | unlimited \| once_per_battle \| once_per_life \| once_per_team \| N_activations \| cooldown                          |
| stack_policy         | coexist \| additive \| multiplicative \| refresh \| replace \| capped_stacks \| exclusive_group \| unknown           |
| outcome              | hit \| guarded \| exact_guard \| dodged \| whiff \| armored_contact \| invulnerable \| absorbed \| clashed           |
| verification         | official_documented \| patch_notes \| community_documented \| tested \| anecdotal \| disputed \| unknown             |

## §16.2 Historical compact templates
<a id="sec-16-2"></a>

> **V3 precedence:** These records reproduce the Version 2.0 illustrative sketches. Use the strict `schema/*.schema.json` definitions for ingest; fields shown here may be richer, optional or spelled differently than the canonical machine schema.

The following JSON-like blocks specify the expected shape of future records. They are not executable game data or claims about internal file schemas.


```text
SkillDefinition = {
id, name, slot_family, classification, eligible_users,
acquisition_options[], activation: {input, conditions[],
cost_schedule[], startup, active, recovery, cancel_windows[]},
targeting: {mode, tracking, range, geometry},
stages: [{input_condition, hits[], movement, effects[]}],
defensive_properties: {armor, invulnerability, counter},
end_conditions[], role_tags[], source_evidence[], test_cases[]
}
```



```text
SuperSoulDefinition = {
id, name, associated_character, rarity, eligibility,
inventory_rules, acquisition_options[],
charged_ki_blast: {type, precedence_notes},
limit_burst: {effects[], team_scope, duration, restrictions},
effect_clauses: [EffectClause, ...],
version, citations[], verification_status
}
```



```text
EffectClause = {
id, source, trigger_mode, event?,
predicates: {all_of:[], any_of:[], not:[]},
recipients[], operation, target_property, magnitude, units,
duration_kind, duration_value?, tick_interval?,
activation_limit, stack_policy, stack_cap?,
termination_events[], exceptions[], evidence
}
```



```text
CharacterBuild = {
archetype, height, body_type, level, attribute_points: {
health, max_ki, max_stamina, basic_attack, strike, ki_blast},
gear: {qq_bang, clothing[], accessory, super_soul},
skills: {super:[4], ultimate:[2], evasive, awoken},
race_passives[], acquisition_flags[],
desired_roles[], tests[], evidence_version
}
```



```text
RewardSource = {
source_id, source_type, quest_or_vendor, content_version,
prerequisites[], purchase_cost?, recipe?, reward_conditions[],
reward_pool[], probabilities_known: bool,
schedule?, repeatability, account_or_character_scope
}
```


## §16.3 Data-quality rules
<a id="sec-16-3"></a>

- Never store a guessed number where an explicit unknown value is possible.

- Store exact in-game wording separately from normalized effect semantics.

- A field may be conditional: e.g., a projectile-specific tracking field is not applicable to a stationary buff.

- One item can have multiple acquisition options and multiple independently triggered effects.

- Keep current equipped state, owned account inventory and unlocked availability as separate records.

- Changes in patch or DLC content must be versioned rather than silently rewriting historical behavior.

# §17 Version control, unresolved questions and sources
<a id="sec-17"></a>

## §17.1 High-value unresolved mechanics
<a id="sec-17-1"></a>

| Issue                                     | Why it remains open                                                           | Recommended resolution                           |
|-------------------------------------------|-------------------------------------------------------------------------------|--------------------------------------------------|
| Exact stamina recovery curves             | Race, flight, break cause and active animation may modify rates.              | Controlled frame/video tests by state and form.  |
| Super Soul stacking order                 | Tooltip tiers do not fully define additive versus multiplicative composition. | Compare controlled damage/recovery scenarios.    |
| Charged blast override precedence         | Soul and Awoken can both alter charged basic Ki Blast.                        | Equip both, test normal and charged inputs.      |
| Animation startup and cancel frames       | Universal skill schema needs data but per-skill frame lists are extensive.    | Populate skill records on demand from trials.    |
| Boss-specific armor and status resistance | Expert Mission bosses are not equivalent to PvP targets.                      | Mode-specific exception table.                   |
| Resource payment timing                   | On-use versus hit-based returns can change viability of loops.                | Measure HUD changes on use, hit, block and miss. |
| Post-180 attribute-point totals           | New level 199 cap but older tables stop at 180.                               | Record current in-game level-up point awards.    |
| Shop rotation schedule                    | Rotating Super Souls are not necessarily predictable far ahead.               | Use dated in-game shop snapshots.                |

## §17.2 Change log
<a id="sec-17-2"></a>

| Version           | Change                                                                                                                                                                                          |
|-------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1.0 — 11 Nov 2026 | Introduced broad combat, character growth, skill slots, race and progression concepts.                                                                                                          |
| 2.0 — 11 Nov 2026 | Added formal entity/skill/Super Soul/effect/acquisition contracts; controlled vocabularies; state machines; interaction and validation rules; level-cap source correction and schema templates. |

## §17.3 Sources and verification notes
<a id="sec-17-3"></a>

The references below are a combination of publisher material and community-maintained mechanical documentation. Publisher sources are preferred for official feature existence and release details; community data is used for granular mechanics, with explicit testing caveats. Original release manuals may be out of date for numerical balance.

**\[R1\]** Bandai Namco, Xenoverse 2 Xbox One manual: combat inputs, guarding, Ki Blasts, Z-Vanish, pursuit, stamina breaks.  
https://d1vtv52f4vjbmu.cloudfront.net/manuals/dbxv2/one/DBX2_XBoxOne_manuelonline_UK_HD.pdf

**\[R2\]** Bandai Namco, Future Saga Chapter 4 final DLC announcement, 8 July 2026.  
https://www.bandainamcoent.com/news/dragon-ball-xenoverse-2-final-dlc-future-saga-chapter-4-is-available-now

**\[R3\]** Xenoverse 2 Wiki: Attributes and equipment scaling / caps; community reference.  
https://dbxv2.fandom.com/wiki/Attributes

**\[R4\]** Xenoverse 2 Wiki: Super Attack and four classifications.  
https://dbxv2.fandom.com/wiki/Super_Attack

**\[R5\]** Xenoverse 2 Wiki: Super Soul properties, triggers, charged Ki Blast type, shop/mix/quest acquisition and preset copies.  
https://dbxv2.fandom.com/wiki/Super_Soul

**\[R6\]** Dragon Ball Wiki: Super Soul and Limit Burst team-scoped mechanics; updated Oct 2026.  
https://dragon-ballwiki.com/wiki/super-soul/

**\[R7\]** Xenoverse 2 Wiki: Awoken Skill; mechanics/variations and UI effects.  
https://dbxv2.fandom.com/wiki/Awoken_Skill

**\[R8\]** Xenoverse 2 Wiki: Status Effect taxonomy.  
https://dbxv2.fandom.com/wiki/Status_Effect

**\[R9\]** Xenoverse 2 Wiki: QQ Bang generation and clothing override.  
https://dbxv2.fandom.com/wiki/QQ_Bang

**\[R10\]** Xenoverse 2 Wiki: CaC body size, race data and character creation.  
https://dbxv2.fandom.com/wiki/CaC

**\[R11\]** MP1st, 6 Aug 2026 patch report describing Future Saga 4 and 199 cap.  
https://mp1st.com/title-updates-and-patches/dragon-ball-xenoverse-2-update-1-53-1-005-001-fixes-chapter-4-issues-august-6

**\[R12\]** Xenoverse 2 Wiki: Level page (outdated cap 180 when checked); historical level gates.  
https://dbxv2.fandom.com/wiki/Level

**\[R13\]** Steam community discussion: conditional stamina recovery; community observation, not authoritative frame data.  
https://steamcommunity.com/app/454650/discussions/0/3338745825902131292/

**\[R14\]** Xenoverse 2 Wiki: Z-Vanish mechanics and offensive/defensive variants.  
https://dbxv2.fandom.com/wiki/Z-Vanish

**\[R15\]** Xenoverse 2 Wiki: Evasive Skills; usage and resource context.  
https://dragon-ballwiki.com/wiki/evasive-skill/

**\[R16\]** Bandai Namco official product: DLC catalog / Future Saga chapters.  
https://en.bandainamcoent.eu/dragon-ball/dragon-ball-xenoverse-2/dlc

## §17.4 Scope completion checklist
<a id="sec-17-4"></a>

- Skill records support multiple stage/hit/effect definitions and distinct resource payment schedules.

- Super Soul records support independent triggers and activation limits, charged Ki Blast metadata and Limit Burst.

- Resource records distinguish current amount, max, eligibility to regenerate and formal break state.

- Action records distinguish context, inputs, startup/active/recovery and target geometry.

- Awoken records distinguish required resource, consumed cost, added/replaced actions, upkeep and termination.

- Character and account records distinguish unlocks, ownership, leveling, equipment and preset reservations.

- Acquisition records support Zeni, TP/STP, mixing, mission rewards, events and uncertain drop rates.

- Every numerical exception or unusual interaction can be logged as verified/uncertain with a versioned test.

END OF VERSION 2.0 • Mechanics specification only; individual skill and item catalogs are separate future data layers.


# §18 Optimization contract and source-of-truth hierarchy
<a id="sec-18"></a>

## §18.1 Scope and input/output boundary
<a id="sec-18-1"></a>

**MODEL — Version 3 adds an optimization adapter contract, not a claim that the game itself calculates scores.** The optimizer receives a player context, an inventory/catalog, one or more build candidates, a selected scenario preset, and evidence. It produces legality results, goal scores (or explicit unknowns), hard-blocker results, relations, acquisition costs when requested, and a ranked comparison with reasons. No optimizer run may quietly fabricate a skill, a percentage, or an unmeasured benchmark.

**Normative order of authority:** the JSON Schemas in `schema/` define allowed record shapes and enumerations; `optimizer-profile.yaml` defines goals, decision slots, validations, scoring rules, relation generators, scenarios, blockers, and metric definitions; this Markdown specification explains their intent, gameplay context and reasoning. If prose and a machine record disagree, the discrepancy is a validation issue—not permission to silently choose an interpretation.

**Catalogs are deliberately separate and unpopulated** in this bundle. An implementation may use a verified catalog supplied later. The compact examples in tests are *fixtures* rather than authoritative data. All per-option behaviors should be associated with source evidence and the game/content version to which the observation applies.

## §18.2 Formalized optimization problem
<a id="sec-18-2"></a>

Given context `C` (archetype, level, available points, unlocked gates, mode, owned inventory), option catalog `O`, rule set `R`, preference preset `P`, and optional user overrides `U`:

1. Construct the candidate assignments across decision slots in `P.decision_slots`; null indicates an intentionally empty allowed slot.
2. Apply schema validation, then *hard game legality* checks. Reject illegal assignments, and report the exact rule ID, affected slot and message. If eligibility data is unknown, emit `unverified_legal`, not `legal`.
3. Evaluate known effect clauses and generated relations, while retaining conditional assumptions and evidence status.
4. Compute goal scores only from sufficiently evidenced eligible inputs. A missing input is **unknown** and cannot be treated as zero. Return score coverage and uncertainty alongside any numeric score.
5. Evaluate scenario hard blockers *after* legality and scoring. Blockers identify situational disqualification or hazards; do not confuse them with game-legality failures.
6. Rank only candidates that are both legal and comparable under the scenario's evidence threshold. Otherwise, return a partial order with explicit unknowns and tradeoffs.

The algorithm can optimize multiple goals; neither the 0–100 scale nor the goal weighting is part of vanilla Xenoverse 2.

## §18.3 Decision / context / out-of-scope classification
<a id="sec-18-3"></a>

| Category | Fields | Engine handling |
|---|---|---|
| **DECISION** | `super_1`–`super_4`; `ultimate_1`–`ultimate_2`; `evasive`; `awoken`; `super_soul`; `qq_bang`; `attribute_spread` | Candidate generator chooses among eligible, available options. Each filled ability references one catalog ID. |
| **CONTEXT** | race/gender archetype, level, mode, level-cap/attribute-gate state, account entitlement, owned inventory plus its completeness state, entitlement/unlock completeness states, earned attribute points, explicit scenario flags and target evidence, optional body-size stat influence, player accessibility preferences | Player-supplied or measured facts. Do not optimize these as free slot decisions. An unknown earned-point total suspends the applicable legality check. |
| **DERIVED** | baseline stats, effective stats, skill eligibility, costs after modifiers, resource economy, tags, scores, blockers, relations and acquisition burden | Calculated only from evidence-backed inputs and declared algorithms. |
| **OUT OF SCOPE** | appearance/cosmetic choices, accessories without relevant modeled effects, controller remapping, free in-combat swapping mods | May be documented but cannot affect optimizer legality or score in this version. |
| **CONDITIONAL** | clothing stat equipment when no QQ Bang supersedes it, mission-specific rule overrides, special partner/customization systems | Mode/character adapters supply explicit extensions; the default CaC optimizer must not assume an override. |

Attributes are integers rather than real-valued continuous variables. The supported **search discretizations** are `named_spreads`, `step_10`, or `exact_integer`; all final generated spreads must pass exact point budgets and per-stat caps. A `step_10` search may place the remaining points in a separate exact-integer repair step only if its method is declared in the returned result. No inference that 10-point steps are a game restriction is allowed.

## §18.4 Output contract
<a id="sec-18-4"></a>

A recommendation must include: candidate build and context IDs, validation outcome and violations, scenario, goal scores (`value`, `status`, `coverage`, evidence), active relation records, blocker results, metric vector with units, rank or explicit `not_ranked` reason, and human-readable *why* / *gap advice*. Every source-backed claim exposes its evidence key and version; every unmeasured metric appears as `null` with `unknown` status. The companion `schema/validation-result.schema.json` constrains this envelope.

# §19 Closed goal set, slot table, and legality
<a id="sec-19"></a>

## §19.1 Canonical goal set
<a id="sec-19-1"></a>

The **only eight top-level goals** are the goal IDs in `optimizer-profile.yaml`; they are independent of individual *role tags* in `schema/vocabulary.schema.json`.

- `burst_damage`: short-window punish capacity after an opening; **0** means negligible verified burst, **100** means reference-leading verified burst in the selected scenario. Weak-build advice: add an executable high-damage punish, reliable confirm, or damage amplifier.
- `sustained_damage`: repeatable damage over time considering resource and recovery constraints; **0** means negligible repeatability, **100** means reference-leading tested throughput. Advice: improve rotation uptime, Ki sustain, or recovery efficiency.
- `ki_economy`: ability to fund the intended rotation without losing offensive access; **0** means severe Ki starvation and no practical recovery path, **100** means observed or evidenced net-positive rotation. Advice: add on-use/on-hit restoration or a viable charging window; mind a charge skill's slot cost.
- `stamina_safety`: ability to preserve escape resources and avoid a formal break; **0** means persistent defensive exhaustion, **100** means robust, verified recovery-to-expenditure margin. Advice: reduce escape costs or dodge demand and add regeneration/pressure control.
- `control`: capacity to deny or alter enemy action through hitstun, guard/stamina breaks, paralysis and interrupts; **0** means no verified control tools, **100** means reliable, scenario-effective control coverage. Advice: add a tested control method, confirm it works against the target's armor or guard.
- `mobility`: effective gap closing, repositioning and range maintenance; **0** means no verified mobility access beyond an unsuitable baseline, **100** means reliable movement against scenario demands. Advice: add a safe approach/reposition skill or improve universal-action execution.
- `crowd_handling`: handling multiple threats through AoE, chaining, area denial and target switching; **0** means no meaningful swarm solution, **100** means reference-leading tested multi-target coverage. Advice: equip a repeatable AoE/area-denial response.
- `survivability`: actual capacity to survive and recover from punishment, distinct from stamina accounting; **0** means unacceptable measured durability, **100** means reference-leading survival under fixed encounter conditions. Advice: add damage mitigation, healing, reliable escapes or safer engagement.

The 0 and 100 anchors are **relative operational interpretations**, not discovered game statistics. The middle score is calculated by the rubric below; when no defensible reference scale exists the goal stays unknown. The YAML stores exact normative input fields and advice.

## §19.2 Slots and eligibility
<a id="sec-19-2"></a>

`decision_slots` in the YAML enumerates all physical slots: four Super slots, two Ultimate slots, one Evasive, one Awoken, one Super Soul, one QQ Bang, and one attribute spread. All are available at character initialization as UI capacity **subject to actual game unlock or menu gating**. A slot may be present but deliberately empty when the game permits it; capacity is not an instruction to force-fill. An equipped option's family and eligibility are checked against the slot; damage classification does *not* decide slot family.

The generic CaC schema does not claim that story-mode restrictions, partner customization, modded characters or special versus modes share identical loadout behavior. Such exceptions belong to an explicit mode override, not an undocumented assumption.

## §19.3 Deterministic validation contract
<a id="sec-19-3"></a>

The YAML rule registry `R-001` onward is normative. A validator returns an ordered list of `{rule_id, slot_id, outcome, message, evidence}`. In particular:

- Duplicate equipped skill IDs within one preset are illegal (`R-001`), excluding null empty slots.
- Race/gender and other eligibility restrictions are evaluated against catalog eligibility (`R-002`). If that eligibility is unknown, the outcome is `unverified`, not success.
- Allocated attribute total may not exceed the **known earned-point budget** (`R-003`), nor any individual unlocked cap (`R-004`). The default/upgrade gate values are model parameters populated from verified game progression; do not assume every player has opened the gate.
- Only one Soul and one QQ Bang can occupy their respective slot (`R-005`, `R-009`); candidates must fit slot family (`R-007`).
- When `owned_only=true`, ownership must be confirmed in the supplied inventory (`R-006`). When false, unowned options may appear, but acquire cost must be reported separately and never treated as a free unlock.
- Content entitlement and mode eligibility (`R-008`, `R-010`) are hard legality checks when verified, otherwise indeterminate.

`legalOptions(build, slot)` must evaluate the same rules as `validate(build)`, without imposing additional hidden filters. Unknown legality must be presented as **possibly legal, needs verification**, not silently included in certified legal options.

# §20 Scoring, normalization and missingness
<a id="sec-20"></a>

## §20.1 Two classes of inputs
<a id="sec-20-1"></a>

**`rate(option)` accepts exactly one fully identified catalog record and the fixed optimizer profile. It MUST NOT read benchmark rows, measured build damage, play-test reports, or other equipped options.** This is the search primitive; it produces an eight-goal catalog potential vector before build assembly. The stage that evaluates a whole build is separate.

Every goal has exactly three weighted catalog criteria: `tactical_grade` (0.65), `capability_count` (0.20) and either `known_feature` or `cost_fitness` (0.15). These weights are *MODEL optimization-policy choices*, not estimates of a game's numerical mechanics. The canonical criteria and goal-to-function mapping live only in `optimizer-profile.yaml`, while legal goal IDs live in `vocabulary.schema.json`.

- **Ordinal:** `tactical_grades.<goal_id>` is a mandatory per-goal record with `status`, a 0–5 integer or null, a nonempty reason and evidence. It is evaluated from the option's catalog properties, not benchmarks. A grade can be a sourced MODEL assessment if its reasons and inputs are explicit.
- **Capability count:** evidenced role tags, known flags and goal-specific effect clauses, capped at an explicit saturation count. Duplicate descriptions of the same capability are deduplicated. A verified missing capability scores 0; a partially ingested catalog is unknown.
- **Feature or cost:** uses a goal-specific known flag/effect, or a documented upfront Ki/stamina cost. The exact cost formula and applicability conditions are in `scoring.derivation_functions`.

**Catalog completeness is material.** Each option record carries `catalog_coverage` with explicit complete / partial / unknown / not_applicable entries for role tags, flags, effects, and costs. An empty effect array is a known absence only if the corresponding coverage status is `complete`. This avoids converting incomplete ingestion into artificial zero scores.

**Benchmarks are not rate inputs.** Measured DPS, clear time, tested hit rate, punish damage and survival belong exclusively to §23. Later measured evidence may inform *subsequent* tactical-grade revisions or calibration of weights, but the measured values themselves never become mandatory dependencies of `rate(option)`.

## §20.2 Anchored tactical ordinal (0–5)
<a id="sec-20-2"></a>

`TacticalGrade` is a compulsory object for **every goal on every** Skill, Awoken, Super Soul and QQ Bang definition. `TacticalGrades` in `vocabulary.schema.json` enumerates the complete goal-key set and rejects missing or unexpected keys. Its goal IDs must equal the profile's `goals[].id` exactly. The fields are `status: known | unknown`, `value: integer 0–5 | null`, nonempty `reason`, and `evidence`.

- `known` requires an actual integer, including **0**, which means documented absence of useful contribution toward that goal.
- `unknown` requires `value: null` and a reason explaining what is missing. It never means zero and cannot be silently omitted.
- `not_applicable` is a **criterion evaluation state**, distinct from the TacticalGrade status. An inapplicable criterion includes a reason and is removed from the denominator. For example, a QQ Bang does not have an activation stamina cost.

Anchors for each goal should be applied to **the individual option**, not an entire loadout: **1** = narrow / difficult to use; **3** = broadly practical with ordinary constraints; **5** = highly reliable per-slot contribution based on the recorded mechanics. Grade 5 never means invincibility, and grade 0 never means the item has zero overall utility. A tactical grader may record MODEL provenance with an auditable explanation; a VERIFY premise must remain unknown until accepted.

## §20.3 Deterministic normalization
<a id="sec-20-3"></a>

**Deterministic option-level criteria** (all numeric results are 0–100):

- `ordinal_0_5`: `20 × tactical_grades.<goal_id>.value` when known.
- `count_saturation`: `100 × min(evidenced distinct capability count, saturation_count) / saturation_count`. The cap is MODEL policy. Tags, flags and clauses are cross-checked and must not count the same effect twice.
- `boolean_coverage`: 100 if a supported goal feature is known present; 0 only if documented absent and all applicable evidence-bearing fields are complete; unknown for incomplete data; N/A where the option type does not expose the feature.
- `rule_derived` (`ki_cost_fitness` or `stamina_cost_fitness`): for a known **upfront activation** cost `c` bars and policy ceiling `C=5`, compute `100 × clamp(1 − c/C, 0, 1)`. This is a **low-weight resource-efficiency proxy**, not a damage/duration or real net-Ki prediction. Unknown costs remain unknown, no applicable cost mechanic is N/A, and conditional refunds are *not* assumed guaranteed.

**Weighting and missingness:** Each goal's weights total 1.0. Before computing coverage, discard criteria with `status: not_applicable`, recording their reason. Let `D` be the total remaining applicable weight and `K` the known weight. Coverage = `K/D` (0 if D is zero); value = `Σ(weight × normalized_known_value) / K` only if coverage meets `minimum_goal_coverage` (currently 0.60). Unknowns never contribute zero. Grade 0 is a genuine known zero. A fully characterized option with all eight tactical grades known reaches at least 0.65 coverage on each goal even if every benchmark is null.

For example, if a QQ Bang has a supported grade but no stamina activation mechanic, its `stamina_cost_fitness` becomes N/A with a reason. The remaining known grade is scored on the reduced denominator, not penalized for lacking a nonexistent activation cost. A disputed interaction is not upgraded to confirmed simply because its rubric score seems plausible.

## §20.4 Goal aggregation
<a id="sec-20-4"></a>

The selected preset determines ranking weights from its complete goal ordering. An option's catalog-only `rate()` vector is independent of that selection; the search combines option ratings and eligible **marginal pair relations**, then examines build coverage and checks hard blockers. This avoids making scenario measurements prerequisites for early search.

`relation` adjustments are applied **after** the two individual base ratings exist, only to the specified goal and only when both participants are present and their prerequisites hold. An optional reference implementation in `tests/contract_engine.py` demonstrates this addition, clamping the final goal to `[0,100]`. It is not a full production optimizer or a claim to simulate game frame data.

User preferences such as easy single-press controls can break ties without creating an unannounced ninth goal. The eight goal dimensions, positive/negative relation bands, and rank-to-weight values are profile-governed. If mandatory goals lack evidence coverage, the result is not ranked; an unknown is never silently made favorable or unfavorable.

# §21 Relation format and generators
<a id="sec-21"></a>

## §21.1 Typed relation record
<a id="sec-21-1"></a>

A relation represents a **marginal pairwise effect**, not the individual benefits already assigned in `rate(a)` and `rate(b)`. The canonical record is `schema/relation.schema.json`:

`{id, a, b, kind, goal_id, weight_band, state, non_overlap, size_basis, reason, evidence, generator_id, contribution_policy, spec_ref, version}`.

- `kind` = `synergy` (+), `anti_synergy` (−), or `redundancy` (−). The effect is attached to **one goal**, never every goal at once.
- `weight_band` = `minor | moderate | major` representing **5 | 10 | 30 score points** under the MODEL policy `scoring.relation_bands`, not percentage damage, Ki bars or other measured game quantities.
- `state: candidate` requires `contribution_policy: explain_only`; no score adjustment follows, regardless of the nominal band.
- `state: confirmed` requires evidence supporting **the causal mechanism and choice of band size**, a meaningful `size_basis`, and `non_overlap: passed`; its `contribution_policy` permits adding/subtracting the band's point value. Unsupported band sizes remain candidates, even if the underlying interaction is plausible.
- Reject duplicate scoring of the same unordered pair/goal, and **do not re-credit** the same property already counted in an individual option score. If an independent marginal effect cannot be justified, explain it without numerical bonus.

**Application:** `combined_goal = clamp(base_goal + Σ(sign × band_points), 0, 100)` where every relation is supported, applicable in the current context and distinct. This calculation is performed at the pair/build level. The single-option `rate()` call never incorporates pair relations.

A synthetic acceptance fixture demonstrates a confirmed `moderate` (+10) relation breaking an otherwise equal comparison. It demonstrates *adapter behavior only* and makes no claim of a real XV2 Soul synergy.

## §21.2 Generator contracts
<a id="sec-21-2"></a>

All six existing generators (`G-001` through `G-006`) now use `apply_band_if_confirmed_and_incremental_else_explain_only`. They generate candidates from clause, role and action-override data; they do **not** manufacture confirmed game observations.

- `G-001` Soul names a specific skill: an exact `event.skill_id` predicate can generate synergy. Trigger-on-use, hit, guard and per-activation semantics must be established before confirmation. **A-004 stays candidate**.
- `G-002` overlapping charge skills: a redundancy candidate; confirmation requires comparable availability and evidence of real marginal slot waste, not merely a shared tag.
- `G-003` built-in Awoken charge versus an equipped charge Super: potential redundancy, not an automatic unequip. Check timing, transformed-state availability and opportunity cost.
- `G-004` auto-dodge stamina consumer plus recovery source: candidate until attack conditions and net recovery are evidenced. Frieza Race passives and other context-driven sources may require an extended relation endpoint schema.
- `G-005` overlapping exclusive buffs: anti-synergy only when overwrite/precedence is established.
- `G-006` target incompatibility: scenario-conditional anti-synergy, never a universal verdict about the option.

Two Awokens cannot be equipped concurrently; that is a **legality issue**, not a scoring penalty. Confirmed relations are stored as explicit records with verified band rationales; candidate generators remain explain-only until separately confirmed. The schema currently requires option-addressable endpoints; richer context/racial-source relations are a future extension and should not be faked as ordinary option IDs.

# §22 Mode presets, blockers, and acquisition
<a id="sec-22"></a>

## §22.1 Scenario as a preset, not a separate engine
<a id="sec-22-1"></a>

`mode` is player-supplied context. The profile contains **six** complete starting presets: `pq-farmer`, `expert-support`, `pvp-pressure`, `raid-damage`, `low-input`, and `solo-boss`. Each ranks all canonical goals, names any conditional blockers and references exactly one declared benchmark scenario ID. All use the same catalog, legality engine and option scorer; the mode alters goal ranks and scenario context, not the eight goal definitions.

The six benchmark scenarios are declared under `benchmarks.scenarios` and specify `mode`, `target`, `conditions`, `protocol`, and `spec_ref`: `pq_fixed_clear`, `expert_fixed_boss`, `pvp_fixed_matchup`, `raid_fixed_boss`, `general_fixed_encounter`, and `single_boss_fixed`. **No exact targets, patch test environments, trial counts or measurements are invented**; target values and test conditions are null/unknown until provided. This means a scenario is *declared* but not yet ready to produce comparable measured benchmarks.

Preset overrides are player inputs and must be recorded in the output. Conditional blockers must never be triggered solely by choosing an Expert Mission or raid preset; the scenario predicates must actually be known and true.

## §22.2 Hard blockers
<a id="sec-22-2"></a>

A blocker is `{id, modes, test, message, severity, verification_requirement, spec_ref}`. Blockers run after legality and goal calculation and can return `pass`, `fail`, or `unknown`. **Failure flags** a build as inappropriate for the declared purpose; unknown warns against confidently recommending it. A blocker is not a claim that the game will refuse to equip that build.

Examples include lack of any verified answer to protected Expert Mission armor, no useful damage to a target with known resistance, or no means of supporting a required escort. The Expert Mission armor check is a deliberately **MODEL scenario requirement**, not a universal rule that every Expert Mission necessarily contains a protected boss. The scenario must explicitly set `requires_armor_answer=true` before the blocker is applicable.

## §22.3 Acquisition policy
<a id="sec-22-3"></a>

`owned_only` is a filter, **not** a combat scoring goal. Inventory must be marked complete, partial or unknown. An item missing from a complete owned list is confirmed unowned; absence from an incomplete list remains unverified. Entitlements, unlock flags and prerequisites follow the same completeness discipline. Scenario requirements carry explicit known/unknown evidence.

Unlock burden is a separate optional `farm_next` cost goal, using documented acquisition path, mission gate, currency, time-to-unlock and repeatability. In regular combat ranking, an owned item is not intrinsically stronger than an otherwise identical locked item; the player's `owned_only` filter alone decides whether locked options are eligible. Unknown shop rotations, mission drop rates and farming yields remain null, never invented.

# §23 Benchmarks and reference builds
<a id="sec-23"></a>

## §23.1 Metric registry
<a id="sec-23-1"></a>

The YAML identifies each metric by ID, type, unit, and computation/measurement status. **Catalog-computable** metrics include known upfront Ki required to use each equipped Super once (`loadout_ki`), Evasive cost (`evasive_stamina_cost`), count of evidenced stamina/guard break tools (`break_tool_count`), and evidenced AoE tools (`aoe_tool_count`). A variable-cost skill requires its *baseline* execution definition; if unknown, do not invent a fixed number. A lineup with null Super slots sums only equipped skills and reports its fill rate.

**In-game measurements** include damage per bar of Ki, damage in a fixed punish window, sustained throughput, single/multi-target hit rate, stamina recovery rate, fixed-quest clear time, and survival time. Units and test conditions must be attached to each result. Input execution time is also measurable; perceived simplicity should not be confused with a measured frame count.

## §23.2 Reference roster and apples-to-apples comparison
<a id="sec-23-2"></a>

Reference peers are **empty benchmark slots**, not presumed community meta builds. The profile currently names `pq_damage_baseline`, `pq_control_baseline`, `expert_armor_baseline`, `raid_damage_baseline`, and `pvp_pressure_baseline`; the numeric cells remain null until a build, actual target scenario, date, equipment state and repeated measurements are supplied.

Each preset's `benchmark_scenario` must resolve to a declared scenario. A declared scenario with `target.status: unknown` is only a protocol placeholder; it cannot generate valid measured comparisons. Matching conditions include patch, mission/boss, player archetype, character level, gear, AI partners, encounter start/end state and platform. Whole-build measurements may later calibrate ordinal judgments and weights through a versioned change, but **the rate(option) API never reads benchmark results**.

## §23.3 Benchmark acceptance
<a id="sec-23-3"></a>

For measured data, record trial count, central tendency, spread, target, encounter/difficulty, versions, input method, and known interference. Never compare a raid DPS trial to a PQ clear time as if they were the same goal. When only one trial exists, label it exploratory. When per-option data is incomplete, return a list of **measurements needed**, not a made-up estimate.

# §24 Catalog schema, IDs, and data lineage
<a id="sec-24"></a>

## §24.1 Mandatory field tiers
<a id="sec-24-1"></a>

Every catalog record has a mandatory core and versioned evidence envelope. **New in v3.1**, Skill, Awoken, Super Soul and QQ Bang schemas all require:

1. `tactical_grades`: exactly one `TacticalGrade` per canonical `GoalId`, including explicit unknowns; `known 0` means verified lack of that goal's contribution.
2. `catalog_coverage`: `role_tags`, `flags`, `effects`, `costs` marked `complete | partial | unknown | not_applicable`; these statuses prevent an absent fact from masquerading as an absent capability.

A skill also needs ID, name, family, damage classification, eligibility, explicit cost ledger, role tags, flags and effect clauses. A Soul needs independent clauses, charged-blast type, Limit Burst and acquisition; an Awoken needs activation/upkeep and action overrides; a QQ Bang needs all six numeric stat modifiers, each with known/unknown wrappers. Documentation-only animation fields may remain optional. Ingest must validate each record with its family schema and reject missing goal grade keys **before** trying to rank it.

`community-findings.yaml` is a separate evidence-promotion inbox: each `C-...` claim has source/date, patch/mode, agreement degree, test status, resolution and acceptance reference. Only **confirmed findings with completed resolution and an acceptance case** may be promoted into the optimizer's verified assumptions. It starts empty; no community consensus or mechanic is fabricated.

## §24.2 Canonical IDs and references
<a id="sec-24-2"></a>

Use lowercase ASCII kebab-case slugs with no spaces, punctuation other than hyphens and periods in the namespace. Prefixes are controlled by the vocabulary schema: `skill.super.dodon-ray`, `skill.ultimate.super-ki-explosion`, `skill.evasive.spirit-explosion`, `awoken.ultra-instinct`, `soul.im-neither-kami-nor-piccolo`, `qqbang.example-id`, `build.example-name`, `relation.sample`. IDs never change when display labels change; aliases may be kept in a separate catalog mapping. Every cross-reference uses these IDs, not display names. A profile or test referring to a missing ID must fail referential-integrity checks, unless that test specifically asserts the missing-record error.

`spec_ref` always uses a stable `§N.M` or `§N` section anchor in this Markdown. Every machine record includes `version` and `evidence` with source keys (or an explicitly unsupported `verify` status). Do not omit a key to mean unknown. The controlled enum definitions live in `schema/vocabulary.schema.json` and are not forked in prose.

## §24.3 Ingest order and validation
<a id="sec-24-3"></a>

Read `optimizer-profile.yaml`, resolve its declared schema locations, validate catalog JSON against the corresponding schema, and perform ID/referential integrity checks. Then validate player build/context, run legality, derive relations, compute metrics/goals, apply blockers, and emit evidence-aware recommendations. Never run a relation generator over a half-parsed free-text tooltip without an explicit parser-confidence state.

# §25 Golden acceptance cases
<a id="sec-25"></a>

The manifest in `tests/acceptance-cases.yaml` contains ten golden cases, all linked by `covered_by` to actual callable checks in `tests/validate_bundle.py` and `tests/contract_engine.py`. Fixtures are **explicitly synthetic**, outside `catalog/`, and test adapter behavior rather than claiming real game effects:

- **A-001** duplicate option rejected by an executable `validate_simple` check and excluded by `legal_options`.
- **A-002** synthetic race-restricted Awoken rejected for incompatible Frieza Race.
- **A-003** unknown goal grade yields null/unknown, not fabricated 0.
- **A-004** unverified Soul/skill predicate creates a **candidate** synergy and remains explain-only.
- **A-005** Expert armor blocker evaluates only when its scenario declares an evidenced requirement.
- **A-006** built-in charge plus dedicated charge skill creates a conditional candidate redundancy.
- **A-007** known attribute over-budget allocation fails; unknown earned budget remains unverified.
- **A-008** a **synthetic confirmed** and non-overlapping +10 relation changes ranking between otherwise equal candidates.
- **A-009** all eight option ratings exceed minimum coverage using catalog grades **with every benchmark cell unmeasured**.
- **A-010** a criterion that cannot apply to an option type drops out of the scoring denominator with a reason.

The validator uses `referencing.Registry` / `Resource` for JSON Schema 2020-12 resolution. It derives goal/slot/rule IDs from schemas and profile data, checks uniqueness and all cross-references, validates the profile and fixtures **before** semantic access, then runs functional cases. Five negative-mutation tests deliberately introduce wrong goal weight sums, missing tactical grade, invalid referenced option ID, invalid `spec_ref`, and wrong field type; all must be caught. A passed fixture is not evidence of tested Xenoverse 2 mechanics.

# §26 Delivery manifest, version notes and future extensions
<a id="sec-26"></a>

This bundle uses the following layout:

```text
xv2/
  spec.md                          # human explanations, anchored §1–§26
  optimizer-profile.yaml           # normative goals/slots/rules/scoring/presets/benchmarks
  schema/
    vocabulary.schema.json         # shared IDs, enums, evidence and known/unknown wrappers
    effect-clause.schema.json      # independent triggered effect
    acquisition.schema.json        # shops, quests, cost and drop provenance
    skill.schema.json              # Supers/Ultimates/Evasives
    awoken.schema.json             # transformation lifecycle
    super-soul.schema.json         # effect clauses, charged blast, Limit Burst
    qq-bang.schema.json            # six stat modifiers and acquisition
    build.schema.json              # context and decision variables
    relation.schema.json           # typed pairwise relations
    benchmark.schema.json          # measured or catalog-computed metrics
    validation-result.schema.json  # engine output envelope
    community-finding.schema.json  # sourced community hypothesis/review
    community-findings.schema.json # registry wrapper and version
    optimizer-profile.schema.json  # YAML shape validator after YAML parsing
  catalog/README.md                # intentional empty catalog placeholder
  community-findings.yaml          # empty until community hypotheses are ingested
  tests/fixtures/options.json      # synthetic records (never production catalog)
  tests/fixtures/relations.json    # synthetic pair rule
  tests/contract_engine.py         # narrow, executable adapter contract reference
  tests/acceptance-cases.yaml      # golden fixtures, expected outcomes and covered_by
  tests/validate_bundle.py         # structural and referential QA
  README.md                        # how to ingest and extend
```

**v3.0 (11 Nov 2026):** preserves the v2 mechanics reference and adds the closed optimizer contract, typed catalog record requirements, formal validation, scenario presets, evidence-aware goal scoring, relation generators, blocker policies, metrics and golden acceptance expectations. It deliberately does not populate a full move or Super Soul catalog, create unmeasured baseline results, or claim to have reverse-engineered game internals.

**v3.1 (11 Nov 2026):** removes `measured_minmax` from all single-option goal criteria; makes TacticalGrades and catalog-coverage envelopes compulsory on all four optimizer option schemas; introduces documented catalog-only normalization, N/A-denominator treatment, and confirmed-only +5/+10/+30 marginal relation scoring. All six presets have declared benchmark scenarios. The repeated §22.3 acquisition paragraph is removed; community-findings.yaml and its schema are added. Validation is now reference-aware using `referencing`, dynamic goal/slot IDs, ten executable acceptance tests, early schema fail-stop, and five deliberate negative mutations. Test records are explicitly synthetic. The empty benchmark table and game catalog remain intentionally empty.

**XV2-specific modeling cautions.** (i) A low upfront Ki cost is only a weak heuristic for economy or uptime: the game may impose animation commitment, follow-up costs and situational refunds. Its weight is 0.15 and it is never mistaken for DPS. (ii) Numeric relation bands are *optimizer score points*, not game damage or true Ki deltas. Confirmation requires real evidence for both cause and marginal magnitude; otherwise candidate/explanation only. (iii) QQ Bangs alter stats rather than provide combat actions; goal grades must be justified from their known modifiers and may remain unknown. (iv) Expert Mission armor answers are target-specific; never apply that blocker to every Expert Mission. (v) Race passives are context rather than independently equipped options, so a future relation endpoint extension may be needed for them.

**Recommended follow-up** is catalog ingestion in priority order: owned Ice skills and Super Souls first, followed by peer options and verified race/attribute tables. Test scenarios become quantitatively rankable only when those inputs have adequate evidence and comparable benchmarks.
