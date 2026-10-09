import { describe, expect, it, vi } from "vitest";

vi.mock("../catalog/runtime", () => ({
  runtimeCatalog: {
    tracks: [{ slug: "new-track", label: "新方向" }],
    courses: [{ slug: "general-resources", title: "General Resources", section: "track", trackSlug: "new-track", isGeneralResources: true }],
    categories: [], packages: [],
  },
}));

import { TRACKS } from "./site";
import { TRACK_COURSES } from "./courses";
import { TRACK_LABELS, buildMaterialLocationLabel } from "../lib/materials";
import { resolveCoursePageContext } from "../lib/courseNavigation";

describe("external catalog compatibility adapters", () => {
  it("shows a newly approved track and its labels without a frontend source edit", () => {
    expect(TRACKS).toEqual([{ slug: "new-track", label: "新方向" }]);
    expect(TRACK_LABELS["new-track"]).toBe("新方向");
    expect(TRACK_COURSES["new-track"]).toEqual([{ slug: "general-resources", title: "General Resources", isGeneral: true }]);
    expect(buildMaterialLocationLabel({ section: "track", trackSlug: "new-track", courseTitle: "General Resources" })).toContain("新方向");
    expect(resolveCoursePageContext("?section=track&track=new-track&course=general-resources")).toMatchObject({
      status: "valid", trackSlug: "new-track", title: "General Resources",
      breadcrumbs: [{ label: "Tracks", href: "/tracks" }, { label: "新方向", href: "/tracks/new-track" }, { label: "General Resources" }],
    });
  });
});
