import Layout from "@theme/Layout";
import { useLocation } from "@docusaurus/router";
import Link from "@docusaurus/Link";
import { useMemo, useState } from "react";

import MaterialCard from "../components/MaterialCard";
import { SAMPLE_MATERIALS } from "../data/materials";
import { useMaterialFavorites } from "../hooks/useMaterialFavorites";
import {
  buildCourseSubmissionPath,
  getCourseMaterials,
  resolveCoursePageContext,
} from "../lib/courseNavigation";
import { getVisibleGroupItems, groupMaterialsByCategory } from "../lib/materials";
import styles from "./materials.module.css";

const GROUP_PREVIEW_LIMIT = 3;

export default function MaterialsPage() {
  const { search } = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const { favoriteIds, toggleFavorite } = useMaterialFavorites();
  const context = useMemo(() => resolveCoursePageContext(search), [search]);
  const materials = useMemo(() => getCourseMaterials(SAMPLE_MATERIALS, context), [context]);
  const groupedMaterials = useMemo(() => groupMaterialsByCategory(materials), [materials]);

  function toggleGroup(category: string) {
    setExpandedGroups((current) => ({
      ...current,
      [category]: !current[category],
    }));
  }

  return (
    <Layout title={context.title}>
      <main className="container margin-vert--lg">
        <nav className={styles.breadcrumbs} aria-label="当前位置">
          <ol className={styles.breadcrumbList}>
            {context.breadcrumbs.map((item, index) => (
              <li className={styles.breadcrumbItem} key={`${item.label}-${index}`}>
                {item.href ? <Link to={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
              </li>
            ))}
          </ol>
        </nav>

        <h1>{context.title}</h1>
        <p>{context.description}</p>

        {context.status === "invalid" ? (
          <section className={`${styles.stateCard} margin-top--lg`}>
            <h2>可以从这些入口继续</h2>
            <p className="margin-bottom--0">重新检索资料，或从课程目录进入正确的资料页。</p>
            <div className={styles.stateActions}>
              <Link className="button button--primary" to="/browse">
                检索资料
              </Link>
              <Link className="button button--secondary" to="/foundation">
                查看课程目录
              </Link>
            </div>
          </section>
        ) : (
        <div className="margin-top--lg">
          <p className={styles.pageSummary}>共收录 {materials.length} 条资料</p>
          {groupedMaterials.length > 0 ? (
            groupedMaterials.map((group) => {
              const expanded = expandedGroups[group.category] ?? false;
              const { visibleItems, hiddenCount } = getVisibleGroupItems(
                group.items,
                GROUP_PREVIEW_LIMIT,
                expanded
              );

              return (
                <section className="margin-bottom--xl" key={group.category}>
                  <h2>{group.category}</h2>
                  <div className="margin-top--md">
                    {visibleItems.map((material) => (
                      <MaterialCard
                        key={material.id}
                        id={material.id}
                        title={material.title}
                        type={material.type}
                        term={material.term}
                        summary={material.summary}
                        href={material.href}
                        isFavorite={favoriteIds.has(material.id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                  {group.items.length > GROUP_PREVIEW_LIMIT ? (
                    <button
                      className="button button--secondary button--sm margin-top--sm"
                      type="button"
                      onClick={() => toggleGroup(group.category)}
                    >
                      {expanded ? "收起" : `查看更多（还有 ${hiddenCount} 条）`}
                    </button>
                  ) : null}
                </section>
              );
            })
          ) : (
            <section className={styles.stateCard}>
              <h2>该课程暂时没有资料</h2>
              <p className="margin-bottom--0">如果你有讲义、试卷或复习资料，可以通过统一投稿流程补充。</p>
              <div className={styles.stateActions}>
                <Link className="button button--primary" to={buildCourseSubmissionPath(context)}>
                  投稿资料
                </Link>
                <Link className="button button--secondary" to="/browse">
                  浏览其他资料
                </Link>
              </div>
            </section>
          )}
        </div>
        )}
      </main>
    </Layout>
  );
}
