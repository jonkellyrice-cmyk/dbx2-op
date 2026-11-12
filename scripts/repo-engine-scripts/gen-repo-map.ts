// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_REPO_MAP.010" intent="Imports" kind="module" tags="module,imports"
// command: npm run repo:repomap

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_REPO_MAP.010" kind="module" tags="module,imports"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_REPO_MAP.020" intent="Resolve __filename / __dirname" kind="var" tags="var"
const __filename = fileURLToPath(import.meta.url);// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.010" kind="var" type="var" tags="var"

const __dirname = path.dirname(__filename);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.010" kind="var" type="var" tags="var"

// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_REPO_MAP.020" kind="var" tags="var"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_REPO_MAP.030" intent="Repo paths" kind="var" tags="var"
// Repo root = one level up from /scripts
const repoRoot = path.resolve(__dirname, "..", "..");// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.020" kind="var" type="var" tags="var"

const scanRoot = repoRoot;
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.020" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.030" kind="var" type="var" tags="var"

const repoName = path.basename(repoRoot);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.030" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.040" kind="var" type="var" tags="var"


// Output location
const docsPath = path.resolve(repoRoot, "scripts", "repo-engine-outputs", "repository-map.md");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.040" kind="var" type="var" tags="var"

// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_REPO_MAP.030" kind="var" tags="var"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_REPO_MAP.040" intent="Ignore rules" kind="var" tags="var"
const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  ".turbo",
  ".vercel",
  ".idea",
  ".vscode",
  "_legacy",
  "_old",
  "_old-container",
  "docs", // prevent repo-map from listing itself
]);
// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_REPO_MAP.040" kind="var" tags="var"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_REPO_MAP.050" intent="Included extensions" kind="var" tags="var"
const INCLUDE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".scss",
  ".yml",
  ".yaml",
]);
// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_REPO_MAP.050" kind="var" tags="var"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_REPO_MAP.060" intent="Helpers" kind="function" tags="function"
function shouldIgnoreDir(name: string) {
  return IGNORE_DIRS.has(name) || name.startsWith("_legacy");
}// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.050" kind="function" type="function" tags="function"


function isInterestingFile(name: string) {
  const ext = path.extname(name).toLowerCase();
  if (!ext) return true; // README, LICENSE, etc.
  return INCLUDE_EXTS.has(ext);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.050" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.060" kind="function" type="function" tags="function"


function toPosix(p: string) {
  return p.split(path.sep).join("/");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.060" kind="function" type="function" tags="function"

// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_REPO_MAP.060" kind="function" tags="function"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_REPO_MAP.070" intent="Directory walk" kind="function" tags="function"
function walk(dirAbs: string, prefix = ""): string[] {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });

  const dirs = entries
    .filter((e) => e.isDirectory() && !e.isSymbolicLink())
    .map((e) => e.name)
    .filter((n) => !shouldIgnoreDir(n))
    .sort((a, b) => a.localeCompare(b));

  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter(isInterestingFile)
    .sort((a, b) => a.localeCompare(b));

  const combined = [
    ...dirs.map((d) => ({ type: "dir" as const, name: d })),
    ...files.map((f) => ({ type: "file" as const, name: f })),
  ];

  const lines: string[] = [];

  combined.forEach((item, idx) => {
    const isLast = idx === combined.length - 1;
    const branch = isLast ? "└─ " : "├─ ";

    const displayName = `${item.name}${item.type === "dir" ? "/" : ""}`;
    lines.push(`${prefix}${branch}${displayName}`);

    if (item.type === "dir") {
      const nextPrefix = prefix + (isLast ? "   " : "│  ");
      lines.push(...walk(path.join(dirAbs, item.name), nextPrefix));
    }
  });

  return lines;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_REPO_MAP.070" kind="function" tags="function"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_REPO_MAP.080" intent="Generate output" kind="block" tags="block,toplevel"
const treeLines = walk(scanRoot);// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.070" kind="var" type="var" tags="var"


const output = `# Repository map

> Auto-generated. Do not edit manually.
> Regenerate from the repo root (${repoName}) with: \`npm run gen:repomap\`

Generated: ${new Date().toISOString()}

## ${repoName}/

\`\`\`
${repoName}/
${treeLines.join("\n")}
\`\`\`
`;
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.070" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.080" kind="block" type="block" tags="block,toplevel"


fs.mkdirSync(path.dirname(docsPath), { recursive: true });
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.080" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.090" kind="block" type="block" tags="block,toplevel"

fs.writeFileSync(docsPath, output, "utf8");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_REPO_MAP.090" kind="block" type="block" tags="block,toplevel"


console.log(`Wrote: ${docsPath}`);
// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_REPO_MAP.080" kind="block" tags="block,toplevel"
