/**
 * Scoring for the toy game. The pattern to copy: every tunable number lives in one documented
 * table (SCORING), and every point a score gains is recorded as a Contribution with its evidence.
 * A score nobody can explain is a bug.
 */
import type {Build,Contribution,Rating,Relation,ScoreVector} from "../../kernel/optimization/contract";
import {TOY_GOALS,TOY_RELATIONS,TOY_TAG_RELATIONS,type ToyGoal} from "./catalog";
import {TOY_BY_ID} from "./rules";
// MDV_BLOCK:BEGIN id="TPL.TOY.SCORING.010" intent="Keep every tunable toy scoring weight in one documented table" kind="config" tags="toy,scoring,weights"
export const SCORING={
 /** Options tagged "scales" grow with the character: + this many points per level above their own. */
 perLevelGrowth:4,
 /** Two-action options leave only one action for anything else; they keep this share of their score. */
 twoActionShare:0.9,
};
// MDV_BLOCK:END id="TPL.TOY.SCORING.010" kind="config" tags="toy,scoring,weights"
// MDV_BLOCK:BEGIN id="TPL.TOY.SCORING.020" intent="Rate what one option does by itself at the build's level, with a reason for every point" kind="logic" tags="toy,scoring"
const clamp=(n:number)=>Math.round(Math.max(0,Math.min(100,n))*10)/10;
export function rateToyOption(id:string,build:Build):Rating<ToyGoal>{
 const scores=Object.fromEntries(TOY_GOALS.map(g=>[g,0])) as ScoreVector<ToyGoal>;
 const contributions:Contribution<ToyGoal>[]=[];
 const option=TOY_BY_ID.get(id);
 if(!option)return {scores,contributions};
 const add=(c:Contribution<ToyGoal>)=>{scores[c.goal]+=c.value;contributions.push(c);};
 for(const goal of TOY_GOALS){
  const base=option.base[goal];if(!base)continue;
  add({goal,value:base,reason:option.name+": "+option.summary,evidence:"tactical"});
  if(option.tags.includes("scales")&&build.level>option.level)add({goal,value:SCORING.perLevelGrowth*(build.level-option.level),reason:"Grows with level ("+option.level+" → "+build.level+")",evidence:"heuristic"});
  if(option.actions===2)add({goal,value:-Math.round(base*(1-SCORING.twoActionShare)),reason:"Costs 2 of 3 actions",evidence:"rule-derived",condition:"Only matters on turns you also want to do something else"});
 }
 for(const goal of TOY_GOALS)scores[goal]=clamp(scores[goal]);
 return option.unknown?.length?{scores,contributions,unknown:option.unknown}:{scores,contributions};
}
// MDV_BLOCK:END id="TPL.TOY.SCORING.020" kind="logic" tags="toy,scoring"
// MDV_BLOCK:BEGIN id="TPL.TOY.SCORING.030" intent="Look up authored interactions between two options, in either order" kind="logic" tags="toy,relations"
export function toyRelations(a:string,b:string):Relation<ToyGoal>[]{
 const pair=TOY_RELATIONS.filter(r=>r.a===a&&r.b===b||r.a===b&&r.b===a);
 const tagged=TOY_TAG_RELATIONS.flatMap(t=>{
  const [origin,other]=a===t.origin?[a,b]:b===t.origin?[b,a]:[null,null];
  if(!origin||!TOY_BY_ID.get(other)?.tags.includes(t.tag))return [];
  return [{a:origin,b:other,kind:"synergy" as const,goal:t.goal,weight:t.weight,reason:t.reason,evidence:"rule-derived" as const}];
 });
 return [...pair,...tagged];
}
// MDV_BLOCK:END id="TPL.TOY.SCORING.030" kind="logic" tags="toy,relations"
