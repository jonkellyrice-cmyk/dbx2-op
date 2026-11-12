/**
 * Rating one option from catalog data only (spec §20), and the relations between two options
 * (spec §21). This is a TypeScript port of the bundle's reference engine,
 * docs/ingest/tests/contract_engine.py; tests/xv2-acceptance.test.ts runs the same golden cases.
 *
 * A goal's score is the weighted mean of its known criteria. When the known share of the weight
 * (coverage) is below the profile's 0.6, the goal is reported unknown, never 0. A not_applicable
 * criterion drops out of the weight entirely.
 */
import type {Contribution,Rating,Relation,ScoreVector} from "../../kernel/optimization/contract";
import {XV2_GOALS,XV2_SCORING,type Criterion,type Xv2Goal} from "./profile";
import {familyOf,type EffectClause,type Option,type RelationRecord} from "./records";
// MDV_BLOCK:BEGIN id="DBX.XV2.SCORING.010" intent="Count an option's documented capabilities for a goal, saying unknown when the catalog hasn't characterized them" kind="logic" tags="xv2,scoring,capabilities"
type Outcome={status:"known"|"unknown"|"not_applicable";value:number|null;reason:string};
/** Operations that can carry a goal, as the reference engine's CAPABLE_OPS. */
const CAPABLE_OPS:Record<Xv2Goal,readonly string[]>={
 burst_damage:["apply_damage"],sustained_damage:["apply_damage"],ki_economy:["restore","reduce_cost","set_cost"],
 stamina_safety:["restore","reduce_cost","grant_state","prevent_state"],control:["drain","grant_state","prevent_state"],
 mobility:["teleport","override_action"],crowd_handling:["apply_damage","grant_state"],survivability:["heal","grant_state","prevent_state"],
};
const evidenced=(e:{status:string;verification:string})=>(e.status==="game"||e.status==="model")&&["derived","documented","observed"].includes(e.verification);
const clausesOf=(o:Option):readonly EffectClause[]=>o.effect_clauses??o.effects??[];
function capabilityCount(o:Option,goal:Xv2Goal):Outcome{
 const tags=new Set(XV2_SCORING.derive.capabilityTags[goal]);const flags=XV2_SCORING.derive.capabilityFlags[goal];
 const c=o.catalog_coverage;const found=new Set<string>();let looked=false;let incomplete=false;
 if(c.role_tags!=="not_applicable"){looked=true;incomplete||=c.role_tags!=="complete";
  for(const t of o.role_tags??[])if(tags.has(t.tag)&&evidenced(t.evidence))found.add("tag:"+t.tag);}
 if(c.flags!=="not_applicable"){looked=true;incomplete||=c.flags!=="complete";
  for(const k of flags){const f=o.flags?.[k];if(f?.status==="known"&&f.value&&(!f.evidence||evidenced(f.evidence)))found.add("flag:"+k);if(f?.status==="unknown")incomplete=true;}}
 if(c.effects!=="not_applicable"){looked=true;incomplete||=c.effects!=="complete";
  // A broad operation only counts when its property names the goal; otherwise it stays a candidate.
  for(const cl of clausesOf(o))if(CAPABLE_OPS[goal].includes(cl.operation)&&evidenced(cl.evidence)&&String(cl.property??"").includes(goal))found.add("effect:"+cl.id);}
 if(!looked)return {status:"not_applicable",value:null,reason:"This kind of option has no capability fields"};
 if(incomplete)return {status:"unknown",value:null,reason:found.size?"Some capabilities are known, but the catalog entry is incomplete":"The catalog entry doesn't yet say which capabilities it has"};
 return {status:"known",value:found.size,reason:found.size?found.size+" documented capabilit"+(found.size===1?"y":"ies")+" for this goal":"No documented capability for this goal"};
}
// MDV_BLOCK:END id="DBX.XV2.SCORING.010" kind="logic" tags="xv2,scoring,capabilities"
// MDV_BLOCK:BEGIN id="DBX.XV2.SCORING.020" intent="Score each criterion the way the profile defines it, keeping unknown and not-applicable apart from zero" kind="logic" tags="xv2,scoring,criteria"
function costFitness(o:Option,resource:"ki"|"stamina"):Outcome{
 const coverage=o.catalog_coverage.costs;
 if(coverage==="not_applicable")return {status:"not_applicable",value:null,reason:"Doesn't spend "+resource+" directly"};
 if(coverage!=="complete")return {status:"unknown",value:null,reason:"Its "+resource+" cost isn't fully documented"};
 const upfront=(o.cost_schedule??o.activation_costs??[]).filter(x=>x.resource===resource&&x.phase==="activation");
 if(!upfront.length)return familyOf(o.id)==="skill"?{status:"known",value:100,reason:"No upfront "+resource+" cost"}:{status:"not_applicable",value:null,reason:"No upfront "+resource+" spend for this kind of option"};
 if(upfront.some(x=>x.amount.status!=="known"))return {status:"unknown",value:null,reason:"Its upfront "+resource+" cost is unknown"};
 const bars=upfront.reduce((n,x)=>n+(x.amount.value??0),0);
 const ceiling=resource==="ki"?XV2_SCORING.derive.kiCeilingBars:XV2_SCORING.derive.staminaCeilingBars;
 return {status:"known",value:100*Math.max(0,Math.min(1,1-bars/ceiling)),reason:"Upfront "+resource+" cost "+bars+" bar"+(bars===1?"":"s")+" (scale "+ceiling+")"};
}
function criterion(o:Option,goal:Xv2Goal,c:Criterion):Outcome{
 if(c.method==="ordinal_0_5"){
  const g=o.tactical_grades[goal];
  if(!g||g.status!=="known"||g.value===null)return {status:g?.status==="not_applicable"?"not_applicable":"unknown",value:null,reason:g?.reason??"Not graded yet"};
  return {status:"known",value:20*g.value,reason:"Grade "+g.value+"/5: "+g.reason};
 }
 if(c.method==="count_saturation"||c.method==="boolean_coverage"){
  const r=capabilityCount(o,goal);if(r.status!=="known"||r.value===null)return r;
  if(c.method==="boolean_coverage")return {status:"known",value:r.value>0?100:0,reason:r.reason};
  const sat=c.saturation_count??1;return {status:"known",value:100*Math.min(Math.max(r.value,0),sat)/sat,reason:r.reason};
 }
 if(c.function==="ki_cost_fitness")return costFitness(o,"ki");
 if(c.function==="stamina_cost_fitness")return costFitness(o,"stamina");
 return {status:"unknown",value:null,reason:"Unknown scoring function "+c.function};
}
// MDV_BLOCK:END id="DBX.XV2.SCORING.020" kind="logic" tags="xv2,scoring,criteria"
// MDV_BLOCK:BEGIN id="DBX.XV2.SCORING.030" intent="Combine criteria into a 0-100 score per goal with a reason for every point, or report the goal unknown" kind="logic" tags="xv2,scoring,rate"
const EVIDENCE:Record<CriterionKey,Contribution<Xv2Goal>["evidence"]>={ordinal_0_5:"tactical",count_saturation:"rule-derived",boolean_coverage:"rule-derived",rule_derived:"heuristic"};
type CriterionKey=Criterion["method"];
export type GoalDetail={status:"known"|"partial"|"unknown";value:number|null;coverage:number};
export function rateOption(o:Option):Rating<Xv2Goal>&{detail:Record<Xv2Goal,GoalDetail>}{
 const scores={} as ScoreVector<Xv2Goal>;const contributions:Contribution<Xv2Goal>[]=[];const unknown:Xv2Goal[]=[];
 const detail={} as Record<Xv2Goal,GoalDetail>;
 for(const g of XV2_GOALS){
  const parts=g.criteria.map(c=>({c,r:criterion(o,g.id,c)}));
  const applicable=parts.filter(p=>p.r.status!=="not_applicable").reduce((n,p)=>n+p.c.weight,0);
  const known=parts.filter(p=>p.r.status==="known");const knownWeight=known.reduce((n,p)=>n+p.c.weight,0);
  const coverage=applicable?knownWeight/applicable:0;
  if(!knownWeight||coverage<XV2_SCORING.minimumGoalCoverage){
   scores[g.id]=0;unknown.push(g.id);detail[g.id]={status:"unknown",value:null,coverage};continue;
  }
  // Each known criterion's share of the weighted mean, rounded, so the shares add up to the score.
  let total=0;
  for(const p of known){
   const value=Math.round(p.c.weight*(p.r.value??0)/knownWeight*10)/10;total+=value;
   contributions.push({goal:g.id,value,reason:p.r.reason,evidence:EVIDENCE[p.c.method]});
  }
  scores[g.id]=Math.max(0,Math.min(100,Math.round(total*10)/10));
  detail[g.id]={status:knownWeight===applicable?"known":"partial",value:scores[g.id],coverage};
 }
 return unknown.length?{scores,contributions,unknown,detail}:{scores,contributions,detail};
}
// MDV_BLOCK:END id="DBX.XV2.SCORING.030" kind="logic" tags="xv2,scoring,rate"
// MDV_BLOCK:BEGIN id="DBX.XV2.SCORING.040" intent="Find how two options interact: confirmed catalog relations count, generated ones are candidates until confirmed" kind="logic" tags="xv2,relations,generators"
const KIND={synergy:"synergy",anti_synergy:"anti-synergy",redundancy:"redundancy"} as const;
const sign=(kind:RelationRecord["kind"])=>kind==="synergy"?1:-1;
/** Goal an effect clause serves (generator G-001's from_effect_clause_goal). */
function clauseGoal(property:string|null):Xv2Goal|null{
 const p=String(property??"");
 return p.includes("ki")?"ki_economy":p.includes("stamina")?"stamina_safety":p.includes("health")||p.includes("hp")?"survivability":p.includes("damage")?"burst_damage":null;
}
const hasTag=(o:Option,tag:string)=>(o.role_tags??[]).some(t=>t.tag===tag);
export function relationsBetween(a:Option|undefined,b:Option|undefined,records:readonly RelationRecord[]):Relation<Xv2Goal>[]{
 if(!a||!b||a.id===b.id)return [];
 const out:Relation<Xv2Goal>[]=[];const seen=new Set<string>();
 const add=(r:Relation<Xv2Goal>)=>{const key=r.goal;if(seen.has(key))return;seen.add(key);out.push(r);};
 // Catalog relation records first: a record about a pair and goal replaces any generated guess.
 for(const r of records){
  if(!((r.a===a.id&&r.b===b.id)||(r.a===b.id&&r.b===a.id)))continue;
  const confirmed=r.state==="confirmed"&&r.non_overlap==="passed"&&r.contribution_policy.startsWith("apply_band_if_confirmed")&&!!r.size_basis;
  add({a:r.a,b:r.b,kind:KIND[r.kind],goal:r.goal_id as Xv2Goal,weight:sign(r.kind)*XV2_SCORING.relationBands[r.weight_band],reason:r.reason,
   evidence:r.evidence.status==="game"?"explicit":"tactical",state:confirmed?"confirmed":"candidate"});
 }
 for(const [x,y] of [[a,b],[b,a]] as const){
  // G-001: a Soul clause triggered by a named skill. The trigger is documented, its size is not: a candidate.
  if(familyOf(x.id)==="soul"&&familyOf(y.id)==="skill")for(const c of x.effect_clauses??[]){
   if(!c.trigger.predicates.some(p=>p.path==="event.skill_id"&&p.operator==="eq"&&p.value===y.id))continue;
   const goal=clauseGoal(c.property);
   if(goal)add({a:x.id,b:y.id,kind:"synergy",goal,weight:XV2_SCORING.relationBands.moderate,state:"candidate",evidence:"rule-derived",reason:x.name+" has an effect triggered by "+y.name+" (G-001); its size isn't measured yet."});
  }
  // G-003: an Awoken that adds a charge action makes a charge Super partly redundant.
  if(familyOf(x.id)==="awoken"&&familyOf(y.id)==="skill"&&(x.action_overrides??[]).some(o=>o.action_id==="charge"&&o.operation==="add")&&hasTag(y,"ki_charge"))
   add({a:x.id,b:y.id,kind:"redundancy",goal:"ki_economy",weight:-XV2_SCORING.relationBands.moderate,state:"candidate",evidence:"rule-derived",reason:x.name+" adds its own charge action, so "+y.name+"'s charging overlaps it (G-003); confirm the charge works in the transformed state."});
 }
 // G-002: two equipped charge skills overlap.
 if(familyOf(a.id)==="skill"&&familyOf(b.id)==="skill"&&hasTag(a,"ki_charge")&&hasTag(b,"ki_charge"))
  add({a:a.id,b:b.id,kind:"redundancy",goal:"ki_economy",weight:-XV2_SCORING.relationBands.minor,state:"candidate",evidence:"rule-derived",reason:"Both "+a.name+" and "+b.name+" are charge skills (G-002); compare their speed and safety before calling one redundant."});
 return out;
}
// MDV_BLOCK:END id="DBX.XV2.SCORING.040" kind="logic" tags="xv2,relations,generators"
