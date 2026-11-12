// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.010" kind="module" type="imports" tags="module,imports"
//command: npm run gen:fingerprint-index

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.010" kind="module" type="imports" tags="module,imports"


// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.FP_INDEX.010" kind="setup" type="setup" tags="fingerprint,index,paths,esm"
const __filename = fileURLToPath(import.meta.url);// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.020" kind="var" type="var" tags="var"

const __dirname = path.dirname(__filename);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.020" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.030" kind="var" type="var" tags="var"


// Repo root = one level up from /scripts
const repoRoot = path.resolve(__dirname, "..");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.030" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.040" kind="var" type="var" tags="var"


// WHOLE-REPO scan (intentional)
const scanRoot = repoRoot;
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.040" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.050" kind="var" type="var" tags="var"


const repoName = path.basename(repoRoot);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.050" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.060" kind="var" type="var" tags="var"


// Outputs
const mdOutPath = path.resolve(repoRoot, "repo-engine-outputs", "fingerprint-index.md");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.060" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.070" kind="var" type="var" tags="var"

const jsonOutPath = path.resolve(repoRoot, "repo-engine-outputs", "fingerprint-index.json");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.070" kind="var" type="var" tags="var"

// MDV_BLOCK:END id="ENG.SCRIPTS.FP_INDEX.010" kind="setup" type="setup" tags="fingerprint,index,paths,esm"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.FP_INDEX.020" kind="config" type="config" tags="fingerprint,index,scan,filters"
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
  "docs", // avoid indexing generated outputs by default
]);// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.080" kind="var" type="var" tags="var"


// Include only source-ish files; explicitly skip .json per your policy.
const INCLUDE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".md",
  ".css",
  ".scss",
  ".yml",
  ".yaml",
]);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.080" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.090" kind="function" type="function" tags="function"


function shouldIgnoreDir(name: string) {
  if (IGNORE_DIRS.has(name)) return true;
  if (name.startsWith("_legacy")) return true;
  return false;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.090" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.100" kind="function" type="function" tags="function"


function isInterestingFile(name: string) {
  const ext = path.extname(name).toLowerCase();
  if (!ext) return true; // README, LICENSE, etc.
  return INCLUDE_EXTS.has(ext);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.100" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.110" kind="function" type="function" tags="function"


function toPosix(p: string) {
  return p.split(path.sep).join("/");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.110" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.120" kind="function" type="function" tags="function"


function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.120" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.130" kind="function" type="function" tags="function"


function trimForMd(s: string, maxLen = 120) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= maxLen ? t : t.slice(0, maxLen - 1) + "…";
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.130" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.140" kind="function" type="function" tags="function"


function escapeMdCell(s: string) {
  return s.replace(/\|/g, "\\|");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.140" kind="function" type="function" tags="function"

// MDV_BLOCK:END id="ENG.SCRIPTS.FP_INDEX.020" kind="config" type="config" tags="fingerprint,index,scan,filters"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.FP_INDEX.030" kind="parser" type="parser" tags="fingerprint,parser,mdv_block"
type BlockAttrs = {
  id?: string;
  kind?: string;
  type?: string;
  tags?: string;
  [k: string]: string | undefined;
};// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.150" kind="types" type="types" tags="types"


type FingerprintBlock = {
  id: string;
  blockKey: string; // filePathPosix + ":" + id
  blockOrdinalInFile: number; // 0-based ordinal by appearance in file

  kind: string;
  type: string;
  tags: string[];

  startLine: number; // inclusive, 1-based (BEGIN line)
  endLine: number; // inclusive, 1-based (END line)
  lineCount: number;

  contentHash: string; // sha256 of slice (BEGIN..END inclusive)
  beginLineText: string;
  endLineText: string;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.150" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.160" kind="types" type="types" tags="types"


type FileIndex = {
  path: string; // posix relative path
  fileHash: string;
  totalLines: number;
  blocks: FingerprintBlock[];
  issues: Array<{
    kind:
      | "missing_end"
      | "orphan_end"
      | "id_mismatch"
      | "malformed_begin"
      | "malformed_end";
    message: string;
    line: number;
  }>;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.160" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.170" kind="function" type="function" tags="function"


function parseAttrsFromMarkerLine(line: string): BlockAttrs {
  const attrs: BlockAttrs = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.170" kind="function" type="function" tags="function"


function isBegin(line: string) {
  return /^\s*\/\/\s*MDV_BLOCK:BEGIN\b/.test(line);
}

function isEnd(line: string) {
  return /^\s*\/\/\s*MDV_BLOCK:END\b/.test(line);
}// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.180" kind="function" type="function" tags="function"


function splitTags(tagsRaw: string | undefined): string[] {
  if (!tagsRaw) return [];
  return tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.180" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.190" kind="types" type="types" tags="types"


type OpenBlock = {
  beginLineNum: number;
  beginLineText: string;
  attrs: BlockAttrs;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.190" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.200" kind="function" type="function" tags="function"


function parseFingerprintsFromText(text: string): {
  blocks: Omit<FingerprintBlock, "blockKey" | "blockOrdinalInFile">[];
  issues: FileIndex["issues"];
} {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const issues: FileIndex["issues"] = [];
  const blocks: Omit<FingerprintBlock, "blockKey" | "blockOrdinalInFile">[] = [];

  const stack: OpenBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    if (isBegin(line)) {
      const attrs = parseAttrsFromMarkerLine(line);

      // Parity with new blockifier:
      // - BEGIN should have id + kind; type is optional (but expected).
      if (!attrs.id || !attrs.kind) {
        issues.push({
          kind: "malformed_begin",
          message: `Malformed BEGIN (missing id/kind): ${line.trim()}`,
          line: lineNum,
        });
      }

      stack.push({
        beginLineNum: lineNum,
        beginLineText: line,
        attrs,
      });
      continue;
    }

    if (isEnd(line)) {
      const endAttrs = parseAttrsFromMarkerLine(line);
      const open = stack.pop();

      if (!open) {
        issues.push({
          kind: "orphan_end",
          message: `END without matching BEGIN: ${line.trim()}`,
          line: lineNum,
        });
        continue;
      }

      const beginId = (open.attrs.id ?? "").trim();
      const endId = (endAttrs.id ?? "").trim();
      if (beginId && endId && beginId !== endId) {
        issues.push({
          kind: "id_mismatch",
          message: `BEGIN id="${beginId}" does not match END id="${endId}"`,
          line: lineNum,
        });
      } else if (!endAttrs.id) {
        issues.push({
          kind: "malformed_end",
          message: `Malformed END (missing id): ${line.trim()}`,
          line: lineNum,
        });
      }

      const id = beginId || endId || "(missing-id)";

      // kind comes from BEGIN primarily; fall back to END kind if needed.
      const kind = (open.attrs.kind ?? endAttrs.kind ?? "").trim();

      // type may be present on BEGIN and/or END. Prefer BEGIN.
      const type = (open.attrs.type ?? endAttrs.type ?? "").trim();

      // tags may be present on BEGIN and/or END. Prefer BEGIN then END.
      const tags = splitTags((open.attrs.tags ?? endAttrs.tags ?? "").trim());

      const startLine = open.beginLineNum;
      const endLine = lineNum;

      const slice = lines.slice(startLine - 1, endLine).join("\n");
      const contentHash = sha256(slice);

      blocks.push({
        id,
        kind,
        type,
        tags,
        startLine,
        endLine,
        lineCount: endLine - startLine + 1,
        contentHash,
        beginLineText: open.beginLineText,
        endLineText: line,
      });

      continue;
    }
  }

  while (stack.length > 0) {
    const open = stack.pop()!;
    issues.push({
      kind: "missing_end",
      message: `BEGIN without matching END (id="${open.attrs.id ?? "?"}")`,
      line: open.beginLineNum,
    });
  }

  blocks.sort((a, b) => a.startLine - b.startLine);
  return { blocks, issues };
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.200" kind="function" type="function" tags="function"

// MDV_BLOCK:END id="ENG.SCRIPTS.FP_INDEX.030" kind="parser" type="parser" tags="fingerprint,parser,mdv_block"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.FP_INDEX.040" kind="walker" type="walker" tags="fingerprint,index,walk"
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
    .filter(isInterestingFile)
    .sort((a, b) => a.localeCompare(b));

  const out: string[] = [];

  for (const d of dirs) out.push(...walkFiles(path.join(dirAbs, d)));
  for (const f of files) out.push(path.join(dirAbs, f));

  return out;
}// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.210" kind="function" type="function" tags="function"


function readTextSafe(fileAbs: string): string | null {
  try {
    return fs.readFileSync(fileAbs, "utf8");
  } catch {
    return null;
  }
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.210" kind="function" type="function" tags="function"

// MDV_BLOCK:END id="ENG.SCRIPTS.FP_INDEX.040" kind="walker" type="walker" tags="fingerprint,index,walk"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.FP_INDEX.050" kind="main" type="main" tags="fingerprint,index,generate,docs"
const allFilesAbs = walkFiles(scanRoot);// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.220" kind="var" type="var" tags="var"


const fileIndexes: FileIndex[] = [];
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.220" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.230" kind="var" type="var" tags="var"

const globalIssues: Array<{ path: string; issue: FileIndex["issues"][number] }> = [];
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.230" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.240" kind="block" type="block" tags="block,toplevel"


for (const fileAbs of allFilesAbs) {
  const relPosix = toPosix(path.relative(scanRoot, fileAbs));

  const raw = readTextSafe(fileAbs);
  if (raw == null) continue;

  const normalized = raw.replace(/\r\n/g, "\n");
  const totalLines = normalized.length ? normalized.split("\n").length : 0;
  const fileHash = sha256(normalized);

  const parsed = parseFingerprintsFromText(normalized);
  const blocksWithPointers: FingerprintBlock[] = parsed.blocks.map((b, idx) => {
    return {
      ...b,
      blockOrdinalInFile: idx,
      blockKey: `${relPosix}:${b.id}`,
    };
  });

  const idx: FileIndex = {
    path: relPosix,
    fileHash,
    totalLines,
    blocks: blocksWithPointers,
    issues: parsed.issues,
  };

  for (const issue of parsed.issues) globalIssues.push({ path: relPosix, issue });

  fileIndexes.push(idx);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.240" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.250" kind="block" type="block" tags="block,toplevel"


fileIndexes.sort((a, b) => a.path.localeCompare(b.path));
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.250" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.260" kind="var" type="var" tags="var"


const jsonPayload = {
  schema: "fingerprint-index-v1.2",
  repoName,
  generatedAt: new Date().toISOString(),
  totals: {
    filesScanned: fileIndexes.length,
    blocksFound: fileIndexes.reduce((acc, f) => acc + f.blocks.length, 0),
    issuesFound: globalIssues.length,
  },
  files: fileIndexes,
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.260" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.270" kind="block" type="block" tags="block,toplevel"


fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.270" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.280" kind="block" type="block" tags="block,toplevel"

fs.writeFileSync(jsonOutPath, JSON.stringify(jsonPayload, null, 2) + "\n", "utf8");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.280" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.290" kind="var" type="var" tags="var"


const blocksFound = jsonPayload.totals.blocksFound;
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.290" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.300" kind="var" type="var" tags="var"

const issuesFound = jsonPayload.totals.issuesFound;
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.300" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.310" kind="var" type="var" tags="var"


const mdLines: string[] = [];
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.310" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.320" kind="block" type="block" tags="block,toplevel"

mdLines.push(`# Fingerprint index`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.320" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.330" kind="block" type="block" tags="block,toplevel"

mdLines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.330" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.340" kind="block" type="block" tags="block,toplevel"

mdLines.push(`> Auto-generated. Do not edit manually.`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.340" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.350" kind="block" type="block" tags="block,toplevel"

mdLines.push(
  `> Regenerate from the repo root (${repoName}) with: \`npm run gen:fingerprint-index\``
);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.350" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.360" kind="block" type="block" tags="block,toplevel"

mdLines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.360" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.370" kind="block" type="block" tags="block,toplevel"

mdLines.push(`Generated: ${jsonPayload.generatedAt}`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.370" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.380" kind="block" type="block" tags="block,toplevel"

mdLines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.380" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.390" kind="block" type="block" tags="block,toplevel"

mdLines.push(`## Totals`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.390" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.400" kind="block" type="block" tags="block,toplevel"

mdLines.push(`- Files scanned: **${jsonPayload.totals.filesScanned}**`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.400" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.410" kind="block" type="block" tags="block,toplevel"

mdLines.push(`- Blocks found: **${blocksFound}**`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.410" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.420" kind="block" type="block" tags="block,toplevel"

mdLines.push(`- Issues found: **${issuesFound}**`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.420" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.430" kind="block" type="block" tags="block,toplevel"

mdLines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.430" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.440" kind="block" type="block" tags="block,toplevel"

mdLines.push(`## Notes`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.440" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.450" kind="block" type="block" tags="block,toplevel"

mdLines.push(
  `- Stable pointer: **blockKey = filePath + ":" + blockId** (line numbers may shift)`
);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.450" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.460" kind="block" type="block" tags="block,toplevel"

mdLines.push(`- blockOrdinalInFile is 0-based by appearance in file`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.460" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.470" kind="block" type="block" tags="block,toplevel"

mdLines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.470" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.480" kind="block" type="block" tags="block,toplevel"


if (issuesFound > 0) {
  mdLines.push(`## Issues`);
  mdLines.push(``);
  for (const { path: p, issue } of globalIssues) {
    mdLines.push(
      `- **${p}** (line ${issue.line}) -- \`${issue.kind}\`: ${issue.message}`
    );
  }
  mdLines.push(``);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.480" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.490" kind="block" type="block" tags="block,toplevel"


mdLines.push(`## Files`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.490" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.500" kind="block" type="block" tags="block,toplevel"

mdLines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.500" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.510" kind="block" type="block" tags="block,toplevel"


for (const f of fileIndexes) {
  mdLines.push(`### ${f.path}`);
  mdLines.push(`- Lines: ${f.totalLines}`);
  mdLines.push(`- File hash: \`${f.fileHash}\``);
  mdLines.push(`- Blocks: ${f.blocks.length}`);
  if (f.issues.length) mdLines.push(`- Issues: ${f.issues.length}`);
  mdLines.push(``);

  if (f.blocks.length === 0) continue;

  // Parity with new blockifier: remove Intent column, add Type column.
  mdLines.push(`| Ord | BlockKey | Kind | Type | Lines | Tags | Hash | BEGIN | END |`);
  mdLines.push(`|---:|---|---|---|---:|---|---|---|---|`);

  for (const b of f.blocks) {
    const tags = escapeMdCell(b.tags.join(", "));
    const begin = escapeMdCell(trimForMd(b.beginLineText));
    const end = escapeMdCell(trimForMd(b.endLineText));

    mdLines.push(
      `| ${b.blockOrdinalInFile} | \`${b.blockKey}\` | \`${b.kind || ""}\` | \`${b.type || ""}\` | ${b.startLine}–${b.endLine} | ${tags} | \`${b.contentHash}\` | \`${begin}\` | \`${end}\` |`
    );
  }

  mdLines.push(``);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.510" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.520" kind="block" type="block" tags="block,toplevel"


fs.mkdirSync(path.dirname(mdOutPath), { recursive: true });
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.520" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.530" kind="block" type="block" tags="block,toplevel"

fs.writeFileSync(mdOutPath, mdLines.join("\n") + "\n", "utf8");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.530" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.540" kind="block" type="block" tags="block,toplevel"


console.log(`Wrote: ${mdOutPath}`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.540" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.550" kind="block" type="block" tags="block,toplevel"

console.log(`Wrote: ${jsonOutPath}`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_FINGERPRINT_INDEX.550" kind="block" type="block" tags="block,toplevel"

if (issuesFound > 0) {
  console.log(`Issues found: ${issuesFound} (see markdown)`);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.FP_INDEX.050" kind="main" type="main" tags="fingerprint,index,generate,docs"