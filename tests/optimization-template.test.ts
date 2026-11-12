import assert from "node:assert/strict";
import {test} from "node:test";
import type {Build,OptimizationAdapter} from "../src/kernel/optimization/contract";
import {TOY_ADAPTER} from "../src/domain/toy-game/adapter";
import {describeRanks,weightsFromRanks} from "../src/application/optimization/goal-weights";
import {buildValue,rateInBuild} from "../src/application/optimization/evaluate";
import {checkBlockers,unknownGoals} from "../src/application/optimization/requirements";
import {recommend} from "../src/application/optimization/recommend";
import {autoBuild} from "../src/application/optimization/auto-build";
import {buildReport} from "../src/application/optimization/report";
import {compareToPeers} from "../src/application/optimization/peer-comparison";
import {exportBuild,importBuild} from "../src/application/optimization/persistence";
// MDV_BLOCK:BEGIN id="TPL.TEST.CONTRACT.010" intent="Hold every adapter to the contract the engine relies on; a new target is added to this list" kind="logic" tags="optimization,tests,contract"
/** Add every new adapter here. These checks are what the generic engine assumes. */
const ADAPTERS:OptimizationAdapter<string>[]=[TOY_ADAPTER as OptimizationAdapter<string>];
const empty=(adapter:OptimizationAdapter<string>):Build=>({version:1,level:adapter.maxLevel,picks:{}});
for(const adapter of ADAPTERS){
 test(adapter.id+": legalOptions agrees with validate", ()=>{
  const build=empty(adapter);
  for(const slot of adapter.slots(build))for(const option of adapter.legalOptions(build,slot))
   assert.deepEqual(adapter.validate({...build,picks:{[slot.id]:option.id}}),[],option.id+" offered in "+slot.id+" but rejected");
 });
 test(adapter.id+": every point of every score has a reason", ()=>{
  for(const option of adapter.options){
   const rating=adapter.rate(option.id,empty(adapter));
   for(const goal of adapter.goals){
    const sum=rating.contributions.filter(c=>c.goal===goal.id).reduce((n,c)=>n+c.value,0);
    assert.equal(rating.scores[goal.id],Math.max(0,Math.min(100,Math.round(sum*10)/10)),option.id+" "+goal.id);
   }
   assert.ok(rating.contributions.every(c=>c.reason.trim().length>0));
  }
 });
 test(adapter.id+": relations don't depend on argument order", ()=>{
  for(const a of adapter.options)for(const b of adapter.options){
   const key=(r:{goal:string;weight:number;kind:string})=>r.kind+":"+r.goal+":"+r.weight;
   assert.deepEqual(adapter.relations(a.id,b.id).map(key).sort(),adapter.relations(b.id,a.id).map(key).sort(),a.id+" / "+b.id);
  }
 });
 test(adapter.id+": benchmarks, if any, measure every metric they declare", ()=>{
  if(!adapter.benchmarks)return;
  const measured=adapter.benchmarks.measure(empty(adapter));
  for(const m of adapter.benchmarks.metrics)assert.ok(m.id in measured,m.id+" is declared but never measured");
 });
 test(adapter.id+": unknown goals are real goals, and presets name only blockers that exist", ()=>{
  const goals=new Set(adapter.goals.map(g=>g.id));
  for(const option of adapter.options)for(const g of adapter.rate(option.id,empty(adapter)).unknown??[])assert.ok(goals.has(g),option.id+" marks unknown goal "+g);
  const blockers=new Set((adapter.blockers??[]).map(b=>b.id));
  for(const preset of adapter.presets)for(const b of preset.blockers??[])assert.ok(blockers.has(b),preset.id+" names missing blocker "+b);
 });
 test(adapter.id+": every preset auto-builds a complete, legal build", ()=>{
  for(const preset of adapter.presets){
   const result=autoBuild(adapter,empty(adapter),weightsFromRanks(preset.ranks));
   assert.deepEqual(result.issues,[],preset.id);
   assert.equal(Object.keys(result.build.picks).length,adapter.slots(result.build).length,preset.id+" left a slot open");
  }
 });
}
// MDV_BLOCK:END id="TPL.TEST.CONTRACT.010" kind="logic" tags="optimization,tests,contract"
// MDV_BLOCK:BEGIN id="TPL.TEST.ENGINE.010" intent="Pin the engine behaviors the toy game was written to demonstrate" kind="logic" tags="optimization,tests,toy"
const toy=(picks:Record<string,string>,level=5):Build=>({version:1,level,picks});
const slot=(id:string)=>TOY_ADAPTER.slots(toy({})).find(s=>s.id===id)!;
test("goal ranks become weights: ties weigh the same and weights sum to 1", ()=>{
 const w=weightsFromRanks({Damage:1,Support:1,Mobility:2,Defense:null});
 assert.equal(w.Damage,w.Support);assert.ok(w.Damage!>w.Mobility!);assert.equal(w.Defense,undefined);
 assert.ok(Math.abs(Object.values(w).reduce((n,v)=>n+(v??0),0)-1)<1e-9);
 assert.equal(describeRanks({Damage:1,Support:1,Mobility:2}),"Damage = Support > Mobility");
});
test("a prerequisite counts only if taken by the dependent pick's level", ()=>{
 assert.ok(TOY_ADAPTER.validate(toy({talent3:"hunters-focus"})).length>0);
 // Mark Target at level 4 can't legalize a level-3 Hunter's Focus.
 assert.ok(TOY_ADAPTER.validate(toy({talent3:"hunters-focus",technique4:"mark-target"})).some(i=>i.slotId==="talent3"));
 assert.deepEqual(TOY_ADAPTER.validate(toy({technique2:"mark-target",talent3:"hunters-focus"})),[]);
});
test("exclusions work in both directions", ()=>{
 assert.ok(TOY_ADAPTER.validate(toy({talent3:"fleet-foot",signature5:"bulwark-stance"})).length>0);
 assert.ok(!TOY_ADAPTER.legalOptions(toy({talent3:"fleet-foot"}),slot("signature5")).some(o=>o.id==="bulwark-stance"));
});
test("recommendations evaluate every legal option and explain synergy with existing picks", ()=>{
 const build=toy({technique2:"mark-target"});const weights=weightsFromRanks({Damage:1});
 const result=recommend(TOY_ADAPTER,build,slot("talent3"),weights);
 assert.equal(result.diagnostics.evaluatedCandidates,TOY_ADAPTER.legalOptions(build,slot("talent3")).length);
 assert.equal(result.ranked[0].option.id,"hunters-focus");
 assert.ok(result.ranked[0].reasons.some(r=>r.includes("Mark Target")),"the payoff names its setup");
});
test("removing a prerequisite is reported as breaking the later pick, not hidden", ()=>{
 const build=toy({technique2:"mark-target",talent3:"hunters-focus"});
 const dash=recommend(TOY_ADAPTER,build,slot("technique2"),weightsFromRanks({Mobility:1})).ranked.find(r=>r.option.id==="dash");
 assert.ok(dash?.breaks.some(b=>b.startsWith("talent3")));
});
test("auto build keeps the player's own picks and only improves the slots it filled", ()=>{
 const start=toy({origin:"hearthkeeper"});const weights=weightsFromRanks({Damage:1});
 const result=autoBuild(TOY_ADAPTER,start,weights);
 assert.equal(result.build.picks.origin,"hearthkeeper");
 assert.ok(!result.filled.includes("origin"));
 assert.ok(buildValue(TOY_ADAPTER,result.build,weights)>buildValue(TOY_ADAPTER,start,weights));
});
test("the report covers every level and slot, and only calls requested goals gaps", ()=>{
 const weights=weightsFromRanks({Damage:1});
 const build=autoBuild(TOY_ADAPTER,toy({},4),weights).build;
 const report=buildReport(TOY_ADAPTER,build,weights,"Damage");
 assert.equal(report.curve.length,4);
 assert.equal(report.choices.length,TOY_ADAPTER.slots(build).length);
 assert.ok(report.gaps.every(g=>g==="Damage"));
 assert.ok(report.sections.length>=3&&report.headline.length>0);
});
test("lookahead finds a setup that only pays off with a later pick", ()=>{
 const result=autoBuild(TOY_ADAPTER,toy({}),weightsFromRanks({Damage:1}));
 assert.equal(result.build.picks.technique2,"mark-target");
 assert.equal(result.build.picks.talent3,"hunters-focus");
 // Greedy chose something else first; the pair search is what changed it.
 assert.ok(result.refined.some(r=>r.slotId==="technique2"&&r.to==="mark-target"));
 assert.deepEqual(result.issues,[]);
});
test("peer comparison ranks among measured peers only and never treats unmeasured as zero", ()=>{
 const benchmarks=TOY_ADAPTER.benchmarks!;
 const metrics=compareToPeers(benchmarks,toy({origin:"scout",talent3:"fleet-foot"}));
 const speed=metrics.find(m=>m.metric.id==="speed")!;
 assert.equal(speed.value,8);assert.equal(speed.rank,1);
 assert.deepEqual(speed.unmeasured,["Mage"]);
 assert.ok(!speed.peers.some(p=>p.name==="Mage"));
 assert.equal(speed.of,benchmarks.peers.length);
 // A tie shares the place: 3 points ties the Knight for 1st.
 const reduction=compareToPeers(benchmarks,toy({origin:"warden",technique1:"shield-wall"})).find(m=>m.metric.id==="reduction")!;
 assert.equal(reduction.value,3);assert.equal(reduction.rank,1);
 // No attack picked: the build's figure is unknown, so it has no rank rather than a last place.
 const attack=metrics.find(m=>m.metric.id==="attack")!;
 assert.equal(attack.value,null);assert.equal(attack.rank,null);
});
test("build files round-trip, are checked against the adapter and drop unknown entries", ()=>{
 const build=autoBuild(TOY_ADAPTER,toy({}),weightsFromRanks({Defense:1})).build;
 assert.deepEqual(importBuild(TOY_ADAPTER,exportBuild(TOY_ADAPTER,build)),{build,dropped:[]});
 const file=JSON.parse(exportBuild(TOY_ADAPTER,build));
 assert.throws(()=>importBuild(TOY_ADAPTER,JSON.stringify({...file,format:"other-game"})),/not toy-skirmish/);
 assert.throws(()=>importBuild(TOY_ADAPTER,JSON.stringify({...file,level:99})),/Level must be/);
 assert.throws(()=>importBuild(TOY_ADAPTER,"x".repeat(100_001)),/100 KB/);
 const {build:loaded,dropped}=importBuild(TOY_ADAPTER,JSON.stringify({...file,picks:{...file.picks,ghost:"dash",origin:"no-such-option"}}));
 assert.deepEqual(dropped.sort(),["ghost: dash","origin: no-such-option"]);
 assert.equal(loaded.picks.origin,undefined);
});
// MDV_BLOCK:END id="TPL.TEST.ENGINE.010" kind="logic" tags="optimization,tests,toy"
// MDV_BLOCK:BEGIN id="TPL.TEST.ENGINE.020" intent="Pin the honesty rules: unconfirmed relations don't score, unjudged goals aren't weaknesses, requirements are checked" kind="logic" tags="optimization,tests,unknowns,blockers"
test("a candidate relation is explained but adds nothing until confirmed", ()=>{
 const alone=TOY_ADAPTER.rate("second-wind",toy({})).scores.Support;
 const rating=rateInBuild(TOY_ADAPTER,"second-wind",toy({technique2:"second-wind",signature5:"bulwark-stance"}),"technique2");
 assert.equal(rating.scores.Support,alone);
 const note=rating.contributions.find(c=>c.condition?.startsWith("candidate "));
 assert.ok(note&&note.value===0&&note.condition!.includes("Bulwark Stance"),"the candidate is shown with its partner and counts 0");
});
test("an unjudged goal is reported as unknown, not as a weakness", ()=>{
 const build=toy({talent3:"iron-skin"});
 assert.deepEqual(unknownGoals(TOY_ADAPTER,build),[{goal:"Support",options:["Iron Skin"]}]);
 const report=buildReport(TOY_ADAPTER,build,weightsFromRanks({Support:1}),"Support");
 assert.ok(report.sections.some(s=>s.title==="What isn't known yet"&&s.paragraphs[0].includes("Iron Skin")));
});
test("a preset's blockers are checked: fail, pass, and none without a preset", ()=>{
 assert.deepEqual(checkBlockers(TOY_ADAPTER,toy({technique1:"quick-strike"}),"bodyguard").map(b=>b.result),["fail"]);
 assert.deepEqual(checkBlockers(TOY_ADAPTER,toy({technique1:"shield-wall"}),"bodyguard").map(b=>b.result),["pass"]);
 assert.deepEqual(checkBlockers(TOY_ADAPTER,toy({technique1:"quick-strike"}),null),[]);
 const report=buildReport(TOY_ADAPTER,toy({technique1:"quick-strike"}),weightsFromRanks({Defense:1}),"Defense","bodyguard");
 assert.ok(report.sections.some(s=>s.title==="Requirements for this request"&&s.paragraphs[0].includes("NOT MET")));
});
// MDV_BLOCK:END id="TPL.TEST.ENGINE.020" kind="logic" tags="optimization,tests,unknowns,blockers"
