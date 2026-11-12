/**
 * The toy game's adapter: the one object the generic engine and UI see.
 * A new target writes its own catalog, rules and scoring, then assembles them exactly like this.
 */
import type {OptimizationAdapter} from "../../kernel/optimization/contract";
import {TOY_GOAL_INFO,TOY_OPTIONS,TOY_PRESETS,type ToyGoal} from "./catalog";
import {TOY_BLOCKERS,TOY_MAX_LEVEL,toyInfo,toyLegalOptions,toySlots,toyValidate} from "./rules";
import {rateToyOption,toyRelations} from "./scoring";
import {TOY_BENCHMARKS} from "./benchmarks";
// MDV_BLOCK:BEGIN id="TPL.TOY.ADAPTER.010" intent="Plug the toy game into the generic optimization engine through the adapter seam" kind="module" tags="toy,adapter"
export const TOY_ADAPTER:OptimizationAdapter<ToyGoal>={
 id:"toy-skirmish",
 title:"Toy Skirmish: Wanderer optimizer",
 goals:TOY_GOAL_INFO,
 maxLevel:TOY_MAX_LEVEL,
 options:TOY_OPTIONS.map(toyInfo),
 presets:TOY_PRESETS,
 slots:toySlots,
 legalOptions:toyLegalOptions,
 validate:toyValidate,
 rate:rateToyOption,
 relations:toyRelations,
 benchmarks:TOY_BENCHMARKS,
 blockers:TOY_BLOCKERS,
 report:{theme:"parchment",running:"Toy Skirmish · Wanderer optimizer",cover:{kicker:"TOY SKIRMISH · WANDERER",subtitle:"A worked example of the optimization template"}},
};
export type {ToyGoal};
// MDV_BLOCK:END id="TPL.TOY.ADAPTER.010" kind="module" tags="toy,adapter"
