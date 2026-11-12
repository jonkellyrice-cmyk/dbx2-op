import {metricText,type PeerMetric} from "../../../application/optimization/peer-comparison";
// MDV_BLOCK:BEGIN id="TPL.UI.COMPARE.010" intent="Mark the build apart from the reference points in every comparison chart, in screen and print colors" kind="config" tags="optimization,benchmarks,charts,print"
const INK={text:"var(--tpl-ink,#1d2430)",muted:"var(--tpl-muted,#5b6575)",grid:"var(--tpl-grid,#d5dae2)",rule:"var(--tpl-rule,#b8c0cc)",accent:"var(--tpl-accent,#345b89)"};
const font="system-ui,sans-serif";
// Values print with their unit ("3 points", "7 squares") so a figure is never mistaken for a placing.
// MDV_BLOCK:END id="TPL.UI.COMPARE.010" kind="config" tags="optimization,benchmarks,charts,print"
// MDV_BLOCK:BEGIN id="TPL.UI.COMPARE.020" intent="Show the build's place among every reference point on one figure, with the reference average marked" kind="component" tags="optimization,benchmarks,charts"
export function PeerBars({metric}:{metric:PeerMetric}){
 const row=15,l=110,r=90,w=640,top=4;const h=top+metric.peers.length*row+4;const max=Math.max(1,...metric.peers.map(p=>p.value));
 const x=(v:number)=>l+v/max*(w-l-r);
 return <svg viewBox={"0 0 "+w+" "+h} width="100%" role="img" aria-label={metric.metric.label+": "+metric.peers.map(p=>p.name+" "+metricText(metric.metric,p.value)).join(", ")}>
  {metric.peers.map((p,i)=>{const y=top+i*row;const strong=p.kind==="build";
   return <g key={p.name}><text x={l-6} y={y+10.5} textAnchor="end" fontFamily={font} fontSize={10} fontWeight={strong?700:400} fill={strong?INK.text:INK.muted}>{p.name}</text>
    <rect x={l} y={y+2} width={Math.max(1,x(p.value)-l)} height={row-4} rx={2} fill={strong?INK.accent:INK.grid}/>
    <text x={x(p.value)+4} y={y+10.5} fontFamily={font} fontSize={9.5} fontWeight={strong?700:400} fill={strong?INK.text:INK.muted}>{metricText(metric.metric,p.value)}</text></g>;})}
  {metric.average!==null&&<line x1={x(metric.average)} x2={x(metric.average)} y1={top} y2={h-2} stroke={INK.muted} strokeWidth={0.8} strokeDasharray="3 2"/>}
 </svg>;
}
// MDV_BLOCK:END id="TPL.UI.COMPARE.020" kind="component" tags="optimization,benchmarks,charts"
// MDV_BLOCK:BEGIN id="TPL.UI.COMPARE.030" intent="Show a secondary figure as one line of reference dots with the build's place called out" kind="component" tags="optimization,benchmarks,charts"
export function RankStrip({metric}:{metric:PeerMetric}){
 const w=640,h=46,l=8,r=8,mid=24;const vals=metric.peers.map(p=>p.value);const lo=Math.min(...vals),hi=Math.max(...vals);const span=hi-lo||1;
 // Lower-is-better figures run right to left, so the right end is always the strong end.
 const x=(v:number)=>l+(metric.metric.lowerIsBetter?(hi-v):(v-lo))/span*(w-l-r);
 const mark=metric.peers.find(p=>p.kind==="build");const others=metric.peers.filter(p=>p!==mark);const best=others[0],worst=others[others.length-1];
 const label=(px:number)=>Math.min(w-r-80,Math.max(l+80,px));
 return <svg viewBox={"0 0 "+w+" "+h} width="100%" role="img" aria-label={metric.metric.label+" ("+metric.metric.unit+"): "+metric.peers.map(p=>p.name+" "+metricText(metric.metric,p.value)).join(", ")}>
  <line x1={l} x2={w-r} y1={mid} y2={mid} stroke={INK.rule} strokeWidth={1}/>
  {others.map(p=><circle key={p.name} cx={x(p.value)} cy={mid} r={3.6} fill={INK.grid} stroke={INK.rule} strokeWidth={0.6}/>)}
  {metric.average!==null&&<line x1={x(metric.average)} x2={x(metric.average)} y1={mid-7} y2={mid+7} stroke={INK.muted} strokeWidth={1.2}/>}
  {mark&&<><circle cx={x(mark.value)} cy={mid} r={5.5} fill={INK.accent} stroke="#fff" strokeWidth={1.5}/><text x={label(x(mark.value))} y={mid-10} textAnchor="middle" fontFamily={font} fontSize={9.5} fontWeight={700} fill={INK.text}>{mark.name+": "+metricText(metric.metric,mark.value)}</text></>}
  {worst&&<text x={l} y={h-4} fontFamily={font} fontSize={8.5} fill={INK.muted}>{"weakest: "+worst.name+" "+metricText(metric.metric,worst.value)}</text>}
  {best&&<text x={w-r} y={h-4} textAnchor="end" fontFamily={font} fontSize={8.5} fill={INK.muted}>{"strongest"+(mark&&metric.rank===1?" other":"")+": "+best.name+" "+metricText(metric.metric,best.value)}</text>}
 </svg>;
}
// MDV_BLOCK:END id="TPL.UI.COMPARE.030" kind="component" tags="optimization,benchmarks,charts"
