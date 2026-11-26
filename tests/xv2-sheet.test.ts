import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {XV2_CATALOG} from "../src/domain/xv2/catalog";
import {XV2_OWNED} from "../src/domain/xv2/owned";
import {expandSkillSheet,sheetSlug,type SkillSheet} from "../src/domain/xv2/skill-sheet";
// MDV_BLOCK:BEGIN id="DBX.TEST.SHEET.010" intent="Keep the skill sheet honest: sourced rows, no clash with hand-written records, and unknowns that stay unknown" kind="logic" tags="xv2,tests,catalog,sheet"
const CATALOG=join(process.cwd(),"docs","ingest","catalog");
const read=(name:string)=>JSON.parse(readFileSync(join(CATALOG,name),"utf8"));
const SHEET=read("skill-sheet.json") as SkillSheet;
const row=(over:Partial<SkillSheet["rows"][number]>):SkillSheet=>({about:"",version:"v",rows:[{name:"Test Beam",slot:"super",kind:"ki_blast",key:"WIKI-TEST-BEAM",ki:100,description:"d",get:{shop:true},grades:{},...over}]});
test("every sheet row names a recorded source and a skill that isn't already hand-written", ()=>{
 const sources=new Set((read("sources.json").sources as {key:string}[]).map(s=>s.key));
 const written=new Set((read("catalog.json").options as {id:string}[]).map(o=>o.id));
 for(const r of SHEET.rows){
  const base="WIKI-"+sheetSlug(r.name).toUpperCase();
  // A Super and an Ultimate can share a name but not a wiki page: the second one adds its slot to the key.
  assert.ok(r.key===base||r.key===base+"-"+r.slot.toUpperCase(),r.name+": key "+r.key);
  assert.ok(sources.has(r.key),r.name+": "+r.key+" is not in sources.json");
  assert.ok(!written.has("skill."+r.slot+"."+sheetSlug(r.name)),r.name+" is already in catalog.json");
 }
 assert.equal(XV2_CATALOG.options.length,written.size+SHEET.rows.length,"every row reaches the catalog the app uses");
});
test("the Ki Blast Supers on the sheet are ones the owner has", ()=>{
 const owned=new Set(XV2_OWNED.skills.super.ki_blast.map(sheetSlug));
 for(const r of SHEET.rows)if(r.slot==="super"&&r.kind==="ki_blast")assert.ok(owned.has(sheetSlug(r.name)),r.name);
});
test("the Ultimates on the sheet are ones the owner has, and a missing description is said, not invented", ()=>{
 const owned=new Set(Object.values(XV2_OWNED.skills.ultimate as Record<string,readonly string[]>).flat().map(sheetSlug));
 for(const r of SHEET.rows)if(r.slot==="ultimate")assert.ok(owned.has(sheetSlug(r.name)),r.name);
 const [o]=expandSkillSheet(row({description:null})) as unknown as [Record<string,any>];
 assert.match(JSON.stringify(o),/doesn't quote the in-game description/);assert.doesNotMatch(JSON.stringify(o),/In-game description/);
});
test("a row says only what it states: an unstated flag, cost, damage figure or source stays unknown", ()=>{
 const [o]=expandSkillSheet(row({ki:null,flags:["hit"],get:{unknown:"The page doesn't say."}})) as unknown as [Record<string,any>];
 assert.equal(o.id,"skill.super.test-beam");
 assert.deepEqual([o.flags.hit.value,o.flags.tracking.status,o.flags.tracking.value],[true,"unknown",null],"never false by default");
 assert.equal(o.cost_schedule[0].amount.status,"unknown");assert.equal(o.catalog_coverage.costs,"unknown");
 assert.deepEqual(o.effect_clauses,[]);
 assert.equal(o.acquisition_options[0].source,"unknown");
 for(const g of Object.values(o.tactical_grades) as {status:string}[])assert.equal(g.status,"unknown");
});
test("Ki is recorded in bars, grades as MODEL judgments, and two rows can't make the same id", ()=>{
 const [o]=expandSkillSheet(row({ki:200,damage:{percent:30,note:"n"},grades:{burst_damage:[4,"Wiki damage 30% per use."]}})) as unknown as [Record<string,any>];
 assert.deepEqual([o.cost_schedule[0].amount.value,o.cost_schedule[0].amount.unit],[2,"ki_bars"]);
 assert.equal(o.effect_clauses[0].magnitude.value,30);
 assert.deepEqual([o.tactical_grades.burst_damage.value,o.tactical_grades.burst_damage.evidence.status],[4,"model"]);
 const two=row({});assert.throws(()=>expandSkillSheet({...two,rows:[...two.rows,...two.rows]}),/same id/);
});
test("a row can name a Shenron wish, or describe a source that fits no other kind", ()=>{
 const [o]=expandSkillSheet(row({get:{wish:"I want another Super Attack!"}})) as unknown as [Record<string,any>];
 assert.deepEqual([o.acquisition_options[0].source,o.acquisition_options[0].source_id],["shenron_wish","I want another Super Attack!"]);
 const [x]=expandSkillSheet(row({get:{other:"A tournament reward."}})) as unknown as [Record<string,any>];
 assert.deepEqual([x.acquisition_options[0].source,x.acquisition_options[0].notes],["other","A tournament reward."]);
});
test("a row can name the TP Medal Shop or an Expert Mission as its source", ()=>{
 const [tp,ex]=expandSkillSheet({about:"",version:"v",rows:[{...row({get:{tp:true}}).rows[0]},{...row({get:{expert:"5 (\"The Galactic Tyrant\")"}}).rows[0],name:"Test Wave",key:"WIKI-TEST-WAVE"}]}) as unknown as Record<string,any>[];
 assert.deepEqual([tp.acquisition_options[0].source,tp.acquisition_options[0].price[0].currency,tp.acquisition_options[0].price[0].amount.status],["tp_medal_shop","tp_medal","unknown"]);
 assert.deepEqual([ex.acquisition_options[0].source,ex.acquisition_options[0].source_id,ex.acquisition_options[0].drop_probability.status],["expert_mission_drop","5 (\"The Galactic Tyrant\")","unknown"]);
});
// MDV_BLOCK:END id="DBX.TEST.SHEET.010" kind="logic" tags="xv2,tests,catalog,sheet"
