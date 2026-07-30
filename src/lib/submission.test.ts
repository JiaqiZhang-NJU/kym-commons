import { describe, expect, it } from "vitest";

import {
  buildIssueBody,
  buildIssueTitle,
  buildIssueUrl,
  getDefaultMaterialType,
  getDefaultSourceMode,
  isCatalogSlug,
  isDetailsStepComplete,
  isScopeStepComplete,
  isTargetStepComplete,
  parseSubmissionPrefill,
} from "./submission";

const validNewTrackCourse = {
  scope: "track-course" as const,
  trackTargetMode: "new" as const,
  existingTrackSlug: "",
  newTrackLabel: "电子信息",
  newTrackSlug: "electronic-information",
  courseTargetMode: "new" as const,
  existingCourseSlug: "",
  newCourseTitle: "数字信号处理",
  newCourseSlug: "digital-signal-processing",
};

describe("submission target validation", () => {
  it("accepts catalog-safe slugs for newly created targets", () => {
    expect(isCatalogSlug("electronic-information")).toBe(true);
    expect(isCatalogSlug("Electronic Information")).toBe(false);
    expect(isCatalogSlug("电子信息")).toBe(false);
  });

  it("accepts a complete new track and new course target", () => {
    expect(isTargetStepComplete(validNewTrackCourse)).toBe(true);
  });

  it("requires complete and safe identifiers for new targets", () => {
    expect(isTargetStepComplete({ ...validNewTrackCourse, newTrackSlug: "电子信息" })).toBe(false);
    expect(isTargetStepComplete({ ...validNewTrackCourse, newCourseTitle: "" })).toBe(false);
  });

  it("allows a new track for General Resources without a new course", () => {
    expect(isTargetStepComplete({
      ...validNewTrackCourse,
      scope: "track-general",
      courseTargetMode: "existing",
      newCourseTitle: "",
      newCourseSlug: "",
    })).toBe(true);
  });

  it("requires an existing course for an existing track course target", () => {
    expect(isTargetStepComplete({
      ...validNewTrackCourse,
      trackTargetMode: "existing",
      existingTrackSlug: "cs",
      newTrackLabel: "",
      newTrackSlug: "",
      courseTargetMode: "existing",
      existingCourseSlug: "",
    })).toBe(false);
  });
});

describe("submission prefill and details validation", () => {
  it("accepts catalog-backed prefilled targets", () => {
    expect(parseSubmissionPrefill("?scope=foundation-course&course=calculus-i")).toEqual({
      scope: "foundation-course", trackSlug: "", courseSlug: "calculus-i",
    });
    expect(parseSubmissionPrefill("?scope=track-course&track=cs&course=machine-learning")).toEqual({
      scope: "track-course", trackSlug: "cs", courseSlug: "machine-learning",
    });
  });

  it("rejects mismatched prefilled targets", () => {
    expect(parseSubmissionPrefill("?scope=track-course&track=math&course=machine-learning")).toBeNull();
    expect(parseSubmissionPrefill("?scope=track-general&track=cs&course=machine-learning")).toBeNull();
  });

  it("requires an external link only in external-link mode", () => {
    const details = { title: "资料", term: "2026 Spring", summary: "说明", sourceMode: "external-link" as const, externalLink: "" };
    expect(isDetailsStepComplete(details)).toBe(false);
    expect(isDetailsStepComplete({ ...details, externalLink: "https://example.com/a.pdf" })).toBe(true);
    expect(isDetailsStepComplete({ ...details, sourceMode: "issue-attachment", externalLink: "" })).toBe(true);
  });

  it("keeps existing defaults", () => {
    expect(isScopeStepComplete("track-general")).toBe(true);
    expect(getDefaultMaterialType("track-general")).toBe("科研入门");
    expect(getDefaultSourceMode()).toBe("issue-attachment");
  });
});

describe("v3 issue generation", () => {
  const payload = {
    scope: "track-course" as const,
    sectionLabel: "宽口径方向课程",
    track: { mode: "new" as const, slug: "electronic-information", label: "电子信息" },
    course: { mode: "new" as const, slug: "digital-signal-processing", title: "数字信号处理" },
    materialType: "课程笔记" as const,
    title: "数字信号处理笔记",
    term: "2026 Spring",
    summary: "课程整理。",
    sourceMode: "issue-attachment" as const,
    externalLink: "",
    anonymous: true,
  };

  it("records explicit new track and course targets", () => {
    const body = buildIssueBody(payload);
    expect(body).toContain("kym-submission:v3");
    expect(body).toContain('"version":3');
    expect(body).toContain("方向：电子信息（新建：electronic-information）");
    expect(body).toContain("课程：数字信号处理（新建：digital-signal-processing）");
  });

  it("uses new track labels in issue titles and issue URLs", () => {
    const title = buildIssueTitle(payload);
    expect(title).toBe("[Submission][电子信息][数字信号处理] 2026 Spring 课程笔记");
    expect(buildIssueUrl({ repoUrl: "https://github.com/JiaqiZhang-NJU/kym-commons", title, body: buildIssueBody(payload) }))
      .toContain("JiaqiZhang-NJU/kym-commons/issues/new");
  });
});
