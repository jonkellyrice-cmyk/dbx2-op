/**
 * Placing a build among reference points on measured figures. Game-neutral: the figures and the
 * reference points come from the adapter's optional `benchmarks`.
 */
import type {BenchmarkMetric,Benchmarks,Build} from "../../kernel/optimization/contract";
// MDV_BLOCK:BEGIN id="TPL.APP.PEERS.010" intent="Rank a build's measured figures among reference points without ever treating an unmeasured figure as zero" kind="logic" tags="optimization,benchmarks,comparison"
export type Peer={name:string;value:number;kind:"build"|"peer"};
/** One figure: the build's value and its place (1 = best, ties shared) among every peer that measured it. */
export type PeerMetric={metric:BenchmarkMetric;value:number|null;peers:Peer[];rank:number|null;of:number;average:number|null;unmeasured:string[]};
export function compareToPeers(benchmarks:Benchmarks,build:Build,buildName="This build"):PeerMetric[]{
 const measured=benchmarks.measure(build);
 return benchmarks.metrics.map(metric=>{
  const value=measured[metric.id]??null;
  const known=benchmarks.peers.filter(p=>p.values[metric.id]!==null&&p.values[metric.id]!==undefined);
  const better=(a:number,b:number)=>metric.lowerIsBetter?a-b:b-a;
  const peers:Peer[]=[...known.map(p=>({name:p.name,value:p.values[metric.id] as number,kind:"peer" as const})),...(value===null?[]:[{name:buildName,value,kind:"build" as const}])].sort((a,b)=>better(a.value,b.value)||a.name.localeCompare(b.name));
  const average=known.length?known.reduce((n,p)=>n+(p.values[metric.id] as number),0)/known.length:null;
  // A tie shares the place: the rank counts only peers strictly better than the build.
  const rank=value===null?null:1+known.filter(p=>better(p.values[metric.id] as number,value)<0).length;
  return {metric,value,peers,rank,of:peers.length,average,
   unmeasured:benchmarks.peers.filter(p=>!known.includes(p)).map(p=>p.name)};
 });
}
export const ordinal=(n:number)=>n+(n%100>=11&&n%100<=13?"th":["th","st","nd","rd"][n%10]??"th");
export const metricText=(metric:BenchmarkMetric,value:number)=>(Math.round(value*10)/10)+" "+metric.unit;
// MDV_BLOCK:END id="TPL.APP.PEERS.010" kind="logic" tags="optimization,benchmarks,comparison"
