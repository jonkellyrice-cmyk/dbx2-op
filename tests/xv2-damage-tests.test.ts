import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {XV2_CATALOG} from "../src/domain/xv2/catalog";
import {XV2_DAMAGE_TESTS,burstBand,damageTestFor,firstFigure,indexDamageTests,withDamageTests} from "../src/domain/xv2/damage-tests";
import type {Option} from "../src/domain/xv2/records";
// MDV_BLOCK:BEGIN id="DBX.TEST.DAMAGETESTS.010" intent="Hold the measured damage to what the spreadsheets say: read cells honestly, grade by the stated bands, and never touch a skill that was not measured" kind="logic" tags="xv2,tests,catalog,damage"
const CATALOG=join(process.cwd(),"docs","ingest","catalog");
const read=(name:string)=>JSON.parse(readFileSync(join(CATALOG,name),"utf8"));
const option=(name:string,slot="super")=>XV2_CATALOG.options.find(o=>o.name===name&&o.slot_family===slot)!;
test("a cell is read as its first figure, and a cell with no number as nothing", ()=>{
 for(const [cell,n] of [["5580",5580],["3000-7417*",3000],["1500x4",1500],["150/hit",150],["900* (3660)",900],["0-300",0],["0",0]] as const)assert.equal(firstFigure(cell),n,cell);
 assert.equal(firstFigure(""),null);assert.equal(firstFigure("Varies"),null);
});
test("the bands are the ones GRADING.md states, edge by edge", ()=>{
 for(const [damage,grade] of [[0,1],[1999,1],[2000,2],[3999,2],[4000,3],[6999,3],[7000,4],[9999,4],[10000,5],[27000,5]])assert.equal(burstBand(damage).grade,grade,String(damage));
 const doc=readFileSync(join(CATALOG,"GRADING.md"),"utf8");
 assert.match(doc,/under 2,000 → 1, 2,000–3,999 → 2, 4,000–6,999 → 3, 7,000–9,999 → 4, 10,000 or more → 5/);
});
test("every measured row names a recorded source, and no skill is measured twice in one slot", ()=>{
 const file=read("damage-tests.json"),sources=new Set((read("sources.json").sources as {key:string}[]).map(s=>s.key));
 for(const key of Object.values(file.sources as Record<string,string>))assert.ok(sources.has(key),key);
 for(const r of file.rows as string[][]){assert.equal(r.length,10,r[2]);assert.ok(r[0] in file.sources&&["super","ultimate","evasive"].includes(r[1]),r[2]);}
 assert.equal(XV2_DAMAGE_TESTS.size,file.rows.length);
 assert.throws(()=>indexDamageTests({...file,rows:[file.rows[0],file.rows[0]]}),/twice/);
});
test("a measured skill is graded from its measurement, and the reason gives the figure and where it is from", ()=>{
 const k=option("Kamehameha").tactical_grades.burst_damage;
 assert.deepEqual([k.value,k.evidence.status,k.evidence.source_keys],[3,"model",["SHEET-KI-BLAST-DAMAGE"]]);
 assert.match(k.reason,/^Measured 5,580 damage in the community damage test\. 4,000-6,999 is grade 3\.$/);
 const x4=option("X4 Kaioken Kamehameha","ultimate").tactical_grades.burst_damage;
 assert.equal(x4.value,3);assert.match(x4.reason,/listed as "6030-9690"; graded on the first figure.*cost as "300-400"/);
 assert.equal(option("Unrelenting Barrage","ultimate").tactical_grades.burst_damage.evidence.source_keys[0],"SHEET-STRIKE-DAMAGE");
 const gum=option("Go-Go Gum").tactical_grades.burst_damage;assert.equal(gum.value,1);assert.match(gum.reason,/^Measured 0 damage.*it deals none/);
 assert.match(option("Emperor's Death Beam","ultimate").tactical_grades.burst_damage.reason,/cost as "400-All"\. The tester notes: "Fires continuously until ki is depleted.*Tested with 1000 Ki\."$/);
 // Same name, different slot: the Super and the Evasive each get their own row.
 assert.match(option("Super Explosive Wave").tactical_grades.burst_damage.reason,/4,080/);assert.match(option("Super Explosive Wave","evasive").tactical_grades.burst_damage.reason,/1,800/);
});
test("a skill the spreadsheets did not measure is left exactly as recorded", ()=>{
 for(const [name,slot] of [["Heat Wave","super"],["Punisher Guard","evasive"],["Body Change","ultimate"]]){
  const o=option(name,slot);assert.equal(damageTestFor(o),undefined,name);assert.equal(o.tactical_grades.burst_damage.status,"unknown",name);
 }
 const comet=option("Comet Strike").tactical_grades.burst_damage;assert.equal(comet.value,2);assert.match(comet.reason,/^Wiki damage 10%/);
 const untouched=XV2_CATALOG.options.filter(o=>!o.slot_family);
 assert.deepEqual(withDamageTests(untouched),untouched,"Awokens, Super Souls and QQ Bangs have no rows");
});
test("an unknown cost is filled from the measurement, a known one is kept, and a range is not a cost", ()=>{
 const cost=(o:Option)=>o.cost_schedule![0].amount;
 for(const [name,slot,bars] of [["Dodon Ray","super",0],["Ki Blast Cannon","super",1],["Sudden Death Beam","super",1],["Breaker Energy Wave","ultimate",0]] as const){
  const o=option(name,slot);assert.deepEqual([cost(o).status,cost(o).value,cost(o).evidence!.verification,o.catalog_coverage.costs],["known",bars,"observed","complete"],name);
 }
 assert.equal(cost(option("Kamehameha")).evidence!.verification,"documented","a cost the wiki gave keeps its own evidence");
 const unknown={...option("Heat Wave"),name:"Blaster Ball",cost_schedule:[{resource:"ki",phase:"activation",amount:{status:"unknown" as const,value:null}}]};
 assert.equal(cost(withDamageTests([unknown as Option])[0]).status,"unknown","\"100-All\" is not one cost");
});
// MDV_BLOCK:END id="DBX.TEST.DAMAGETESTS.010" kind="logic" tags="xv2,tests,catalog,damage"
