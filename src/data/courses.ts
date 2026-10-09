import { runtimeCatalog } from "../catalog/runtime";

export type LegacyCourse = {
  slug: string;
  title: string;
  isGeneral: boolean;
};

/** Compatibility view of the external catalog; course data has one authority. */
export const FOUNDATION_COURSES: LegacyCourse[] = runtimeCatalog.courses
  .filter((course) => course.section === "foundation")
  .map((course) => ({ slug: course.slug, title: course.title, isGeneral: course.isGeneralResources }));

export const TRACK_COURSES: Record<string, LegacyCourse[]> = Object.fromEntries(
  runtimeCatalog.tracks.map((track) => [
    track.slug,
    runtimeCatalog.courses
      .filter((course) => course.section === "track" && course.trackSlug === track.slug)
      .map((course) => ({ slug: course.slug, title: course.title, isGeneral: course.isGeneralResources })),
  ])
);
