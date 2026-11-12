#!/usr/bin/env node
//# Dry run across repo:
//node scripts/repo-engine-scripts/mdv_blockify_repo.mjs --root . --prefixBase ENG --prefixRoot src --ext ts,tsx --dry
//# Apply across repo (writes files):
//node scripts/repo-engine-scripts/mdv_blockify_repo.mjs --root . --prefixBase ENG --prefixRoot src --ext ts,tsx

/**
 * MDV Blockifier (repo-wide) for TS/TSX/JS/JSX
 *
 * What it does (original behavior preserved):
 * - Recursively scans a repo and inserts MDV_BLOCK markers around top-level blocks.
 * - Uses TypeScript AST for reliable statement boundaries.
 * - Idempotent-ish: never inserts markers inside an existing MDV_BLOCK region.
 *
 * ID scheme (deterministic per file):
 * - idPrefix = <prefixBase> + "." + <STEM_FROM_PATH>
 * - STEM_FROM_PATH is derived from file path relative to --prefixRoot
 * - IDs increment per file: .010, .020, ...
 *
 * Structural additions:
 * - Adds `type="..."` attribute to BEGIN/END markers
 * - Groups all top-of-file imports into a single block (including optional "use client")
 * - If a file has "use client" but no imports, "use client" becomes its own module header block
 * - Groups trailing contiguous export declarations/assignments into a single exports block
 * - Block end = next statement fullStart (or EOF) to capture trailing gap comments
 *
 * NOTE:
 * - No semantic meaning (functionality) is inferred or written into source.
 * - Functionality lives exclusively in the Block Function Index.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

let ts;
try {
  ts = await import("typescript");
} catch {
  console.error("ERROR: typescript not found. Install with: npm i -D typescript");
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;

    if (k === "include") {
      args.include = args.include || [];
      args.include.push(v);
    } else {
      args[k] = v;
    }
  }
  return args;
}

const pad3 = (n) => String(n).padStart(3, "0");
const quoteAttr = (s) => String(s).replace(/"/g, '\\"');

function makeBegin({ id, kind, type, tags }) {
  const tagStr = tags?.length ? ` tags="${quoteAttr(tags.join(","))}"` : "";
  const typeStr = type ? ` type="${quoteAttr(type)}"` : "";
  return `// MDV_BLOCK:BEGIN id="${quoteAttr(id)}" kind="${quoteAttr(kind)}"${typeStr}${tagStr}`;
}

function makeEnd({ id, kind, type, tags }) {
  const tagStr = tags?.length ? ` tags="${quoteAttr(tags.join(","))}"` : "";
  const typeStr = type ? ` type="${quoteAttr(type)}"` : "";
  return `// MDV_BLOCK:END id="${quoteAttr(id)}" kind="${quoteAttr(kind)}"${typeStr}${tagStr}`;
}

function toTags(kind, extra = []) {
  return Array.from(new Set([kind, ...extra].filter(Boolean)));
}

function isUseClientDirective(stmt) {
  const t = ts.default;
  return (
    t.isExpressionStatement(stmt) &&
    t.isStringLiteral(stmt.expression) &&
    stmt.expression.text === "use client"
  );
}

const isImportDecl = (stmt) => ts.default.isImportDeclaration(stmt);
const isExportDeclOrAssignment = (stmt) =>
  ts.default.isExportDeclaration(stmt) || ts.default.isExportAssignment(stmt);

function classifyStatement(stmt) {
  const t = ts.default;

  if (t.isImportDeclaration(stmt)) {
    return { kind: "module", type: "imports", tags: ["imports"] };
  }

  if (t.isTypeAliasDeclaration(stmt) || t.isInterfaceDeclaration(stmt)) {
    return { kind: "types", type: "types", tags: ["types"] };
  }

  if (t.isFunctionDeclaration(stmt)) {
    const name = stmt.name?.text || "";
    const isHook = /^use[A-Z0-9_]/.test(name);
    return {
      kind: isHook ? "hook" : "function",
      type: isHook ? "hook" : "function",
      tags: isHook ? ["react", "hooks"] : ["function"],
    };
  }

  if (t.isClassDeclaration(stmt)) {
    return { kind: "class", type: "class", tags: ["class"] };
  }

  if (t.isVariableStatement(stmt)) {
    const decl = stmt.declarationList.declarations?.[0];
    const name = decl && t.isIdentifier(decl.name) ? decl.name.text : "";
    const init = decl?.initializer;
    const isFnLike = init && (t.isArrowFunction(init) || t.isFunctionExpression(init));
    const isComponent = /^[A-Z]/.test(name) && isFnLike;

    if (isFnLike) {
      return {
        kind: isComponent ? "component" : "function",
        type: isComponent ? "component" : "function",
        tags: isComponent ? ["react", "component"] : ["function"],
      };
    }

    return { kind: "var", type: "var", tags: ["var"] };
  }

  return { kind: "block", type: "block", tags: ["toplevel"] };
}

function computeTopLevelBlocks(sourceFile, text) {
  const t = ts.default;
  const stmts = sourceFile.statements;
  const blocks = [];
  let i = 0;

  // Imports (with optional "use client")
  if (stmts.length && isUseClientDirective(stmts[0])) {
    let j = 1;
    while (j < stmts.length && isImportDecl(stmts[j])) j++;

    if (j > 1) {
      // "use client" + one or more imports
      blocks.push({
        start: stmts[0].getFullStart(),
        endStmtIndex: j - 1,
        kind: "module",
        type: "imports",
        tags: ["nextjs", "client", "imports"],
      });
      i = j;
    } else {
      // "use client" only (no imports) => module header block
      blocks.push({
        start: stmts[0].getFullStart(),
        endStmtIndex: 0,
        kind: "module",
        type: "module",
        tags: ["nextjs", "client"],
      });
      i = 1;
    }
  } else {
    let j = 0;
    while (j < stmts.length && isImportDecl(stmts[j])) j++;
    if (j > 0) {
      blocks.push({
        start: stmts[0].getFullStart(),
        endStmtIndex: j - 1,
        kind: "module",
        type: "imports",
        tags: ["imports"],
      });
      i = j;
    }
  }

  // Trailing export declarations/assignments
  let exportRunStart = -1;
  let exportRunEnd = -1;
  {
    let k = stmts.length - 1;
    while (k >= 0 && stmts[k].kind === t.SyntaxKind.EmptyStatement) k--;
    const end = k;
    while (k >= 0 && isExportDeclOrAssignment(stmts[k])) k--;
    const start = k + 1;
    if (start <= end && start >= 0 && end >= 0) {
      exportRunStart = start;
      exportRunEnd = end;
    }
  }

  for (; i < stmts.length; i++) {
    if (exportRunStart !== -1 && i >= exportRunStart && i <= exportRunEnd) continue;
    const s = stmts[i];
    if (s.kind === t.SyntaxKind.EmptyStatement) continue;
    const meta = classifyStatement(s);
    blocks.push({
      start: s.getFullStart(),
      endStmtIndex: i,
      kind: meta.kind,
      type: meta.type,
      tags: meta.tags,
    });
  }

  if (exportRunStart !== -1) {
    blocks.push({
      start: stmts[exportRunStart].getFullStart(),
      endStmtIndex: exportRunEnd,
      kind: "module",
      type: "exports",
      tags: ["exports"],
    });
  }

  return blocks
    .map((b) => {
      const end =
        b.endStmtIndex + 1 < stmts.length
          ? stmts[b.endStmtIndex + 1].getFullStart()
          : text.length;
      return {
        start: b.start,
        end,
        kind: b.kind,
        type: b.type,
        tags: toTags(b.kind, b.tags),
      };
    })
    .filter((b) => b.end > b.start);
}

const rangesContainMarkers = (text, s, e) =>
  /MDV_BLOCK:BEGIN|MDV_BLOCK:END/.test(text.slice(s, e));

function insertMarkers(text, blocks, idPrefix, startNum, step) {
  const inserts = [];
  let n = startNum;

  for (const b of blocks) {
    if (rangesContainMarkers(text, b.start, b.end)) continue;
    const id = `${idPrefix}.${pad3(n)}`;
    n += step;

    inserts.push({
      atStart: b.start,
      atEnd: b.end,
      begin: makeBegin({ id, kind: b.kind, type: b.type, tags: b.tags }),
      end: makeEnd({ id, kind: b.kind, type: b.type, tags: b.tags }),
      id,
      kind: b.kind,
      type: b.type,
    });
  }

  inserts.sort((a, b) => b.atStart - a.atStart);
  let out = text;
  for (const ins of inserts) {
    out = out.slice(0, ins.atEnd) + `\n${ins.end}\n` + out.slice(ins.atEnd);
    out = out.slice(0, ins.atStart) + `${ins.begin}\n` + out.slice(ins.atStart);
  }

  return { out, insertsApplied: inserts.reverse() };
}

function normalizeStemFromPath(relNoExt) {
  return relNoExt
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join(".")
    .toUpperCase()
    .replace(/[^A-Z0-9.]/g, "_")
    .replace(/_+/g, "_")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
}

function walkFiles(rootAbs, includeRel, ignoreSet, extsSet) {
  const roots = includeRel.length
    ? includeRel.map((r) => path.resolve(rootAbs, r))
    : [rootAbs];
  const out = [];

  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!ignoreSet.has(ent.name)) walk(p);
      } else if (extsSet.has(path.extname(ent.name).toLowerCase())) {
        out.push(p);
      }
    }
  };

  roots.forEach((r) => fs.existsSync(r) && walk(r));
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.prefixBase) {
    console.error("ERROR: --prefixBase is required");
    process.exit(1);
  }

  const root = path.resolve(args.root || ".");
  const prefixRootAbs = args.prefixRoot
    ? path.resolve(root, args.prefixRoot)
    : root;

  const extsSet = new Set(
    (args.ext || "ts,tsx")
      .split(",")
      .map((e) => (e.startsWith(".") ? e : "." + e).toLowerCase())
  );

  const ignoreSet = new Set(
    (args.exclude ||
      ".git,node_modules,dist,build,.next,out,coverage,.turbo,.vercel"
    ).split(",")
  );

  const files = walkFiles(root, args.include || [], ignoreSet, extsSet);
  let touched = 0,
    blocksInserted = 0;

  for (const abs of files) {
    const text = fs.readFileSync(abs, "utf8");
    const rel = path.relative(prefixRootAbs, abs);
    const stem = normalizeStemFromPath(rel.replace(/\.[^.]+$/, ""));
    const idPrefix = `${args.prefixBase}.${stem}`;

    const sf = ts.default.createSourceFile(
      abs,
      text,
      ts.default.ScriptTarget.Latest,
      true
    );

    const blocks = computeTopLevelBlocks(sf, text);
    const { out, insertsApplied } = insertMarkers(
      text,
      blocks,
      idPrefix,
      Number(args.start || 10),
      Number(args.step || 10)
    );

    if (!insertsApplied.length) continue;
    touched++;
    blocksInserted += insertsApplied.length;

    if (args.dry) {
      console.log(`\n[DRY] ${path.relative(root, abs)}`);
      insertsApplied.forEach((b) =>
        console.log(`  - ${b.id} (${b.kind}/${b.type})`)
      );
    } else {
      fs.writeFileSync(abs, out, "utf8");
      console.log(`\n${path.relative(root, abs)}`);
      insertsApplied.forEach((b) =>
        console.log(`  + ${b.id} (${b.kind}/${b.type})`)
      );
    }
  }

  console.log(
    `\nDone. Files changed: ${touched}. Blocks inserted: ${blocksInserted}.`
  );
  if (args.dry) console.log("(Dry run: no files written.)");
}

main();