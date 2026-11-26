/**
 * Measured damage from two community spreadsheets (docs/ingest/catalog/damage-tests.json): one row per
 * Super, Ultimate or Evasive, tested on a level-99 character with 125 points and a +5 QQ Bang.
 * Where a catalog option has a row, its burst-damage grade comes from that measurement, in place of
 * the wiki's percentage, and an unknown Ki or stamina cost is filled from it. An option with no row
 * is left exactly as it was. The bands are in docs/ingest/catalog/GRADING.md.
 */
import data from "../../../docs/ingest/catalog/damage-tests.json";
import {nameKey} from "./owned";
import type {Evidence,Grade,Option} from "./records";
// MDV_BLOCK:BEGIN id="DBX.XV2.DAMAGETESTS.010" intent="Name one measured row and the bands that turn measured damage into a burst grade" kind="types" tags="xv2,catalog,damage,tests"
export type DamageTest={kind:"ki_blast"|"strike";slot:"super"|"ultimate"|"evasive";name:string;listed:string;damage:string;cost:string;range:string;speed:string;hold:string;notes:string;source:string};
type File={version:string;sources:Readonly<Record<string,string>>;rows:readonly (readonly string[])[]};
/** Upper edge of each grade, in measured damage: under 2,000 is 1, and 10,000 or more is 5. */
const BANDS:readonly (readonly [number,string])[]=[[2000,"Under 2,000 is grade 1."],[4000,"2,000-3,999 is grade 2."],[7000,"4,000-6,999 is grade 3."],[10000,"7,000-9,999 is grade 4."],[Infinity,"10,000 or more is grade 5."]];
// MDV_BLOCK:END id="DBX.XV2.DAMAGETESTS.010" kind="types" tags="xv2,catalog,damage,tests"
// MDV_BLOCK:BEGIN id="DBX.XV2.DAMAGETESTS.020" intent="Read a spreadsheet cell honestly: the first figure it gives, and the grade band that figure falls in" kind="logic" tags="xv2,catalog,damage,tests"
/** The first number in a cell. "3000-7417*" is 3000, "1500x4" is 1500, "150/hit" is 150; a cell with no number is null. */
export const firstFigure=(cell:string):number|null=>{const m=/\d+/.exec(cell);return m?Number(m[0]):null;};
export const burstBand=(damage:number):{grade:number;band:string}=>{const i=BANDS.findIndex(([edge])=>damage<edge);return {grade:i+1,band:BANDS[i][1]};};
/** A cost cell that is one plain number, in points; a range or "All" is not a single cost. */
const plainCost=(cell:string):number|null=>/^\d+$/.test(cell)?Number(cell):null;
// MDV_BLOCK:END id="DBX.XV2.DAMAGETESTS.020" kind="logic" tags="xv2,catalog,damage,tests"
// MDV_BLOCK:BEGIN id="DBX.XV2.DAMAGETESTS.030" intent="Find the measured row for a skill by its slot and name" kind="logic" tags="xv2,catalog,damage,tests"
export function indexDamageTests(file:File):Map<string,DamageTest>{
 const index=new Map<string,DamageTest>();
 for(const [kind,slot,name,listed,damage,cost,range,speed,hold,notes] of file.rows){
  const key=slot+"|"+nameKey(name);
  if(index.has(key))throw new Error("damage-tests.json lists "+name+" twice in the "+slot+" slot");
  index.set(key,{kind,slot,name,listed,damage,cost,range,speed,hold,notes,source:file.sources[kind]} as DamageTest);
 }
 return index;
}
const FILE=data as unknown as File;
export const XV2_DAMAGE_TESTS=indexDamageTests(FILE);
export const damageTestFor=(option:{slot_family?:string;name:string},index:ReadonlyMap<string,DamageTest>=XV2_DAMAGE_TESTS):DamageTest|undefined=>
 option.slot_family?index.get(option.slot_family+"|"+nameKey(option.name)):undefined;
// MDV_BLOCK:END id="DBX.XV2.DAMAGETESTS.030" kind="logic" tags="xv2,catalog,damage,tests"
// MDV_BLOCK:BEGIN id="DBX.XV2.DAMAGETESTS.040" intent="Grade burst damage from the measurement and fill a cost the wiki left unknown, leaving everything else as recorded" kind="logic" tags="xv2,catalog,damage,tests,grades"
function measuredGrade(test:DamageTest,version:string):Grade|null{
 const damage=firstFigure(test.damage);
 if(damage===null)return null;
 const {grade,band}=burstBand(damage);
 const how=test.damage===String(damage)?"":" (listed as \""+test.damage+"\"; graded on the first figure)";
 const paid=test.cost!==""&&plainCost(test.cost)===null?" The test lists its cost as \""+test.cost+"\".":"";
 // A figure reached by spending a whole gauge is not what one base-cost use delivers: pass the tester's own caveat on.
 const caveat=/tested with/i.test(test.notes)?" The tester notes: \""+test.notes+"\"":"";
 const evidence:Evidence={status:"model",verification:"derived",source_keys:[test.source],version,notes:"MODEL grade from the measured damage; see docs/ingest/catalog/GRADING.md."};
 return {status:"known",value:grade,evidence,reason:(damage===0?"Measured 0 damage in the community damage test: it deals none":"Measured "+damage.toLocaleString("en-US")+" damage in the community damage test")+how+". "+band+paid+caveat};
}
function withMeasurement(option:Option,test:DamageTest,version:string):Option{
 const grade=measuredGrade(test,version),points=plainCost(test.cost);
 const costs=option.cost_schedule?.map(c=>c.amount.status==="unknown"&&points!==null
  ?{...c,amount:{...c.amount,status:"known" as const,value:points/100,evidence:{status:"game" as const,verification:"observed",source_keys:[test.source],version,notes:"The cost the community damage test lists, in points; 100 is one bar."}}}:c);
 const filled=!!costs&&costs.some((c,i)=>c!==option.cost_schedule![i]);
 return {...option,
  tactical_grades:grade?{...option.tactical_grades,burst_damage:grade}:option.tactical_grades,
  ...(costs?{cost_schedule:costs}:{}),
  catalog_coverage:filled?{...option.catalog_coverage,costs:"complete"}:option.catalog_coverage};
}
export function withDamageTests(options:readonly Option[],index:ReadonlyMap<string,DamageTest>=XV2_DAMAGE_TESTS,version:string=FILE.version):Option[]{
 return options.map(option=>{const test=damageTestFor(option,index);return test?withMeasurement(option,test,version):option;});
}
// MDV_BLOCK:END id="DBX.XV2.DAMAGETESTS.040" kind="logic" tags="xv2,catalog,damage,tests,grades"
