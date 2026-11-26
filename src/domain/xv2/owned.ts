/**
 * What the owner's character owns and has equipped (docs/ingest/catalog/owned.json), by name and by
 * the game's own slot and tab. An inventory only: a name here has no grades, costs or effects until
 * the option is added to the catalog. Read from the owner's in-game screenshots.
 */
import data from "../../../docs/ingest/catalog/owned.json";
import {familyOf,type Known,type Option} from "./records";
// MDV_BLOCK:BEGIN id="DBX.XV2.OWNED.010" intent="Name the shape of the owner's inventory as recorded" kind="types" tags="xv2,owned,inventory"
export type OwnedSlot="super"|"ultimate"|"evasive"|"awoken";
export type OwnedSoul={name:string;stars:number|null;ki_blast_type?:string;text?:string;limit_burst?:string};
export type QqArrows={stars:number;health:number;ki:number;stamina:number;basic:number;strike:number;blast:number;equipped?:boolean};
export type Owned={about:string;
 character:{name:string;archetype:string;height:string;body_type:string;level:number;ki_blast_type:string;attribute_points:Record<"health"|"ki"|"stamina"|"basic"|"strike"|"blast",number>;attribute_points_unspent:number};
 equipped:{super:string[];ultimate:string[];awoken:string;evasive:string;super_soul:string;qq_bang:QqArrows};
 skills:Record<OwnedSlot,Record<string,string[]>>;super_souls:OwnedSoul[];qq_bangs:QqArrows[]};
export const XV2_OWNED=data as unknown as Owned;
// MDV_BLOCK:END id="DBX.XV2.OWNED.010" kind="types" tags="xv2,owned,inventory"
// MDV_BLOCK:BEGIN id="DBX.XV2.OWNED.020" intent="Tell whether a catalog option is one the owner already has, matching names the way a person would" kind="logic" tags="xv2,owned,inventory"
/** Case, quotes and punctuation differ between the game's menus and the wiki; letters and digits don't. */
export const nameKey=(name:string):string=>name.toLowerCase().replace(/[^a-z0-9]+/g,"");
const SKILL_SLOT:Readonly<Record<string,OwnedSlot>>={super:"super",ultimate:"ultimate",evasive:"evasive"};
function keys(owned:Owned):Record<string,ReadonlySet<string>>{
 const of=(names:readonly string[])=>new Set(names.map(nameKey));
 const slot=(s:OwnedSlot)=>of(Object.values(owned.skills[s]).flat());
 return {super:slot("super"),ultimate:slot("ultimate"),evasive:slot("evasive"),awoken:slot("awoken"),soul:of(owned.super_souls.map(s=>s.name))};
}
const KEYS=keys(XV2_OWNED);
/** A QQ Bang has no name of its own, so it is owned when its six arrows equal one in the inventory. */
const QQ_STAT={health:"health",ki:"max_ki",stamina:"max_stamina",basic:"basic_attack",strike:"strike_supers",blast:"ki_blast_supers"} as const;
function qqOwned(option:object):boolean{
 const mods=(option as {stat_modifiers?:Record<string,Known<number>>}).stat_modifiers;
 if(!mods)return false;
 return XV2_OWNED.qq_bangs.some(q=>Object.entries(QQ_STAT).every(([arrow,stat])=>mods[stat]?.status==="known"&&mods[stat].value===q[arrow as keyof typeof QQ_STAT]));
}
/** True when the option's name is in the owner's list for its kind, or, for a QQ Bang, its arrows are. */
export function isOwned(option:Pick<Option,"id"|"name">):boolean{
 const family=familyOf(option.id);
 if(family==="qqbang")return qqOwned(option);
 const kind=family==="skill"?SKILL_SLOT[option.id.split(".")[1]]:family;
 return !!kind&&!!KEYS[kind]?.has(nameKey(option.name));
}
// MDV_BLOCK:END id="DBX.XV2.OWNED.020" kind="logic" tags="xv2,owned,inventory"
