// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.010" kind="module" type="imports" tags="module,imports"
// hide-root-contracts.ts
// Cross-platform replacement for the old .sh version.
// Run: npm run repo:hide-root

import fs from "node:fs";
import path from "node:path";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.010" kind="module" type="imports" tags="module,imports"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.020" kind="var" type="var" tags="var"


const repoRoot = process.cwd();
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.020" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.030" kind="function" type="function" tags="function"


// ----------------------------
// helpers
// ----------------------------
function ensureDir(rel: string) {
  const abs = path.join(repoRoot, rel);
  fs.mkdirSync(abs, { recursive: true });
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.030" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.040" kind="function" type="function" tags="function"


function ensureFile(rel: string, initial = "") {
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs)) fs.writeFileSync(abs, initial, "utf8");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.040" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.050" kind="function" type="function" tags="function"


function readText(rel: string) {
  const abs = path.join(repoRoot, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.050" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.060" kind="function" type="function" tags="function"


function writeText(rel: string, text: string) {
  const abs = path.join(repoRoot, rel);
  fs.writeFileSync(abs, text, "utf8");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.060" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.070" kind="function" type="function" tags="function"


function appendIfMissing(rel: string, marker: string, block: string) {
  const current = readText(rel);
  if (current.includes(marker)) return;
  const next = (current.trimEnd() + "\n\n" + block.trim() + "\n");
  writeText(rel, next);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.070" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.080" kind="block" type="block" tags="block,toplevel"


// ----------------------------
// 0) Ensure folders exist
// ----------------------------
ensureDir("root-meta/other");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.080" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.090" kind="block" type="block" tags="block,toplevel"

ensureDir("root-meta/scratch");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.090" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.100" kind="block" type="block" tags="block,toplevel"

ensureDir(".vscode");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.100" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.110" kind="block" type="block" tags="block,toplevel"


// ----------------------------
// 1) Append SAFE ignores only
// ----------------------------
ensureFile(".gitignore", "");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.110" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.120" kind="var" type="var" tags="var"


const GITIGNORE_MARKER = "Repo Engine / Generated Outputs";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.120" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.130" kind="var" type="var" tags="var"

const GITIGNORE_BLOCK = `
# ===============================
# Repo Engine / Generated Outputs
# ===============================
/scripts/repo-engine-outputs/
/root-meta/other/
/root-meta/scratch/

# ===============================
# Build / Runtime Noise
# ===============================
.next/
dist/
build/
.vercel/
.turbo/

# ===============================
# Logs / Reports
# ===============================
*.log
mdv-tool.report.json
`;
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.130" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.140" kind="block" type="block" tags="block,toplevel"


appendIfMissing(".gitignore", GITIGNORE_MARKER, GITIGNORE_BLOCK);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.140" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.150" kind="var" type="var" tags="var"


// ----------------------------
// 2) VS Code hide rules (visual hide only; still tracked by git)
// ----------------------------
const vscodeSettings = {
  // Hide root "contract" files from Explorer to reduce clutter.
  // These remain in repo root as required by tooling.
  "files.exclude": {
    "package.json": true,
    "package-lock.json": true,
    "next.config.ts": true,
    "next-env.d.ts": true,
    "tsconfig.json": true,
    "eslint.config.mjs": true,
    "postcss.config.mjs": true,
    ".gitignore": true,
    "README.md": false
  },

  // Also hide whatever .gitignore hides (generated outputs, build folders, etc.)
  "explorer.excludeGitIgnore": true,

  // Optional quality-of-life
  "explorer.compactFolders": false
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.150" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.160" kind="block" type="block" tags="block,toplevel"


writeText(".vscode/settings.json", JSON.stringify(vscodeSettings, null, 2) + "\n");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.160" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.170" kind="block" type="block" tags="block,toplevel"


// ----------------------------
// done
// ----------------------------
console.log("✅ root-meta/ ensured");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.170" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.180" kind="block" type="block" tags="block,toplevel"

console.log("✅ .gitignore updated (safe ignores only)");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.180" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.190" kind="block" type="block" tags="block,toplevel"

console.log("✅ .vscode/settings.json written (root contracts hidden visually)");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.190" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.200" kind="block" type="block" tags="block,toplevel"

console.log("");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.200" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.210" kind="block" type="block" tags="block,toplevel"

console.log("Note: You may need to reload VS Code / Codespaces for Explorer hiding to refresh.");

// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.HIDE_ROOT_CONTRACTS.210" kind="block" type="block" tags="block,toplevel"
