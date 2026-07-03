export type MaterialRecord = {
  id: string;
  section: "foundation" | "track";
  trackSlug?: string;
  courseSlug: string;
  title: string;
  type: string;
  term: string;
  summary: string;
  href: string;
};

export const SAMPLE_MATERIALS: MaterialRecord[] = [
  {
    id: "foundation-math-analysis-notes",
    section: "foundation",
    courseSlug: "math-analysis",
    title: "数学分析课程笔记整理",
    type: "课程笔记",
    term: "2025 Fall",
    summary: "覆盖极限、连续、微分学的基础笔记与复习提纲。",
    href: "https://example.com/foundation/math-analysis-notes",
  },
  {
    id: "cs-general-ml-guide",
    section: "track",
    trackSlug: "cs",
    courseSlug: "general-resources",
    title: "机器学习入门资源整理",
    type: "科研入门",
    term: "2026 Spring",
    summary: "适合方向入门的课程、教材和工具资源总览。",
    href: "https://example.com/cs/ml-guide",
  },
  {
    id: "cs-data-structures-review",
    section: "track",
    trackSlug: "cs",
    courseSlug: "data-structures",
    title: "数据结构期末复习提要",
    type: "参考资料",
    term: "2025 Fall",
    summary: "包含链表、树、图与复杂度分析的复习框架。",
    href: "https://example.com/cs/data-structures-review",
  },
];
