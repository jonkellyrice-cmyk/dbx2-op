import test from "node:test";
import assert from "node:assert/strict";
import {contextAllowed,type Build} from "../src/kernel/optimization/contract";
import {exportBuild,importBuild} from "../src/application/optimization/persistence";
import {XV2_ADAPTER} from "../src/domain/xv2/catalog";
import {XV2_CONTEXT} from "../src/domain/xv2/context";
import {coverage} from "../src/application/optimization/evaluate";
import {bestSuperPsc,superPsc,computeStats,levelRow,NO_POINTS,perArrow,perPoint,pointsForResource,pointsPsc,XV2_STAT_TABLE} from "../src/domain/xv2/stats";
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
// MDV_BLOCK:BEGIN id="DBX.TEST.STATS.030" intent="Check that the character's stats change scores the way the model says, and only when the player has stated them" kind="logic" tags="xv2,tests,stats,scoring"
const REAL={archetype:"frieza_race",height:"height.4",body_type:"body.thin",level:"103",points_health:"83",points_ki:"21",points_stamina:"21",points_basic:"125",points_blast:"133"};
const real=(picks:Record<string,string>):Build=>({version:1,level:1,picks:{qq_bang:"qqbang.ice-health-stamina",...picks},context:REAL});
const bare:Build={version:1,level:1,picks:{}};
test("a Super's damage total is 1 + race + body type + points + QQ Bang, and the best possible is 2.15", ()=>{
 const ice={archetype:"frieza_race",body:"thin" as const,points:{...NO_POINTS,blast:133},qq:{...NO_POINTS,blast:3}};
 near(superPsc("ki_blast",ice),1+0.45+0.1+0.266+0.06);near(superPsc("strike",ice),1+0.375);
 near(bestSuperPsc("ki_blast"),1+0.55+0.1+0.4+0.1);near(bestSuperPsc("strike"),2.15);
});
test("damage scores scale with the character's reach for that kind of Super, and say why", ()=>{
 const x4="skill.ultimate.serious-bomb"; // a Ki Blast Ultimate graded 5 on burst with an instant cast, so the unscaled score is 100
 const plain=XV2_ADAPTER.rate(x4,bare),mine=XV2_ADAPTER.rate(x4,real({}));
 assert.equal(plain.scores.burst_damage,100);assert.equal(mine.scores.burst_damage,87.3,"100 x 1.876 / 2.15");
 const why=mine.contributions.find(c=>c.goal==="burst_damage"&&c.value<0)!;
 assert.equal(why.value,-12.7);assert.match(why.reason,/^Your Ki Blast Super damage is 87% of the best/);
 for(const g of ["burst_damage","sustained_damage"] as const)near(mine.contributions.filter(c=>c.goal===g).reduce((n,c)=>n+c.value,0),mine.scores[g],"the reasons add up to the "+g+" score");
 assert.equal(mine.scores.control,plain.scores.control,"only damage goals move");
 // Race and body type are enough for the share; level is not needed, because it multiplies every character alike.
 const some=XV2_ADAPTER.rate(x4,{version:1,level:1,picks:{},context:{archetype:"frieza_race",body_type:"body.thin"}});
 assert.equal(some.scores.burst_damage,72.1,"100 x 1.55 / 2.15");
 // An Awoken Skill or a Super Soul has no damage kind of its own, so it is never scaled.
 assert.deepEqual(XV2_ADAPTER.rate("awoken.turn-golden",real({})).scores,XV2_ADAPTER.rate("awoken.turn-golden",bare).scores);
});
test("a QQ Bang's damage arrows now change what the Supers score", ()=>{
 const mine=XV2_ADAPTER.rate("skill.ultimate.x4-kaioken-kamehameha",real({})).scores.burst_damage;
 const target=XV2_ADAPTER.rate("skill.ultimate.x4-kaioken-kamehameha",real({qq_bang:"qqbang.ranged-target"})).scores.burst_damage;
 assert.ok(target>mine,"Ki Blast +5 beats +3: "+target+" vs "+mine);
});
test("a Ki cost is judged against the character's own Ki gauge once it is known", ()=>{
 const edb="skill.ultimate.emperors-death-beam";
 const plain=XV2_ADAPTER.rate(edb,bare),mine=XV2_ADAPTER.rate(edb,real({}));
 assert.ok(mine.scores.ki_economy>plain.scores.ki_economy,"4 bars out of 7.6 hurts less than 4 out of the default 5");
 assert.ok(mine.contributions.some(c=>c.goal==="ki_economy"&&/of your 7\.6 bars/.test(c.reason)));
 assert.ok(plain.contributions.some(c=>c.goal==="ki_economy"&&/scale 5/.test(c.reason)));
});
test("with the character's stats entered, the two Ultimates still rank the same way", ()=>{
 const base={super_1:"skill.super.death-psycho-bomb",super_2:"skill.super.god-of-destructions-anger",ultimate_1:"skill.ultimate.emperors-death-beam",evasive:"skill.evasive.super-explosive-wave"};
 const x4=coverage(XV2_ADAPTER,real({...base,ultimate_2:"skill.ultimate.x4-kaioken-kamehameha"})),sbc=coverage(XV2_ADAPTER,real({...base,ultimate_2:"skill.ultimate.special-beam-cannon"}));
 assert.ok(sbc.burst_damage>x4.burst_damage&&sbc.control>x4.control,"measured at 3 bars, Special Beam Cannon hits harder");
});
// MDV_BLOCK:END id="DBX.TEST.STATS.030" kind="logic" tags="xv2,tests,stats,scoring"
