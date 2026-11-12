/**
 * TOY GAME: a made-up five-level skirmish game, small enough to read in one sitting.
 * It exists only to show how a real target plugs into the optimization template: every kind of rule
 * the engine has to handle appears here once (slots, level gates, prerequisites, exclusions,
 * scaling, synergy, anti-synergy, redundancy). Replace it, don't extend it.
 *
 * Rules of the toy game, as a rulebook would print them:
 * - A Wanderer has 3 actions per turn and levels 1-5.
 * - Level 1: choose an Origin and a Technique. Level 2: a Technique. Level 3: a Talent.
 *   Level 4: a Technique. Level 5: a Signature.
 * - An option can't be taken before its level, or twice. Some require another option taken at an
 *   earlier or equal level; some exclude another option entirely.
 */
import type {GoalInfo,Preset,Relation} from "../../kernel/optimization/contract";
// MDV_BLOCK:BEGIN id="TPL.TOY.CATALOG.010" intent="Name the goals a Wanderer can be built for, with the words the report uses for each" kind="config" tags="toy,goals,report"
export const TOY_GOALS=["Damage","Defense","Support","Mobility"] as const;
export type ToyGoal=typeof TOY_GOALS[number];
export const TOY_GOAL_INFO:readonly GoalInfo<ToyGoal>[]=[
 {id:"Damage",label:"Damage",color:"#a3271f",plays:"ends fights quickly",gapAdvice:"Damage is not its job: set up the party's strikers instead of racing them."},
 {id:"Defense",label:"Defense",color:"#3d4f9a",plays:"stays standing where the fighting is",gapAdvice:"Its defenses are thin: stay behind someone sturdier and pick fights carefully."},
 {id:"Support",label:"Support",color:"#2e7d4f",plays:"makes everyone around it better",gapAdvice:"It does little for allies: bring healing items or a support-minded partner."},
 {id:"Mobility",label:"Mobility",color:"#1f6f9a",plays:"is always where the fight needs it",gapAdvice:"It moves slowly: choose your position before the fight starts."},
];
// MDV_BLOCK:END id="TPL.TOY.CATALOG.010" kind="config" tags="toy,goals,report"
// MDV_BLOCK:BEGIN id="TPL.TOY.CATALOG.020" intent="Record every option as the rulebook prints it, with authored scores kept next to the facts they judge" kind="table" tags="toy,catalog,options"
export type ToyKind="origin"|"technique"|"talent"|"signature";
export type ToyOption={
 id:string;name:string;kind:ToyKind;level:number;
 /** Actions per use (of 3 per turn); 0 = passive. */
 actions:number;
 summary:string;tags:readonly string[];
 requires?:string;excludes?:readonly string[];
 /** Authored tactical judgment, 0-100 per goal, at the option's own level. Unlisted goals are 0. */
 base:Partial<Record<ToyGoal,number>>;
 /** Goals nobody has judged this option on yet: reported as "not graded yet", never as a weakness. */
 unknown?:readonly ToyGoal[];
};
export const TOY_OPTIONS:readonly ToyOption[]=[
 {id:"sellsword",name:"Sellsword",kind:"origin",level:1,actions:0,summary:"+1 damage on every attack.",tags:["origin"],base:{Damage:20}},
 {id:"warden",name:"Warden",kind:"origin",level:1,actions:0,summary:"+1 armor.",tags:["origin"],base:{Defense:20}},
 {id:"hearthkeeper",name:"Hearthkeeper",kind:"origin",level:1,actions:0,summary:"Allies adjacent to you heal 1 at the start of their turn.",tags:["origin"],base:{Support:20}},
 {id:"scout",name:"Scout",kind:"origin",level:1,actions:0,summary:"+1 speed; movement options cost you nothing extra on rough ground.",tags:["origin"],base:{Mobility:20}},
 {id:"quick-strike",name:"Quick Strike",kind:"technique",level:1,actions:1,summary:"Attack for 1d6.",tags:["attack","scales"],base:{Damage:35}},
 {id:"shield-wall",name:"Shield Wall",kind:"technique",level:1,actions:1,summary:"Until your next turn, you and one adjacent ally take 2 less damage per hit.",tags:["guard","scales"],base:{Defense:40,Support:5}},
 {id:"rallying-cry",name:"Rallying Cry",kind:"technique",level:1,actions:1,summary:"Allies within 3 squares get +1 to their next attack.",tags:["buff","scales"],base:{Support:35,Damage:5}},
 {id:"dash",name:"Dash",kind:"technique",level:1,actions:1,summary:"Move double your speed, ignoring reactions.",tags:["movement"],base:{Mobility:40}},
 {id:"mark-target",name:"Mark Target",kind:"technique",level:2,actions:1,summary:"Mark an enemy; allies' attacks against it get +1.",tags:["setup","mark"],base:{Support:15,Damage:5}},
 {id:"heavy-blow",name:"Heavy Blow",kind:"technique",level:2,actions:2,summary:"Attack for 3d6 and knock the target 1 square back.",tags:["attack","scales"],base:{Damage:50}},
 {id:"second-wind",name:"Second Wind",kind:"technique",level:2,actions:1,summary:"Once per fight, you or an ally regains 2d6.",tags:["heal"],base:{Defense:15,Support:25}},
 {id:"hunters-focus",name:"Hunter's Focus",kind:"talent",level:3,actions:0,summary:"Your attacks deal +2 against a target you marked.",tags:["payoff"],requires:"mark-target",base:{Damage:30}},
 {id:"iron-skin",name:"Iron Skin",kind:"talent",level:3,actions:0,summary:"Take 1 less damage from every hit.",tags:["guard"],base:{Defense:30},unknown:["Support"]},
 {id:"fleet-foot",name:"Fleet Foot",kind:"talent",level:3,actions:0,summary:"+2 speed.",tags:["movement"],base:{Mobility:30}},
 {id:"whirlwind",name:"Whirlwind",kind:"signature",level:5,actions:2,summary:"Attack every adjacent enemy for 2d6.",tags:["attack","area"],base:{Damage:45}},
 {id:"bulwark-stance",name:"Bulwark Stance",kind:"signature",level:5,actions:1,summary:"Enter a stance: allies adjacent to you can't be targeted by ranged attacks; you can't move more than 1 square per turn.",tags:["guard","stance"],excludes:["fleet-foot"],base:{Defense:45,Support:15}},
 {id:"inspiring-leader",name:"Inspiring Leader",kind:"signature",level:5,actions:1,summary:"Once per turn, give an ally an extra action.",tags:["buff"],base:{Support:45,Damage:5}},
];
// MDV_BLOCK:END id="TPL.TOY.CATALOG.020" kind="table" tags="toy,catalog,options"
// MDV_BLOCK:BEGIN id="TPL.TOY.CATALOG.030" intent="Author the interactions between options, each with the evidence it rests on" kind="table" tags="toy,relations"
/** Pairwise interactions written by hand. Never infer these from names or tags alone. */
export const TOY_RELATIONS:readonly Relation<ToyGoal>[]=[
 {a:"mark-target",b:"hunters-focus",kind:"synergy",goal:"Damage",weight:30,evidence:"rule-derived",reason:"Hunter's Focus adds +2 to every attack against the target Mark Target marked (setup, then payoff)."},
 {a:"dash",b:"quick-strike",kind:"synergy",goal:"Damage",weight:10,evidence:"tactical",reason:"Dash into reach and still have actions left to strike in the same turn."},
 {a:"heavy-blow",b:"whirlwind",kind:"anti-synergy",goal:"Damage",weight:-15,evidence:"rule-derived",reason:"Both cost 2 of your 3 actions, so you can use only one of them per turn."},
 {a:"shield-wall",b:"iron-skin",kind:"redundancy",goal:"Defense",weight:-10,evidence:"tactical",reason:"Both shave damage off the same hits; the second adds less than the first."},
 {a:"rallying-cry",b:"inspiring-leader",kind:"synergy",goal:"Support",weight:10,evidence:"explicit",reason:"The extra action Inspiring Leader grants can be the attack Rallying Cry boosts."},
 // A candidate: plausible, not yet tested. It is explained wherever the pair appears but scores nothing.
 {a:"bulwark-stance",b:"second-wind",kind:"synergy",goal:"Support",weight:10,evidence:"tactical",state:"candidate",reason:"Allies held behind the stance may get more out of a heal (not yet tested)."},
];
/** Origins interact with every option carrying a tag, so they are written as tag rules. */
export const TOY_TAG_RELATIONS:readonly {origin:string;tag:string;goal:ToyGoal;weight:number;reason:string}[]=[
 {origin:"sellsword",tag:"attack",goal:"Damage",weight:5,reason:"Sellsword's +1 damage applies to every hit of this attack."},
 {origin:"scout",tag:"movement",goal:"Mobility",weight:5,reason:"Scout's extra speed stacks with this movement option."},
];
// MDV_BLOCK:END id="TPL.TOY.CATALOG.030" kind="table" tags="toy,relations"
// MDV_BLOCK:BEGIN id="TPL.TOY.CATALOG.040" intent="Give the player a few ready-made optimization requests to start from" kind="config" tags="toy,presets"
/** Example requests. Rank 1 matters most; equal ranks tie; an unranked goal is ignored. */
export const TOY_PRESETS:readonly Preset<ToyGoal>[]=[
 {id:"glass-cannon",name:"Glass cannon",note:"Hit as hard as possible and get out of the way",ranks:{Damage:1,Mobility:2}},
 {id:"bodyguard",name:"Bodyguard",note:"Stand in front and keep one ally alive",ranks:{Defense:1,Support:2},blockers:["guard-option"]},
 {id:"party-support",name:"Party support",note:"Make the rest of the party better",ranks:{Support:1,Defense:2}},
 {id:"balanced",name:"Balanced",note:"A bit of everything",ranks:{Damage:1,Defense:1,Support:1,Mobility:1}},
];
// MDV_BLOCK:END id="TPL.TOY.CATALOG.040" kind="config" tags="toy,presets"
