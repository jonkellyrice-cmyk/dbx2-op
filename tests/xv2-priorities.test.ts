/** The player's ranking decides the build: the first-ranked goal dominates, and depth in it is rewarded. */
import test from "node:test";
import assert from "node:assert/strict";
import {autoBuild} from "../src/application/optimization/auto-build";
import {coverage,ENGINE} from "../src/application/optimization/evaluate";
import {weightsFromRanks} from "../src/application/optimization/goal-weights";
import {XV2_DEPTH} from "../src/domain/xv2/adapter";
import {XV2_ADAPTER} from "../src/domain/xv2/catalog";
import {XV2_SCORING} from "../src/domain/xv2/profile";
import {TOY_ADAPTER} from "../src/domain/toy-game/adapter";
import type {Build,OptimizationAdapter} from "../src/kernel/optimization/contract";
// MDV_BLOCK:BEGIN id="DBX.TEST.PRIORITIES.010" intent="Pin that the goal ranked first shapes the loadout, through steep rank weights and stacking that rewards depth" kind="logic" tags="xv2,tests,scoring,priorities"
const build=(picks:Record<string,string>):Build=>({version:1,level:1,picks,context:{archetype:"frieza_race",acquisition:"owned_only",focus_blast:"yes"}});
test("each rank weighs twice the next down to the fifth, so the first-ranked goal is half of the total", ()=>{
 const t=XV2_SCORING.rankWeights;
 for(let i=0;i<4;i++)assert.equal(t[i],2*t[i+1],"rank "+(i+1));
 assert.ok(t.slice(5).every(w=>w>0&&w<t[4]),"the lowest ranks still count, as tie-breakers");
 const w=weightsFromRanks({burst_damage:1,sustained_damage:2,ki_economy:3,stamina_safety:4,control:5,mobility:6,crowd_handling:7,survivability:8},t);
 assert.ok(w.burst_damage!>=0.48&&w.burst_damage!<0.52,String(w.burst_damage));
 assert.ok(w.burst_damage!>w.sustained_damage!+w.ki_economy!,"rank 1 outweighs ranks 2 and 3 together");
});
test("several good options on one goal count for much more than the engine's default allows", ()=>{
 assert.deepEqual(XV2_ADAPTER.depth,XV2_DEPTH);
 for(let i=0;i<XV2_DEPTH.weights.length-1;i++)assert.ok(XV2_DEPTH.weights[i]>XV2_DEPTH.weights[i+1],"each further option counts for less");
 assert.ok(XV2_DEPTH.weights[1]>ENGINE.depthWeights[1]&&XV2_DEPTH.tail>ENGINE.depthTail);
 assert.equal((TOY_ADAPTER as OptimizationAdapter<string>).depth,undefined,"a game that doesn't ask for it keeps the default");
 // A second and third control skill keep raising control, by less each time.
 const one=coverage(XV2_ADAPTER,build({super_1:"skill.super.death-psycho-bomb"})).control;
 const two=coverage(XV2_ADAPTER,build({super_1:"skill.super.death-psycho-bomb",super_2:"skill.super.god-of-destructions-anger"})).control;
 const three=coverage(XV2_ADAPTER,build({super_1:"skill.super.death-psycho-bomb",super_2:"skill.super.god-of-destructions-anger",super_3:"skill.super.time-control"})).control;
 assert.ok(two>one&&three>two,one+" < "+two+" < "+three);assert.ok(two-one>three-two,"with diminishing returns");assert.ok(three<100);
});
test("two different first choices give two different loadouts, each the better one at its own first choice", ()=>{
 const rest=["ki_economy","burst_damage","sustained_damage","stamina_safety","mobility","survivability"];
 const ranks=(first:string,last:string)=>Object.fromEntries([first,...rest,last].map((g,i)=>[g,i+1]));
 const make=(first:string,last:string)=>autoBuild(XV2_ADAPTER,build({}),weightsFromRanks(ranks(first,last) as never,XV2_SCORING.rankWeights) as never).build;
 const control=make("control","crowd_handling"),crowd=make("crowd_handling","control");
 const c=coverage(XV2_ADAPTER,control),k=coverage(XV2_ADAPTER,crowd);
 assert.ok(c.control>k.control+5,"control first: "+c.control+" vs "+k.control);
 assert.ok(k.crowd_handling>c.crowd_handling+5,"crowd first: "+k.crowd_handling+" vs "+c.crowd_handling);
 const skills=["super_1","super_2","super_3","super_4","ultimate_1","ultimate_2"];
 const shared=skills.map(s=>control.picks[s]).filter(id=>skills.some(s=>crowd.picks[s]===id)).length;
 assert.ok(shared<=3,"at most half of the six skills are the same: "+shared);
});
// MDV_BLOCK:END id="DBX.TEST.PRIORITIES.010" kind="logic" tags="xv2,tests,scoring,priorities"
