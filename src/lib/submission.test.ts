import { describe, expect, it } from "vitest";

import {
  buildIssueBody,
  buildIssueTitle,
  buildIssueUrl,
  getDefaultMaterialType,
  getResolvedCourseTitle,
  isDetailsStepComplete,
  isScopeStepComplete,
  isTargetStepComplete,
} from "./submission";

describe("step completion helpers", () => {
  it("accepts any valid submission scope", () => {
    expect(isScopeStepComplete("track-general")).toBe(true);
  });

  it("requires a track for track-general target selection", () => {
    expect(
      isTargetStepComplete({
        scope: "track-general",
        trackSlug: "",
        useNewCourse: false,
        existingCourseSlug: "",
        newCourseTitle: "",
      })
    ).toBe(false);
  });

  it("requires a new course title when creating a course", () => {
    expect(
      isTargetStepComplete({
        scope: "track-course",
        trackSlug: "cs",
        useNewCourse: true,
        existingCourseSlug: "",
        newCourseTitle: "",
      })
    ).toBe(false);
  });

  it("requires details fields before preview", () => {
    expect(
      isDetailsStepComplete({
        title: "机器学习入门资源整理",
        term: "2026 Spring",
        summary: "",
        link: "https://example.com/ml-guide",
      })
    ).toBe(false);
  });
});

describe("submission defaults", () => {
  it("returns general material types for track-general", () => {
    expect(getDefaultMaterialType("track-general")).toBe("科研入门");
  });

  it("resolves General Resources for track-general submissions", () => {
    expect(
      getResolvedCourseTitle({
        scope: "track-general",
        useNewCourse: false,
        newCourseTitle: "",
        selectedCourseTitle: "数据结构",
      })
    ).toBe("General Resources");
  });
});

describe("buildIssueTitle", () => {
  it("formats track general resource submissions", () => {
    expect(
      buildIssueTitle({
        scope: "track-general",
        trackLabel: "计算机",
        courseTitle: "General Resources",
        term: "2026 Spring",
        materialType: "科研入门",
      })
    ).toBe("[Submission][计算机][General Resources] 2026 Spring 科研入门");
  });
});

describe("buildIssueBody", () => {
  it("includes structured metadata fields", () => {
    const body = buildIssueBody({
      scope: "track-general",
      sectionLabel: "宽口径方向课程",
      trackLabel: "计算机",
      courseTitle: "General Resources",
      materialType: "科研入门",
      title: "机器学习入门资源整理",
      term: "2026 Spring",
      summary: "给方向新人的入门路径。",
      link: "https://example.com/ml-guide",
      anonymous: true,
    });

    expect(body).toContain("- 归属：方向非课程资料");
    expect(body).toContain("- 方向：计算机");
    expect(body).toContain("- 课程：General Resources");
    expect(body).toContain("- 标题：机器学习入门资源整理");
  });
});

describe("buildIssueUrl", () => {
  it("builds new issue URL for the real repository", () => {
    const url = buildIssueUrl({
      repoUrl: "https://github.com/JiaqiZhang-NJU/kym-commons",
      title: "demo",
      body: "body",
    });

    expect(url).toContain("JiaqiZhang-NJU/kym-commons/issues/new");
  });
});
