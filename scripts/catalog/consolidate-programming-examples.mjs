import fs from "node:fs";
import path from "node:path";

const aggregatePackageId = "88ef3ae3-2633-468d-804b-c054579af7ba";
const courseDirectory = path.join(
  "content",
  "packages",
  "foundation",
  "introduction-to-programming"
);
const sourceExtensions = new Set([".c", ".h", ""]);

export function findProgrammingExamplePackages(root) {
  const absoluteCourseDirectory = path.join(root, courseDirectory);
  const packages = fs
    .readdirSync(absoluteCourseDirectory)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => {
      const filePath = path.join(absoluteCourseDirectory, fileName);
      return {
        filePath,
        materialPackage: JSON.parse(fs.readFileSync(filePath, "utf8")),
      };
    });
  const aggregate = packages.find(
    ({ materialPackage }) => materialPackage.id === aggregatePackageId
  );
  const examples = packages.filter(({ materialPackage }) => {
    if (materialPackage.id === aggregatePackageId || materialPackage.assets.length !== 1) {
      return false;
    }

    const asset = materialPackage.assets[0];
    const extension = path.extname(asset.fileName ?? "").toLowerCase();
    return (
      asset.href.startsWith(
        "/files/foundation/introduction-to-programming/materials/"
      ) && sourceExtensions.has(extension)
    );
  });

  return { aggregate, examples };
}

export function consolidateProgrammingExamples({ root, checkOnly = false }) {
  const { aggregate, examples } = findProgrammingExamplePackages(root);

  if (!aggregate) {
    throw new Error(`Missing aggregate programming example package: ${aggregatePackageId}`);
  }

  if (checkOnly) {
    if (examples.length > 0) {
      throw new Error(
        `Found ${examples.length} standalone programming example package(s). Run: npm run catalog:consolidate`
      );
    }
    console.log("Programming examples are consolidated.");
    return { mergedPackages: 0, assets: aggregate.materialPackage.assets.length };
  }

  if (examples.length === 0) {
    console.log("Programming examples are already consolidated.");
    return { mergedPackages: 0, assets: aggregate.materialPackage.assets.length };
  }

  const sourceAssets = examples
    .map(({ materialPackage }) => materialPackage.assets[0])
    .sort((left, right) =>
      (left.fileName ?? left.label).localeCompare(
        right.fileName ?? right.label,
        "en",
        { numeric: true, sensitivity: "base" }
      )
    )
    .map((asset, index) => ({
      ...asset,
      id: `source-${String(index + 1).padStart(3, "0")}`,
      role: "source",
    }));
  const sourceFileCount = sourceAssets.filter(
    (asset) => path.extname(asset.fileName ?? "").toLowerCase() === ".c"
  ).length;
  const headerFileCount = sourceAssets.filter(
    (asset) => path.extname(asset.fileName ?? "").toLowerCase() === ".h"
  ).length;
  const dataFileCount = sourceAssets.length - sourceFileCount - headerFileCount;
  const legacyIds = new Set(aggregate.materialPackage.legacyIds);

  for (const { materialPackage } of examples) {
    legacyIds.add(materialPackage.id);
    for (const legacyId of materialPackage.legacyIds) legacyIds.add(legacyId);
  }

  const mergedPackage = {
    ...aggregate.materialPackage,
    summary: `C Primer Plus 配套示例代码合集，包含 ${sourceFileCount} 个 C 源文件、${headerFileCount} 个头文件和 ${dataFileCount} 个配套数据文件，并提供原始 ZIP 下载。`,
    materialType: "示例代码",
    tags: ["C", "C Primer Plus", "示例代码"],
    assets: [aggregate.materialPackage.assets[0], ...sourceAssets],
    legacyIds: [...legacyIds],
  };
  fs.writeFileSync(
    aggregate.filePath,
    `${JSON.stringify(mergedPackage, null, 2)}\n`,
    "utf8"
  );

  for (const { filePath } of examples) {
    fs.unlinkSync(filePath);
  }

  console.log(
    `Merged ${examples.length} standalone package(s) into ${aggregatePackageId} with ${mergedPackage.assets.length} assets.`
  );
  return { mergedPackages: examples.length, assets: mergedPackage.assets.length };
}

if (process.argv[1]?.endsWith("consolidate-programming-examples.mjs")) {
  consolidateProgrammingExamples({
    root: process.cwd(),
    checkOnly: process.argv.includes("--check"),
  });
}
