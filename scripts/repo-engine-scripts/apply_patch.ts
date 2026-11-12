// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.APPLY_PATCH.FILE.001" intent="Apply PatchDocumentV1 deterministically with lego-additive (strict) enforcement + audit log output" kind="file" tags="repo-engine,patch,apply,deterministic,lego-additive"

/**
 * scripts/repo-engine-scripts/apply_patch.ts
 * -----------------------------------------
 * Policy (repo-engine scripts):
 * - Deterministic outputs (stable ordering, stable paths, explicit metadata).
 * - Default mode is lego-additive STRICT:
 *   - replace_block is allowed ONLY as "append before END" (old block must match exactly; new block may add lines immediately before END).
 *   - delete_block is disallowed unless allowRefactor=true (or mode=permissive).
 * - Fingerprinted blocks are required by default (MDV_BLOCK:BEGIN/END).
 * - expectedContentHash is required by default for replace/delete.
 *
 * Output:
 * - scripts/repo-engine-outputs/patches/last-apply-log.json
 */

// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.APPLY_PATCH.IMPORTS.001" intent="Imports" kind="section" tags="imports,node"
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
// MDV_BLOCK:END id="ENG.SCRIPTS.APPLY_PATCH.IMPORTS.001"


// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.APPLY_PATCH.PRIMITIVES.001" intent="Primitives: schemas + core helpers (hash/normalize/paths)" kind="section" tags="primitives,types,hash,paths"

type PatchPolicyV1 = {
  readonly mode?: "lego-additive" | "permissive";
  readonly allowRefactor?: boolean;
  readonly requireSectionAppend?: boolean; // reserved (not enforced by op set yet)
  readonly requireFingerprintedBlocks?: boolean;
  readonly requireExpectedContentHash?: boolean;
};// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.010" kind="types" type="types" tags="types"


type PatchDoc = {
  readonly schema: "PatchDocumentV1";
  readonly id: string;
  readonly createdAt: string;
  readonly notes?: string;
  readonly policy?: PatchPolicyV1;
  readonly ops: readonly PatchOp[];
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.010" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.020" kind="types" type="types" tags="types"


type PatchOp =
  | {
      readonly op: "replace_block";
      readonly blockKey: string;
      readonly expectedContentHash?: string;
      readonly newBlockText: string;
    }
  | {
      readonly op: "insert_block_after";
      readonly afterBlockKey: string;
      readonly newBlockText: string;
    }
  | {
      readonly op: "delete_block";
      readonly blockKey: string;
      readonly expectedContentHash?: string;
    }
  | {
      readonly op: "create_file";
      readonly path: string; // posix
      readonly content: string;
      readonly allowOverwrite?: boolean;
    }
  | {
      // Planner parity: append to end of a section block (just before its END line).
      // blockKey points to an *anchor* block in the target file (often the file-level block),
      // and sectionId selects the section block to append to (must be nested within anchor).
      readonly op: "append_to_block_section_end";
      readonly blockKey: string;
      readonly sectionId: string;
      readonly expectedContentHash?: string; // hash of the anchor block (blockKey), per planner output
      readonly newText: string;
    };
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.020" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.030" kind="types" type="types" tags="types"


type ApplyLog = {
  schema: "PatchApplyLogV1";
  patchId: string;
  appliedAt: string;
  policy: Required<PatchPolicyV1>;
  opsApplied: number;
  filesTouched: string[];
  details: Array<{
    op: PatchOp["op"];
    target: string;
    status: "applied" | "skipped" | "failed";
    message?: string;
  }>;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.030" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.040" kind="var" type="var" tags="var"


const __filename = fileURLToPath(import.meta.url);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.040" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.050" kind="var" type="var" tags="var"

const __dirname = path.dirname(__filename);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.050" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.060" kind="var" type="var" tags="var"


// IMPORTANT: this file lives at scripts/repo-engine-scripts/*.ts
// repoRoot = project root (two levels up)
const repoRoot = path.resolve(__dirname, "..", "..");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.060" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.070" kind="function" type="function" tags="function"


function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.070" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.080" kind="function" type="function" tags="function"


function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.080" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.090" kind="function" type="function" tags="function"


function normalizeText(t: string): string {
  return t.replace(/\r\n/g, "\n");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.090" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.100" kind="function" type="function" tags="function"


function fileAbsFromPosix(relPosix: string): string {
  const relNative = relPosix.split("/").join(path.sep);
  return path.resolve(repoRoot, relNative);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.100" kind="function" type="function" tags="function"


function isBegin(line: string): boolean {
  return /^\s*\/\/\s*MDV_BLOCK:BEGIN\b/.test(line);
}

function isEnd(line: string): boolean {
  return /^\s*\/\/\s*MDV_BLOCK:END\b/.test(line);
}// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.110" kind="function" type="function" tags="function"


function parseAttrs(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) attrs[m[1]] = m[2];
  return attrs;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.110" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.120" kind="function" type="function" tags="function"


function splitBlockKey(blockKey: string): { filePosix: string; blockId: string } {
  const idx = blockKey.lastIndexOf(":");
  if (idx < 0) throw new Error(`Invalid blockKey (missing ":"): ${blockKey}`);
  return { filePosix: blockKey.slice(0, idx), blockId: blockKey.slice(idx + 1) };
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.120" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.130" kind="function" type="function" tags="function"


function readFileAbs(fileAbs: string): string {
  return fs.readFileSync(fileAbs, "utf8");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.130" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.140" kind="function" type="function" tags="function"


function writeFileAbs(fileAbs: string, text: string): void {
  fs.mkdirSync(path.dirname(fileAbs), { recursive: true });
  fs.writeFileSync(fileAbs, text, "utf8");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.140" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.150" kind="function" type="function" tags="function"


function requiredPolicy(p?: PatchPolicyV1): Required<PatchPolicyV1> {
  return {
    mode: p?.mode ?? "lego-additive",
    allowRefactor: p?.allowRefactor ?? false,
    requireSectionAppend: p?.requireSectionAppend ?? true,
    requireFingerprintedBlocks: p?.requireFingerprintedBlocks ?? true,
    requireExpectedContentHash: p?.requireExpectedContentHash ?? true,
  };
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.150" kind="function" type="function" tags="function"


// MDV_BLOCK:END id="ENG.SCRIPTS.APPLY_PATCH.PRIMITIVES.001"


// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.APPLY_PATCH.HELPERS.001" intent="Helpers: MDV block scanning + strict replace validation + patch validation" kind="section" tags="helpers,mdv_block,validation"

function findBlockById(text: string, blockId: string): {
  startLine: number; // 0-based inclusive
  endLine: number; // 0-based inclusive
  sliceText: string; // BEGIN..END inclusive
  beginLineText: string;
  endLineText: string;
} | null {
  const lines = normalizeText(text).split("\n");
  const stack: Array<{ lineIdx: number; attrs: Record<string, string>; lineText: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isBegin(line)) {
      const attrs = parseAttrs(line);
      stack.push({ lineIdx: i, attrs, lineText: line });
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
        const startLine = open.lineIdx;
        const endLine = i;
        const sliceText = lines.slice(startLine, endLine + 1).join("\n");
        return {
          startLine,
          endLine,
          sliceText,
          beginLineText: open.lineText,
          endLineText: line,
        };
      }
    }
  }

  return null;
}

function assertNewBlockHasMatchingId(newBlockText: string): { ok: boolean; message?: string; blockId?: string } {
  const lines = normalizeText(newBlockText).split("\n");
  const begin = lines.find((l) => isBegin(l));
  const end = [...lines].reverse().find((l) => isEnd(l));

  if (!begin) return { ok: false, message: "newBlockText missing MDV_BLOCK:BEGIN line" };
  if (!end) return { ok: false, message: "newBlockText missing MDV_BLOCK:END line" };

  const b = parseAttrs(begin);
  const e = parseAttrs(end);
  const bid = (b.id ?? "").trim();
  const eid = (e.id ?? "").trim();

  if (!bid) return { ok: false, message: "newBlockText BEGIN missing id" };
  if (!eid) return { ok: false, message: "newBlockText END missing id" };
  if (bid !== eid) return { ok: false, message: `newBlockText BEGIN id "${bid}" != END id "${eid}"` };

  return { ok: true, blockId: bid };
}

function validateAllFingerprintedBlocksWellFormed(fileText: string): { ok: boolean; message?: string } {
  const lines = normalizeText(fileText).split("\n");
  const stack: Array<{ idx: number; id: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isBegin(line)) {
      const a = parseAttrs(line);
      const id = (a.id ?? "").trim();
      if (!id) return { ok: false, message: `MDV_BLOCK:BEGIN missing id at line ${i + 1}` };
      stack.push({ idx: i, id });
      continue;
    }
    if (isEnd(line)) {
      const a = parseAttrs(line);
      const id = (a.id ?? "").trim();
      if (!id) return { ok: false, message: `MDV_BLOCK:END missing id at line ${i + 1}` };
      const open = stack.pop();
      if (!open) return { ok: false, message: `MDV_BLOCK:END without matching BEGIN at line ${i + 1}` };
      if (open.id !== id) {
        return {
          ok: false,
          message: `MDV_BLOCK id mismatch: BEGIN "${open.id}" (line ${open.idx + 1}) != END "${id}" (line ${i + 1})`,
        };
      }
    }
  }

  if (stack.length) {
    const top = stack[stack.length - 1];
    return { ok: false, message: `Unclosed MDV_BLOCK:BEGIN id "${top.id}" at line ${top.idx + 1}` };
  }

  return { ok: true };
}// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.160" kind="function" type="function" tags="function"


// STRICT lego-additive replace rule:
// - The new block MUST be identical to the old block, except it may add extra lines
//   immediately before the END line.
// - BEGIN line must be identical, END line must be identical.
// - All lines up to (oldLines.length - 1) must match exactly.
// - newLines must start with oldLines[0..oldEndExclusive-1], end with old END line.
function assertStrictAppendOnlyReplace(oldBlockText: string, newBlockText: string): { ok: boolean; message?: string } {
  const oldLines = normalizeText(oldBlockText).split("\n");
  const newLines = normalizeText(newBlockText).split("\n");

  const oldBegin = oldLines.find((l) => isBegin(l));
  const oldEnd = [...oldLines].reverse().find((l) => isEnd(l));
  const newBegin = newLines.find((l) => isBegin(l));
  const newEnd = [...newLines].reverse().find((l) => isEnd(l));

  if (!oldBegin || !oldEnd) return { ok: false, message: "Old block missing BEGIN/END (corrupt target)" };
  if (!newBegin || !newEnd) return { ok: false, message: "New block missing BEGIN/END" };

  if (oldLines[0] !== newLines[0]) {
    return { ok: false, message: "STRICT replace violation: BEGIN line must be identical (no header edits allowed)" };
  }

  if (oldLines[oldLines.length - 1] !== newLines[newLines.length - 1]) {
    return { ok: false, message: "STRICT replace violation: END line must be identical (no footer edits allowed)" };
  }

  if (newLines.length < oldLines.length) {
    return { ok: false, message: "STRICT replace violation: new block cannot be shorter than old block" };
  }

  // Compare all old lines except the final END line
  for (let i = 0; i < oldLines.length - 1; i++) {
    if (newLines[i] !== oldLines[i]) {
      return {
        ok: false,
        message:
          `STRICT replace violation: line ${i + 1} changed. ` +
          `Only appending lines immediately before END is allowed.`,
      };
    }
  }

  return { ok: true };
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.160" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.170" kind="function" type="function" tags="function"


function validatePatchDocShape(patch: PatchDoc): void {
  if (patch.schema !== "PatchDocumentV1") throw new Error(`Unsupported schema: ${(patch as any).schema}`);
  if (!patch.id) throw new Error(`Patch doc missing id`);
  if (!Array.isArray(patch.ops)) throw new Error(`Patch doc missing ops array`);
  if (!patch.createdAt) throw new Error(`Patch doc missing createdAt`);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.170" kind="function" type="function" tags="function"


function sanitizeAppendNewText(newText: string): string[] {
  // Normalize, trim outer blank lines only; preserve internal formatting.
  const t = normalizeText(newText).replace(/^\n+/, "").replace(/\n+$/, "");
  if (!t.trim()) return [];
  const lines = t.split("\n");

  // Disallow nested MDV blocks in v0.1 to avoid corrupting structure.
  // (We can relax later if we add a proper nested-block policy.)
  for (const l of lines) {
    if (isBegin(l) || isEnd(l)) {
      throw new Error(`append_to_block_section_end newText must not contain MDV_BLOCK:BEGIN/END lines`);
    }
  }

  return lines;
}

// MDV_BLOCK:END id="ENG.SCRIPTS.APPLY_PATCH.HELPERS.001"


// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.APPLY_PATCH.COMPOSITION.001" intent="Composition: apply operations with deterministic policy enforcement + write audit log" kind="section" tags="composition,apply,ops,logging,enforcement"

function applyReplaceBlock(
  op: Extract<PatchOp, { op: "replace_block" }>,
  policy: Required<PatchPolicyV1>,
  log: ApplyLog,
  touched: Set<string>
): void {
  const { filePosix, blockId } = splitBlockKey(op.blockKey);
  const fileAbs = fileAbsFromPosix(filePosix);
  if (!fs.existsSync(fileAbs)) throw new Error(`File not found: ${filePosix}`);

  const fileText = readFileAbs(fileAbs);
  const hit = findBlockById(fileText, blockId);
  if (!hit) throw new Error(`Block id not found in file: ${op.blockKey}`);

  if (policy.requireExpectedContentHash && !op.expectedContentHash) {
    throw new Error(`expectedContentHash is required by policy for replace_block: ${op.blockKey}`);
  }

  if (op.expectedContentHash) {
    const h = sha256(normalizeText(hit.sliceText));
    if (h !== op.expectedContentHash) {
      throw new Error(`expectedContentHash mismatch for ${op.blockKey}: expected ${op.expectedContentHash} got ${h}`);
    }
  }

  if (policy.requireFingerprintedBlocks) {
    const chk = assertNewBlockHasMatchingId(op.newBlockText);
    if (!chk.ok) throw new Error(`Invalid newBlockText for ${op.blockKey}: ${chk.message}`);

    // Enforce that replacement block id matches target blockId
    const beginLine = normalizeText(op.newBlockText).split("\n").find((l) => isBegin(l))!;
    const beginId = (parseAttrs(beginLine).id ?? "").trim();
    if (beginId !== blockId) {
      throw new Error(`Replacement BEGIN id "${beginId}" does not match target block id "${blockId}"`);
    }
  }

  // Enforce lego-additive strict replace (unless permissive or allowRefactor)
  const strictMode = policy.mode === "lego-additive" && !policy.allowRefactor;
  if (strictMode) {
    const strict = assertStrictAppendOnlyReplace(hit.sliceText, op.newBlockText);
    if (!strict.ok) throw new Error(`replace_block rejected (STRICT lego-additive): ${strict.message}`);
  }

  const lines = normalizeText(fileText).split("\n");
  const before = lines.slice(0, hit.startLine);
  const after = lines.slice(hit.endLine + 1);

  const replacementLines = normalizeText(op.newBlockText).split("\n");
  const nextText = [...before, ...replacementLines, ...after].join("\n");

  writeFileAbs(fileAbs, nextText);
  touched.add(filePosix);
  log.details.push({ op: "replace_block", target: op.blockKey, status: "applied" });
}// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.180" kind="function" type="function" tags="function"


function applyInsertAfter(
  op: Extract<PatchOp, { op: "insert_block_after" }>,
  policy: Required<PatchPolicyV1>,
  log: ApplyLog,
  touched: Set<string>
): void {
  const { filePosix, blockId } = splitBlockKey(op.afterBlockKey);
  const fileAbs = fileAbsFromPosix(filePosix);
  if (!fs.existsSync(fileAbs)) throw new Error(`File not found: ${filePosix}`);

  const fileText = readFileAbs(fileAbs);
  const hit = findBlockById(fileText, blockId);
  if (!hit) throw new Error(`Block id not found in file: ${op.afterBlockKey}`);

  if (policy.requireFingerprintedBlocks) {
    const chk = assertNewBlockHasMatchingId(op.newBlockText);
    if (!chk.ok) throw new Error(`Invalid newBlockText (insert) after ${op.afterBlockKey}: ${chk.message}`);
  }

  const lines = normalizeText(fileText).split("\n");
  const before = lines.slice(0, hit.endLine + 1);
  const after = lines.slice(hit.endLine + 1);

  const insertLines = normalizeText(op.newBlockText).split("\n");
  const nextText = [...before, ...insertLines, ...after].join("\n");

  writeFileAbs(fileAbs, nextText);
  touched.add(filePosix);
  log.details.push({ op: "insert_block_after", target: op.afterBlockKey, status: "applied" });
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.180" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.190" kind="function" type="function" tags="function"


function applyDeleteBlock(
  op: Extract<PatchOp, { op: "delete_block" }>,
  policy: Required<PatchPolicyV1>,
  log: ApplyLog,
  touched: Set<string>
): void {
  const { filePosix, blockId } = splitBlockKey(op.blockKey);
  const fileAbs = fileAbsFromPosix(filePosix);
  if (!fs.existsSync(fileAbs)) throw new Error(`File not found: ${filePosix}`);

  // Disallow deletes in lego-additive unless allowRefactor=true
  if (policy.mode === "lego-additive" && !policy.allowRefactor) {
    throw new Error(`delete_block rejected (lego-additive): allowRefactor must be true to delete blocks (${op.blockKey})`);
  }

  const fileText = readFileAbs(fileAbs);
  const hit = findBlockById(fileText, blockId);
  if (!hit) throw new Error(`Block id not found in file: ${op.blockKey}`);

  if (policy.requireExpectedContentHash && !op.expectedContentHash) {
    throw new Error(`expectedContentHash is required by policy for delete_block: ${op.blockKey}`);
  }

  if (op.expectedContentHash) {
    const h = sha256(normalizeText(hit.sliceText));
    if (h !== op.expectedContentHash) {
      throw new Error(`expectedContentHash mismatch for ${op.blockKey}: expected ${op.expectedContentHash} got ${h}`);
    }
  }

  const lines = normalizeText(fileText).split("\n");
  const before = lines.slice(0, hit.startLine);
  const after = lines.slice(hit.endLine + 1);
  const nextText = [...before, ...after].join("\n");

  writeFileAbs(fileAbs, nextText);
  touched.add(filePosix);
  log.details.push({ op: "delete_block", target: op.blockKey, status: "applied" });
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.190" kind="function" type="function" tags="function"


function applyCreateFile(
  op: Extract<PatchOp, { op: "create_file" }>,
  policy: Required<PatchPolicyV1>,
  log: ApplyLog,
  touched: Set<string>
): void {
  const relPosix = op.path;
  const fileAbs = fileAbsFromPosix(relPosix);

  const exists = fs.existsSync(fileAbs);
  if (exists && !op.allowOverwrite) {
    throw new Error(`File already exists (allowOverwrite=false): ${relPosix}`);
  }

  const content = normalizeText(op.content);

  if (policy.requireFingerprintedBlocks) {
    const wf = validateAllFingerprintedBlocksWellFormed(content);
    if (!wf.ok) throw new Error(`create_file content violates MDV_BLOCK well-formedness: ${wf.message}`);
    // Also require at least one fingerprinted block
    const hasAny = content.split("\n").some((l) => isBegin(l)) && content.split("\n").some((l) => isEnd(l));
    if (!hasAny) throw new Error(`create_file requires at least one MDV_BLOCK:BEGIN/END pair by policy`);
  }

  writeFileAbs(fileAbs, content);
  touched.add(relPosix);
  log.details.push({ op: "create_file", target: relPosix, status: "applied" });
}// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.200" kind="function" type="function" tags="function"


function applyAppendToBlockSectionEnd(
  op: Extract<PatchOp, { op: "append_to_block_section_end" }>,
  policy: Required<PatchPolicyV1>,
  log: ApplyLog,
  touched: Set<string>
): void {
  const { filePosix, blockId: anchorBlockId } = splitBlockKey(op.blockKey);
  const fileAbs = fileAbsFromPosix(filePosix);
  if (!fs.existsSync(fileAbs)) throw new Error(`File not found: ${filePosix}`);

  const fileText = readFileAbs(fileAbs);
  const anchor = findBlockById(fileText, anchorBlockId);
  if (!anchor) throw new Error(`Anchor block id not found in file: ${op.blockKey}`);

  if (policy.requireExpectedContentHash && !op.expectedContentHash) {
    throw new Error(`expectedContentHash is required by policy for append_to_block_section_end: ${op.blockKey}`);
  }

  if (op.expectedContentHash) {
    const h = sha256(normalizeText(anchor.sliceText));
    if (h !== op.expectedContentHash) {
      throw new Error(`expectedContentHash mismatch for ${op.blockKey}: expected ${op.expectedContentHash} got ${h}`);
    }
  }

  if (policy.requireFingerprintedBlocks) {
    // Ensure the anchor exists (already) and the target section is a well-formed MDV block.
    const sec = findBlockById(anchor.sliceText, op.sectionId);
    if (!sec) {
      throw new Error(`Section id "${op.sectionId}" not found within anchor block "${anchorBlockId}"`);
    }
    // Validate section well-formedness within its own slice.
    const wf = validateAllFingerprintedBlocksWellFormed(sec.sliceText);
    if (!wf.ok) throw new Error(`Target section violates MDV_BLOCK well-formedness: ${wf.message}`);
  }

  const anchorLines = normalizeText(anchor.sliceText).split("\n");
  const secInAnchor = findBlockById(anchor.sliceText, op.sectionId);
  if (!secInAnchor) throw new Error(`Section id "${op.sectionId}" not found within anchor block "${anchorBlockId}"`);

  const secRelStart = secInAnchor.startLine;
  const secRelEnd = secInAnchor.endLine;

  // Append lines immediately before section END line.
  const appendLines = sanitizeAppendNewText(op.newText);
  if (appendLines.length === 0) {
    log.details.push({
      op: "append_to_block_section_end",
      target: `${op.blockKey}#${op.sectionId}`,
      status: "skipped",
      message: "newText was empty after trimming",
    });
    return;
  }

  // Enforce strict section-append: only insert before END line.
  const before = anchorLines.slice(0, secRelEnd); // up to line before END line
  const endLine = anchorLines[secRelEnd]; // END line itself
  const after = anchorLines.slice(secRelEnd + 1);

  // Ensure we don't accidentally glue onto previous line: always insert as whole lines.
  const nextAnchorLines = [...before, ...appendLines, endLine, ...after];
  const nextAnchorText = nextAnchorLines.join("\n");

  // Replace anchor in the full file.
  const fileLines = normalizeText(fileText).split("\n");
  const fullBefore = fileLines.slice(0, anchor.startLine);
  const fullAfter = fileLines.slice(anchor.endLine + 1);
  const nextFileText = [...fullBefore, ...normalizeText(nextAnchorText).split("\n"), ...fullAfter].join("\n");

  writeFileAbs(fileAbs, nextFileText);
  touched.add(filePosix);
  log.details.push({ op: "append_to_block_section_end", target: `${op.blockKey}#${op.sectionId}`, status: "applied" });
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.200" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.210" kind="function" type="function" tags="function"


function loadPatchDoc(patchPathAbs: string): PatchDoc {
  const raw = fs.readFileSync(patchPathAbs, "utf8");
  const json = JSON.parse(raw) as PatchDoc;
  validatePatchDocShape(json);
  return json;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.210" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.220" kind="function" type="function" tags="function"


function writeApplyLog(log: ApplyLog): string {
  const logPathAbs = path.resolve(repoRoot, "scripts", "repo-engine-outputs", "patches", "last-apply-log.json");
  fs.mkdirSync(path.dirname(logPathAbs), { recursive: true });
  fs.writeFileSync(logPathAbs, JSON.stringify(log, null, 2) + "\n", "utf8");
  return toPosix(path.relative(repoRoot, logPathAbs));
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.220" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.230" kind="function" type="function" tags="function"


function main(): void {
  const patchArg = process.argv[2];
  if (!patchArg) {
    console.error(`Usage: npm run apply:patch -- <path-to-patch.json>`);
    process.exit(2);
  }

  const patchPathAbs = path.isAbsolute(patchArg)
    ? patchArg
    : path.resolve(repoRoot, patchArg.split("/").join(path.sep));

  if (!fs.existsSync(patchPathAbs)) {
    console.error(`Patch file not found: ${patchArg}`);
    process.exit(2);
  }

  const patch = loadPatchDoc(patchPathAbs);
  const policy = requiredPolicy(patch.policy);

  const log: ApplyLog = {
    schema: "PatchApplyLogV1",
    patchId: patch.id,
    appliedAt: new Date().toISOString(),
    policy,
    opsApplied: 0,
    filesTouched: [],
    details: [],
  };

  const touched = new Set<string>();

  // Validate patch against policy BEFORE applying (fast fail).
  for (const op of patch.ops) {
    if (op.op === "replace_block" || op.op === "delete_block") {
      if (policy.requireExpectedContentHash && !op.expectedContentHash) {
        throw new Error(`Policy requires expectedContentHash for ${op.op} (${(op as any).blockKey ?? ""})`);
      }
    }
    if (op.op === "append_to_block_section_end") {
      if (policy.requireExpectedContentHash && !op.expectedContentHash) {
        throw new Error(`Policy requires expectedContentHash for ${op.op} (${(op as any).blockKey ?? ""})`);
      }
      if (!(op as any).sectionId) throw new Error(`append_to_block_section_end missing sectionId`);
      if (typeof (op as any).newText !== "string") throw new Error(`append_to_block_section_end missing newText`);
    }
    if (policy.mode === "lego-additive" && !policy.allowRefactor) {
      if (op.op === "delete_block") {
        throw new Error(`delete_block is not allowed in lego-additive strict mode (set allowRefactor=true to permit)`);
      }
    }
  }

  let currentOp: PatchOp | null = null;

  try {
    for (const op of patch.ops) {
      currentOp = op;

      if (op.op === "replace_block") applyReplaceBlock(op, policy, log, touched);
      else if (op.op === "insert_block_after") applyInsertAfter(op, policy, log, touched);
      else if (op.op === "delete_block") applyDeleteBlock(op, policy, log, touched);
      else if (op.op === "create_file") applyCreateFile(op, policy, log, touched);
      else if (op.op === "append_to_block_section_end") applyAppendToBlockSectionEnd(op, policy, log, touched);
      else throw new Error(`Unknown op: ${(op as any).op}`);

      log.opsApplied++;
    }
  } catch (err: any) {
    const opType = currentOp?.op ?? "create_file";
    const target =
      currentOp?.op === "replace_block"
        ? currentOp.blockKey
        : currentOp?.op === "delete_block"
          ? currentOp.blockKey
          : currentOp?.op === "insert_block_after"
            ? currentOp.afterBlockKey
            : currentOp?.op === "append_to_block_section_end"
              ? `${currentOp.blockKey}#${(currentOp as any).sectionId ?? "(missing sectionId)"}`
              : currentOp?.op === "create_file"
                ? currentOp.path
                : "(unknown)";

    log.details.push({
      op: opType as PatchOp["op"],
      target,
      status: "failed",
      message: err?.message ?? String(err),
    });

    const wrote = writeApplyLog(log);
    console.error(`Patch apply FAILED: ${err?.message ?? String(err)}`);
    console.error(`Wrote log: ${wrote}`);
    process.exit(1);
  }

  log.filesTouched = Array.from(touched)
    .map((p) => toPosix(p))
    .sort((a, b) => a.localeCompare(b));

  const wrote = writeApplyLog(log);

  console.log(`Patch applied OK: ${patch.id}`);
  console.log(`Files touched: ${log.filesTouched.length}`);
  console.log(`Wrote log: ${wrote}`);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.230" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.240" kind="block" type="block" tags="block,toplevel"


main();
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.APPLY_PATCH.240" kind="block" type="block" tags="block,toplevel"


// MDV_BLOCK:END id="ENG.SCRIPTS.APPLY_PATCH.COMPOSITION.001"


// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.APPLY_PATCH.EXPORTS.001" intent="Exports: none (CLI script)" kind="section" tags="exports"
export {};
// MDV_BLOCK:END id="ENG.SCRIPTS.APPLY_PATCH.EXPORTS.001"

// MDV_BLOCK:END id="ENG.SCRIPTS.APPLY_PATCH.FILE.001"
