/** The damage focus: the player ticks the kinds of damage they are building for, and other kinds' damage stops counting. */
import test from "node:test";
import assert from "node:assert/strict";
import {XV2_ADAPTER,XV2_CATALOG} from "../src/domain/xv2/catalog";
import {focusCuts} from "../src/domain/xv2/conditions";
import {damageFocus,XV2_CONTEXT} from "../src/domain/xv2/context";
import {contextAllowed,type Build} from "../src/kernel/optimization/contract";
// MDV_BLOCK:BEGIN id="DBX.TEST.FOCUS.010" intent="Pin that an unticked kind of damage is dropped while everything else an option does is kept" kind="logic" tags="xv2,tests,focus,conditions"
const get=(id:string)=>XV2_CATALOG.options.find(o=>o.id===id)!;
const build=(context:Record<string,string>,picks:Record<string,string>={}):Build=>({version:1,level:1,picks,context});
const rate=(id:string,context:Record<string,string>,picks:Record<string,string>={})=>XV2_ADAPTER.rate(id,build(context,picks));
const KI="skill.super.bending-kamehameha",STRIKE="skill.super.super-dragon-fist";
const BLAST={focus_blast:"yes"},ALL={focus_basic:"yes",focus_strike:"yes",focus_blast:"yes"};
test("the three tick boxes are yes-or-no context fields, and nothing ticked means no choice", ()=>{
 const fields=XV2_CONTEXT.filter(f=>f.toggle);
 assert.deepEqual(fields.map(f=>f.id),["focus_basic","focus_strike","focus_blast"]);
 for(const f of fields){assert.ok(contextAllowed(f,"yes"));assert.ok(contextAllowed(f,""));assert.ok(!contextAllowed(f,"maybe"));assert.ok(f.note);}
 assert.equal(damageFocus(build({})),null);
 assert.deepEqual(damageFocus(build(BLAST)),{basic:false,strike:false,blast:true});
 assert.deepEqual(damageFocus(build(ALL)),{basic:true,strike:true,blast:true});
});
test("a skill of an unticked kind keeps its other scores but its damage counts for nothing", ()=>{
 const open=rate(STRIKE,{}),off=rate(STRIKE,BLAST);
 assert.ok(open.scores.burst_damage>0);assert.equal(off.scores.burst_damage,0);assert.equal(off.scores.sustained_damage,0);
 for(const g of ["ki_economy","control","mobility","survivability","stamina_safety","crowd_handling"] as const)assert.equal(off.scores[g],open.scores[g],g+" is untouched");
 assert.match(off.contributions.find(c=>c.goal==="burst_damage"&&c.value<0&&/not building/.test(c.reason))!.reason,/^You are not building for damage from Strike skills, so its damage is not counted; what else it does still is/);
 // The ticked kind is untouched, and so is everything when all three or none are ticked.
 assert.deepEqual(rate(KI,BLAST).scores,rate(KI,{}).scores);
 assert.deepEqual(rate(STRIKE,ALL).scores,open.scores);
 assert.equal(rate(KI,{focus_strike:"yes"}).scores.burst_damage,0);
 // It is still offered: the focus changes scores, never what can be picked.
 const slot=XV2_ADAPTER.slots(build(BLAST)).find(s=>s.id==="super_1")!;
 assert.ok(XV2_ADAPTER.legalOptions(build(BLAST),slot).some(o=>o.id===STRIKE));
 assert.deepEqual(XV2_ADAPTER.validate(build(BLAST,{super_1:STRIKE})),[]);
});
test("a boost that only helps an unticked kind is dropped; a boost to all attacks is kept", ()=>{
 // A Strike-only Super Soul, in a build that has a Strike skill so only the focus decides.
 const strikeSoul="soul.saiyans-are-a-warrior-race",picks={super_soul:strikeSoul,super_1:STRIKE};
 assert.ok(rate(strikeSoul,{},picks).scores.burst_damage>0);
 assert.equal(rate(strikeSoul,BLAST,picks).scores.burst_damage,0);
 assert.ok(rate(strikeSoul,{focus_strike:"yes"},picks).scores.burst_damage>0);
 // A boost to basic attacks or basic Ki Blasts only counts when basic attacks are ticked.
 const basicSoul="soul.i-came-to-kill-you";
 assert.ok(rate(basicSoul,{focus_basic:"yes"}).scores.sustained_damage>0);
 assert.equal(rate(basicSoul,BLAST).scores.sustained_damage,0);
 // "All attacks" is not one kind.
 const all="soul.you-honestly-thought-you-could-beat-me";
 assert.deepEqual(rate(all,BLAST,{super_soul:all,super_1:KI}).scores,rate(all,{},{super_soul:all,super_1:KI}).scores);
 // An option with no damage of its own kind is never cut by the focus.
 assert.deepEqual(focusCuts(get("skill.super.fighting-pose-k"),{basic:false,strike:false,blast:true}),[]);
 assert.deepEqual(focusCuts(get(STRIKE),null),[]);
});
test("with only Ki Blast ticked, Auto Build's damage comes from Ki Blast skills", async()=>{
 const {autoBuild}=await import("../src/application/optimization/auto-build");
 const {weightsFromRanks}=await import("../src/application/optimization/goal-weights");
 const weights=weightsFromRanks({burst_damage:1,sustained_damage:2,ki_economy:3} as never);
 const start=build({archetype:"frieza_race",acquisition:"owned_only",...BLAST});
 const result=autoBuild(XV2_ADAPTER,start,weights as never).build;
 const skills=["super_1","super_2","super_3","super_4","ultimate_1","ultimate_2"].map(s=>get(result.picks[s]) as unknown as {id:string;classification:string});
 // Any Strike skill that made the build is there for something other than damage.
 for(const s of skills.filter(s=>s.classification==="strike"))assert.equal(XV2_ADAPTER.rate(s.id,result).scores.burst_damage,0,s.id);
 assert.ok(skills.filter(s=>s.classification==="ki_blast").length>=3,"most of its skills are Ki Blast skills");
});
// MDV_BLOCK:END id="DBX.TEST.FOCUS.010" kind="logic" tags="xv2,tests,focus,conditions"
