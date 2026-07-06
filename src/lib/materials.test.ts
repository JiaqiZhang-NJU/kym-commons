import { describe, expect, it } from "vitest";
import {
  GENERAL_RESOURCES_SLUG,
  buildCoursePath,
  getVisibleGroupItems,
  groupMaterialsByCategory,
  isExternalHref,
  normalizeCourseSlug,
  resolveSubmissionTarget,
} from "./materials";

describe("normalizeCourseSlug", () => {
  it("normalizes english and chinese mixed names", () => {
    expect(normalizeCourseSlug("Machine Learning 导论")).toBe("machine-learning");
  });
});

describe("buildCoursePath", () => {
  it("builds foundation course paths", () => {
    expect(buildCoursePath({ section: "foundation", courseSlug: "math-analysis" })).toBe(
      "/materials?section=foundation&course=math-analysis"
    );
  });

  it("builds track course paths", () => {
    expect(
      buildCoursePath({ section: "track", trackSlug: "cs", courseSlug: GENERAL_RESOURCES_SLUG })
    ).toBe("/materials?section=track&track=cs&course=general-resources");
  });
});

describe("resolveSubmissionTarget", () => {
  it("maps non-course track submissions to general resources", () => {
    expect(
      resolveSubmissionTarget({
        scope: "track-general",
        trackSlug: "physics",
        courseSlug: null,
      })
    ).toEqual({
      section: "track",
      trackSlug: "physics",
      courseSlug: GENERAL_RESOURCES_SLUG,
    });
  });
});

describe("groupMaterialsByCategory", () => {
  it("groups materials by category and preserves category order", () => {
    const grouped = groupMaterialsByCategory([
      { id: "b", category: "往年卷", categoryOrder: 2 },
      { id: "a", category: "作业答案", categoryOrder: 1 },
      { id: "c", category: "往年卷", categoryOrder: 2 },
    ]);

    expect(grouped).toEqual([
      {
        category: "作业答案",
        categoryOrder: 1,
        items: [{ id: "a", category: "作业答案", categoryOrder: 1 }],
      },
      {
        category: "往年卷",
        categoryOrder: 2,
        items: [
          { id: "b", category: "往年卷", categoryOrder: 2 },
          { id: "c", category: "往年卷", categoryOrder: 2 },
        ],
      },
    ]);
  });
});

describe("isExternalHref", () => {
  it("treats absolute web urls as external", () => {
    expect(isExternalHref("https://example.com/file.pdf")).toBe(true);
  });

  it("treats site-relative file paths as internal", () => {
    expect(isExternalHref("/files/foundation/university-physics-i/review/review-notes-1.pdf")).toBe(false);
  });
});

describe("getVisibleGroupItems", () => {
  const items = [
    { id: "1", title: "A" },
    { id: "2", title: "B" },
    { id: "3", title: "C" },
    { id: "4", title: "D" },
  ];

  it("returns all items when the list is shorter than the limit", () => {
    expect(getVisibleGroupItems(items.slice(0, 2), 3, false)).toEqual({
      visibleItems: items.slice(0, 2),
      hiddenCount: 0,
    });
  });

  it("returns all items when the list length equals the limit", () => {
    expect(getVisibleGroupItems(items.slice(0, 3), 3, false)).toEqual({
      visibleItems: items.slice(0, 3),
      hiddenCount: 0,
    });
  });

  it("returns only the first items and hidden count while collapsed", () => {
    expect(getVisibleGroupItems(items, 3, false)).toEqual({
      visibleItems: items.slice(0, 3),
      hiddenCount: 1,
    });
  });

  it("returns all items while expanded", () => {
    expect(getVisibleGroupItems(items, 3, true)).toEqual({
      visibleItems: items,
      hiddenCount: 0,
    });
  });

  it("returns the correct hidden count for long groups", () => {
    const longerItems = [...items, { id: "5", title: "E" }];

    expect(getVisibleGroupItems(longerItems, 3, false)).toEqual({
      visibleItems: longerItems.slice(0, 3),
      hiddenCount: 2,
    });
  });
});
