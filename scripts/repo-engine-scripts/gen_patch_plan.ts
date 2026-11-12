// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_PATCH_PLAN.FILE.001" intent="Generate PatchPlanV1 from blockKey/symbolKey/file with deterministic, policy-aware recommended ops (lego-additive by default)" kind="file" tags="repo-engine,patch-plan,deterministic,policy,mdv_block"

//command: npm run gen:patch-plan -- --blockKey "src/app/page.tsx:ENG.APP.PAGE.020"
//command: npm run gen:patch-plan -- --symbolKey "src/lib/foo.ts:named:function:bar"   (use symbolKey from scripts/repo-engine-outputs/symbol-index.json or docs/symbol-index.json)
//command: npm run gen:patch-plan -- --file "src/app/page.tsx" --allBlocks

/**
 * Policy (repo-engine scripts):
 * - Deterministic outputs (stable ordering, stable paths, explicit metadata).
 * - Patch plans default to lego-additive operations (append to section end).
 * - Refactors are opt-in: any non-additive op must be marked requiresApproval with rationale.
 * - Outputs go to scripts/repo-engine-outputs/patch-plans/
 */

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_PATCH_PLAN.IMPORTS.001" intent="Imports" kind="section" tags="imports,node"
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_PATCH_PLAN.IMPORTS.001"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_PATCH_PLAN.PRIMITIVES.001" intent="Primitives: schemas + low-level utilities" kind="section" tags="primitives,schema,hash,mdv_block"

type PatchPlanPolicyV1 = {
  mode: "lego-additive";
  allowRefactor: boolean; // default false
  requireSectionAppend: boolean; // default true
  requireFingerprintedBlocks: boolean; // default true
};// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.010" kind="types" type="types" tags="types"


type PatchPlanV1 = {
  schema: "PatchPlanV1";
  id: string;
  generatedAt: string;
  repoName: string;
  policy: PatchPlanPolicyV1;
  inputs: {
    blockKey?: string;
    symbolKey?: string;
    file?: string;
    allBlocks?: boolean;
  };
  targets: Array<{
    blockKey: string;
    file: string; // posix relative
    blockId: string;
    startLine: number; // 1-based
    endLine: number; // 1-based
    lineCount: number;
    fileHash: string;
    contentHash: string;
    blockText: string;
  }>;
  recommendedOps: Array<
    | {
        op: "append_to_block_section_end";
        blockKey: string;
        sectionId: string;
        expectedContentHash: string;
        newText: "__FILL__";
        requiresApproval?: boolean;
        rationale?: string;
      }
    | {
        op: "replace_block";
        blockKey: string;
        expectedContentHash: string;
        newBlockText: "__FILL__";
        requiresApproval?: boolean;
        rationale?: string;
      }
    | {
        op: "insert_block_after";
        afterBlockKey: string;
        newBlockText: "__FILL__";
        requiresApproval?: boolean;
        rationale?: string;
      }
    | {
        op: "delete_block";
        blockKey: string;
        expectedContentHash: string;
        requiresApproval?: boolean;
        rationale?: string;
      }
  >;
  notes: string[];
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.010" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.020" kind="types" type="types" tags="types"


type SymbolIndexV1 = {
  schema: string;
  repoName: string;
  generatedAt: string;
  totals: { filesScanned: number; symbolsFound: number };
  symbols: Array<{
    symbolKey: string;
    name: string;
    kind: string;
    exportKind: string;
    file: string;
    startLine: number;
    endLine: number;
    signature: string;
  }>;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.020" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.030" kind="types" type="types" tags="types"


type FingerprintIndexV1 = {
  schema: string;
  repoName: string;
  generatedAt: string;
  totals: { filesScanned: number; blocksFound: number; issuesFound: number };
  files: Array<{
    path: string;
    fileHash: string;
    totalLines: number;
    blocks: Array<{
      id: string;
      blockKey: string;
      blockOrdinalInFile: number;
      intent: string;
      kind: string;
      tags: string[];
      startLine: number;
      endLine: number;
      lineCount: number;
      contentHash: string;
      beginLineText: string;
      endLineText: string;
    }>;
    issues: Array<{ kind: string; message: string; line: number }>;
  }>;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.030" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.040" kind="var" type="var" tags="var"


const __filename = fileURLToPath(import.meta.url);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.040" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.050" kind="var" type="var" tags="var"

const __dirname = path.dirname(__filename);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.050" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.060" kind="var" type="var" tags="var"


// This script lives at scripts/repo-engine-scripts/*.ts, so repo root is two levels up.
const repoRoot = path.resolve(__dirname, "..", "..");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.060" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.070" kind="var" type="var" tags="var"

const repoName = path.basename(repoRoot);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.070" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.080" kind="function" type="function" tags="function"


function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.080" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.090" kind="function" type="function" tags="function"


function normalize(t: string) {
  return t.replace(/\r\n/g, "\n");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.090" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.100" kind="function" type="function" tags="function"


function toPosix(p: string) {
  return p.split(path.sep).join("/");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.100" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.110" kind="function" type="function" tags="function"


function fileAbsFromPosix(relPosix: string): string {
  const relNative = relPosix.split("/").join(path.sep);
  return path.resolve(repoRoot, relNative);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.110" kind="function" type="function" tags="function"


function isBegin(line: string) {
  return /^\s*\/\/\s*MDV_BLOCK:BEGIN\b/.test(line);
}

function isEnd(line: string) {
  return /^\s*\/\/\s*MDV_BLOCK:END\b/.test(line);
}// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.120" kind="function" type="function" tags="function"


function parseAttrs(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) attrs[m[1]] = m[2];
  return attrs;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.120" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.130" kind="function" type="function" tags="function"


function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 140);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.130" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.140" kind="function" type="function" tags="function"


function readJsonSafe<T>(absPath: string): T | null {
  try {
    if (!fs.existsSync(absPath)) return null;
    const raw = fs.readFileSync(absPath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.140" kind="function" type="function" tags="function"


// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_PATCH_PLAN.PRIMITIVES.001"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_PATCH_PLAN.HELPERS.001" intent="Helpers: locating artifacts + block extraction + section detection" kind="section" tags="helpers,io,mdv_block"

function splitBlockKey(blockKey: string): { filePosix: string; blockId: string } {
  const idx = blockKey.lastIndexOf(":");
  if (idx < 0) throw new Error(`Invalid blockKey (missing ":"): ${blockKey}`);
  return { filePosix: blockKey.slice(0, idx), blockId: blockKey.slice(idx + 1) };
}// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.150" kind="function" type="function" tags="function"


function findBlockInText(
  fileText: string,
  blockId: string
): {
  startIdx: number; // 0-based line index inclusive
  endIdx: number; // 0-based line index inclusive
  slice: string; // BEGIN..END inclusive
} | null {
  const lines = normalize(fileText).split("\n");
  const stack: Array<{ idx: number; attrs: Record<string, string> }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isBegin(line)) {
      stack.push({ idx: i, attrs: parseAttrs(line) });
      continue;
    }

    if (isEnd(line)) {
      const endAttrs = parseAttrs(line);
      const open = stack.pop();
      if (!open) continue;

      const beginId = (open.attrs.id ?? "").trim();
      const endId = (endAttrs.id ?? "").trim();
      const id = beginId || endId;

      if (id === blockId) {
        return {
          startIdx: open.idx,
          endIdx: i,
          slice: lines.slice(open.idx, i + 1).join("\n"),
        };
      }
    }
  }

  return null;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.150" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.160" kind="function" type="function" tags="function"


function extractOneBlock(blockKey: string): PatchPlanV1["targets"][number] {
  const { filePosix, blockId } = splitBlockKey(blockKey);
  const fileAbs = fileAbsFromPosix(filePosix);
  if (!fs.existsSync(fileAbs)) throw new Error(`File not found: ${filePosix}`);

  const raw = fs.readFileSync(fileAbs, "utf8");
  const normalizedFile = normalize(raw);
  const fileHash = sha256(normalizedFile);

  const hit = findBlockInText(normalizedFile, blockId);
  if (!hit) throw new Error(`Block id not found in file: ${blockKey}`);

  const blockText = normalize(hit.slice);
  const contentHash = sha256(blockText);

  return {
    blockKey,
    file: filePosix,
    blockId,
    startLine: hit.startIdx + 1,
    endLine: hit.endIdx + 1,
    lineCount: hit.endIdx - hit.startIdx + 1,
    fileHash,
    contentHash,
    blockText,
  };
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.160" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.170" kind="function" type="function" tags="function"


function extractAllBlocksFromFile(filePosix: string): PatchPlanV1["targets"] {
  const fileAbs = fileAbsFromPosix(filePosix);
  if (!fs.existsSync(fileAbs)) throw new Error(`File not found: ${filePosix}`);
  const raw = fs.readFileSync(fileAbs, "utf8");
  const normalizedFile = normalize(raw);
  const fileHash = sha256(normalizedFile);

  const lines = normalizedFile.split("\n");
  const stack: Array<{ idx: number; attrs: Record<string, string> }> = [];
  const out: PatchPlanV1["targets"] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isBegin(line)) {
      stack.push({ idx: i, attrs: parseAttrs(line) });
      continue;
    }

    if (isEnd(line)) {
      const endAttrs = parseAttrs(line);
      const open = stack.pop();
      if (!open) continue;

      const beginId = (open.attrs.id ?? "").trim();
      const endId = (endAttrs.id ?? "").trim();
      const id = beginId || endId;
      if (!id) continue;

      const startIdx = open.idx;
      const endIdx = i;
      const blockText = lines.slice(startIdx, endIdx + 1).join("\n");
      const contentHash = sha256(blockText);

      out.push({
        blockKey: `${filePosix}:${id}`,
        file: filePosix,
        blockId: id,
        startLine: startIdx + 1,
        endLine: endIdx + 1,
        lineCount: endIdx - startIdx + 1,
        fileHash,
        contentHash,
        blockText,
      });
    }
  }

  out.sort((a, b) => a.startLine - b.startLine);
  return out;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.170" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.180" kind="function" type="function" tags="function"


function resolveArtifactPath(relA: string, relB: string): string | null {
  const a = path.resolve(repoRoot, relA);
  if (fs.existsSync(a)) return a;
  const b = path.resolve(repoRoot, relB);
  if (fs.existsSync(b)) return b;
  return null;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.180" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.190" kind="function" type="function" tags="function"


function loadSymbolIndex(notes: string[]): SymbolIndexV1 | null {
  const p = resolveArtifactPath(
    path.join("scripts", "repo-engine-outputs", "symbol-index.json"),
    path.join("docs", "symbol-index.json")
  );
  if (!p) {
    notes.push(`NOTE: symbol-index.json not found in scripts/repo-engine-outputs/ or docs/.`);
    return null;
  }
  const j = readJsonSafe<SymbolIndexV1>(p);
  if (!j) notes.push(`NOTE: Failed to parse symbol index at: ${toPosix(path.relative(repoRoot, p))}`);
  return j;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.190" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.200" kind="function" type="function" tags="function"


function loadFingerprintIndex(notes: string[]): FingerprintIndexV1 | null {
  const p = resolveArtifactPath(
    path.join("scripts", "repo-engine-outputs", "fingerprint-index.json"),
    path.join("docs", "fingerprint-index.json")
  );
  if (!p) {
    notes.push(`NOTE: fingerprint-index.json not found in scripts/repo-engine-outputs/ or docs/.`);
    return null;
  }
  const j = readJsonSafe<FingerprintIndexV1>(p);
  if (!j) notes.push(`NOTE: Failed to parse fingerprint index at: ${toPosix(path.relative(repoRoot, p))}`);
  return j;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.200" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.210" kind="function" type="function" tags="function"


function sectionIdsInBlockText(blockText: string): string[] {
  // A “section” is any MDV_BLOCK with kind="section" (most often nested inside the file block).
  const lines = normalize(blockText).split("\n");
  const ids: string[] = [];
  const stack: Array<{ attrs: Record<string, string> }> = [];

  for (const line of lines) {
    if (isBegin(line)) {
      stack.push({ attrs: parseAttrs(line) });
      continue;
    }
    if (isEnd(line)) {
      const endAttrs = parseAttrs(line);
      const open = stack.pop();
      if (!open) continue;

      const beginId = (open.attrs.id ?? "").trim();
      const endId = (endAttrs.id ?? "").trim();
      const id = beginId || endId;
      const kind = (open.attrs.kind ?? "").trim() || (endAttrs.kind ?? "").trim();

      if (id && kind === "section") ids.push(id);
    }
  }

  // stable order
  return Array.from(new Set(ids));
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.210" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.220" kind="function" type="function" tags="function"


function pickDefaultSectionId(sectionIds: string[]): string | null {
  // Deterministic preference order matching your contracts
  const preferred = [
    "IMPORTS",
    "PRIMITIVES",
    "HELPERS",
    "COMPOSITION",
    "EXPORTS",
    "EXPORT",
    "DEFAULT",
  ];

  const upper = sectionIds.map((x) => ({ id: x, u: x.toUpperCase() }));
  for (const p of preferred) {
    const hit = upper.find((x) => x.u.includes(p));
    if (hit) return hit.id;
  }
  return sectionIds[sectionIds.length - 1] ?? null; // last section as fallback
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_PATCH_PLAN.220" kind="function" type="function" tags="function"


// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_PATCH_PLAN.HELPERS.001"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_PATCH_PLAN.COMPOSITION.001" intent="Composition: parse args, resolve targets, emit plan + markdown" kind="section" tags="composition,cli,emit"

function main() {
  const args = process.argv.slice(2);

  function argValue(flag: string): string | null {
    const i = args.indexOf(flag);
    if (i < 0) return null;
    return args[i + 1] ?? null;
  }

  const blockKey = argValue("--blockKey");
  const symbolKey = argValue("--symbolKey");
  const file = argValue("--file");
  const allBlocks = args.includes("--allBlocks");

  const inputs: PatchPlanV1["inputs"] = {
    blockKey: blockKey ?? undefined,
    symbolKey: symbolKey ?? undefined,
    file: file ?? undefined,
    allBlocks: allBlocks || undefined,
  };

  const provided = [!!blockKey, !!symbolKey, !!file].filter(Boolean).length;
  if (provided !== 1) {
    console.error(`Provide exactly one of: --blockKey, --symbolKey, --file`);
    process.exit(2);
  }
  if (file && !allBlocks) {
    console.error(`When using --file, also pass --allBlocks (v1 only).`);
    process.exit(2);
  }

  const notes: string[] = [];

  const sym = symbolKey ? loadSymbolIndex(notes) : null;
  const fp = loadFingerprintIndex(notes);

  let targets: PatchPlanV1["targets"] = [];

  if (blockKey) {
    targets = [extractOneBlock(blockKey)];
  }

  if (file) {
    const filePosix = file;
    targets = extractAllBlocksFromFile(filePosix);
    if (targets.length === 0) notes.push(`WARNING: No MDV_BLOCK blocks found in file: ${filePosix}`);
  }

  if (symbolKey) {
    if (!sym) {
      console.error(`Cannot resolve --symbolKey without a symbol index (scripts/repo-engine-outputs/symbol-index.json or docs/symbol-index.json).`);
      process.exit(1);
    }
    const hit = sym.symbols.find((s) => s.symbolKey === symbolKey);
    if (!hit) {
      console.error(`symbolKey not found in symbol index: ${symbolKey}`);
      process.exit(1);
    }

    const filePosix = hit.file;
    const fileAbs = fileAbsFromPosix(filePosix);
    if (!fs.existsSync(fileAbs)) {
      console.error(`Symbol file not found: ${filePosix}`);
      process.exit(1);
    }

    // v1 policy: symbol -> choose containing MDV_BLOCK by line range.
    let fileBlocks:
      | Array<{ id: string; startLine: number; endLine: number; blockKey: string; contentHash?: string }>
      | null = null;

    if (fp) {
      const f = fp.files.find((x) => x.path === filePosix);
      if (f) {
        fileBlocks = f.blocks.map((b) => ({
          id: b.id,
          startLine: b.startLine,
          endLine: b.endLine,
          blockKey: b.blockKey,
          contentHash: b.contentHash,
        }));
      }
    }

    if (!fileBlocks) {
      const blocks = extractAllBlocksFromFile(filePosix);
      fileBlocks = blocks.map((b) => ({
        id: b.blockId,
        startLine: b.startLine,
        endLine: b.endLine,
        blockKey: b.blockKey,
        contentHash: b.contentHash,
      }));
      notes.push(`NOTE: Used live scan to resolve symbol -> block (fingerprint index missing or does not include ${filePosix}).`);
    }

    const containing = fileBlocks.filter((b) => hit.startLine >= b.startLine && hit.endLine <= b.endLine);

    if (containing.length === 0) {
      console.error(
        `No containing MDV_BLOCK found for symbolKey lines ${hit.startLine}–${hit.endLine} in ${filePosix}. ` +
          `Blockify or widen blocks first.`
      );
      process.exit(1);
    }

    containing.sort((a, b) => (a.endLine - a.startLine) - (b.endLine - b.startLine));
    const chosen = containing[0];

    targets = [extractOneBlock(chosen.blockKey)];
    notes.push(`Resolved symbolKey -> blockKey: ${chosen.blockKey}`);
  }

  // Deterministic ordering
  targets.sort((a, b) => a.blockKey.localeCompare(b.blockKey));

  const planId = `PLAN.${new Date().toISOString().replace(/[:.]/g, "")}.${safeName(
    blockKey ?? symbolKey ?? (file ?? "file")
  )}`;

  const policy: PatchPlanPolicyV1 = {
    mode: "lego-additive",
    allowRefactor: false,
    requireSectionAppend: true,
    requireFingerprintedBlocks: true,
  };

  // Recommended ops: default to append-to-section-end if we can identify a section inside the block.
  const recommendedOps: PatchPlanV1["recommendedOps"] = targets.map((t) => {
    const sectionIds = sectionIdsInBlockText(t.blockText);
    const sectionId = pickDefaultSectionId(sectionIds);

    if (sectionId) {
      return {
        op: "append_to_block_section_end" as const,
        blockKey: t.blockKey,
        sectionId,
        expectedContentHash: t.contentHash,
        newText: "__FILL__",
      };
    }

    // Fallback (requires approval): no section blocks available inside this target block.
    notes.push(
      `WARNING: Target block has no nested kind="section" blocks; defaulting recommended op to replace_block (requires approval): ${t.blockKey}`
    );

    return {
      op: "replace_block" as const,
      blockKey: t.blockKey,
      expectedContentHash: t.contentHash,
      newBlockText: "__FILL__",
      requiresApproval: true,
      rationale:
        `No nested kind="section" blocks found inside target; cannot safely append-to-section-end. ` +
        `If you want additive-only patching, introduce section blocks in this file block first.`,
    };
  });

  const plan: PatchPlanV1 = {
    schema: "PatchPlanV1",
    id: planId,
    generatedAt: new Date().toISOString(),
    repoName,
    policy,
    inputs,
    targets,
    recommendedOps,
    notes,
  };

  // Output locations (orchestrator repo): scripts/repo-engine-outputs/patch-plans/
  const outDir = path.resolve(repoRoot, "scripts", "repo-engine-outputs", "patch-plans");
  const jsonAbs = path.resolve(outDir, `${planId}.json`);
  const mdAbs = path.resolve(outDir, `${planId}.md`);

  fs.mkdirSync(path.dirname(jsonAbs), { recursive: true });
  fs.writeFileSync(jsonAbs, JSON.stringify(plan, null, 2) + "\n", "utf8");

  const md: string[] = [];
  md.push(`# Patch plan`);
  md.push(``);
  md.push(`- id: \`${plan.id}\``);
  md.push(`- generated: ${plan.generatedAt}`);
  md.push(`- repo: \`${plan.repoName}\``);
  md.push(``);
  md.push(`## Policy`);
  md.push(`\`\`\`json`);
  md.push(JSON.stringify(plan.policy, null, 2));
  md.push(`\`\`\``);
  md.push(``);
  md.push(`## Inputs`);
  md.push(`\`\`\`json`);
  md.push(JSON.stringify(plan.inputs, null, 2));
  md.push(`\`\`\``);
  md.push(``);

  if (plan.notes.length) {
    md.push(`## Notes`);
    for (const n of plan.notes) md.push(`- ${n}`);
    md.push(``);
  }

  md.push(`## Targets (${plan.targets.length})`);
  md.push(``);
  for (const t of plan.targets) {
    md.push(`### ${t.blockKey}`);
    md.push(`- file: \`${t.file}\``);
    md.push(`- lines: ${t.startLine}–${t.endLine} (${t.lineCount})`);
    md.push(`- contentHash: \`${t.contentHash}\``);
    md.push(``);
    md.push("```");
    md.push(t.blockText);
    md.push("```");
    md.push("");
  }

  md.push(`## Recommended ops`);
  md.push(`\`\`\`json`);
  md.push(JSON.stringify(plan.recommendedOps, null, 2));
  md.push(`\`\`\``);
  md.push("");

  fs.mkdirSync(path.dirname(mdAbs), { recursive: true });
  fs.writeFileSync(mdAbs, md.join("\n") + "\n", "utf8");

  console.log(`Wrote: ${toPosix(path.relative(repoRoot, jsonAbs))}`);
  console.log(`Wrote: ${toPosix(path.relative(repoRoot, mdAbs))}`);
}

main();

// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_PATCH_PLAN.COMPOSITION.001"

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.GEN_PATCH_PLAN.EXPORTS.001" intent="Exports: none (CLI entry only)" kind="section" tags="exports"
// (none)
// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_PATCH_PLAN.EXPORTS.001"

// MDV_BLOCK:END id="ENG.SCRIPTS.GEN_PATCH_PLAN.FILE.001"
