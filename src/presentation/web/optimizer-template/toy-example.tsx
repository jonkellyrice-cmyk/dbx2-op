"use client";
import {TOY_ADAPTER} from "../../../domain/toy-game/adapter";
import {OptimizerTemplate} from "./optimizer-template";
// MDV_BLOCK:BEGIN id="TPL.UI.TOY.010" intent="Bind the generic optimizer screen to the toy game; a real target adds one file like this" kind="component" tags="optimization,ui,toy"
export function ToyOptimizer(){return <OptimizerTemplate adapter={TOY_ADAPTER}/>;}
// MDV_BLOCK:END id="TPL.UI.TOY.010" kind="component" tags="optimization,ui,toy"
