// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.010" kind="module" type="imports" tags="module,imports"
//command: npm run extract:block -- "src/app/page.tsx:ENG.APP.PAGE.020"

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.010" kind="module" type="imports" tags="module,imports"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.020" kind="types" type="types" tags="types"


type ExtractPayload = {
  schema: "ExtractBlockV1";
  generatedAt: string;
  repoRelPath: string;     // posix file path
  blockId: string;
  blockKey: string;

  fileHash: string;        // sha256(normalized file)
  contentHash: string;     // sha256(normalized block slice BEGIN..END)
  startLine: number;       // 1-based inclusive
  endLine: number;         // 1-based inclusive
  lineCount: number;

  beginLineText: string;
  endLineText: string;

  blockText: string;       // normalized BEGIN..END inclusive
};
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.020" kind="types" type="types" tags="types"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.030" kind="var" type="var" tags="var"


const __filename = fileURLToPath(import.meta.url);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.030" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.040" kind="var" type="var" tags="var"

const __dirname = path.dirname(__filename);
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.040" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.050" kind="var" type="var" tags="var"

const repoRoot = path.resolve(__dirname, "..");
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.050" kind="var" type="var" tags="var"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.060" kind="function" type="function" tags="function"


function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.060" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.070" kind="function" type="function" tags="function"


function normalize(t: string) {
  return t.replace(/\r\n/g, "\n");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.070" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.080" kind="function" type="function" tags="function"


function toPosix(p: string) {
  return p.split(path.sep).join("/");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.080" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.090" kind="function" type="function" tags="function"


function fileAbsFromPosix(relPosix: string): string {
  const relNative = relPosix.split("/").join(path.sep);
  return path.resolve(repoRoot, relNative);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.090" kind="function" type="function" tags="function"


function isBegin(line: string) {
  return /^\s*\/\/\s*MDV_BLOCK:BEGIN\b/.test(line);
}

function isEnd(line: string) {
  return /^\s*\/\/\s*MDV_BLOCK:END\b/.test(line);
}// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.100" kind="function" type="function" tags="function"


function parseAttrs(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) attrs[m[1]] = m[2];
  return attrs;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.100" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.110" kind="function" type="function" tags="function"


function splitBlockKey(blockKey: string): { filePosix: string; blockId: string } {
  const idx = blockKey.lastIndexOf(":");
  if (idx < 0) throw new Error(`Invalid blockKey (missing ":"): ${blockKey}`);
  return { filePosix: blockKey.slice(0, idx), blockId: blockKey.slice(idx + 1) };
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.110" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.120" kind="function" type="function" tags="function"


function findBlock(text: string, blockId: string): {
  startIdx: number; // 0-based line index inclusive
  endIdx: number;   // 0-based line index inclusive
  slice: string;    // normalized slice text
  beginLineText: string;
  endLineText: string;
} | null {
  const lines = normalize(text).split("\n");
  const stack: Array<{ idx: number; attrs: Record<string, string>; lineText: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isBegin(line)) {
      stack.push({ idx: i, attrs: parseAttrs(line), lineText: line });
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
        const startIdx = open.idx;
        const endIdx = i;
        const slice = lines.slice(startIdx, endIdx + 1).join("\n");
        return {
          startIdx,
          endIdx,
          slice,
          beginLineText: open.lineText,
          endLineText: line,
        };
      }
    }
  }

  return null;
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.120" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.130" kind="function" type="function" tags="function"


function safeName(s: string) {
  // filesystem-safe, deterministic
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 160);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.130" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.140" kind="function" type="function" tags="function"


function writeText(fileAbs: string, content: string) {
  fs.mkdirSync(path.dirname(fileAbs), { recursive: true });
  fs.writeFileSync(fileAbs, content, "utf8");
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.140" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.150" kind="function" type="function" tags="function"


function main() {
  // Args:
  // 0 node
  // 1 script
  // 2 blockKey
  // optional flags:
  //   --out <path>   (writes JSON to exact path)
  //   --stdout       (prints JSON only)
  const blockKeyArg = process.argv[2];
  if (!blockKeyArg || blockKeyArg.startsWith("--")) {
    console.error(`Usage: npm run extract:block -- "<filePosix>:<blockId>" [--out <path>] [--stdout]`);
    process.exit(2);
  }

  const { filePosix, blockId } = splitBlockKey(blockKeyArg);
  const fileAbs = fileAbsFromPosix(filePosix);

  if (!fs.existsSync(fileAbs)) {
    console.error(`File not found: ${filePosix}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(fileAbs, "utf8");
  const normalizedFile = normalize(raw);
  const fileHash = sha256(normalizedFile);

  const hit = findBlock(normalizedFile, blockId);
  if (!hit) {
    console.error(`Block id not found: ${blockKeyArg}`);
    process.exit(1);
  }

  const blockText = normalize(hit.slice);
  const contentHash = sha256(blockText);

  const payload: ExtractPayload = {
    schema: "ExtractBlockV1",
    generatedAt: new Date().toISOString(),
    repoRelPath: filePosix,
    blockId,
    blockKey: blockKeyArg,

    fileHash,
    contentHash,
    startLine: hit.startIdx + 1,
    endLine: hit.endIdx + 1,
    lineCount: hit.endIdx - hit.startIdx + 1,

    beginLineText: hit.beginLineText,
    endLineText: hit.endLineText,

    blockText,
  };

  // Parse flags
  const args = process.argv.slice(3);
  const stdoutOnly = args.includes("--stdout");

  let outPath: string | null = null;
  const outIdx = args.indexOf("--out");
  if (outIdx >= 0) {
    const p = args[outIdx + 1];
    if (!p) {
      console.error(`--out requires a path`);
      process.exit(2);
    }
    outPath = path.isAbsolute(p) ? p : path.resolve(repoRoot, p.split("/").join(path.sep));
  }

  const json = JSON.stringify(payload, null, 2) + "\n";

  if (stdoutOnly) {
    process.stdout.write(json);
    return;
  }

  // Default: write bundle in docs/extract/
  if (!outPath) {
    const base = safeName(blockKeyArg);
    const jsonAbs = path.resolve(repoRoot, "repo-engine-outputs", "extract", `${base}.json`);
    const mdAbs = path.resolve(repoRoot, "repo-engine-outputs", "extract", `${base}.md`);

    writeText(jsonAbs, json);

    const md: string[] = [];
    md.push(`# Extracted block`);
    md.push(``);
    md.push(`- blockKey: \`${payload.blockKey}\``);
    md.push(`- file: \`${payload.repoRelPath}\``);
    md.push(`- lines: ${payload.startLine}–${payload.endLine} (${payload.lineCount})`);
    md.push(`- contentHash: \`${payload.contentHash}\``);
    md.push(`- fileHash: \`${payload.fileHash}\``);
    md.push(`- generated: ${payload.generatedAt}`);
    md.push(``);
    md.push(`## Block text`);
    md.push(``);
    md.push("```");
    md.push(payload.blockText);
    md.push("```");
    md.push("");

    writeText(mdAbs, md.join("\n"));

    console.log(`Wrote: ${toPosix(path.relative(repoRoot, jsonAbs))}`);
    console.log(`Wrote: ${toPosix(path.relative(repoRoot, mdAbs))}`);
    return;
  }

  // If --out provided: write JSON only
  writeText(outPath, json);
  console.log(`Wrote: ${toPosix(path.relative(repoRoot, outPath))}`);
}
// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.150" kind="function" type="function" tags="function"
// MDV_BLOCK:BEGIN id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.160" kind="block" type="block" tags="block,toplevel"


main();

// MDV_BLOCK:END id="ENG.SCRIPTS.REPO_ENGINE_SCRIPTS.EXTRACT_BLOCK.160" kind="block" type="block" tags="block,toplevel"
