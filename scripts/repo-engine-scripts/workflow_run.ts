// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.010" kind="module" type="imports" tags="module,imports"
//command:
//  npm run workflow:run -- --patch docs/patches/PATCH....json
//  npm run workflow:run -- --patch docs/patches/PATCH....json --regen
//  npm run workflow:run -- --verify-only
//
// Notes:
// - If --patch is omitted, it will just run verify (unless --verify-only is set explicitly).
// - If --regen is passed, it will also run your generators (repomap, fingerprint-index, symbol-index, deps graph) if scripts exist.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.010" kind="module" type="imports" tags="module,imports"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.020" kind="types" type="types" tags="types"


type StepStatus = "ok" | "failed" | "skipped";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.020" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.030" kind="types" type="types" tags="types"


type WorkflowStepResult = {
  name: string;
  command: string;
  args: string[];
  status: StepStatus;
  exitCode?: number;
  output?: string;
  startedAt: string;
  endedAt: string;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.030" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.040" kind="types" type="types" tags="types"


type WorkflowReportV1 = {
  schema: "WorkflowReportV1";
  id: string;
  startedAt: string;
  endedAt: string;
  success: boolean;
  inputs: {
    patchPath?: string;
    verifyOnly: boolean;
    regen: boolean;
  };
  steps: WorkflowStepResult[];
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.040" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.050" kind="var" type="var" tags="var"


const __filename = fileURLToPath(import.meta.url);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.050" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.060" kind="var" type="var" tags="var"

const __dirname = path.dirname(__filename);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.060" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.070" kind="var" type="var" tags="var"

const repoRoot = path.resolve(__dirname, "..");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.070" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.080" kind="function" type="function" tags="function"


function toPosix(p: string) {
  return p.split(path.sep).join("/");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.080" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.090" kind="function" type="function" tags="function"


function nowIso() {
  return new Date().toISOString();
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.090" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.100" kind="function" type="function" tags="function"


function runStep(name: string, command: string, args: string[]): WorkflowStepResult {
  const startedAt = nowIso();
  const res = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: true,
  });
  const endedAt = nowIso();

  const output = (res.stdout || "") + (res.stderr || "");
  const exitCode = typeof res.status === "number" ? res.status : undefined;

  if (res.error) {
    return {
      name,
      command,
      args,
      status: "failed",
      output: String(res.error) + "\n" + output,
      startedAt,
      endedAt,
    };
  }

  return {
    name,
    command,
    args,
    status: exitCode === 0 ? "ok" : "failed",
    exitCode,
    output,
    startedAt,
    endedAt,
  };
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.100" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.110" kind="function" type="function" tags="function"


function readPkgScripts(): Record<string, string> {
  const pkgPath = path.resolve(repoRoot, "package.json");
  if (!fs.existsSync(pkgPath)) return {};
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return (pkg?.scripts ?? {}) as Record<string, string>;
  } catch {
    return {};
  }
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.110" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.120" kind="function" type="function" tags="function"


function main() {
  const args = process.argv.slice(2);

  const patchIdx = args.indexOf("--patch");
  const patchPathArg = patchIdx >= 0 ? (args[patchIdx + 1] ?? null) : null;

  const verifyOnly = args.includes("--verify-only");
  const regen = args.includes("--regen");

  // Determine patch path abs (if any)
  let patchAbs: string | null = null;
  let patchPosixRel: string | null = null;

  if (patchPathArg) {
    patchAbs = path.isAbsolute(patchPathArg)
      ? patchPathArg
      : path.resolve(repoRoot, patchPathArg.split("/").join(path.sep));
    if (!fs.existsSync(patchAbs)) {
      console.error(`Patch not found: ${patchPathArg}`);
      process.exit(1);
    }
    patchPosixRel = toPosix(path.relative(repoRoot, patchAbs));
  }

  if (!verifyOnly && !patchAbs) {
    // default behavior if user just runs it
    // (keeps it safe and useful)
  }

  const workflowId = `WF.${new Date().toISOString().replace(/[:.]/g, "")}`;
  const startedAt = nowIso();

  const steps: WorkflowStepResult[] = [];
  let success = true;

  // Optional snapshot step (only if patch provided AND snapshot script exists)
  const scripts = readPkgScripts();
  const hasSnapshot = !!scripts["snapshot:patch"];
  const hasApplyPatch = !!scripts["apply:patch"];
  const hasVerify = !!scripts["verify"];

  if (!hasVerify) {
    console.error(`Missing npm script "verify". Add it first.`);
    process.exit(1);
  }

  if (patchAbs && hasSnapshot) {
    const r = runStep("Snapshot (pre-patch)", "npm", ["run", "snapshot:patch", "--", patchPosixRel!]);
    steps.push(r);
    if (r.status === "failed") {
      success = false;
    }
  } else if (patchAbs && !hasSnapshot) {
    steps.push({
      name: "Snapshot (pre-patch)",
      command: "npm",
      args: ["run", "snapshot:patch", "--", patchPosixRel || ""],
      status: "skipped",
      output: "snapshot:patch not configured; skipping.",
      startedAt: nowIso(),
      endedAt: nowIso(),
    });
  }

  // Apply patch (if provided and not verify-only)
  if (success && patchAbs && !verifyOnly) {
    if (!hasApplyPatch) {
      console.error(`Missing npm script "apply:patch". Add it first.`);
      process.exit(1);
    }
    const r = runStep("Apply patch", "npm", ["run", "apply:patch", "--", patchPosixRel!]);
    steps.push(r);
    if (r.status === "failed") success = false;
  } else if (patchAbs && verifyOnly) {
    steps.push({
      name: "Apply patch",
      command: "npm",
      args: ["run", "apply:patch", "--", patchPosixRel || ""],
      status: "skipped",
      output: "--verify-only set; skipping patch apply.",
      startedAt: nowIso(),
      endedAt: nowIso(),
    });
  }

  // Verify (always, if still successful)
  if (success) {
    const r = runStep("Verify", "npm", ["run", "verify"]);
    steps.push(r);
    if (r.status === "failed") success = false;
  }

  // Optional regen artifacts (only if verify passed)
  if (success && regen) {
    const regenCandidates: Array<{ name: string; script: string }> = [
      { name: "Regen repo map", script: "gen:repomap" },
      { name: "Regen fingerprint index", script: "gen:fingerprint-index" },
      { name: "Regen symbol index", script: "gen:symbol-index" },
      { name: "Regen dependency graph", script: "gen:deps-graph" },
    ];

    for (const c of regenCandidates) {
      if (!scripts[c.script]) {
        steps.push({
          name: c.name,
          command: "npm",
          args: ["run", c.script],
          status: "skipped",
          output: `No npm script "${c.script}" found; skipping.`,
          startedAt: nowIso(),
          endedAt: nowIso(),
        });
        continue;
      }

      const r = runStep(c.name, "npm", ["run", c.script]);
      steps.push(r);
      if (r.status === "failed") {
        success = false;
        break;
      }
    }
  } else if (!regen) {
    steps.push({
      name: "Regen artifacts",
      command: "npm",
      args: ["run", "(optional regen)"],
      status: "skipped",
      output: "Pass --regen to regenerate artifacts after verify.",
      startedAt: nowIso(),
      endedAt: nowIso(),
    });
  }

  const endedAt = nowIso();

  const report: WorkflowReportV1 = {
    schema: "WorkflowReportV1",
    id: workflowId,
    startedAt,
    endedAt,
    success,
    inputs: {
      patchPath: patchPosixRel ?? undefined,
      verifyOnly,
      regen,
    },
    steps,
  };

  const outAbs = path.resolve(repoRoot, "docs", "workflows", "last-run.json");
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(report, null, 2) + "\n", "utf8");

  if (!success) {
    console.error(`❌ Workflow FAILED`);
    console.error(`Report: ${toPosix(path.relative(repoRoot, outAbs))}`);
    process.exit(1);
  }

  console.log(`✅ Workflow OK`);
  console.log(`Report: ${toPosix(path.relative(repoRoot, outAbs))}`);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.120" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.130" kind="block" type="block" tags="block,toplevel"


main();

// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.WORKFLOW_RUN.130" kind="block" type="block" tags="block,toplevel"
