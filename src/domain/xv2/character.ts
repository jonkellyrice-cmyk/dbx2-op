/**
 * Character-creation facts (docs/ingest/catalog/character.json, a DBX2-op extension of the bundle):
 * races and their traits, the four heights and the three body types. They describe the character the
 * player made, so they are context, never equipped options (spec §11). Validated against
 * docs/ingest/schema/character.schema.json by tests/xv2-bundle.test.ts.
 *
 * Their effect on scores (low health, the low-health speed bonus, height and body multipliers) is not
 * modeled yet; v3.1 treats race passives as context modifiers to add later.
 */
import data from "../../../docs/ingest/catalog/character.json";
import type {Evidence,Known} from "./records";
// MDV_BLOCK:BEGIN id="DBX.XV2.CHARACTER.010" intent="Name the shapes of race traits, heights and body types as recorded" kind="types" tags="xv2,character,context"
export type Trait={id:string;kind:"bonus"|"penalty";text:string;property:string;operation:"multiply"|"add"|"chance"|"qualitative";magnitude:Known<number>;condition:string|null;evidence:Evidence};
export type Race={id:string;archetypes:readonly string[];name:string;summary:string;traits:readonly Trait[];spec_ref:string;evidence:Evidence;notes?:string|null};
export type Height={id:string;step:number;label:string;health_multiplier:Known<number>;speed_multiplier:Known<number>;evidence:Evidence;notes?:string|null};
export type BodyType={id:string;name:string;strike_and_basic_damage_bonus:Known<number>;ki_super_damage_bonus:Known<number>;evidence:Evidence;notes?:string|null};
export type CharacterData={version:string;races:readonly Race[];heights:readonly Height[];body_types:readonly BodyType[]};
// MDV_BLOCK:END id="DBX.XV2.CHARACTER.010" kind="types" tags="xv2,character,context"
// MDV_BLOCK:BEGIN id="DBX.XV2.CHARACTER.020" intent="Load the recorded character-creation facts and phrase each height and body type for the player" kind="logic" tags="xv2,character,context"
export const XV2_CHARACTER=data as unknown as CharacterData;
const pct=(k:Known<number>,base=0)=>k.status==="known"&&k.value!==null?Math.round((k.value-base)*1000)/10:null;
const signed=(n:number)=>(n>0?"+":"")+n+"%";
export function heightLabel(h:Height):string{
 const health=pct(h.health_multiplier,1),speed=pct(h.speed_multiplier,1);
 return h.step+" ("+h.label.toLowerCase()+")"+(health!==null&&speed!==null?": "+signed(health)+" health, "+signed(speed)+" speed":"");
}
export function bodyLabel(b:BodyType):string{
 const strike=pct(b.strike_and_basic_damage_bonus),ki=pct(b.ki_super_damage_bonus);
 return b.name+(strike!==null&&ki!==null?": "+signed(strike)+" strike, "+signed(ki)+" Ki Super":"");
}
/** The recorded race for an archetype, if any (only the races entered so far). */
export const raceFor=(archetype:string)=>XV2_CHARACTER.races.find(r=>r.archetypes.includes(archetype));
// MDV_BLOCK:END id="DBX.XV2.CHARACTER.020" kind="logic" tags="xv2,character,context"
