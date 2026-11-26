import test from "node:test";
import assert from "node:assert/strict";
import {contextAllowed,type Build} from "../src/kernel/optimization/contract";
import {exportBuild,importBuild} from "../src/application/optimization/persistence";
import {XV2_ADAPTER} from "../src/domain/xv2/catalog";
import {XV2_CONTEXT} from "../src/domain/xv2/context";
import {computeStats,levelRow,NO_POINTS,perArrow,perPoint,pointsForResource,pointsPsc,XV2_STAT_TABLE} from "../src/domain/xv2/stats";
// MDV_BLOCK:BEGIN id="DBX.TEST.STATS.010" intent="Hold the stat engine to the Stat Calculator v2's tables and the owner's worked values" kind="logic" tags="xv2,tests,stats"
const near=(a:number,b:number,msg?:string)=>assert.ok(Math.abs(a-b)<1e-6*Math.max(1,Math.abs(b)),(msg??"")+": "+a+" vs "+b);
test("the level table has all 199 levels and the calculator's checkpoints", ()=>{
 assert.equal(XV2_STAT_TABLE.levels.length,199);
 for(const [lv,hp,ki,st,dmg] of [[1,210,300,300,0.21],[99,1500,500,500,1.5],[120,1673.653,528.9422,557.8844,1.644711],[199,3000,1000,1000,2.5]]){
  const r=levelRow(lv);near(r.hp,hp,"hp "+lv);near(r.ki,ki,"ki "+lv);near(r.stamina,st,"stamina "+lv);near(r.damage,dmg,"damage "+lv);
 }
 assert.throws(()=>levelRow(0),RangeError);assert.throws(()=>levelRow(200),RangeError);
});
test("the attribute-point formula matches the calculator's coefficient table", ()=>{
 const table:[number,number,number][]=[[0,0,0],[1,0.002,0.0048],[10,0.02,0.048],[20,0.04,0.096],[21,0.042,0.1008],[25,0.05,0.12],[42,0.084,0.2016],[50,0.1,0.24],[75,0.15,0.36],[100,0.2,0.48],[125,0.25,0.6],[150,0.3,0.666667],[175,0.35,0.733333],[200,0.4,0.8]];
 for(const [p,hpd,res] of table){near(pointsPsc("health",p),hpd,"health "+p);near(pointsPsc("blast",p),hpd,"blast "+p);assert.ok(Math.abs(pointsPsc("ki",p)-res)<1e-6,"ki "+p);assert.ok(Math.abs(pointsPsc("stamina",p)-res)<1e-6,"stamina "+p);}
 assert.throws(()=>pointsPsc("ki",201),RangeError);
});
test("value of one point and one QQ Bang arrow at levels 1, 99, 120 and 199", ()=>{
 for(const [lv,hp,ki,st,dmg] of [[1,4.2,1.44,1.44,0.084],[99,30,2.4,2.4,0.6],[120,33.47306,2.538923,2.677845,0.657884],[199,60,4.8,4.8,1]]){
  near(perPoint(lv,"health"),hp,"hp/pt "+lv);near(perPoint(lv,"ki"),ki,"ki/pt "+lv);near(perPoint(lv,"stamina"),st,"st/pt "+lv);near(perPoint(lv,"strike"),dmg,"dmg/pt "+lv);
 }
 near(perPoint(199,"ki",125),1000*0.2/75,"Ki points past 125 are worth less");
 for(const [lv,hp,ki,st,dmg] of [[1,42,24,24,0.84],[99,300,40,40,6],[199,600,80,80,10]]){
  near(perArrow(lv,"health"),hp,"hp/arrow "+lv);near(perArrow(lv,"ki"),ki,"ki/arrow "+lv);near(perArrow(lv,"stamina"),st,"st/arrow "+lv);near(perArrow(lv,"basic"),dmg,"dmg/arrow "+lv);
 }
});
test("points needed for 15 Ki bars at level 199, for each QQ Bang Ki arrow count", ()=>{
 const want:[number,number|null][]=[[5,21],[4,38],[3,55],[2,71],[1,88],[0,105],[-1,121],[-2,148],[-3,178],[-4,null],[-5,null]];
 for(const [q,p] of want)assert.equal(pointsForResource(199,"ki",q),p,"QQ "+q);
 const s=computeStats({level:199,archetype:"frieza_race",height:4,body:"thin",points:{...NO_POINTS,ki:21},qq:{...NO_POINTS,ki:5}});
 near(s.ki_uncapped,1500.8);assert.equal(s.ki,1500,"capped at 15 bars");
});
test("race, height and body type add to the right stats (Ice: Frieza Race, tallest, thin)", ()=>{
 const s=computeStats({level:99,archetype:"frieza_race",height:4,body:"thin",points:NO_POINTS,qq:NO_POINTS});
 near(s.health,1500*(1+0.35+0.1)*10);near(s.ki,500);near(s.stamina,500);
 near(s.basic_attack,1.5*(1+0.525+0)*200);near(s.basic_ki_blast,1.5*(1+0.525+0.1)*200);
 near(s.strike_super,1.5*(1+0.375+0)*200);near(s.ki_blast_super,1.5*(1+0.45+0.1)*200);
 assert.throws(()=>computeStats({level:99,archetype:"frieza_race",height:4,body:"thin",points:{...NO_POINTS,ki:201},qq:NO_POINTS}),RangeError);
 assert.throws(()=>computeStats({level:99,archetype:"frieza_race",height:4,body:"thin",points:NO_POINTS,qq:{...NO_POINTS,ki:6}}),RangeError);
});
// MDV_BLOCK:END id="DBX.TEST.STATS.010" kind="logic" tags="xv2,tests,stats"
// MDV_BLOCK:BEGIN id="DBX.TEST.STATS.020" intent="Check that a build's level, points and QQ Bang reach the stat engine, and that numbers survive saving" kind="logic" tags="xv2,tests,stats,context"
const ice:Build={version:1,level:1,picks:{qq_bang:"qqbang.ice-health-stamina"},context:{archetype:"frieza_race",height:"height.4",body_type:"body.thin",level:"99",points_ki:"42",points_blast:"100"}};
const fact=(b:Build,label:string)=>XV2_ADAPTER.facts!(b).find(f=>f.label===label);
test("the build's level, race, points and QQ Bang arrows give the stats the game hides", ()=>{
 assert.equal(fact(ice,"Health")!.value,"23,250 HP","1500 x (1 + race 0.35 + tallest 0.1 + QQ 0.1) x 10");
 assert.equal(fact(ice,"Max Ki")!.value,"8 bars","500 x (1 + 42 points x 0.0048 + QQ 0.4) = 800.8");
 assert.equal(fact(ice,"Max Stamina")!.value,"7 bars","500 x (1 + QQ 0.4)");
 assert.equal(fact(ice,"Ki Blast Super rating")!.value,"543","1.5 x (1 + 0.2 + race 0.45 + thin 0.1 + QQ 0.06) x 200");
 assert.equal(fact(ice,"Strike Super rating")!.value,"413","412.5, shown to the nearest whole number");
 assert.deepEqual(fact(ice,"Attribute points"),{label:"Attribute points",value:"142 of 375 used",note:"233 left to spend"});
 const over={...ice,context:{...ice.context,points_health:"200",points_strike:"200"}};
 assert.equal(fact(over,"Attribute points")!.note,"167 more than level 99 gives");
});
test("missing inputs are named, never guessed", ()=>{
 const f=XV2_ADAPTER.facts!({version:1,level:1,picks:{},context:{archetype:"frieza_race"}});
 assert.deepEqual(f,[{label:"Stats the game doesn't show",value:"Not worked out yet",note:"set character level, height, body type"}]);
});
test("number fields accept only whole numbers in range, and survive export and import", ()=>{
 const level=XV2_CONTEXT.find(f=>f.id==="level")!,points=XV2_CONTEXT.find(f=>f.id==="points_ki")!;
 for(const ok of ["1","99","199"])assert.ok(contextAllowed(level,ok),ok);
 for(const bad of ["0","200","9.5","-3","abc",""])assert.ok(!contextAllowed(level,bad),bad);
 assert.ok(contextAllowed(points,"0"));assert.ok(!contextAllowed(points,"201"));
 const back=importBuild(XV2_ADAPTER,exportBuild(XV2_ADAPTER,ice));
 assert.deepEqual(back.build.context,ice.context);assert.deepEqual(back.dropped,[]);
 const bad=importBuild(XV2_ADAPTER,exportBuild(XV2_ADAPTER,ice).replace('"99"','"250"'));
 assert.equal(bad.build.context!.level,undefined);assert.deepEqual(bad.dropped,["context level: 250"]);
});
// MDV_BLOCK:END id="DBX.TEST.STATS.020" kind="logic" tags="xv2,tests,stats,context"
