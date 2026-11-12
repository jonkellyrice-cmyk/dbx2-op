/**
 * The open gaps in the character data and the catalog: combo strings no source describes, numbers no
 * source gives, values the sources disagree on, and what each Super, Ultimate, Awoken and so on still
 * lacks (grades, flags, costs, prices). GAPS.md at the repository root is this list rendered as
 * Markdown; `npm run gaps` rewrites it and tests/xv2-bundle.test.ts fails when it is out of date, so
 * the file always matches docs/ingest/catalog/character.json. Pure: no file access here.
 */
import type {CharacterData,Trait} from "./character";
import type {Evidence,Known,Option} from "./records";
// MDV_BLOCK:BEGIN id="DBX.XV2.GAPS.010" intent="Name the kinds of gap the data can have, in the order the report lists them" kind="types" tags="xv2,gaps,character"
export type GapKind="disputed"|"undescribed_string"|"unknown_number"|"option_unknown";
export type Gap={kind:GapKind;owner:string;item:string;detail:string};
const SECTIONS:readonly {kind:GapKind;title:string;help:string}[]=[
 {kind:"disputed",title:"Values the sources disagree on",help:"Two sources give different answers, so the value is held as unknown until one is confirmed in game."},
 {kind:"undescribed_string",title:"Combo strings with no description",help:"The string exists, but no source describes it. The in-game Combo List (pause menu, single-player mode) shows every string."},
 {kind:"unknown_number",title:"Numbers no source gives",help:"The source gives a direction or a ranking (for example \"high health\") but no number."},
 {kind:"option_unknown",title:"Skills and other options: what's still unknown",help:"From docs/ingest/catalog/catalog.json. Ungraded options score as unknown, not zero, until someone grades them."},
];
// MDV_BLOCK:END id="DBX.XV2.GAPS.010" kind="types" tags="xv2,gaps,character"
// MDV_BLOCK:BEGIN id="DBX.XV2.GAPS.020" intent="Find every gap in the character data from its evidence, so nothing has to be listed by hand" kind="logic" tags="xv2,gaps,character"
const disputed=(e:Evidence|undefined)=>e?.verification==="disputed";
const unknown=(k:Known<number>)=>k.status==="unknown";
function traitGap(owner:string,t:Trait):Gap|null{
 const notes=t.magnitude.evidence?.notes??t.evidence.notes??"";
 if(disputed(t.evidence)||disputed(t.magnitude.evidence))return {kind:"disputed",owner,item:t.id,detail:notes};
 if(unknown(t.magnitude))return {kind:"unknown_number",owner,item:t.id,detail:t.text+(notes?" ("+notes+")":"")};
 return null;
}
export function characterGaps(data:CharacterData):Gap[]{
 const gaps:Gap[]=[];
 for(const r of data.races){
  for(const t of r.traits){const g=traitGap(r.name,t);if(g)gaps.push(g);}
  for(const s of r.moveset.strings)if(s.text===null)gaps.push({kind:"undescribed_string",owner:r.name,item:s.name,detail:s.evidence.notes??""});
  for(const t of r.moveset.traits){const g=traitGap(r.name+" (moveset)",t);if(g)gaps.push(g);}
 }
 for(const b of data.body_types)for(const [field,k] of [["strike and basic damage bonus",b.strike_and_basic_damage_bonus],["Ki Super damage bonus",b.ki_super_damage_bonus]] as const){
  if(disputed(k.evidence))gaps.push({kind:"disputed",owner:"Body type "+b.name,item:field,detail:k.evidence?.notes??""});
  else if(unknown(k))gaps.push({kind:"unknown_number",owner:"Body type "+b.name,item:field,detail:k.evidence?.notes??""});
 }
 for(const h of data.heights)for(const [field,k] of [["health multiplier",h.health_multiplier],["speed multiplier",h.speed_multiplier]] as const)
  if(unknown(k)||disputed(k.evidence))gaps.push({kind:disputed(k.evidence)?"disputed":"unknown_number",owner:"Height "+h.step,item:field,detail:k.evidence?.notes??""});
 return gaps;
}
// MDV_BLOCK:END id="DBX.XV2.GAPS.020" kind="logic" tags="xv2,gaps,character"
// MDV_BLOCK:BEGIN id="DBX.XV2.GAPS.025" intent="Find what each catalog option still lacks, from its own unknown markers" kind="logic" tags="xv2,gaps,catalog"
type Priced={acquisition_options?:readonly {price?:readonly {currency:string;amount:Known<number>}[]}[]};
export function catalogGaps(options:readonly Option[]):Gap[]{
 const gaps:Gap[]=[];
 for(const o of options){
  const add=(item:string,detail:string)=>gaps.push({kind:"option_unknown",owner:o.name,item,detail});
  const ungraded=Object.entries(o.tactical_grades).filter(([,g])=>g.status==="unknown").map(([k])=>k);
  if(ungraded.length)add("tactical grades",ungraded.length===Object.keys(o.tactical_grades).length?"not graded on any goal":ungraded.join(", "));
  const flags=Object.entries(o.flags??{}).filter(([,f])=>f.status==="unknown").map(([k])=>k);
  if(flags.length)add("flags",flags.join(", "));
  const costs=[...(o.cost_schedule??[]),...(o.activation_costs??[])].filter(c=>c.amount.status==="unknown").map(c=>c.resource+" ("+c.phase+")");
  if(costs.length)add("costs",costs.join(", "));
  if(!(o.acquisition_options??[]).length)add("where to get it","no source recorded");
  const prices=((o as Priced).acquisition_options??[]).flatMap(r=>r.price??[]).filter(p=>p.amount.status==="unknown").map(p=>p.currency);
  if(prices.length)add("price",prices.join(", ")+" amount not recorded");
 }
 return gaps;
}
// MDV_BLOCK:END id="DBX.XV2.GAPS.025" kind="logic" tags="xv2,gaps,catalog"
// MDV_BLOCK:BEGIN id="DBX.XV2.GAPS.030" intent="Render the gaps as the GAPS.md checklist people fill in from" kind="logic" tags="xv2,gaps,character,report"
export function gapsMarkdown(gaps:readonly Gap[]):string{
 const lines=["# Gaps to fill","",
  "What the optimizer's data still doesn't know. This file is generated from `docs/ingest/catalog/character.json` and `catalog.json` by `npm run gaps`; a test fails if it falls out of date, so don't edit it by hand.","",
  "To fill a gap: add the source to `docs/ingest/catalog/sources.json` (with the page revision or date), put the value or description in `character.json` or `catalog.json` with `verification: \"documented\"`, then run `npm run gaps`.","",
  "| Gap | Count |","|---|---|",...SECTIONS.map(s=>"| "+s.title+" | "+gaps.filter(g=>g.kind===s.kind).length+" |"),""];
 for(const s of SECTIONS){
  const mine=gaps.filter(g=>g.kind===s.kind);
  lines.push("## "+s.title,"",s.help,"");
  if(!mine.length){lines.push("None.","");continue;}
  for(const owner of [...new Set(mine.map(g=>g.owner))]){
   const items=mine.filter(g=>g.owner===owner);
   if(s.kind==="undescribed_string")lines.push("- **"+owner+":** "+items.map(g=>g.item).join(", "));
   else{lines.push("- **"+owner+"**");for(const g of items)lines.push("  - `"+g.item+"`"+(g.detail?": "+g.detail:""));}
  }
  lines.push("");
 }
 return lines.join("\n");
}
// MDV_BLOCK:END id="DBX.XV2.GAPS.030" kind="logic" tags="xv2,gaps,character,report"
