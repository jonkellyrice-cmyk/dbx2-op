import type {GoalInfo,ScoreVector} from "../../../kernel/optimization/contract";
import type {LevelPoint} from "../../../application/optimization/report";
// MDV_BLOCK:BEGIN id="TPL.UI.CHARTS.010" intent="Show any adapter's goal profile as an N-pointed radar that reads on screen and in print" kind="component" tags="optimization,charts,report"
const INK={text:"var(--tpl-ink,#1d2430)",muted:"var(--tpl-muted,#5b6575)",grid:"var(--tpl-grid,#d5dae2)",fill:"rgba(52,91,137,.16)",line:"#345b89"};
const font="system-ui,sans-serif";
export function GoalRadar<G extends string>({goals,scores,size=260}:{goals:readonly GoalInfo<G>[];scores:ScoreVector<G>;size?:number}){
 const c=size/2,r=size/2-44;const n=Math.max(3,goals.length);
 const angle=(i:number)=>-Math.PI/2+i*2*Math.PI/n;
 const at=(i:number,v:number)=>[c+Math.cos(angle(i))*r*v/100,c+Math.sin(angle(i))*r*v/100] as const;
 const ring=(v:number)=>goals.map((_,i)=>at(i,v).join(",")).join(" ");
 const value=(g:G)=>Math.max(0,Math.min(100,scores[g]));
 return <svg viewBox={"0 0 "+size+" "+size} width={size} height={size} role="img" aria-label={"Goal profile: "+goals.map(g=>g.label+" "+Math.round(scores[g.id])).join(", ")}>
  {[25,50,75,100].map(v=><polygon key={v} points={ring(v)} fill="none" stroke={INK.grid} strokeWidth={v===100?1.4:0.8}/>)}
  {goals.map((_,i)=>{const [x,y]=at(i,100);return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke={INK.grid} strokeWidth={0.8}/>;})}
  <polygon points={goals.map((g,i)=>at(i,value(g.id)).join(",")).join(" ")} fill={INK.fill} stroke={INK.line} strokeWidth={2} strokeLinejoin="round"/>
  {goals.map((g,i)=>{const [x,y]=at(i,value(g.id));return <circle key={g.id} cx={x} cy={y} r={3.2} fill={g.color}/>;})}
  {goals.map((g,i)=>{const [x,y]=at(i,126);return <text key={g.id} x={x} y={y} textAnchor="middle" fontFamily={font} fontSize={11}><tspan x={x} fontWeight={700} fill={g.color}>{g.label}</tspan><tspan x={x} dy={13} fill={INK.muted}>{Math.round(scores[g.id])}</tspan></text>;})}
 </svg>;
}
// MDV_BLOCK:END id="TPL.UI.CHARTS.010" kind="component" tags="optimization,charts,report"
// MDV_BLOCK:BEGIN id="TPL.UI.CHARTS.020" intent="Show how each goal grows level by level as small multiples on one shared scale" kind="component" tags="optimization,charts,report,progression"
function Sparkline<G extends string>({goal,curve}:{goal:GoalInfo<G>;curve:readonly LevelPoint<G>[]}){
 const w=200,h=74,l=22,t=16,b=14,maxLevel=Math.max(2,...curve.map(p=>p.level));
 const x=(level:number)=>l+(level-1)/(maxLevel-1)*(w-l-6),y=(v:number)=>t+(1-Math.max(0,Math.min(100,v))/100)*(h-t-b);
 const line=curve.map((p,i)=>(i?"L":"M")+x(p.level).toFixed(1)+","+y(p.coverage[goal.id]).toFixed(1)).join("");
 const last=curve.at(-1);
 return <svg viewBox={"0 0 "+w+" "+h} width="100%" role="img" aria-label={goal.label+" by level: "+curve.map(p=>p.level+" "+Math.round(p.coverage[goal.id])).join(", ")}>
  <text x={l} y={11} fontFamily={font} fontSize={11} fontWeight={700} fill={goal.color}>{goal.label}</text>
  <text x={w-6} y={11} textAnchor="end" fontFamily={font} fontSize={11} fill={INK.text}>{last?Math.round(last.coverage[goal.id]):0}</text>
  {[0,50,100].map(v=><g key={v}><line x1={l} x2={w-6} y1={y(v)} y2={y(v)} stroke={INK.grid} strokeWidth={0.7}/><text x={l-4} y={y(v)+3} textAnchor="end" fontFamily={font} fontSize={7.5} fill={INK.muted}>{v}</text></g>)}
  {curve.length>0&&<path d={line+"L"+x(last!.level)+","+y(0)+"L"+x(curve[0].level)+","+y(0)+"Z"} fill={goal.color} opacity={0.14}/>}
  <path d={line} fill="none" stroke={goal.color} strokeWidth={1.8} strokeLinejoin="round"/>
  {curve.map(p=><text key={p.level} x={x(p.level)} y={h-2} textAnchor="middle" fontFamily={font} fontSize={7.5} fill={INK.muted}>{p.level}</text>)}
 </svg>;
}
export function GoalGrowth<G extends string>({goals,curve}:{goals:readonly GoalInfo<G>[];curve:readonly LevelPoint<G>[]}){
 return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>{goals.map(g=><Sparkline key={g.id} goal={g} curve={curve}/>)}</div>;
}
// MDV_BLOCK:END id="TPL.UI.CHARTS.020" kind="component" tags="optimization,charts,report,progression"
