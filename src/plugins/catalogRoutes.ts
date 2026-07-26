import type { LoadContext, Plugin } from "@docusaurus/types";
import fs from "node:fs";
import path from "node:path";

type CatalogCourse = {
  slug: string;
  section: "foundation" | "track";
  trackSlug?: string;
};

type MaterialPackage = {
  id: string;
  legacyIds: string[];
  placement: { section: "foundation"; courseSlug: string } | { section: "track"; trackSlug: string; courseSlug: string };
};

type RuntimeCatalog = {
  courses: CatalogCourse[];
  packages: MaterialPackage[];
};

export default function catalogRoutesPlugin(context: LoadContext): Plugin<void> {
  return {
    name: "kym-catalog-routes",
    async contentLoaded({ actions }) {
      const catalogPath = path.join(context.siteDir, "src", "generated", "catalog.json");
      const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as RuntimeCatalog;
      const { addRoute } = actions;

      for (const course of catalog.courses) {
        const routePath =
          course.section === "foundation"
            ? `/foundation/${course.slug}/`
            : `/tracks/${course.trackSlug}/${course.slug}/`;
        addRoute({
          path: withBaseUrl(context.baseUrl, routePath),
          component: "@site/src/pages/catalog-course-route.tsx",
          exact: true,
        });
      }

      for (const materialPackage of catalog.packages) {
        for (const packageId of new Set([
          materialPackage.id,
          ...materialPackage.legacyIds,
        ])) {
          addRoute({
            path: withBaseUrl(context.baseUrl, `/materials/${packageId}/`),
            component: "@site/src/pages/material-package-route.tsx",
            exact: true,
          });
        }
      }
    },
  };
}

function withBaseUrl(baseUrl: string, routePath: string): string {
  const normalizedBaseUrl = baseUrl === "/" ? "" : baseUrl.replace(/\/$/, "");
  return `${normalizedBaseUrl}${routePath}`;
}
