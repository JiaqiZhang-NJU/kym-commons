import { describe, expect, it } from "vitest";

import { getCatalogFacetCounts, searchCatalog, tokenize } from "./search";
import type { MaterialPackage } from "./types";

const packages: MaterialPackage[] = [
  {
    schemaVersion: 1, id: "calculus-notes", title: "微积分复习讲义", summary: "极限与导数", placement: { section: "foundation", courseSlug: "calculus-i" }, categorySlug: "review", materialType: "复习资料", term: { label: "2024 春", sortKey: null }, tags: ["期末", "微积分"], aliases: ["calculus"], assets: [{ id: "a", label: "讲义", role: "primary", href: "/a.pdf", fileName: "a.pdf", mediaType: "application/pdf", sizeBytes: 1, sha256: "a" }], source: { kind: "repository" }, publishedAt: null, updatedAt: null, legacyIds: [],
  },
  {
    schemaVersion: 1, id: "physics-exam", title: "大学物理样卷", summary: "力学样题", placement: { section: "foundation", courseSlug: "university-physics-i" }, categorySlug: "sample-exams", materialType: "样卷", term: { label: "2024 春", sortKey: null }, tags: ["期末"], aliases: [], assets: [{ id: "b", label: "物理试卷", role: "question", href: "/b.pdf", fileName: "b.pdf", mediaType: "application/pdf", sizeBytes: 1, sha256: "b" }], source: { kind: "repository" }, publishedAt: null, updatedAt: null, legacyIds: [],
  },
];

describe("catalog search", () => {
  it("segments Chinese query text and prioritizes title matches", () => {
    expect(tokenize("微积分 复习")).toContain("微积分");
    expect(searchCatalog(packages, { q: "微积分" }).map((item) => item.id)).toEqual(["calculus-notes"]);
  });

  it("uses AND across tags and calculates self-excluding facet counts", () => {
    expect(searchCatalog(packages, { tags: ["期末", "微积分"] }).map((item) => item.id)).toEqual(["calculus-notes"]);
    expect(getCatalogFacetCounts(packages, { q: "", section: "all", course: "", category: "", term: "", tags: ["微积分"] }, "tags").get("期末")).toBe(2);
  });
});
