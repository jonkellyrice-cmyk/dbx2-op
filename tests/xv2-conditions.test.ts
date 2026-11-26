/** What the rest of a loadout does to one option: unmet conditions, boosts for a kind of skill the build lacks, sealed skills. */
import test from "node:test";
import assert from "node:assert/strict";
import {XV2_ADAPTER,XV2_CATALOG} from "../src/domain/xv2/catalog";
import {boostedKind,conditionCuts,needsOf,sealsSkills,SEALED_SHARE} from "../src/domain/xv2/conditions";
import type {Build} from "../src/kernel/optimization/contract";
// MDV_BLOCK:BEGIN id="DBX.TEST.CONDITIONS.010" intent="Pin when a loadout cuts an option's score, by how much, and that it says why" kind="logic" tags="xv2,tests,conditions,loadout"
const get=(id:string)=>XV2_CATALOG.options.find(o=>o.id===id)!;
const build=(picks:Record<string,string>):Build=>({version:1,level:1,picks});
const rate=(id:string,picks:Record<string,string>)=>XV2_ADAPTER.rate(id,build(picks));
const KI="skill.super.bending-kamehameha",STRIKE="skill.super.super-dragon-fist";
test("the facts the cuts rest on are read from the records", ()=>{
 assert.ok(sealsSkills(get("skill.super.fighting-sun")));assert.ok(sealsSkills(get("soul.that-offer-s-expired")));
 assert.ok(!sealsSkills(get(KI)));assert.ok(!sealsSkills(get("soul.haaaaa")));
 assert.ok(needsOf(get("soul.the-gold-represents-the-new-me")).awoken!.includes("awoken.turn-golden"));
 assert.deepEqual(needsOf(get("soul.flying-nimbus")).awoken,[],"its Awoken is not in the catalog");
 assert.deepEqual(needsOf(get("soul.dodon-ray")).skill,["skill.super.dodon-ray"]);
 assert.deepEqual(needsOf(get("soul.haaaaa")),{awoken:null,skill:null});
 assert.equal(boostedKind("Increases Strike Skill damage +5%"),"strike");assert.equal(boostedKind("Boosts Ki Blast-based skills. +20%"),"ki_blast");
 assert.equal(boostedKind("+5% to Ki Blast skills and +10% to Strike skills"),null,"both kinds is not one kind");
 assert.equal(boostedKind("Boosts all attacks. +20%"),null);
});
test("a Super Soul's conditional effects count only when the build holds what the condition needs", ()=>{
 const soul="soul.i-m-still-not-used-to-this-form";
 const met=rate(soul,{super_soul:soul,awoken:"awoken.turn-golden",super_1:KI});
 assert.ok(met.scores.burst_damage>0,"its boost counts with Turn Golden equipped");assert.ok(met.scores.ki_economy>0);
 assert.ok(!met.contributions.some(c=>/condition needs/.test(c.reason)));
 for(const picks of [{super_soul:soul,awoken:"awoken.potential-unleashed",super_1:KI},{super_soul:soul,super_1:KI}]){
  const unmet=rate(soul,picks);
  assert.equal(unmet.scores.burst_damage,0);assert.equal(unmet.scores.ki_economy,0,"its Ki drain doesn't apply either");
  assert.match(unmet.contributions.find(c=>c.goal==="burst_damage"&&c.value<0)!.reason,/^Its condition needs an Awoken this build doesn't have equipped/);
 }
 // A soul tied to a skill: counted with the skill, not without.
 assert.ok(rate("soul.dodon-ray",{super_soul:"soul.dodon-ray",super_1:"skill.super.dodon-ray"}).scores.ki_economy>0);
 assert.equal(rate("soul.dodon-ray",{super_soul:"soul.dodon-ray",super_1:KI}).scores.ki_economy,0);
 // A grade that doesn't come from the condition (the Limit Burst) is left alone.
 const nimbus=rate("soul.flying-nimbus",{super_soul:"soul.flying-nimbus",awoken:"awoken.turn-golden"});
 assert.equal(nimbus.scores.burst_damage,0);assert.ok(nimbus.scores.survivability>0);
 // A soul with no such need is untouched whatever the build.
 assert.deepEqual(rate("soul.haaaaa",{super_soul:"soul.haaaaa",awoken:"awoken.beast"}).scores,rate("soul.haaaaa",{super_soul:"soul.haaaaa"}).scores);
});
test("a boost to one kind of skill counts only in a build that has a skill of that kind", ()=>{
 const strikeSoul="soul.saiyans-are-a-warrior-race";
 assert.ok(rate(strikeSoul,{super_soul:strikeSoul,super_1:STRIKE}).scores.burst_damage>0);
 const lacking=rate(strikeSoul,{super_soul:strikeSoul,super_1:KI});
 assert.equal(lacking.scores.burst_damage,0);
 assert.match(lacking.contributions.find(c=>c.goal==="burst_damage"&&c.value<0)!.reason,/^It boosts Strike skills only, and this build has none equipped/);
 // The same for a Power Up Super that boosts Ki Blast skills.
 const pose="skill.super.fighting-pose-g";
 assert.ok(rate(pose,{super_1:pose,super_2:KI}).scores.burst_damage>0);
 assert.equal(rate(pose,{super_1:pose,super_2:STRIKE}).scores.burst_damage,0);
 // A boost to all attacks needs no particular kind.
 const all="soul.you-honestly-thought-you-could-beat-me";
 assert.equal(rate(all,{super_soul:all,super_1:STRIKE}).scores.burst_damage,rate(all,{super_soul:all,super_1:KI}).scores.burst_damage);
});
test("a skill that seals skills counts at half beside other skills, and a sealing Super Soul halves the skills' damage", ()=>{
 const sun="skill.super.fighting-sun";
 const alone=rate(sun,{super_1:sun}),beside=rate(sun,{super_1:sun,super_2:KI,ultimate_1:"skill.ultimate.emperors-death-beam"});
 for(const g of ["sustained_damage","mobility","stamina_safety"] as const){assert.ok(alone.scores[g]>0);assert.equal(beside.scores[g],Math.round(alone.scores[g]*SEALED_SHARE*10)/10,g);}
 assert.match(beside.contributions.find(c=>c.goal==="mobility"&&c.value<0)!.reason,/^While it lasts you can't use the 2 other skills equipped/);
 // The other skills are not cut by a seal you choose when to use.
 assert.deepEqual(rate(KI,{super_1:sun,super_2:KI}).scores,rate(KI,{super_2:KI}).scores);
 // A Super Soul that seals skills while its condition holds does cut them.
 const soul="soul.that-offer-s-expired";
 const free=rate(KI,{super_1:KI}),sealed=rate(KI,{super_1:KI,super_soul:soul});
 assert.equal(sealed.scores.burst_damage,Math.round(free.scores.burst_damage*SEALED_SHARE*10)/10);
 assert.equal(sealed.scores.mobility,free.scores.mobility,"only its damage is cut");
 assert.match(sealed.contributions.find(c=>c.goal==="burst_damage"&&c.value<0&&/seals all skills/.test(c.reason))!.reason,/That offer's expired/);
 // An Evasive is not a Super or an Ultimate: nothing here touches it.
 assert.deepEqual(conditionCuts(get("skill.evasive.chaos-wall"),[get(soul),get(sun)]),[]);
});
test("every cut is a share between 0 and 1 with a reason, and an option alone is never cut", ()=>{
 const others=[get(KI),get("awoken.potential-unleashed"),get("soul.that-offer-s-expired")];
 for(const o of XV2_CATALOG.options){
  assert.deepEqual(conditionCuts(o,[]).filter(c=>!/condition needs|none equipped/.test(c.reason)),[],o.id+" alone");
  for(const c of conditionCuts(o,others.filter(x=>x.id!==o.id))){assert.ok(c.share>=0&&c.share<1,o.id);assert.ok(c.reason.length>=20,o.id);}
 }
});
// MDV_BLOCK:END id="DBX.TEST.CONDITIONS.010" kind="logic" tags="xv2,tests,conditions,loadout"
