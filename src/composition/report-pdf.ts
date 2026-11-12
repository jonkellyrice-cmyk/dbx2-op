import {renderReportPdf} from "@/src/infrastructure/adapters/pdf/report-pdf.adapter";
// MDV_BLOCK:BEGIN id="TPL.COMPOSITION.REPORT_PDF.010" intent="Turn any optimizer's rendered build report into a downloadable PDF, validating only what the renderer needs" kind="module" tags="optimization,report,pdf,http"
/** A report with an embedded cover is a few MB at most; Vercel accepts request bodies up to 4.5 MB. */
const MAX_BODY_BYTES=4_000_000;
/** The class the report UI puts on its root (src/presentation/web/optimizer-template/report-document.tsx). */
const REPORT_MARKER="report-print-root";
const fileName=(label:string)=>(label.replace(/[^\w\- ]+/g," ").replace(/\s+/g," ").trim()||"Build report")+".pdf";
/**
 * The renderer is headless Chrome with scripts off and every request blocked except web fonts,
 * so submitted HTML can't reach anything.
 */
export async function handleReportPdf(request:Request):Promise<Response>{
 const text=await request.text();
 if(text.length>MAX_BODY_BYTES)return Response.json({error:"Request too large"},{status:413});
 let body:{html?:unknown;title?:unknown};
 try{body=JSON.parse(text);}catch{return Response.json({error:"Invalid JSON"},{status:400});}
 if(typeof body.html!=="string"||!body.html.includes(REPORT_MARKER))return Response.json({error:"Missing build report"},{status:400});
 const started=Date.now();
 try{
  const pdf=await renderReportPdf({html:body.html});
  console.log("report-pdf: rendered "+pdf.length+" bytes in "+(Date.now()-started)+" ms");
  return new Response(Buffer.from(pdf),{headers:{"content-type":"application/pdf","content-disposition":'attachment; filename="'+fileName(typeof body.title==="string"?body.title:"")+'"',"cache-control":"no-store"}});
 }catch(error){
  console.error("report-pdf: "+(error instanceof Error?error.stack??error.message:String(error)));
  return Response.json({error:"Could not render the PDF"},{status:500});
 }
}
// MDV_BLOCK:END id="TPL.COMPOSITION.REPORT_PDF.010" kind="module" tags="optimization,report,pdf,http"
