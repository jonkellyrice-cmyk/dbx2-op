/** Saving a build to a file and loading it back, for any adapter. Imported files are never trusted. */
import type {Build,OptimizationAdapter} from "../../kernel/optimization/contract";
// MDV_BLOCK:BEGIN id="TPL.APP.PERSIST.010" intent="Restore versioned builds without trusting imported structure, and say what was dropped" kind="logic" tags="optimization,persistence"
const MAX_BYTES=100_000;
export type BuildFile={format:string;version:1;level:number;picks:Record<string,string>;context?:Record<string,string>};
export function exportBuild<G extends string>(adapter:OptimizationAdapter<G>,build:Build):string{
 const file:BuildFile={format:adapter.id,version:1,level:build.level,picks:{...build.picks},...(build.context&&Object.keys(build.context).length?{context:{...build.context}}:{})};
 return JSON.stringify(file,null,2);
}
/**
 * Unknown slots and options are dropped and listed, not silently accepted. Rule breaks (a missing
 * prerequisite) are kept, so the player sees them flagged instead of losing a pick.
 */
export function importBuild<G extends string>(adapter:OptimizationAdapter<G>,text:string):{build:Build;dropped:string[]}{
 if(text.length>MAX_BYTES)throw new Error("Build file is larger than 100 KB");
 const raw:unknown=JSON.parse(text);
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Expected a build object");
 const file=raw as Record<string,unknown>;
 if(file.format!==adapter.id)throw new Error("This file is for "+String(file.format)+", not "+adapter.id);
 if(file.version!==1)throw new Error("Unsupported build file version");
 if(!Number.isInteger(file.level)||(file.level as number)<1||(file.level as number)>adapter.maxLevel)throw new Error("Level must be 1-"+adapter.maxLevel);
 if(!file.picks||typeof file.picks!=="object"||Array.isArray(file.picks))throw new Error("Expected a map of picks");
 const level=file.level as number;
 const slots=new Set(adapter.slots({version:1,level:adapter.maxLevel,picks:{}}).map(s=>s.id));
 const options=new Set(adapter.options.map(o=>o.id));
 const picks:Record<string,string>={};const dropped:string[]=[];
 for(const [slot,id] of Object.entries(file.picks as Record<string,unknown>)){
  if(slots.has(slot)&&typeof id==="string"&&options.has(id))picks[slot]=id;else dropped.push(slot+": "+String(id));
 }
 // Context values must be one of the adapter's declared choices; anything else is dropped and listed.
 const context:Record<string,string>={};
 if(file.context&&typeof file.context==="object"&&!Array.isArray(file.context))for(const [key,value] of Object.entries(file.context as Record<string,unknown>)){
  const field=adapter.context?.find(f=>f.id===key);
  if(field&&typeof value==="string"&&field.options.some(o=>o.id===value))context[key]=value;else dropped.push("context "+key+": "+String(value));
 }
 return {build:{version:1,level,picks,...(Object.keys(context).length?{context}:{})},dropped};
}
// MDV_BLOCK:END id="TPL.APP.PERSIST.010" kind="logic" tags="optimization,persistence"
