/** Turning a player's ranking of goals into weights. Game-neutral: works for any adapter's goals. */
import type {Preset} from "../../kernel/optimization/contract";
// MDV_BLOCK:BEGIN id="TPL.APP.WEIGHTS.010" intent="Let a player rank, tie or ignore goals and turn that ranking into weights the engine can sum" kind="logic" tags="optimization,goals,weights"
/** Rank per goal: 1 matters most, equal ranks tie, null or missing means "don't care". */
export type Ranks<G extends string>=Partial<Record<G,number|null>>;
export type Weights<G extends string>=Partial<Record<G,number>>;
/**
 * By default rank 1 of 3 levels weighs 3, rank 2 weighs 2, rank 3 weighs 1. A game can supply its
 * own table instead (`table[r-1]` is the weight of rank r; ranks past its end take its last value).
 * Either way the weights are normalized to sum to 1, and equal ranks weigh the same.
 */
export function weightsFromRanks<G extends string>(ranks:Ranks<G>,table?:readonly number[]):Weights<G>{
 const entries=(Object.entries(ranks) as [G,number|null|undefined][]).filter((e):e is [G,number]=>typeof e[1]==="number"&&e[1]>0);
 if(!entries.length)return {};
 const worst=Math.max(...entries.map(([,r])=>r));
 const raw=entries.map(([g,r])=>[g,table?.length?table[Math.min(r,table.length)-1]:worst+1-r] as const);
 const total=raw.reduce((n,[,w])=>n+w,0);
 return Object.fromEntries(raw.map(([g,w])=>[g,w/total])) as Weights<G>;
}
/** "Damage = Support > Mobility": equal ranks joined by "=", most important first. */
export function describeRanks<G extends string>(ranks:Ranks<G>,label:(goal:G)=>string=g=>g):string{
 const entries=(Object.entries(ranks) as [G,number|null|undefined][]).filter((e):e is [G,number]=>typeof e[1]==="number");
 const levels=[...new Set(entries.map(([,r])=>r))].sort((a,b)=>a-b);
 return levels.map(level=>entries.filter(([,r])=>r===level).map(([g])=>label(g)).join(" = ")).join(" > ")||"nothing ranked";
}
export const ranksFromPreset=<G extends string>(preset:Preset<G>):Ranks<G>=>({...preset.ranks});
/** The same letter grades the kineticist role ranking uses, for "how good is this build for that request". */
export const letterGrade=(percent:number)=>percent>=90?"A":percent>=80?"B":percent>=70?"C":percent>=60?"D":"F";
// MDV_BLOCK:END id="TPL.APP.WEIGHTS.010" kind="logic" tags="optimization,goals,weights"
