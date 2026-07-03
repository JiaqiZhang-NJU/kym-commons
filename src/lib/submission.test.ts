import { describe, expect, it } from "vitest";

import { buildIssueBody, buildIssueTitle } from "./submission";

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
