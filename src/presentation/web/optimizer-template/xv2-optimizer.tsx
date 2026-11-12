"use client";
import {XV2_ADAPTER} from "../../../domain/xv2/catalog";
import {OptimizerTemplate} from "./optimizer-template";
// MDV_BLOCK:BEGIN id="DBX.UI.XV2.010" intent="Bind the generic optimizer screen to the Xenoverse 2 adapter" kind="component" tags="xv2,ui"
export function Xv2Optimizer(){return <OptimizerTemplate adapter={XV2_ADAPTER}/>;}
// MDV_BLOCK:END id="DBX.UI.XV2.010" kind="component" tags="xv2,ui"
