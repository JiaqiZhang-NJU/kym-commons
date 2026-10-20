type DisplayCourse = { title: string; slug?: string; isGeneralResources?: boolean };

/** Translate the reserved resource bucket only; stored names and URLs stay intact. */
export function courseDisplayTitle(course: DisplayCourse): string {
  return course.isGeneralResources || course.slug === "general-resources" ? "方向通用资料" : course.title;
}
