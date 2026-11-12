/** Game-neutral PNC-Lite search primitives extracted from Lancer roster optimizer architecture.
 * Legal pool -> requirement-aware attention -> full candidate evaluation -> diagnostics.
 * A shortlist is not a legality filter; omitted candidates remain discoverable on fallback.
 */
export type SearchEvidence={id:string;roles:readonly string[];attention:number;objectiveHint:number};
export type SearchTrace={baselineCandidates:number;attendedCandidates:number;evaluatedCandidates:number;fallbackCandidates:number;decisions:number};
export function shortlistByAttention<T extends SearchEvidence>(pool:readonly T[],options:{width?:number;minWidth?:number;unmetRoles?:readonly string[]}={}):T[]{
 const width=options.width??0.6;
 const limit=Math.min(pool.length,Math.max(options.minWidth??16,Math.ceil(pool.length*Math.max(0.2,Math.min(1,width)))));
 const missing=new Set(options.unmetRoles??[]);
 const ranked=pool.map((item,index)=>({item,index,score:item.attention+item.objectiveHint+item.roles.reduce((n,r)=>n+(missing.has(r)?3:0),0)})).sort((a,b)=>b.score-a.score||a.index-b.index);
 const core=ranked.slice(0,limit);
 const covered=new Set(core.flatMap(x=>x.item.roles));
 for(const candidate of ranked.slice(limit)){
  if(core.length>=Math.min(pool.length,limit+3))break;
  if(candidate.item.roles.some(r=>missing.has(r)&&!covered.has(r))){core.push(candidate);candidate.item.roles.forEach(r=>covered.add(r));}
 }
 return core.map(x=>x.item);
}
export function evaluateWithFallback<T extends SearchEvidence,R extends {score:number}>(
 pool:readonly T[], evaluate:(candidate:T)=>R,options:{width?:number;unmetRoles?:readonly string[]}={}
):{ranked:Array<{candidate:T;result:R}>;diagnostics:SearchTrace}{
 const attended=shortlistByAttention(pool,options);
 const assessed=attended.map(candidate=>({candidate,result:evaluate(candidate)}));
 const unseen=pool.filter(x=>!new Set(attended.map(c=>c.id)).has(x.id));
 // Fallback evaluates all candidates not in attention set to guarantee optimum even with incomplete authored evidence.
 const fallback=unseen.map(candidate=>({candidate,result:evaluate(candidate)}));
 const ranked=[...assessed,...fallback].sort((a,b)=>b.result.score-a.result.score||a.candidate.id.localeCompare(b.candidate.id));
 return {ranked,diagnostics:{baselineCandidates:pool.length,attendedCandidates:attended.length,evaluatedCandidates:assessed.length+fallback.length,fallbackCandidates:fallback.length,decisions:ranked.length}};
}
