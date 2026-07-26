import fs from "node:fs";
import path from "node:path";

const relativeDirectory = path.join(
  "content",
  "packages",
  "foundation",
  "data-structures-and-algorithms"
);

function readEntries(root) {
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

function writePackage(filePath, materialPackage) {
  fs.writeFileSync(
    filePath,
    `${JSON.stringify(materialPackage, null, 2)}\n`,
    "utf8"
  );
}

function mergeLegacyIds(entries) {
  const legacyIds = new Set();
  for (const { materialPackage } of entries) {
    legacyIds.add(materialPackage.id);
    for (const legacyId of materialPackage.legacyIds ?? []) {
      legacyIds.add(legacyId);
    }
  }
  return [...legacyIds];
}

function createAggregate({
  root,
  entries,
  id,
  title,
  summary,
  categorySlug,
  materialType,
  tags,
  roleFor,
}) {
  const directory = path.join(root, relativeDirectory);
  const outputPath = path.join(directory, `${id}.json`);
  const existing = entries.find(
    ({ materialPackage }) => materialPackage.id === id
  );
  const sourceEntries = entries.filter(
    ({ materialPackage }) => materialPackage.id !== id
  );
  const template =
    existing?.materialPackage ?? sourceEntries[0]?.materialPackage;
  if (!template) throw new Error(`Missing source material for ${id}`);
  const assetsByHash = new Map();
  for (const asset of [
    ...(existing?.materialPackage.assets ?? []),
    ...sourceEntries.map(({ materialPackage }) => materialPackage.assets[0]),
  ]) {
    assetsByHash.set(asset.sha256 ?? asset.href, asset);
  }
  const assets = [...assetsByHash.values()].map((asset, index) => ({
    ...asset,
    id: `asset-${String(index + 1).padStart(2, "0")}`,
    role: roleFor(asset, index),
  }));
  const materialPackage = {
    ...template,
    id,
    title,
    summary,
    categorySlug,
    materialType,
    term: { label: "未标注", sortKey: null },
    tags,
    assets,
    legacyIds: mergeLegacyIds(
      existing ? [existing, ...sourceEntries] : sourceEntries
    ),
  };
  writePackage(outputPath, materialPackage);
  for (const { filePath } of sourceEntries) {
    if (filePath !== outputPath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

function byFileName(entries, pattern) {
  return entries.filter(({ materialPackage }) =>
    pattern.test(materialPackage.assets[0]?.fileName ?? "")
  );
}

function organizeScanSets({ root, entries, checkOnly }) {
  const sets = [
    {
      id: "foundation-data-structures-exam-scan-set-1",
      pattern: /^数据结构与算法1-[1-7]\.jpg$/u,
      count: 7,
      title: "数据结构与算法试卷扫描件（第 1 组）",
    },
    {
      id: "foundation-data-structures-exam-scan-set-2",
      pattern: /^HP002[5-8]\.jpg$/u,
      count: 4,
      title: "数据结构与算法试卷扫描件（第 2 组）",
    },
  ];
  for (const set of sets) {
    const aggregate = entries.find(
      ({ materialPackage }) => materialPackage.id === set.id
    );
    const sources = byFileName(entries, set.pattern).filter(
      ({ materialPackage }) => materialPackage.id !== set.id
    );
    if (checkOnly) {
      if (!aggregate || sources.length > 0 || aggregate.materialPackage.assets.length !== set.count) {
        throw new Error(`${set.id} is not consolidated`);
      }
      continue;
    }
    createAggregate({
      root,
      entries: aggregate ? [aggregate, ...sources] : sources,
      id: set.id,
      title: set.title,
      summary: `${set.title}，按原始页码顺序集中提供。`,
      categorySlug: "sample-exams",
      materialType: "试卷扫描件",
      tags: ["数据结构与算法", "试卷", "扫描件"],
      roleFor: () => "question",
    });
  }
}

function organizeChapterMaterials({ root, entries, checkOnly }) {
  for (let chapter = 1; chapter <= 10; chapter += 1) {
    const id = `foundation-data-structures-chapter-${String(chapter).padStart(2, "0")}`;
    const aggregate = entries.find(
      ({ materialPackage }) => materialPackage.id === id
    );
    const sourcePattern = new RegExp(
      `^(?:job${chapter}|数据结构第${chapter}章)\\.doc$`,
      "u"
    );
    const sources = byFileName(entries, sourcePattern).filter(
      ({ materialPackage }) => materialPackage.id !== id
    );
    if (checkOnly) {
      if (!aggregate || sources.length > 0 || aggregate.materialPackage.assets.length !== 2) {
        throw new Error(`${id} is not consolidated`);
      }
      continue;
    }
    createAggregate({
      root,
      entries: aggregate ? [aggregate, ...sources] : sources,
      id,
      title: `数据结构第 ${chapter} 章练习与作业`,
      summary: `数据结构第 ${chapter} 章章节资料与配套作业。`,
      categorySlug: "reference",
      materialType: "章节练习",
      tags: ["数据结构与算法", `第 ${chapter} 章`, "章节练习"],
      roleFor: (asset) =>
        /^job/u.test(asset.fileName ?? "") ? "supplement" : "primary",
    });
  }
}

function organizeFinals({ root, entries, checkOnly }) {
  for (const year of [2006, 2007, 2008]) {
    const id = `foundation-data-structures-${year}-final-with-solutions`;
    const aggregate = entries.find(
      ({ materialPackage }) => materialPackage.id === id
    );
    const sources = byFileName(
      entries,
      new RegExp(`^${year}年数据结构期末试卷(?:参考答案)?\\.doc$`, "u")
    ).filter(({ materialPackage }) => materialPackage.id !== id);
    if (checkOnly) {
      if (!aggregate || sources.length > 0 || aggregate.materialPackage.assets.length !== 2) {
        throw new Error(`${id} is not paired`);
      }
      continue;
    }
    createAggregate({
      root,
      entries: aggregate ? [aggregate, ...sources] : sources,
      id,
      title: `${year} 年数据结构期末试卷（含答案）`,
      summary: `${year} 年数据结构期末试卷及参考答案。`,
      categorySlug: "finals",
      materialType: "试卷与解答",
      tags: ["数据结构与算法", `${year}`, "期末考试"],
      roleFor: (asset) =>
        /答案/u.test(asset.fileName ?? "") ? "solution" : "question",
    });
  }
}

function organizeRelatedReferences({ root, entries, checkOnly }) {
  const sets = [
    {
      id: "foundation-data-structures-2011-final-with-solutions",
      pattern: /^2011年数据结构期末试卷及参考答案\.ppt$/u,
      count: 2,
      title: "2011 年数据结构期末试卷（含答案）",
      summary: "2011 年数据结构期末试卷及参考答案的两个馆藏版本。",
      categorySlug: "finals",
      materialType: "试卷与解答",
      tags: ["数据结构与算法", "2011", "期末考试"],
    },
    {
      id: "foundation-data-structures-knowledge-index",
      pattern: /^数据结构 知识目录\.(?:pdf|docx)$/u,
      count: 2,
      title: "数据结构知识目录",
      summary: "数据结构知识目录的 PDF 与 DOCX 版本。",
      categorySlug: "reference",
      materialType: "知识目录",
      tags: ["数据结构与算法", "知识目录"],
    },
  ];
  for (const set of sets) {
    const aggregate = entries.find(
      ({ materialPackage }) => materialPackage.id === set.id
    );
    const sources = byFileName(entries, set.pattern).filter(
      ({ materialPackage }) => materialPackage.id !== set.id
    );
    if (checkOnly) {
      if (
        !aggregate ||
        sources.length > 0 ||
        aggregate.materialPackage.assets.length !== set.count
      ) {
        throw new Error(`${set.id} is not consolidated`);
      }
      continue;
    }
    createAggregate({
      root,
      entries: aggregate ? [aggregate, ...sources] : sources,
      id: set.id,
      title: set.title,
      summary: set.summary,
      categorySlug: set.categorySlug,
      materialType: set.materialType,
      tags: set.tags,
      roleFor: (_asset, index) => (index === 0 ? "primary" : "supplement"),
    });
  }
}

function correctCategories({ entries, checkOnly }) {
  const corrections = [
    {
      title: "排序和查找程序小结",
      categorySlug: "reference",
      materialType: "学习笔记",
    },
    {
      title: "数据结构习题集及答案",
      categorySlug: "assignment-solutions",
      materialType: "习题答案",
    },
  ];
  for (const correction of corrections) {
    const entry = entries.find(
      ({ materialPackage }) => materialPackage.title === correction.title
    );
    if (!entry) throw new Error(`Missing package: ${correction.title}`);
    if (checkOnly) {
      if (
        entry.materialPackage.categorySlug !== correction.categorySlug ||
        entry.materialPackage.materialType !== correction.materialType
      ) {
        throw new Error(`Incorrect classification: ${correction.title}`);
      }
      continue;
    }
    writePackage(entry.filePath, {
      ...entry.materialPackage,
      categorySlug: correction.categorySlug,
      materialType: correction.materialType,
    });
  }
}

export function organizeDataStructures({ root, checkOnly = false }) {
  const entries = readEntries(root);
  organizeScanSets({ root, entries, checkOnly });
  organizeChapterMaterials({ root, entries, checkOnly });
  organizeFinals({ root, entries, checkOnly });
  organizeRelatedReferences({ root, entries, checkOnly });
  correctCategories({ entries, checkOnly });
  if (!checkOnly) {
    console.log("Organized data-structures scans, chapter sets, finals, and classifications.");
  } else {
    console.log("Data-structures collections are organized.");
  }
}

if (process.argv[1]?.endsWith("organize-data-structures.mjs")) {
  organizeDataStructures({
    root: process.cwd(),
    checkOnly: process.argv.includes("--check"),
  });
}
