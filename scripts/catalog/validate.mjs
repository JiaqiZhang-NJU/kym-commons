import { loadCatalog, validateCatalog } from "./catalog.mjs";

const catalog = loadCatalog();
const result = validateCatalog(catalog, { requireAssetMetadata: true });

if (process.argv.includes("--verbose")) {
  for (const warning of result.warnings) {
    console.warn(`warning: ${warning}`);
  }
}

if (result.errors.length > 0) {
  for (const error of result.errors) {
    console.error(`error: ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Catalog valid: ${catalog.packages.length} packages, ${result.warnings.length} warnings`);
}
