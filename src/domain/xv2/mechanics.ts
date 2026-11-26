/**
 * What makes a move worth using besides its damage: how long it takes to come out, how far it
 * reaches, whether it tracks, whether you are protected while using it, whether it holds the target.
 * This module reads those from what the catalog already holds (the community damage tests' range and
 * cast-speed columns, and each record's flags and tags) and never guesses: an axis no source gives is
 * null, and the axes nothing read so far measures at all are listed in UNMEASURED_AXES.
 */
import {damageTestFor,firstFigure,XV2_DAMAGE_TESTS,type DamageTest} from "./damage-tests";
import type {Option} from "./records";
// MDV_BLOCK:BEGIN id="DBX.XV2.MECHANICS.010" intent="Name the mechanical axes of a move and how much a slow windup costs its damage" kind="types" tags="xv2,mechanics,usability"
/** The damage tests' four cast-speed steps, fastest first. The tests give no frame counts. */
export const WINDUPS=["instant","short","medium","long"] as const;
export type Windup=typeof WINDUPS[number];
export const REACHES=["melee","short","medium","long"] as const;
export type Reach=typeof REACHES[number];
export type Mechanics={
 /** Time from input to the attack coming out, as the damage tests class it; null when not tested. */
 windup:Windup|null;
 /** True when the tests list it as a counter: it only comes out when the opponent attacks into it. */
 counter:boolean;
 reach:Reach|null;chargeable:boolean|null;
 /** True when a source says so; null means no source says, never "it doesn't". */
 tracks:boolean|null;armored:boolean|null;invulnerable:boolean|null;holdsTarget:boolean|null;movesYou:boolean|null;
 damage:number|null;kiBars:number|null;damagePerKiBar:number|null;
};
/**
 * MODEL: the share of a move's damage that counts, by windup. A slow move is dodged, blocked or
 * interrupted more often and fits fewer openings, so the same damage is worth less. The steps are a
 * judgment, not a measurement; tune them against play.
 */
export const WINDUP_SHARE:Readonly<Record<Windup,number>>={instant:1,short:0.9,medium:0.75,long:0.6};
/** Axes the owner's specification asks for that no source read so far gives for any skill. */
export const UNMEASURED_AXES=["startup and recovery in frames","commitment and overextension","frame advantage on hit and on block","hitstun and blockstun duration","i-frame and armor windows","hitbox size","cancel windows","Ki gained on hit"] as const;
// MDV_BLOCK:END id="DBX.XV2.MECHANICS.010" kind="types" tags="xv2,mechanics,usability"
// MDV_BLOCK:BEGIN id="DBX.XV2.MECHANICS.020" intent="Read the damage tests' cast-speed and range cells without guessing" kind="logic" tags="xv2,mechanics,parse"
const firstOf=<T extends string>(cell:string,words:readonly T[]):T|null=>{
 const text=cell.toLowerCase();let best:T|null=null,at=Infinity;
 for(const w of words){const i=text.indexOf(w);if(i>=0&&i<at){best=w;at=i;}}
 return best;
};
/** "Short-Long" is short before any charge, which is also the damage figure the tests list first; "Varies" is unknown. */
export const readWindup=(cell:string):Windup|null=>firstOf(cell,WINDUPS);
/** "Melee-Medium" reaches as far as medium. A cell that only says "Vertical" or "Varies" is unknown. */
export const readReach=(cell:string):Reach|null=>{const text=cell.toLowerCase();return [...REACHES].reverse().find(r=>text.includes(r))??null;};
// MDV_BLOCK:END id="DBX.XV2.MECHANICS.020" kind="logic" tags="xv2,mechanics,parse"
// MDV_BLOCK:BEGIN id="DBX.XV2.MECHANICS.030" intent="Collect one option's mechanical profile from its measured row and its recorded flags and tags" kind="logic" tags="xv2,mechanics,profile"
const said=(o:Option,flags:readonly string[],tags:readonly string[]=[]):boolean|null=>
 flags.some(k=>o.flags?.[k]?.status==="known"&&o.flags[k].value===true)||(o.role_tags??[]).some(t=>tags.includes(t.tag))?true:null;
export function mechanicsOf(o:Option,tests:ReadonlyMap<string,DamageTest>=XV2_DAMAGE_TESTS):Mechanics{
 const test=damageTestFor(o as {slot_family?:string;name:string},tests);
 const damage=test?firstFigure(test.damage):null;
 const ki=(o.cost_schedule??[]).filter(c=>c.resource==="ki"&&c.phase==="activation");
 const kiBars=ki.length&&ki.every(c=>c.amount.status==="known")?ki.reduce((n,c)=>n+(c.amount.value??0),0):null;
 return {
  windup:test?readWindup(test.speed):null,counter:!!test&&/counter/i.test(test.speed),
  reach:test?readReach(test.range):null,
  chargeable:test&&test.hold?/^(y|h)/i.test(test.hold):null,
  tracks:said(o,["tracking"],["tracking"]),armored:said(o,["super_armor"]),invulnerable:said(o,["invulnerability"]),
  holdsTarget:said(o,[],["paralysis","hitstun"]),movesYou:said(o,["reposition"],["reposition","gap_close","escape"]),
  damage,kiBars,damagePerKiBar:damage!==null&&kiBars?Math.round(damage/kiBars):null,
 };
}
/** The share of damage that counts for this windup; protection while the move comes out makes a slow one one step safer. */
export function windupShare(m:Mechanics):{share:number;reason:string}|null{
 if(!m.windup)return null;
 const i=WINDUPS.indexOf(m.windup),covered=m.armored||m.invulnerable;
 const step=WINDUPS[covered&&i>0?i-1:i],share=WINDUP_SHARE[step];
 if(share===1)return null;
 return {share,reason:"Cast speed measured as "+m.windup+(covered&&i>0?", with "+(m.invulnerable?"invulnerability":"Super Armor")+" recorded, so it is treated as "+step:"")+": a slower move lands less often, so its damage counts at "+Math.round(share*100)+"% (MODEL)"};
}
/** One plain line for the option's summary: what was measured and what a source says, nothing else. */
export function describeMechanics(m:Mechanics):string{
 const parts=[m.windup?"cast speed "+m.windup+(m.counter?" (a counter)":""):null,m.reach?"range "+m.reach:null,
  m.damage!==null?m.damage.toLocaleString("en-US")+" damage"+(m.damagePerKiBar!==null?" ("+m.damagePerKiBar.toLocaleString("en-US")+" per Ki bar)":""):null,
  m.chargeable?"can be charged or held":null].filter(Boolean);
 const traits=[m.tracks?"tracks":null,m.armored?"Super Armor":null,m.invulnerable?"invulnerable for a time":null,m.holdsTarget?"holds the target":null,m.movesYou?"moves you":null].filter(Boolean);
 return (parts.length?"Measured: "+parts.join(", ")+". ":"")+(traits.length?"Recorded: "+traits.join(", ")+". ":"");
}
// MDV_BLOCK:END id="DBX.XV2.MECHANICS.030" kind="logic" tags="xv2,mechanics,profile"
// MDV_BLOCK:BEGIN id="DBX.XV2.MECHANICS.040" intent="Say what a move's mechanics are worth on mobility, control and survivability, by the same steps the grading rubric uses" kind="logic" tags="xv2,mechanics,goals"
export type MechanicsGoal="mobility"|"control"|"survivability";
export type MechanicsGrade={goal:MechanicsGoal;grade:number;reason:string};
/**
 * MODEL: the grade a move's mechanics earn on the goals they serve, on the rubric's own steps
 * (docs/ingest/catalog/GRADING.md). Only what a source states counts, so a move with nothing
 * recorded earns nothing here rather than a low grade.
 */
export function mechanicsGrades(m:Mechanics):MechanicsGrade[]{
 const out:MechanicsGrade[]=[];
 const far=m.reach==="long"?3:m.reach==="medium"?2:0;
 const reach=far+(far&&m.tracks?1:0);
 const mobility=Math.max(reach,m.tracks?2:0,m.movesYou?2:0);
 if(mobility){
  const why=[far?"measured range "+m.reach+" (it reaches the target without closing in)":null,m.tracks?"it tracks the target":null,m.movesYou?"it moves you":null].filter(Boolean).join("; ");
  out.push({goal:"mobility",grade:mobility,reason:"Mechanics: "+why+" (MODEL)"});
 }
 if(m.holdsTarget||m.counter)out.push({goal:"control",grade:3,reason:"Mechanics: "+[m.holdsTarget?"it holds the target in place":null,m.counter?"the damage tests list it as a counter":null].filter(Boolean).join("; ")+" (MODEL)"});
 const safe=m.invulnerable?3:m.armored||m.counter?2:0;
 if(safe)out.push({goal:"survivability",grade:safe,reason:"Mechanics: "+[m.invulnerable?"invulnerable for a time while using it":null,m.armored?"Super Armor while using it":null,m.counter?"as a counter it answers an incoming attack":null].filter(Boolean).join("; ")+" (MODEL)"});
 return out;
}
// MDV_BLOCK:END id="DBX.XV2.MECHANICS.040" kind="logic" tags="xv2,mechanics,goals"
