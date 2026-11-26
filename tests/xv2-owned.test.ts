import test from "node:test";
import assert from "node:assert/strict";
import {XV2_ADAPTER,XV2_CATALOG} from "../src/domain/xv2/catalog";
import {isOwned,nameKey,XV2_OWNED} from "../src/domain/xv2/owned";
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
 const owned=XV2_CATALOG.options.filter(isOwned).map(o=>o.id).sort();
 assert.deepEqual(owned,["awoken.turn-golden","skill.evasive.chaos-wall","skill.evasive.super-explosive-wave","skill.super.consecutive-energy-blast","skill.super.death-psycho-bomb",
  "skill.super.god-of-destructions-anger","skill.super.innocence-cannon","skill.super.reverse-launcher","skill.ultimate.emperors-death-beam","skill.ultimate.special-beam-cannon",
  "skill.ultimate.x4-kaioken-kamehameha","soul.haaaaa","soul.our-two-strengths"]);
 // Punisher Shield and Blaster Ball weren't on any screenshot; the QQ Bangs have no names to match.
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
