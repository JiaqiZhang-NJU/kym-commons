import Layout from "@theme/Layout";
import { useLocation } from "@docusaurus/router";

import MaterialCard from "../components/MaterialCard";
import { FOUNDATION_COURSES, TRACK_COURSES } from "../data/courses";
import { SAMPLE_MATERIALS } from "../data/materials";

export default function MaterialsPage() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const section = params.get("section");
  const track = params.get("track");
  const course = params.get("course");

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

  return (
    <Layout title={title}>
      <main className="container margin-vert--lg">
        <h1>{title}</h1>
        <p>
          {section === "foundation"
            ? "Foundation 课程资料页。"
            : "方向课程或 General Resources 的资料页。"}
        </p>
        <div className="margin-top--lg">
          {materials.length > 0 ? (
            materials.map((material) => (
              <MaterialCard
                key={material.id}
                title={material.title}
                type={material.type}
                term={material.term}
                summary={material.summary}
                href={material.href}
              />
            ))
          ) : (
            <p>目前该课程下还没有示例资料，后续会通过审核流自动补充。</p>
          )}
        </div>
      </main>
    </Layout>
  );
}
