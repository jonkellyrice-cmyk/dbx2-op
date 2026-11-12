/**
 * Legality for Xenoverse 2 loadouts (profile rules R-001...R-012, spec §19.3). One function,
 * `selectionReasons`, says why an option can't sit in a slot; legalOptions() and validate() both use
 * it, so the picker never offers what validation rejects.
 *
 * Checked now: R-001 duplicate skill, R-002 race/gender (when both the player's archetype and the
 * option's eligibility are known), R-007 family matches slot, R-012 id exists. R-005 and R-009 hold
 * by construction (one Soul slot, one QQ Bang slot). Not yet checked, because the context they need
 * isn't collected: R-003/R-004 (earned points and stat caps), R-006 (ownership), R-008 (DLC and
 * unlocks), R-010 (mode rules), R-011 (level). Unknown data never fails a rule (on_unknown:
 * unverified); it simply isn't asserted as legal either.
 */
import type {Build,Issue,OptionInfo,Slot} from "../../kernel/optimization/contract";
import {XV2_RULES,XV2_SLOTS,type ProfileSlot,type RuleId,type SlotFamily} from "./profile";
import {familyOf,type Option} from "./records";
import {contextValue} from "./context";
import type {Spread} from "./spreads";
// MDV_BLOCK:BEGIN id="DBX.XV2.RULES.010" intent="Expose the eleven loadout slots, all available from the start" kind="config" tags="xv2,rules,slots"
export type Xv2Slot=Slot&{family:SlotFamily};
export const XV2_ENGINE_SLOTS:readonly Xv2Slot[]=XV2_SLOTS.map((s:ProfileSlot)=>({id:s.id,label:s.label,level:1,family:s.family}));
const message=(id:RuleId)=>XV2_RULES.find(r=>r.id===id)!.message;
// MDV_BLOCK:END id="DBX.XV2.RULES.010" kind="config" tags="xv2,rules,slots"
// MDV_BLOCK:BEGIN id="DBX.XV2.RULES.020" intent="Say every rule an option breaks in a slot, given the rest of the loadout and the player's race" kind="logic" tags="xv2,rules,legality"
/** Which slot family an option can fill (R-007). */
export function optionSlotFamily(id:string,option:Option|undefined):SlotFamily|null{
 switch(familyOf(id)){
  case "skill":return option?.slot_family??null;
  case "awoken":return "awoken";
  case "soul":return "super_soul";
  case "qqbang":return "qq_bang";
  case "spread":return "stat_spread";
  default:return null;
 }
}
export type Lookup={option(id:string):Option|undefined;spread(id:string):Spread|undefined};
export function selectionReasons(build:Build,slot:Xv2Slot,id:string,lookup:Lookup):string[]{
 const option=lookup.option(id);
 if(!option&&!lookup.spread(id))return [message("R-012")+" ("+id+")"];
 const reasons:string[]=[];
 if(optionSlotFamily(id,option)!==slot.family)reasons.push(message("R-007"));
 if(familyOf(id)==="skill"&&XV2_ENGINE_SLOTS.some(s=>s.id!==slot.id&&build.picks[s.id]===id))reasons.push(message("R-001"));
 const archetype=contextValue(build,"archetype");
 const allowed=option?.eligibility.archetypes;
 if(archetype&&allowed?.status==="known"&&allowed.values&&!allowed.values.includes(archetype))reasons.push(message("R-002"));
 return reasons;
}
// MDV_BLOCK:END id="DBX.XV2.RULES.020" kind="logic" tags="xv2,rules,legality"
// MDV_BLOCK:BEGIN id="DBX.XV2.RULES.030" intent="Answer the picker and the validator with the same reasons" kind="logic" tags="xv2,rules,legality"
export function legalOptionsFor(build:Build,slot:Slot,all:readonly OptionInfo[],lookup:Lookup):OptionInfo[]{
 const full=XV2_ENGINE_SLOTS.find(s=>s.id===slot.id);if(!full)return [];
 const others={...build,picks:Object.fromEntries(Object.entries(build.picks).filter(([k])=>k!==slot.id))};
 return all.filter(o=>selectionReasons(others,full,o.id,lookup).length===0);
}
export function validateBuild(build:Build,lookup:Lookup):Issue[]{
 const issues:Issue[]=[];
 for(const [slotId,id] of Object.entries(build.picks)){
  const slot=XV2_ENGINE_SLOTS.find(s=>s.id===slotId);
  if(!slot){issues.push({slotId,reason:"Unknown slot"});continue;}
  for(const reason of selectionReasons(build,slot,id,lookup))issues.push({slotId,reason});
 }
 return issues;
}
// MDV_BLOCK:END id="DBX.XV2.RULES.030" kind="logic" tags="xv2,rules,legality"
// MDV_BLOCK:BEGIN id="DBX.XV2.RULES.040" intent="Check an exact attribute allocation against the earned points and the per-stat cap, keeping an unknown budget unverified" kind="logic" tags="xv2,rules,attributes"
export type BudgetOutcome="pass"|"fail"|"unverified";
/** R-003 (total ≤ earned points) and R-004 (each stat ≤ cap). A null budget or cap can't fail: it is unverified. */
export function checkAttributeBudget(points:Readonly<Record<string,number>>,earned:number|null,cap:number|null):{"R-003":BudgetOutcome;"R-004":BudgetOutcome;total:number}{
 const values=Object.values(points);const total=values.reduce((n,v)=>n+v,0);
 return {
  "R-003":earned===null?"unverified":total>earned?"fail":"pass",
  "R-004":cap===null?"unverified":values.some(v=>v>cap)?"fail":"pass",
  total,
 };
}
// MDV_BLOCK:END id="DBX.XV2.RULES.040" kind="logic" tags="xv2,rules,attributes"
