/** Filling a build's open slots for a request, then improving those picks with hindsight. Game-neutral. */
import type {Build,Issue,OptimizationAdapter} from "../../kernel/optimization/contract";
import {buildValue} from "./evaluate";
import type {Weights} from "./goal-weights";
import {recommend} from "./recommend";
// MDV_BLOCK:BEGIN id="TPL.APP.AUTO.010" intent="Fill only the open slots, never the player's own picks, then revisit greedy picks once the whole build is known" kind="logic" tags="optimization,autobuild"
export type AutoBuildResult={build:Build;filled:string[];refined:{slotId:string;from:string;to:string;gain:number}[];issues:Issue[]};
/** Refinement passes: each pass tries every legal swap in every slot Auto Build owns. */
const REFINE_PASSES=2;
export function autoBuild<G extends string>(adapter:OptimizationAdapter<G>,start:Build,weights:Weights<G>,options:{keep?:ReadonlySet<string>}={}):AutoBuildResult{
 // By default the player's existing picks are kept exactly as they are.
 const keep=options.keep??new Set(Object.keys(start.picks));
 let build:Build={...start,picks:{...start.picks}};const filled:string[]=[];
 // 1. Greedy: earliest slot first, take the best recommendation that breaks nothing.
 for(const slot of adapter.slots(build)){
  if(build.picks[slot.id])continue;
  const best=recommend(adapter,build,slot,weights).ranked.find(r=>!r.breaks.length);
  if(best){build={...build,picks:{...build.picks,[slot.id]:best.option.id}};filled.push(slot.id);}
 }
 // 2. Hindsight: a level-1 pick chosen before the level-5 pick was known may no longer be best.
 const refined:AutoBuildResult["refined"]=[];
 for(let pass=0;pass<REFINE_PASSES;pass++){
  let changed=false;
  for(const slotId of filled){
   if(keep.has(slotId))continue;
   const slot=adapter.slots(build).find(s=>s.id===slotId)!;
   const current=build.picks[slotId];const currentValue=buildValue(adapter,build,weights);
   const best=recommend(adapter,build,slot,weights).ranked.find(r=>!r.breaks.length);
   if(best&&best.option.id!==current&&best.value>currentValue+0.01){
    build={...build,picks:{...build.picks,[slotId]:best.option.id}};
    refined.push({slotId,from:current,to:best.option.id,gain:Math.round((best.value-currentValue)*10)/10});changed=true;
   }
  }
  if(!changed)break;
 }
 // 3. Lookahead: a setup can be worthless alone and only pay off with a later pick (Mark Target, then Hunter's Focus).
 for(const change of pairSearch(adapter,build,weights,filled.filter(s=>!keep.has(s)))){
  build=change.build;refined.push(...change.steps);
 }
 return {build,filled,refined,issues:adapter.validate(build)};
}
// MDV_BLOCK:END id="TPL.APP.AUTO.010" kind="logic" tags="optimization,autobuild"
// MDV_BLOCK:BEGIN id="TPL.APP.AUTO.020" intent="Find setup-then-payoff pairs a one-slot-at-a-time search cannot see, within a bounded number of tries" kind="logic" tags="optimization,autobuild,lookahead"
/** How many first-slot options each pair tries: the best by gain, plus options with an authored synergy (likely setups). */
export const LOOKAHEAD=4;
function pairSearch<G extends string>(adapter:OptimizationAdapter<G>,start:Build,weights:Weights<G>,owned:readonly string[]){
 let build=start;const changes:{build:Build;steps:AutoBuildResult["refined"]}[]=[];
 const order=adapter.slots(build).map(s=>s.id).filter(id=>owned.includes(id));
 const hasSynergy=(id:string)=>adapter.options.some(o=>o.id!==id&&adapter.relations(id,o.id).some(r=>r.weight>0));
 for(let i=0;i<order.length;i++)for(let j=i+1;j<order.length;j++){
  const first=adapter.slots(build).find(s=>s.id===order[i])!,second=adapter.slots(build).find(s=>s.id===order[j])!;
  const currentValue=buildValue(adapter,build,weights);
  const ranked=recommend(adapter,build,first,weights).ranked.filter(r=>r.option.id!==build.picks[first.id]);
  const tries=[...ranked.slice(0,LOOKAHEAD),...ranked.slice(LOOKAHEAD).filter(r=>hasSynergy(r.option.id)).slice(0,LOOKAHEAD)];
  let best:{build:Build;value:number}|null=null;
  for(const t of tries){
   const withFirst={...build,picks:{...build.picks,[first.id]:t.option.id}};
   const follow=recommend(adapter,withFirst,second,weights).ranked.find(r=>!r.breaks.length);
   if(!follow)continue;
   const next={...withFirst,picks:{...withFirst.picks,[second.id]:follow.option.id}};
   if(adapter.validate(next).length)continue;
   const value=buildValue(adapter,next,weights);
   if(value>(best?.value??currentValue+0.01))best={build:next,value};
  }
  if(best){
   const steps=[first,second].filter(s=>best!.build.picks[s.id]!==build.picks[s.id]).map(s=>({slotId:s.id,from:build.picks[s.id],to:best!.build.picks[s.id],gain:Math.round((best!.value-currentValue)*10)/10}));
   build=best.build;changes.push({build,steps});
  }
 }
 return changes;
}
// MDV_BLOCK:END id="TPL.APP.AUTO.020" kind="logic" tags="optimization,autobuild,lookahead"
