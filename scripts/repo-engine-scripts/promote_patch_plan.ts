// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.010" kind="module" type="imports" tags="module,imports"
//command: npm run promote:patch-plan -- docs/patch-plans/PLAN....json
//optional: npm run promote:patch-plan -- docs/patch-plans/PLAN....json --allow-placeholders

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.010" kind="module" type="imports" tags="module,imports"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.020" kind="types" type="types" tags="types"


type PatchPlanV1 = {
  schema: "PatchPlanV1";
  id: string;
  generatedAt: string;
  repoName: string;
  inputs: {
    blockKey?: string;
    symbolKey?: string;
    file?: string;
    allBlocks?: boolean;
  };
  targets: Array<{
    blockKey: string;
    file: string;
    blockId: string;
    startLine: number;
    endLine: number;
    lineCount: number;
    fileHash: string;
    contentHash: string;
    blockText: string;
  }>;
  recommendedOps: Array<
    | {
        op: "replace_block";
        blockKey: string;
        expectedContentHash: string;
        newBlockText: string; // may be "__FILL__"
      }
    | {
        op: "insert_block_after";
        afterBlockKey: string;
        newBlockText: string; // may be "__FILL__"
      }
    | {
        op: "delete_block";
        blockKey: string;
        expectedContentHash: string;
      }
  >;
  notes: string[];
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.020" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.030" kind="types" type="types" tags="types"


type PatchDocumentV1 = {
  schema: "PatchDocumentV1";
  id: string;
  generatedAt: string;
  sourcePlanId: string;
  repoName: string;
  ops: Array<
    | {
        op: "replace_block";
        blockKey: string;
        expectedContentHash: string;
        newBlockText: string;
      }
    | {
        op: "insert_block_after";
        afterBlockKey: string;
        newBlockText: string;
      }
    | {
        op: "delete_block";
        blockKey: string;
        expectedContentHash: string;
      }
  >;
  notes: string[];
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.030" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.040" kind="var" type="var" tags="var"


const __filename = fileURLToPath(import.meta.url);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.040" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.050" kind="var" type="var" tags="var"

const __dirname = path.dirname(__filename);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.050" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.060" kind="var" type="var" tags="var"

const repoRoot = path.resolve(__dirname, "..");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.060" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.070" kind="var" type="var" tags="var"

const repoName = path.basename(repoRoot);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.070" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.080" kind="function" type="function" tags="function"


function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.080" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.090" kind="function" type="function" tags="function"


function toPosix(p: string) {
  return p.split(path.sep).join("/");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.090" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.100" kind="function" type="function" tags="function"


function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 140);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.100" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.110" kind="function" type="function" tags="function"


function readJson<T>(absPath: string): T {
  const raw = fs.readFileSync(absPath, "utf8");
  return JSON.parse(raw) as T;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.110" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.120" kind="function" type="function" tags="function"


function writeText(absPath: string, text: string) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, text, "utf8");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.120" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.130" kind="function" type="function" tags="function"


function isPlaceholder(s: string) {
  return s.trim() === "__FILL__";
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.130" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.140" kind="function" type="function" tags="function"


function main() {
  const args = process.argv.slice(2);
  const allowPlaceholders = args.includes("--allow-placeholders");

  const planPathArg = args.find((a) => !a.startsWith("--"));
  if (!planPathArg) {
    console.error(`Usage: npm run promote:patch-plan -- <planPath> [--allow-placeholders]`);
    process.exit(2);
  }

  const planAbs = path.isAbsolute(planPathArg)
    ? planPathArg
    : path.resolve(repoRoot, planPathArg.split("/").join(path.sep));

  if (!fs.existsSync(planAbs)) {
    console.error(`Plan not found: ${planPathArg}`);
    process.exit(1);
  }

  const plan = readJson<PatchPlanV1>(planAbs);
  if (plan.schema !== "PatchPlanV1") {
    console.error(`Not a PatchPlanV1 file: ${planPathArg}`);
    process.exit(1);
  }

  // Deterministic ordering: stringify key
  const ops = [...plan.recommendedOps].sort((a, b) => {
    const ak =
      a.op === "insert_block_after"
        ? `1:${a.afterBlockKey}`
        : a.op === "delete_block"
        ? `2:${a.blockKey}`
        : `3:${a.blockKey}`;
    const bk =
      b.op === "insert_block_after"
        ? `1:${b.afterBlockKey}`
        : b.op === "delete_block"
        ? `2:${b.blockKey}`
        : `3:${b.blockKey}`;
    return ak.localeCompare(bk);
  });

  const placeholderProblems: string[] = [];

  for (const op of ops) {
    if (op.op === "replace_block") {
      if (!op.blockKey || !op.expectedContentHash) {
        console.error(`Invalid replace_block op (missing blockKey/expectedContentHash).`);
        process.exit(1);
      }
      if (isPlaceholder(op.newBlockText) && !allowPlaceholders) {
        placeholderProblems.push(`replace_block ${op.blockKey}`);
      }
    }

    if (op.op === "insert_block_after") {
      if (!op.afterBlockKey) {
        console.error(`Invalid insert_block_after op (missing afterBlockKey).`);
        process.exit(1);
      }
      if (isPlaceholder(op.newBlockText) && !allowPlaceholders) {
        placeholderProblems.push(`insert_block_after ${op.afterBlockKey}`);
      }
    }

    if (op.op === "delete_block") {
      if (!op.blockKey || !op.expectedContentHash) {
        console.error(`Invalid delete_block op (missing blockKey/expectedContentHash).`);
        process.exit(1);
      }
    }
  }

  if (placeholderProblems.length && !allowPlaceholders) {
    console.error(`Refusing to promote plan: placeholders still present in ops:`);
    for (const p of placeholderProblems) console.error(`- ${p}`);
    console.error(`Fill in newBlockText or re-run with --allow-placeholders (not recommended).`);
    process.exit(1);
  }

  const patchId = `PATCH.${new Date().toISOString().replace(/[:.]/g, "")}.${safeName(plan.id)}`;

  const patch: PatchDocumentV1 = {
    schema: "PatchDocumentV1",
    id: patchId,
    generatedAt: new Date().toISOString(),
    sourcePlanId: plan.id,
    repoName: plan.repoName || repoName,
    ops,
    notes: [
      `Promoted from plan: ${plan.id}`,
      `Plan path: ${toPosix(path.relative(repoRoot, planAbs))}`,
      ...(plan.notes || []),
    ],
  };

  const json = JSON.stringify(patch, null, 2) + "\n";

  const outAbs = path.resolve(repoRoot, "docs", "patches", `${patchId}.json`);
  writeText(outAbs, json);

  // Small md companion (quick human check)
  const mdAbs = path.resolve(repoRoot, "docs", "patches", `${patchId}.md`);
  const md: string[] = [];
  md.push(`# Patch document`);
  md.push(``);
  md.push(`- id: \`${patch.id}\``);
  md.push(`- generated: ${patch.generatedAt}`);
  md.push(`- sourcePlanId: \`${patch.sourcePlanId}\``);
  md.push(`- ops: ${patch.ops.length}`);
  md.push(``);
  md.push(`## Ops (ordered)`);
  for (const op of patch.ops) {
    if (op.op === "replace_block") {
      md.push(`- replace_block \`${op.blockKey}\` (guard: \`${op.expectedContentHash}\`)`);
    } else if (op.op === "insert_block_after") {
      md.push(`- insert_block_after \`${op.afterBlockKey}\``);
    } else {
      md.push(`- delete_block \`${op.blockKey}\` (guard: \`${op.expectedContentHash}\`)`);
    }
  }
  md.push(``);
  md.push(`## Notes`);
  for (const n of patch.notes) md.push(`- ${n}`);
  md.push(``);

  writeText(mdAbs, md.join("\n"));

  console.log(`Wrote: ${toPosix(path.relative(repoRoot, outAbs))}`);
  console.log(`Wrote: ${toPosix(path.relative(repoRoot, mdAbs))}`);
  console.log(`Patch hash (sha256 json): ${sha256(json)}`);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.140" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.150" kind="block" type="block" tags="block,toplevel"


main();

// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.PROMOTE_PATCH_PLAN.150" kind="block" type="block" tags="block,toplevel"
