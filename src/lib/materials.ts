export const GENERAL_RESOURCES_SLUG = "general-resources";

export type SectionKey = "foundation" | "track";
export type SubmissionScope = "foundation-course" | "track-course" | "track-general";
export type CategorizedMaterial<T = unknown> = T & {
  category: string;
  categoryOrder?: number;
};

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
