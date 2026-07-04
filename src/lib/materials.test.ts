import { describe, expect, it } from "vitest";
import {
  GENERAL_RESOURCES_SLUG,
  buildCoursePath,
  groupMaterialsByCategory,
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
