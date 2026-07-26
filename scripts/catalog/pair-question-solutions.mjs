import fs from "node:fs";
import path from "node:path";

const pairingSpecifications = [
  {
    directory: path.join(
      "content",
      "packages",
      "tracks",
      "cs",
      "computer-architecture"
    ),
    key: (materialPackage) => {
      const match = /^disc(\d{2})(?:_sol)?\.pdf$/iu.exec(
        materialPackage.assets[0]?.fileName ?? ""
      );
      return match ? `discussion-${match[1]}` : null;
    },
    isSolution: (materialPackage) =>
      /_sol\.pdf$/iu.test(materialPackage.assets[0]?.fileName ?? ""),
    id: (key) => `tracks-cs-computer-architecture-${key}`,
    title: (key) => `计算机组成讨论题 ${key.slice(-2)}（含解答）`,
    summary: (key) =>
      `计算机组成课程第 ${key.slice(-2)} 组讨论题及配套参考解答。`,
    materialType: "讨论题与解答",
    tags: ["计算机组成", "讨论题", "参考解答"],
  },
  {
    directory: path.join(
      "content",
      "packages",
      "foundation",
      "university-physics-i"
    ),
    key: physicsPairKey,
    isSolution: isPhysicsSolution,
    id: (_key, question) => question.id,
    title: (_key, question) => `${question.title}（含解答）`,
    summary: (_key, question) => `${question.title}及配套参考解答。`,
    materialType: "试卷与解答",
    tags: ["大学物理 I", "试卷", "参考解答"],
  },
  {
    directory: path.join(
      "content",
      "packages",
      "foundation",
      "university-physics-ii"
    ),
    key: physicsPairKey,
    isSolution: isPhysicsSolution,
    id: (_key, question) => question.id,
    title: (_key, question) => `${question.title}（含解答）`,
    summary: (_key, question) => `${question.title}及配套参考解答。`,
    materialType: "试卷与解答",
    tags: ["大学物理 II", "试卷", "参考解答"],
  },
];

function isPhysicsSolution(materialPackage) {
  return /sol\.pdf$/iu.test(materialPackage.assets[0]?.fileName ?? "");
}

function physicsPairKey(materialPackage) {
  const fileName = materialPackage.assets[0]?.fileName ?? "";
  if (
    !/\.pdf$/iu.test(fileName) ||
    !/(?:sample|midterm)/iu.test(fileName) ||
    !["midterm-samples", "final-samples"].includes(
      materialPackage.categorySlug
    )
  ) {
    return null;
  }
  return fileName
    .replace(/\.pdf$/iu, "")
    .replace(/sol$/iu, "")
    .toLowerCase();
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

function findPairs(entries, specification) {
  const groups = new Map();
  for (const entry of entries) {
    if (entry.materialPackage.assets.length !== 1) continue;
    const key = specification.key(entry.materialPackage);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const question = group.find(
        ({ materialPackage }) => !specification.isSolution(materialPackage)
      );
      const solution = group.find(({ materialPackage }) =>
        specification.isSolution(materialPackage)
      );
      return question && solution ? { key, question, solution } : null;
    })
    .filter(Boolean);
}

function mergeLegacyIds(...packages) {
  const legacyIds = new Set();
  for (const materialPackage of packages) {
    legacyIds.add(materialPackage.id);
    for (const legacyId of materialPackage.legacyIds ?? []) {
      legacyIds.add(legacyId);
    }
  }
  return [...legacyIds];
}

function pairSpecification({ root, specification, checkOnly }) {
  const entries = readDirectory(root, specification.directory);
  const pairs = findPairs(entries, specification);

  if (checkOnly) {
    if (pairs.length > 0) {
      throw new Error(
        `${specification.directory}: ${pairs.length} unpaired question/solution set(s)`
      );
    }
    return 0;
  }

  for (const { key, question, solution } of pairs) {
    const questionPackage = question.materialPackage;
    const solutionPackage = solution.materialPackage;
    const id = specification.id(key, questionPackage);
    const outputPath = path.join(
      root,
      specification.directory,
      `${id}.json`
    );
    const materialPackage = {
      ...questionPackage,
      id,
      title: specification.title(key, questionPackage),
      summary: specification.summary(key, questionPackage),
      materialType: specification.materialType,
      tags: specification.tags,
      assets: [
        {
          ...questionPackage.assets[0],
          id: "question",
          role: "question",
          label: "试题",
        },
        {
          ...solutionPackage.assets[0],
          id: "solution",
          role: "solution",
          label: "参考解答",
        },
      ],
      legacyIds: mergeLegacyIds(questionPackage, solutionPackage),
    };
    fs.writeFileSync(
      outputPath,
      `${JSON.stringify(materialPackage, null, 2)}\n`,
      "utf8"
    );
    for (const filePath of [question.filePath, solution.filePath]) {
      if (filePath !== outputPath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  console.log(
    `${specification.directory}: paired ${pairs.length} question/solution set(s).`
  );
  return pairs.length;
}

export function pairQuestionSolutions({ root, checkOnly = false }) {
  return pairingSpecifications.reduce(
    (total, specification) =>
      total + pairSpecification({ root, specification, checkOnly }),
    0
  );
}

if (process.argv[1]?.endsWith("pair-question-solutions.mjs")) {
  pairQuestionSolutions({
    root: process.cwd(),
    checkOnly: process.argv.includes("--check"),
  });
}
