"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import type {Build,OptimizationAdapter} from "../../../kernel/optimization/contract";
import {describeRanks,ranksFromPreset,weightsFromRanks,type Ranks} from "../../../application/optimization/goal-weights";
import {buildValue,coverage} from "../../../application/optimization/evaluate";
import {recommend} from "../../../application/optimization/recommend";
import {autoBuild} from "../../../application/optimization/auto-build";
import {exportBuild,importBuild} from "../../../application/optimization/persistence";
import {checkBlockers} from "../../../application/optimization/requirements";
import {GoalRadar} from "./goal-charts";
import {ReportDocument} from "./report-document";
// MDV_BLOCK:BEGIN id="TPL.UI.EXPLORER.010" intent="Remember the request and build per adapter across reloads, without trusting what storage returns" kind="logic" tags="optimization,ui,persistence"
type Saved<G extends string>={ranks:Ranks<G>;build:Build};
const storageKey=(id:string)=>"tpl-optimizer-"+id+"-v1";
function load<G extends string>(adapter:OptimizationAdapter<G>):Saved<G>|null{
 try{
  const raw=JSON.parse(localStorage.getItem(storageKey(adapter.id))??"null");
  if(!raw||raw.build?.version!==1||typeof raw.build.level!=="number"||typeof raw.build.picks!=="object")return null;
  const ids=new Set(adapter.options.map(o=>o.id));
  const picks=Object.fromEntries(Object.entries(raw.build.picks as Record<string,unknown>).filter((e):e is [string,string]=>typeof e[1]==="string"&&ids.has(e[1])));
  return {ranks:raw.ranks??{},build:{version:1,level:Math.max(1,Math.min(adapter.maxLevel,Math.round(raw.build.level))),picks}};
 }catch{return null;}
}
// MDV_BLOCK:END id="TPL.UI.EXPLORER.010" kind="logic" tags="optimization,ui,persistence"
// MDV_BLOCK:BEGIN id="TPL.UI.EXPLORER.020" intent="Walk the player through request, build and report for any adapter, with every recommendation explained" kind="component" tags="optimization,ui"
export function OptimizerTemplate<G extends string>({adapter}:{adapter:OptimizationAdapter<G>}){
 const empty:Build={version:1,level:adapter.maxLevel,picks:{}};
 const [ranks,setRanks]=useState<Ranks<G>>(()=>adapter.presets[0]?ranksFromPreset(adapter.presets[0]):{});
 // The preset in use, for its hard requirements; editing the ranks by hand makes it a custom request.
 const [presetId,setPresetId]=useState<string|null>(adapter.presets[0]?.id??null);
 const [build,setBuild]=useState<Build>(empty);
 const [status,setStatus]=useState("");
 const [showReport,setShowReport]=useState(false);
 // Storage is read after mount so the server and first client render match (no hydration warnings).
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{const saved=load(adapter);if(saved){setRanks(saved.ranks);setBuild(saved.build);}setLoaded(true);},[adapter]);
 useEffect(()=>{if(loaded)try{localStorage.setItem(storageKey(adapter.id),JSON.stringify({ranks,build}));}catch{}},[adapter.id,loaded,ranks,build]);
 const weights=useMemo(()=>weightsFromRanks(ranks),[ranks]);
 const request=describeRanks(ranks,g=>adapter.goals.find(x=>x.id===g)?.label??g);
 const slots=adapter.slots(build);
 const profile=useMemo(()=>coverage(adapter,build),[adapter,build]);
 const value=useMemo(()=>buildValue(adapter,build,weights),[adapter,build,weights]);
 const issues=useMemo(()=>adapter.validate(build),[adapter,build]);
 const unmet=useMemo(()=>checkBlockers(adapter,build,presetId).filter(b=>b.result!=="pass"),[adapter,build,presetId]);
 const advice=useMemo(()=>Object.fromEntries(slots.map(s=>[s.id,recommend(adapter,build,s,weights).ranked.slice(0,3)])),[adapter,build,weights,slots]);
 const closeReport=useCallback(()=>setShowReport(false),[]);
 const pick=(slotId:string,id:string)=>setBuild(b=>{const picks={...b.picks};if(id)picks[slotId]=id;else delete picks[slotId];return {...b,picks};});
 const panel={border:"1px solid var(--line)",background:"var(--panel)",padding:16,borderRadius:8,margin:"12px 0"} as const;
 return <section className="tpl-root" style={{padding:"20px 0 60px"}} aria-label="Optimization template">
  <h1 style={{fontSize:"clamp(1.6rem,4vw,2.6rem)"}}>{adapter.title}</h1>
  <p className="lede">Template example. This screen runs the generic engine against a made-up toy game. To build a real optimizer, replace <code>src/domain/toy-game</code> with your game and pass its adapter here; see <code>docs/OPTIMIZATION_TEMPLATE.md</code>.</p>

  <div style={panel} role="region" aria-label="Step 1: request">
   <h2>1 · What should the build be good at?</h2>
   <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>{adapter.presets.map(p=><button type="button" key={p.id} title={p.note} onClick={()=>{setRanks(ranksFromPreset(p));setPresetId(p.id);}} style={{padding:"7px 12px",borderRadius:8,border:"1px solid #526780",background:"#1d2a3c",cursor:"pointer"}}>{p.name}</button>)}</div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>{adapter.goals.map(g=><label key={g.id}><span>{g.label}</span>
    <select aria-label={"Rank "+g.label} value={ranks[g.id]??""} onChange={e=>{setRanks(r=>({...r,[g.id]:e.target.value?Number(e.target.value):null}));setPresetId(null);}}>
     <option value="">Don't care</option>{adapter.goals.map((_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label>)}</div>
   <p className="muted" style={{marginTop:10}}>Request: <strong data-testid="request">{request}</strong> (1 matters most; equal numbers tie)</p>
  </div>

  <div style={panel} role="region" aria-label="Step 2: build">
   <h2>2 · Build it</h2>
   <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"end"}}>
    <label style={{width:120}}><span>Level</span><input aria-label="Level" type="number" min={1} max={adapter.maxLevel} value={build.level} onChange={e=>setBuild(b=>({...b,level:Math.max(1,Math.min(adapter.maxLevel,Number(e.target.value)||1))}))} style={{width:"100%",padding:10,background:"#0c1219",color:"#fff",border:"1px solid #394858",borderRadius:4}}/></label>
    <button type="button" onClick={()=>{const r=autoBuild(adapter,build,weights);setBuild(r.build);setStatus("Filled "+r.filled.length+" open slot(s)"+(r.refined.length?", then improved "+r.refined.length+" with hindsight":"")+". "+(r.issues.length?r.issues.length+" rule(s) broken.":"All picks are legal."));}} style={{padding:"10px 16px",borderRadius:8,background:"#345b89",border:"1px solid #526780",cursor:"pointer"}}>Auto Build</button>
    <button type="button" onClick={()=>{setBuild(empty);setStatus("Build cleared.");}} style={{padding:"10px 16px",borderRadius:8,background:"#1d2a3c",border:"1px solid #526780",cursor:"pointer"}}>Reset</button>
    <button type="button" onClick={()=>setShowReport(true)} style={{padding:"10px 16px",borderRadius:8,background:"#1d2a3c",border:"1px solid #526780",cursor:"pointer"}}>Build report / PDF</button>
    <button type="button" onClick={()=>{const url=URL.createObjectURL(new Blob([exportBuild(adapter,build)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=adapter.id+"-build.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);}} style={{padding:"10px 16px",borderRadius:8,background:"#1d2a3c",border:"1px solid #526780",cursor:"pointer"}}>Export build</button>
    <label style={{padding:"10px 16px",borderRadius:8,background:"#1d2a3c",border:"1px solid #526780",cursor:"pointer"}}>Import build<input aria-label="Import build" type="file" accept="application/json,.json" hidden onChange={async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;
     try{const r=importBuild(adapter,await file.text());setBuild(r.build);setStatus("Imported "+file.name+(r.dropped.length?"; dropped unknown entries: "+r.dropped.join(", "):"")+".");}catch(error){setStatus("Couldn't import "+file.name+": "+(error instanceof Error?error.message:String(error)));}}}/></label>
   </div>
   <p className="muted" data-testid="build-status" aria-live="polite">{status||"Auto Build keeps your own picks and fills the rest."} Value for this request: <strong>{Math.round(value*10)/10}</strong>{issues.length?" · "+issues.length+" rule(s) broken":""}</p>
   {unmet.map(b=><p key={b.id} data-testid={"blocker-"+b.id} style={{color:"var(--red)",margin:"4px 0"}}>{b.result==="fail"?"Requirement not met: "+b.label+". "+b.message:"Requirement can't be checked yet: "+b.label+"."}</p>)}
   <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:16,alignItems:"start"}} className="tpl-build-grid">
    <ol style={{listStyle:"none",padding:0,margin:0}}>{slots.map(slot=>{
     const current=build.picks[slot.id]??"";const legal=adapter.legalOptions({...build,picks:Object.fromEntries(Object.entries(build.picks).filter(([k])=>k!==slot.id))},slot);
     const currentOption=adapter.options.find(o=>o.id===current);
     const slotIssues=issues.filter(i=>i.slotId===slot.id);
     return <li key={slot.id} style={{borderTop:"1px solid var(--line)",padding:"10px 0"}}>
      <label><span>Level {slot.level} · {slot.label}</span>
       <select aria-label={slot.id+" pick"} value={current} onChange={e=>pick(slot.id,e.target.value)}>
        <option value="">—</option>
        {currentOption&&!legal.some(o=>o.id===current)&&<option value={current}>{currentOption.name} (not legal here)</option>}
        {legal.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      {currentOption&&<p className="muted" style={{margin:"6px 0 0"}}>{currentOption.summary}</p>}
      {slotIssues.map((i,k)=><p key={k} style={{color:"var(--red)",margin:"4px 0 0"}}>{i.reason}</p>)}
      <details style={{marginTop:6}}><summary className="muted">Recommendations for this slot</summary>
       <ul style={{paddingLeft:18}}>{advice[slot.id]?.map(r=><li key={r.option.id} data-testid={"recommend-"+slot.id+"-"+r.option.id}>
        <strong>{r.option.name}</strong> ({r.gain>=0?"+":""}{r.gain} value){" "}
        {r.option.id!==current&&<button type="button" onClick={()=>pick(slot.id,r.option.id)} style={{padding:"1px 8px",borderRadius:6,border:"1px solid #526780",background:"#1d2a3c",cursor:"pointer"}}>Use</button>}
        <ul className="muted">{r.reasons.map((x,i)=><li key={i}>{x}</li>)}{r.breaks.map((x,i)=><li key={"b"+i} style={{color:"var(--red)"}}>Breaks {x}</li>)}</ul></li>)}</ul></details>
     </li>;})}</ol>
    <div style={{background:"#fbfaf7",borderRadius:8,padding:6}}><GoalRadar goals={adapter.goals} scores={profile} size={240}/></div>
   </div>
  </div>
  <style>{".tpl-root .muted{color:var(--muted);font-size:13px}.tpl-root code{font-size:.9em}@media(max-width:700px){.tpl-build-grid{grid-template-columns:minmax(0,1fr)!important}}"}</style>
  {showReport&&<ReportDocument adapter={adapter} build={build} weights={weights} request={request} presetId={presetId} onClose={closeReport}/>}
 </section>;
}
// MDV_BLOCK:END id="TPL.UI.EXPLORER.020" kind="component" tags="optimization,ui"
