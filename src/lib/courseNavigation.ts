import { FOUNDATION_COURSES, TRACK_COURSES } from "../data/courses";
import type { MaterialRecord } from "../data/materials";
import { TRACK_LABELS } from "./materials";

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

function isTrackSlug(value: string | null): value is keyof typeof TRACK_COURSES {
  return value !== null && Object.prototype.hasOwnProperty.call(TRACK_COURSES, value);
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
