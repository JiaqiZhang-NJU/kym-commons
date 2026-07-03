import { GENERAL_RESOURCES_SLUG } from "../lib/materials";

export const FOUNDATION_COURSES = [
  { slug: "math-analysis", title: "数学分析" },
  { slug: "advanced-algebra", title: "高等代数" },
  { slug: "general-physics", title: "普通物理" },
  { slug: "programming-fundamentals", title: "程序设计基础" },
];

export const TRACK_COURSES = {
  math: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
  biochem: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
  cs: [
    { slug: "data-structures", title: "数据结构", isGeneral: false },
    { slug: "machine-learning", title: "机器学习", isGeneral: false },
    { slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true },
  ],
  physics: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
  astronomy: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
  other: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
} as const;
