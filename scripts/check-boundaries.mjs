import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

const ROOT = resolve(process.cwd());
const SOURCE_ROOTS = [resolve(ROOT, "src"), resolve(ROOT, "app")];

const layerRules = {
  kernel: new Set(["kernel"]),
  domain: new Set(["kernel", "domain"]),
  application: new Set(["kernel", "domain", "application"]),
  infrastructure: new Set(["kernel", "domain", "application", "infrastructure"]),
  presentation: new Set(["kernel", "domain", "application", "presentation"]),
  config: new Set(["config"]),
  composition: new Set([
    "kernel",
    "domain",
    "application",
    "infrastructure",
    "presentation",
    "config",
    "composition",
  ]),
  app: new Set(["app", "composition", "presentation"]),
};

const importPattern = /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/g;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      paths.push(...(await walk(path)));
    } else if ([".ts", ".tsx"].includes(extname(entry.name))) {
      paths.push(path);
    }
  }

  return paths;
}

function coordinates(file) {
  const parts = relative(ROOT, file).split(sep);

  if (parts[0] === "app") {
    return { layer: "app", owner: parts[1] };
  }

  if (parts[0] !== "src") {
    return {};
  }

  return {
    layer: parts[1],
    owner: parts[2],
  };
}

function importedFile(file, specifier) {
  if (specifier.startsWith("@/")) {
    return resolve(ROOT, specifier.slice(2));
  }

  if (specifier.startsWith(".")) {
    return resolve(dirname(file), specifier);
  }

  return undefined;
}

const files = (
  await Promise.all(
    SOURCE_ROOTS.map(async (root) => {
      try {
        return await walk(root);
      } catch {
        return [];
      }
    }),
  )
).flat();

const violations = [];

for (const file of files) {
  const from = coordinates(file);
  const allowed = from.layer ? layerRules[from.layer] : undefined;

  if (!allowed) {
    continue;
  }

  const source = await readFile(file, "utf8");

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    const target = importedFile(file, specifier);

    if (!target) {
      continue;
    }

    const to = coordinates(target);

    if (to.layer && !allowed.has(to.layer)) {
      violations.push(
        `${relative(ROOT, file)}: ${from.layer} may not import ${to.layer} via ${specifier}`,
      );
      continue;
    }

    // Domain bounded contexts do not coordinate laterally. If two domain
    // owners need one workflow, lift that orchestration into application.
    if (
      from.layer === "domain" &&
      to.layer === "domain" &&
      from.owner &&
      to.owner &&
      from.owner !== to.owner
    ) {
      violations.push(
        `${relative(ROOT, file)}: domain owner ${from.owner} may not import sibling domain owner ${to.owner}; orchestrate above the domain layer`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error("Architecture boundary violations:\n");
  console.error(violations.map((line) => `- ${line}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Architecture boundaries OK (${files.length} source files scanned).`);
}
