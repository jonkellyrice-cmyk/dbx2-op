import path from "node:path";
import { Project, Node } from "ts-morph";

/**
 * Config
 */
const ROOT = process.cwd();
const SRC_GLOB = "src/**/*.{ts,tsx,js,jsx}";
const EXCLUDE_GLOBS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/out/**",
  "**/coverage/**",
  "**/*.d.ts",
  "**/*.test.*",
  "**/*.spec.*",
];

const project = new Project({
  tsConfigFilePath: path.join(ROOT, "tsconfig.json"),
  skipAddingFilesFromTsConfig: false,
});

// Add src files explicitly (ts-morph sometimes only loads what tsconfig includes)
project.addSourceFilesAtPaths([SRC_GLOB, ...EXCLUDE_GLOBS.map(g => "!" + g)]);

const sourceFiles = project
  .getSourceFiles()
  .filter(sf => {
    const p = sf.getFilePath().replaceAll("\\", "/");
    if (!p.includes("/src/")) return false;
    if (p.includes("/node_modules/")) return false;
    if (p.includes("/dist/") || p.includes("/build/") || p.includes("/.next/") || p.includes("/out/") || p.includes("/coverage/")) return false;
    if (p.endsWith(".d.ts")) return false;
    if (p.match(/\.(test|spec)\./)) return false;
    return true;
  });

function relPosix(absPath) {
  return path.posix.relative(ROOT, absPath).replaceAll("\\", "/");
}

function isIndexFile(relPath) {
  const base = path.posix.basename(relPath);
  return base === "index.ts" || base === "index.tsx" || base === "index.js" || base === "index.jsx";
}

function removeExt(fileName) {
  return fileName.replace(/\.(ts|tsx|js|jsx)$/i, "");
}

function hasDefaultExport(sf) {
  return Boolean(sf.getDefaultExportSymbol()) || sf.getExportAssignment() != null;
}

function stubForExport(name, decl) {
  // Types
  if (Node.isInterfaceDeclaration(decl)) {
    return `export interface ${name} { [key: string]: any }\n`;
  }
  if (Node.isTypeAliasDeclaration(decl)) {
    return `export type ${name} = any;\n`;
  }
  if (Node.isEnumDeclaration(decl)) {
    return `export enum ${name} {\n  // TODO: define members\n}\n`;
  }

  // Values
  if (Node.isFunctionDeclaration(decl) || Node.isFunctionExpression(decl)) {
    return `export function ${name}(..._args: any[]): any {\n  throw new Error("Not implemented: ${name}");\n}\n`;
  }
  if (Node.isClassDeclaration(decl)) {
    return `export class ${name} {\n  constructor(..._args: any[]) {\n    throw new Error("Not implemented: ${name}");\n  }\n}\n`;
  }
  if (Node.isVariableDeclaration(decl) || Node.isVariableStatement(decl)) {
    return `export const ${name}: any = undefined as any;\n`;
  }

  return `export const ${name}: any = undefined as any;\n`;
}

/**
 * For index adapters: find sibling domain files in the same directory.
 * - Excludes index.* itself
 * - Excludes tests/specs
 * Returns sibling module specifiers like "./foo"
 */
function findSiblingModulesForIndex(indexSf) {
  const indexAbs = indexSf.getFilePath();
  const dirAbs = path.posix.dirname(indexAbs.replaceAll("\\", "/"));

  const siblings = project.getSourceFiles().filter(sf => {
    const abs = sf.getFilePath().replaceAll("\\", "/");
    if (abs === indexAbs.replaceAll("\\", "/")) return false;
    if (path.posix.dirname(abs) !== dirAbs) return false;

    const base = path.posix.basename(abs);
    if (base.startsWith(".")) return false;
    if (isIndexFile(relPosix(abs))) return false;
    if (abs.endsWith(".d.ts")) return false;
    if (abs.match(/\.(test|spec)\./)) return false;

    // Only consider actual source extensions we are templating
    if (!abs.match(/\.(ts|tsx|js|jsx)$/i)) return false;

    return true;
  });

  // Convert to module specifiers "./name" without extension
  const moduleSpecifiers = siblings
    .map(sf => "./" + removeExt(path.posix.basename(sf.getFilePath().replaceAll("\\", "/"))))
    .sort((a, b) => a.localeCompare(b));

  return { siblings, moduleSpecifiers };
}

let changed = 0;

for (const sf of sourceFiles) {
  const abs = sf.getFilePath();
  const rel = relPosix(abs);

  const lines = [];
  lines.push(`/**`);
  lines.push(` * TEMPLATE STUB`);
  lines.push(` *`);
  lines.push(` * Original file: ${rel}`);
  lines.push(` * This file was stubbed to remove project-specific implementation.`);
  lines.push(` */`);
  lines.push(``);

  // Special handling for index adapters: keep them as re-export barrels.
  if (isIndexFile(rel)) {
    const { siblings, moduleSpecifiers } = findSiblingModulesForIndex(sf);

    if (moduleSpecifiers.length === 0) {
      lines.push(`// No sibling modules found to re-export.`);
      lines.push(`export {};`);
      sf.replaceWithText(lines.join("\n"));
      changed++;
      continue;
    }

    // Re-export everything from all siblings
    for (const mod of moduleSpecifiers) {
      lines.push(`export * from "${mod}";`);
    }

    // If exactly one sibling, attempt to re-export its default too.
    // (If that sibling doesn't have a default export, TS will flag it—usually desired.)
    if (moduleSpecifiers.length === 1) {
      const onlySiblingSf = siblings[0];
      if (onlySiblingSf && hasDefaultExport(onlySiblingSf)) {
        lines.push(`export { default } from "${moduleSpecifiers[0]}";`);
      } else {
        // If you prefer always having a default on index adapters, replace this with:
        // lines.push(`const _default: any = undefined as any; export default _default;`);
        lines.push(`// Sibling has no default export; leaving index without default.`);
      }
    }

    sf.replaceWithText(lines.join("\n"));
    changed++;
    continue;
  }

  // Normal (non-index) files: preserve exported names as stubs
  const exported = sf.getExportedDeclarations(); // Map<string, Declaration[]>
  const exportNames = Array.from(exported.keys()).filter(n => n !== "default").sort((a, b) => a.localeCompare(b));

  for (const name of exportNames) {
    const decls = exported.get(name) || [];
    const decl = decls[0];
    lines.push(stubForExport(name, decl));
  }

  if (hasDefaultExport(sf)) {
    lines.push(`const _default: any = undefined as any;`);
    lines.push(`export default _default;`);
    lines.push(``);
  }

  if (exportNames.length === 0 && !hasDefaultExport(sf)) {
    lines.push(`export {};`);
  }

  sf.replaceWithText(lines.join("\n"));
  changed++;
}

await project.save();
console.log(`Stubbed ${changed} files under src/.`);
