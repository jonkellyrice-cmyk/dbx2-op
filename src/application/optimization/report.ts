/**
 * The data behind the printed build report: profile, growth by level, plain-language story and one
 * explained entry per choice. Game-neutral: the words come from the adapter's GoalInfo.
 * The UI renders this; the PDF is that rendering printed in headless Chrome.
 */
import type {Build,Issue,OptimizationAdapter,OptionInfo,Rating,ScoreVector,Slot} from "../../kernel/optimization/contract";
import {ENGINE,buildValue,coverage,rateInBuild} from "./evaluate";
import type {Weights} from "./goal-weights";
import {checkBlockers,unknownGoals,type BlockerResult,type UnknownGoal} from "./requirements";
// MDV_BLOCK:BEGIN id="TPL.APP.REPORT.010" intent="Shape what a printed build report contains" kind="types" tags="optimization,report"
export type LevelPoint<G extends string>={level:number;coverage:ScoreVector<G>;value:number;gained:string[]};
export type ReportChoice<G extends string>={slot:Slot;option:OptionInfo|null;rating:Rating<G>|null;issues:string[]};
export type BuildReport<G extends string>={
 title:string;headline:string;request:string;value:number;
 profile:ScoreVector<G>;strengths:G[];gaps:G[];
 sections:{title:string;paragraphs:string[]}[];
 milestones:{level:number;text:string}[];
 curve:LevelPoint<G>[];choices:ReportChoice<G>[];issues:Issue[];
 /** Goals some picks haven't been judged on, and the request's hard requirements (both may be empty). */
 unknowns:UnknownGoal<G>[];blockers:BlockerResult[];
};
// MDV_BLOCK:END id="TPL.APP.REPORT.010" kind="types" tags="optimization,report"
// MDV_BLOCK:BEGIN id="TPL.APP.REPORT.020" intent="Measure the build at every level so charts can show how it grows" kind="logic" tags="optimization,report,progression"
/** The same build as it stood at `level`: only slots unlocked by then keep their picks. */
export function buildAtLevel(build:Build,slots:readonly Slot[],level:number):Build{
 return {...build,level,picks:Object.fromEntries(Object.entries(build.picks).filter(([id])=>(slots.find(s=>s.id===id)?.level??Infinity)<=level))};
}
export function levelCurve<G extends string>(adapter:OptimizationAdapter<G>,build:Build,weights:Weights<G>):LevelPoint<G>[]{
 const slots=adapter.slots({...build,level:adapter.maxLevel});
 return Array.from({length:build.level},(_,i)=>{
  const at=buildAtLevel(build,slots,i+1);
  return {level:i+1,coverage:coverage(adapter,at),value:Math.round(buildValue(adapter,at,weights)*10)/10,gained:slots.filter(s=>s.level===i+1&&at.picks[s.id]).map(s=>at.picks[s.id])};
 });
}
// MDV_BLOCK:END id="TPL.APP.REPORT.020" kind="logic" tags="optimization,report,progression"
// MDV_BLOCK:BEGIN id="TPL.APP.REPORT.030" intent="Explain in plain language what the build is, what it is for, where it is thin and when it comes online" kind="logic" tags="optimization,report,story"
const list=(items:readonly string[])=>items.length<=1?items.join(""):items.slice(0,-1).join(", ")+" and "+items.at(-1);
export function buildReport<G extends string>(adapter:OptimizationAdapter<G>,build:Build,weights:Weights<G>,request:string,presetId?:string|null):BuildReport<G>{
 const info=(g:G)=>adapter.goals.find(x=>x.id===g)!;
 const name=(id:string)=>adapter.options.find(o=>o.id===id)?.name??id;
 const profile=coverage(adapter,build);const curve=levelCurve(adapter,build,weights);const issues=adapter.validate(build);
 const ranked=[...adapter.goals].map(g=>g.id).sort((a,b)=>profile[b]-profile[a]);
 const strengths=ranked.filter(g=>profile[g]>=ENGINE.online);
 // Gaps are only goals the player asked for; a goal nobody ranked isn't a weakness of this request.
 const gaps=ranked.filter(g=>(weights[g]??0)>0&&profile[g]<ENGINE.online);
 const choices:ReportChoice<G>[]=adapter.slots(build).map(slot=>{
  const id=build.picks[slot.id];const option=adapter.options.find(o=>o.id===id)??null;
  return {slot,option,rating:option?rateInBuild(adapter,option.id,build,slot.id):null,issues:issues.filter(i=>i.slotId===slot.id).map(i=>i.reason)};
 });
 const signature=choices.filter(c=>c.rating).map(c=>({c,best:Math.max(...adapter.goals.map(g=>c.rating!.scores[g.id]))})).sort((a,b)=>b.best-a.best).slice(0,3).map(x=>x.c.option!.name);
 const headline=strengths.length?"A level "+build.level+" build that "+list(strengths.map(g=>info(g).plays)):"A level "+build.level+" build still looking for its strength";
 const milestones=adapter.goals.flatMap(g=>{const first=curve.find(p=>p.coverage[g.id]>=ENGINE.online);return first?[{level:first.level,text:info(g.id).label+" comes online"+(first.gained.length?" (new this level: "+list(first.gained.map(name))+")":"")}]:[];}).sort((a,b)=>a.level-b.level);
 const unknowns=unknownGoals(adapter,build);const blockers=checkBlockers(adapter,build,presetId);
 const sections=[
  {title:"What this build is",paragraphs:[headline+".",signature.length?"Its signature picks are "+list(signature)+".":"It has no picks yet."]},
  {title:"Why it was chosen",paragraphs:["It answers the request \""+request+"\". Each choice below lists the reasons behind its scores; a score is a judgment of what the pick does, not a win rate."]},
  {title:"Where it is thin",paragraphs:gaps.length?gaps.map(g=>info(g).gapAdvice):["Every goal you asked for is covered."]},
  // A failed or unknown requirement is said plainly; passing ones are listed so the check is visible.
  ...(blockers.length?[{title:"Requirements for this request",paragraphs:blockers.map(b=>b.label+": "+(b.result==="pass"?"met.":b.result==="fail"?"NOT MET. "+b.message:"can't tell from the data yet."))}]:[]),
  // Unknown is not zero: these goals may be stronger than their scores show.
  ...(unknowns.length?[{title:"What isn't known yet",paragraphs:unknowns.map(u=>info(u.goal).label+": not graded yet for "+list(u.options)+". Its score there counts as 0 only because nothing is known, so this goal may be stronger than shown.")}]:[]),
 ];
 return {title:adapter.title+" · Level "+build.level,headline,request,value:Math.round(buildValue(adapter,build,weights)*10)/10,profile,strengths,gaps,sections,milestones,curve,choices,issues,unknowns,blockers};
}
// MDV_BLOCK:END id="TPL.APP.REPORT.030" kind="logic" tags="optimization,report,story"
