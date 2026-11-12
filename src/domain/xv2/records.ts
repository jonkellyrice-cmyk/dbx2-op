/**
 * The catalog record shapes the adapter reads, as TypeScript. The authoritative shapes are the JSON
 * Schemas in docs/ingest/schema/; tests/xv2-bundle.test.ts validates every record against them, so
 * these types only name the fields the optimizer uses.
 */
// MDV_BLOCK:BEGIN id="DBX.XV2.RECORDS.010" intent="Keep known, unknown and not-applicable apart in every value the catalog records" kind="types" tags="xv2,catalog,evidence"
export type Evidence={status:"game"|"model"|"verify";verification:string;source_keys:readonly string[];version:string;notes:string|null};
export type Known<T>={status:"known"|"unknown"|"not_applicable";value:T|null;evidence?:Evidence};
export type Grade={status:"known"|"unknown"|"not_applicable";value:number|null;reason:string;evidence:Evidence};
export type Coverage="complete"|"partial"|"unknown"|"not_applicable";
// MDV_BLOCK:END id="DBX.XV2.RECORDS.010" kind="types" tags="xv2,catalog,evidence"
// MDV_BLOCK:BEGIN id="DBX.XV2.RECORDS.020" intent="Name the option fields scoring, legality and relation generators read" kind="types" tags="xv2,catalog,options"
export type Predicate={path:string;operator:string;value:unknown};
export type EffectClause={id:string;trigger:{event:string|null;predicates:readonly Predicate[];when:string};operation:string;property:string|null;evidence:Evidence};
export type Cost={resource:string;phase:string;amount:Known<number>};
export type Option={
 id:string;name:string;version:string;evidence:Evidence;
 eligibility:{archetypes:{status:"known"|"unknown";values:readonly string[]|null}};
 tactical_grades:Readonly<Record<string,Grade>>;
 catalog_coverage:{role_tags:Coverage;flags:Coverage;effects:Coverage;costs:Coverage};
 role_tags?:readonly {tag:string;evidence:Evidence}[];
 flags?:Readonly<Record<string,Known<boolean>>>;
 effect_clauses?:readonly EffectClause[];effects?:readonly EffectClause[];
 cost_schedule?:readonly Cost[];activation_costs?:readonly Cost[];
 action_overrides?:readonly {action_id:string;operation:string}[];
 /** Every way to get the option; several routes can coexist (bundle acquisition.schema.json). */
 acquisition_options?:readonly {source:string;source_id:string|null;prerequisites:readonly string[];rotation:{status:string;schedule:string|null};notes:string|null}[];
 /** Skills only: super, ultimate or evasive. */
 slot_family?:"super"|"ultimate"|"evasive";
 description?:string;
};
export type RelationRecord={
 id:string;a:string;b:string;kind:"synergy"|"anti_synergy"|"redundancy";goal_id:string;weight_band:"minor"|"moderate"|"major";
 reason:string;generator_id:string|null;state:"confirmed"|"candidate";non_overlap:string;size_basis:string|null;contribution_policy:string;evidence:Evidence;
};
export type Catalog={options:readonly Option[];relations:readonly RelationRecord[]};
// MDV_BLOCK:END id="DBX.XV2.RECORDS.020" kind="types" tags="xv2,catalog,options"
// MDV_BLOCK:BEGIN id="DBX.XV2.RECORDS.030" intent="Tell an option's family from its id namespace, as the bundle's ID rules define it" kind="logic" tags="xv2,catalog,ids"
export type OptionFamily="skill"|"awoken"|"soul"|"qqbang"|"spread";
export function familyOf(id:string):OptionFamily|null{
 const head=id.split(".")[0];
 return head==="skill"||head==="awoken"||head==="soul"||head==="qqbang"||head==="spread"?head:null;
}
// MDV_BLOCK:END id="DBX.XV2.RECORDS.030" kind="logic" tags="xv2,catalog,ids"
