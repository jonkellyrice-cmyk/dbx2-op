/**
 * What an option is worth inside a particular loadout, where a documented fact makes part of its
 * value depend on the rest of the build: a Super Soul whose condition needs an Awoken or a skill the
 * build doesn't hold, a boost to one kind of skill in a build with none of that kind, and anything
 * that seals skills next to the skills it seals. Pure: it reads only the catalog records passed in.
 */
import type {Xv2Goal} from "./profile";
import {familyOf,type EffectClause,type Option} from "./records";
// MDV_BLOCK:BEGIN id="DBX.XV2.CONDITIONS.010" intent="Name a cut to an option's score and the facts that cause one" kind="types" tags="xv2,conditions,loadout"
/** The share of a goal's score that still counts in this build, with the reason shown beside it. */
export type Cut={goal:Xv2Goal;share:number;reason:string};
/**
 * MODEL: how much of a score counts while skills are sealed part of the time. A skill-sealing option
 * you choose to use still pays off, and sealed skills still work outside its window, so each counts
 * at half rather than nothing. A judgment, not a measurement.
 */
export const SEALED_SHARE=0.5;
const DAMAGE:readonly Xv2Goal[]=["burst_damage","sustained_damage"];
const GOALS:readonly Xv2Goal[]=["burst_damage","sustained_damage","ki_economy","stamina_safety","control","mobility","crowd_handling","survivability"];
type Clause=EffectClause&{notes?:string|null};
const clauses=(o:Option):readonly Clause[]=>(o.effect_clauses??o.effects??[]) as readonly Clause[];
const isSkill=(o:Option)=>familyOf(o.id)==="skill"&&(o.slot_family==="super"||o.slot_family==="ultimate");
const kindOf=(o:Option)=>(o as {classification?:string}).classification;
export const sealsSkills=(o:Option):boolean=>clauses(o).some(c=>c.property==="seals_all_skills");
// MDV_BLOCK:END id="DBX.XV2.CONDITIONS.010" kind="types" tags="xv2,conditions,loadout"
// MDV_BLOCK:BEGIN id="DBX.XV2.CONDITIONS.020" intent="Tell when a condition's need is met by the build, and which kind of skill a boost is for" kind="logic" tags="xv2,conditions,needs"
/** The ids that satisfy an option's condition, by what they must be; null when it has no such need. */
export function needsOf(o:Option):{awoken:readonly string[]|null;skill:readonly string[]|null}{
 const list=(path:string)=>{const p=clauses(o).flatMap(c=>c.trigger.predicates).find(p=>p.path===path&&p.operator==="in");return p?(p.value as readonly string[]):null;};
 return {awoken:list("actor.awoken_id"),skill:list("event.skill_id")};
}
/** "strike" or "ki_blast" when the text boosts that kind of skill only; null when it names both or neither. */
export function boostedKind(text:string):"strike"|"ki_blast"|null{
 const strike=/strike skill/i.test(text),ki=/ki blast[- ]?(based )?skill|ki blast-based|ki skill/i.test(text);
 return strike===ki?null:strike?"strike":"ki_blast";
}
// MDV_BLOCK:END id="DBX.XV2.CONDITIONS.020" kind="logic" tags="xv2,conditions,needs"
// MDV_BLOCK:BEGIN id="DBX.XV2.CONDITIONS.030" intent="List the cuts a loadout makes to one option's scores, each with a plain reason" kind="logic" tags="xv2,conditions,loadout"
/** `others` are the other options the build holds; names come from the records themselves. */
export function conditionCuts(o:Option,others:readonly Option[]):Cut[]{
 const cuts:Cut[]=[];const family=familyOf(o.id);
 const skills=others.filter(isSkill);
 const graded=(goal:Xv2Goal)=>o.tactical_grades[goal]?.status==="known"?o.tactical_grades[goal].reason:null;
 // 1. A Super Soul whose condition names an Awoken or a skill the build doesn't hold: its conditional lines do nothing.
 if(family==="soul"){
  const need=needsOf(o);
  const awoken=others.find(x=>familyOf(x.id)==="awoken");
  const missing=need.awoken&&!(awoken&&need.awoken.includes(awoken.id))?(need.awoken.length?"an Awoken this build doesn't have equipped":"an Awoken that isn't in the catalog")
   :need.skill&&!others.some(x=>need.skill!.includes(x.id))?"a skill this build doesn't have equipped":null;
  if(missing)for(const goal of GOALS){const reason=graded(goal);if(reason?.startsWith("["))cuts.push({goal,share:0,reason:"Its condition needs "+missing+", so this effect never applies here"});}
 }
 // 2. A boost to one kind of skill, in a build with no skill of that kind.
 const burst=graded("burst_damage");
 if(burst&&family!=="skill"||burst&&kindOf(o)==="power_up"){
  const kind=boostedKind(burst!);
  if(kind&&!skills.some(s=>kindOf(s)===kind)&&!cuts.some(c=>c.goal==="burst_damage"))
   cuts.push({goal:"burst_damage",share:0,reason:"It boosts "+(kind==="strike"?"Strike":"Ki Blast")+" skills only, and this build has none equipped"});
 }
 // 3. Sealed skills. A Super Soul that seals skills leaves every Super and Ultimate sealed part of the time;
 //    a skill that seals skills when you use it gives up the others for as long as it lasts.
 if(isSkill(o)&&!sealsSkills(o)){
  const soul=others.find(x=>familyOf(x.id)==="soul"&&sealsSkills(x));
  if(soul)for(const goal of DAMAGE)cuts.push({goal,share:SEALED_SHARE,reason:soul.name+" seals all skills while its condition holds, so this counts at half (MODEL)"});
 }
 if(isSkill(o)&&sealsSkills(o)&&skills.length)
  for(const goal of GOALS)cuts.push({goal,share:SEALED_SHARE,reason:"While it lasts you can't use the "+skills.length+" other skill"+(skills.length===1?"":"s")+" equipped, so it counts at half (MODEL)"});
 return cuts;
}
// MDV_BLOCK:END id="DBX.XV2.CONDITIONS.030" kind="logic" tags="xv2,conditions,loadout"
