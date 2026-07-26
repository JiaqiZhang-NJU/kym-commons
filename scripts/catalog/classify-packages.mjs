import fs from "node:fs";
import path from "node:path";

import { loadCatalog } from "./catalog.mjs";
import { inferCategorySlug } from "./classification.mjs";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");
const catalog = loadCatalog({ root });
const changes = catalog.packages
  .map((materialPackage) => ({
    materialPackage,
    inferredCategorySlug: inferCategorySlug(materialPackage),
  }))
  .filter(({ materialPackage, inferredCategorySlug }) => materialPackage.categorySlug !== inferredCategorySlug);

if (checkOnly && changes.length > 0) {
  for (const { materialPackage, inferredCategorySlug } of changes) {
    console.error(
      `${materialPackage.id}: ${materialPackage.categorySlug} -> ${inferredCategorySlug}`
    );
  }
  console.error(`Catalog contains ${changes.length} package classification mismatch(es).`);
  process.exitCode = 1;
} else if (checkOnly) {
  console.log("Catalog package classifications are current.");
} else {
  for (const { materialPackage, inferredCategorySlug } of changes) {
    const { __filePath, ...authoredPackage } = materialPackage;
    authoredPackage.categorySlug = inferredCategorySlug;
    fs.writeFileSync(__filePath, `${JSON.stringify(authoredPackage, null, 2)}\n`, "utf8");
    console.log(
      `${path.relative(root, __filePath)}: ${materialPackage.categorySlug} -> ${inferredCategorySlug}`
    );
  }
  console.log(`Updated ${changes.length} package classification(s).`);
}
