import catalogJson from "../generated/catalog.json";

import type { Catalog, CatalogCourse, MaterialPackage } from "./types";

export const runtimeCatalog = catalogJson as Catalog;
export const catalogPackages = runtimeCatalog.packages;

export function getFoundationCourses(): CatalogCourse[] {
  return runtimeCatalog.courses.filter((course) => course.section === "foundation");
}

export function getTrackCourses(trackSlug: string): CatalogCourse[] {
  return runtimeCatalog.courses.filter(
    (course) => course.section === "track" && course.trackSlug === trackSlug
  );
}

export function getCourse(input: { section: "foundation"; courseSlug: string }): CatalogCourse | undefined;
export function getCourse(input: {
  section: "track";
  trackSlug: string;
  courseSlug: string;
}): CatalogCourse | undefined;
export function getCourse(input: {
  section: "foundation" | "track";
  trackSlug?: string;
  courseSlug: string;
}): CatalogCourse | undefined {
  return runtimeCatalog.courses.find(
    (course) =>
      course.slug === input.courseSlug &&
      course.section === input.section &&
      (input.section === "foundation" || course.trackSlug === ("trackSlug" in input ? input.trackSlug : undefined))
  );
}

export function getPackagesForCourse(input: {
  section: "foundation" | "track";
  courseSlug: string;
  trackSlug?: string;
}): MaterialPackage[] {
  return catalogPackages.filter(
    (materialPackage) =>
      materialPackage.placement.section === input.section &&
      materialPackage.placement.courseSlug === input.courseSlug &&
      (input.section === "foundation" ||
        ("trackSlug" in materialPackage.placement &&
          materialPackage.placement.trackSlug === ("trackSlug" in input ? input.trackSlug : undefined)))
  );
}

export function getPackage(packageId: string): MaterialPackage | undefined {
  return catalogPackages.find(
    (materialPackage) =>
      materialPackage.id === packageId || materialPackage.legacyIds.includes(packageId)
  );
}

export function buildCanonicalCoursePath(input: {
  section: "foundation" | "track";
  courseSlug: string;
  trackSlug?: string;
}): string {
  return input.section === "foundation"
    ? `/foundation/${input.courseSlug}/`
    : `/tracks/${input.trackSlug}/${input.courseSlug}/`;
}

export function buildPackagePath(packageId: string): string {
  return `/materials/${packageId}/`;
}
