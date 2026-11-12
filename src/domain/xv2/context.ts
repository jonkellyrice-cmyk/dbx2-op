/**
 * Player-supplied context (profile `context`), as choices the player sets rather than slots the
 * optimizer fills: race/gender for eligibility (R-002), and the scenario flags the blockers read.
 * Only what the adapter checks today is here; the rest of the profile's context list (owned
 * inventory, entitlements, earned points...) arrives with the rules that need it.
 */
import type {Build,ContextField} from "../../kernel/optimization/contract";
// MDV_BLOCK:BEGIN id="DBX.XV2.CONTEXT.010" intent="Let the player state race/gender and the scenario's requirements without the optimizer choosing them" kind="config" tags="xv2,context"
export const XV2_ARCHETYPES=[
 {id:"male_saiyan",label:"Saiyan (male)"},{id:"female_saiyan",label:"Saiyan (female)"},
 {id:"male_earthling",label:"Earthling (male)"},{id:"female_earthling",label:"Earthling (female)"},
 {id:"male_majin",label:"Majin (male)"},{id:"female_majin",label:"Majin (female)"},
 {id:"namekian",label:"Namekian"},{id:"frieza_race",label:"Frieza Race"},
] as const;
export const XV2_CONTEXT:readonly ContextField[]=[
 {id:"archetype",label:"Race / gender",note:"Unset means race-locked options can't be checked yet.",options:[{id:"",label:"Not set"},...XV2_ARCHETYPES]},
 {id:"armor_answer",label:"Expert Mission: answer to boss Super Armor",options:[{id:"",label:"Not required"},{id:"required_known",label:"Required (boss armor documented)"},{id:"required_unknown",label:"Required (boss armor not documented)"}]},
 {id:"escort_heal",label:"Parallel Quest: escort needs healing",options:[{id:"",label:"Not required"},{id:"required",label:"Required"}]},
 {id:"raid_damage_floor",label:"Raid: damage floor",options:[{id:"",label:"Not required"},{id:"required",label:"Required"}]},
];
export const contextValue=(build:Build,id:string):string=>build.context?.[id]??"";
// MDV_BLOCK:END id="DBX.XV2.CONTEXT.010" kind="config" tags="xv2,context"
