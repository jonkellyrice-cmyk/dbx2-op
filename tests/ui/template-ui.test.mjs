import assert from "node:assert/strict";
import {test} from "node:test";
import {spawn} from "node:child_process";
import {once} from "node:events";
import {chromium} from "playwright";
// MDV_BLOCK:BEGIN id="TPL.TEST.UI.010" intent="Catch hydration regressions and broken flows in the template screen, report and PDF on desktop and mobile" kind="logic" tags="ui,hydration,report,pdf"
/**
 * Run after `npm run build`. REPORT_CHROMIUM_PATH points at a local Chrome: it drives the test browser
 * and lets the server render the PDF. TEMPLATE_BASE_URL tests an already running app instead.
 */
test("template: clean hydration, auto build, persistence, report, export/import and PDF", {timeout:180000}, async t=>{
 const remote=process.env.TEMPLATE_BASE_URL;
 const port=process.env.TEMPLATE_TEST_PORT??"3099";
 const base=remote??"http://127.0.0.1:"+port;
 const chrome=process.env.REPORT_CHROMIUM_PATH;
 let server;let serverLog="";let browser;
 try{
  if(!remote){
   server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",port],{stdio:["ignore","pipe","pipe"],env:{...process.env,...(chrome?{REPORT_CHROMIUM_PATH:chrome}:{})}});
   server.stdout.on("data",data=>serverLog+=data);server.stderr.on("data",data=>serverLog+=data);
  }
  let ready=false;
  for(let attempt=0;attempt<100;attempt++){
   try{const response=await fetch(base);if(response.ok){ready=true;break;}}catch{}
   if(server?.exitCode!==null&&server?.exitCode!==undefined)break;
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(ready,"App did not start: "+serverLog);
  browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome,args:["--no-sandbox","--disable-dev-shm-usage","--disable-gpu"]}:{})});
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
   await t.test(viewport.width+"px",async()=>{
    const context=await browser.newContext({viewport,acceptDownloads:true});const page=await context.newPage();
    const errors=[];page.on("pageerror",error=>errors.push(error.message));page.on("console",message=>{if(message.type()==="error")errors.push(message.text()+" ("+message.location().url+")");});
    // The home page is the Xenoverse 2 optimizer: it loads cleanly, says its catalog is empty, offers the
    // bundle's presets and the named attribute spreads, and asks for race and scenario.
    await page.goto(base);
    await page.getByRole("heading",{name:"DBX2-op: Xenoverse 2 loadout optimizer"}).waitFor();
    assert.ok(await page.getByText("The Xenoverse 2 catalog is still empty").isVisible());
    await page.getByRole("button",{name:"Parallel Quest farmer",exact:true}).click();
    assert.match(await page.getByTestId("request").textContent(),/^Crowd handling > Ki economy/);
    assert.ok((await page.getByLabel("attribute_spread pick",{exact:true}).locator("option").count())>=5,"the spreads are offered");
    await page.getByLabel("Race / gender",{exact:true}).selectOption("frieza_race");
    assert.equal(await page.getByLabel("Race / gender",{exact:true}).inputValue(),"frieza_race");
    // The template's toy game stays at /toy as the engine's worked example; the rest of this test runs there.
    await page.goto(base+"/toy");
    const icon=await page.locator('link[rel="icon"]').first().getAttribute("href");
    assert.ok(icon,"The page must declare its favicon");
    await page.getByRole("region",{name:"Step 1: request"}).waitFor();
    // A preset sets the request; Auto Build fills a legal build.
    await page.getByRole("button",{name:"Glass cannon",exact:true}).click();
    assert.equal(await page.getByTestId("request").textContent(),"Damage > Mobility");
    await page.getByRole("button",{name:"Auto Build",exact:true}).click();
    await page.getByTestId("build-status").filter({hasText:"All picks are legal"}).waitFor();
    const origin=await page.getByLabel("origin pick",{exact:true}).inputValue();
    assert.ok(origin,"Auto Build must fill the origin slot");
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),"The page must not scroll sideways");
    // Choices persist across a reload.
    await page.reload();
    await page.waitForFunction(value=>document.querySelector('[aria-label="origin pick"]')?.value===value,origin);
    // Export, then import a changed copy: the import replaces the build and reports what it dropped.
    const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Export build",exact:true}).click();const download=await downloadPromise;
    let exported="";for await(const chunk of await download.createReadStream())exported+=chunk.toString();
    const file=JSON.parse(exported);assert.equal(file.format,"toy-skirmish");assert.equal(file.picks.origin,origin);
    const changed={...file,picks:{...file.picks,origin:"warden",bogus:"x"}};
    await page.getByLabel("Import build",{exact:true}).setInputFiles({name:"changed.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(changed))});
    await page.getByTestId("build-status").filter({hasText:"dropped unknown entries: bogus"}).waitFor();
    assert.equal(await page.getByLabel("origin pick",{exact:true}).inputValue(),"warden");
    // The report opens with its cover and comparison, and Escape closes it.
    await page.getByRole("button",{name:"Build report / PDF",exact:true}).click();
    const report=page.getByRole("dialog",{name:"Build report"});await report.waitFor();
    await page.getByTestId("report-cover").waitFor();await page.getByTestId("report-comparison").waitFor();
    assert.ok(await report.getByText("Not measured, so left out: Mage.").isVisible());
    if(chrome&&viewport.width>600){
     const pdfPromise=page.waitForEvent("download",{timeout:90000});await page.getByRole("button",{name:"Download PDF",exact:true}).click();const pdf=await pdfPromise;
     assert.match(pdf.suggestedFilename(),/^Toy Skirmish Wanderer optimizer Level 5 .*\.pdf$/);
     let bytes=0;for await(const chunk of await pdf.createReadStream())bytes+=chunk.length;
     assert.ok(bytes>20000,"The PDF must have content ("+bytes+" bytes)");
    }
    await page.keyboard.press("Escape");await report.waitFor({state:"detached"});
    // A preset's requirement is flagged on screen until the build meets it.
    await page.getByRole("button",{name:"Reset",exact:true}).click();
    await page.getByRole("button",{name:"Bodyguard",exact:true}).click();
    await page.getByTestId("blocker-guard-option").waitFor();
    await page.getByLabel("technique1 pick",{exact:true}).selectOption("shield-wall");
    await page.getByTestId("blocker-guard-option").waitFor({state:"detached"});
    assert.deepEqual(errors,[],"Browser errors");
    console.log(JSON.stringify({base,width:viewport.width,hydration:"clean",pdf:Boolean(chrome&&viewport.width>600)}));
    await context.close();
   });
  }
 }finally{
  await browser?.close();
  if(server&&server.exitCode===null){server.kill();await Promise.race([once(server,"exit"),new Promise(resolve=>setTimeout(resolve,2000))]);}
 }
});
// MDV_BLOCK:END id="TPL.TEST.UI.010" kind="logic" tags="ui,hydration,report,pdf"
