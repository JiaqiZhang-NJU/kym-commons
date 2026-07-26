import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const assetRoles = new Set(["primary", "supplement", "question", "solution", "source", "dataset", "archive"]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readEnvelope(filePath, label) {
  const parsed = readJson(filePath);

  if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed.items)) {
    throw new Error(`${label} must use schemaVersion 1 and an items array: ${filePath}`);
  }

  return parsed.items;
}

function walkJsonFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walkJsonFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith(".json") ? [entryPath] : [];
  });
}

export function loadCatalog({ root = process.cwd() } = {}) {
  const catalogRoot = path.join(root, "content", "catalog");
  const packageRoot = path.join(root, "content", "packages");
  const packageFiles = walkJsonFiles(packageRoot).sort();

  return {
    tracks: readEnvelope(path.join(catalogRoot, "tracks.json"), "tracks"),
    courses: readEnvelope(path.join(catalogRoot, "courses.json"), "courses"),
    categories: readEnvelope(path.join(catalogRoot, "categories.json"), "categories"),
    packages: packageFiles.map((filePath) => ({ ...readJson(filePath), __filePath: filePath })),
  };
}

function addDuplicateErrors(values, label, errors) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }
}

function isSafeRepositoryHref(href) {
  if (!href.startsWith("/files/") || href.includes("\\")) {
    return false;
  }

  const segments = href.split("/");
  return !segments.some((segment) => segment === "." || segment === "..");
}

function getExpectedPackageDirectory(root, materialPackage) {
  if (materialPackage.placement?.section === "foundation") {
    return path.join(root, "content", "packages", "foundation", materialPackage.placement.courseSlug);
  }

  return path.join(
    root,
    "content",
    "packages",
    "tracks",
    materialPackage.placement?.trackSlug ?? "",
    materialPackage.placement?.courseSlug ?? ""
  );
}

export function validateCatalog(catalog, { root = process.cwd(), requireAssetMetadata = false } = {}) {
  const errors = [];
  const warnings = [];
  const trackSlugs = new Set(catalog.tracks.map((track) => track.slug));
  const categorySlugs = new Set(catalog.categories.map((category) => category.slug));
  const courseKeys = new Set();
  const packageIds = [];
  const legacyIds = [];
  const repositoryHrefs = [];

  for (const track of catalog.tracks) {
    if (!slugPattern.test(track.slug)) errors.push(`invalid track slug: ${track.slug}`);
  }
  addDuplicateErrors(catalog.tracks.map((track) => track.slug), "track slug", errors);
  addDuplicateErrors(catalog.categories.map((category) => category.slug), "category slug", errors);

  for (const course of catalog.courses) {
    const courseKey = `${course.section}:${course.trackSlug ?? ""}:${course.slug}`;
    courseKeys.add(courseKey);
    if (!slugPattern.test(course.slug)) errors.push(`invalid course slug: ${course.slug}`);
    if (course.section === "foundation" && course.trackSlug) errors.push(`foundation course has track: ${course.slug}`);
    if (course.section === "track" && !trackSlugs.has(course.trackSlug)) errors.push(`unknown track for course: ${course.slug}`);
  }
  addDuplicateErrors(catalog.courses.map((course) => `${course.section}:${course.trackSlug ?? ""}:${course.slug}`), "course", errors);

  for (const materialPackage of catalog.packages) {
    const filePath = materialPackage.__filePath;
    packageIds.push(materialPackage.id);
    legacyIds.push(...(materialPackage.legacyIds ?? []));

    if (!slugPattern.test(materialPackage.id ?? "")) errors.push(`invalid package id: ${materialPackage.id}`);
    if (!materialPackage.title?.trim()) errors.push(`missing package title: ${materialPackage.id}`);
    if (!materialPackage.summary?.trim()) errors.push(`missing package summary: ${materialPackage.id}`);
    if (!categorySlugs.has(materialPackage.categorySlug)) errors.push(`unknown category: ${materialPackage.id}`);

    const placement = materialPackage.placement ?? {};
    const courseKey = `${placement.section}:${placement.trackSlug ?? ""}:${placement.courseSlug ?? ""}`;
    if (!courseKeys.has(courseKey)) errors.push(`unknown course placement: ${materialPackage.id}`);

    if (filePath && path.dirname(filePath) !== getExpectedPackageDirectory(root, materialPackage)) {
      errors.push(`package stored in wrong directory: ${materialPackage.id}`);
    }

    if (!Array.isArray(materialPackage.assets) || materialPackage.assets.length === 0) {
      errors.push(`package has no assets: ${materialPackage.id}`);
      continue;
    }

    addDuplicateErrors(materialPackage.assets.map((asset) => asset.id), `asset id in ${materialPackage.id}`, errors);
    for (const asset of materialPackage.assets) {
      if (!assetRoles.has(asset.role)) errors.push(`invalid asset role: ${materialPackage.id}/${asset.id}`);
      if (!asset.label?.trim()) errors.push(`missing asset label: ${materialPackage.id}/${asset.id}`);

      if (asset.href?.startsWith("/files/")) {
        repositoryHrefs.push(asset.href);
        if (!isSafeRepositoryHref(asset.href)) {
          errors.push(`unsafe repository href: ${materialPackage.id}/${asset.id}`);
          continue;
        }

        const absolutePath = path.join(root, "static", decodeURIComponent(asset.href));
        if (!fs.existsSync(absolutePath)) errors.push(`missing repository asset: ${asset.href}`);
        if (requireAssetMetadata && (!Number.isSafeInteger(asset.sizeBytes) || !/^[a-f0-9]{64}$/i.test(asset.sha256 ?? ""))) {
          errors.push(`missing repository asset metadata: ${materialPackage.id}/${asset.id}`);
        }
      } else if (!/^https:\/\//i.test(asset.href ?? "")) {
        errors.push(`unsupported asset href: ${materialPackage.id}/${asset.id}`);
      }
    }

    if (materialPackage.term?.label === "未知") warnings.push(`unknown term: ${materialPackage.id}`);
    if (/^(来源: )?(用户上传补充资料|文件目录补录)$/.test(materialPackage.summary ?? "")) {
      warnings.push(`generic summary: ${materialPackage.id}`);
    }
  }

  addDuplicateErrors(packageIds, "package id", errors);
  addDuplicateErrors(legacyIds, "legacy id", errors);
  addDuplicateErrors(repositoryHrefs, "repository asset href", errors);

  return { errors, warnings };
}

export function getFileSha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
