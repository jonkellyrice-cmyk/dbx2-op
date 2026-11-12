/**
 * Ranking every legal option for one slot, with PNC-Lite: attention picks which options to look at
 * first, but the fallback still evaluates every legal option, so attention never hides the best one.
 */
import type {Build,OptimizationAdapter,OptionInfo,Rating,Slot} from "../../kernel/optimization/contract";
import {evaluateWithFallback} from "../../domain/optimization/pnc-search";
import {ENGINE,buildValue,coverage,picksOf,rateInBuild} from "./evaluate";
import type {Weights} from "./goal-weights";
// MDV_BLOCK:BEGIN id="TPL.APP.RECOMMEND.010" intent="Rank every legal option for a slot by how much it improves the whole build for the player's request, and say why" kind="logic" tags="optimization,pnc,recommend"
export type Recommendation<G extends string>={option:OptionInfo;gain:number;value:number;rating:Rating<G>;reasons:string[];breaks:string[]};
export const withoutSlot=(build:Build,slotId:string):Build=>{const picks={...build.picks};delete picks[slotId];return {...build,picks};};
export function recommend<G extends string>(adapter:OptimizationAdapter<G>,build:Build,slot:Slot,weights:Weights<G>,options:{width?:number}={}){
 const base=withoutSlot(build,slot.id);
 const baseValue=buildValue(adapter,base,weights);
 // Compare against the build as it stands (current pick included): swapping out a prerequisite must show as a break.
 const baseIssues=new Set(adapter.validate(build).map(i=>i.slotId+":"+i.reason));
 const profile=coverage(adapter,base);
 const anchors=picksOf(adapter,base);
 const weight=(goal:G)=>weights[goal]??0;
 const pool=adapter.legalOptions(base,slot).map(option=>{
  const own=adapter.rate(option.id,base);
  return {id:option.id,option,
   roles:adapter.goals.filter(g=>own.scores[g.id]>=20).map(g=>g.id as string),
   // Attention: how strongly the option is connected to what the build already holds.
   attention:anchors.reduce((n,a)=>n+adapter.relations(option.id,a.id).reduce((s,r)=>s+Math.max(0,r.weight),0),0)/10,
   objectiveHint:adapter.goals.reduce((n,g)=>n+weight(g.id)*own.scores[g.id],0)/10};
 });
 const search=evaluateWithFallback(pool,entry=>{
  const next={...base,picks:{...base.picks,[slot.id]:entry.id}};
  const value=buildValue(adapter,next,weights);
  const rating=rateInBuild(adapter,entry.id,next,slot.id);
  // A pick that breaks another slot's rules (a removed prerequisite, a new exclusion) is shown, not hidden.
  const breaks=adapter.validate(next).filter(i=>!baseIssues.has(i.slotId+":"+i.reason)).map(i=>i.slotId+": "+i.reason);
  const reasons=rating.contributions.filter(c=>weight(c.goal)>0&&c.value!==0).sort((a,b)=>Math.abs(b.value*weight(b.goal))-Math.abs(a.value*weight(a.goal))).slice(0,3).map(c=>(c.value>0?"+":"")+c.value+" "+c.goal+": "+c.reason);
  // Unconfirmed interactions are listed so the player knows about them, marked as not counted.
  for(const c of rating.contributions)if(weight(c.goal)>0&&c.condition?.startsWith("candidate "))reasons.push("Unconfirmed, not counted ("+c.goal+"): "+c.reason);
  return {score:value-baseValue,value,rating,reasons,breaks};
 },{width:options.width,unmetRoles:adapter.goals.filter(g=>weight(g.id)>0&&profile[g.id]<ENGINE.online).map(g=>g.id as string)});
 const ranked:Recommendation<G>[]=search.ranked.map(({candidate,result})=>({option:candidate.option,gain:Math.round(result.score*10)/10,value:result.value,rating:result.rating,reasons:result.reasons,breaks:result.breaks}));
 return {ranked,diagnostics:search.diagnostics};
}
// MDV_BLOCK:END id="TPL.APP.RECOMMEND.010" kind="logic" tags="optimization,pnc,recommend"
