// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.010" kind="module" type="imports" tags="module,imports"
//command: npm run snapshot:patch -- docs/patches/PATCH....json

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.010" kind="module" type="imports" tags="module,imports"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.020" kind="types" type="types" tags="types"


type PatchDocumentV1 = {
  schema: "PatchDocumentV1";
  id: string;
  generatedAt: string;
  repoName: string;
  ops: Array<
    | { op: "replace_block"; blockKey: string; expectedContentHash: string; newBlockText: string }
    | { op: "insert_block_after"; afterBlockKey: string; newBlockText: string }
    | { op: "delete_block"; blockKey: string; expectedContentHash: string }
  >;
  notes: string[];
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.020" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.030" kind="types" type="types" tags="types"


type SnapshotMetaV1 = {
  schema: "SnapshotMetaV1";
  id: string;
  createdAt: string;
  patchId: string;
  patchPath: string; // posix relative
  touchedFiles: Array<{
    file: string;      // posix relative
    fileHash: string;  // sha256(normalized)
    bytes: number;
  }>;
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.030" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.040" kind="var" type="var" tags="var"


const __filename = fileURLToPath(import.meta.url);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.040" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.050" kind="var" type="var" tags="var"

const __dirname = path.dirname(__filename);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.050" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.060" kind="var" type="var" tags="var"

const repoRoot = path.resolve(__dirname, "..");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.060" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.070" kind="function" type="function" tags="function"


function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.070" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.080" kind="function" type="function" tags="function"


function normalize(t: string) {
  return t.replace(/\r\n/g, "\n");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.080" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.090" kind="function" type="function" tags="function"


function toPosix(p: string) {
  return p.split(path.sep).join("/");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.090" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.100" kind="function" type="function" tags="function"


function fileAbsFromPosix(relPosix: string): string {
  const relNative = relPosix.split("/").join(path.sep);
  return path.resolve(repoRoot, relNative);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.100" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.110" kind="function" type="function" tags="function"


function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 160);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.110" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.120" kind="function" type="function" tags="function"


function readJson<T>(absPath: string): T {
  const raw = fs.readFileSync(absPath, "utf8");
  return JSON.parse(raw) as T;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.120" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.130" kind="function" type="function" tags="function"


function writeText(absPath: string, text: string) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, text, "utf8");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.130" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.140" kind="function" type="function" tags="function"


function extractFilePosixFromBlockKey(blockKey: string): string {
  const idx = blockKey.lastIndexOf(":");
  if (idx < 0) throw new Error(`Invalid blockKey: ${blockKey}`);
  return blockKey.slice(0, idx);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.140" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.150" kind="function" type="function" tags="function"


function main() {
  const args = process.argv.slice(2);
  const patchPathArg = args.find((a) => !a.startsWith("--"));
  if (!patchPathArg) {
    console.error(`Usage: npm run snapshot:patch -- <patchPath>`);
    process.exit(2);
  }

  const patchAbs = path.isAbsolute(patchPathArg)
    ? patchPathArg
    : path.resolve(repoRoot, patchPathArg.split("/").join(path.sep));

  if (!fs.existsSync(patchAbs)) {
    console.error(`Patch not found: ${patchPathArg}`);
    process.exit(1);
  }

  const patch = readJson<PatchDocumentV1>(patchAbs);
  if (patch.schema !== "PatchDocumentV1") {
    console.error(`Not a PatchDocumentV1: ${patchPathArg}`);
    process.exit(1);
  }

  // Determine touched files from ops
  const files = new Set<string>();
  for (const op of patch.ops) {
    if (op.op === "insert_block_after") {
      files.add(extractFilePosixFromBlockKey(op.afterBlockKey));
    } else {
      files.add(extractFilePosixFromBlockKey(op.blockKey));
    }
  }

  const touchedFiles = Array.from(files).sort((a, b) => a.localeCompare(b));

  const snapshotId = `SNAP.${new Date().toISOString().replace(/[:.]/g, "")}.${safeName(patch.id)}`;
  const snapRoot = path.resolve(repoRoot, "docs", "snapshots", snapshotId);
  const filesRoot = path.resolve(snapRoot, "files");

  const meta: SnapshotMetaV1 = {
    schema: "SnapshotMetaV1",
    id: snapshotId,
    createdAt: new Date().toISOString(),
    patchId: patch.id,
    patchPath: toPosix(path.relative(repoRoot, patchAbs)),
    touchedFiles: [],
  };

  for (const filePosix of touchedFiles) {
    const abs = fileAbsFromPosix(filePosix);

    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      // Still record it, but as missing (hash empty)
      meta.touchedFiles.push({
        file: filePosix,
        fileHash: "",
        bytes: 0,
      });
      continue;
    }

    const raw = fs.readFileSync(abs, "utf8");
    const normalized = normalize(raw);
    const fileHash = sha256(normalized);
    const bytes = Buffer.byteLength(raw, "utf8");

    meta.touchedFiles.push({
      file: filePosix,
      fileHash,
      bytes,
    });

    // Copy file into snapshot mirror path
    const destAbs = path.resolve(filesRoot, filePosix.split("/").join(path.sep));
    fs.mkdirSync(path.dirname(destAbs), { recursive: true });
    fs.copyFileSync(abs, destAbs);
  }

  // Write meta
  const metaAbs = path.resolve(snapRoot, "meta.json");
  writeText(metaAbs, JSON.stringify(meta, null, 2) + "\n");

  // Convenience README
  const readmeAbs = path.resolve(snapRoot, "README.md");
  const md: string[] = [];
  md.push(`# Snapshot`);
  md.push(``);
  md.push(`- id: \`${meta.id}\``);
  md.push(`- created: ${meta.createdAt}`);
  md.push(`- patchId: \`${meta.patchId}\``);
  md.push(`- patchPath: \`${meta.patchPath}\``);
  md.push(``);
  md.push(`## Touched files (${meta.touchedFiles.length})`);
  for (const f of meta.touchedFiles) {
    const h = f.fileHash ? `\`${f.fileHash}\`` : `*(missing at snapshot time)*`;
    md.push(`- \`${f.file}\` — ${h}`);
  }
  md.push(``);
  md.push(`## Restore (manual)`);
  md.push(`Copy files back from:`);
  md.push(`- \`docs/snapshots/${meta.id}/files/\``);
  md.push(``);
  writeText(readmeAbs, md.join("\n"));

  console.log(`Wrote: ${toPosix(path.relative(repoRoot, metaAbs))}`);
  console.log(`Wrote: ${toPosix(path.relative(repoRoot, readmeAbs))}`);
  console.log(`Copied files to: ${toPosix(path.relative(repoRoot, filesRoot))}`);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.150" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.160" kind="block" type="block" tags="block,toplevel"


main();

// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.SNAPSHOT_PATCH.160" kind="block" type="block" tags="block,toplevel"
