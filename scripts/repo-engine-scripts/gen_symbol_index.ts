// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.010" kind="module" type="imports" tags="module,imports"
//command: npm run gen:symbol-index

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import ts from "typescript";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.010" kind="module" type="imports" tags="module,imports"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.020" kind="var" type="var" tags="var"


// -----------------------------
// Setup paths
// -----------------------------
const __filename = fileURLToPath(import.meta.url);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.020" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.030" kind="var" type="var" tags="var"

const __dirname = path.dirname(__filename);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.030" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.040" kind="var" type="var" tags="var"


const repoRoot = path.resolve(__dirname, "..");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.040" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.050" kind="var" type="var" tags="var"

const scanRoot = repoRoot;
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.050" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.060" kind="var" type="var" tags="var"

const repoName = path.basename(repoRoot);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.060" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.070" kind="var" type="var" tags="var"


const jsonOutPath = path.resolve(repoRoot, "repo-engine-outputs", "symbol-index.json");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.070" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.080" kind="var" type="var" tags="var"

const mdOutPath = path.resolve(repoRoot, "repo-engine-outputs", "symbol-index.md");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.080" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.090" kind="var" type="var" tags="var"


// -----------------------------
// Scan config
// -----------------------------
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
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.090" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.100" kind="var" type="var" tags="var"


const INCLUDE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.100" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.110" kind="function" type="function" tags="function"


function shouldIgnoreDir(name: string) {
  return IGNORE_DIRS.has(name) || name.startsWith("_legacy");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.110" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.120" kind="function" type="function" tags="function"


function toPosix(p: string) {
  return p.split(path.sep).join("/");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.120" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.130" kind="function" type="function" tags="function"


function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.130" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.140" kind="function" type="function" tags="function"


function readTextSafe(fileAbs: string): string | null {
  try {
    return fs.readFileSync(fileAbs, "utf8");
  } catch {
    return null;
  }
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.140" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.150" kind="function" type="function" tags="function"


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
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.150" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.160" kind="types" type="types" tags="types"


// -----------------------------
// Symbol extraction
// -----------------------------
type ExportKind = "named" | "default" | "reexport" | "none";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.160" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.170" kind="types" type="types" tags="types"

type SymbolKind =
  | "function"
  | "class"
  | "interface"
  | "type"
  | "enum"
  | "const"
  | "let"
  | "var"
  | "component"
  | "namespace"
  | "unknown";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.170" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.180" kind="types" type="types" tags="types"


type SymbolRecord = {
  symbolKey: string; // stable pointer: file:path + ":" + exportKind + ":" + kind + ":" + name
  name: string;
  kind: SymbolKind;
  exportKind: ExportKind;

  file: string; // posix relative
  startLine: number; // 1-based
  endLine: number; // 1-based

  signature: string; // single-line snippet
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.180" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.190" kind="function" type="function" tags="function"


function isExported(node: ts.Node): boolean {
  const mods = (node as any).modifiers as ts.NodeArray<ts.Modifier> | undefined;
  if (!mods) return false;
  return mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.190" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.200" kind="function" type="function" tags="function"


function isDefaultExport(node: ts.Node): boolean {
  const mods = (node as any).modifiers as ts.NodeArray<ts.Modifier> | undefined;
  if (!mods) return false;
  return mods.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.200" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.210" kind="function" type="function" tags="function"


function getNameText(name: ts.DeclarationName | undefined): string {
  if (!name) return "";
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name)) return name.text;
  if (ts.isNumericLiteral(name)) return name.text;
  return name.getText();
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.210" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.220" kind="function" type="function" tags="function"


function lineRange(sf: ts.SourceFile, node: ts.Node): { startLine: number; endLine: number } {
  const start = sf.getLineAndCharacterOfPosition(node.getStart(sf, false)).line + 1;
  const end = sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  return { startLine: start, endLine: end };
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.220" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.230" kind="function" type="function" tags="function"


function oneLineSignature(text: string, maxLen = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= maxLen ? t : t.slice(0, maxLen - 1) + "…";
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.230" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.240" kind="function" type="function" tags="function"


function inferKindForVar(name: string, initializer: ts.Expression | undefined): SymbolKind {
  // Heuristic: UpperCamelCase assigned to function => likely React component
  if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
    if (/^[A-Z]/.test(name)) return "component";
    return "const";
  }
  return "const";
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.240" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.250" kind="function" type="function" tags="function"


function makeSymbolKey(r: Omit<SymbolRecord, "symbolKey">): string {
  // Deterministic, human-readable; avoids hashes for diff friendliness
  return `${r.file}:${r.exportKind}:${r.kind}:${r.name || "(anonymous)"}`;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.250" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.260" kind="function" type="function" tags="function"


function addRecord(
  out: SymbolRecord[],
  rec: Omit<SymbolRecord, "symbolKey">,
  seen: Set<string>
) {
  const symbolKey = makeSymbolKey(rec);
  if (seen.has(symbolKey)) return;
  seen.add(symbolKey);
  out.push({ ...rec, symbolKey });
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.260" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.270" kind="function" type="function" tags="function"


function extractSymbolsFromSourceFile(fileRelPosix: string, sf: ts.SourceFile): SymbolRecord[] {
  const out: SymbolRecord[] = [];
  const seen = new Set<string>();

  function recordForDecl(node: ts.Node, kind: SymbolKind, name: string, exportKind: ExportKind) {
    const { startLine, endLine } = lineRange(sf, node);
    const signature = oneLineSignature(node.getText(sf));
    addRecord(
      out,
      {
        name: name || "(anonymous)",
        kind,
        exportKind,
        file: fileRelPosix,
        startLine,
        endLine,
        signature,
      },
      seen
    );
  }

  function visit(node: ts.Node) {
    // Re-exports: export { x } from "y"; export * from "y";
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      const exportKind: ExportKind = "reexport";
      const name = node.exportClause
        ? node.exportClause.getText(sf)
        : "*";
      recordForDecl(node, "unknown", `from:${spec} ${name}`, exportKind);
    }

    // export default <expr>
    if (ts.isExportAssignment(node)) {
      const exportKind: ExportKind = "default";
      recordForDecl(node, "unknown", "default", exportKind);
    }

    // Function declarations
    if (ts.isFunctionDeclaration(node)) {
      const name = node.name?.text || "";
      const exported = isExported(node);
      const def = isDefaultExport(node);
      const exportKind: ExportKind = def ? "default" : exported ? "named" : "none";
      recordForDecl(node, "function", name || (def ? "default" : ""), exportKind);
    }

    // Class declarations
    if (ts.isClassDeclaration(node)) {
      const name = node.name?.text || "";
      const exported = isExported(node);
      const def = isDefaultExport(node);
      const exportKind: ExportKind = def ? "default" : exported ? "named" : "none";
      recordForDecl(node, "class", name || (def ? "default" : ""), exportKind);
    }

    // Interfaces
    if (ts.isInterfaceDeclaration(node)) {
      const name = node.name?.text || "";
      const exported = isExported(node);
      const exportKind: ExportKind = exported ? "named" : "none";
      recordForDecl(node, "interface", name, exportKind);
    }

    // Type aliases
    if (ts.isTypeAliasDeclaration(node)) {
      const name = node.name?.text || "";
      const exported = isExported(node);
      const exportKind: ExportKind = exported ? "named" : "none";
      recordForDecl(node, "type", name, exportKind);
    }

    // Enums
    if (ts.isEnumDeclaration(node)) {
      const name = node.name?.text || "";
      const exported = isExported(node);
      const exportKind: ExportKind = exported ? "named" : "none";
      recordForDecl(node, "enum", name, exportKind);
    }

    // Namespaces / modules
    if (ts.isModuleDeclaration(node)) {
      const name = getNameText(node.name as any);
      const exported = isExported(node);
      const exportKind: ExportKind = exported ? "named" : "none";
      recordForDecl(node, "namespace", name, exportKind);
    }

    // Top-level variable statements (const/let/var)
    if (ts.isVariableStatement(node)) {
      const exported = isExported(node);
      const exportKind: ExportKind = exported ? "named" : "none";
      const declList = node.declarationList;
      const flags = declList.flags;

      const baseKind: SymbolKind =
        flags & ts.NodeFlags.Const
          ? "const"
          : flags & ts.NodeFlags.Let
            ? "let"
            : "var";

      for (const decl of declList.declarations) {
        const name = ts.isIdentifier(decl.name) ? decl.name.text : decl.name.getText(sf);
        const kind = baseKind === "const" ? inferKindForVar(name, decl.initializer) : baseKind;
        recordForDecl(node, kind, name, exportKind);
      }
    }

    ts.forEachChild(node, visit);
  }

  // Only visit top-level statements (keeps it “basic” and low-noise)
  for (const stmt of sf.statements) {
    visit(stmt);
  }

  // Deterministic ordering
  out.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.startLine !== b.startLine) return a.startLine - b.startLine;
    return a.symbolKey.localeCompare(b.symbolKey);
  });

  return out;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.270" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.280" kind="var" type="var" tags="var"


// -----------------------------
// Main
// -----------------------------
const filesAbs = walkFiles(scanRoot);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.280" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.290" kind="var" type="var" tags="var"


const allSymbols: SymbolRecord[] = [];
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.290" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.300" kind="var" type="var" tags="var"

let filesScanned = 0;
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.300" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.310" kind="block" type="block" tags="block,toplevel"


for (const fileAbs of filesAbs) {
  const rel = toPosix(path.relative(scanRoot, fileAbs));
  const raw = readTextSafe(fileAbs);
  if (raw == null) continue;

  const normalized = raw.replace(/\r\n/g, "\n");
  const fileHash = sha256(normalized); // not currently used per-file, but kept for future schema
  void fileHash;

  const scriptKind =
    fileAbs.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : fileAbs.endsWith(".jsx")
        ? ts.ScriptKind.JSX
        : fileAbs.endsWith(".ts")
          ? ts.ScriptKind.TS
          : ts.ScriptKind.JS;

  const sf = ts.createSourceFile(fileAbs, normalized, ts.ScriptTarget.Latest, true, scriptKind);

  const syms = extractSymbolsFromSourceFile(rel, sf);
  allSymbols.push(...syms);
  filesScanned++;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.310" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.320" kind="block" type="block" tags="block,toplevel"


// Stable ordering across repo
allSymbols.sort((a, b) => {
  if (a.file !== b.file) return a.file.localeCompare(b.file);
  if (a.startLine !== b.startLine) return a.startLine - b.startLine;
  return a.symbolKey.localeCompare(b.symbolKey);
});
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.320" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.330" kind="var" type="var" tags="var"


const payload = {
  schema: "symbol-index-v1",
  repoName,
  generatedAt: new Date().toISOString(),
  totals: {
    filesScanned,
    symbolsFound: allSymbols.length,
  },
  symbols: allSymbols,
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.330" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.340" kind="block" type="block" tags="block,toplevel"


fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.340" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.350" kind="block" type="block" tags="block,toplevel"

fs.writeFileSync(jsonOutPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.350" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.360" kind="var" type="var" tags="var"


// Markdown
const md: string[] = [];
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.360" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.370" kind="block" type="block" tags="block,toplevel"

md.push(`# Symbol index`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.370" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.380" kind="block" type="block" tags="block,toplevel"

md.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.380" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.390" kind="block" type="block" tags="block,toplevel"

md.push(`> Auto-generated. Do not edit manually.`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.390" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.400" kind="block" type="block" tags="block,toplevel"

md.push(`> Regenerate from the repo root (${repoName}) with: \`npm run gen:symbol-index\``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.400" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.410" kind="block" type="block" tags="block,toplevel"

md.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.410" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.420" kind="block" type="block" tags="block,toplevel"

md.push(`Generated: ${payload.generatedAt}`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.420" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.430" kind="block" type="block" tags="block,toplevel"

md.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.430" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.440" kind="block" type="block" tags="block,toplevel"

md.push(`## Totals`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.440" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.450" kind="block" type="block" tags="block,toplevel"

md.push(`- Files scanned: **${payload.totals.filesScanned}**`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.450" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.460" kind="block" type="block" tags="block,toplevel"

md.push(`- Symbols found: **${payload.totals.symbolsFound}**`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.460" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.470" kind="block" type="block" tags="block,toplevel"

md.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.470" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.480" kind="block" type="block" tags="block,toplevel"

md.push(`## Symbols`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.480" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.490" kind="block" type="block" tags="block,toplevel"

md.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.490" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.500" kind="block" type="block" tags="block,toplevel"

md.push(`| File | Lines | Export | Kind | Name | Key | Signature |`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.500" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.510" kind="block" type="block" tags="block,toplevel"

md.push(`|---|---:|---|---|---|---|---|`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.510" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.520" kind="block" type="block" tags="block,toplevel"


for (const s of allSymbols) {
  const lines = `${s.startLine}–${s.endLine}`;
  const file = s.file.replace(/\|/g, "\\|");
  const name = s.name.replace(/\|/g, "\\|");
  const sig = s.signature.replace(/\|/g, "\\|");
  md.push(
    `| \`${file}\` | ${lines} | \`${s.exportKind}\` | \`${s.kind}\` | \`${name}\` | \`${s.symbolKey}\` | \`${sig}\` |`
  );
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.520" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.530" kind="block" type="block" tags="block,toplevel"


fs.mkdirSync(path.dirname(mdOutPath), { recursive: true });
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.530" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.540" kind="block" type="block" tags="block,toplevel"

fs.writeFileSync(mdOutPath, md.join("\n") + "\n", "utf8");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.540" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.550" kind="block" type="block" tags="block,toplevel"


console.log(`Wrote: ${jsonOutPath}`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.550" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.560" kind="block" type="block" tags="block,toplevel"

console.log(`Wrote: ${mdOutPath}`);

// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_SYMBOL_INDEX.560" kind="block" type="block" tags="block,toplevel"
