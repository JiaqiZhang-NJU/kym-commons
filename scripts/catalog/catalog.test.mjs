import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadCatalog, validateCatalog } from "./catalog.mjs";

const tempRoots = [];

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kym-catalog-"));
  tempRoots.push(root);
  writeJson(path.join(root, "content/catalog/tracks.json"), {
    schemaVersion: 1,
    items: [{ slug: "cs", label: "计算机", description: "计算机方向", aliases: [], order: 1 }],
  });
  writeJson(path.join(root, "content/catalog/courses.json"), {
    schemaVersion: 1,
    items: [{ slug: "machine-learning", title: "机器学习", aliases: [], section: "track", trackSlug: "cs", description: "机器学习课程", order: 1, isGeneralResources: false }],
  });
  writeJson(path.join(root, "content/catalog/categories.json"), {
    schemaVersion: 1,
    items: [{ slug: "reference", label: "参考资料", storageDirectory: "materials", aliases: [], order: 1 }],
  });
  fs.mkdirSync(path.join(root, "static/files/tracks/cs/machine-learning/materials"), { recursive: true });
  fs.writeFileSync(path.join(root, "static/files/tracks/cs/machine-learning/materials/guide.pdf"), "guide");
  writeJson(path.join(root, "content/packages/tracks/cs/machine-learning/ml-guide.json"), {
    schemaVersion: 1,
    id: "ml-guide",
    title: "机器学习指南",
    summary: "复习要点。",
    placement: { section: "track", trackSlug: "cs", courseSlug: "machine-learning" },
    categorySlug: "reference",
    materialType: "参考资料",
    term: { label: "2026 Spring", sortKey: "2026-1" },
    tags: [],
    aliases: [],
    assets: [{ id: "asset-1", label: "指南", role: "primary", href: "/files/tracks/cs/machine-learning/materials/guide.pdf", fileName: "guide.pdf", mediaType: "application/pdf", sizeBytes: 5, sha256: "a".repeat(64) }],
    source: { kind: "repository" },
    publishedAt: null,
    updatedAt: null,
    legacyIds: [],
  });
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("catalog validation", () => {
  it("loads and validates a catalog fixture", () => {
    const root = createFixture();
    const result = validateCatalog(loadCatalog({ root }), { root, requireAssetMetadata: true });
    expect(result.errors).toEqual([]);
  });

  it("reports duplicate package ids and missing files", () => {
    const root = createFixture();
    const packageFile = path.join(root, "content/packages/tracks/cs/machine-learning/ml-guide.json");
    const record = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    record.assets[0].href = "/files/tracks/cs/machine-learning/materials/missing.pdf";
    writeJson(path.join(root, "content/packages/tracks/cs/machine-learning/ml-guide-copy.json"), record);
    const result = validateCatalog(loadCatalog({ root }), { root, requireAssetMetadata: true });
    expect(result.errors).toContain("duplicate package id: ml-guide");
    expect(result.errors).toContain("missing repository asset: /files/tracks/cs/machine-learning/materials/missing.pdf");
  });
});
