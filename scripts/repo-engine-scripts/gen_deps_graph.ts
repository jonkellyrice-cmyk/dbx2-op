// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.010" kind="module" type="imports" tags="module,imports"
//command: npm run gen:deps-graph

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import ts from "typescript";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.010" kind="module" type="imports" tags="module,imports"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.020" kind="var" type="var" tags="var"


const __filename = fileURLToPath(import.meta.url);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.020" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.030" kind="var" type="var" tags="var"

const __dirname = path.dirname(__filename);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.030" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.040" kind="var" type="var" tags="var"


// Repo root = one level up from /scripts
const repoRoot = path.resolve(__dirname, "..");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.040" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.050" kind="var" type="var" tags="var"

const scanRoot = repoRoot;
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.050" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.060" kind="var" type="var" tags="var"

const repoName = path.basename(repoRoot);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.060" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.070" kind="var" type="var" tags="var"


// Outputs
const jsonOutPath = path.resolve(repoRoot, "repo-engine-outputs", "deps-graph.json");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.070" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.080" kind="var" type="var" tags="var"

const mdOutPath = path.resolve(repoRoot, "repo-engine-outputs", "deps-graph.md");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.080" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.090" kind="var" type="var" tags="var"


// Ignore rules (match your other scripts)
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
  "docs", // avoid indexing generated outputs
]);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.090" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.100" kind="var" type="var" tags="var"


const INCLUDE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.100" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.110" kind="function" type="function" tags="function"


function shouldIgnoreDir(name: string) {
  return IGNORE_DIRS.has(name) || name.startsWith("_legacy");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.110" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.120" kind="function" type="function" tags="function"


function toPosix(p: string) {
  return p.split(path.sep).join("/");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.120" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.130" kind="function" type="function" tags="function"


function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.130" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.140" kind="function" type="function" tags="function"


function walkFiles(dirAbs: string): string[] {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });

  const dirs = entries
    .filter((e) => e.isDirectory() && !e.isSymbolicLink())
    .map((e) => e.name)
    .filter((n) => !shouldIgnoreDir(n))
    .sort((a, b) => a.localeCompare(b));

  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => INCLUDE_EXTS.has(path.extname(n).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const out: string[] = [];
  for (const d of dirs) out.push(...walkFiles(path.join(dirAbs, d)));
  for (const f of files) out.push(path.join(dirAbs, f));
  return out;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.140" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.150" kind="function" type="function" tags="function"


function readTextSafe(fileAbs: string): string | null {
  try {
    return fs.readFileSync(fileAbs, "utf8");
  } catch {
    return null;
  }
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.150" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.160" kind="types" type="types" tags="types"


type DepEdge = {
  from: string;          // posix rel path of importer
  to: string;            // posix rel path of imported file OR pkg:<name>
  spec: string;          // raw specifier text as written
  kind: "import" | "export_from" | "dynamic_import" | "require";
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.160" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.170" kind="types" type="types" tags="types"


type FileNode = {
  path: string;          // posix rel path
  fileHash: string;      // sha256(file text normalized)
  deps: string[];        // unique sorted list of "to" nodes
  revDeps: string[];     // filled later
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.170" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.180" kind="function" type="function" tags="function"


function isBareSpecifier(spec: string) {
  // not relative and not absolute
  return !spec.startsWith(".") && !spec.startsWith("/") && !spec.match(/^[A-Za-z]:\\/);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.180" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.190" kind="function" type="function" tags="function"


function packageNameFromSpecifier(spec: string) {
  // "@scope/name/whatever" -> "@scope/name"
  // "react/jsx-runtime" -> "react"
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
  }
  return spec.split("/")[0];
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.190" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.200" kind="function" type="function" tags="function"


function tryResolveLocalImport(fromAbs: string, spec: string): string | null {
  const fromDir = path.dirname(fromAbs);
  const base = path.resolve(fromDir, spec);

  // Candidate paths in deterministic order
  const candidates: string[] = [
    base,
    base + ".ts",
    base + ".tsx",
    base + ".js",
    base + ".jsx",
    base + ".mjs",
    base + ".cjs",
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.jsx"),
    path.join(base, "index.mjs"),
    path.join(base, "index.cjs"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.200" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.210" kind="function" type="function" tags="function"


function extractSpecifiers(sourceFile: ts.SourceFile): Array<{ spec: string; kind: DepEdge["kind"] }> {
  const out: Array<{ spec: string; kind: DepEdge["kind"] }> = [];

  function visit(node: ts.Node) {
    // import ... from "x"
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      out.push({ spec: node.moduleSpecifier.text, kind: "import" });
    }

    // export ... from "x"
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      out.push({ spec: node.moduleSpecifier.text, kind: "export_from" });
    }

    // dynamic import("x")
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const a0 = node.arguments[0];
      if (a0 && ts.isStringLiteral(a0)) out.push({ spec: a0.text, kind: "dynamic_import" });
    }

    // require("x")
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require") {
      const a0 = node.arguments[0];
      if (a0 && ts.isStringLiteral(a0)) out.push({ spec: a0.text, kind: "require" });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return out;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.210" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.220" kind="var" type="var" tags="var"


const allFilesAbs = walkFiles(scanRoot);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.220" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.230" kind="var" type="var" tags="var"


// Build forward edges
const edges: DepEdge[] = [];
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.230" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.240" kind="var" type="var" tags="var"

const nodesByPath = new Map<string, FileNode>();
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.240" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.250" kind="block" type="block" tags="block,toplevel"


for (const fileAbs of allFilesAbs) {
  const rel = toPosix(path.relative(scanRoot, fileAbs));
  const raw = readTextSafe(fileAbs);
  if (raw == null) continue;

  const normalized = raw.replace(/\r\n/g, "\n");
  const fileHash = sha256(normalized);

  const sf = ts.createSourceFile(
    fileAbs,
    normalized,
    ts.ScriptTarget.Latest,
    true,
    fileAbs.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : fileAbs.endsWith(".jsx")
        ? ts.ScriptKind.JSX
        : fileAbs.endsWith(".ts")
          ? ts.ScriptKind.TS
          : ts.ScriptKind.JS
  );

  const specs = extractSpecifiers(sf);

  const depTargets = new Set<string>();

  for (const { spec, kind } of specs) {
    if (isBareSpecifier(spec)) {
      const pkg = packageNameFromSpecifier(spec);
      const to = `pkg:${pkg}`;
      depTargets.add(to);
      edges.push({ from: rel, to, spec, kind });
      continue;
    }

    const resolvedAbs = tryResolveLocalImport(fileAbs, spec);
    if (!resolvedAbs) continue;

    const to = toPosix(path.relative(scanRoot, resolvedAbs));
    depTargets.add(to);
    edges.push({ from: rel, to, spec, kind });
  }

  nodesByPath.set(rel, {
    path: rel,
    fileHash,
    deps: Array.from(depTargets).sort((a, b) => a.localeCompare(b)),
    revDeps: [],
  });
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.250" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.260" kind="block" type="block" tags="block,toplevel"


// Ensure imported local files that weren't in scan set still appear (rare but can happen)
for (const e of edges) {
  if (e.to.startsWith("pkg:")) continue;
  if (!nodesByPath.has(e.to)) {
    nodesByPath.set(e.to, { path: e.to, fileHash: "", deps: [], revDeps: [] });
  }
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.260" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.270" kind="var" type="var" tags="var"


// Build reverse deps from edges (deterministic)
const rev = new Map<string, Set<string>>();
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.270" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.280" kind="block" type="block" tags="block,toplevel"

for (const e of edges) {
  if (!rev.has(e.to)) rev.set(e.to, new Set());
  rev.get(e.to)!.add(e.from);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.280" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.290" kind="block" type="block" tags="block,toplevel"


for (const [p, node] of nodesByPath) {
  const s = rev.get(p);
  node.revDeps = s ? Array.from(s).sort((a, b) => a.localeCompare(b)) : [];
  nodesByPath.set(p, node);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.290" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.300" kind="var" type="var" tags="var"


// Stable output ordering
const files = Array.from(nodesByPath.values()).sort((a, b) => a.path.localeCompare(b.path));
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.300" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.310" kind="var" type="var" tags="var"


const payload = {
  schema: "deps-graph-v1",
  repoName,
  generatedAt: new Date().toISOString(),
  totals: {
    filesScanned: files.length,
    edges: edges.length,
  },
  files,
  edges: edges
    .slice()
    .sort((a, b) => (a.from + "->" + a.to + ":" + a.spec).localeCompare(b.from + "->" + b.to + ":" + b.spec)),
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.310" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.320" kind="block" type="block" tags="block,toplevel"


fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.320" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.330" kind="block" type="block" tags="block,toplevel"

fs.writeFileSync(jsonOutPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.330" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.340" kind="function" type="function" tags="function"


// Markdown summary
function topN<T>(arr: T[], n: number) {
  return arr.slice(0, Math.min(n, arr.length));
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.340" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.350" kind="var" type="var" tags="var"


const topByDeps = files
  .filter((f) => !f.path.startsWith("pkg:"))
  .map((f) => ({ path: f.path, n: f.deps.length }))
  .sort((a, b) => b.n - a.n || a.path.localeCompare(b.path));
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.350" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.360" kind="var" type="var" tags="var"


const topByRev = files
  .filter((f) => !f.path.startsWith("pkg:"))
  .map((f) => ({ path: f.path, n: f.revDeps.length }))
  .sort((a, b) => b.n - a.n || a.path.localeCompare(b.path));
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.360" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.370" kind="var" type="var" tags="var"


const md: string[] = [];
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.370" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.380" kind="block" type="block" tags="block,toplevel"

md.push(`# Dependency graph`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.380" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.390" kind="block" type="block" tags="block,toplevel"

md.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.390" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.400" kind="block" type="block" tags="block,toplevel"

md.push(`> Auto-generated. Do not edit manually.`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.400" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.410" kind="block" type="block" tags="block,toplevel"

md.push(`> Regenerate from the repo root (${repoName}) with: \`npm run gen:deps-graph\``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.410" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.420" kind="block" type="block" tags="block,toplevel"

md.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.420" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.430" kind="block" type="block" tags="block,toplevel"

md.push(`Generated: ${payload.generatedAt}`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.430" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.440" kind="block" type="block" tags="block,toplevel"

md.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.440" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.450" kind="block" type="block" tags="block,toplevel"

md.push(`## Totals`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.450" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.460" kind="block" type="block" tags="block,toplevel"

md.push(`- Files scanned: **${payload.totals.filesScanned}**`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.460" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.470" kind="block" type="block" tags="block,toplevel"

md.push(`- Edges found: **${payload.totals.edges}**`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.470" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.480" kind="block" type="block" tags="block,toplevel"

md.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.480" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.490" kind="block" type="block" tags="block,toplevel"

md.push(`## Most dependent files (top 20)`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.490" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.500" kind="block" type="block" tags="block,toplevel"

for (const x of topN(topByDeps, 20)) md.push(`- ${x.path} — ${x.n}`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.500" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.510" kind="block" type="block" tags="block,toplevel"

md.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.510" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.520" kind="block" type="block" tags="block,toplevel"

md.push(`## Most depended-on files (top 20)`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.520" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.530" kind="block" type="block" tags="block,toplevel"

for (const x of topN(topByRev, 20)) md.push(`- ${x.path} — ${x.n}`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.530" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.540" kind="block" type="block" tags="block,toplevel"

md.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.540" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.550" kind="block" type="block" tags="block,toplevel"

md.push(`## Files`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.550" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.560" kind="block" type="block" tags="block,toplevel"

md.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.560" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.570" kind="block" type="block" tags="block,toplevel"


for (const f of files) {
  if (f.path.startsWith("pkg:")) continue;

  md.push(`### ${f.path}`);
  md.push(`- Deps (${f.deps.length}): ${f.deps.length ? f.deps.map((d) => `\`${d}\``).join(", ") : "(none)"}`);
  md.push(`- Reverse deps (${f.revDeps.length}): ${f.revDeps.length ? f.revDeps.map((d) => `\`${d}\``).join(", ") : "(none)"}`);
  md.push(``);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.570" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.580" kind="block" type="block" tags="block,toplevel"


fs.mkdirSync(path.dirname(mdOutPath), { recursive: true });
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.580" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.590" kind="block" type="block" tags="block,toplevel"

fs.writeFileSync(mdOutPath, md.join("\n") + "\n", "utf8");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.590" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.600" kind="block" type="block" tags="block,toplevel"


console.log(`Wrote: ${jsonOutPath}`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.600" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.610" kind="block" type="block" tags="block,toplevel"

console.log(`Wrote: ${mdOutPath}`);

// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_DEPS_GRAPH.610" kind="block" type="block" tags="block,toplevel"
