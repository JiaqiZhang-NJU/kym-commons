import { FOUNDATION_COURSES, TRACK_COURSES } from "../data/courses";
import type { MaterialRecord } from "../data/materials";
import {
  GENERAL_RESOURCES_SLUG,
  TRACK_LABELS,
  buildMaterialCourseFilterValue,
  buildMaterialLocationLabel,
  type BrowseFilterKey,
  type BrowseQuery,
  type SectionKey,
} from "./materials";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type CoursePageContext =
  | {
      status: "valid";
      section: "foundation";
      courseSlug: string;
      title: string;
      description: string;
      breadcrumbs: BreadcrumbItem[];
    }
  | {
      status: "valid";
      section: "track";
      trackSlug: keyof typeof TRACK_COURSES;
      courseSlug: string;
      title: string;
      description: string;
      breadcrumbs: BreadcrumbItem[];
    }
  | {
      status: "invalid";
      title: string;
      description: string;
      breadcrumbs: BreadcrumbItem[];
    };

export type BrowseCourseOption = {
  value: string;
  label: string;
  section: SectionKey;
};

export type ActiveBrowseFilter = {
  key: BrowseFilterKey;
  label: string;
};

function isTrackSlug(value: string | null): value is keyof typeof TRACK_COURSES {
  return value !== null && Object.prototype.hasOwnProperty.call(TRACK_COURSES, value);
}

export function getMaterialCourseTitle(material: MaterialRecord): string {
  if (material.section === "foundation") {
    return FOUNDATION_COURSES.find((item) => item.slug === material.courseSlug)?.title ?? material.courseSlug;
  }

  const trackCourses = material.trackSlug && isTrackSlug(material.trackSlug) ? TRACK_COURSES[material.trackSlug] : [];
  return trackCourses.find((item) => item.slug === material.courseSlug)?.title ?? material.courseSlug;
}

export function getMaterialBrowseSearchContext(material: MaterialRecord): string {
  const courseTitle = getMaterialCourseTitle(material);

  if (material.section === "foundation") {
    return `基础课程 Foundation ${courseTitle}`;
  }

  const trackLabel = material.trackSlug ? TRACK_LABELS[material.trackSlug] ?? material.trackSlug : "";
  return `方向课程 Tracks ${trackLabel} ${courseTitle}`;
}

export function getBrowseCourseOptions(materials: MaterialRecord[]): BrowseCourseOption[] {
  const options = new Map<string, BrowseCourseOption>();

  for (const material of materials) {
    const value = buildMaterialCourseFilterValue(material);

    if (!options.has(value)) {
      options.set(value, {
        value,
        label: buildMaterialLocationLabel({
          section: material.section,
          trackSlug: material.trackSlug,
          courseTitle: getMaterialCourseTitle(material),
        }),
        section: material.section,
      });
    }
  }

  return [...options.values()].sort((left, right) => {
    if (left.section !== right.section) {
      return left.section === "foundation" ? -1 : 1;
    }

    return left.label.localeCompare(right.label, "zh-Hans");
  });
}

export function getActiveBrowseFilters(
  query: BrowseQuery,
  courseOptions: BrowseCourseOption[]
): ActiveBrowseFilter[] {
  const filters: ActiveBrowseFilter[] = [];
  const keyword = query.q.trim();

  if (keyword) {
    filters.push({ key: "q", label: `关键词：${keyword}` });
  }

  if (query.section !== "all") {
    filters.push({
      key: "section",
      label: `归属：${query.section === "foundation" ? "基础课程" : "方向课程"}`,
    });
  }

  if (query.course) {
    const courseLabel = courseOptions.find((option) => option.value === query.course)?.label ?? query.course;
    filters.push({ key: "course", label: `课程：${courseLabel}` });
  }

  if (query.category) {
    filters.push({ key: "category", label: `分类：${query.category}` });
  }

  if (query.term) {
    filters.push({ key: "term", label: `学期：${query.term}` });
  }

  if (query.sort !== "default") {
    filters.push({
      key: "sort",
      label: `排序：${query.sort === "title" ? "按标题" : "按课程"}`,
    });
  }

  return filters;
}

export function resolveCoursePageContext(search: string): CoursePageContext {
  const params = new URLSearchParams(search);
  const section = params.get("section");
  const trackSlug = params.get("track");
  const courseSlug = params.get("course");

  if (section === "foundation" && courseSlug) {
    const course = FOUNDATION_COURSES.find((item) => item.slug === courseSlug);

    if (course) {
      return {
        status: "valid",
        section: "foundation",
        courseSlug,
        title: course.title,
        description: "Foundation 课程资料，按资料类别整理。",
        breadcrumbs: [
          { label: "Foundation", href: "/foundation" },
          { label: course.title },
        ],
      };
    }
  }

  if (section === "track" && isTrackSlug(trackSlug) && courseSlug) {
    const course = TRACK_COURSES[trackSlug].find((item) => item.slug === courseSlug);

    if (course) {
      const trackLabel = TRACK_LABELS[trackSlug] ?? trackSlug;

      return {
        status: "valid",
        section: "track",
        trackSlug,
        courseSlug,
        title: course.title,
        description: `${trackLabel}方向资料，按资料类别整理。`,
        breadcrumbs: [
          { label: "Tracks", href: "/tracks" },
          { label: trackLabel, href: `/tracks/${trackSlug}` },
          { label: course.title },
        ],
      };
    }
  }

  return {
    status: "invalid",
    title: "未找到课程",
    description: "当前链接缺少有效的课程信息，课程可能已调整或链接不完整。",
    breadcrumbs: [{ label: "资料检索", href: "/browse" }, { label: "未找到课程" }],
  };
}

export function getCourseMaterials(materials: MaterialRecord[], context: CoursePageContext): MaterialRecord[] {
  if (context.status !== "valid") {
    return [];
  }

  return materials.filter((material) => {
    if (context.section === "foundation") {
      return material.section === "foundation" && material.courseSlug === context.courseSlug;
    }

    return (
      material.section === "track" &&
      material.trackSlug === context.trackSlug &&
      material.courseSlug === context.courseSlug
    );
  });
}

export function buildCourseSubmissionPath(context: CoursePageContext): string {
  if (context.status !== "valid") {
    return "/submit";
  }

  const params = new URLSearchParams();

  if (context.section === "foundation") {
    params.set("scope", "foundation-course");
    params.set("course", context.courseSlug);
  } else {
    params.set(
      "scope",
      context.courseSlug === GENERAL_RESOURCES_SLUG ? "track-general" : "track-course"
    );
    params.set("track", context.trackSlug);
    params.set("course", context.courseSlug);
  }

  return `/submit?${params.toString()}`;
}
