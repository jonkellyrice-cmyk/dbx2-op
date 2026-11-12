// MDV_BLOCK:BEGIN id="TPL.APP.PAGE.010" intent="Thin page shell: render the optimizer for the current target" kind="component" tags="app,page,thin-shell"
import {Xv2Optimizer} from "@/src/presentation/web/optimizer-template/xv2-optimizer";
/** The Xenoverse 2 optimizer. The template's toy game stays at /toy as the engine's worked example. */
export default function HomePage(){
 return <main><Xv2Optimizer/></main>;
}
// MDV_BLOCK:END id="TPL.APP.PAGE.010" kind="component" tags="app,page,thin-shell"
