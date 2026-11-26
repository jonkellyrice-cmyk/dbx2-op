/** A move's mechanical profile: read from measurements and recorded facts, never guessed, and used to weigh its damage. */
import test from "node:test";
import assert from "node:assert/strict";
import {XV2_ADAPTER,XV2_CATALOG} from "../src/domain/xv2/catalog";
import {describeMechanics,mechanicsOf,readReach,readWindup,windupShare,UNMEASURED_AXES,WINDUP_SHARE,type Mechanics} from "../src/domain/xv2/mechanics";
import type {Build} from "../src/kernel/optimization/contract";
// MDV_BLOCK:BEGIN id="DBX.TEST.MECHANICS.010" intent="Pin how a move's windup, reach and protection are read and how a slow windup lowers its damage score" kind="logic" tags="xv2,tests,mechanics,usability"
const get=(id:string)=>XV2_CATALOG.options.find(o=>o.id===id)!;
const bare:Build={version:1,level:1,picks:{}};
const none:Mechanics={windup:null,counter:false,reach:null,chargeable:null,tracks:null,armored:null,invulnerable:null,holdsTarget:null,movesYou:null,damage:null,kiBars:null,damagePerKiBar:null};
test("cast-speed and range cells are read as written, and an unclear cell is unknown", ()=>{
 assert.equal(readWindup("Instant"),"instant");assert.equal(readWindup("Counter (Instant)"),"instant");
 assert.equal(readWindup("Short-Long"),"short","before any charge, like the damage figure listed first");
 assert.equal(readWindup("Varies based on charge time"),null);assert.equal(readWindup(""),null);
 assert.equal(readReach("Melee-Medium"),"medium");assert.equal(readReach("Short (Vertical)"),"short");assert.equal(readReach("Vertical"),null);
});
test("a profile holds what was measured and what a source says; everything else is null, never false", ()=>{
 const edb=mechanicsOf(get("skill.ultimate.emperors-death-beam"));
 assert.equal(edb.windup,"short");assert.equal(edb.reach!==null,true);assert.equal(edb.damage,20640);
 assert.equal(edb.damagePerKiBar,Math.round(20640/edb.kiBars!));
 // A Power Up has no row in the damage tests: its windup and reach are unknown, not "instant" or "none".
 const pose=mechanicsOf(get("skill.super.fighting-pose-k"));
 assert.equal(pose.windup,null);assert.equal(pose.reach,null);assert.equal(pose.damage,null);assert.equal(pose.armored,true,"its Super Armor is recorded");
 assert.equal(pose.tracks,null,"no source says it tracks, which is not the same as knowing it doesn't");
 // An Awoken Skill or a Super Soul is not a move: nothing is claimed about it.
 assert.deepEqual(mechanicsOf(get("awoken.turn-golden")),none);
 assert.ok(UNMEASURED_AXES.length>0,"the axes no source gives are named, not hidden");
});
test("a slower move's damage counts for less, protection makes it one step safer, and an unmeasured one is untouched", ()=>{
 assert.equal(windupShare({...none,windup:"instant"}),null);assert.equal(windupShare(none),null);
 assert.equal(windupShare({...none,windup:"long"})!.share,WINDUP_SHARE.long);
 assert.equal(windupShare({...none,windup:"long",armored:true})!.share,WINDUP_SHARE.medium);
 assert.ok(WINDUP_SHARE.instant>WINDUP_SHARE.short&&WINDUP_SHARE.short>WINDUP_SHARE.medium&&WINDUP_SHARE.medium>WINDUP_SHARE.long);
 // In the real catalog: every skill with a measured cast speed slower than instant carries the cut as its own reason.
 let cut=0;
 for(const o of XV2_CATALOG.options.filter(o=>o.id.startsWith("skill."))){
  const share=windupShare(mechanicsOf(o)),r=XV2_ADAPTER.rate(o.id,bare);
  const why=r.contributions.filter(c=>/^Cast speed measured as /.test(c.reason));
  if(!share||r.unknown?.includes("burst_damage")||!r.scores.burst_damage){assert.ok(!why.some(c=>c.goal==="burst_damage"),o.id);continue;}
  cut++;assert.ok(why.some(c=>c.goal==="burst_damage"&&c.value<0),o.id+" should say why its burst was cut");
 }
 assert.ok(cut>50,"most measured skills have a cast speed");
 const beam=XV2_ADAPTER.rate("skill.ultimate.emperors-death-beam",bare);
 assert.equal(beam.scores.burst_damage,90,"grade 5 is 100, and a short cast counts at 90%");
 assert.equal(XV2_ADAPTER.rate("skill.ultimate.serious-bomb",bare).scores.burst_damage,100,"an instant cast is not cut");
 // Only the damage goals move.
 assert.equal(beam.contributions.filter(c=>/^Cast speed/.test(c.reason)).every(c=>c.goal==="burst_damage"||c.goal==="sustained_damage"),true);
});
test("the summary states the measured line after where to get it, and says nothing when nothing is known", ()=>{
 assert.equal(describeMechanics(none),"");
 assert.equal(describeMechanics({...none,windup:"short",reach:"medium",damage:3000,kiBars:1,damagePerKiBar:3000,tracks:true}),"Measured: cast speed short, range medium, 3,000 damage (3,000 per Ki bar). Recorded: tracks. ");
 assert.match(XV2_ADAPTER.options.find(o=>o.id==="skill.super.death-psycho-bomb")!.summary,/Measured: cast speed short, range medium, 3,000 damage/);
});
// MDV_BLOCK:END id="DBX.TEST.MECHANICS.010" kind="logic" tags="xv2,tests,mechanics,usability"
