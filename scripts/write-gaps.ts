/** Rewrites GAPS.md at the repository root from the character data. Run with `npm run gaps`. */
import {writeFileSync} from "node:fs";
import {join} from "node:path";
import {XV2_CHARACTER} from "../src/domain/xv2/character";
import {characterGaps,gapsMarkdown} from "../src/domain/xv2/gaps";
// MDV_BLOCK:BEGIN id="DBX.SCRIPT.GAPS.010" intent="Write the generated gaps checklist where people look for it" kind="script" tags="xv2,gaps,script"
const gaps=characterGaps(XV2_CHARACTER);
writeFileSync(join(process.cwd(),"GAPS.md"),gapsMarkdown(gaps));
console.log("GAPS.md: "+gaps.length+" gaps");
// MDV_BLOCK:END id="DBX.SCRIPT.GAPS.010" kind="script" tags="xv2,gaps,script"
