/**
 * What a build's scores can't say on their own: goals nobody has judged yet, and the hard
 * requirements (blockers) of the request. Game-neutral: both come from the adapter.
 */
import type {Build,OptimizationAdapter} from "../../kernel/optimization/contract";
import {picksOf} from "./evaluate";
// MDV_BLOCK:BEGIN id="TPL.APP.REQUIRE.010" intent="Say which picks haven't been judged on which goals, so a missing grade is never read as a weakness" kind="logic" tags="optimization,unknowns"
export type UnknownGoal<G extends string>={goal:G;options:string[]};
/** Goals where at least one pick couldn't be judged, with the picks' names. Empty when everything is known. */
export function unknownGoals<G extends string>(adapter:OptimizationAdapter<G>,build:Build):UnknownGoal<G>[]{
 const name=(id:string)=>adapter.options.find(o=>o.id===id)?.name??id;
 const byGoal=new Map<G,string[]>();
 for(const pick of picksOf(adapter,build))for(const goal of adapter.rate(pick.id,build).unknown??[])byGoal.set(goal,[...(byGoal.get(goal)??[]),name(pick.id)]);
 return adapter.goals.filter(g=>byGoal.has(g.id)).map(g=>({goal:g.id,options:byGoal.get(g.id)!}));
}
// MDV_BLOCK:END id="TPL.APP.REQUIRE.010" kind="logic" tags="optimization,unknowns"
// MDV_BLOCK:BEGIN id="TPL.APP.REQUIRE.020" intent="Check the request's hard requirements after legality and scoring, keeping can't-tell apart from failed" kind="logic" tags="optimization,blockers"
export type BlockerResult={id:string;label:string;message:string;result:"pass"|"fail"|"unknown"};
/** The blockers a preset names, checked against the build. No preset, or a preset without blockers: none. */
export function checkBlockers<G extends string>(adapter:OptimizationAdapter<G>,build:Build,presetId?:string|null):BlockerResult[]{
 const preset=presetId?adapter.presets.find(p=>p.id===presetId):undefined;
 return (preset?.blockers??[]).flatMap(id=>{
  const blocker=adapter.blockers?.find(b=>b.id===id);
  if(!blocker)return [];
  const met=blocker.test(build);
  return [{id,label:blocker.label,message:blocker.message,result:met===null?"unknown" as const:met?"pass" as const:"fail" as const}];
 });
}
// MDV_BLOCK:END id="TPL.APP.REQUIRE.020" kind="logic" tags="optimization,blockers"
