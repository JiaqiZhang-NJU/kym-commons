import { describe, expect, it } from "vitest";
import { TRACK_COURSES } from "../data/courses";
import { SAMPLE_MATERIALS } from "../data/materials";
import type { MaterialRecord } from "../data/materials";
import {
  GENERAL_RESOURCES_SLUG,
  buildBrowseQuery,
  buildMaterialCourseFilterValue,
  buildCoursePath,
  buildMaterialCoursePath,
  buildMaterialLocationLabel,
  clearBrowseFilter,
  filterMaterials,
  getBrowseFilterOptions,
  getVisibleGroupItems,
  groupMaterialsByCategory,
  isExternalHref,
  normalizeCourseSlug,
  courseFilterMatchesSection,
  paginateItems,
  parseBrowseQuery,
  resolveSubmissionTarget,
  sortMaterials,
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
    expect(
      parseBrowseQuery(
        "?q=physics&section=foundation&course=foundation%3Auniversity-physics-ii&category=课程讲义&term=大学物理下&sort=title&page=3"
      )
    ).toEqual({
      q: "physics",
      section: "foundation",
      course: "foundation:university-physics-ii",
      category: "课程讲义",
      term: "大学物理下",
      sort: "title",
      page: 3,
    });
  });

  it("falls back to all for invalid section values", () => {
    expect(parseBrowseQuery("?section=unknown")).toEqual({
      q: "",
      section: "all",
      course: "",
      category: "",
      term: "",
      sort: "default",
      page: 1,
    });
  });

  it("falls back to the first page for invalid page values", () => {
    expect(parseBrowseQuery("?page=-2").page).toBe(1);
    expect(parseBrowseQuery("?page=abc").page).toBe(1);
  });

  it("ignores malformed or section-incompatible course filters", () => {
    expect(parseBrowseQuery("?course=unknown").course).toBe("");
    expect(parseBrowseQuery("?section=foundation&course=track%3Acs%3Amachine-learning").course).toBe("");
  });

  it("falls back to default for invalid sort values", () => {
    expect(parseBrowseQuery("?sort=unknown").sort).toBe("default");
  });
});

describe("buildBrowseQuery", () => {
  it("omits empty and default values", () => {
    expect(
      buildBrowseQuery({
        q: "  ",
        section: "all",
        course: "",
        category: "",
        term: "",
        sort: "default",
        page: 1,
      })
    ).toBe("");
  });

  it("builds a stable search string for active filters", () => {
    expect(
      buildBrowseQuery({
        q: "physics",
        section: "foundation",
        course: "foundation:university-physics-ii",
        category: "课程讲义",
        term: "大学物理下",
        sort: "course",
        page: 3,
      })
    ).toBe(
      "?q=physics&section=foundation&course=foundation%3Auniversity-physics-ii&category=%E8%AF%BE%E7%A8%8B%E8%AE%B2%E4%B9%89&term=%E5%A4%A7%E5%AD%A6%E7%89%A9%E7%90%86%E4%B8%8B&sort=course&page=3"
    );
  });
});

describe("clearBrowseFilter", () => {
  const activeQuery = {
    q: "机器学习",
    section: "track" as const,
    course: "track:cs:machine-learning",
    category: "参考资料",
    term: "未知",
    sort: "title" as const,
    page: 4,
  };

  it("clears only the requested condition and returns to the first page", () => {
    expect(clearBrowseFilter(activeQuery, "category")).toEqual({
      ...activeQuery,
      category: "",
      page: 1,
    });
    expect(clearBrowseFilter(activeQuery, "section")).toEqual({
      ...activeQuery,
      section: "all",
      page: 1,
    });
    expect(clearBrowseFilter(activeQuery, "sort")).toEqual({
      ...activeQuery,
      sort: "default",
      page: 1,
    });
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
        course: "",
        category: "",
        term: "",
        sort: "default",
        page: 1,
      }).map((item) => item.id)
    ).toEqual(["track-guide"]);
  });

  it("matches multiple keywords across injected course and direction context", () => {
    const contextOnlyMaterial: MaterialRecord = {
      ...browseFixtures[1],
      title: "Lecture 01",
      summary: "课程资料",
    };
    const query = {
      q: "计算机 机器学习",
      section: "all" as const,
      course: "",
      category: "",
      term: "",
      sort: "default" as const,
      page: 1,
    };

    expect(
      filterMaterials([contextOnlyMaterial], query, () => "方向课程 计算机 机器学习").map(
        (item) => item.id
      )
    ).toEqual(["track-guide"]);
    expect(filterMaterials([contextOnlyMaterial], { ...query, q: "计算机 量子" }, () => "计算机 机器学习")).toEqual(
      []
    );
  });

  it("applies section category and term filters together", () => {
    expect(
      filterMaterials(browseFixtures, {
        q: "",
        section: "foundation",
        course: "foundation:university-physics-ii",
        category: "课程讲义",
        term: "大学物理下",
        sort: "default",
        page: 1,
      }).map((item) => item.id)
    ).toEqual(["foundation-slide"]);
  });

  it("distinguishes courses that share the same section and metadata", () => {
    const anotherTrackMaterial: MaterialRecord = {
      ...browseFixtures[1],
      id: "track-ai-guide",
      courseSlug: "artificial-intelligence",
    };

    expect(
      filterMaterials([...browseFixtures, anotherTrackMaterial], {
        q: "",
        section: "track",
        course: "track:cs:machine-learning",
        category: "科研入门",
        term: "Sophomore Spring",
        sort: "default",
        page: 1,
      }).map((item) => item.id)
    ).toEqual(["track-guide"]);
  });

  it("returns all materials when all conditions are empty", () => {
    expect(
      filterMaterials(browseFixtures, {
        q: "",
        section: "all",
        course: "",
        category: "",
        term: "",
        sort: "default",
        page: 1,
      }).map((item) => item.id)
    ).toEqual(["foundation-slide", "track-guide"]);
  });
});

describe("sortMaterials", () => {
  const sortableMaterials: MaterialRecord[] = [
    { ...browseFixtures[1], id: "zeta", title: "第 10 章" },
    { ...browseFixtures[0], id: "alpha", title: "第 2 章" },
    { ...browseFixtures[1], id: "beta", title: "第 2 章" },
  ];

  it("preserves source order by default", () => {
    expect(sortMaterials(sortableMaterials, "default")).toBe(sortableMaterials);
  });

  it("sorts titles naturally and preserves ties", () => {
    expect(sortMaterials(sortableMaterials, "title").map((item) => item.id)).toEqual([
      "alpha",
      "beta",
      "zeta",
    ]);
  });

  it("sorts by resolved course labels", () => {
    expect(
      sortMaterials(sortableMaterials, "course", (material) =>
        material.section === "foundation" ? "A 基础课程" : "B 方向课程"
      ).map((item) => item.id)
    ).toEqual(["alpha", "zeta", "beta"]);
  });
});

describe("course browse filters", () => {
  it("builds unambiguous values for foundation and track courses", () => {
    expect(buildMaterialCourseFilterValue(browseFixtures[0])).toBe("foundation:university-physics-ii");
    expect(buildMaterialCourseFilterValue(browseFixtures[1])).toBe("track:cs:machine-learning");
  });

  it("validates course values against the selected section", () => {
    expect(courseFilterMatchesSection("foundation:calculus-i", "foundation")).toBe(true);
    expect(courseFilterMatchesSection("foundation:calculus-i", "track")).toBe(false);
    expect(courseFilterMatchesSection("track:cs:machine-learning", "track")).toBe(true);
    expect(courseFilterMatchesSection("track:cs:machine-learning", "all")).toBe(true);
    expect(courseFilterMatchesSection("track:machine-learning", "all")).toBe(false);
  });
});

describe("paginateItems", () => {
  const items = Array.from({ length: 53 }, (_, index) => index + 1);

  it("returns only the requested page and its visible range", () => {
    expect(paginateItems(items, 2, 24)).toEqual({
      items: items.slice(24, 48),
      page: 2,
      pageSize: 24,
      totalItems: 53,
      totalPages: 3,
      startItem: 25,
      endItem: 48,
    });
  });

  it("clamps out-of-range pages and handles empty results", () => {
    expect(paginateItems(items, 99, 24).page).toBe(3);
    expect(paginateItems([], 4, 24)).toMatchObject({
      items: [],
      page: 1,
      totalItems: 0,
      totalPages: 1,
      startItem: 0,
      endItem: 0,
    });
  });

  it("rejects invalid page sizes", () => {
    expect(() => paginateItems(items, 1, 0)).toThrow(RangeError);
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

describe("buildMaterialCoursePath", () => {
  it("builds a course page path from a foundation material", () => {
    expect(
      buildMaterialCoursePath({
        id: "foundation",
        section: "foundation",
        courseSlug: "linear-algebra",
        category: "参考资料",
        title: "线性代数教材",
        type: "参考资料",
        term: "未知",
        summary: "教材",
        href: "/files/foundation/linear-algebra/materials/book.pdf",
      })
    ).toBe("/materials?section=foundation&course=linear-algebra");
  });

  it("builds a course page path from a track material", () => {
    expect(
      buildMaterialCoursePath({
        id: "track",
        section: "track",
        trackSlug: "cs",
        courseSlug: "machine-learning",
        category: "参考资料",
        title: "机器学习教材",
        type: "参考资料",
        term: "未知",
        summary: "教材",
        href: "/files/tracks/cs/machine-learning/materials/book.pdf",
      })
    ).toBe("/materials?section=track&track=cs&course=machine-learning");
  });
});

describe("buildMaterialLocationLabel", () => {
  it("formats foundation breadcrumb labels", () => {
    expect(
      buildMaterialLocationLabel({
        section: "foundation",
        courseTitle: "线性代数",
      })
    ).toBe("Foundation / 线性代数");
  });

  it("formats track breadcrumb labels", () => {
    expect(
      buildMaterialLocationLabel({
        section: "track",
        trackSlug: "cs",
        courseTitle: "机器学习",
      })
    ).toBe("Tracks / 计算机 / 机器学习");
  });

  it("formats general resources breadcrumb labels", () => {
    expect(
      buildMaterialLocationLabel({
        section: "track",
        trackSlug: "other",
        courseTitle: "General Resources",
      })
    ).toBe("Tracks / 其他 / General Resources");
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

  it("keeps jyy operating systems papers under operating-systems-jyy", () => {
    const final2024 = getMaterialByTitle("2024期末-jyy");
    const midterm2025 = getMaterialByTitle("jyyos 2025期中");

    expect(final2024.courseSlug).toBe("operating-systems-jyy");
    expect(final2024.href).toContain("/files/tracks/cs/operating-systems-jyy/");
    expect(midterm2025.courseSlug).toBe("operating-systems-jyy");
    expect(midterm2025.href).toContain("/files/tracks/cs/operating-systems-jyy/");
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

  it("keeps big-class probability midterms under probability-general", () => {
    const midterm2024 = getMaterialByTitle("2024秋概率论与数理统计期中试卷");
    const midterm2223 = getMaterialByTitle("22-23概率论与数理统计期中考试");

    expect(midterm2024.courseSlug).toBe("probability-general");
    expect(midterm2024.href).toContain("/files/tracks/cs/probability-general/");
    expect(midterm2223.courseSlug).toBe("probability-general");
    expect(midterm2223.href).toContain("/files/tracks/cs/probability-general/");
  });

  it("moves obviously cross-course materials out of problem-solving", () => {
    expect(getMaterialByTitle("人工智能：复杂问题求解的结构和策略").courseSlug).toBe("artificial-intelligence");
    expect(getMaterialByTitle("0图论 知识目录").courseSlug).toBe("graph-theory");
    expect(getMaterialByTitle("图论思维练习").courseSlug).toBe("graph-theory");
    expect(getMaterialByTitle("数据结构 知识目录").courseSlug).toBe("data-structures-and-algorithms");
    expect(getMaterialByTitle("数据结构复习题讲评").courseSlug).toBe("data-structures-and-algorithms");
  });

  it("places astronomy quantum mechanics papers under the astronomy track", () => {
    expect(TRACK_COURSES.astronomy.some((item) => item.slug === "quantum-mechanics")).toBe(true);

    const astronomyQuantumRetake = getMaterialByTitle("2025-2026天文与空间科学学院量子力学期末复卷");

    expect(astronomyQuantumRetake.trackSlug).toBe("astronomy");
    expect(astronomyQuantumRetake.courseSlug).toBe("quantum-mechanics");
    expect(astronomyQuantumRetake.href).toContain("/files/tracks/astronomy/quantum-mechanics/");
  });

  it("keeps representative common textbooks under the intended targets", () => {
    const pumpkinBook = getMaterialByTitle("pumpkin_book");
    const zhouZhihua = getMaterialByTitle("机器学习_周志华");
    const canterburyTales = getMaterialByTitle("The Canterbury Tales (Penguin Classics)");

    expect(pumpkinBook.trackSlug).toBe("cs");
    expect(pumpkinBook.courseSlug).toBe("general-resources");
    expect(pumpkinBook.href).toContain("/files/tracks/cs/general-resources/");

    expect(zhouZhihua.trackSlug).toBe("cs");
    expect(zhouZhihua.courseSlug).toBe("machine-learning");
    expect(zhouZhihua.href).toContain("/files/tracks/cs/machine-learning/");

    expect(canterburyTales.trackSlug).toBe("other");
    expect(canterburyTales.courseSlug).toBe("general-resources");
    expect(canterburyTales.href).toContain("/files/tracks/other/general-resources/");
  });

  it("backfills missing course materials but keeps auxiliary assets hidden", () => {
    const bigDataTagSystem = getMaterialByTitle("《大数据构建用户标签体系》.pdf");
    const tensorflowGuide = getMaterialByTitle("Tensorflow 实战Google深度学习框架（完整版pdf)[aibbt.com].pdf");

    expect(bigDataTagSystem.trackSlug).toBe("cs");
    expect(bigDataTagSystem.courseSlug).toBe("big-data");
    expect(bigDataTagSystem.href).toContain("/files/tracks/cs/big-data/materials/");

    expect(tensorflowGuide.trackSlug).toBe("cs");
    expect(tensorflowGuide.courseSlug).toBe("artificial-intelligence");
    expect(tensorflowGuide.href).toContain("/files/tracks/cs/artificial-intelligence/materials/");

    expect(
      SAMPLE_MATERIALS.some(
        (item) => item.href === "/files/tracks/cs/computer-architecture/materials/answers.txt"
      )
    ).toBe(false);
  });
});
