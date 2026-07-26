import { describe, expect, it } from "vitest";

import { inferCategorySlug } from "./classification.mjs";

function fixture(overrides = {}) {
  return {
    categorySlug: "reference",
    title: "Course material",
    materialType: "Reference",
    assets: [{ label: "Course material", fileName: "material.pdf", href: "/files/material.pdf" }],
    ...overrides,
  };
}

describe("catalog classification", () => {
  it("classifies explicit final and midterm exams", () => {
    expect(inferCategorySlug(fixture({ title: "2025 crypto final" }))).toBe("finals");
    expect(inferCategorySlug(fixture({ title: "Solution for Midterm 2025" }))).toBe("midterms");
  });

  it("preserves the sample distinction", () => {
    expect(inferCategorySlug(fixture({ title: "Final sample 01" }))).toBe("final-samples");
    expect(inferCategorySlug(fixture({ title: "期中样卷 01" }))).toBe("midterm-samples");
  });

  it("does not treat review material as an exam", () => {
    expect(
      inferCategorySlug(
        fixture({
          categorySlug: "featured",
          title: "数据结构期末复习提要",
        })
      )
    ).toBe("featured");
  });

  it("corrects a final exam incorrectly stored as a midterm", () => {
    expect(
      inferCategorySlug(
        fixture({
          categorySlug: "midterms",
          title: "2008年数据结构期末试卷",
          assets: [{
            label: "2008年数据结构期末试卷",
            fileName: "2008年数据结构期末试卷.doc",
            href: "/files/course/midterms/2008年数据结构期末试卷.doc",
          }],
        })
      )
    ).toBe("finals");
  });

  it("recognizes archived distributed-systems exam files", () => {
    expect(
      inferCategorySlug(
        fixture({
          placement: {
            section: "track",
            trackSlug: "cs",
            courseSlug: "distributed-systems",
          },
          assets: [
            {
              label: "2024",
              fileName: "2024.pdf",
              href: "/files/tracks/cs/distributed-systems/materials/2024.pdf",
            },
          ],
        })
      )
    ).toBe("sample-exams");
  });
});
