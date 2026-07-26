import fs from "node:fs";
import path from "node:path";

const specifications = [
  {
    id: "tracks-cs-problem-solving-algorithm-code-examples",
    directory: path.join("content", "packages", "tracks", "cs", "problem-solving"),
    title: "问题求解算法示例代码",
    summary:
      "问题求解课程配套的 C++ 算法实现与练习题代码，统一收录高精度运算、搜索及编号练习程序。",
    categorySlug: "reference",
    materialType: "示例代码",
    tags: ["C++", "算法", "示例代码"],
    role: "source",
    matches: (materialPackage) =>
      materialPackage.assets.length === 1 &&
      path.extname(materialPackage.assets[0].fileName ?? "").toLowerCase() ===
        ".cpp",
  },
  {
    id: "tracks-cs-distributed-systems-assignment-solutions",
    directory: path.join(
      "content",
      "packages",
      "tracks",
      "cs",
      "distributed-systems"
    ),
    title: "分布式系统作业解答图集",
    summary:
      "分布式系统课程作业解答与订正图集，按原始编号顺序集中提供。",
    categorySlug: "assignment-solutions",
    materialType: "作业答案",
    tags: ["分布式系统", "作业答案", "图集"],
    role: "solution",
    matches: (materialPackage) =>
      materialPackage.assets.length === 1 &&
      materialPackage.assets[0].href.includes(
        "/tracks/cs/distributed-systems/assignments/"
      ) &&
      /\.(?:jpe?g|png)$/iu.test(materialPackage.assets[0].fileName ?? ""),
  },
  {
    id: "tracks-physics-electronic-circuit-foundation-course-slides",
    directory: path.join(
      "content",
      "packages",
      "tracks",
      "physics",
      "electronic-circuit-foundation"
    ),
    title: "电子电路基础课程课件",
    summary:
      "电子电路基础 00–21 讲连续课件合集，包含数字电路、模拟电路、放大器、反馈与电源等主题，并保留部分 PPTX/PDF 版本。",
    categorySlug: "reference",
    materialType: "课程课件",
    tags: ["电子电路基础", "课程课件", "PPT"],
    role: "supplement",
    matches: (materialPackage) =>
      materialPackage.assets.length === 1 &&
      (materialPackage.assets[0].fileName ?? "").startsWith("电子电路基础"),
  },
];

function readDirectory(root, relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  return fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => {
      const filePath = path.join(directory, fileName);
      return {
        filePath,
        materialPackage: JSON.parse(fs.readFileSync(filePath, "utf8")),
      };
    });
}

function sortAssets(assets) {
  return [...assets].sort((left, right) =>
    (left.fileName ?? left.label).localeCompare(
      right.fileName ?? right.label,
      "zh-CN",
      { numeric: true, sensitivity: "base" }
    )
  );
}

function consolidateSpecification({ root, specification, checkOnly }) {
  const entries = readDirectory(root, specification.directory);
  const aggregate = entries.find(
    ({ materialPackage }) => materialPackage.id === specification.id
  );
  const candidates = entries.filter(
    ({ materialPackage }) =>
      materialPackage.id !== specification.id &&
      specification.matches(materialPackage)
  );

  if (checkOnly) {
    if (!aggregate || candidates.length > 0) {
      throw new Error(
        `${specification.id}: aggregate=${Boolean(aggregate)}, standalone=${candidates.length}`
      );
    }
    return {
      id: specification.id,
      assets: aggregate.materialPackage.assets.length,
    };
  }

  if (candidates.length === 0 && aggregate) {
    const normalizedPackage = {
      ...aggregate.materialPackage,
      title: specification.title,
      summary: specification.summary,
      categorySlug: specification.categorySlug,
      materialType: specification.materialType,
      tags: specification.tags,
      assets: aggregate.materialPackage.assets.map((asset) => ({
        ...asset,
        role: specification.role,
      })),
    };
    fs.writeFileSync(
      aggregate.filePath,
      `${JSON.stringify(normalizedPackage, null, 2)}\n`,
      "utf8"
    );
    return {
      id: specification.id,
      assets: normalizedPackage.assets.length,
    };
  }
  if (candidates.length === 0) {
    throw new Error(`No source packages found for ${specification.id}`);
  }

  const template = candidates[0].materialPackage;
  const previousAssets = aggregate?.materialPackage.assets ?? [];
  const sourceAssets = candidates.flatMap(
    ({ materialPackage }) => materialPackage.assets
  );
  const assetsByHash = new Map();
  for (const asset of [...previousAssets, ...sourceAssets]) {
    assetsByHash.set(asset.sha256 ?? asset.href, asset);
  }
  const assets = sortAssets([...assetsByHash.values()]).map((asset, index) => ({
    ...asset,
    id: `asset-${String(index + 1).padStart(3, "0")}`,
    role: specification.role,
  }));
  const legacyIds = new Set(aggregate?.materialPackage.legacyIds ?? []);
  for (const { materialPackage } of candidates) {
    legacyIds.add(materialPackage.id);
    for (const legacyId of materialPackage.legacyIds ?? []) {
      legacyIds.add(legacyId);
    }
  }

  const materialPackage = {
    schemaVersion: 1,
    id: specification.id,
    title: specification.title,
    summary: specification.summary,
    placement: template.placement,
    categorySlug: specification.categorySlug,
    materialType: specification.materialType,
    term: { label: "未标注", sortKey: null },
    tags: specification.tags,
    aliases: aggregate?.materialPackage.aliases ?? [],
    assets,
    source: template.source,
    publishedAt: aggregate?.materialPackage.publishedAt ?? null,
    updatedAt: aggregate?.materialPackage.updatedAt ?? null,
    legacyIds: [...legacyIds],
  };
  const outputPath =
    aggregate?.filePath ??
    path.join(root, specification.directory, `${specification.id}.json`);
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(materialPackage, null, 2)}\n`,
    "utf8"
  );
  for (const { filePath } of candidates) fs.unlinkSync(filePath);

  console.log(
    `${specification.id}: merged ${candidates.length} package(s) into ${assets.length} assets.`
  );
  return { id: specification.id, assets: assets.length };
}

export function consolidateRelatedMaterials({ root, checkOnly = false }) {
  return specifications.map((specification) =>
    consolidateSpecification({ root, specification, checkOnly })
  );
}

if (process.argv[1]?.endsWith("consolidate-related-materials.mjs")) {
  consolidateRelatedMaterials({
    root: process.cwd(),
    checkOnly: process.argv.includes("--check"),
  });
}
