import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
// MDV_BLOCK:BEGIN id="TPL.INFRA.PDF_RENDER.010" intent="Name what a server-rendered report PDF needs: the finished page the browser already rendered" kind="types" tags="report,pdf,server"
/** A complete, static HTML document of the report (styles, inline charts and any cover image embedded). */
export type ReportPdfRequest={html:string};
/** The only outside resources a report may load: its web fonts. Everything else is embedded or blocked. */
const ALLOWED_HOSTS=["fonts.googleapis.com","fonts.gstatic.com"];
const LOAD_TIMEOUT_MS=20_000;
// MDV_BLOCK:END id="TPL.INFRA.PDF_RENDER.010" kind="types" tags="report,pdf,server"
// MDV_BLOCK:BEGIN id="TPL.INFRA.PDF_RENDER.020" intent="Convert the finished report to PDF in headless Chrome, so every device gets the same full-bleed file without browser print margins" kind="module" tags="report,pdf,server,effects"
/** A local Chrome for development and tests (REPORT_CHROMIUM_PATH); the packaged serverless Chromium in production. */
async function launch(){
 const local=process.env.REPORT_CHROMIUM_PATH;
 return puppeteer.launch(local?{executablePath:local,args:["--no-sandbox","--disable-dev-shm-usage"],headless:true}:{executablePath:await chromium.executablePath(),args:chromium.args,headless:true});
}
/** Each step is named so a failure in the logs says where it happened. */
async function step<T>(name:string,run:()=>Promise<T>):Promise<T>{
 try{return await run();}catch(error){throw new Error("PDF "+name+" failed: "+(error instanceof Error?error.message:String(error)));}
}
export async function renderReportPdf({html}:ReportPdfRequest):Promise<Uint8Array>{
 const browser=await step("browser launch",launch);
 try{
  const page=await browser.newPage();
  // The page is static: no scripts, and no network except its fonts, so submitted HTML can't reach anything else.
  await page.setJavaScriptEnabled(false);
  await page.setRequestInterception(true);
  page.on("request",request=>{const url=request.url();if(url.startsWith("data:")||ALLOWED_HOSTS.includes(new URL(url).hostname))void request.continue();else void request.abort();});
  await page.emulateMediaType("print");
  await step("page load",async()=>{await page.setContent(html,{waitUntil:"load",timeout:LOAD_TIMEOUT_MS});await page.waitForNetworkIdle({idleTime:300,timeout:LOAD_TIMEOUT_MS});});
  await step("font load",()=>page.evaluateHandle("document.fonts.ready").then(()=>undefined));
  return await step("pdf",()=>page.pdf({preferCSSPageSize:true,printBackground:true,timeout:LOAD_TIMEOUT_MS}));
 }finally{await browser.close();}
}
// MDV_BLOCK:END id="TPL.INFRA.PDF_RENDER.020" kind="module" tags="report,pdf,server,effects"
