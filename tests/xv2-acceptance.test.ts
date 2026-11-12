/**
 * The bundle's golden acceptance cases (docs/ingest/tests/acceptance-cases.yaml, A-001...A-010),
 * run against the TypeScript adapter built from the bundle's synthetic fixtures, plus the engine
 * contract checks every adapter must pass. Fixture records are test-only and never load in the app.
 */
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {parse} from "yaml";
import type {Build} from "../src/kernel/optimization/contract";
import {createXv2Adapter} from "../src/domain/xv2/adapter";
import {rateOption} from "../src/domain/xv2/scoring";
import {checkAttributeBudget,TP_ONLY} from "../src/domain/xv2/rules";
import type {Catalog} from "../src/domain/xv2/records";
import {XV2_ADAPTER} from "../src/domain/xv2/catalog";
import {XV2_SCORING} from "../src/domain/xv2/profile";
import {rateInBuild} from "../src/application/optimization/evaluate";
import {checkBlockers} from "../src/application/optimization/requirements";
import {autoBuild} from "../src/application/optimization/auto-build";
import {weightsFromRanks} from "../src/application/optimization/goal-weights";
// MDV_BLOCK:BEGIN id="DBX.TEST.ACCEPT.010" intent="Build the adapter from the bundle's synthetic fixtures and read the golden cases" kind="config" tags="xv2,tests,acceptance"
const INGEST=join(process.cwd(),"docs","ingest");
const FIXTURES:Catalog={
 options:JSON.parse(readFileSync(join(INGEST,"tests","fixtures","options.json"),"utf8")).options,
 relations:JSON.parse(readFileSync(join(INGEST,"tests","fixtures","relations.json"),"utf8")).relations,
};
const ADAPTER=createXv2Adapter(FIXTURES,{id:"dbx2-op-fixtures"});
const CASES=new Map<string,{given:Record<string,any>;expect:Record<string,any>}>(parse(readFileSync(join(INGEST,"tests","acceptance-cases.yaml"),"utf8")).cases.map((c:{id:string})=>[c.id,c]));
const build=(picks:Record<string,string>,context?:Record<string,string>):Build=>({version:1,level:1,picks,...(context?{context}:{})});
const option=(id:string)=>FIXTURES.options.find(o=>o.id===id)!;
// MDV_BLOCK:END id="DBX.TEST.ACCEPT.010" kind="config" tags="xv2,tests,acceptance"
// MDV_BLOCK:BEGIN id="DBX.TEST.ACCEPT.020" intent="Pin the legality cases: duplicates, race locks and the attribute budget" kind="logic" tags="xv2,tests,acceptance,legality"
test("A-001: a duplicate skill fails R-001 and legalOptions excludes it", ()=>{
 const {given}=CASES.get("A-001")!;
 const issues=ADAPTER.validate(build({super_1:given.super_1,super_2:given.super_2}));
 assert.ok(issues.some(i=>i.slotId==="super_2"&&i.reason.startsWith("A skill can only be equipped once")));
 const slot=ADAPTER.slots(build({})).find(s=>s.id==="super_2")!;
 assert.ok(!ADAPTER.legalOptions(build({super_1:given.super_1}),slot).some(o=>o.id===given.super_2));
});
test("A-002: a race-locked Awoken fails R-002 for another race, and passes while race is unset", ()=>{
 const {given}=CASES.get("A-002")!;
 assert.ok(ADAPTER.validate(build({awoken:given.awoken_id},{archetype:given.archetype})).some(i=>i.slotId==="awoken"&&i.reason.includes("race/gender")));
 assert.deepEqual(ADAPTER.validate(build({awoken:given.awoken_id})),[],"unknown race is unverified, not a failure");
});
test("A-007: a known budget is enforced; an unknown budget stays unverified", ()=>{
 const {given,expect}=CASES.get("A-007")!;
 const outcomes=given.budgets.map((b:{value:number|null})=>checkAttributeBudget(given.attribute_spread,b.value,given.per_stat_cap));
 assert.equal(outcomes[0].total,expect.allocated_total);
 assert.deepEqual(outcomes.map((o:{"R-003":string})=>o["R-003"]==="fail"?"fail_R-003":o["R-003"]==="unverified"?"unverified_R-003":"pass"),expect.outcomes);
});
// MDV_BLOCK:END id="DBX.TEST.ACCEPT.020" kind="logic" tags="xv2,tests,acceptance,legality"
// MDV_BLOCK:BEGIN id="DBX.TEST.ACCEPT.030" intent="Pin the scoring cases: unknown is never zero, benchmarks never gate a rating, not-applicable leaves the weights" kind="logic" tags="xv2,tests,acceptance,scoring"
test("A-003: an unknown grade makes the goal unknown, not zero", ()=>{
 const {given}=CASES.get("A-003")!;
 const o=structuredClone(option(given.option_id));
 o.tactical_grades={...o.tactical_grades,[given.goal]:{...o.tactical_grades[given.goal],status:"unknown",value:null,reason:"Synthetic grade deliberately unknown"}};
 const r=rateOption(o);
 assert.equal(r.detail[given.goal as "burst_damage"].status,"unknown");
 assert.equal(r.detail[given.goal as "burst_damage"].value,null);
 assert.ok(r.unknown?.includes(given.goal));
});
test("A-009: a fully described option rates on every goal with no measurements at all", ()=>{
 const {given,expect}=CASES.get("A-009")!;
 const r=rateOption(option(given.option_id));
 for(const d of Object.values(r.detail)){assert.notEqual(d.value,null);assert.ok(d.coverage>=expect.every_goal_coverage_at_least);}
 assert.equal(r.unknown,undefined);
});
test("A-010: a not-applicable cost criterion leaves the weights, with its reason", ()=>{
 const {given}=CASES.get("A-010")!;
 const r=rateOption(option(given.option_id));
 const d=r.detail[given.goal as "stamina_safety"];
 assert.notEqual(d.value,null);assert.ok(d.coverage>=XV2_SCORING.minimumGoalCoverage);
});
// MDV_BLOCK:END id="DBX.TEST.ACCEPT.030" kind="logic" tags="xv2,tests,acceptance,scoring"
// MDV_BLOCK:BEGIN id="DBX.TEST.ACCEPT.040" intent="Pin the relation and blocker cases: candidates explain only, confirmed relations move rankings, blockers follow the scenario" kind="logic" tags="xv2,tests,acceptance,relations,blockers"
test("A-004: a Soul triggered by a named skill is a candidate synergy that adds nothing", ()=>{
 const {given,expect}=CASES.get("A-004")!;
 const [r]=ADAPTER.relations(given.a,given.b);
 assert.ok(r&&r.kind===expect.kind&&r.state===expect.state&&r.reason.includes("G-001"));
 const inBuild=rateInBuild(ADAPTER,given.b,build({super_1:given.b,super_soul:given.a}),"super_1");
 assert.deepEqual(inBuild.scores,ADAPTER.rate(given.b,build({})).scores);
});
test("A-005: the armor blocker fails only when the scenario requires an answer", ()=>{
 const {expect}=CASES.get("A-005")!;
 const results=["","required_known"].map(v=>checkBlockers(ADAPTER,build({},v?{armor_answer:v}:{}),"expert-support")[0].result);
 assert.deepEqual(results,expect.results);
 assert.equal(checkBlockers(ADAPTER,build({},{armor_answer:"required_unknown"}),"expert-support")[0].result,"unknown");
});
test("A-006: a built-in charge Awoken and a charge Super are a candidate redundancy on Ki economy", ()=>{
 const {given,expect}=CASES.get("A-006")!;
 const [r]=ADAPTER.relations(given.a,given.b);
 assert.ok(r&&r.kind===expect.kind&&r.goal===expect.goal&&r.state===expect.state&&r.reason.includes("G-003"));
 assert.equal(ADAPTER.validate(build({awoken:given.a,super_1:given.b})).length,0,"no automatic unequip: the pair stays legal");
});
test("A-008: a confirmed relation adds its band and breaks a tie", ()=>{
 const {given,expect}=CASES.get("A-008")!;
 const empty=build({});
 assert.equal(ADAPTER.rate(given.a,empty).scores[given.goal as "burst_damage"],ADAPTER.rate(given.competitor,empty).scores[given.goal as "burst_damage"]);
 const withA=rateInBuild(ADAPTER,given.a,build({super_1:given.a,super_soul:given.b}),"super_1").scores[given.goal as "burst_damage"];
 const withC=rateInBuild(ADAPTER,given.competitor,build({super_1:given.competitor,super_soul:given.b}),"super_1").scores[given.goal as "burst_damage"];
 assert.equal(withA-ADAPTER.rate(given.a,empty).scores[given.goal as "burst_damage"],expect.relation_points);
 assert.ok(withA>withC);
});
// MDV_BLOCK:END id="DBX.TEST.ACCEPT.040" kind="logic" tags="xv2,tests,acceptance,relations,blockers"
// MDV_BLOCK:BEGIN id="DBX.TEST.ACCEPT.050" intent="Hold the Xenoverse 2 adapter to the engine contract, with the fixtures and with the real (empty) catalog" kind="logic" tags="xv2,tests,contract"
test("contract: legalOptions agrees with validate", ()=>{
 const empty=build({});
 for(const slot of ADAPTER.slots(empty))for(const o of ADAPTER.legalOptions(empty,slot))assert.deepEqual(ADAPTER.validate(build({[slot.id]:o.id})),[],o.id+" in "+slot.id);
});
test("contract: every point of every score has a reason, and unknown goals are real goals", ()=>{
 const goals=new Set(ADAPTER.goals.map(g=>g.id));
 for(const o of ADAPTER.options){
  const r=ADAPTER.rate(o.id,build({}));
  for(const g of ADAPTER.goals){
   const sum=r.contributions.filter(c=>c.goal===g.id).reduce((n,c)=>n+c.value,0);
   assert.equal(r.scores[g.id],Math.max(0,Math.min(100,Math.round(sum*10)/10)),o.id+" "+g.id);
  }
  for(const g of r.unknown??[])assert.ok(goals.has(g));
 }
});
test("contract: relations don't depend on argument order", ()=>{
 const key=(r:{goal:string;weight:number;kind:string;state?:string})=>r.kind+":"+r.goal+":"+r.weight+":"+r.state;
 for(const a of ADAPTER.options)for(const b of ADAPTER.options)
  assert.deepEqual(ADAPTER.relations(a.id,b.id).map(key).sort(),ADAPTER.relations(b.id,a.id).map(key).sort());
});
test("contract: every preset auto-builds a legal loadout, filling every slot that has an option", ()=>{
 for(const p of ADAPTER.presets){
  const r=autoBuild(ADAPTER,build({}),weightsFromRanks(p.ranks,ADAPTER.rankWeights));
  assert.deepEqual(r.issues,[],p.id);
  for(const slot of ADAPTER.slots(r.build))if(ADAPTER.legalOptions({...r.build,picks:{}},slot).length)assert.ok(r.build.picks[slot.id],p.id+" left "+slot.id+" open");
 }
});
test("the app's adapter loads the real catalog and still offers the named spreads; ungraded options are unknown, not zero", ()=>{
 for(const id of ["skill.super.innocence-cannon","skill.ultimate.emperors-death-beam","awoken.turn-golden"])assert.ok(XV2_ADAPTER.options.some(o=>o.id===id),id);
 const slot=XV2_ADAPTER.slots(build({})).find(s=>s.id==="attribute_spread")!;
 assert.ok(XV2_ADAPTER.legalOptions(build({}),slot).length>=4);
 assert.ok(XV2_ADAPTER.rate("spread.balanced",build({})).unknown?.length===8,"spreads are ungraded: unknown, not zero");
 assert.equal(XV2_ADAPTER.rate("skill.super.innocence-cannon",build({})).unknown?.length,8,"the first real skills are ungraded: unknown, not zero");
});
test("rank weights follow the profile's table, not the template's linear default", ()=>{
 const w=weightsFromRanks({burst_damage:1,control:2},XV2_SCORING.rankWeights);
 assert.ok(Math.abs((w.burst_damage??0)-8/14)<1e-9&&Math.abs((w.control??0)-6/14)<1e-9);
});
// MDV_BLOCK:END id="DBX.TEST.ACCEPT.050" kind="logic" tags="xv2,tests,contract"
// MDV_BLOCK:BEGIN id="DBX.TEST.ACCEPT.060" intent="Pin where-to-get-it: every option says where it comes from, and the TP-only setting removes exactly the TP-only options" kind="logic" tags="xv2,tests,acquisition"
test("acquisition: every real option says where to get it", ()=>{
 for(const o of XV2_ADAPTER.options.filter(o=>!o.id.startsWith("spread.")))assert.match(o.summary,/^Where to get it: /,o.id);
 assert.equal(XV2_ADAPTER.options.find(o=>o.id==="skill.super.god-of-destructions-anger")!.summary,"Where to get it: Train with Beerus");
 assert.equal(XV2_ADAPTER.options.find(o=>o.id==="skill.super.consecutive-energy-blast")!.summary,"Where to get it: Skill Shop");
 assert.equal(XV2_ADAPTER.options.find(o=>o.id==="skill.ultimate.emperors-death-beam")!.summary,"Where to get it: TP Medal Shop (rotating stock)");
});
test("acquisition: 'Skip TP Medal Shop only' removes TP-only options from the picker and flags them in validation", ()=>{
 const slot=XV2_ADAPTER.slots(build({})).find(s=>s.id==="ultimate_1")!;
 const ids=(b:Build)=>XV2_ADAPTER.legalOptions(b,slot).map(o=>o.id);
 assert.ok(ids(build({})).includes("skill.ultimate.emperors-death-beam"),"offered by default");
 assert.ok(!ids(build({},{acquisition:"no_tp_only"})).includes("skill.ultimate.emperors-death-beam"),"hidden when TP-only is skipped");
 assert.deepEqual(XV2_ADAPTER.validate(build({ultimate_1:"skill.ultimate.emperors-death-beam"},{acquisition:"no_tp_only"})).map(i=>i.reason),[TP_ONLY]);
 assert.deepEqual(XV2_ADAPTER.validate(build({super_1:"skill.super.innocence-cannon"},{acquisition:"no_tp_only"})),[],"an instructor skill stays legal");
 assert.deepEqual(ADAPTER.validate(build({super_1:"skill.super.fixture-a"},{acquisition:"no_tp_only"})),[],"no recorded source is unknown, never filtered");
});
test("acquisition: Turn Golden is Frieza Race only", ()=>{
 assert.deepEqual(XV2_ADAPTER.validate(build({awoken:"awoken.turn-golden"},{archetype:"frieza_race"})),[]);
 assert.ok(XV2_ADAPTER.validate(build({awoken:"awoken.turn-golden"},{archetype:"male_saiyan"})).some(i=>i.reason.includes("race/gender")));
});
// MDV_BLOCK:END id="DBX.TEST.ACCEPT.060" kind="logic" tags="xv2,tests,acquisition"
