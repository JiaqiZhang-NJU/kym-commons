import type { MaterialRecord } from "../data/materials";

export const GENERAL_RESOURCES_SLUG = "general-resources";
export const TRACK_LABELS: Readonly<Record<string, string>> = {
  math: "数学",
  biochem: "生化",
  cs: "计算机",
  physics: "物理",
  astronomy: "天文",
  other: "其他",
} as const;

export type SectionKey = "foundation" | "track";
export type SubmissionScope = "foundation-course" | "track-course" | "track-general";
export type BrowseSectionFilter = SectionKey | "all";
export type BrowseQuery = {
  q: string;
  section: BrowseSectionFilter;
  course: string;
  category: string;
  term: string;
  page: number;
};
export type BrowseFilterKey = Exclude<keyof BrowseQuery, "page">;
export type CategorizedMaterial<T = unknown> = T & {
  category: string;
  categoryOrder?: number;
};

export function parseBrowseQuery(search: string): BrowseQuery {
  const params = new URLSearchParams(search);
  const sectionParam = params.get("section");
  const pageParam = Number.parseInt(params.get("page") ?? "", 10);
  const section = sectionParam === "foundation" || sectionParam === "track" ? sectionParam : "all";
  const courseParam = params.get("course") ?? "";

  return {
    q: params.get("q")?.trim() ?? "",
    section,
    course: courseFilterMatchesSection(courseParam, section) ? courseParam : "",
    category: params.get("category") ?? "",
    term: params.get("term") ?? "",
    page: Number.isSafeInteger(pageParam) && pageParam > 0 ? pageParam : 1,
  };
}

export function buildBrowseQuery(query: BrowseQuery): string {
  const params = new URLSearchParams();
  const trimmedKeyword = query.q.trim();

  if (trimmedKeyword.length > 0) {
    params.set("q", trimmedKeyword);
  }

  if (query.section !== "all") {
    params.set("section", query.section);
  }

  if (query.course.length > 0 && courseFilterMatchesSection(query.course, query.section)) {
    params.set("course", query.course);
  }

  if (query.category.length > 0) {
    params.set("category", query.category);
  }

  if (query.term.length > 0) {
    params.set("term", query.term);
  }

  if (query.page > 1) {
    params.set("page", String(query.page));
  }

  const built = params.toString();
  return built.length > 0 ? `?${built}` : "";
}

export function clearBrowseFilter(query: BrowseQuery, filter: BrowseFilterKey): BrowseQuery {
  const nextQuery = { ...query, page: 1 };

  switch (filter) {
    case "q":
    case "course":
    case "category":
    case "term":
      nextQuery[filter] = "";
      break;
    case "section":
      nextQuery.section = "all";
      break;
  }

  return nextQuery;
}

function normalizeSearchText(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compareBrowseOption(left: string, right: string): number {
  const leftIsAscii = /^[\x00-\x7F]/.test(left);
  const rightIsAscii = /^[\x00-\x7F]/.test(right);

  if (leftIsAscii !== rightIsAscii) {
    return leftIsAscii ? -1 : 1;
  }

  return left.localeCompare(right, "zh-Hans");
}

export function getBrowseFilterOptions(materials: MaterialRecord[]) {
  const categories = [...new Set(materials.map((material) => material.category))]
    .filter((value) => value.length > 0)
    .sort(compareBrowseOption);

  const terms = [...new Set(materials.map((material) => material.term))]
    .filter((value) => value.length > 0)
    .sort(compareBrowseOption);

  return { categories, terms };
}

function getMaterialSearchText(material: MaterialRecord, contextText = ""): string {
  return normalizeSearchText(
    [
      material.title,
      material.summary,
      material.category,
      material.term,
      material.section,
      material.courseSlug,
      material.trackSlug,
      contextText,
    ].join(" ")
  );
}

export function filterMaterials(
  materials: MaterialRecord[],
  query: BrowseQuery,
  getContextText?: (material: MaterialRecord) => string
) {
  const keywords = normalizeSearchText(query.q).split(" ").filter(Boolean);

  return materials.filter((material) => {
    if (query.section !== "all" && material.section !== query.section) {
      return false;
    }

    if (query.course.length > 0 && buildMaterialCourseFilterValue(material) !== query.course) {
      return false;
    }

    if (query.category.length > 0 && material.category !== query.category) {
      return false;
    }

    if (query.term.length > 0 && material.term !== query.term) {
      return false;
    }

    if (keywords.length === 0) {
      return true;
    }

    const searchText = getMaterialSearchText(material, getContextText?.(material));
    return keywords.every((keyword) => searchText.includes(keyword));
  });
}

export function buildMaterialCourseFilterValue(material: MaterialRecord): string {
  if (material.section === "foundation") {
    return `foundation:${material.courseSlug}`;
  }

  return `track:${material.trackSlug ?? ""}:${material.courseSlug}`;
}

export function courseFilterMatchesSection(course: string, section: BrowseSectionFilter): boolean {
  const isFoundationCourse = /^foundation:[^:]+$/.test(course);
  const isTrackCourse = /^track:[^:]+:[^:]+$/.test(course);

  if (section === "foundation") {
    return isFoundationCourse;
  }

  if (section === "track") {
    return isTrackCourse;
  }

  return course.length === 0 || isFoundationCourse || isTrackCourse;
}

export function paginateItems<T>(items: T[], requestedPage: number, pageSize: number) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new RangeError("pageSize must be a positive integer");
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(Number.isSafeInteger(requestedPage) ? requestedPage : 1, 1), totalPages);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);

  return {
    items: items.slice(startIndex, endIndex),
    page,
    pageSize,
    totalItems: items.length,
    totalPages,
    startItem: items.length === 0 ? 0 : startIndex + 1,
    endItem: endIndex,
  };
}

export function isExternalHref(href: string): boolean {
  return /^(?:[a-z]+:)?\/\//i.test(href);
}

export function getVisibleGroupItems<T>(items: T[], limit: number, expanded: boolean) {
  if (expanded || items.length <= limit) {
    return {
      visibleItems: items,
      hiddenCount: 0,
    };
  }

  return {
    visibleItems: items.slice(0, limit),
    hiddenCount: items.length - limit,
  };
}

type BuildCoursePathInput =
  | { section: "foundation"; courseSlug: string }
  | { section: "track"; trackSlug: string; courseSlug: string };

export function normalizeCourseSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/[\u4e00-\u9fff]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function buildCoursePath(input: BuildCoursePathInput): string {
  if (input.section === "foundation") {
    return `/materials?section=foundation&course=${input.courseSlug}`;
  }

  return `/materials?section=track&track=${input.trackSlug}&course=${input.courseSlug}`;
}

export function buildMaterialCoursePath(material: MaterialRecord): string {
  if (material.section === "foundation") {
    return buildCoursePath({ section: "foundation", courseSlug: material.courseSlug });
  }

  return buildCoursePath({
    section: "track",
    trackSlug: material.trackSlug ?? "",
    courseSlug: material.courseSlug,
  });
}

export function buildMaterialLocationLabel(input: {
  section: MaterialRecord["section"];
  trackSlug?: MaterialRecord["trackSlug"];
  courseTitle: string;
}): string {
  if (input.section === "foundation") {
    return `Foundation / ${input.courseTitle}`;
  }

  const trackLabel = input.trackSlug ? TRACK_LABELS[input.trackSlug] ?? input.trackSlug : "未知方向";
  return `Tracks / ${trackLabel} / ${input.courseTitle}`;
}

export function resolveSubmissionTarget(input: {
  scope: SubmissionScope;
  trackSlug: string | null;
  courseSlug: string | null;
}) {
  if (input.scope === "foundation-course") {
    return {
      section: "foundation" as const,
      trackSlug: null,
      courseSlug: input.courseSlug ?? "",
    };
  }

  if (input.scope === "track-general") {
    return {
      section: "track" as const,
      trackSlug: input.trackSlug ?? "",
      courseSlug: GENERAL_RESOURCES_SLUG,
    };
  }

  return {
    section: "track" as const,
    trackSlug: input.trackSlug ?? "",
    courseSlug: input.courseSlug ?? "",
  };
}

export function groupMaterialsByCategory<T extends { category: string; categoryOrder?: number }>(materials: T[]) {
  const groups = new Map<string, { category: string; categoryOrder: number; items: T[] }>();

  for (const material of materials) {
    const existing = groups.get(material.category);

    if (existing) {
      existing.items.push(material);
      existing.categoryOrder = Math.min(existing.categoryOrder, material.categoryOrder ?? Number.MAX_SAFE_INTEGER);
      continue;
    }

    groups.set(material.category, {
      category: material.category,
      categoryOrder: material.categoryOrder ?? Number.MAX_SAFE_INTEGER,
      items: [material],
    });
  }

  return [...groups.values()].sort((left, right) => {
    if (left.categoryOrder !== right.categoryOrder) {
      return left.categoryOrder - right.categoryOrder;
    }

    return left.category.localeCompare(right.category, "zh-Hans");
  });
}
