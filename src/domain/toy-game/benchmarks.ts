/**
 * Reference figures for the toy game's comparison section. The pattern to copy: measure the build on
 * concrete, printed numbers (damage, armor, speed), never on the optimizer's own 0-100 scores, and
 * compare with reference points measured the same way. A figure nobody measured is `null`, not 0.
 */
import type {Benchmarks,Build} from "../../kernel/optimization/contract";
import {TOY_BY_ID,TOY_SLOTS} from "./rules";
// MDV_BLOCK:BEGIN id="TPL.TOY.BENCH.010" intent="Record the printed numbers the comparison measures, next to the options they come from" kind="table" tags="toy,benchmarks"
/** Average damage of one use of each attack (1d6 = 3.5). */
const ATTACK_AVERAGE:Readonly<Record<string,number>>={"quick-strike":3.5,"heavy-blow":10.5,"whirlwind":7};
/** Flat damage taken off each hit. */
const REDUCTION:Readonly<Record<string,number>>={"warden":1,"shield-wall":2,"iron-skin":1};
/** Base speed 5 squares, plus these. */
const BASE_SPEED=5;
const SPEED:Readonly<Record<string,number>>={"scout":1,"fleet-foot":2};
// MDV_BLOCK:END id="TPL.TOY.BENCH.010" kind="table" tags="toy,benchmarks"
// MDV_BLOCK:BEGIN id="TPL.TOY.BENCH.020" intent="Measure a build on the same figures as the reference archetypes" kind="logic" tags="toy,benchmarks"
function measureToy(build:Build):Record<string,number|null>{
 const picks=new Set(TOY_SLOTS.filter(s=>s.level<=build.level&&build.picks[s.id]).map(s=>build.picks[s.id]).filter(id=>TOY_BY_ID.has(id)));
 const attacks=[...picks].filter(id=>id in ATTACK_AVERAGE).map(id=>ATTACK_AVERAGE[id]);
 // Sellsword adds +1 per hit; Hunter's Focus adds +2 against a marked target (counted, since the build can mark).
 const bonus=(picks.has("sellsword")?1:0)+(picks.has("hunters-focus")&&picks.has("mark-target")?2:0);
 const sum=(table:Readonly<Record<string,number>>)=>[...picks].reduce((n,id)=>n+(table[id]??0),0);
 return {attack:attacks.length?Math.max(...attacks)+bonus:null,reduction:sum(REDUCTION),speed:BASE_SPEED+sum(SPEED)};
}
export const TOY_BENCHMARKS:Benchmarks={
 title:"How it compares to the reference archetypes",
 caption:"Made-up reference archetypes for the toy game, measured on the same printed numbers. A blank figure was not measured.",
 metrics:[
  {id:"attack",label:"Best attack",unit:"average damage"},
  {id:"reduction",label:"Damage taken off each hit",unit:"points"},
  {id:"speed",label:"Speed",unit:"squares"},
 ],
 peers:[
  {name:"Knight",values:{attack:7,reduction:3,speed:4}},
  {name:"Ranger",values:{attack:8.5,reduction:1,speed:6}},
  {name:"Cleric",values:{attack:4.5,reduction:2,speed:5}},
  {name:"Rogue",values:{attack:9,reduction:0,speed:7}},
  // The reference sheet for the Mage never measured speed: it is left out of that chart, not ranked last.
  {name:"Mage",values:{attack:11,reduction:0,speed:null}},
 ],
 measure:measureToy,
};
// MDV_BLOCK:END id="TPL.TOY.BENCH.020" kind="logic" tags="toy,benchmarks"
