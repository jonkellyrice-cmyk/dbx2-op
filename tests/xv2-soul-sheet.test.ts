/** The Super Soul sheet: owned, sourced rows, expanded into records that say only what the source says. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {XV2_CATALOG} from "../src/domain/xv2/catalog";
import {nameKey,XV2_OWNED} from "../src/domain/xv2/owned";
import {expandSoulSheet,soulEvent,soulLine,type SoulSheet} from "../src/domain/xv2/soul-sheet";
// MDV_BLOCK:BEGIN id="DBX.TEST.SOULSHEET.010" intent="Keep the Super Soul sheet honest: owned, sourced rows whose records carry the source's lines and nothing invented" kind="logic" tags="xv2,tests,catalog,soul,sheet"
const read=(name:string)=>JSON.parse(readFileSync(join(process.cwd(),"docs","ingest","catalog",name),"utf8"));
const SHEET=read("soul-sheet.json") as SoulSheet;
const souls=XV2_CATALOG.options.filter(o=>o.id.startsWith("soul."));
test("every Super Soul row is one the owner has, names a recorded source, and reaches the catalog once", ()=>{
 const sources=new Set((read("sources.json").sources as {key:string}[]).map(s=>s.key));
 const owned=new Set(XV2_OWNED.super_souls.map(s=>nameKey(s.name)));
 for(const r of SHEET.rows){
  assert.ok(sources.has(r.key)||r.key==="OWNER-OBSERVATION",r.name+": "+r.key+" is not a recorded source");
  assert.ok(owned.has(nameKey(r.name)),r.name+" is not in the owner's Super Souls");
  assert.equal(souls.filter(o=>nameKey(o.name)===nameKey(r.name)).length,1,r.name);
  for(const [goal,[grade,reason]] of Object.entries(r.grades)){assert.ok(Number.isInteger(grade)&&grade>=1&&grade<=5,r.name+" "+goal);assert.ok(reason.length>=20,r.name+" "+goal+" needs a reason");}
 }
 // Every Super Soul the owner has is now in the catalog, hand-written or from the sheet.
 for(const s of XV2_OWNED.super_souls)assert.ok(souls.some(o=>nameKey(o.name)===nameKey(s.name)),s.name);
 assert.equal(souls.length,XV2_OWNED.super_souls.length);
});
test("a condition and an effect line are read as the list writes them", ()=>{
 assert.deepEqual(soulEvent("Always"),{event:"battle_start",when:"while_true"});
 assert.deepEqual(soulEvent("When an enemy is KO'ed"),{event:"on_ko",when:"on_event"});
 assert.deepEqual(soulEvent("When Ki is maxed out"),{event:"threshold_held",when:"while_true"});
 assert.deepEqual(soulEvent("While Golden"),{event:"on_transform",when:"while_true"});
 assert.deepEqual(soulEvent("On a successful Just Guard"),{event:"on_perfect_guard",when:"on_event"});
 assert.deepEqual(soulLine("Boosts Ki Blast-based skills temporarily. | +20% | 10 seconds"),{text:"Boosts Ki Blast-based skills temporarily.",fraction:0.2,points:null,seconds:10});
 assert.deepEqual(soulLine("Restores Stamina | +200 stamina"),{text:"Restores Stamina",fraction:null,points:{value:200,unit:"stamina_points"},seconds:null});
 // A size the list words differently is kept as text, never guessed.
 assert.deepEqual(soulLine("Activates Health Auto-Recovery | +1.8% of Max HP per second | 10 seconds"),{text:"Activates Health Auto-Recovery",fraction:null,points:null,seconds:10});
 assert.equal(soulLine("Seals all Skills").fraction,null);
});
test("a row's lines become effect clauses with their stated size, and what isn't stated stays unknown", ()=>{
 const [o]=expandSoulSheet({about:"",version:"v",rows:[{name:"Test Soul!",key:"WIKI-SUPER-SOUL",n:7,stars:null,character:null,ki_blast:null,limit_burst:"Auto Just Guard",get:"Not recorded.",
  effects:[["While Golden",["Boosts normal Ki Blasts. | +20%"]],["Once only when health is below 25%",["Restores stamina. | +300 Stamina","Grants super armor."]]],
  needs:{awoken:["awoken.turn-golden"]},grades:{sustained_damage:[3,"A reason long enough to read."]}}]}) as unknown as Record<string,any>[];
 assert.equal(o.id,"soul.test-soul");assert.equal(o.name,"\"Test Soul!\"");
 assert.equal(o.effect_clauses.length,3);
 const [boost,refill,armor]=o.effect_clauses;
 assert.equal(boost.magnitude.value,0.2);assert.equal(boost.trigger.when,"while_true");assert.deepEqual(boost.trigger.predicates,[{path:"actor.awoken_id",operator:"in",value:["awoken.turn-golden"]}]);
 assert.equal(refill.operation,"restore");assert.equal(refill.magnitude.value,300);assert.equal(refill.activation_limit.kind,"once_per_battle");
 assert.equal(armor.operation,"grant_state");assert.equal(armor.magnitude.status,"not_applicable");assert.equal(armor.duration.quantity.status,"unknown");
 assert.equal(o.charged_ki_blast.status,"unknown");assert.equal(o.rarity,undefined,"no stars recorded, so no rarity is claimed");
 assert.equal(o.acquisition_options[0].source,"unknown");
 assert.equal(o.tactical_grades.sustained_damage.value,3);assert.equal(o.tactical_grades.burst_damage.status,"unknown","an ungraded goal is unknown, never zero");
});
test("the catalog's souls carry what the list says about them", ()=>{
 const get=(id:string)=>XV2_CATALOG.options.find(o=>o.id===id) as unknown as Record<string,any>;
 const form=get("soul.i-m-still-not-used-to-this-form");
 assert.deepEqual(form.effect_clauses.map((c:any)=>c.magnitude.value),[0.2,-0.1]);
 assert.equal(form.tactical_grades.burst_damage.value,3);assert.equal(form.tactical_grades.ki_economy.value,1,"its Ki drain is a cost, not a benefit");
 assert.ok(form.effect_clauses[0].trigger.predicates[0].value.includes("awoken.turn-golden"));
 // A soul with no listed effect is recorded as having none, graded only on its Limit Burst.
 const scum=get("soul.your-power-is-5-scum");assert.deepEqual(scum.effect_clauses,[]);assert.equal(scum.tactical_grades.burst_damage.status,"unknown");
 // The one soul the wiki's list lacks is recorded from the owner's screenshot, not from the wiki.
 assert.deepEqual(get("soul.i-ll-grant-you-just-one-wish").evidence.source_keys,["OWNER-OBSERVATION"]);
});
// MDV_BLOCK:END id="DBX.TEST.SOULSHEET.010" kind="logic" tags="xv2,tests,catalog,soul,sheet"
