/**
 * Scoring picks in the context of a whole build, and scoring the whole build.
 * Game-neutral: everything game-specific comes through the adapter (rate, relations, validate).
 */
import type {Build,Contribution,OptimizationAdapter,Rating,ScoreVector} from "../../kernel/optimization/contract";
import type {Weights} from "./goal-weights";
// MDV_BLOCK:BEGIN id="TPL.APP.EVALUATE.010" intent="Keep the engine's own tunable numbers in one documented place" kind="config" tags="optimization,scoring,weights"
export const ENGINE={
 /**
  * Only a few options per goal get used in a turn or a fight. The best pick on a goal counts fully,
  * the second at 35%, the third at 15%, and the rest at 5% each: stacking one job has diminishing returns.
  */
 depthWeights:[1,0.35,0.15] as readonly number[],depthTail:0.05,
 /** Each rule the build breaks costs this much build value, so a search never prefers an illegal build. */
 issuePenalty:25,
 /** A goal counts as "online" (a real strength) from this coverage. */
 online:40,
};
const clamp=(n:number)=>Math.round(Math.max(0,Math.min(100,n))*10)/10;
export const emptyScores=<G extends string>(adapter:OptimizationAdapter<G>)=>Object.fromEntries(adapter.goals.map(g=>[g.id,0])) as ScoreVector<G>;
// MDV_BLOCK:END id="TPL.APP.EVALUATE.010" kind="config" tags="optimization,scoring,weights"
// MDV_BLOCK:BEGIN id="TPL.APP.EVALUATE.020" intent="Rate one pick inside a build: what it does alone plus how it interacts with every other pick" kind="logic" tags="optimization,scoring,relations"
/** The picks a build holds, in slot order, skipping slots it hasn't unlocked. */
export function picksOf<G extends string>(adapter:OptimizationAdapter<G>,build:Build){
 return adapter.slots(build).filter(s=>build.picks[s.id]).map(slot=>({slot,id:build.picks[slot.id]}));
}
export function rateInBuild<G extends string>(adapter:OptimizationAdapter<G>,id:string,build:Build,exceptSlot?:string):Rating<G>{
 const own=adapter.rate(id,build);
 const scores={...own.scores};const contributions:Contribution<G>[]=[...own.contributions];
 for(const other of picksOf(adapter,build)){
  if(other.slot.id===exceptSlot||other.id===id)continue;
  for(const r of adapter.relations(id,other.id)){
   // Name the partner: one pick can relate to several others for the same reason.
   const partner=adapter.options.find(o=>o.id===other.id)?.name??other.id;
   // A candidate relation is shown so the player sees it, but counts for nothing until it is confirmed.
   if(r.state==="candidate"){contributions.push({goal:r.goal,value:0,reason:r.reason,evidence:r.evidence,condition:"candidate "+r.kind+" with "+partner+", not counted until confirmed"});continue;}
   scores[r.goal]+=r.weight;
   contributions.push({goal:r.goal,value:r.weight,reason:r.reason,evidence:r.evidence,condition:r.kind+" with "+partner});
  }
 }
 for(const g of adapter.goals)scores[g.id]=clamp(scores[g.id]);
 return own.unknown?.length?{scores,contributions,unknown:own.unknown}:{scores,contributions};
}
// MDV_BLOCK:END id="TPL.APP.EVALUATE.020" kind="logic" tags="optimization,scoring,relations"
// MDV_BLOCK:BEGIN id="TPL.APP.EVALUATE.030" intent="Summarize a whole build as one profile per goal and one value for the player's request" kind="logic" tags="optimization,scoring,build"
/** Coverage per goal: the build's picks rated in context, best first, with diminishing returns. */
export function coverage<G extends string>(adapter:OptimizationAdapter<G>,build:Build):ScoreVector<G>{
 const rated=picksOf(adapter,build).map(p=>rateInBuild(adapter,p.id,build,p.slot.id).scores);
 const result=emptyScores(adapter);
 for(const g of adapter.goals){
  const values=rated.map(r=>r[g.id]).sort((a,b)=>b-a);
  result[g.id]=clamp(values.reduce((n,v,i)=>n+v*(ENGINE.depthWeights[i]??ENGINE.depthTail),0));
 }
 return result;
}
/** How well the build answers the request: weighted coverage, minus a penalty per broken rule. 0-100 when legal. */
export function buildValue<G extends string>(adapter:OptimizationAdapter<G>,build:Build,weights:Weights<G>):number{
 const profile=coverage(adapter,build);
 const value=adapter.goals.reduce((n,g)=>n+(weights[g.id]??0)*profile[g.id],0);
 return value-adapter.validate(build).length*ENGINE.issuePenalty;
}
// MDV_BLOCK:END id="TPL.APP.EVALUATE.030" kind="logic" tags="optimization,scoring,build"
