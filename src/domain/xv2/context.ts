/**
 * Player-supplied context (profile `context`), as choices the player sets rather than slots the
 * optimizer fills: race/gender for eligibility (R-002), height and body type (character.ts), level and
 * attribute points (read by derived.ts for the stat engine), and the scenario flags the blockers read.
 * Only what the adapter checks today is here; the rest of the profile's context list (owned
 * inventory, entitlements, earned points...) arrives with the rules that need it.
 */
import type {Build,ContextField} from "../../kernel/optimization/contract";
import {XV2_CHARACTER,bodyLabel,heightLabel} from "./character";
// MDV_BLOCK:BEGIN id="DBX.XV2.CONTEXT.010" intent="Let the player state race/gender and the scenario's requirements without the optimizer choosing them" kind="config" tags="xv2,context"
export const XV2_ARCHETYPES=[
 {id:"male_saiyan",label:"Saiyan (male)"},{id:"female_saiyan",label:"Saiyan (female)"},
 {id:"male_earthling",label:"Earthling (male)"},{id:"female_earthling",label:"Earthling (female)"},
 {id:"male_majin",label:"Majin (male)"},{id:"female_majin",label:"Majin (female)"},
 {id:"namekian",label:"Namekian"},{id:"frieza_race",label:"Frieza Race"},
] as const;
/** The six attributes a player puts points into, as context fields; `attr` is the stat engine's name for each. */
export const XV2_POINT_FIELDS=[
 {id:"points_health",label:"Health",attr:"health"},{id:"points_ki",label:"Max Ki",attr:"ki"},{id:"points_stamina",label:"Max Stamina",attr:"stamina"},
 {id:"points_basic",label:"Basic Attacks",attr:"basic"},{id:"points_strike",label:"Strike Supers",attr:"strike"},{id:"points_blast",label:"Ki Blast Supers",attr:"blast"},
] as const;
/** The three kinds of damage a character can be built around; `kind` is the skill classification each covers, if any. */
export const XV2_FOCUS_FIELDS=[
 {id:"focus_basic",label:"Basic attacks",key:"basic"},{id:"focus_strike",label:"Strike skills",key:"strike"},{id:"focus_blast",label:"Ki Blast skills",key:"blast"},
] as const;
const FOCUS_NOTE="Tick each kind of damage you are building for. A skill of a kind you leave unticked can still be picked for what else it does, but its damage is not counted. With nothing ticked, no choice has been made and all damage counts.";
export const XV2_CONTEXT:readonly ContextField[]=[
 {id:"archetype",label:"Race / gender",note:"Unset means race-locked options can't be checked yet.",options:[{id:"",label:"Not set"},...XV2_ARCHETYPES]},
 {id:"height",label:"Height",note:"Set at character creation; changes health and speed.",options:[{id:"",label:"Not set"},...XV2_CHARACTER.heights.map(h=>({id:h.id,label:heightLabel(h)}))]},
 {id:"body_type",label:"Body type",note:"Set at character creation; shifts damage between strike and Ki Blast Supers.",options:[{id:"",label:"Not set"},...XV2_CHARACTER.body_types.map(b=>({id:b.id,label:bodyLabel(b)}))]},
 {id:"level",label:"Character level",note:"1 to 199. With race, height and body type, lets the optimizer work out your health, Ki, Stamina and damage ratings.",options:[],number:{min:1,max:199}},
 ...XV2_POINT_FIELDS.map(f=>({id:f.id,label:"Points in "+f.label,note:"Attribute points you put into "+f.label+" (0 to 200). Unset counts as 0.",options:[],number:{min:0,max:200}})),
 ...XV2_FOCUS_FIELDS.map(f=>({id:f.id,label:"Building for damage from: "+f.label,note:FOCUS_NOTE,options:[{id:"",label:"No"},{id:"yes",label:"Yes"}],toggle:true})),
 {id:"acquisition",label:"Where options may come from",note:"The TP Medal Shop stock rotates weekly, so a TP-only option may not be buyable when you need it. \"What I own\" is the recorded inventory (docs/ingest/catalog/owned.json).",options:[{id:"",label:"Any source"},{id:"no_tp_only",label:"Skip TP Medal Shop only"},{id:"no_tp_unless_owned",label:"Skip TP Medal Shop only, except what I own"},{id:"owned_only",label:"Only what I own"}]},
 {id:"armor_answer",label:"Expert Mission: answer to boss Super Armor",options:[{id:"",label:"Not required"},{id:"required_known",label:"Required (boss armor documented)"},{id:"required_unknown",label:"Required (boss armor not documented)"}]},
 {id:"escort_heal",label:"Parallel Quest: escort needs healing",options:[{id:"",label:"Not required"},{id:"required",label:"Required"}]},
 {id:"raid_damage_floor",label:"Raid: damage floor",options:[{id:"",label:"Not required"},{id:"required",label:"Required"}]},
];
export const contextValue=(build:Build,id:string):string=>build.context?.[id]??"";
/** Which kinds of damage the player says they are building for; null when none is ticked, meaning no choice was made. */
export type DamageFocus={basic:boolean;strike:boolean;blast:boolean};
export function damageFocus(build:Build):DamageFocus|null{
 const f={basic:!!contextValue(build,"focus_basic"),strike:!!contextValue(build,"focus_strike"),blast:!!contextValue(build,"focus_blast")};
 return f.basic||f.strike||f.blast?f:null;
}
// MDV_BLOCK:END id="DBX.XV2.CONTEXT.010" kind="config" tags="xv2,context"
