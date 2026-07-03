export const GENERAL_RESOURCES_SLUG = "general-resources";

export type SectionKey = "foundation" | "track";
export type SubmissionScope = "foundation-course" | "track-course" | "track-general";

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
