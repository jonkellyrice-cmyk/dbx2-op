import assert from "node:assert/strict";
import {test} from "node:test";
import {shortlistByAttention,evaluateWithFallback} from "../src/domain/optimization/pnc-search";
const candidates=Array.from({length:25},(_,i)=>({id:`c${String(i).padStart(2,"0")}`,roles:i===24?["Healing"]:["Damage"],attention:i===24?0:10-i/10,objectiveHint:0}));
test("PNC attention preserves missing role coverage",()=>{
 const short=shortlistByAttention(candidates,{width:0.3,unmetRoles:["Healing"]});
 assert.ok(short.some(c=>c.id==="c24"));
});
test("PNC fallback finds optimum even when attention evidence misses it",()=>{
 const r=evaluateWithFallback(candidates,c=>({score:c.id==="c24"?100:1}),{width:0.3});
 assert.equal(r.ranked[0].candidate.id,"c24");
 assert.equal(r.diagnostics.evaluatedCandidates,candidates.length);
});
test("PNC search stays deterministic for tied scores",()=>{
 const r=evaluateWithFallback(candidates,c=>({score:1}),{width:0.3});
 assert.equal(r.ranked[0].candidate.id,"c00");
});
