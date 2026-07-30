export type ParsedCourseRoute =
  | { section: "foundation"; courseSlug: string }
  | { section: "track"; trackSlug: string; courseSlug: string };

export function parseCourseRoute(pathname: string): ParsedCourseRoute | null {
  const segments = getPathSegments(pathname);
  const foundationIndex = segments.indexOf("foundation");

  if (foundationIndex >= 0 && segments[foundationIndex + 1]) {
    return {
      section: "foundation",
      courseSlug: segments[foundationIndex + 1],
    };
  }

  const tracksIndex = segments.indexOf("tracks");

  if (tracksIndex >= 0 && segments[tracksIndex + 1] && segments[tracksIndex + 2]) {
    return {
      section: "track",
      trackSlug: segments[tracksIndex + 1],
      courseSlug: segments[tracksIndex + 2],
    };
  }

  return null;
}

export function parsePackageRoute(pathname: string): string | null {
  const segments = getPathSegments(pathname);
  const materialsIndex = segments.indexOf("materials");
  return materialsIndex >= 0 ? segments[materialsIndex + 1] ?? null : null;
}

export function parseTrackRoute(pathname: string): string | null {
  const segments = getPathSegments(pathname);
  const tracksIndex = segments.indexOf("tracks");
  return tracksIndex >= 0 && segments.length === tracksIndex + 2 ? segments[tracksIndex + 1] ?? null : null;
}

function getPathSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}
