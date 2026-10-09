import { useLocation } from "@docusaurus/router";
import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import useBaseUrl from "@docusaurus/useBaseUrl";
import { useEffect, useMemo } from "react";

import { buildCanonicalCoursePath, getCourse } from "../catalog/runtime";

/** Compatibility endpoint for historical /materials?section=…&course=… URLs. */
export default function LegacyMaterialsRoute() {
  const { search } = useLocation();
  const target = useMemo(() => getLegacyTarget(search), [search]);
  const redirectTarget = useBaseUrl(target ?? "/");

  useEffect(() => {
    if (target) window.location.replace(redirectTarget);
  }, [target, redirectTarget]);

  return (
    <Layout title="课程资料已迁移">
      <Head><meta name="robots" content="noindex,follow" /></Head>
      <main className="container margin-vert--lg">
        <h1>课程资料已迁移</h1>
        {target ? <p>正在前往新的课程资料页；如未自动跳转，请 <Link to={target}>继续前往</Link>。</p> : <><p>此旧链接缺少有效课程信息。</p><Link className="button button--primary" to="/browse">搜索资料包</Link></>}
      </main>
    </Layout>
  );
}

function getLegacyTarget(search: string): string | null {
  const params = new URLSearchParams(search);
  const section = params.get("section");
  const courseSlug = params.get("course") ?? "";
  if (section === "foundation") {
    const course = getCourse({ section: "foundation", courseSlug });
    return course ? buildCanonicalCoursePath({ section: "foundation", courseSlug }) : null;
  }
  if (section === "track") {
    const trackSlug = params.get("track") ?? "";
    const course = getCourse({ section: "track", trackSlug, courseSlug });
    return course ? buildCanonicalCoursePath({ section: "track", trackSlug, courseSlug }) : null;
  }
  return null;
}
