import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

import { getFileSha256 } from "./catalog.mjs";
import { inferCategorySlug } from "./classification.mjs";

const root = process.cwd();
const packagesRoot = path.join(root, "content", "packages");
const force = process.argv.includes("--force");
const nodeRequire = createRequire(import.meta.url);

const categoryDefinitions = [
  ["review", "复习资料", "review"],
  ["course-slides", "课程讲义", "course-slides"],
  ["assignment-solutions", "作业答案", "assignment-solutions"],
  ["quizzes", "随堂测验", "quizzes"],
  ["midterm-samples", "期中样卷", "midterms"],
  ["final-samples", "期末样卷", "finals"],
  ["topic-notes", "专题讲义", "topic-notes"],
  ["featured", "精选资料", "materials"],
  ["reference", "参考资料", "materials"],
  ["midterms", "期中试卷", "midterms"],
  ["finals", "期末试卷", "finals"],
  ["sample-exams", "样卷", "sample-exams"],
];
const categoryByLabel = new Map(categoryDefinitions.map(([slug, label, storageDirectory], order) => [label, { slug, label, storageDirectory, aliases: [], order: order + 1 }]));
const courseOverrides = {
  "track:cs:data-structures": {
    title: "数据结构",
    description: "数据结构课程资料",
  },
};

function compileModule(filePath) {
  return ts.transpileModule(fs.readFileSync(filePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

function evaluateModule(filePath, customRequire = nodeRequire) {
  const module = { exports: {} };
  vm.runInNewContext(compileModule(filePath), {
    module,
    exports: module.exports,
    require: customRequire,
    URL,
  });
  return module.exports;
}

function loadLegacyData() {
  const backfill = evaluateModule(path.join(root, "src", "data", "materialsBackfill.ts"));
  const materials = evaluateModule(path.join(root, "src", "data", "materials.ts"), (id) => {
    if (id === "./materialsBackfill") return backfill;
    return nodeRequire(id);
  });
  const courses = evaluateModule(path.join(root, "src", "data", "courses.ts"), (id) => {
    if (id === "../lib/materials") return { GENERAL_RESOURCES_SLUG: "general-resources" };
    return nodeRequire(id);
  });
  const site = evaluateModule(path.join(root, "src", "data", "site.ts"));
  return { materials: materials.SAMPLE_MATERIALS, courses, tracks: site.TRACKS };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function getMediaType(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  return (
    {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".zip": "application/zip",
      ".rar": "application/vnd.rar",
      ".txt": "text/plain",
      ".md": "text/markdown",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".mp3": "audio/mpeg",
    }[extension] ?? null
  );
}

function getTermSortKey(term) {
  const matched = term.match(/(\d{4})(?:[-年 ]?(\d{4}))?(?:[^\d]*(春|秋|Spring|Fall))?/i);
  if (!matched) return null;
  const season = matched[3]?.toLowerCase();
  const seasonValue = season === "春" || season === "spring" ? "1" : season === "秋" || season === "fall" ? "2" : "0";
  return `${matched[1]}-${matched[2] ?? matched[1]}-${seasonValue}`;
}

function getPackageId(record, seenIds, legacyIds) {
  const count = (seenIds.get(record.id) ?? 0) + 1;
  seenIds.set(record.id, count);
  if (count === 1) {
    legacyIds.add(record.id);
    return { id: record.id, legacyIds: [record.id] };
  }
  return { id: `${record.id}-${count}`, legacyIds: [] };
}

function getPackagePath(record, packageId) {
  if (record.section === "foundation") {
    return path.join(packagesRoot, "foundation", record.courseSlug, `${packageId}.json`);
  }
  return path.join(packagesRoot, "tracks", record.trackSlug, record.courseSlug, `${packageId}.json`);
}

function buildTracksAndCourses(legacy) {
  const tracks = legacy.tracks.map((track, index) => ({
    ...track,
    description: `${track.label}方向课程资料`,
    aliases: [],
    order: index + 1,
  }));
  const courses = legacy.courses.FOUNDATION_COURSES.map((course, index) => ({
    ...course,
    aliases: [],
    section: "foundation",
    description: `${course.title}课程资料`,
    order: index + 1,
    isGeneralResources: false,
  }));

  for (const [trackSlug, trackCourses] of Object.entries(legacy.courses.TRACK_COURSES)) {
    for (const [index, course] of trackCourses.entries()) {
      courses.push({
        slug: course.slug,
        title: course.title,
        aliases: [],
        section: "track",
        trackSlug,
        description: course.isGeneral ? `${tracks.find((track) => track.slug === trackSlug)?.label ?? trackSlug}方向通用资料` : `${course.title}课程资料`,
        order: index + 1,
        isGeneralResources: course.isGeneral,
      });
    }
  }

  for (const record of legacy.materials) {
    if (record.section !== "track") continue;
    const key = `track:${record.trackSlug}:${record.courseSlug}`;
    if (!courseOverrides[key] || courses.some((course) => `track:${course.trackSlug}:${course.slug}` === key)) continue;
    const override = courseOverrides[key];
    courses.push({
      slug: record.courseSlug,
      title: override.title,
      aliases: [],
      section: "track",
      trackSlug: record.trackSlug,
      description: override.description,
      order: courses.filter((course) => course.section === "track" && course.trackSlug === record.trackSlug).length + 1,
      isGeneralResources: false,
    });
  }
  return { tracks, courses };
}

function runMigration() {
  if (fs.existsSync(packagesRoot) && fs.readdirSync(packagesRoot).length > 0 && !force) {
    throw new Error("content/packages is not empty; pass --force to regenerate it");
  }
  if (fs.existsSync(packagesRoot)) fs.rmSync(packagesRoot, { recursive: true, force: true });

  const legacy = loadLegacyData();
  const { tracks, courses } = buildTracksAndCourses(legacy);
  writeJson(path.join(root, "content/catalog/tracks.json"), { schemaVersion: 1, items: tracks });
  writeJson(path.join(root, "content/catalog/courses.json"), { schemaVersion: 1, items: courses });
  writeJson(path.join(root, "content/catalog/categories.json"), { schemaVersion: 1, items: [...categoryByLabel.values()] });

  const seenIds = new Map();
  const legacyIds = new Set();
  const missingAssets = [];
  const mergedDuplicateAssets = [];
  const unknownCategories = new Set();
  const repositoryAssetOwners = new Map();
  let writtenPackages = 0;

  for (const record of legacy.materials) {
    const category = categoryByLabel.get(record.category);
    if (!category) {
      unknownCategories.add(record.category);
      continue;
    }

    const id = getPackageId(record, seenIds, legacyIds);
    const repositoryAsset = record.href.startsWith("/files/");
    const decodedHref = repositoryAsset ? decodeURIComponent(record.href) : record.href;
    const absoluteAssetPath = repositoryAsset ? path.join(root, "static", decodedHref) : null;
    if (absoluteAssetPath && !fs.existsSync(absoluteAssetPath)) {
      missingAssets.push({ id: record.id, href: record.href, title: record.title });
      continue;
    }

    if (repositoryAsset && repositoryAssetOwners.has(record.href)) {
      mergedDuplicateAssets.push({
        id: record.id,
        href: record.href,
        title: record.title,
        mergedInto: repositoryAssetOwners.get(record.href),
      });
      continue;
    }

    const fileName = repositoryAsset ? path.basename(decodedHref) : null;
    const stat = absoluteAssetPath ? fs.statSync(absoluteAssetPath) : null;
    const materialPackage = {
      schemaVersion: 1,
      id: id.id,
      title: record.title,
      summary: record.summary,
      placement:
        record.section === "foundation"
          ? { section: "foundation", courseSlug: record.courseSlug }
          : { section: "track", trackSlug: record.trackSlug, courseSlug: record.courseSlug },
      categorySlug: category.slug,
      materialType: record.type,
      term: { label: record.term, sortKey: getTermSortKey(record.term) },
      tags: [],
      aliases: [],
      assets: [
        {
          id: "asset-1",
          label: record.title,
          role: "primary",
          href: record.href,
          fileName,
          mediaType: fileName ? getMediaType(fileName) : null,
          sizeBytes: stat?.size ?? null,
          sha256: absoluteAssetPath ? getFileSha256(absoluteAssetPath) : null,
        },
      ],
      source: repositoryAsset ? { kind: "repository" } : { kind: "external", originalUrl: record.href },
      publishedAt: null,
      updatedAt: null,
      legacyIds: id.legacyIds,
    };
    materialPackage.categorySlug = inferCategorySlug(materialPackage);
    writeJson(getPackagePath(record, id.id), materialPackage);
    if (repositoryAsset) repositoryAssetOwners.set(record.href, id.id);
    writtenPackages += 1;
  }

  writeJson(path.join(root, "content/catalog/migration-report.json"), {
    sourceRecordCount: legacy.materials.length,
    writtenPackageCount: writtenPackages,
    duplicateIdCounts: [...seenIds.entries()].filter(([, count]) => count > 1),
    missingAssets,
    mergedDuplicateAssets,
    unknownCategories: [...unknownCategories],
  });
  console.log(`Migrated ${writtenPackages} packages; skipped ${missingAssets.length} missing assets.`);
}

runMigration();
