import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import { useMemo, useState } from "react";

import { getPackagesForCourse, getTrack } from "../catalog/runtime";
import type { CatalogCourse, MaterialPackage } from "../catalog/types";
import { useMaterialFavorites } from "../hooks/useMaterialFavorites";
import { getVisibleGroupItems, groupMaterialsByCategory } from "../lib/materials";
import { courseDisplayTitle } from "../lib/display";
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
      ? [{ label: "基础课程", href: "/foundation" }, { label: courseDisplayTitle(course) }]
      : [
          { label: "各方向资料", href: "/tracks" },
          { label: getTrack(course.trackSlug ?? "")?.label ?? "方向", href: `/tracks/${course.trackSlug}` },
          { label: courseDisplayTitle(course) },
        ];

  return (
    <Layout title={courseDisplayTitle(course)} description={course.description}>
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
        <header className="kym-page-heading"><div><h1>{courseDisplayTitle(course)}</h1><p>{course.isGeneralResources ? "这个方向的入门指南、书目和其他学习资源。" : course.description}</p><p className={styles.pageSummary}>共收录 {packages.length} 个资料包</p></div></header>

        {grouped.length ? (
          grouped.map((group) => {
            const expanded = expandedGroups[group.category] ?? false;
            const { visibleItems, hiddenCount } = getVisibleGroupItems(group.items, GROUP_PREVIEW_LIMIT, expanded);

            return (
              <section className="margin-top--xl" key={group.category}>
                <h2>{group.category}</h2>
                <div className="kym-material-list margin-top--md">
                  {visibleItems.map((materialPackage) => (
                    <MaterialPackageCard
                      key={materialPackage.id}
                      materialPackage={materialPackage}
                      isFavorite={favoriteIds.has(materialPackage.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
                {group.items.length > GROUP_PREVIEW_LIMIT ? (
                  <button
                    className="button button--secondary button--sm margin-top--sm"
                    type="button"
                    aria-expanded={expanded}
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
            <p>有这门课的讲义、试卷或复习资料？欢迎分享。</p>
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
