import { describe, expect, it } from "vitest";
import { SAMPLE_MATERIALS } from "../data/materials";
import type { MaterialRecord } from "../data/materials";
import {
  GENERAL_RESOURCES_SLUG,
  buildBrowseQuery,
  buildCoursePath,
  filterMaterials,
  getBrowseFilterOptions,
  getVisibleGroupItems,
  groupMaterialsByCategory,
  isExternalHref,
  normalizeCourseSlug,
  parseBrowseQuery,
  resolveSubmissionTarget,
} from "./materials";

const browseFixtures: MaterialRecord[] = [
  {
    id: "foundation-slide",
    section: "foundation",
    courseSlug: "university-physics-ii",
    category: "课程讲义",
    categoryOrder: 2,
    title: "第 22 章课件",
    type: "课程讲义",
    term: "大学物理下",
    summary: "大学物理下课程讲义与章节课件。",
    href: "/files/foundation/university-physics-ii/course-slides/chapter22.pdf",
  },
  {
    id: "track-guide",
    section: "track",
    trackSlug: "cs",
    courseSlug: "machine-learning",
    category: "科研入门",
    categoryOrder: 1,
    title: "机器学习入门路线",
    type: "科研入门",
    term: "Sophomore Spring",
    summary: "面向计算机方向学生的机器学习科研入门资料。",
    href: "https://example.com/ml-guide",
  },
];

describe("parseBrowseQuery", () => {
  it("parses valid browse query params", () => {
    expect(parseBrowseQuery("?q=physics&section=foundation&category=课程讲义&term=大学物理下")).toEqual({
      q: "physics",
      section: "foundation",
      category: "课程讲义",
      term: "大学物理下",
    });
  });

  it("falls back to all for invalid section values", () => {
    expect(parseBrowseQuery("?section=unknown")).toEqual({
      q: "",
      section: "all",
      category: "",
      term: "",
    });
  });
});

describe("buildBrowseQuery", () => {
  it("omits empty and default values", () => {
    expect(
      buildBrowseQuery({
        q: "  ",
        section: "all",
        category: "",
        term: "",
      })
    ).toBe("");
  });

  it("builds a stable search string for active filters", () => {
    expect(
      buildBrowseQuery({
        q: "physics",
        section: "foundation",
        category: "课程讲义",
        term: "大学物理下",
      })
    ).toBe(
      "?q=physics&section=foundation&category=%E8%AF%BE%E7%A8%8B%E8%AE%B2%E4%B9%89&term=%E5%A4%A7%E5%AD%A6%E7%89%A9%E7%90%86%E4%B8%8B"
    );
  });
});

describe("getBrowseFilterOptions", () => {
  it("derives deduplicated category and term options", () => {
    expect(getBrowseFilterOptions(browseFixtures)).toEqual({
      categories: ["科研入门", "课程讲义"],
      terms: ["Sophomore Spring", "大学物理下"],
    });
  });
});

describe("filterMaterials", () => {
  it("matches keyword against metadata context", () => {
    expect(
      filterMaterials(browseFixtures, {
        q: "machine",
        section: "all",
        category: "",
        term: "",
      }).map((item) => item.id)
    ).toEqual(["track-guide"]);
  });

  it("applies section category and term filters together", () => {
    expect(
      filterMaterials(browseFixtures, {
        q: "",
        section: "foundation",
        category: "课程讲义",
        term: "大学物理下",
      }).map((item) => item.id)
    ).toEqual(["foundation-slide"]);
  });

  it("returns all materials when all conditions are empty", () => {
    expect(
      filterMaterials(browseFixtures, {
        q: "",
        section: "all",
        category: "",
        term: "",
      }).map((item) => item.id)
    ).toEqual(["foundation-slide", "track-guide"]);
  });
});

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

describe("material classification integrity", () => {
  function getMaterialByTitle(title: string) {
    const material = SAMPLE_MATERIALS.find((item) => item.title === title);
    expect(material).toBeDefined();
    return material!;
  }

  it("keeps operating systems big-class papers under the big-class course", () => {
    const finals = getMaterialByTitle("OS-大班-2026-期末");
    const midterm = getMaterialByTitle("大班2026期中");

    expect(finals.courseSlug).toBe("operating-systems-general");
    expect(finals.href).toContain("/files/tracks/cs/operating-systems-general/");
    expect(midterm.courseSlug).toBe("operating-systems-general");
    expect(midterm.href).toContain("/files/tracks/cs/operating-systems-general/");
    expect(
      SAMPLE_MATERIALS.some(
        (item) =>
          item.courseSlug === "operating-systems-jyy" &&
          ["OS-大班-2024A-A-final-Answer", "OS-大班-2024A-A-final", "OS-大班-2026-期末", "大班2026期中"].includes(
            item.title
          )
      )
    ).toBe(false);
  });

  it("keeps tcs probability papers under probability-tcs", () => {
    const paper2026 = getMaterialByTitle("尹一通概率论2026sp期末");

    expect(paper2026.courseSlug).toBe("probability-tcs");
    expect(paper2026.href).toContain("/files/tracks/cs/probability-tcs/");
    expect(
      SAMPLE_MATERIALS.some(
        (item) =>
          item.courseSlug === "probability-general" &&
          ["尹一通概率论2026sp期末", "概率论与数理统计(2025春)-期末回忆版", "概率论与数理统计-sp2024-期末"].includes(
            item.title
          )
      )
    ).toBe(false);
  });

  it("moves obviously cross-course materials out of problem-solving", () => {
    expect(getMaterialByTitle("人工智能：复杂问题求解的结构和策略").courseSlug).toBe("artificial-intelligence");
    expect(getMaterialByTitle("0图论 知识目录").courseSlug).toBe("graph-theory");
    expect(getMaterialByTitle("图论思维练习").courseSlug).toBe("graph-theory");
    expect(getMaterialByTitle("数据结构 知识目录").courseSlug).toBe("data-structures-and-algorithms");
    expect(getMaterialByTitle("数据结构复习题讲评").courseSlug).toBe("data-structures-and-algorithms");
  });
});
