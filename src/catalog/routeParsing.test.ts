import { describe, expect, it } from "vitest";

import { parseCourseRoute, parsePackageRoute, parseTrackRoute } from "./routeParsing";

describe("catalog route parsing", () => {
  it.each([
    ["/foundation/calculus-i/", { section: "foundation", courseSlug: "calculus-i" }],
    ["/kym-commons/foundation/calculus-i/", { section: "foundation", courseSlug: "calculus-i" }],
    ["/tracks/cs/problem-solving/", { section: "track", trackSlug: "cs", courseSlug: "problem-solving" }],
    ["/kym-commons/tracks/cs/problem-solving/", { section: "track", trackSlug: "cs", courseSlug: "problem-solving" }],
  ])("parses course route %s", (pathname, expected) => {
    expect(parseCourseRoute(pathname)).toEqual(expected);
  });

  it.each([
    ["/materials/package-1/", "package-1"],
    ["/kym-commons/materials/package-1/", "package-1"],
  ])("parses package route %s", (pathname, expected) => {
    expect(parsePackageRoute(pathname)).toBe(expected);
  });

  it.each([
    ["/tracks/cs/", "cs"],
    ["/kym-commons/tracks/cs/", "cs"],
    ["/tracks/cs/machine-learning/", null],
  ])("parses track route %s", (pathname, expected) => {
    expect(parseTrackRoute(pathname)).toBe(expected);
  });
});
