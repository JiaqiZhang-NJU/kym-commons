import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import { useMemo, useState } from "react";

import { getPackagesForCourse } from "../catalog/runtime";
import type { CatalogCourse, MaterialPackage } from "../catalog/types";
import { useMaterialFavorites } from "../hooks/useMaterialFavorites";
import { getVisibleGroupItems, groupMaterialsByCategory } from "../lib/materials";
import MaterialPackageCard from "./MaterialPackageCard";
import styles from "../pages/materials.module.css";

const GROUP_PREVIEW_LIMIT = 6;

type Props = {
  course: CatalogCourse;
};

export default function CatalogCoursePage({ course }: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const { favoriteIds, toggleFavorite } = useMaterialFavorites();
  const packages = useMemo(
    () =>
      getPackagesForCourse({
        section: course.section,
        courseSlug: course.slug,
        ...(course.section === "track" ? { trackSlug: course.trackSlug } : {}),
      }),
    [course]
  );
  const grouped = useMemo(
    () => groupMaterialsByCategory(packages.map(toCategorizedPackage)),
    [packages]
  );
  const breadcrumbs =
    course.section === "foundation"
      ? [{ label: "Foundation", href: "/foundation" }, { label: course.title }]
      : [
          { label: "Tracks", href: "/tracks" },
          { label: course.trackSlug ?? "Track", href: `/tracks/${course.trackSlug}` },
          { label: course.title },
        ];

  return (
    <Layout title={course.title} description={course.description}>
      <main className="container margin-vert--lg">
        <nav className={styles.breadcrumbs} aria-label="当前位置">
          <ol className={styles.breadcrumbList}>
            {breadcrumbs.map((item) => (
              <li className={styles.breadcrumbItem} key={item.label}>
                {item.href ? <Link to={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        <p className={styles.pageSummary}>共收录 {packages.length} 个资料包</p>

        {grouped.length ? (
          grouped.map((group) => {
            const expanded = expandedGroups[group.category] ?? false;
            const { visibleItems, hiddenCount } = getVisibleGroupItems(group.items, GROUP_PREVIEW_LIMIT, expanded);

            return (
              <section className="margin-top--xl" key={group.category}>
                <h2>{group.category}</h2>
                <div className="margin-top--md">
                  {visibleItems.map((materialPackage) => (
                    <MaterialPackageCard
                      key={materialPackage.id}
                      materialPackage={materialPackage}
                      isFavorite={favoriteIds.has(materialPackage.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
                {hiddenCount ? (
                  <button
                    className="button button--secondary button--sm margin-top--sm"
                    type="button"
                    onClick={() => setExpandedGroups((current) => ({ ...current, [group.category]: !expanded }))}
                  >
                    {expanded ? "收起" : `查看更多（还有 ${hiddenCount} 个）`}
                  </button>
                ) : null}
              </section>
            );
          })
        ) : (
          <section className={`${styles.stateCard} margin-top--lg`}>
            <h2>该课程暂时没有资料包</h2>
            <p>欢迎通过统一投稿流程补充讲义、试卷或复习资料。</p>
            <Link className="button button--primary" to="/submit">
              投稿资料
            </Link>
          </section>
        )}
      </main>
    </Layout>
  );
}

function toCategorizedPackage(materialPackage: MaterialPackage) {
  return {
    ...materialPackage,
    category: materialPackage.categorySlug,
    categoryOrder: 0,
  };
}
