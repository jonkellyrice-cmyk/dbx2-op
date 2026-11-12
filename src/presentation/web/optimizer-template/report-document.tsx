"use client";
import {Fragment,useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import type {Build,OptimizationAdapter,ReportStyle} from "../../../kernel/optimization/contract";
import type {Weights} from "../../../application/optimization/goal-weights";
import {buildReport} from "../../../application/optimization/report";
import {compareToPeers,metricText,ordinal} from "../../../application/optimization/peer-comparison";
import {GoalGrowth,GoalRadar} from "./goal-charts";
import {PeerBars,RankStrip} from "./comparison-charts";
// MDV_BLOCK:BEGIN id="TPL.UI.REPORT.010" intent="Snapshot the rendered report as a static page and turn it into a PDF on the server, so every device gets the same file" kind="logic" tags="optimization,report,pdf"
/** Marker the PDF route checks for (src/composition/report-pdf.ts). */
export const REPORT_ROOT_CLASS="report-print-root";
const toDataUri=async(src:string)=>{const blob=await (await fetch(src)).blob();return new Promise<string>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(blob);});};
/** The report exactly as rendered: toolbar removed, images and the app's stylesheets inlined, nothing fetched from this site. */
async function reportHtml():Promise<string>{
 const root=document.querySelector("."+REPORT_ROOT_CLASS)!.cloneNode(true) as HTMLElement;
 root.querySelector(".report-bar")?.remove();root.setAttribute("data-print-engine","standard");
 // The server blocks every request except web fonts, so images travel inside the page.
 for(const img of root.querySelectorAll("img"))if(!img.src.startsWith("data:"))img.src=await toDataUri(img.src);
 const css=[...document.styleSheets].map(sheet=>{try{return [...sheet.cssRules].map(rule=>rule.cssText).join("\n");}catch{return "";}}).join("\n");
 return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>"+document.title.replace(/</g,"&lt;")+"</title><style>"+css.replace(/<\/style/gi,"<\\/style")+"</style></head><body>"+root.outerHTML+"</body></html>";
}
async function downloadPdf(title:string){
 const response=await fetch("/api/report-pdf",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title,html:await reportHtml()})});
 if(!response.ok)throw new Error(String(response.status));
 // Titles carry ":" and ">" ("Damage > Mobility"); browsers reject such names and fall back to "download".
 const safe=title.replace(/[^\w\- ]+/g," ").replace(/\s+/g," ").trim()||"Build report";
 const url=URL.createObjectURL(await response.blob());const a=document.createElement("a");a.href=url;a.download=safe+".pdf";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
// MDV_BLOCK:END id="TPL.UI.REPORT.010" kind="logic" tags="optimization,report,pdf"
// MDV_BLOCK:BEGIN id="TPL.UI.REPORT.015" intent="Style the report in a clean or an illustrated parchment theme that looks the same on screen, in print and in the PDF" kind="config" tags="optimization,report,print,theme"
/** Corner flourish for the on-screen page frame, as an SVG data URI rotated per corner. */
function corner(rotate:number):string{
 const svg="<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><g transform='rotate("+rotate+" 32 32)' fill='none' stroke='%237a4b24' stroke-width='1.6'><path d='M4 60 V4 H60'/><path d='M10 54 V10 H54' stroke-width='0.8'/><path d='M4 4 L18 18'/><path d='M18 18 c8 -10 18 -8 22 -2 c3 5 -2 10 -7 7'/><path d='M18 18 c-10 8 -8 18 -2 22 c5 3 10 -2 7 -7'/></g><g transform='rotate("+rotate+" 32 32)' fill='%237a2818'><path d='M18 12 l4 6 l-4 6 l-4 -6z' transform='rotate(-45 18 18)'/></g></svg>";
 return "url(\"data:image/svg+xml,"+svg.replace(/#/g,"%23").replace(/"/g,"'")+"\")";
}
/** Printed page corner: a 16 mm margin box where the frame lines meet under a flourish. */
function pageCorner(rotate:number):string{
 const svg="<svg xmlns='http://www.w3.org/2000/svg' width='16mm' height='16mm' viewBox='0 0 16 16'><g transform='rotate("+rotate+" 8 8)' fill='none' stroke='#7a4b24' stroke-width='.25'><path d='M12 16 V12 H16' stroke-width='.35'/><path d='M12 12 L7 7'/><path d='M7 7 c-1.5 -2.5 1 -4.5 3 -3 c1.3 1 .3 2.6 -1 2'/><path d='M7 7 c-2.5 -1.5 -4.5 1 -3 3 c1 1.3 2.6 .3 2 -1'/><path d='M12 10.4 L13.6 12 L12 13.6 L10.4 12Z' fill='#7a2818' stroke='none'/></g></svg>";
 return "url(\"data:image/svg+xml,"+svg.replace(/#/g,"%23")+"\")";
}
/** Deterministic paper grain: seeded SVG noise, tinted brown. */
const GRAIN="url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 .45 0 0 0 0 .32 0 0 0 0 .17 0 0 0 .09 0'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>\")";
const PARCHMENT=GRAIN+",radial-gradient(ellipse at 50% 40%,rgba(255,251,238,.75) 0%,rgba(255,251,238,0) 65%),radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 62%,rgba(128,86,38,.22) 100%)";
const FRAME=[corner(0)+" top left",corner(90)+" top right",corner(270)+" bottom left",corner(180)+" bottom right"].map(x=>x+" / 64px 64px no-repeat").join(",");
const PARCHMENT_FONTS="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&display=swap";
const cssString=(text:string)=>"\""+text.replace(/["\\]/g,"\\$&")+"\"";
const BASE=`
.report-print-root{position:fixed;inset:0;z-index:1000;background:rgba(10,14,20,.85);overflow:auto;padding:16px}
.report-bar{position:sticky;top:0;z-index:1;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;max-width:816px;margin:0 auto 8px}
.report-bar button{padding:8px 14px;border-radius:8px;border:1px solid #526780;background:#1d2a3c;color:#fff;cursor:pointer;font:inherit}
.report-doc{--tpl-ink:#1d2430;--tpl-muted:#5b6575;--tpl-grid:#d5dae2;--tpl-rule:#b8c0cc;--tpl-accent:#345b89;max-width:816px;margin:0 auto;color:var(--tpl-ink);font:15px/1.5 system-ui,sans-serif;color-scheme:light;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.report-doc .page{position:relative;padding:44px 52px;background:#fbfaf7}.report-doc .page+.page,.report-doc .cover+.page{margin-top:16px}
.report-doc h1{font-size:28px;margin:0 0 4px;text-transform:none;letter-spacing:0;line-height:1.15}.report-doc h2{font-size:18px;margin:22px 0 8px;text-transform:none;letter-spacing:0;break-after:avoid}
.report-doc .kicker{color:var(--tpl-muted);font-size:12px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px}
.report-doc .glance{display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center}
.report-doc table{width:100%;border-collapse:collapse;font-size:13px}.report-doc th,.report-doc td{border-bottom:1px solid var(--tpl-grid);padding:6px 4px;text-align:left;vertical-align:top}.report-doc tr{break-inside:avoid}
.report-doc .entry{border-left:3px solid var(--tpl-grid);padding:4px 0 4px 12px;margin:10px 0;break-inside:avoid}
.report-doc .figure{margin:8px 0 14px;break-inside:avoid}.report-doc .muted{color:var(--tpl-muted);font-size:13px}.report-doc .issue{color:#a3271f}
.report-doc a{color:inherit}
.report-doc .cover{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:900px;padding:60px;background:#1d2a3c;color:#f3f5f8}
.report-doc .cover img{display:block;width:100%;height:auto}.report-doc .cover .kicker{color:#b8c4d4}.report-doc .cover h1{font-size:44px;margin:14px 0}
@media(max-width:600px){.report-print-root{padding:6px}.report-doc .page{padding:24px 18px}.report-doc .glance{grid-template-columns:1fr}.report-doc .cover{min-height:560px;padding:28px}.report-doc .cover h1{font-size:30px}}
@page cover{margin:0;@top-center{content:none;border:0}@bottom-center{content:none;border:0}@top-left-corner{content:none}@top-right-corner{content:none}@bottom-left-corner{content:none}@bottom-right-corner{content:none}@left-middle{content:none;border:0}@right-middle{content:none;border:0}}
@media print{body>*:not(.report-print-root){display:none!important}:root{color-scheme:light!important}
 .report-print-root{position:static;padding:0;background:none;overflow:visible}.report-bar{display:none}
 .report-doc{max-width:none;font-size:11pt}.report-doc .page{padding:0;background:none!important;border:0!important;box-shadow:none!important;break-after:page}.report-doc .page+.page,.report-doc .cover+.page{margin-top:0}
 .report-doc .cover{break-after:page;min-height:9.2in;margin:0}
 /* Browsers with named pages (Chrome, Edge, the PDF renderer) print the cover full-bleed; iOS keeps its margins, so the cover fits inside them. */
 @supports (page:auto){.report-print-root:not([data-print-engine="ios"]) .report-doc .cover{page:cover;height:100vh;min-height:0}}}
`;
const CLEAN=`
@page{size:letter;margin:16mm;background:#fff;@bottom-center{content:"Page " counter(page) " of " counter(pages);font:9pt system-ui,sans-serif;color:#5b6575}}
@media print{:root,html,body{background:#fff!important}}
`;
const parchment=(running:string)=>`
.report-doc[data-theme="parchment"]{--tpl-ink:#2b1d12;--tpl-muted:#6b5440;--tpl-grid:#d9c6a3;--tpl-rule:#b89b72;--tpl-accent:#7a2818;font:15px/1.5 "Crimson Pro",Georgia,"Times New Roman",serif}
.report-doc[data-theme="parchment"] .page{padding:52px 56px;background-color:#f4e9d0;background-image:${FRAME},${PARCHMENT};background-size:64px 64px,64px 64px,64px 64px,64px 64px,240px 240px,100% 100%,100% 100%;border:1px solid #8a5f33;box-shadow:inset 0 0 0 6px #f4e9d0,inset 0 0 0 7px #a07a4c,0 4px 24px rgba(0,0,0,.4)}
.report-doc[data-theme="parchment"] h1,.report-doc[data-theme="parchment"] h2{font-family:Cinzel,"Trajan Pro",Georgia,serif;color:#7a2818;letter-spacing:.04em}
.report-doc[data-theme="parchment"] h2{font-size:17px;padding-bottom:5px;border-bottom:3px double #b89b72}
.report-doc[data-theme="parchment"] .kicker{font:600 11px/1.3 Cinzel,Georgia,serif;letter-spacing:.18em}
.report-doc[data-theme="parchment"] th{background:#5d1f12;color:#fbeedc;font:600 12px/1.3 Cinzel,Georgia,serif;letter-spacing:.05em}.report-doc[data-theme="parchment"] tbody tr:nth-child(even){background:rgba(160,122,76,.12)}
.report-doc[data-theme="parchment"] .entry{border-left-color:#7a2818;background:rgba(122,40,24,.05)}
.report-doc[data-theme="parchment"] .lede{font-style:italic;font-size:17px;color:#4a3320}.report-doc[data-theme="parchment"] .lede::first-letter{font:700 46px/0.8 Cinzel,Georgia,serif;color:#7a2818;float:left;margin:6px 6px 0 0}
.report-doc[data-theme="parchment"] .cover{background:#2a1014;color:#f4e9d0;border:1px solid #8a5f33;box-shadow:inset 0 0 0 10px #2a1014,inset 0 0 0 11px #b89b72,inset 0 0 0 16px #2a1014,inset 0 0 0 17px #7a4b24}
.report-doc[data-theme="parchment"] .cover h1{color:#e9c98f;font-size:46px}.report-doc[data-theme="parchment"] .cover .kicker{color:#cdb48a}
@page{size:letter;margin:16mm;background:#f4e9d0;
 @top-left-corner{content:${pageCorner(0)}}@top-right-corner{content:${pageCorner(90)}}@bottom-right-corner{content:${pageCorner(180)}}@bottom-left-corner{content:${pageCorner(270)}}
 @top-center{content:${cssString(running)};width:100%;border-bottom:.35mm solid #7a4b24;margin-bottom:4mm;vertical-align:bottom;padding-bottom:1mm;font:8pt Cinzel,Georgia,serif;letter-spacing:.15em;color:#8a6a48}
 @bottom-center{content:"Page " counter(page) " of " counter(pages);width:100%;border-top:.35mm solid #7a4b24;margin-top:4mm;vertical-align:top;padding-top:1.5mm;font:9pt Georgia,serif;color:#6b5440}
 @left-middle{content:"";height:100%;border-right:.35mm solid #7a4b24;margin-right:4mm}@right-middle{content:"";height:100%;border-left:.35mm solid #7a4b24;margin-left:4mm}}
@media print{:root,html,body{background:#f4e9d0!important}}
`;
const styleFor=(style:ReportStyle)=>BASE+(style.theme==="parchment"?parchment(style.running):CLEAN);
// MDV_BLOCK:END id="TPL.UI.REPORT.015" kind="config" tags="optimization,report,print,theme"
// MDV_BLOCK:BEGIN id="TPL.UI.REPORT.020" intent="Lay out the printable build report: cover, at a glance, story, growth, comparison and an explained entry for every choice" kind="component" tags="optimization,report,print"
export function ReportDocument<G extends string>({adapter,build,weights,request,presetId=null,onClose}:{adapter:OptimizationAdapter<G>;build:Build;weights:Weights<G>;request:string;presetId?:string|null;onClose:()=>void}){
 const style:ReportStyle=adapter.report??{theme:"clean",running:adapter.title};
 const report=useMemo(()=>buildReport(adapter,build,weights,request,presetId),[adapter,build,weights,request,presetId]);
 const comparison=useMemo(()=>adapter.benchmarks?compareToPeers(adapter.benchmarks,build):null,[adapter,build]);
 const [pdf,setPdf]=useState<"idle"|"working"|"failed">("idle");
 const date=useMemo(()=>new Date().toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"}),[]);
 const goalLabel=(g:G)=>adapter.goals.find(x=>x.id===g)?.label??g;
 // iOS prints through its own engine, which keeps its margins even when the page asks for none.
 const [printEngine,setPrintEngine]=useState("standard");
 useEffect(()=>{const ua=navigator.userAgent;setPrintEngine(/iPhone|iPad|iPod/.test(ua)||/Macintosh/.test(ua)&&navigator.maxTouchPoints>1?"ios":"standard");},[]);
 // The page title names the saved file; Escape closes; the page behind stops scrolling.
 useEffect(()=>{const previous=document.title;document.title=report.title+" - "+request;const key=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",key);const overflow=document.body.style.overflow;document.body.style.overflow="hidden";
  return ()=>{document.title=previous;window.removeEventListener("keydown",key);document.body.style.overflow=overflow;};},[report.title,request,onClose]);
 const name=(option:{name:string;source?:string})=>option.source?<a href={option.source} target="_blank" rel="noopener noreferrer">{option.name}</a>:option.name;
 return createPortal(<div className={REPORT_ROOT_CLASS} role="dialog" aria-modal="true" aria-label="Build report" data-print-engine={printEngine}><style>{styleFor(style)}</style>
  {style.theme==="parchment"&&<link rel="stylesheet" href={PARCHMENT_FONTS}/>}
  <div className="report-bar">
   <button type="button" disabled={pdf==="working"} onClick={async()=>{setPdf("working");try{await downloadPdf(document.title);setPdf("idle");}catch{setPdf("failed");}}}>{pdf==="working"?"Rendering PDF…":pdf==="failed"?"PDF failed: retry":"Download PDF"}</button>
   <button type="button" onClick={()=>{void document.fonts.ready.then(()=>window.print());}}>Print</button>
   <button type="button" onClick={onClose}>Close</button>
  </div>
  <article className="report-doc" data-theme={style.theme} data-testid="build-report">
   {style.cover&&<section className="cover" data-testid="report-cover">
    {style.cover.image?<img src={style.cover.image} alt={style.cover.subtitle}/>:<>
     <p className="kicker">{style.cover.kicker}</p><h1>{report.title}</h1><p style={{fontSize:18,fontStyle:"italic"}}>{style.cover.subtitle}</p>
     <p style={{marginTop:28}}>Request: {report.request}</p><p className="kicker" style={{marginTop:8}}>{date}</p></>}
   </section>}
   <section className="page">
    <p className="kicker">Build report · {date}</p>
    <h1>{report.title}</h1>
    <p><strong>Request:</strong> {report.request} · <strong>Value for this request:</strong> {report.value} / 100</p>
    <h2>At a glance</h2>
    <div className="glance"><GoalRadar goals={adapter.goals} scores={report.profile}/>
     <div><p className="lede">{report.headline}.</p>
      <p>Strengths: {report.strengths.map(goalLabel).join(", ")||"none yet"}.</p>
      <p>Gaps in what you asked for: {report.gaps.map(goalLabel).join(", ")||"none"}.</p>
      {report.issues.length>0&&<p className="issue">This build breaks {report.issues.length} rule(s); see the choices below.</p>}</div></div>
    {report.sections.map(s=><Fragment key={s.title}><h2>{s.title}</h2>{s.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</Fragment>)}
   </section>
   <section className="page">
    <h2 style={{marginTop:0}}>Growth by level</h2>
    <div className="figure"><GoalGrowth goals={adapter.goals} curve={report.curve}/></div>
    <h2>Milestones</h2>
    {report.milestones.length?<ul>{report.milestones.map((m,i)=><li key={i}>Level {m.level}: {m.text}</li>)}</ul>:<p className="muted">No goal reaches 40 yet.</p>}
    <h2>Choices at a glance</h2>
    <table><thead><tr><th>Level</th><th>Slot</th><th>Choice</th>{adapter.goals.map(g=><th key={g.id}>{g.label}</th>)}</tr></thead>
     <tbody>{report.choices.map(c=><tr key={c.slot.id}><td>{c.slot.level}</td><td>{c.slot.label}</td><td>{c.option?name(c.option):"—"}{c.issues.length>0&&<span className="issue"> (invalid)</span>}</td>{adapter.goals.map(g=><td key={g.id}>{c.rating?(c.rating.unknown?.includes(g.id)?"?":Math.round(c.rating.scores[g.id])):""}</td>)}</tr>)}</tbody></table>
   </section>
   {comparison&&adapter.benchmarks&&<section className="page" data-testid="report-comparison">
    <h2 style={{marginTop:0}}>{adapter.benchmarks.title}</h2>
    <p className="muted">{adapter.benchmarks.caption}</p>
    {comparison.map((m,i)=><div className="figure" key={m.metric.id}>
     <p><strong>{m.metric.label}</strong> · {m.value===null?"no figure for this build":"this build: "+metricText(m.metric,m.value)+" · "+ordinal(m.rank!)+" of "+m.of}{m.average!==null?" · reference average "+metricText(m.metric,m.average):""}</p>
     {m.peers.length>0&&(i===0?<PeerBars metric={m}/>:<RankStrip metric={m}/>)}
     {m.unmeasured.length>0&&<p className="muted">Not measured, so left out: {m.unmeasured.join(", ")}.</p>}
    </div>)}
   </section>}
   <section className="page">
    <h2 style={{marginTop:0}}>Every choice, explained</h2>
    {report.choices.filter(c=>c.option).map(c=><div className="entry" key={c.slot.id}>
     <strong>Level {c.slot.level} {c.slot.label}: {name(c.option!)}</strong>
     <p className="muted">{c.option!.summary}</p>
     <ul>{c.rating!.contributions.map((x,i)=><li key={i}>{(x.value>0?"+":"")+x.value} {goalLabel(x.goal)}: {x.reason} <span className="muted">({x.evidence}{x.condition?"; "+x.condition:""})</span></li>)}</ul>
     {c.rating!.unknown?.length?<p className="muted">Not graded yet for {c.rating!.unknown.map(goalLabel).join(", ")} (shown as "?" above, not as 0).</p>:null}
     {c.issues.map((i,k)=><p className="issue" key={k}>{i}</p>)}
    </div>)}
    <p className="muted">Scores are 0-100 judgments of what each choice does, with the evidence behind each point. They are not win rates or simulated outcomes.</p>
   </section>
  </article>
 </div>,document.body);
}
// MDV_BLOCK:END id="TPL.UI.REPORT.020" kind="component" tags="optimization,report,print"
