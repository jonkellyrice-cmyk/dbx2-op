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
