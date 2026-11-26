/**
 * The skill sheet (docs/ingest/catalog/skill-sheet.json): one short row per Super, Ultimate or Evasive,
 * holding only what differs from skill to skill. This module expands each row into the full bundle
 * record (skill.schema.json) with its evidence envelopes, so a row stays readable and a new skill is a
 * few lines. The expanded records are validated like any other by tests/xv2-bundle.test.ts.
 *
 * A row states what the wiki page says and nothing more: a missing cost, damage figure or source stays
 * unknown in the record. Grades follow docs/ingest/catalog/GRADING.md and are MODEL judgments.
 */
import type {Option} from "./records";
// MDV_BLOCK:BEGIN id="DBX.XV2.SHEET.010" intent="Name what one row of the skill sheet may say" kind="types" tags="xv2,catalog,sheet"
export type SheetGoal="burst_damage"|"sustained_damage"|"ki_economy"|"stamina_safety"|"control"|"mobility"|"crowd_handling"|"survivability";
/** Where to get it: the Skill Shop, an instructor, a Parallel Quest, or not recorded by the source. */
export type SheetGet={shop:true}|{instructor:string}|{pq:string}|{unknown:string};
export type SheetRow={
 name:string;slot:"super"|"ultimate"|"evasive";kind:"strike"|"ki_blast"|"power_up"|"other";
 /** The wiki page the row was read from; its key in sources.json is WIKI- plus the name in capitals. */
 key:string;
 /** Ki used, in points as the wiki gives it (100 is one bar); null when the page doesn't say. */
 ki:number|null;ki_note?:string;
 description:string;
 /** Only flags the source states as true. Everything else is recorded as unknown, never as false. */
 flags?:readonly string[];tags?:readonly string[];
 /** The wiki's damage figure in percent, with what it covers. */
 damage?:{percent:number;note:string};
 get:SheetGet;notes?:string;press?:string;
 grades:Partial<Record<SheetGoal,readonly [number,string]>>;
};
export type SkillSheet={about:string;version:string;rows:readonly SheetRow[]};
// MDV_BLOCK:END id="DBX.XV2.SHEET.010" kind="types" tags="xv2,catalog,sheet"
// MDV_BLOCK:BEGIN id="DBX.XV2.SHEET.020" intent="Build the evidence envelopes every bundle value carries, so rows don't repeat them" kind="logic" tags="xv2,catalog,sheet,evidence"
const ALL=["male_saiyan","female_saiyan","male_earthling","female_earthling","male_majin","female_majin","namekian","frieza_race"];
const GOALS:readonly SheetGoal[]=["burst_damage","sustained_damage","ki_economy","stamina_safety","control","mobility","crowd_handling","survivability"];
const FLAGS=["hit","aoe","guard_break","stamina_break","armor_answer","super_armor","invulnerability","projectile","tracking","reposition","auto_dodge"];
const OWNER="OWNER-OBSERVATION";
const KI_NOTE="The wiki gives Ki used in points; 100 Ki is one bar (owner, in game).";
function envelopes(version:string){
 const ev=(keys:readonly string[],notes:string|null=null,verification="documented",status="game")=>({status,verification,source_keys:[...keys],version,notes});
 const unknownEv=(keys:readonly string[],notes:string)=>ev(keys,notes,"unknown","verify");
 return {ev,unknownEv,
  num:(value:number,unit:string,keys:readonly string[],notes:string|null=null)=>({status:"known",value,unit,evidence:ev(keys,notes)}),
  unknownNum:(unit:string,keys:readonly string[],notes:string)=>({status:"unknown",value:null,unit,evidence:unknownEv(keys,notes)}),
  notApplicable:(unit:string,keys:readonly string[],notes:string)=>({status:"not_applicable",value:null,unit,evidence:ev(keys,notes)}),
  flag:(value:boolean|null,keys:readonly string[])=>value===null?{status:"unknown",value:null,evidence:unknownEv(keys,"The source doesn't say.")}:{status:"known",value,evidence:ev(keys)},
 };
}
export const sheetSlug=(name:string):string=>name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
// MDV_BLOCK:END id="DBX.XV2.SHEET.020" kind="logic" tags="xv2,catalog,sheet,evidence"
// MDV_BLOCK:BEGIN id="DBX.XV2.SHEET.030" intent="Expand one sheet row into the full bundle record the rest of the optimizer reads" kind="logic" tags="xv2,catalog,sheet"
function expandRow(row:SheetRow,version:string):Option{
 const E=envelopes(version),K=[row.key],id="skill."+row.slot+"."+sheetSlug(row.name);
 const route=(source:string,source_id:string|null,o:{prereq?:string[];repeat?:string;notes?:string|null;price?:object[];evidence?:object}={})=>({
  spec_ref:"§11.2",version,evidence:o.evidence??E.ev(K),source,source_id,prerequisites:o.prereq??[],price:o.price??[],
  drop_probability:source==="pq_drop"?E.unknownNum("probability",K,"The drop chance isn't recorded."):E.notApplicable("probability",K,"Not a drop."),
  rotation:{status:"unknown",schedule:null},repeatability:o.repeat??"one_time",notes:o.notes??null});
 const g=row.get;
 const acquisition="shop" in g?[route("zeni_shop","skill_shop",{price:[{currency:"zeni",amount:E.unknownNum("zeni",K,"Price not recorded."),item_id:null}],notes:"Sold in the Skill Shop."})]
  :"instructor" in g?[route("instructor",g.instructor,{prereq:["Train with "+g.instructor]})]
  :"pq" in g?[route("pq_drop",g.pq,{repeat:"repeatable",notes:"A Parallel Quest reward; the drop chance isn't recorded."})]
  :[route("unknown",null,{notes:g.unknown,evidence:E.unknownEv(K,"Source not recorded.")})];
 const effects=row.damage?[{id:"effect."+row.key.toLowerCase().replace("wiki-","")+"-damage",spec_ref:"§11.2",version,evidence:E.ev(K),trigger:{event:"on_hit",predicates:[],when:"on_event",notes:null},targets:["target"],
  operation:"apply_damage",property:"health",magnitude:E.num(row.damage.percent,"wiki_damage_percent",K,"The wiki's damage figure; the baseline it is a percent of isn't stated."),
  duration:{kind:"instant",quantity:E.notApplicable("seconds",K,"Instant.")},activation_limit:{kind:"once_per_activation",count:E.notApplicable("count",K,"Once per use.")},
  stacking:"no_stack",termination_events:[],notes:row.damage.note}]:[];
 const grades=Object.fromEntries(GOALS.map(goal=>{const given=row.grades[goal];return [goal,given
  ?{status:"known",value:given[0],evidence:{status:"model",verification:"derived",source_keys:K,version,notes:"MODEL grade from the recorded mechanics; see docs/ingest/catalog/GRADING.md."},reason:given[1]}
  :{status:"unknown",value:null,evidence:E.unknownEv(K,"Not graded yet."),reason:"Not graded: nothing recorded about this option bears on this goal yet."}];}));
 const record={id,name:row.name[0].toUpperCase()+row.name.slice(1),spec_ref:"§6.2",version,evidence:E.ev(K),slot_family:row.slot,classification:row.kind,
  eligibility:{archetypes:{status:"known",values:ALL},required_entitlements:[],required_flags:[],mode_allowlist:null,notes:"Not race-locked: it isn't on any race's exclusive-skill list on the race pages."},
  cost_schedule:[{resource:"ki",phase:"activation",amount:row.ki!==null?E.num(row.ki/100,"ki_bars",[...K,OWNER],KI_NOTE):E.unknownNum("ki_bars",K,KI_NOTE),condition:row.ki_note??null}],
  role_tags:(row.tags??[]).map(tag=>({tag,evidence:E.ev(K)})),
  flags:Object.fromEntries(FLAGS.map(f=>[f,E.flag(row.flags?.includes(f)?true:null,K)])),
  effect_clauses:effects,acquisition_options:acquisition,
  input_profile:{press_pattern:row.press??"unknown",extra_input_required:E.flag(null,K),notes:null},
  targeting:null,measurement_notes:"In-game description: \""+row.description+"\""+(row.notes?" "+row.notes:""),documentation_only:{animation_id:null,vfx_id:null,sfx_id:null},
  tactical_grades:grades,catalog_coverage:{role_tags:"partial",effects:"partial",flags:"partial",costs:row.ki!==null?"complete":"unknown"}};
 return record as unknown as Option;
}
export function expandSkillSheet(sheet:SkillSheet):Option[]{
 const out=sheet.rows.map(r=>expandRow(r,sheet.version));
 const ids=new Set(out.map(o=>o.id));
 if(ids.size!==out.length)throw new Error("The skill sheet has two rows that make the same id");
 return out;
}
// MDV_BLOCK:END id="DBX.XV2.SHEET.030" kind="logic" tags="xv2,catalog,sheet"
