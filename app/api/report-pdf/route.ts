// MDV_BLOCK:BEGIN id="TPL.APP.REPORT_PDF_ROUTE.010" intent="Expose server-side build report PDFs as a Next.js route" kind="module" tags="optimization,pdf,route"
import {handleReportPdf} from "@/src/composition/report-pdf";
export const runtime="nodejs";
export const maxDuration=60;
export const POST=handleReportPdf;
// MDV_BLOCK:END id="TPL.APP.REPORT_PDF_ROUTE.010" kind="module" tags="optimization,pdf,route"
