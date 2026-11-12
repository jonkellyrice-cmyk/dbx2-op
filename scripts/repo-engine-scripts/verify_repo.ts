// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.010" kind="module" type="imports" tags="module,imports"
//command: npm run verify

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.010" kind="module" type="imports" tags="module,imports"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.020" kind="types" type="types" tags="types"


type VerifyStep = {
  name: string;
  command: string;
  args: string[];
  required: boolean;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.020" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.030" kind="types" type="types" tags="types"


type VerifyResult = {
  step: string;
  status: "ok" | "failed" | "skipped";
  exitCode?: number;
  output?: string;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.030" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.040" kind="types" type="types" tags="types"


type VerifyReport = {
  schema: "VerifyReportV1";
  verifiedAt: string;
  success: boolean;
  results: VerifyResult[];
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.040" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.050" kind="var" type="var" tags="var"


const __filename = fileURLToPath(import.meta.url);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.050" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.060" kind="var" type="var" tags="var"

const __dirname = path.dirname(__filename);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.060" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.070" kind="var" type="var" tags="var"

const repoRoot = path.resolve(__dirname, "..");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.070" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.080" kind="function" type="function" tags="function"


function runStep(step: VerifyStep): VerifyResult {
  const res = spawnSync(step.command, step.args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: true,
  });

  if (res.error) {
    return {
      step: step.name,
      status: step.required ? "failed" : "skipped",
      output: String(res.error),
    };
  }

  if (res.status !== 0) {
    return {
      step: step.name,
      status: "failed",
      exitCode: res.status ?? undefined,
      output: (res.stdout || "") + (res.stderr || ""),
    };
  }

  return {
    step: step.name,
    status: "ok",
    exitCode: 0,
    output: res.stdout || "",
  };
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.080" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.090" kind="function" type="function" tags="function"


function main() {
  const steps: VerifyStep[] = [
    {
      name: "Fingerprint index (structural integrity)",
      command: "npm",
      args: ["run", "gen:fingerprint-index"],
      required: true,
    },
  ];

  // Optional: TypeScript check if script exists
  const pkgJsonPath = path.join(repoRoot, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    if (pkg.scripts?.typecheck) {
      steps.push({
        name: "TypeScript typecheck",
        command: "npm",
        args: ["run", "typecheck"],
        required: false,
      });
    }
  }

  const results: VerifyResult[] = [];
  let success = true;

  for (const step of steps) {
    const result = runStep(step);
    results.push(result);

    if (result.status === "failed" && step.required) {
      success = false;
      break;
    }
  }

  const report: VerifyReport = {
    schema: "VerifyReportV1",
    verifiedAt: new Date().toISOString(),
    success,
    results,
  };

  const outPath = path.join(repoRoot, "docs", "verify", "last-verify.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  if (!success) {
    console.error("❌ Verification FAILED");
    console.error(`See: docs/verify/last-verify.json`);
    process.exit(1);
  }

  console.log("✅ Verification PASSED");
  console.log(`Report: docs/verify/last-verify.json`);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.090" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.100" kind="block" type="block" tags="block,toplevel"


main();

// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.VERIFY_REPO.100" kind="block" type="block" tags="block,toplevel"
