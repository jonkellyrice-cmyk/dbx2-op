/**
 * The Xenoverse 2 adapter: the one object the generic engine and UI see. It is built from a catalog,
 * so the same code runs the real catalog (docs/ingest/catalog/catalog.json) and the bundle's
 * synthetic test fixtures. Goals, slots, rules, scoring and presets come from the profile.
 */
import {softCap,type Benchmarks,type Blocker,type Build,type GoalInfo,type OptimizationAdapter,type OptionInfo,type Rating} from "../../kernel/optimization/contract";
import {XV2_BLOCKERS,XV2_GOALS,XV2_METRICS,XV2_PEERS,XV2_PRESETS,XV2_SCORING,type Xv2Goal} from "./profile";
import {familyOf,type Catalog,type Option} from "./records";
import {XV2_CONTEXT,contextValue,damageFocus} from "./context";
import {XV2_SPREADS,type Spread} from "./spreads";
import {XV2_ENGINE_SLOTS,legalOptionsFor,validateBuild,type Lookup} from "./rules";
import {rateOption,relationsBetween} from "./scoring";
import {conditionCuts,focusCuts,type Focus} from "./conditions";
import {acquisitionSummary} from "./acquisition";
import {NO_STAT_CONTEXT,statContext,statFacts,type StatContext} from "./derived";
import {describeMechanics,mechanicsGrades,mechanicsOf,windupShare} from "./mechanics";
// MDV_BLOCK:BEGIN id="DBX.XV2.ADAPTER.010" intent="Give each goal the color and plain-language voice the report uses, next to the bundle's own wording" kind="config" tags="xv2,adapter,goals"
/** `plays` finishes the sentence "A build that ..."; MODEL wording for the report, not a game claim. */
const VOICE:Record<Xv2Goal,{color:string;plays:string}>={
 burst_damage:{color:"#b3261e",plays:"punishes openings hard"},
 sustained_damage:{color:"#c4561b",plays:"keeps damage flowing"},
 ki_economy:{color:"#1f6f9a",plays:"rarely runs out of Ki"},
 stamina_safety:{color:"#2e7d4f",plays:"keeps its escapes ready"},
 control:{color:"#6a3d9a",plays:"takes away the enemy's turn"},
 mobility:{color:"#00838f",plays:"gets where it needs to be"},
 crowd_handling:{color:"#8d6e00",plays:"handles groups well"},
 survivability:{color:"#3d4f9a",plays:"stays standing"},
};
export const XV2_GOAL_INFO:readonly GoalInfo<Xv2Goal>[]=XV2_GOALS.map(g=>({id:g.id,label:g.label,color:VOICE[g.id].color,plays:VOICE[g.id].plays,gapAdvice:g.gap_advice}));
// MDV_BLOCK:END id="DBX.XV2.ADAPTER.010" kind="config" tags="xv2,adapter,goals"
// MDV_BLOCK:BEGIN id="DBX.XV2.ADAPTER.020" intent="Check each preset's hard requirements only when the player says the scenario has them" kind="logic" tags="xv2,adapter,blockers"
function blockersFor(pick:(build:Build)=>Option[]):Blocker[]{
 const meta=(id:string)=>XV2_BLOCKERS.find(b=>b.id===id)!;
 const hasTag=(build:Build,tags:readonly string[])=>pick(build).some(o=>(o.role_tags??[]).some(t=>tags.includes(t.tag)&&t.evidence.status!=="verify"));
 return [
  // Not required: passes. Required against a documented boss: met only by an evidenced armor answer. Undocumented boss: can't tell.
  {id:"B-ARMOR",label:"Answer to boss Super Armor",message:meta("B-ARMOR").message,test:b=>{const v=contextValue(b,"armor_answer");return !v?true:v==="required_unknown"?null:hasTag(b,["armor_answer"]);}},
  {id:"B-ESCORT",label:"Support for the escort",message:meta("B-ESCORT").message,test:b=>!contextValue(b,"escort_heal")?true:hasTag(b,["heal","revive","damage_mitigation"])},
  // Needs a measured damage figure, which no build has yet: can't tell.
  {id:"B-RAID-DAMAGE",label:"Raid damage floor",message:meta("B-RAID-DAMAGE").message,test:b=>!contextValue(b,"raid_damage_floor")?true:null},
 ];
}
// MDV_BLOCK:END id="DBX.XV2.ADAPTER.020" kind="logic" tags="xv2,adapter,blockers"
// MDV_BLOCK:BEGIN id="DBX.XV2.ADAPTER.030" intent="Measure a loadout on the bundle's catalog-computable figures; anything that needs play-testing stays unmeasured" kind="logic" tags="xv2,adapter,benchmarks"
function benchmarksFor(pick:(build:Build)=>Option[],option:(id:string)=>Option|undefined):Benchmarks{
 const flag=(o:Option,k:string)=>o.flags?.[k]?.status==="known"&&o.flags[k].value===true;
 const upfront=(o:Option,resource:string)=>{const c=(o.cost_schedule??[]).filter(x=>x.resource===resource&&x.phase==="activation");return c.some(x=>x.amount.status!=="known")?null:c.reduce((n,x)=>n+(x.amount.value??0),0);};
 return {
  title:"How it compares to the reference builds",
  caption:"Reference builds from the bundle's benchmark plan. None has been measured yet, so they are left out of every chart rather than ranked last.",
  metrics:XV2_METRICS.map(m=>({id:m.id,label:m.label,unit:m.unit.replace(/_/g," ")})),
  peers:XV2_PEERS.map(p=>({name:p.id.replace(/_/g," "),values:p.metrics})),
  measure(build){
   const supers=["super_1","super_2","super_3","super_4"].map(s=>build.picks[s]).filter(Boolean).map(id=>option(id)).filter((o):o is Option=>!!o);
   const kis=supers.map(o=>upfront(o,"ki"));const evasive=option(build.picks.evasive??"");
   const all=pick(build);
   const values:Record<string,number|null>=Object.fromEntries(XV2_METRICS.map(m=>[m.id,null]));
   values.loadout_ki=supers.length&&kis.every(v=>v!==null)?kis.reduce((n:number,v)=>n+(v??0),0):null;
   values.evasive_stamina_cost=evasive?upfront(evasive,"stamina"):null;
   values.break_tool_count=all.length?all.filter(o=>flag(o,"stamina_break")||flag(o,"guard_break")).length:null;
   values.aoe_tool_count=all.length?all.filter(o=>flag(o,"aoe")).length:null;
   return values;
  },
 };
}
// MDV_BLOCK:END id="DBX.XV2.ADAPTER.030" kind="logic" tags="xv2,adapter,benchmarks"
/**
 * MODEL choices, not game facts; tune against real builds. A loadout holds four Supers and two
 * Ultimates that are used together, so the second, third and fourth best option on a goal count for
 * much more than the engine's default: depth in the goal you care about is worth building for. The
 * curve (see softCap) is set so a goal covered that deeply lands near 90 and one good option near 55.
 */
export const XV2_DEPTH={weights:[1,0.6,0.4,0.25] as readonly number[],tail:0.15};
export const XV2_COVERAGE_CURVE=softCap(120);
// MDV_BLOCK:BEGIN id="DBX.XV2.ADAPTER.040" intent="Plug a Xenoverse 2 catalog into the generic engine through the adapter seam" kind="module" tags="xv2,adapter"
/**
 * Scale a Strike or Ki Blast skill's damage scores by how close the character's rating for that kind
 * is to the best possible. The cut is its own contribution, so the reason shows beside the score.
 */
const DAMAGE_GOALS:readonly Xv2Goal[]=["burst_damage","sustained_damage"];
function withDamageShare(o:Option,r:Rating<Xv2Goal>,ctx:StatContext):Rating<Xv2Goal>{
 const kind=(o as {classification?:string}).classification;
 if(!ctx.damageShare||(kind!=="strike"&&kind!=="ki_blast"))return r;
 const share=ctx.damageShare[kind],scores={...r.scores},contributions=[...r.contributions];
 for(const g of DAMAGE_GOALS){
  if(r.unknown?.includes(g)||!r.scores[g])continue;
  scores[g]=Math.round(r.scores[g]*share*10)/10;
  contributions.push({goal:g,value:Math.round((scores[g]-r.scores[g])*10)/10,reason:"Your "+(kind==="strike"?"Strike":"Ki Blast")+" Super damage is "+Math.round(share*100)+"% of the best any character could have (race, body type, points and QQ Bang)",evidence:"heuristic"});
 }
 return {...r,scores,contributions};
}
/**
 * Count less of a slow move's damage. The windup is the community damage tests' cast-speed class;
 * a move with no measured cast speed is left as it was. The cut is its own contribution.
 */
function withWindup(o:Option,r:Rating<Xv2Goal>):Rating<Xv2Goal>{
 const cut=familyOf(o.id)==="skill"?windupShare(mechanicsOf(o)):null;
 if(!cut)return r;
 const scores={...r.scores},contributions=[...r.contributions];
 for(const g of DAMAGE_GOALS){
  if(r.unknown?.includes(g)||!r.scores[g])continue;
  scores[g]=Math.round(r.scores[g]*cut.share*10)/10;
  contributions.push({goal:g,value:Math.round((scores[g]-r.scores[g])*10)/10,reason:cut.reason,evidence:"heuristic"});
 }
 return {...r,scores,contributions};
}
/**
 * Let a move's recorded mechanics count on the goals they serve. A goal with no grade becomes known
 * at the mechanics' grade; a goal already graded lower is raised to it; a higher grade is kept.
 * The change is its own contribution, so the reason shows beside the score.
 */
function withMechanicsGoals(o:Option,r:Rating<Xv2Goal>):Rating<Xv2Goal>{
 const grades=familyOf(o.id)==="skill"?mechanicsGrades(mechanicsOf(o)):[];
 if(!grades.length)return r;
 const scores={...r.scores},contributions=[...r.contributions];let unknown=r.unknown?[...r.unknown]:[];
 for(const {goal,grade,reason} of grades){
  const was=unknown.includes(goal)?null:r.scores[goal],now=20*grade;
  if(was!==null&&was>=now)continue;
  scores[goal]=now;unknown=unknown.filter(g=>g!==goal);
  contributions.push({goal,value:Math.round((now-(was??0))*10)/10,reason:reason+(was===null?"":"; raised from "+was),evidence:"heuristic"});
 }
 return unknown.length?{scores,contributions,unknown}:{scores,contributions};
}
/**
 * Apply what the rest of the loadout does to this option: an unmet Super Soul condition, a boost to a
 * kind of skill the build lacks, sealed skills; and drop damage of a kind the player is not building
 * for. Each cut is its own contribution with its reason.
 */
function withConditions(o:Option,r:Rating<Xv2Goal>,others:readonly Option[],focus:Focus):Rating<Xv2Goal>{
 const cuts=[...focusCuts(o,focus),...conditionCuts(o,others)];
 if(!cuts.length)return r;
 const scores={...r.scores},contributions=[...r.contributions];
 for(const {goal,share,reason} of cuts){
  if(r.unknown?.includes(goal)||!scores[goal])continue;
  const now=Math.round(scores[goal]*share*10)/10;
  contributions.push({goal,value:Math.round((now-scores[goal])*10)/10,reason,evidence:"rule-derived"});scores[goal]=now;
 }
 return {...r,scores,contributions};
}
const spreadRating=(s:Spread):Rating<Xv2Goal>=>({scores:Object.fromEntries(XV2_GOALS.map(g=>[g.id,0])) as Rating<Xv2Goal>["scores"],contributions:[],unknown:XV2_GOALS.map(g=>g.id)});
export function createXv2Adapter(catalog:Catalog,options:{id?:string;title?:string;intro?:string;owned?:(option:Option)=>boolean}={}):OptimizationAdapter<Xv2Goal>{
 const byId=new Map(catalog.options.map(o=>[o.id,o]));
 const spreads=new Map(XV2_SPREADS.map(s=>[s.id,s]));
 const lookup:Lookup={option:id=>byId.get(id),spread:id=>spreads.get(id),owned:options.owned};
 const info:OptionInfo[]=[
  ...catalog.options.map(o=>({id:o.id,name:o.name,summary:[acquisitionSummary(o),o.description,familyOf(o.id)==="skill"?describeMechanics(mechanicsOf(o)).trim():""].filter(Boolean).join(" ")||familyOf(o.id)+" option",level:1,tags:(o.role_tags??[]).map(t=>t.tag)})),
  ...XV2_SPREADS.map(s=>({id:s.id,name:s.name,summary:s.summary,level:1,tags:["spread"]})),
 ];
 const ratings=new Map<string,Rating<Xv2Goal>>();
 // An option's own rating depends on the build only through the character's stats, so that is the cache key.
 const rate=(id:string,ctx:StatContext=NO_STAT_CONTEXT):Rating<Xv2Goal>=>{
  const key=id+"|"+ctx.key;let r=ratings.get(key);
  if(!r){const o=byId.get(id);const s=spreads.get(id);r=o?withMechanicsGoals(o,withWindup(o,withDamageShare(o,rateOption(o,ctx),ctx))):s?spreadRating(s):{scores:Object.fromEntries(XV2_GOALS.map(g=>[g.id,0])) as Rating<Xv2Goal>["scores"],contributions:[],unknown:XV2_GOALS.map(g=>g.id)};ratings.set(key,r);}
  return r;
 };
 const pick=(build:Build)=>Object.values(build.picks).map(id=>byId.get(id)).filter((o):o is Option=>!!o);
 return {
  id:options.id??"dbx2-op",
  title:options.title??"DBX2-op: Xenoverse 2 loadout optimizer",
  intro:options.intro,
  goals:XV2_GOAL_INFO,
  maxLevel:1,
  options:info,
  presets:XV2_PRESETS.map(p=>({id:p.id,name:p.name,note:p.note,ranks:p.ranks,blockers:p.blockers})),
  slots:()=>[...XV2_ENGINE_SLOTS],
  legalOptions:(build,slot)=>legalOptionsFor(build,slot,info,lookup),
  validate:build=>validateBuild(build,lookup),
  // The option's own rating is cached; what the rest of this loadout does to it is worked out per build.
  rate:(id,build)=>{const r=rate(id,statContext(build,byId.get(build.picks.qq_bang??"")));const o=byId.get(id);return o?withConditions(o,r,pick(build).filter(x=>x.id!==id),damageFocus(build)):r;},
  relations:(a,b)=>relationsBetween(byId.get(a),byId.get(b),catalog.relations),
  benchmarks:benchmarksFor(pick,id=>byId.get(id)),
  blockers:blockersFor(pick),
  context:XV2_CONTEXT,
  facts:build=>statFacts(build,byId.get(build.picks.qq_bang??"")),
  rankWeights:XV2_SCORING.rankWeights,
  // A loadout has ten option slots and most serve several goals, so stacked scores pass 100 easily; the curve keeps strong builds apart.
  coverageCurve:XV2_COVERAGE_CURVE,
  depth:XV2_DEPTH,
  report:{theme:"clean",running:"DBX2-op · Xenoverse 2 loadout optimizer"},
 };
}
// MDV_BLOCK:END id="DBX.XV2.ADAPTER.040" kind="module" tags="xv2,adapter"
