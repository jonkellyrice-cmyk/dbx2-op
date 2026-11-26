import test from "node:test";
import assert from "node:assert/strict";
import {softCap,type Build,type OptimizationAdapter} from "../src/kernel/optimization/contract";
import {buildValue,coverage} from "../src/application/optimization/evaluate";
import {TOY_ADAPTER} from "../src/domain/toy-game/adapter";
import {XV2_ADAPTER} from "../src/domain/xv2/catalog";
import {XV2_COVERAGE_CURVE} from "../src/domain/xv2/adapter";
// MDV_BLOCK:BEGIN id="DBX.TEST.COVERAGE.010" intent="Hold the coverage curve to its promise: stronger loadouts keep scoring higher, and games that don't ask for it are untouched" kind="logic" tags="xv2,tests,scoring,coverage"
const ICE={super_1:"skill.super.death-psycho-bomb",super_2:"skill.super.god-of-destructions-anger",super_3:"skill.super.punisher-shield",super_4:"skill.super.blaster-ball",
 ultimate_1:"skill.ultimate.emperors-death-beam",evasive:"skill.evasive.super-explosive-wave",awoken:"awoken.turn-golden",super_soul:"soul.our-two-strengths",qq_bang:"qqbang.ice-health-stamina"};
const build=(picks:Record<string,string>):Build=>({version:1,level:1,picks,context:{archetype:"frieza_race"}});
const even=Object.fromEntries(XV2_ADAPTER.goals.map(g=>[g.id,1/XV2_ADAPTER.goals.length]));
test("the curve rises all the way and never reaches 100", ()=>{
 const c=softCap(80);
 assert.equal(c(0),0);assert.equal(c(-5),0);
 for(const [stacked,about] of [[60,53],[100,71],[135,82],[185,90]])assert.equal(Math.round(c(stacked)),about,"stacked "+stacked);
 for(let s=0;s<600;s+=7)assert.ok(c(s+7)>c(s)&&c(s+7)<100,"at "+s);
});
test("Ice's two Ultimates no longer tie: the harder-hitting one scores higher on burst", ()=>{
 const x4=coverage(XV2_ADAPTER,build({...ICE,ultimate_2:"skill.ultimate.x4-kaioken-kamehameha"}));
 const sbc=coverage(XV2_ADAPTER,build({...ICE,ultimate_2:"skill.ultimate.special-beam-cannon"}));
 // Measured at their base cost of 3 bars: Special Beam Cannon 8,400, x4 Kaioken Kamehameha 6,030 (9,690 only with a 4th bar).
 assert.ok(sbc.burst_damage>x4.burst_damage,sbc.burst_damage+" vs "+x4.burst_damage);
 assert.ok(sbc.control>x4.control,"and the unblockable one on control: "+sbc.control+" vs "+x4.control);
 for(const g of XV2_ADAPTER.goals)assert.ok(x4[g.id]<100&&sbc[g.id]<100,g.id);
});
test("adding a pick never lowers a goal, and build value stays within 0 to 100", ()=>{
 const picks=Object.entries(ICE);
 for(let n=1;n<=picks.length;n++){
  const less=coverage(XV2_ADAPTER,build(Object.fromEntries(picks.slice(0,n-1)))),more=coverage(XV2_ADAPTER,build(Object.fromEntries(picks.slice(0,n))));
  for(const g of XV2_ADAPTER.goals)assert.ok(more[g.id]>=less[g.id],g.id+" after "+picks[n-1][1]);
 }
 const v=buildValue(XV2_ADAPTER,build(ICE),even);assert.ok(v>0&&v<100,String(v));
});
test("the curve is opt-in: Xenoverse 2 uses it, the toy game still cuts off at 100", ()=>{
 assert.equal(XV2_ADAPTER.coverageCurve,XV2_COVERAGE_CURVE);
 assert.equal((TOY_ADAPTER as OptimizationAdapter<string>).coverageCurve,undefined);
});
// MDV_BLOCK:END id="DBX.TEST.COVERAGE.010" kind="logic" tags="xv2,tests,scoring,coverage"
