import { GENERAL_RESOURCES_SLUG } from "../lib/materials";

export const FOUNDATION_COURSES = [
  { slug: "calculus-i", title: "微积分一" },
  { slug: "calculus-ii", title: "微积分二" },
  { slug: "university-physics-i", title: "大学物理上" },
  { slug: "university-physics-ii", title: "大学物理下" },
  { slug: "linear-algebra", title: "线性代数" },
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
