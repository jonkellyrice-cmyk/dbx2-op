/**
 * The bundle in docs/ingest is the source of truth. These tests fail if the code's copy of the
 * profile drifts from optimizer-profile.yaml, or if any catalog record (production or fixture)
 * doesn't match the bundle's JSON Schemas.
 */
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync,readdirSync} from "node:fs";
import {join} from "node:path";
import {parse} from "yaml";
import Ajv2020 from "ajv/dist/2020";
import {XV2_BLOCKERS,XV2_GOALS,XV2_METRICS,XV2_PEERS,XV2_PRESETS,XV2_RULES,XV2_SCORING,XV2_SLOTS} from "../src/domain/xv2/profile";
import {XV2_CATALOG} from "../src/domain/xv2/catalog";
import {XV2_CHARACTER} from "../src/domain/xv2/character";
import {characterGaps,gapsMarkdown} from "../src/domain/xv2/gaps";
import {XV2_ARCHETYPES,XV2_CONTEXT} from "../src/domain/xv2/context";
// MDV_BLOCK:BEGIN id="DBX.TEST.BUNDLE.010" intent="Fail the build when the code's copy of the profile no longer matches the bundle" kind="logic" tags="xv2,tests,profile"
const INGEST=join(process.cwd(),"docs","ingest");
const profile=parse(readFileSync(join(INGEST,"optimizer-profile.yaml"),"utf8"));
const pick=<T extends object>(o:T,keys:readonly string[])=>Object.fromEntries(keys.map(k=>[k,(o as Record<string,unknown>)[k]]));
test("profile: goals, criteria, slots and rules match the YAML", ()=>{
 assert.deepEqual(XV2_GOALS,profile.goals.map((g:Record<string,unknown>&{criteria:Record<string,unknown>[]})=>({...pick(g,["id","label","definition","zero","hundred","gap_advice","spec_ref"]),criteria:g.criteria.map(c=>pick(c,["id","method","weight","function","saturation_count"]))})));
 assert.deepEqual(XV2_SLOTS,profile.decision_slots.map((s:object)=>pick(s,["id","label","family","group","nullable"])));
 assert.deepEqual(XV2_RULES,profile.rules.map((r:object)=>pick(r,["id","message","on_unknown","spec_ref"])));
});
test("profile: scoring parameters match the YAML", ()=>{
 const s=profile.scoring;const d=s.derivation_functions;
 assert.equal(XV2_SCORING.minimumGoalCoverage,s.minimum_goal_coverage);
 assert.deepEqual(XV2_SCORING.relationBands,s.relation_bands);
 assert.deepEqual(XV2_SCORING.rankWeights,[1,2,3,4,5,6,7,8].map(i=>s.rank_weights[String(i)]));
 assert.deepEqual(XV2_SCORING.derive,{capabilityTags:d.goal_capability_count.goal_tags,capabilityFlags:d.goal_capability_count.goal_flags,kiCeilingBars:d.ki_cost_fitness.ceiling_bars,staminaCeilingBars:d.stamina_cost_fitness.ceiling_bars});
});
test("profile: presets, blockers and benchmarks match the YAML", ()=>{
 assert.deepEqual(XV2_PRESETS,profile.presets.map((p:object)=>pick(p,["id","name","mode","note","ranks","blockers","benchmark_scenario","spec_ref"])));
 assert.deepEqual(XV2_BLOCKERS,profile.blockers.map((b:object)=>pick(b,["id","modes","test","message","spec_ref"])));
 assert.deepEqual(XV2_METRICS,profile.benchmarks.metrics.map((m:object)=>pick(m,["id","label","unit","computable","calculation","spec_ref"])));
 assert.deepEqual(XV2_PEERS,profile.benchmarks.peers.map((p:object)=>pick(p,["id","mode","measured","metrics"])));
});
// MDV_BLOCK:END id="DBX.TEST.BUNDLE.010" kind="logic" tags="xv2,tests,profile"
// MDV_BLOCK:BEGIN id="DBX.TEST.BUNDLE.020" intent="Reject any catalog record, real or fixture, that doesn't match the bundle's schemas" kind="logic" tags="xv2,tests,schemas,catalog"
const BASE="https://xv2.local/schema/";
const ajv=new Ajv2020({allErrors:true,strict:false});
for(const name of readdirSync(join(INGEST,"schema")).filter(n=>n.endsWith(".schema.json")))
 ajv.addSchema({...JSON.parse(readFileSync(join(INGEST,"schema",name),"utf8")),$id:BASE+name});
const SCHEMA_BY_FAMILY:Record<string,string>={skill:"skill",awoken:"awoken",soul:"super-soul",qqbang:"qq-bang"};
function schemaErrors(record:{id?:string},schema:string):string[]{
 const validate=ajv.getSchema(BASE+schema+".schema.json");
 assert.ok(validate,"missing schema "+schema);
 return validate(record)?[]:(validate.errors??[]).map(e=>(record.id??"?")+" "+e.instancePath+" "+e.message);
}
function catalogErrors(options:readonly {id:string}[],relations:readonly {id?:string}[]):string[]{
 return [
  ...options.flatMap(o=>{const family=SCHEMA_BY_FAMILY[o.id.split(".")[0]];return family?schemaErrors(o,family):[o.id+": unknown option family"];}),
  ...relations.flatMap(r=>schemaErrors(r,"relation")),
 ];
}
test("catalog: every production record matches its schema", ()=>{
 assert.deepEqual(catalogErrors(XV2_CATALOG.options,XV2_CATALOG.relations),[]);
});
test("catalog: the bundle's fixtures match their schemas, and the validator rejects a broken record", ()=>{
 const fixtures=JSON.parse(readFileSync(join(INGEST,"tests","fixtures","options.json"),"utf8")).options;
 const relations=JSON.parse(readFileSync(join(INGEST,"tests","fixtures","relations.json"),"utf8")).relations;
 assert.deepEqual(catalogErrors(fixtures,relations),[]);
 const broken=structuredClone(fixtures[0]);delete broken.tactical_grades.burst_damage;
 assert.ok(catalogErrors([broken],[]).length>0,"a record missing a goal grade must be rejected");
});
test("catalog: production records are never the synthetic fixtures", ()=>{
 assert.ok(XV2_CATALOG.options.every(o=>!o.id.includes("fixture")&&o.evidence.notes?.includes("TEST ONLY")!==true));
});
// MDV_BLOCK:END id="DBX.TEST.BUNDLE.020" kind="logic" tags="xv2,tests,schemas,catalog"
// MDV_BLOCK:BEGIN id="DBX.TEST.BUNDLE.030" intent="Hold the character-creation data to its schema, its sources and the player's settings" kind="logic" tags="xv2,tests,character"
test("character: races, heights and body types match their schema", ()=>{
 assert.deepEqual(schemaErrors(XV2_CHARACTER as unknown as {id?:string},"character"),[]);
});
test("character: every source key is in the spec's list or in catalog/sources.json", ()=>{
 const extra=new Set(JSON.parse(readFileSync(join(INGEST,"catalog","sources.json"),"utf8")).sources.map((s:{key:string})=>s.key));
 const spec=readFileSync(join(INGEST,"spec.md"),"utf8");
 const keys=new Set<string>();
 const walk=(v:unknown)=>{if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==="object")for(const [k,x] of Object.entries(v))k==="source_keys"?(x as string[]).forEach(s=>keys.add(s)):walk(x);};
 walk(XV2_CHARACTER);
 for(const k of keys)assert.ok(extra.has(k)||spec.includes("**\\["+k+"\\]**"),"unlisted source key "+k);
});
test("character: every race's archetypes exist, and height and body type are offered as settings", ()=>{
 const archetypes=new Set<string>(XV2_ARCHETYPES.map(a=>a.id));
 for(const r of XV2_CHARACTER.races)for(const a of r.archetypes)assert.ok(archetypes.has(a),r.id+" "+a);
 const field=(id:string)=>XV2_CONTEXT.find(f=>f.id===id)!;
 assert.deepEqual(field("height").options.slice(1).map(o=>o.id),XV2_CHARACTER.heights.map(h=>h.id));
 assert.deepEqual(field("body_type").options.slice(1).map(o=>o.id),XV2_CHARACTER.body_types.map(b=>b.id));
 assert.equal(field("height").options[4].label,"4 (tallest): +10% health, -5% speed");
 assert.equal(field("body_type").options[1].label,"Thin","a disputed bonus shows no number");
});
// MDV_BLOCK:END id="DBX.TEST.BUNDLE.030" kind="logic" tags="xv2,tests,character"
// MDV_BLOCK:BEGIN id="DBX.TEST.BUNDLE.040" intent="Keep every race's moveset complete and honest: all standard strings listed, features only where a source describes the string" kind="logic" tags="xv2,tests,character,moveset"
test("character: every race lists the standard combo strings, and only described strings carry features", ()=>{
 const standard=["9L","5H","LHH","HLHLH","5L3H","grab","light_break","heavy_break"];
 for(const r of XV2_CHARACTER.races){
  const ids=r.moveset.strings.map(s=>s.id);
  for(const id of standard)assert.ok(ids.includes(id),r.id+" is missing "+id);
  for(const s of r.moveset.strings){
   if(s.text===null){assert.deepEqual(s.features,[],r.id+" "+s.id+" has features but no description");assert.notEqual(s.evidence.verification,"documented",r.id+" "+s.id);}
   else assert.equal(s.evidence.verification,"documented",r.id+" "+s.id);
  }
 }
});
// MDV_BLOCK:END id="DBX.TEST.BUNDLE.040" kind="logic" tags="xv2,tests,character,moveset"
// MDV_BLOCK:BEGIN id="DBX.TEST.BUNDLE.050" intent="Keep GAPS.md exactly in step with the character data, and make sure every kind of gap is found" kind="logic" tags="xv2,tests,character,gaps"
test("GAPS.md matches the character data (run npm run gaps after changing it)", ()=>{
 const gaps=characterGaps(XV2_CHARACTER);
 assert.equal(readFileSync(join(process.cwd(),"GAPS.md"),"utf8"),gapsMarkdown(gaps));
 for(const kind of ["disputed","undescribed_string","unknown_number"])assert.ok(gaps.some(g=>g.kind===kind),"no "+kind+" gap found");
 assert.ok(gaps.some(g=>g.kind==="undescribed_string"&&g.owner==="Frieza Race"&&g.item==="Light String (9L)"));
 assert.ok(!gaps.some(g=>g.owner==="Height 4"),"known heights are not gaps");
});
// MDV_BLOCK:END id="DBX.TEST.BUNDLE.050" kind="logic" tags="xv2,tests,character,gaps"
