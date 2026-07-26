import fs from "node:fs";
import path from "node:path";

import { loadCatalog } from "./catalog.mjs";

function courseKey(materialPackage) {
  const { placement } = materialPackage;
  return placement.section === "foundation"
    ? `foundation/${placement.courseSlug}`
    : `tracks/${placement.trackSlug}/${placement.courseSlug}`;
}

function duplicatePenalty(materialPackage) {
  const asset = materialPackage.assets[0];
  const fileName = asset?.fileName ?? "";
  const href = asset?.href ?? "";
  let penalty = 0;

  if (/\(\d+\)(?=\.[^.]+$)/u.test(fileName)) penalty += 20;
  if (/-\d+(?=\.[^.]+$)/u.test(fileName)) penalty += 15;
  if (/metadata-backfill/u.test(materialPackage.id)) penalty += 5;
  if (!href.includes(`/${materialPackage.categorySlug}/`)) penalty += 3;

  // These duplicate documents identify themselves more precisely as midterms.
  if (
    courseKey(materialPackage) === "foundation/data-structures-and-algorithms" &&
    /2019数据结构期中/u.test(materialPackage.title)
  ) {
    penalty -= 30;
  }

  // Prefer the actual exam record over an accidental reference copy.
  if (
    courseKey(materialPackage) === "tracks/cs/problem-solving" &&
    materialPackage.categorySlug === "finals"
  ) {
    penalty -= 30;
  }

  return penalty;
}

function readPackages(root) {
  return loadCatalog({ root }).packages.map((materialPackage) => ({
    materialPackage,
    filePath: materialPackage.__filePath,
  }));
}

function findDuplicateGroups(packages) {
  const byHash = new Map();

  for (const entry of packages) {
    for (const asset of entry.materialPackage.assets) {
      if (!asset.sha256) continue;
      const key = `${courseKey(entry.materialPackage)}:${asset.sha256}`;
      const group = byHash.get(key) ?? [];
      group.push({ ...entry, asset });
      byHash.set(key, group);
    }
  }

  return [...byHash.values()].filter(
    (group) =>
      new Set(group.map(({ materialPackage }) => materialPackage.id)).size > 1
  );
}

function localAssetPath(root, href) {
  if (!href?.startsWith("/files/")) return null;
  return path.join(root, "static", decodeURIComponent(href).replace(/^\//u, ""));
}

function mergeLegacyIds(primary, duplicates) {
  const legacyIds = new Set([...(primary.legacyIds ?? [])]);
  for (const duplicate of duplicates) {
    legacyIds.add(duplicate.id);
    for (const legacyId of duplicate.legacyIds ?? []) legacyIds.add(legacyId);
  }
  return [...legacyIds];
}

export function deduplicateCatalogAssets({ root, checkOnly = false }) {
  const packages = readPackages(root);
  const duplicateGroups = findDuplicateGroups(packages);
  const emptyEntries = packages.filter(({ materialPackage }) =>
    materialPackage.assets.some((asset) => asset.sizeBytes === 0)
  );

  if (checkOnly) {
    if (duplicateGroups.length > 0 || emptyEntries.length > 0) {
      throw new Error(
        `Catalog contains ${duplicateGroups.length} cross-package duplicate hash group(s) and ${emptyEntries.length} package(s) with empty assets.`
      );
    }
    console.log("Catalog assets are deduplicated and non-empty.");
    return { duplicateGroups: 0, removedPackages: 0, emptyPackages: 0 };
  }

  const removedPackagePaths = new Set();
  const removedAssetPaths = new Set();
  let removedPackages = 0;

  for (const group of duplicateGroups) {
    const entriesByPackage = new Map();
    for (const entry of group) {
      entriesByPackage.set(entry.materialPackage.id, entry);
    }
    const entries = [...entriesByPackage.values()].sort(
      (left, right) =>
        duplicatePenalty(left.materialPackage) -
          duplicatePenalty(right.materialPackage) ||
        left.materialPackage.title.localeCompare(
          right.materialPackage.title,
          "zh-CN",
          { numeric: true }
        )
    );
    const primary = entries[0];
    const duplicates = entries.slice(1);
    const { __filePath, ...authoredPrimary } = primary.materialPackage;
    authoredPrimary.legacyIds = mergeLegacyIds(
      authoredPrimary,
      duplicates.map(({ materialPackage }) => materialPackage)
    );
    fs.writeFileSync(
      primary.filePath,
      `${JSON.stringify(authoredPrimary, null, 2)}\n`,
      "utf8"
    );

    for (const duplicate of duplicates) {
      if (!removedPackagePaths.has(duplicate.filePath)) {
        fs.unlinkSync(duplicate.filePath);
        removedPackagePaths.add(duplicate.filePath);
        removedPackages += 1;
      }
      const duplicatePath = localAssetPath(root, duplicate.asset.href);
      const primaryPath = localAssetPath(root, primary.asset.href);
      if (
        duplicatePath &&
        duplicatePath !== primaryPath &&
        fs.existsSync(duplicatePath)
      ) {
        fs.unlinkSync(duplicatePath);
        removedAssetPaths.add(duplicatePath);
      }
    }
  }

  for (const entry of emptyEntries) {
    if (!removedPackagePaths.has(entry.filePath)) {
      fs.unlinkSync(entry.filePath);
      removedPackagePaths.add(entry.filePath);
      removedPackages += 1;
    }
    for (const asset of entry.materialPackage.assets) {
      const assetPath = localAssetPath(root, asset.href);
      if (assetPath && fs.existsSync(assetPath)) {
        fs.unlinkSync(assetPath);
        removedAssetPaths.add(assetPath);
      }
    }
  }

  console.log(
    `Removed ${removedPackages} duplicate/empty package(s) and ${removedAssetPaths.size} redundant/empty file(s) across ${duplicateGroups.length} duplicate hash group(s).`
  );
  return {
    duplicateGroups: duplicateGroups.length,
    removedPackages,
    emptyPackages: emptyEntries.length,
  };
}

if (process.argv[1]?.endsWith("deduplicate-assets.mjs")) {
  deduplicateCatalogAssets({
    root: process.cwd(),
    checkOnly: process.argv.includes("--check"),
  });
}
