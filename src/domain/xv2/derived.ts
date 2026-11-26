/**
 * What the game doesn't show the player: health, Max Ki, Max Stamina and the four damage ratings,
 * worked out by the stat engine (stats.ts) from what the player can see and state: level, race,
 * height, body type, attribute points and the equipped QQ Bang's arrows. Nothing here changes a
 * score yet; these are figures shown beside the build.
 */
import type {Build,BuildFact} from "../../kernel/optimization/contract";
import {XV2_POINT_FIELDS,contextValue} from "./context";
import type {Known,Option} from "./records";
import {computeStats,levelRow,NO_POINTS,XV2_STAT_TABLE,type Allocation,type Attribute,type StatInput,type Stats} from "./stats";
// MDV_BLOCK:BEGIN id="DBX.XV2.DERIVED.010" intent="Read the stat engine's inputs out of a build, saying what is missing instead of guessing it" kind="logic" tags="xv2,stats,context"
const QQ_STAT:Readonly<Record<Attribute,string>>={health:"health",ki:"max_ki",stamina:"max_stamina",basic:"basic_attack",strike:"strike_supers",blast:"ki_blast_supers"};
const BODY:Readonly<Record<string,StatInput["body"]>>={"body.thin":"thin","body.average":"average","body.thick":"thick"};
export type StatReading={input:StatInput;stats:Stats;spent:number;available:number}|{missing:string[]};
/** The QQ Bang's arrows per attribute; null when any of them isn't recorded. No QQ Bang means no arrows. */
function qqArrows(qq:Option|undefined):Allocation|null{
 if(!qq)return NO_POINTS;
 const mods=(qq as {stat_modifiers?:Record<string,Known<number>>}).stat_modifiers??{};
 const out:Record<string,number>={};
 for(const [attr,key] of Object.entries(QQ_STAT)){const k=mods[key];if(!k||k.status!=="known"||k.value===null)return null;out[attr]=k.value;}
 return out as Allocation;
}
export function readStats(build:Build,qq:Option|undefined):StatReading{
 const level=Number(contextValue(build,"level")),archetype=contextValue(build,"archetype");
 const height=Number(contextValue(build,"height").replace("height.","")),body=BODY[contextValue(build,"body_type")];
 const missing=[!level&&"character level",!archetype&&"race / gender",!height&&"height",!body&&"body type"].filter((m):m is string=>!!m);
 const arrows=qqArrows(qq);
 if(!arrows)missing.push("the QQ Bang's six stats");
 if(missing.length||!arrows)return {missing};
 const points=Object.fromEntries(XV2_POINT_FIELDS.map(f=>[f.attr,Number(contextValue(build,f.id))||0])) as Allocation;
 const input:StatInput={level,archetype,height,body,points,qq:arrows};
 return {input,stats:computeStats(input),spent:Object.values(points).reduce((n,v)=>n+v,0),available:levelRow(level).available};
}
// MDV_BLOCK:END id="DBX.XV2.DERIVED.010" kind="logic" tags="xv2,stats,context"
// MDV_BLOCK:BEGIN id="DBX.XV2.DERIVED.020" intent="Phrase the worked-out stats in the bars and numbers a player thinks in" kind="logic" tags="xv2,stats,facts"
const round=(n:number,step=1)=>(Math.round(n/step)*step).toLocaleString("en-US",{maximumFractionDigits:1});
const bars=(n:number,per:number)=>round(n/per,0.1)+" bars";
export function statFacts(build:Build,qq:Option|undefined):BuildFact[]{
 const r=readStats(build,qq);
 if("missing" in r)return [{label:"Stats the game doesn't show",value:"Not worked out yet",note:"set "+r.missing.join(", ")}];
 const s=r.stats,cap=XV2_STAT_TABLE.resource_cap,left=r.available-r.spent;
 const capped=(uncapped:number)=>uncapped>cap?round(uncapped-cap)+" over the 15-bar cap is wasted":undefined;
 return [
  {label:"Health",value:round(s.health)+" HP",note:bars(s.health,10000)},
  {label:"Max Ki",value:bars(s.ki,100),note:capped(s.ki_uncapped)},
  {label:"Max Stamina",value:bars(s.stamina,100),note:capped(s.stamina_uncapped)},
  {label:"Basic Attack rating",value:round(s.basic_attack)},
  {label:"Basic Ki Blast rating",value:round(s.basic_ki_blast)},
  {label:"Strike Super rating",value:round(s.strike_super)},
  {label:"Ki Blast Super rating",value:round(s.ki_blast_super)},
  {label:"Attribute points",value:r.spent+" of "+r.available+" used",note:left<0?(-left)+" more than level "+r.input.level+" gives":left>0?left+" left to spend":undefined},
 ];
}
// MDV_BLOCK:END id="DBX.XV2.DERIVED.020" kind="logic" tags="xv2,stats,facts"
