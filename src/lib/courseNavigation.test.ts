import { describe, expect, it } from "vitest";

import type { MaterialRecord } from "../data/materials";
import {
  getBrowseCourseOptions,
  getActiveBrowseFilters,
  getCourseMaterials,
  getMaterialBrowseSearchContext,
  getMaterialCourseTitle,
  resolveCoursePageContext,
} from "./courseNavigation";

const materials: MaterialRecord[] = [
  {
    id: "foundation-calculus",
    section: "foundation",
    courseSlug: "calculus-i",
    category: "参考资料",
    title: "微积分教材",
    type: "参考资料",
    term: "未知",
    summary: "教材",
    href: "/calculus.pdf",
  },
  {
    id: "cs-machine-learning",
    section: "track",
    trackSlug: "cs",
    courseSlug: "machine-learning",
    category: "参考资料",
    title: "机器学习教材",
    type: "参考资料",
    term: "未知",
    summary: "教材",
    href: "/machine-learning.pdf",
  },
];

describe("resolveCoursePageContext", () => {
  it("resolves a foundation course and its navigation path", () => {
    expect(resolveCoursePageContext("?section=foundation&course=calculus-i")).toMatchObject({
      status: "valid",
      section: "foundation",
      courseSlug: "calculus-i",
      title: "微积分一",
      breadcrumbs: [{ label: "Foundation", href: "/foundation" }, { label: "微积分一" }],
    });
  });

  it("resolves a track course and its direction navigation path", () => {
    expect(resolveCoursePageContext("?section=track&track=cs&course=machine-learning")).toMatchObject({
      status: "valid",
      section: "track",
      trackSlug: "cs",
      courseSlug: "machine-learning",
      title: "机器学习",
      breadcrumbs: [
        { label: "Tracks", href: "/tracks" },
        { label: "计算机", href: "/tracks/cs" },
        { label: "机器学习" },
      ],
    });
  });

  it("returns a safe invalid state for incomplete or unknown links", () => {
    expect(resolveCoursePageContext("?section=track&track=unknown&course=machine-learning").status).toBe(
      "invalid"
    );
    expect(resolveCoursePageContext("?section=foundation&course=unknown").status).toBe("invalid");
    expect(resolveCoursePageContext("").status).toBe("invalid");
  });
});

describe("getCourseMaterials", () => {
  it("selects only materials that belong to the resolved course", () => {
    const foundationContext = resolveCoursePageContext("?section=foundation&course=calculus-i");
    const trackContext = resolveCoursePageContext("?section=track&track=cs&course=machine-learning");

    expect(getCourseMaterials(materials, foundationContext).map((item) => item.id)).toEqual([
      "foundation-calculus",
    ]);
    expect(getCourseMaterials(materials, trackContext).map((item) => item.id)).toEqual([
      "cs-machine-learning",
    ]);
  });

  it("does not expose materials for invalid course links", () => {
    expect(getCourseMaterials(materials, resolveCoursePageContext("?course=machine-learning"))).toEqual([]);
  });
});

describe("browse course options", () => {
  it("builds deduplicated, human-readable course choices", () => {
    const options = getBrowseCourseOptions([...materials, materials[1]]);

    expect(options).toEqual([
      {
        value: "foundation:calculus-i",
        label: "Foundation / 微积分一",
        section: "foundation",
      },
      {
        value: "track:cs:machine-learning",
        label: "Tracks / 计算机 / 机器学习",
        section: "track",
      },
    ]);
    expect(getMaterialCourseTitle(materials[1])).toBe("机器学习");
    expect(getMaterialBrowseSearchContext(materials[1])).toBe("方向课程 Tracks 计算机 机器学习");
  });
});

describe("active browse filters", () => {
  it("formats applied conditions with human-readable course labels", () => {
    const courseOptions = getBrowseCourseOptions(materials);

    expect(
      getActiveBrowseFilters(
        {
          q: "机器 学习",
          section: "track",
          course: "track:cs:machine-learning",
          category: "参考资料",
          term: "未知",
          sort: "course",
          page: 2,
        },
        courseOptions
      )
    ).toEqual([
      { key: "q", label: "关键词：机器 学习" },
      { key: "section", label: "归属：方向课程" },
      { key: "course", label: "课程：Tracks / 计算机 / 机器学习" },
      { key: "category", label: "分类：参考资料" },
      { key: "term", label: "学期：未知" },
      { key: "sort", label: "排序：按课程" },
    ]);
  });
});
