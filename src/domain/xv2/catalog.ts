/**
 * The production catalog: docs/ingest/catalog/catalog.json, validated against the bundle's schemas
 * by tests/xv2-bundle.test.ts. Empty until the first real records are entered (process step 5).
 * The bundle's synthetic fixtures (docs/ingest/tests/fixtures/) are for tests only and never load here.
 */
import data from "../../../docs/ingest/catalog/catalog.json";
import type {Catalog} from "./records";
import {createXv2Adapter} from "./adapter";
// MDV_BLOCK:BEGIN id="DBX.XV2.CATALOG.010" intent="Load the real Xenoverse 2 catalog into the adapter the app uses" kind="module" tags="xv2,catalog"
export const XV2_CATALOG=data as unknown as Catalog;
export const XV2_ADAPTER=createXv2Adapter(XV2_CATALOG,{
 intro:XV2_CATALOG.options.length
  ?"Choose a request, set your race and scenario, then let Auto Build fill the loadout. Every score is explained; anything not yet graded is shown as unknown, not as zero."
  :"The Xenoverse 2 catalog is still empty: no Supers, Ultimates, Evasives, Awokens, Souls or QQ Bangs have been entered yet (process step 5 adds the first ones). The goals, slots, rules and presets below already come from the v3.1 bundle; only the named attribute spreads can be chosen so far.",
});
// MDV_BLOCK:END id="DBX.XV2.CATALOG.010" kind="module" tags="xv2,catalog"
