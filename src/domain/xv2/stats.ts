/**
 * Character stats from level, race, height, body type, attribute points and QQ Bang arrows, by the
 * formulas of the Xenoverse 2 Stat Calculator v2 (Exxod; data and testing by Rechow and Durp). Tables
 * in docs/ingest/catalog/stat-calculator.json; the model and its limits in docs/ingest/catalog/STATS.md.
 *
 * Every stat is a level multiplier times (1 + the sum of additive PSC modifiers): x10 for health, x200
 * for the four damage ratings; Ki and Stamina are capped at 1500. Damage ratings are the character's
 * underlying offence, not the damage of any one attack. Pure: no rounding, no I/O.
 */
import data from "../../../docs/ingest/catalog/stat-calculator.json";
// MDV_BLOCK:BEGIN id="DBX.XV2.STATS.010" intent="Name the six attributes a player allocates and the stats they produce" kind="types" tags="xv2,stats,attributes"
export type Attribute="health"|"ki"|"stamina"|"basic"|"strike"|"blast";
export type Allocation=Readonly<Record<Attribute,number>>;
export type StatInput={level:number;archetype:string;height:number;body:"thin"|"average"|"thick";points:Allocation;qq:Allocation};
export type Stats={health:number;ki:number;stamina:number;ki_uncapped:number;stamina_uncapped:number;
 basic_attack:number;basic_ki_blast:number;strike_super:number;ki_blast_super:number};
export const ATTRIBUTES:readonly Attribute[]=["health","ki","stamina","basic","strike","blast"];
export const NO_POINTS:Allocation={health:0,ki:0,stamina:0,basic:0,strike:0,blast:0};
type Damage="basic_attack"|"basic_ki_blast"|"strike_super"|"ki_blast_super";
type Table={levels:number[][];qq_bang_psc_per_arrow:Record<Attribute,number>;
 race_psc:Record<string,Record<"health"|Damage,number>>;height_health_psc:Record<string,number>;
 body_damage_psc:Record<string,Record<Damage,number>>;resource_cap:number;max_points_per_attribute:number};
export const XV2_STAT_TABLE=data as unknown as Table;
// MDV_BLOCK:END id="DBX.XV2.STATS.010" kind="types" tags="xv2,stats,attributes"
// MDV_BLOCK:BEGIN id="DBX.XV2.STATS.020" intent="Turn levels, attribute points and QQ Bang arrows into the calculator's multipliers and PSC modifiers" kind="logic" tags="xv2,stats,attributes"
const T=XV2_STAT_TABLE;
function whole(n:number,lo:number,hi:number,what:string):number{
 if(!Number.isInteger(n)||n<lo||n>hi)throw new RangeError(what+" must be a whole number from "+lo+" to "+hi+", not "+n);
 return n;
}
/** The level multipliers L_HP, L_Ki, L_Stamina, L_Damage, and the attribute points that level grants. */
export function levelRow(level:number){
 const [,hp,ki,stamina,damage,available]=T.levels[whole(level,1,T.levels.length,"Level")-1];
 return {hp,ki,stamina,damage,available};
}
/** PSC from points in one attribute: 0.002 each for health and damage; 0.0048 each for Ki and Stamina up to 125, then 0.2/75 each. */
export function pointsPsc(attr:Attribute,points:number):number{
 const p=whole(points,0,T.max_points_per_attribute,"Points");
 if(attr!=="ki"&&attr!=="stamina")return p*0.002;
 return p<=125?p*0.0048:0.6+(p-125)*(0.2/75);
}
/** PSC from a QQ Bang's arrows in one attribute (-5 to +5): one arrow is four clothing arrows. */
export function qqPsc(attr:Attribute,arrows:number):number{
 return whole(arrows,-5,5,"QQ Bang arrows")*T.qq_bang_psc_per_arrow[attr];
}
// MDV_BLOCK:END id="DBX.XV2.STATS.020" kind="logic" tags="xv2,stats,attributes"
// MDV_BLOCK:BEGIN id="DBX.XV2.STATS.030" intent="Compute a character's health, Ki, Stamina and damage ratings the way the calculator does" kind="logic" tags="xv2,stats"
export function computeStats(c:StatInput):Stats{
 const L=levelRow(c.level),race=T.race_psc[c.archetype],tall=T.height_health_psc[String(c.height)],body=T.body_damage_psc[c.body];
 if(!race)throw new RangeError("Unknown race/gender: "+c.archetype);
 if(tall===undefined)throw new RangeError("Height must be 1 to 4, not "+c.height);
 if(!body)throw new RangeError("Unknown body type: "+c.body);
 const own=(a:Attribute)=>pointsPsc(a,c.points[a])+qqPsc(a,c.qq[a]);
 const rating=(a:Attribute,d:Damage)=>L.damage*(1+own(a)+race[d]+body[d])*200;
 const ki=L.ki*(1+own("ki")),stamina=L.stamina*(1+own("stamina"));
 return {health:L.hp*(1+own("health")+race.health+tall)*10,
  ki:Math.min(ki,T.resource_cap),stamina:Math.min(stamina,T.resource_cap),ki_uncapped:ki,stamina_uncapped:stamina,
  basic_attack:rating("basic","basic_attack"),basic_ki_blast:rating("basic","basic_ki_blast"),
  strike_super:rating("strike","strike_super"),ki_blast_super:rating("blast","ki_blast_super")};
}
// MDV_BLOCK:END id="DBX.XV2.STATS.030" kind="logic" tags="xv2,stats"
// MDV_BLOCK:BEGIN id="DBX.XV2.STATS.040" intent="Say what one more point or one more QQ Bang arrow is worth at a level, and how many points reach a Ki or Stamina target" kind="logic" tags="xv2,stats,optimization"
const scale=(L:ReturnType<typeof levelRow>,a:Attribute)=>a==="health"?L.hp*10:a==="ki"?L.ki:a==="stamina"?L.stamina:L.damage*200;
/** HP, Ki, Stamina or damage rating added by the next point, given the points already in that attribute. Ignores the 1500 cap. */
export function perPoint(level:number,attr:Attribute,already=0):number{
 return scale(levelRow(level),attr)*(pointsPsc(attr,already+1)-pointsPsc(attr,already));
}
/** HP, Ki, Stamina or damage rating added by one positive QQ Bang arrow. Ignores the 1500 cap. */
export function perArrow(level:number,attr:Attribute):number{
 return scale(levelRow(level),attr)*qqPsc(attr,1);
}
/** Fewest points in Ki or Stamina that reach the target (1500 by default) with this many QQ Bang arrows, or null if 200 points can't. */
export function pointsForResource(level:number,attr:"ki"|"stamina",arrows:number,target=T.resource_cap):number|null{
 const base=levelRow(level)[attr];
 for(let p=0;p<=T.max_points_per_attribute;p++)if(base*(1+pointsPsc(attr,p)+qqPsc(attr,arrows))>=target-1e-9)return p;
 return null;
}
// MDV_BLOCK:END id="DBX.XV2.STATS.040" kind="logic" tags="xv2,stats,optimization"
