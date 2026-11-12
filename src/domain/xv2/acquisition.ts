/**
 * Where an option comes from (its `acquisition_options`, bundle schema acquisition.schema.json), said
 * the way a player would: "Train with Beerus", "Skill Shop", "TP Medal Shop (rotates weekly)". Also the
 * one check the "Skip TP Medal Shop only" setting needs: an option is TP-only when every known way to
 * get it is the TP Medal Shop, whose stock rotates, so owning the currency doesn't mean you can buy it.
 * An option with no recorded source is not TP-only; it is unknown, and is never filtered out for that.
 */
import type {Option} from "./records";
// MDV_BLOCK:BEGIN id="DBX.XV2.ACQUISITION.010" intent="Name each acquisition route the way the game's menus and players do" kind="config" tags="xv2,acquisition"
const SOURCE_LABEL:Readonly<Record<string,string>>={
 zeni_shop:"Shop (Zeni)",tp_medal_shop:"TP Medal Shop",pq_drop:"Parallel Quest reward",expert_mission_drop:"Expert Mission reward",
 instructor:"Instructor",story:"Main story",event:"Event",raid_reward:"Raid reward",mix_recipe:"Mixing",shenron_wish:"Shenron wish",dlc:"DLC",other:"Other",unknown:"Unknown",
};
/** The Zeni shops share one source in the bundle; source_id says which counter sells it. */
const SHOP_LABEL:Readonly<Record<string,string>>={skill_shop:"Skill Shop",item_shop:"Item Shop",clothing_shop:"Clothing Shop",accessory_shop:"Accessory Shop"};
// MDV_BLOCK:END id="DBX.XV2.ACQUISITION.010" kind="config" tags="xv2,acquisition"
// MDV_BLOCK:BEGIN id="DBX.XV2.ACQUISITION.020" intent="Tell the player where to get an option, and whether only the rotating TP Medal Shop sells it" kind="logic" tags="xv2,acquisition"
type Route=NonNullable<Option["acquisition_options"]>[number];
export function routeLabel(r:Route):string{
 if(r.source==="instructor")return r.source_id?"Train with "+r.source_id:"Instructor";
 if(r.source==="zeni_shop")return (r.source_id&&SHOP_LABEL[r.source_id])||SOURCE_LABEL.zeni_shop;
 if(r.source==="pq_drop"&&r.source_id)return "Parallel Quest "+r.source_id;
 const base=SOURCE_LABEL[r.source]??r.source;
 return r.rotation.status==="rotating"?base+" (rotating stock)":base;
}
/** "Where to get it: Train with Beerus", or null when no route is recorded. */
export function acquisitionSummary(o:Option):string|null{
 const routes=o.acquisition_options??[];
 return routes.length?"Where to get it: "+routes.map(routeLabel).join("; or "):null;
}
/** Every recorded route is the TP Medal Shop. No recorded route means unknown, so false. */
export function tpShopOnly(o:Option):boolean{
 const routes=o.acquisition_options??[];
 return routes.length>0&&routes.every(r=>r.source==="tp_medal_shop");
}
// MDV_BLOCK:END id="DBX.XV2.ACQUISITION.020" kind="logic" tags="xv2,acquisition"
