/** Rewrites GAPS.md at the repository root from the character data and the catalog. Run with `npm run gaps`. */
import {writeFileSync} from "node:fs";
import {join} from "node:path";
import {XV2_CHARACTER} from "../src/domain/xv2/character";
import {XV2_CATALOG} from "../src/domain/xv2/catalog";
import {catalogGaps,characterGaps,gapsMarkdown} from "../src/domain/xv2/gaps";
// MDV_BLOCK:BEGIN id="DBX.SCRIPT.GAPS.010" intent="Write the generated gaps checklist where people look for it" kind="script" tags="xv2,gaps,script"
const gaps=[...characterGaps(XV2_CHARACTER),...catalogGaps(XV2_CATALOG.options)];
writeFileSync(join(process.cwd(),"GAPS.md"),gapsMarkdown(gaps));
console.log("GAPS.md: "+gaps.length+" gaps");
// MDV_BLOCK:END id="DBX.SCRIPT.GAPS.010" kind="script" tags="xv2,gaps,script"
