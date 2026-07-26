import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadCatalog } from "./catalog.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const outputPath = path.join(repositoryRoot, "src", "generated", "catalog.json");
const checkOnly = process.argv.includes("--check");

function toRuntimeCatalog(catalog) {
  return {
    tracks: catalog.tracks,
    courses: catalog.courses,
    categories: catalog.categories,
    packages: catalog.packages.map(({ __filePath, ...materialPackage }) => materialPackage),
  };
}

const catalog = loadCatalog({ root: repositoryRoot });
const output = `${JSON.stringify(toRuntimeCatalog(catalog), null, 2)}\n`;

if (checkOnly) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";

  if (current !== output) {
    console.error("Generated catalog is stale. Run: npm run catalog:generate");
    process.exitCode = 1;
  } else {
    console.log("Generated catalog is current.");
  }
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(`Generated runtime catalog: ${path.relative(repositoryRoot, outputPath)}`);
}
