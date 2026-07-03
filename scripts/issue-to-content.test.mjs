import { describe, expect, it } from "vitest";

import { parseIssueBody, resolveOutputPath } from "./issue-to-content.mjs";

describe("resolveOutputPath", () => {
  it("routes track general resources correctly", () => {
    expect(
      resolveOutputPath({
        section: "track",
        trackSlug: "cs",
        courseSlug: "general-resources",
        slug: "ml-guide",
      })
    ).toBe("docs/tracks/cs/general-resources/ml-guide.md");
  });
});

describe("parseIssueBody", () => {
  it("extracts course and track fields", () => {
    const issueBody = [
      "## 基本信息",
      "- 归属：方向非课程资料",
      "- 方向：计算机",
      "- 课程：General Resources",
      "- 类型：科研入门",
      "- 标题：机器学习入门资源整理",
      "- 学期：2026 Spring",
    ].join("\n");

    expect(parseIssueBody(issueBody)).toMatchObject({
      trackLabel: "计算机",
      courseTitle: "General Resources",
      materialType: "科研入门",
      title: "机器学习入门资源整理",
    });
  });
});
