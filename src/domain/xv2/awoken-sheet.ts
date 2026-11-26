/**
 * The Awoken sheet (docs/ingest/catalog/awoken-sheet.json): one short row per Awoken Skill, holding
 * only what differs from one to the next. This module expands each row into the full bundle record
 * (awoken.schema.json) with its evidence envelopes. The expanded records are validated like any
 * other by tests/xv2-bundle.test.ts.
 *
 * A row states what its wiki page says and nothing more: a cost, drain or effect size the page
 * doesn't give stays unknown. Grades follow docs/ingest/catalog/GRADING.md and are MODEL judgments.
 */
import type {Option} from "./records";
import type {SheetGet,SheetGoal} from "./skill-sheet";
// MDV_BLOCK:BEGIN id="DBX.XV2.AWOKENSHEET.010" intent="Name what one row of the Awoken sheet may say" kind="types" tags="xv2,catalog,awoken,sheet"
/** One stat change while transformed: [stage, property, fraction, note]. A stage is one of the row's stages. */
export type AwokenEffect=readonly [stage:string,property:string,fraction:number,note?:string];
export type AwokenRow={
 name:string;
 /** The wiki page the row was read from; its key in sources.json. */
 key:string;
 /** Ki needed to transform, in points as the wiki gives it (100 is one bar); null when the page doesn't say. */
 ki:number|null;ki_note?:string;
 description:string|null;
 /** Set only when the source says the skill is locked to some character types; otherwise every type can use it. */
 only?:readonly string[];
 /** The stages you can transform into, lowest first. */
 stages:readonly string[];
 effects?:readonly AwokenEffect[];
 /** What it drains while transformed: [resource, the wiki's rate or null when not given, note]. */
 drain?:readonly [resource:"ki"|"stamina"|"health",rate:number|null,note:string];
 /** Actions it adds or replaces while transformed: [action, add|replace|remove, note]. */
 actions?:readonly (readonly [string,"add"|"replace"|"remove",string])[];
 tags?:readonly string[];get:SheetGet;notes:string;
 grades:Partial<Record<SheetGoal,readonly [number,string]>>;
};
export type AwokenSheet={about:string;version:string;rows:readonly AwokenRow[]};
// MDV_BLOCK:END id="DBX.XV2.AWOKENSHEET.010" kind="types" tags="xv2,catalog,awoken,sheet"
// MDV_BLOCK:BEGIN id="DBX.XV2.AWOKENSHEET.020" intent="Expand one Awoken row into the full bundle record the rest of the optimizer reads" kind="logic" tags="xv2,catalog,awoken,sheet"
const ALL=["male_saiyan","female_saiyan","male_earthling","female_earthling","male_majin","female_majin","namekian","frieza_race"];
const GOALS:readonly SheetGoal[]=["burst_damage","sustained_damage","ki_economy","stamina_safety","control","mobility","crowd_handling","survivability"];
const slug=(name:string):string=>name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function expandAwoken(row:AwokenRow,version:string):Option{
 const K=[row.key];
 const ev=(notes:string|null=null,verification="documented",status="game",keys:readonly string[]=K)=>({status,verification,source_keys:[...keys],version,notes});
 const unknownEv=(notes:string)=>ev(notes,"unknown","verify");
 const num=(value:number,unit:string,notes:string|null=null,keys:readonly string[]=K)=>({status:"known",value,unit,evidence:ev(notes,"documented","game",keys)});
 const unknownNum=(unit:string,notes:string)=>({status:"unknown",value:null,unit,evidence:unknownEv(notes)});
 const notApplicable=(unit:string,notes:string)=>({status:"not_applicable",value:null,unit,evidence:ev(notes)});
 const g=row.get;
 const [source,source_id,routeNotes]:[string,string|null,string|null]="instructor" in g?["instructor",g.instructor,null]
  :"pq" in g?["pq_drop",g.pq,"A Parallel Quest reward; the drop chance isn't recorded."]
  :"wish" in g?["shenron_wish",g.wish,"A Shenron wish."]
  :"other" in g?["other",null,g.other]
  :"unknown" in g?["unknown",null,g.unknown]
  :["other",null,"See the source."];
 const acquisition=[{spec_ref:"§11.2",version,evidence:source==="unknown"?unknownEv("Source not recorded."):ev(),source,source_id,prerequisites:[],price:[],
  drop_probability:source==="pq_drop"?unknownNum("probability","The drop chance isn't recorded."):notApplicable("probability","Not a drop."),
  rotation:{status:"unknown",schedule:null},repeatability:source==="pq_drop"?"repeatable":"one_time",notes:routeNotes}];
 const effects=(row.effects??[]).map(([stage,property,fraction,note])=>({id:"effect."+slug(row.name)+"-"+slug(stage)+"-"+property.replace(/_/g,"-"),spec_ref:"§11.2",version,evidence:ev(),
  trigger:{event:"on_transform",predicates:[],when:"while_true",notes:"While in the "+stage+" stage."},targets:["self"],operation:"multiply",property,
  magnitude:num(fraction,"fraction"),duration:{kind:"condition_held",quantity:notApplicable("seconds","Lasts while transformed.")},
  activation_limit:{kind:"unlimited",count:notApplicable("count","Applies throughout.")},stacking:"no_stack",termination_events:["on_deactivate"],notes:note??null}));
 const upkeep=row.drain?[{resource:row.drain[0],phase:"upkeep",
  amount:row.drain[1]!==null?num(row.drain[1],"wiki_drain_percent","The wiki's drain rate; what it is a percent of isn't stated."):unknownNum("wiki_drain_percent","The source doesn't give a rate."),condition:row.drain[2]}]:[];
 const grades=Object.fromEntries(GOALS.map(goal=>{const given=row.grades[goal];return [goal,given
  ?{status:"known",value:given[0],evidence:ev("MODEL grade from the recorded mechanics; see docs/ingest/catalog/GRADING.md.","derived","model"),reason:given[1]}
  :{status:"unknown",value:null,evidence:unknownEv("Not graded yet."),reason:"Not graded: nothing recorded about this option bears on this goal yet."}];}));
 const record={id:"awoken."+slug(row.name),name:row.name,spec_ref:"§7.3",version,evidence:ev(),
  eligibility:{archetypes:{status:"known",values:row.only??ALL},required_entitlements:[],required_flags:[],mode_allowlist:null,notes:row.only?"Locked to these character types, per its wiki page.":"Usable by every character type, per its wiki page."},
  activation_costs:[{resource:"ki",phase:"activation",amount:row.ki!==null?num(row.ki/100,"ki_bars","The wiki gives Ki in points; 100 Ki is one bar (owner, in game).",[...K,"OWNER-OBSERVATION"]):unknownNum("ki_bars","The source doesn't give the Ki needed."),condition:row.ki_note??null}],
  upkeep_costs:upkeep,action_overrides:(row.actions??[]).map(([action_id,operation,notes])=>({action_id,operation,notes})),termination_events:[],effects,
  role_tags:(row.tags??[]).map(tag=>({tag,evidence:ev()})),acquisition_options:acquisition,state_stages:[...row.stages],
  notes:(row.description!==null?"In-game description: \""+row.description+"\" ":"The source doesn't quote the in-game description. ")+row.notes,
  tactical_grades:grades,catalog_coverage:{role_tags:"partial",effects:"partial",flags:"not_applicable",costs:"partial"}};
 return record as unknown as Option;
}
export function expandAwokenSheet(sheet:AwokenSheet):Option[]{
 const out=sheet.rows.map(r=>expandAwoken(r,sheet.version));
 if(new Set(out.map(o=>o.id)).size!==out.length)throw new Error("The Awoken sheet has two rows that make the same id");
 return out;
}
// MDV_BLOCK:END id="DBX.XV2.AWOKENSHEET.020" kind="logic" tags="xv2,catalog,awoken,sheet"
