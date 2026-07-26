import Layout from "@theme/Layout";
import { useLocation } from "@docusaurus/router";
import Link from "@docusaurus/Link";

import { getCourse } from "../catalog/runtime";
import { parseCourseRoute } from "../catalog/routeParsing";
import CatalogCoursePage from "../components/CatalogCoursePage";

export default function CatalogCourseRoute() {
  const { pathname } = useLocation();
  const route = parseCourseRoute(pathname);
  const course =
    route?.section === "foundation"
      ? getCourse(route)
      : route?.section === "track"
        ? getCourse(route)
        : undefined;

  if (course) return <CatalogCoursePage course={course} />;

  return (
    <Layout title="未找到课程">
      <main className="container margin-vert--lg">
        <h1>未找到课程</h1>
        <p>该课程链接可能已调整。</p>
        <Link className="button button--primary" to="/foundation">返回课程目录</Link>
      </main>
    </Layout>
  );
}
