import Layout from "@theme/Layout";
import { useLocation } from "@docusaurus/router";
import { useMemo, useState } from "react";

import MaterialCard from "../components/MaterialCard";
import { FOUNDATION_COURSES, TRACK_COURSES } from "../data/courses";
import { SAMPLE_MATERIALS } from "../data/materials";
import { useMaterialFavorites } from "../hooks/useMaterialFavorites";
import { getVisibleGroupItems, groupMaterialsByCategory } from "../lib/materials";

const GROUP_PREVIEW_LIMIT = 3;

export default function MaterialsPage() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const section = params.get("section");
  const track = params.get("track");
  const course = params.get("course");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const { favoriteIds, toggleFavorite } = useMaterialFavorites();

  const title =
    section === "foundation"
      ? FOUNDATION_COURSES.find((item) => item.slug === course)?.title ?? "Unknown Course"
      : track && course
        ? TRACK_COURSES[track as keyof typeof TRACK_COURSES]?.find((item) => item.slug === course)?.title ??
          "Unknown Course"
        : "Unknown Course";

  const materials = SAMPLE_MATERIALS.filter((item) => {
    if (section === "foundation") {
      return item.section === "foundation" && item.courseSlug === course;
    }

    return item.section === "track" && item.trackSlug === track && item.courseSlug === course;
  });
  const groupedMaterials = useMemo(() => groupMaterialsByCategory(materials), [materials]);

  function toggleGroup(category: string) {
    setExpandedGroups((current) => ({
      ...current,
      [category]: !current[category],
    }));
  }

  return (
    <Layout title={title}>
      <main className="container margin-vert--lg">
        <h1>{title}</h1>
        <p>
          {section === "foundation"
            ? "Foundation 课程资料页，资料按类别分组展示。"
            : "方向课程或 General Resources 的资料页。"}
        </p>
        <div className="margin-top--lg">
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
            <p>目前该课程下还没有示例资料，后续会通过审核流自动补充。</p>
          )}
        </div>
      </main>
    </Layout>
  );
}
