/**
 * The Super Soul sheet (docs/ingest/catalog/soul-sheet.json): one short row per Super Soul, holding
 * its conditions and effect lines as the wiki's list gives them. This module expands each row into
 * the full bundle record (super-soul.schema.json) with its evidence envelopes. The expanded records
 * are validated like any other by tests/xv2-bundle.test.ts.
 *
 * A line's size or duration is recorded only where the source states it; anything else stays
 * unknown. Grades follow docs/ingest/catalog/GRADING.md and are MODEL judgments.
 */
import type {Option} from "./records";
import type {SheetGoal} from "./skill-sheet";
// MDV_BLOCK:BEGIN id="DBX.XV2.SOULSHEET.010" intent="Name what one row of the Super Soul sheet may say" kind="types" tags="xv2,catalog,soul,sheet"
/** One condition and the effect lines under it. A line reads "effect | size | duration", the last two only where given. */
export type SoulEffect=readonly [condition:string,lines:readonly string[]];
export type SoulRow={
 name:string;
 /** The source the row was read from; its key in sources.json. */
 key:string;
 /** The soul's number in the wiki's list, and its level (stars) there; null when the source doesn't give one. */
 n:number|null;stars:number|null;character:string|null;
 effects:readonly SoulEffect[];
 ki_blast:string|null;limit_burst:string;
 /** Where to get it, as the source words it. */
 get:string;mix?:string;notes?:string;
 /** The in-game text, where an owner screenshot showed it. */
 text?:string;
 /** The catalog Awoken or skill a condition depends on; any one of the listed ids satisfies it. */
 needs?:{awoken?:readonly string[];skill?:readonly string[]};
 grades:Partial<Record<SheetGoal,readonly [number,string]>>;
};
export type SoulSheet={about:string;version:string;rows:readonly SoulRow[]};
// MDV_BLOCK:END id="DBX.XV2.SOULSHEET.010" kind="types" tags="xv2,catalog,soul,sheet"
// MDV_BLOCK:BEGIN id="DBX.XV2.SOULSHEET.020" intent="Read a condition and an effect line the way the wiki's list writes them" kind="logic" tags="xv2,catalog,soul,sheet,parse"
const ALL=["male_saiyan","female_saiyan","male_earthling","female_earthling","male_majin","female_majin","namekian","frieza_race"];
const GOALS:readonly SheetGoal[]=["burst_damage","sustained_damage","ki_economy","stamina_safety","control","mobility","crowd_handling","survivability"];
export const soulSlug=(name:string):string=>name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
/** The trigger event the bundle's vocabulary has for a condition; "activation" when none fits better. */
export function soulEvent(condition:string):{event:string;when:"while_true"|"on_event"}{
 const c=condition.toLowerCase();
 if(c==="always")return {event:"battle_start",when:"while_true"};
 if(/battle (begins|starts)/.test(c))return {event:/seconds after|short time after/.test(c)?"on_timer":"battle_start",when:"on_event"};
 if(/battle ends/.test(c))return {event:"on_end_of_battle",when:"on_event"};
 if(/reviv|resurrect/.test(c))return {event:"on_revive",when:"on_event"};
 if(/ko/.test(c))return {event:"on_ko",when:"on_event"};
 if(/just guard/.test(c))return {event:"on_perfect_guard",when:"on_event"};
 if(/guard is broken/.test(c))return {event:"on_stamina_break",when:"on_event"};
 if(/hits/.test(c))return {event:"on_hit",when:"on_event"};
 if(/^once only,? when (user )?(hp|health)/.test(c))return {event:"threshold_cross",when:"on_event"};
 if(/(hp|health|ki|stamina) (is |equals |at )?(below|under|above|maxed|100%|80%)|is maxed out|ki is at/.test(c))return {event:"threshold_held",when:"while_true"};
 if(/^while |awoken skill activated|when using any .* awoken|^no allies/.test(c))return {event:/awoken|while /.test(c)?"on_transform":"battle_start",when:"while_true"};
 return {event:"activation",when:"on_event"};
}
/** Splits "effect | +15% | 10 seconds" into its parts; a size that isn't a plain percent or point count is left as text. */
export function soulLine(line:string):{text:string;fraction:number|null;points:{value:number;unit:string}|null;seconds:number|null}{
 const [text,...rest]=line.split("|").map(s=>s.trim());
 let fraction:number|null=null,points:{value:number;unit:string}|null=null,seconds:number|null=null;
 for(const part of rest){
  const pct=/^([+-]?\d+(?:\.\d+)?)\s*%$/.exec(part),pts=/^([+-]?\d+)\s*(ki|stamina)$/i.exec(part),sec=/^(\d+(?:\.\d+)?)\s*seconds?$/i.exec(part);
  if(pct&&fraction===null)fraction=Number(pct[1])/100;else if(pts&&!points)points={value:Number(pts[1]),unit:pts[2].toLowerCase()+"_points"};else if(sec)seconds=Number(sec[1]);
 }
 return {text,fraction,points,seconds};
}
// MDV_BLOCK:END id="DBX.XV2.SOULSHEET.020" kind="logic" tags="xv2,catalog,soul,sheet,parse"
// MDV_BLOCK:BEGIN id="DBX.XV2.SOULSHEET.030" intent="Expand one Super Soul row into the full bundle record the rest of the optimizer reads" kind="logic" tags="xv2,catalog,soul,sheet"
function acquisitionSource(get:string):string{
 const g=get.toLowerCase();
 return /tp medal/.test(g)?"tp_medal_shop":/item shop/.test(g)?"zeni_shop":/parallel quest/.test(g)?"pq_drop":/mixing shop/.test(g)?"mix_recipe":/raid/.test(g)?"raid_reward":/mentor|initiation/.test(g)?"instructor":/festival|tournament/.test(g)?"event":/not recorded/.test(g)?"unknown":"other";
}
function expandSoul(row:SoulRow,version:string):Option{
 const K=[row.key];
 const ev=(notes:string|null=null,verification="documented",status="game")=>({status,verification,source_keys:[...K],version,notes});
 const unknownEv=(notes:string)=>ev(notes,"unknown","verify");
 const num=(value:number,unit:string,notes:string|null=null)=>({status:"known",value,unit,evidence:ev(notes)});
 const unknownNum=(unit:string,notes:string)=>({status:"unknown",value:null,unit,evidence:unknownEv(notes)});
 const notApplicable=(unit:string,notes:string)=>({status:"not_applicable",value:null,unit,evidence:ev(notes)});
 const slug=soulSlug(row.name);
 const predicates=[...(row.needs?.awoken?[{path:"actor.awoken_id",operator:"in",value:[...row.needs.awoken]}]:[]),...(row.needs?.skill?[{path:"event.skill_id",operator:"in",value:[...row.needs.skill]}]:[])];
 let index=0;
 const clauses=row.effects.flatMap(([condition,lines])=>lines.map(line=>{
  const {text,fraction,points,seconds}=soulLine(line),{event,when}=soulEvent(condition);
  const once=/once only/i.test(condition);
  return {id:"effect."+slug+"-"+(++index),spec_ref:"§11.2",version,evidence:ev(),
   trigger:{event,predicates,when,notes:"["+condition+"]"},targets:[/allies|all members/i.test(text)?"team":/opponent/i.test(text)?"target":"self"],
   operation:fraction!==null?"multiply":points?"restore":"grant_state",property:soulSlug(text).replace(/-/g,"_").slice(0,80),
   magnitude:fraction!==null?num(fraction,"fraction"):points?num(points.value,points.unit):notApplicable("fraction","The source gives no plain figure for this line; see the notes."),
   duration:seconds!==null?{kind:"timed",quantity:num(seconds,"seconds")}:when==="while_true"?{kind:"condition_held",quantity:notApplicable("seconds","Lasts while the condition holds.")}
    :{kind:"unknown",quantity:unknownNum("seconds","How long it lasts isn't recorded.")},
   activation_limit:once?{kind:"once_per_battle",count:num(1,"count")}:{kind:"unlimited",count:notApplicable("count","Not limited.")},
   stacking:/stacks? up to/i.test(line)?"stack":"unknown",termination_events:[],notes:line};
 }));
 const source=acquisitionSource(row.get);
 const acquisition=[{spec_ref:"§11.2",version,evidence:source==="unknown"?unknownEv("Source not recorded."):ev(),source,source_id:source==="pq_drop"?row.get:null,prerequisites:[],price:[],
  drop_probability:source==="pq_drop"||source==="raid_reward"?unknownNum("probability","The drop chance isn't recorded."):notApplicable("probability","Not a drop."),
  rotation:{status:"unknown",schedule:null},repeatability:source==="pq_drop"||source==="raid_reward"?"repeatable":"one_time",notes:row.get+(row.mix?" Mix Shop recipe: "+row.mix:"")}];
 const grades=Object.fromEntries(GOALS.map(goal=>{const given=row.grades[goal];return [goal,given
  ?{status:"known",value:given[0],evidence:ev("MODEL grade from the recorded mechanics; see docs/ingest/catalog/GRADING.md.","derived","model"),reason:given[1]}
  :{status:"unknown",value:null,evidence:unknownEv("Not graded yet."),reason:"Not graded: nothing recorded about this option bears on this goal yet."}];}));
 const said=row.effects.length?row.effects.map(([c,lines])=>"["+c+"] "+lines.join("; ")).join(" "):"The source lists no effect.";
 const record={id:"soul."+slug,name:"\""+row.name+"\"",spec_ref:"§8.1",version,evidence:ev(),
  eligibility:{archetypes:{status:"known",values:ALL},required_entitlements:[],required_flags:[],mode_allowlist:null,notes:"Any race."},
  acquisition_options:acquisition,
  charged_ki_blast:row.ki_blast?{status:"known",value:row.ki_blast,evidence:ev()}:{status:"unknown",value:null,evidence:unknownEv("The source doesn't give the Ki Blast type.")},
  limit_burst:{status:"known",type:row.limit_burst,effects:[],team_scope:{status:"unknown",value:null,evidence:unknownEv("The source doesn't say.")},activation_limit:unknownNum("count","How often it can trigger isn't recorded.")},
  effect_clauses:clauses,
  ...(row.stars!==null?{rarity:num(row.stars,"stars")}:{}),associated_character:row.character,
  description:(row.n!==null?"Super Soul #"+row.n+". ":"")+(row.text?"In-game text: \""+row.text+"\" ":"")+said+(row.notes?" "+row.notes:""),
  tactical_grades:grades,catalog_coverage:{role_tags:"not_applicable",effects:"complete",flags:"not_applicable",costs:"not_applicable"}};
 return record as unknown as Option;
}
export function expandSoulSheet(sheet:SoulSheet):Option[]{
 const out=sheet.rows.map(r=>expandSoul(r,sheet.version));
 if(new Set(out.map(o=>o.id)).size!==out.length)throw new Error("The Super Soul sheet has two rows that make the same id");
 return out;
}
// MDV_BLOCK:END id="DBX.XV2.SOULSHEET.030" kind="logic" tags="xv2,catalog,soul,sheet"
