/**
 * Legality for the toy game. The pattern to copy: one function (`selectionReasons`) says why an
 * option can't go in a slot; legalOptions() and validate() both use it, so the picker can never
 * offer something validation then rejects.
 */
import type {Blocker,Build,Issue,OptionInfo,Slot} from "../../kernel/optimization/contract";
import {TOY_OPTIONS,type ToyKind,type ToyOption} from "./catalog";
// MDV_BLOCK:BEGIN id="TPL.TOY.RULES.010" intent="Declare which slot each level unlocks and which kind of option it takes" kind="config" tags="toy,rules,slots"
export type ToySlot=Slot&{kind:ToyKind};
export const TOY_SLOTS:readonly ToySlot[]=[
 {id:"origin",label:"Origin",level:1,kind:"origin"},
 {id:"technique1",label:"Technique",level:1,kind:"technique"},
 {id:"technique2",label:"Technique",level:2,kind:"technique"},
 {id:"talent3",label:"Talent",level:3,kind:"talent"},
 {id:"technique4",label:"Technique",level:4,kind:"technique"},
 {id:"signature5",label:"Signature",level:5,kind:"signature"},
];
export const TOY_MAX_LEVEL=5;
export const TOY_BY_ID:ReadonlyMap<string,ToyOption>=new Map(TOY_OPTIONS.map(o=>[o.id,o]));
export const toyInfo=(o:ToyOption):OptionInfo=>({id:o.id,name:o.name,summary:o.summary,level:o.level,tags:o.tags});
// MDV_BLOCK:END id="TPL.TOY.RULES.010" kind="config" tags="toy,rules,slots"
// MDV_BLOCK:BEGIN id="TPL.TOY.RULES.020" intent="Say every reason an option can't sit in a slot, checking prerequisites at the level the option is acquired" kind="logic" tags="toy,rules,legality"
export function toySlots(build:Build):ToySlot[]{return TOY_SLOTS.filter(s=>s.level<=build.level);}
/** Every rule `option` breaks in `slot`, given the build's other picks. Empty = legal. */
export function selectionReasons(build:Build,slot:ToySlot,option:ToyOption):string[]{
 const reasons:string[]=[];
 const others=TOY_SLOTS.filter(s=>s.id!==slot.id&&build.picks[s.id]&&s.level<=build.level);
 if(option.kind!==slot.kind)reasons.push(option.name+" is a "+option.kind+", not a "+slot.kind);
 if(option.level>slot.level)reasons.push(option.name+" needs level "+option.level+"; this slot is level "+slot.level);
 if(others.some(s=>build.picks[s.id]===option.id))reasons.push(option.name+" is already taken");
 // A prerequisite counts only if it was taken at this slot's level or earlier: later picks can't legalize earlier ones.
 if(option.requires&&!others.some(s=>s.level<=slot.level&&build.picks[s.id]===option.requires))reasons.push("Requires "+(TOY_BY_ID.get(option.requires)?.name??option.requires)+" by level "+slot.level);
 for(const s of others){
  const other=TOY_BY_ID.get(build.picks[s.id]);
  if(other&&(option.excludes?.includes(other.id)||other.excludes?.includes(option.id)))reasons.push(option.name+" can't be taken with "+other.name);
 }
 return reasons;
}
export function toyLegalOptions(build:Build,slot:Slot):OptionInfo[]{
 const full=TOY_SLOTS.find(s=>s.id===slot.id);if(!full)return [];
 return TOY_OPTIONS.filter(o=>selectionReasons(build,full,o).length===0).map(toyInfo);
}
export function toyValidate(build:Build):Issue[]{
 const issues:Issue[]=[];
 for(const [slotId,id] of Object.entries(build.picks)){
  const slot=TOY_SLOTS.find(s=>s.id===slotId);
  if(!slot){issues.push({slotId,reason:"Unknown slot"});continue;}
  if(slot.level>build.level){issues.push({slotId,reason:"Slot opens at level "+slot.level});continue;}
  const option=TOY_BY_ID.get(id);
  if(!option){issues.push({slotId,reason:"Unknown option "+id});continue;}
  for(const reason of selectionReasons(build,slot,option))issues.push({slotId,reason});
 }
 return issues;
}
// MDV_BLOCK:END id="TPL.TOY.RULES.020" kind="logic" tags="toy,rules,legality"
// MDV_BLOCK:BEGIN id="TPL.TOY.RULES.030" intent="State the hard requirements a request can name, apart from the game's own rules" kind="config" tags="toy,blockers"
/** The game allows a bodyguard without a guard option; the Bodyguard request doesn't. */
export const TOY_BLOCKERS:readonly Blocker[]=[
 {id:"guard-option",label:"A guard option",message:"A bodyguard with no guard option can't protect anyone; take Shield Wall, Iron Skin or Bulwark Stance.",
  test:build=>toySlots(build).some(s=>TOY_BY_ID.get(build.picks[s.id])?.tags.includes("guard"))},
];
// MDV_BLOCK:END id="TPL.TOY.RULES.030" kind="config" tags="toy,blockers"
