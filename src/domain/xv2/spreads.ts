/**
 * Named attribute spreads: the options of the attribute_spread slot (profile attribute_search:
 * named_spreads, the owner's choice for step 4). A spread is a share of the earned points per stat,
 * not a point count, because the earned-point budget at a given level isn't verified yet (spec
 * §17.1). Turning shares into exact points, and checking them against R-003/R-004, waits for that
 * budget. These are MODEL definitions with no game claim; their goal grades are unknown until the
 * audit grades them, so they never score as 0 by accident.
 */
// MDV_BLOCK:BEGIN id="DBX.XV2.SPREADS.010" intent="Offer a few recognizable stat priorities as choices for the attribute slot" kind="table" tags="xv2,spreads,attributes"
export type Stat="health"|"max_ki"|"max_stamina"|"basic_attack"|"strike_supers"|"ki_blast_supers";
export type Spread={id:string;name:string;summary:string;share:Readonly<Record<Stat,number>>};
export const XV2_SPREADS:readonly Spread[]=[
 {id:"spread.balanced",name:"Balanced",summary:"An even share in all six stats.",
  share:{health:1/6,max_ki:1/6,max_stamina:1/6,basic_attack:1/6,strike_supers:1/6,ki_blast_supers:1/6}},
 {id:"spread.ki-blast-focus",name:"Ki Blast focus",summary:"Most points in Ki Blast Supers and Max Ki, the rest in Health and Stamina.",
  share:{health:0.15,max_ki:0.3,max_stamina:0.1,basic_attack:0,strike_supers:0,ki_blast_supers:0.45}},
 {id:"spread.strike-focus",name:"Strike focus",summary:"Most points in Strike Supers and Basic Attacks, the rest in Health and Stamina.",
  share:{health:0.15,max_ki:0.1,max_stamina:0.15,basic_attack:0.2,strike_supers:0.4,ki_blast_supers:0}},
 {id:"spread.survival-focus",name:"Survival focus",summary:"Most points in Health and Max Stamina, the rest in Max Ki.",
  share:{health:0.45,max_ki:0.15,max_stamina:0.4,basic_attack:0,strike_supers:0,ki_blast_supers:0}},
];
// MDV_BLOCK:END id="DBX.XV2.SPREADS.010" kind="table" tags="xv2,spreads,attributes"
