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
  {
    id: "foundation-university-physics-i-course-slides",
    directory: path.join(
      "content",
      "packages",
      "foundation",
      "university-physics-i"
    ),
    title: "大学物理 I 课程课件",
    summary: "大学物理 I 第 01–14 章连续课程课件。",
    categorySlug: "course-slides",
    materialType: "课程课件",
    tags: ["大学物理 I", "课程课件"],
    role: "supplement",
    matches: (materialPackage) =>
      materialPackage.assets.length === 1 &&
      materialPackage.categorySlug === "course-slides" &&
      /^chapter(?:0[1-9]|1[0-4])\.pdf$/iu.test(
        materialPackage.assets[0].fileName ?? ""
      ),
  },
  {
    id: "foundation-university-physics-ii-course-slides",
    directory: path.join(
      "content",
      "packages",
      "foundation",
      "university-physics-ii"
    ),
    title: "大学物理 II 课程课件",
    summary: "大学物理 II 课程导论及第 15–30 章连续课程课件。",
    categorySlug: "course-slides",
    materialType: "课程课件",
    tags: ["大学物理 II", "课程课件"],
    role: "supplement",
    matches: (materialPackage) =>
      materialPackage.assets.length === 1 &&
      materialPackage.categorySlug === "course-slides" &&
      /^(?:introduction|chapter(?:1[5-9]|2\d|30))\.pdf$/iu.test(
        materialPackage.assets[0].fileName ?? ""
      ),
  },
  {
    id: "tracks-cs-problem-solving-algorithm-design-lectures",
    directory: path.join("content", "packages", "tracks", "cs", "problem-solving"),
    title: "问题求解：算法设计课程讲义",
    summary:
      "算法问题、复杂度、组合计数、分治、概率、排序、数据结构、动态规划、贪心与线性规划等系列讲义。",
    categorySlug: "reference",
    materialType: "系列讲义",
    tags: ["问题求解", "算法设计", "系列讲义"],
    role: "supplement",
    matches: (materialPackage) =>
      materialPackage.assets.length === 1 &&
      /^第\d+讲_.*\.zip$/iu.test(
        materialPackage.assets[0].fileName ?? ""
      ),
  },
  problemSolvingSlideSpecification(
    "graph",
    "问题求解：图论算法课件",
    "图论、最短路、生成树、网络流、匹配、连通性与图上数据结构专题课件。",
    /图|最短路|短路|dijkstra|spfa|生成树|网络流|匈牙利|并查集|拓扑|lca|floyd|差分约束/iu
  ),
  problemSolvingSlideSpecification(
    "dynamic-programming",
    "问题求解：动态规划课件",
    "基础、区间、树形、单调队列优化、状态压缩与滚动数组等动态规划专题课件。",
    /动规|dp|滚动数组|状态压缩|费用提前计算/iu
  ),
  problemSolvingSlideSpecification(
    "search-and-divide",
    "问题求解：搜索、分治与二分课件",
    "深度与广度优先搜索、剪枝、启发式搜索、二分、三分和分治专题课件。",
    /搜索|dfs|bfs|二分|三分|分治/iu
  ),
  problemSolvingSlideSpecification(
    "strings",
    "问题求解：字符串算法课件",
    "Trie、KMP、回文树、字符串表示及哈希等字符串算法专题课件。",
    /trie|kmp|回文树|字符串|最小表示|字符hash/iu
  ),
  problemSolvingSlideSpecification(
    "mathematics",
    "问题求解：数学与组合课件",
    "数论、组合计数、矩阵、同余、筛法及常用数学知识专题课件。",
    /欧几里德|中国剩余|catalan|容斥|欧拉和费马|矩阵乘法|数学|杨辉|质数|bsgs|中位数|多维/iu
  ),
  problemSolvingSlideSpecification(
    "data-structures",
    "问题求解：数据结构与 STL 课件",
    "线段树、树状数组、单调队列、树形结构、STL 与容器使用专题课件。",
    /单调队列|树形结构|树状数组|线段树|stl|vector|差分数组/iu
  ),
  problemSolvingSlideSpecification(
    "general-training",
    "问题求解：综合训练课件",
    "未归入单一算法主题的复习、讲评与综合训练课件。",
    /./u
  ),
];

function problemSolvingSlideSpecification(id, title, summary, pattern) {
  return {
    id: `tracks-cs-problem-solving-slides-${id}`,
    directory: path.join("content", "packages", "tracks", "cs", "problem-solving"),
    title,
    summary,
    categorySlug: "reference",
    materialType: "专题课件",
    tags: ["问题求解", "算法", "专题课件"],
    role: "supplement",
    matches: (materialPackage) =>
      materialPackage.assets.length === 1 &&
      /\.pptx?$/iu.test(materialPackage.assets[0].fileName ?? "") &&
      pattern.test(materialPackage.assets[0].fileName ?? ""),
  };
}

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
