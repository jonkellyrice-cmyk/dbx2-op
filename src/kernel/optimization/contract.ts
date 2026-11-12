/**
 * The optimization adapter contract: everything a game must supply so the generic engine
 * (src/application/optimization) can search, explain and report on it.
 *
 * It lives in the kernel because every layer needs it: a game's domain folder implements it,
 * the application engine consumes it, and the UI renders whatever it describes.
 * The reference implementation is src/domain/toy-game (read it before writing a new adapter).
 */
// MDV_BLOCK:BEGIN id="TPL.KERNEL.CONTRACT.010" intent="Name the vocabulary every optimization target shares: goals, scores and why each score exists" kind="types" tags="optimization,contract,scoring"
/**
 * How a number was obtained. Keep the distinction honest: readers trust rule-derived facts more
 * than tactical judgment, and the report prints which is which.
 * - rule-derived: follows directly from the game's printed rules (a prerequisite, an action cost).
 * - explicit: the source text says it outright ("+2 to allies' attacks").
 * - tactical: a judgment about how it plays at the table (authored by a person, not inferred).
 * - heuristic: a formula over mechanical facts (damage per action, normalized).
 */
export type Evidence="rule-derived"|"explicit"|"tactical"|"heuristic";
/** One 0-100 score per goal. Goals are independent: a pick can be strong on several at once. */
export type ScoreVector<G extends string>=Record<G,number>;
/** One reason a score moved. Every point in a score must be traceable to one of these. */
export type Contribution<G extends string>={goal:G;value:number;reason:string;evidence:Evidence;condition?:string};
/**
 * `unknown` lists goals this option couldn't be judged on yet (no grade, a missing figure). Their
 * score is 0 only because nothing is known; the report says "not graded yet", never "scores 0".
 */
export type Rating<G extends string>={scores:ScoreVector<G>;contributions:Contribution<G>[];unknown?:readonly G[]};
/** A goal the player can rank. `plays` and `gapAdvice` give the report its plain-language voice. */
export type GoalInfo<G extends string>={id:G;label:string;color:string;plays:string;gapAdvice:string};
// MDV_BLOCK:END id="TPL.KERNEL.CONTRACT.010" kind="types" tags="optimization,contract,scoring"
// MDV_BLOCK:BEGIN id="TPL.KERNEL.CONTRACT.020" intent="Describe a build as choices in slots, so legality and progression work the same for every game" kind="types" tags="optimization,contract,build"
/** Something the player can choose: a feat, talent, item, card, unit. `source` links to where the rules say so. */
export type OptionInfo={id:string;name:string;summary:string;level:number;tags:readonly string[];source?:string};
/** A place a choice goes, unlocked at `level`. Non-pick decisions (class, subclass, origin) are slots too. */
export type Slot={id:string;label:string;level:number};
/**
 * A build is a level plus one option id per filled slot. Empty slots are simply absent.
 * `context` holds facts the player states and the optimizer never chooses (race, scenario flags),
 * keyed by the adapter's ContextField ids; "" or absent means not set.
 */
export type Build={version:1;level:number;picks:Record<string,string>;context?:Readonly<Record<string,string>>};
/** A fact the player states about their situation, offered as a fixed list of choices. */
export type ContextField={id:string;label:string;note?:string;options:readonly {id:string;label:string}[]};
/** A rule the build breaks, reported against the slot that breaks it. Never silently drop a pick. */
export type Issue={slotId:string;reason:string};
// MDV_BLOCK:END id="TPL.KERNEL.CONTRACT.020" kind="types" tags="optimization,contract,build"
// MDV_BLOCK:BEGIN id="TPL.KERNEL.CONTRACT.030" intent="Say how two choices affect each other, keeping printed rules apart from table judgment" kind="types" tags="optimization,contract,relations"
/**
 * How two picks interact. `weight` is added to (or subtracted from) `goal` when both are in the build.
 * - synergy: together they do more (setup then payoff, enabler then user).
 * - anti-synergy: they compete for the same resource (actions, a stance, a hand slot).
 * - redundancy: the second copy of the same job is worth less than the first.
 */
export type RelationKind="synergy"|"anti-synergy"|"redundancy";
/**
 * `state` (default "confirmed"): a candidate relation is plausible but unverified. It is explained
 * wherever the pair appears but adds nothing to any score until the evidence confirms it.
 */
export type RelationState="confirmed"|"candidate";
export type Relation<G extends string>={a:string;b:string;kind:RelationKind;goal:G;weight:number;reason:string;evidence:Evidence;state?:RelationState};
/**
 * A named starting point for the priority ranking: a role, playstyle or request ("glass cannon").
 * `blockers` names the adapter's blockers this request must satisfy.
 */
export type Preset<G extends string>={id:string;name:string;note:string;ranks:Partial<Record<G,number>>;blockers?:readonly string[]};
// MDV_BLOCK:END id="TPL.KERNEL.CONTRACT.030" kind="types" tags="optimization,contract,relations"
// MDV_BLOCK:BEGIN id="TPL.KERNEL.CONTRACT.040" intent="The single seam between the generic engine and one game" kind="types" tags="optimization,contract,adapter"
/**
 * Optional: compare a build with reference points (other classes, archetypes, a meta build) on
 * measured figures. `null` means "not measured" and is never treated as zero.
 */
export type BenchmarkMetric={id:string;label:string;unit:string;lowerIsBetter?:boolean};
export type BenchmarkPeer={name:string;values:Readonly<Record<string,number|null>>};
export type Benchmarks={title:string;caption:string;metrics:readonly BenchmarkMetric[];peers:readonly BenchmarkPeer[];measure(build:Build):Record<string,number|null>};
/**
 * Optional: a hard requirement of a request, checked after legality and scoring. A build that fails
 * one is flagged, not just ranked lower; it is not a game rule (the game still allows the build).
 * `test` returns true (met), false (not met) or null (can't tell from the data).
 */
export type Blocker={id:string;label:string;message:string;test(build:Build):boolean|null};
/** Optional: how the printed report looks. `parchment` is the illustrated fantasy look; `clean` is neutral. */
export type ReportStyle={theme:"clean"|"parchment";running:string;cover?:{kicker:string;subtitle:string;image?:string}};
export type OptimizationAdapter<G extends string>={
 /** Stable id, used in storage keys and file names. */
 id:string;
 /** Shown as the app heading and the report title, e.g. "Toy Skirmish: Wanderer optimizer". */
 title:string;
 goals:readonly GoalInfo<G>[];
 maxLevel:number;
 options:readonly OptionInfo[];
 presets:readonly Preset<G>[];
 /** Every slot the build has at its level, in the order they are acquired. */
 slots(build:Build):Slot[];
 /** Options that may go in `slot` given every other pick. Must agree with validate(). */
 legalOptions(build:Build,slot:Slot):OptionInfo[];
 /** Every broken rule. An empty list means the build is legal. */
 validate(build:Build):Issue[];
 /** What the option does on its own at the build's level, with no credit for other picks. */
 rate(optionId:string,build:Build):Rating<G>;
 /** Authored interactions between two options (order does not matter). */
 relations(a:string,b:string):Relation<G>[];
 /** Optional reference figures for the report's comparison section. */
 benchmarks?:Benchmarks;
 /** Optional report look; defaults to the clean theme with no cover. */
 report?:ReportStyle;
 /** Optional hard requirements that presets can name (see Blocker). */
 blockers?:readonly Blocker[];
 /** Optional facts the player states (stored in Build.context, never filled by Auto Build). */
 context?:readonly ContextField[];
 /** Optional weight of goal rank 1, 2, 3...; the default is linear (see weightsFromRanks). */
 rankWeights?:readonly number[];
 /** Optional one-paragraph introduction shown above the optimizer. */
 intro?:string;
};
// MDV_BLOCK:END id="TPL.KERNEL.CONTRACT.040" kind="types" tags="optimization,contract,adapter"
