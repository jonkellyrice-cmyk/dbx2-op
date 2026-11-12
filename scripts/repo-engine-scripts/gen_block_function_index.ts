// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.010" kind="module" type="imports" tags="module,imports"
//command: npm run gen:block-function-index
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.010" kind="module" type="imports" tags="module,imports"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.020" kind="var" type="var" tags="var"


/**
 * Block Function Index (BFI) Generator
 *
 * Inputs:
 * - repo-engine-outputs/fingerprint-index.json  (canonical, machine-readable)
 *
 * Outputs:
 * - repo-engine-outputs/block-function-index.md (semantic overlay; ChatGPT fills fn)
 *
 * Idempotence / merge policy:
 * - Regenerates structure from fingerprint-index.json every run
 * - Preserves existing `fn` and `notes` fields per blockKey
 * - Computes status:
 *   - EMPTY  => fn is blank
 *   - OK     => fn exists AND oldHash === currentHash
 *   - STALE  => fn exists BUT oldHash !== currentHash
 * - Orphaned rows (present previously but no longer in fingerprint index) are kept
 *   in an "Orphans" section (so you don't lose work).
 */

// ------------------------------
// Paths
// ------------------------------
const __filename = fileURLToPath(import.meta.url);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.020" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.030" kind="var" type="var" tags="var"

const __dirname = path.dirname(__filename);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.030" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.040" kind="var" type="var" tags="var"

const repoRoot = path.resolve(__dirname, "..");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.040" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.050" kind="var" type="var" tags="var"


const fpJsonPath = path.resolve(repoRoot, "repo-engine-outputs", "fingerprint-index.json");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.050" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.060" kind="var" type="var" tags="var"

const outMdPath = path.resolve(repoRoot, "repo-engine-outputs", "block-function-index.md");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.060" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.070" kind="var" type="var" tags="var"


const BFI_BEGIN = "<!-- MDV_BFI:BEGIN -->";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.070" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.080" kind="var" type="var" tags="var"

const BFI_END = "<!-- MDV_BFI:END -->";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.080" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.090" kind="var" type="var" tags="var"

const ORPHANS_BEGIN = "<!-- MDV_BFI:ORPHANS_BEGIN -->";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.090" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.100" kind="var" type="var" tags="var"

const ORPHANS_END = "<!-- MDV_BFI:ORPHANS_END -->";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.100" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.110" kind="types" type="types" tags="types"


type FingerprintIndexJson = {
  schema?: string;
  repoName?: string;
  generatedAt?: string;
  files: Array<{
    path: string; // posix
    blocks: Array<{
      id: string;
      blockKey: string; // file:path + ":" + id
      blockOrdinalInFile: number;
      kind: string;
      type?: string;
      tags?: string[];
      startLine?: number;
      endLine?: number;
      contentHash: string;
    }>;
  }>;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.110" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.120" kind="types" type="types" tags="types"


type ExistingRow = {
  blockKey: string;
  kind: string;
  type: string;
  tags: string;
  hash: string;
  status: string;
  fn: string;
  notes: string;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.120" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.130" kind="function" type="function" tags="function"


function readTextSafe(p: string): string | null {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.130" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.140" kind="function" type="function" tags="function"


function writeText(p: string, text: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text, "utf8");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.140" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.150" kind="function" type="function" tags="function"


function escapeMdCell(s: string): string {
  // Keep it simple and deterministic.
  // We also prevent newlines from breaking the table.
  return String(s ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "\\n")
    .replace(/\|/g, "\\|")
    .trim();
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.150" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.160" kind="function" type="function" tags="function"


function unescapeMdCell(s: string): string {
  return String(s ?? "")
    .replace(/\\\|/g, "|")
    .replace(/\\n/g, "\n")
    .trim();
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.160" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.170" kind="function" type="function" tags="function"


function parsePipeTableSection(md: string, beginMarker: string, endMarker: string): ExistingRow[] {
  const beginIdx = md.indexOf(beginMarker);
  const endIdx = md.indexOf(endMarker);
  if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) return [];

  const section = md.slice(beginIdx + beginMarker.length, endIdx);
  const lines = section.split(/\r?\n/).map((l) => l.trim());

  // Find the header line (starts with |) and separator line (|---)
  const headerIdx = lines.findIndex((l) => l.startsWith("|") && l.includes("BlockKey"));
  if (headerIdx === -1) return [];

  // Data starts after the separator row
  const sepIdx = headerIdx + 1;
  if (!lines[sepIdx] || !lines[sepIdx].startsWith("|")) return [];

  const dataLines = lines.slice(sepIdx + 1).filter((l) => l.startsWith("|"));

  const out: ExistingRow[] = [];
  for (const line of dataLines) {
    const cells = line
      .split("|")
      .slice(1, -1) // remove leading/trailing empty from pipes
      .map((c) => c.trim());

    // Expected columns:
    // 0 BlockKey | 1 Kind | 2 Type | 3 Tags | 4 Hash | 5 Status | 6 Fn | 7 Notes
    if (cells.length < 8) continue;

    out.push({
      blockKey: unescapeMdCell(cells[0]).replace(/`/g, ""), // table uses `...`
      kind: unescapeMdCell(cells[1]).replace(/`/g, ""),
      type: unescapeMdCell(cells[2]).replace(/`/g, ""),
      tags: unescapeMdCell(cells[3]),
      hash: unescapeMdCell(cells[4]).replace(/`/g, ""),
      status: unescapeMdCell(cells[5]),
      fn: unescapeMdCell(cells[6]),
      notes: unescapeMdCell(cells[7]),
    });
  }
  return out;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.170" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.180" kind="function" type="function" tags="function"


function rowsToMap(rows: ExistingRow[]): Map<string, ExistingRow> {
  const m = new Map<string, ExistingRow>();
  for (const r of rows) {
    if (!r.blockKey) continue;
    m.set(r.blockKey, r);
  }
  return m;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.180" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.190" kind="function" type="function" tags="function"


function computeStatus(fnText: string, oldHash: string | null, newHash: string): "EMPTY" | "OK" | "STALE" {
  const hasFn = !!(fnText && fnText.trim().length);
  if (!hasFn) return "EMPTY";
  if (oldHash && oldHash === newHash) return "OK";
  return "STALE";
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.190" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.200" kind="function" type="function" tags="function"


function formatMainTableRow(r: {
  blockKey: string;
  kind: string;
  type: string;
  tags: string;
  hash: string;
  status: string;
  fn: string;
  notes: string;
}): string {
  // BlockKey + kind/type/hash in code ticks for scannability
  const c0 = `\`${escapeMdCell(r.blockKey)}\``;
  const c1 = `\`${escapeMdCell(r.kind)}\``;
  const c2 = `\`${escapeMdCell(r.type)}\``;
  const c3 = escapeMdCell(r.tags);
  const c4 = `\`${escapeMdCell(r.hash)}\``;
  const c5 = escapeMdCell(r.status);
  const c6 = escapeMdCell(r.fn);
  const c7 = escapeMdCell(r.notes);
  return `| ${c0} | ${c1} | ${c2} | ${c3} | ${c4} | ${c5} | ${c6} | ${c7} |`;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.200" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.210" kind="var" type="var" tags="var"


// ------------------------------
// Main
// ------------------------------
const fpRaw = readTextSafe(fpJsonPath);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.210" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.220" kind="block" type="block" tags="block,toplevel"

if (!fpRaw) {
  console.error(`ERROR: Missing fingerprint index JSON at: ${fpJsonPath}`);
  console.error(`Run: npm run gen:fingerprint-index (or npm run repo:fingerprint)`);
  process.exit(1);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.220" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.230" kind="var" type="var" tags="var"


let fp: FingerprintIndexJson;
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.230" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.240" kind="block" type="block" tags="block,toplevel"

try {
  fp = JSON.parse(fpRaw) as FingerprintIndexJson;
} catch (e) {
  console.error(`ERROR: Failed to parse fingerprint index JSON at: ${fpJsonPath}`);
  process.exit(1);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.240" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.250" kind="var" type="var" tags="var"


const existingMd = readTextSafe(outMdPath) ?? "";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.250" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.260" kind="var" type="var" tags="var"

const existingRows = parsePipeTableSection(existingMd, BFI_BEGIN, BFI_END);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.260" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.270" kind="var" type="var" tags="var"

const existingOrphans = parsePipeTableSection(existingMd, ORPHANS_BEGIN, ORPHANS_END);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.270" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.280" kind="var" type="var" tags="var"

const existingMap = rowsToMap(existingRows);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.280" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.290" kind="var" type="var" tags="var"

const existingOrphansMap = rowsToMap(existingOrphans);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.290" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.300" kind="types" type="types" tags="types"


// Flatten blocks in deterministic order: by file path, then ordinal
type FlatBlock = {
  filePath: string;
  ordinal: number;
  blockKey: string;
  id: string;
  kind: string;
  type: string;
  tags: string[];
  hash: string;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.300" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.310" kind="var" type="var" tags="var"


const flat: FlatBlock[] = [];
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.310" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.320" kind="block" type="block" tags="block,toplevel"

for (const f of fp.files ?? []) {
  const filePath = f.path;
  for (const b of f.blocks ?? []) {
    flat.push({
      filePath,
      ordinal: b.blockOrdinalInFile ?? 0,
      blockKey: b.blockKey,
      id: b.id,
      kind: (b.kind ?? "").trim(),
      type: (b.type ?? "").trim(),
      tags: (b.tags ?? []).map(String),
      hash: b.contentHash,
    });
  }
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.320" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.330" kind="block" type="block" tags="block,toplevel"


flat.sort((a, b) => {
  const p = a.filePath.localeCompare(b.filePath);
  if (p !== 0) return p;
  return (a.ordinal ?? 0) - (b.ordinal ?? 0);
});
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.330" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.340" kind="var" type="var" tags="var"


// Build new rows
const newRows: ExistingRow[] = [];
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.340" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.350" kind="var" type="var" tags="var"

const seen = new Set<string>();
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.350" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.360" kind="block" type="block" tags="block,toplevel"


for (const b of flat) {
  const prev = existingMap.get(b.blockKey) ?? null;

  const tagsStr = b.tags.join(", ");

  const fn = prev?.fn ?? "";
  const notes = prev?.notes ?? "";
  const status = computeStatus(fn, prev?.hash ?? null, b.hash);

  newRows.push({
    blockKey: b.blockKey,
    kind: b.kind,
    type: b.type,
    tags: tagsStr,
    hash: b.hash,
    status,
    fn,
    notes,
  });

  seen.add(b.blockKey);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.360" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.370" kind="var" type="var" tags="var"


// Orphans = anything in existing main table OR existing orphan table that is not in current fingerprint index
const orphanCandidates: ExistingRow[] = [];
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.370" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.380" kind="block" type="block" tags="block,toplevel"

for (const r of existingRows) if (!seen.has(r.blockKey)) orphanCandidates.push(r);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.380" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.390" kind="block" type="block" tags="block,toplevel"

for (const r of existingOrphans) if (!seen.has(r.blockKey)) orphanCandidates.push(r);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.390" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.400" kind="var" type="var" tags="var"


// Deduplicate orphans by blockKey, preferring the first one encountered
const orphanMap = new Map<string, ExistingRow>();
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.400" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.410" kind="block" type="block" tags="block,toplevel"

for (const r of orphanCandidates) {
  if (!r.blockKey) continue;
  if (orphanMap.has(r.blockKey)) continue;
  // Mark as ORPHAN (unless user already put something else)
  const status = r.status && r.status.trim().length ? r.status.trim() : "ORPHAN";
  orphanMap.set(r.blockKey, { ...r, status });
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.410" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.420" kind="var" type="var" tags="var"


// Deterministic orphan order by blockKey
const orphans = Array.from(orphanMap.values()).sort((a, b) => a.blockKey.localeCompare(b.blockKey));
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.420" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.430" kind="var" type="var" tags="var"


// Emit markdown
const nowIso = new Date().toISOString();
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.430" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.440" kind="var" type="var" tags="var"

const repoName = fp.repoName ?? path.basename(repoRoot);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.440" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.450" kind="var" type="var" tags="var"

const fpGeneratedAt = fp.generatedAt ?? "";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.450" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.460" kind="var" type="var" tags="var"


const lines: string[] = [];
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.460" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.470" kind="block" type="block" tags="block,toplevel"

lines.push(`# Block Function Index`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.470" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.480" kind="block" type="block" tags="block,toplevel"

lines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.480" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.490" kind="block" type="block" tags="block,toplevel"

lines.push(`> Auto-generated scaffold + merge-preserving overlay. Edit **only** the \`Fn\` and \`Notes\` cells.`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.490" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.500" kind="block" type="block" tags="block,toplevel"

lines.push(`> Regenerate with: \`npm run gen:block-function-index\``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.500" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.510" kind="block" type="block" tags="block,toplevel"

lines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.510" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.520" kind="block" type="block" tags="block,toplevel"

lines.push(`- Repo: **${repoName}**`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.520" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.530" kind="block" type="block" tags="block,toplevel"

if (fpGeneratedAt) lines.push(`- Fingerprint index generated: \`${fpGeneratedAt}\``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.530" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.540" kind="block" type="block" tags="block,toplevel"

lines.push(`- Block function index generated: \`${nowIso}\``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.540" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.550" kind="block" type="block" tags="block,toplevel"

lines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.550" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.560" kind="block" type="block" tags="block,toplevel"

lines.push(`## Status meanings`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.560" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.570" kind="block" type="block" tags="block,toplevel"

lines.push(`- **EMPTY**: Fn is blank`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.570" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.580" kind="block" type="block" tags="block,toplevel"

lines.push(`- **OK**: Fn exists and block hash unchanged`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.580" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.590" kind="block" type="block" tags="block,toplevel"

lines.push(`- **STALE**: Fn exists but block hash changed (review/update Fn)`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.590" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.600" kind="block" type="block" tags="block,toplevel"

lines.push(`- **ORPHAN**: Block no longer exists in fingerprint index (kept to avoid losing work)`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.600" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.610" kind="block" type="block" tags="block,toplevel"

lines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.610" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.620" kind="block" type="block" tags="block,toplevel"


lines.push(`## Blocks`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.620" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.630" kind="block" type="block" tags="block,toplevel"

lines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.630" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.640" kind="block" type="block" tags="block,toplevel"

lines.push(BFI_BEGIN);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.640" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.650" kind="block" type="block" tags="block,toplevel"

lines.push(`| BlockKey | Kind | Type | Tags | Hash | Status | Fn | Notes |`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.650" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.660" kind="block" type="block" tags="block,toplevel"

lines.push(`|---|---|---|---|---|---|---|---|`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.660" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.670" kind="block" type="block" tags="block,toplevel"


for (const r of newRows) {
  lines.push(
    formatMainTableRow({
      blockKey: r.blockKey,
      kind: r.kind,
      type: r.type,
      tags: r.tags,
      hash: r.hash,
      status: r.status,
      fn: r.fn,
      notes: r.notes,
    })
  );
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.670" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.680" kind="block" type="block" tags="block,toplevel"


lines.push(BFI_END);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.680" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.690" kind="block" type="block" tags="block,toplevel"

lines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.690" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.700" kind="block" type="block" tags="block,toplevel"


lines.push(`## Orphans`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.700" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.710" kind="block" type="block" tags="block,toplevel"

lines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.710" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.720" kind="block" type="block" tags="block,toplevel"

lines.push(ORPHANS_BEGIN);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.720" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.730" kind="block" type="block" tags="block,toplevel"

lines.push(`| BlockKey | Kind | Type | Tags | Hash | Status | Fn | Notes |`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.730" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.740" kind="block" type="block" tags="block,toplevel"

lines.push(`|---|---|---|---|---|---|---|---|`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.740" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.750" kind="block" type="block" tags="block,toplevel"


for (const r of orphans) {
  lines.push(
    formatMainTableRow({
      blockKey: r.blockKey,
      kind: r.kind,
      type: r.type,
      tags: r.tags,
      hash: r.hash,
      status: r.status && r.status.trim().length ? r.status : "ORPHAN",
      fn: r.fn,
      notes: r.notes,
    })
  );
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.750" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.760" kind="block" type="block" tags="block,toplevel"


lines.push(ORPHANS_END);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.760" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.770" kind="block" type="block" tags="block,toplevel"

lines.push(``);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.770" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.780" kind="block" type="block" tags="block,toplevel"


writeText(outMdPath, lines.join("\n") + "\n");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.780" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.790" kind="block" type="block" tags="block,toplevel"


console.log(`Wrote: ${outMdPath}`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.790" kind="block" type="block" tags="block,toplevel"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.800" kind="block" type="block" tags="block,toplevel"

console.log(`Source: ${fpJsonPath}`);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.GEN_BLOCK_FUNCTION_INDEX.800" kind="block" type="block" tags="block,toplevel"
