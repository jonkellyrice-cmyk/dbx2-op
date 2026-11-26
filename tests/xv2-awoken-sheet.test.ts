/** The Awoken sheet: rows the owner has, sourced, expanded into records that keep unknowns unknown. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {XV2_ADAPTER,XV2_CATALOG} from "../src/domain/xv2/catalog";
import {expandAwokenSheet,type AwokenSheet} from "../src/domain/xv2/awoken-sheet";
import {nameKey,XV2_OWNED} from "../src/domain/xv2/owned";
import type {Build} from "../src/kernel/optimization/contract";
// MDV_BLOCK:BEGIN id="DBX.TEST.AWOKENSHEET.010" intent="Keep the Awoken sheet honest: owned, sourced rows whose records say only what the row says" kind="logic" tags="xv2,tests,catalog,awoken,sheet"
const read=(name:string)=>JSON.parse(readFileSync(join(process.cwd(),"docs","ingest","catalog",name),"utf8"));
const SHEET=read("awoken-sheet.json") as AwokenSheet;
const SAIYAN=["male_saiyan","female_saiyan"];
test("every Awoken row is one the owner has, names a recorded source, and reaches the catalog once", ()=>{
 const sources=new Set((read("sources.json").sources as {key:string}[]).map(s=>s.key));
 const owned=new Set(Object.values(XV2_OWNED.skills.awoken).flat().map(nameKey));
 for(const r of SHEET.rows){
  assert.ok(sources.has(r.key),r.name+": "+r.key+" is not in sources.json");
  assert.ok(owned.has(nameKey(r.name)),r.name+" is not in the owner's Awoken list");
  assert.equal(XV2_CATALOG.options.filter(o=>o.name===r.name&&o.id.startsWith("awoken.")).length,1,r.name);
  for(const [goal,[grade,reason]] of Object.entries(r.grades)){assert.ok(Number.isInteger(grade)&&grade>=1&&grade<=5,r.name+" "+goal);assert.ok(reason.length>=20,r.name+" "+goal+" needs a reason");}
  for(const [stage] of r.effects??[])assert.ok(r.stages.includes(stage),r.name+": effect names a stage it doesn't have");
 }
 // Every Awoken the owner listed is now in the catalog, hand-written or from the sheet.
 for(const key of owned)assert.ok(XV2_CATALOG.options.some(o=>o.id.startsWith("awoken.")&&nameKey(o.name)===key),key);
});
test("a row's unknowns stay unknown, and its numbers are carried as written", ()=>{
 const [o]=expandAwokenSheet({about:"",version:"v",rows:[{name:"Test Form",key:"WIKI-TEST",ki:null,description:null,stages:["Test Form"],
  effects:[["Test Form","all_attack_damage",0.25]],drain:["ki",null,"Drains Ki."],get:{unknown:"Not recorded."},notes:"n",grades:{burst_damage:[4,"A reason long enough to read."]}}]}) as unknown as Record<string,any>[];
 assert.equal(o.id,"awoken.test-form");
 assert.equal(o.activation_costs[0].amount.status,"unknown");assert.equal(o.upkeep_costs[0].amount.status,"unknown");
 assert.equal(o.effects[0].magnitude.value,0.25);assert.equal(o.tactical_grades.burst_damage.value,4);
 assert.equal(o.tactical_grades.mobility.status,"unknown","an ungraded goal is unknown, never zero");
 assert.equal(o.acquisition_options[0].source,"unknown");assert.equal(o.eligibility.archetypes.values.length,8);
 assert.ok(o.notes.startsWith("The source doesn't quote the in-game description."));
 const kaioken=XV2_CATALOG.options.find(x=>x.id==="awoken.kaioken") as unknown as Record<string,any>;
 assert.equal(kaioken.activation_costs[0].amount.value,1,"100 Ki is one bar");assert.deepEqual(kaioken.state_stages,["Kaioken","x3 Kaioken","x20 Kaioken"]);
});
test("the Saiyan forms the owner has are locked to Saiyans, so a Frieza Race build can't equip them", ()=>{
 const build=(awoken:string,archetype:string):Build=>({version:1,level:1,picks:{awoken},context:{archetype}});
 for(const id of ["awoken.future-super-saiyan","awoken.super-saiyan-god","awoken.super-saiyan-god-super-saiyan","awoken.super-saiyan-god-super-saiyan-evolved"]){
  const o=XV2_CATALOG.options.find(x=>x.id===id) as unknown as Record<string,any>;
  assert.deepEqual(o.eligibility.archetypes.values,SAIYAN,id);
  assert.ok(XV2_ADAPTER.validate(build(id,"frieza_race")).some(i=>i.reason.includes("race/gender")),id);
  assert.deepEqual(XV2_ADAPTER.validate(build(id,"male_saiyan")),[],id);
 }
 assert.deepEqual(XV2_ADAPTER.validate(build("awoken.potential-unleashed","frieza_race")),[]);
});
// MDV_BLOCK:END id="DBX.TEST.AWOKENSHEET.010" kind="logic" tags="xv2,tests,catalog,awoken,sheet"
