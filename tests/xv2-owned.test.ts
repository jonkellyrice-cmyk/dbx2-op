import test from "node:test";
import assert from "node:assert/strict";
import {XV2_ADAPTER,XV2_CATALOG} from "../src/domain/xv2/catalog";
import type {Build} from "../src/kernel/optimization/contract";
import {createXv2Adapter} from "../src/domain/xv2/adapter";
import {isOwned,nameKey,XV2_OWNED} from "../src/domain/xv2/owned";
import {NOT_OWNED,TP_ONLY} from "../src/domain/xv2/rules";
import {levelRow} from "../src/domain/xv2/stats";
// MDV_BLOCK:BEGIN id="DBX.TEST.OWNED.010" intent="Keep the owner's inventory well-formed and consistent with the catalog and the stat tables" kind="logic" tags="xv2,tests,owned"
const O=XV2_OWNED;
const all=(slot:keyof typeof O.skills)=>Object.values(O.skills[slot]).flat();
test("the inventory lists each name once per tab, in the game's four skill slots", ()=>{
 assert.deepEqual(Object.keys(O.skills),["super","ultimate","evasive","awoken"]);
 for(const [slot,tabs] of Object.entries(O.skills))for(const [tab,names] of Object.entries(tabs)){
  assert.ok(names.length>0,slot+"/"+tab);assert.equal(new Set(names).size,names.length,slot+"/"+tab+" has a repeated name");
  for(const n of names)assert.equal(n,n.trim());
 }
 assert.equal(new Set(O.super_souls.map(s=>s.name)).size,O.super_souls.length);
 for(const q of O.qq_bangs)for(const k of ["health","ki","stamina","basic","strike","blast"] as const)assert.ok(Number.isInteger(q[k])&&q[k]>=-5&&q[k]<=5);
});
test("everything equipped is in the owned lists", ()=>{
 for(const n of O.equipped.super)assert.ok(all("super").includes(n),n);
 for(const n of O.equipped.ultimate)assert.ok(all("ultimate").includes(n),n);
 assert.ok(all("awoken").includes(O.equipped.awoken));assert.ok(all("evasive").includes(O.equipped.evasive));
 assert.ok(O.super_souls.some(s=>s.name===O.equipped.super_soul));
 const {equipped:_mark,...worn}=O.qq_bangs.find(q=>q.equipped)!;assert.deepEqual(worn,O.equipped.qq_bang);
});
test("the character's points add up to what the stat tables say its level gives", ()=>{
 const c=O.character;const spent=Object.values(c.attribute_points).reduce((n,v)=>n+v,0);
 assert.equal(spent+c.attribute_points_unspent,levelRow(c.level).available,"level "+c.level);
});
test("catalog options are matched to the inventory by name, whatever the case or quotes", ()=>{
 assert.equal(nameKey('"HAAAAA!"'),nameKey("HAAAAA!"));
 // Everything in the catalog is something the owner has, except the three recorded as goals or still to farm.
 const notOwned=XV2_CATALOG.options.filter(o=>!isOwned(o)).map(o=>o.id).sort();
 assert.deepEqual(notOwned,["qqbang.ranged-target","skill.super.blaster-ball","skill.super.punisher-shield"]);
 for(const id of ["awoken.turn-golden","qqbang.ice-health-stamina","skill.evasive.chaos-wall","skill.ultimate.x4-kaioken-kamehameha","soul.haaaaa","soul.our-two-strengths"])assert.ok(isOwned(XV2_CATALOG.options.find(o=>o.id===id)!),id);
 // Punisher Shield and Blaster Ball weren't on any screenshot. A QQ Bang is matched by its arrows: the equipped one is owned, the target isn't.
 assert.ok(!isOwned({id:"skill.super.punisher-shield",name:"Punisher Shield"}));
 // An Evasive and a Super can share a name; each is matched only in its own slot.
 assert.ok(isOwned({id:"skill.super.x",name:"Super Explosive Wave"})&&isOwned({id:"skill.evasive.x",name:"Super Explosive Wave"}));
 assert.ok(!isOwned({id:"skill.ultimate.x",name:"Chaos Wall"}));
 assert.ok(XV2_ADAPTER.options.length>0);
});
test("the equipped QQ Bang in the catalog has the arrows the equipment screen shows", ()=>{
 const q=XV2_CATALOG.options.find(o=>o.id==="qqbang.ice-health-stamina") as unknown as {stat_modifiers:Record<string,{value:number}>};
 const m=q.stat_modifiers,e=O.equipped.qq_bang;
 assert.deepEqual([m.health.value,m.max_ki.value,m.max_stamina.value,m.basic_attack.value,m.strike_supers.value,m.ki_blast_supers.value],[e.health,e.ki,e.stamina,e.basic,e.strike,e.blast]);
});
// MDV_BLOCK:END id="DBX.TEST.OWNED.010" kind="logic" tags="xv2,tests,owned"
// MDV_BLOCK:BEGIN id="DBX.TEST.OWNED.020" intent="Pin how the inventory changes which options a build may use" kind="logic" tags="xv2,tests,owned,acquisition"
const build=(picks:Record<string,string>,acquisition:string):Build=>({version:1,level:1,picks,context:{acquisition}});
const reasons=(picks:Record<string,string>,acquisition:string)=>XV2_ADAPTER.validate(build(picks,acquisition)).map(i=>i.reason);
const offered=(slotId:string,acquisition:string)=>{const b=build({},acquisition);return XV2_ADAPTER.legalOptions(b,XV2_ADAPTER.slots(b).find(s=>s.id===slotId)!).map(o=>o.id);};
test("'Only what I own' offers owned options and flags the rest", ()=>{
 assert.deepEqual(reasons({super_1:"skill.super.death-psycho-bomb",super_soul:"soul.haaaaa",qq_bang:"qqbang.ice-health-stamina"},"owned_only"),[]);
 assert.deepEqual(reasons({super_1:"skill.super.blaster-ball"},"owned_only"),[NOT_OWNED]);
 assert.deepEqual(reasons({qq_bang:"qqbang.ranged-target"},"owned_only"),[NOT_OWNED],"the target QQ Bang is a goal, not something owned");
 const supers=offered("super_1","owned_only");
 assert.ok(supers.includes("skill.super.innocence-cannon")&&!supers.includes("skill.super.punisher-shield"));
 assert.ok(offered("attribute_spread","owned_only").length>0,"attribute spreads aren't things you own, so they stay offered");
});
test("an owned TP-only option is kept by 'except what I own' and still dropped by the strict setting", ()=>{
 const edb={ultimate_1:"skill.ultimate.emperors-death-beam"};
 assert.deepEqual(reasons(edb,"no_tp_unless_owned"),[]);
 assert.deepEqual(reasons(edb,"no_tp_only"),[TP_ONLY]);
 assert.ok(offered("super_soul","no_tp_unless_owned").includes("soul.haaaaa"));
 // With no inventory recorded nothing counts as owned, so the exception never applies.
 const bare=createXv2Adapter(XV2_CATALOG);
 assert.deepEqual(bare.validate(build(edb,"no_tp_unless_owned")).map(i=>i.reason),[TP_ONLY]);
 assert.deepEqual(bare.validate(build({super_1:"skill.super.innocence-cannon"},"owned_only")).map(i=>i.reason),[NOT_OWNED]);
});
// MDV_BLOCK:END id="DBX.TEST.OWNED.020" kind="logic" tags="xv2,tests,owned,acquisition"
