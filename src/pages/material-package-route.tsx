import Layout from "@theme/Layout";
import { useLocation } from "@docusaurus/router";
import Link from "@docusaurus/Link";

import { getPackage } from "../catalog/runtime";
import MaterialPackagePage from "../components/MaterialPackagePage";

export default function MaterialPackageRoute() {
  const { pathname } = useLocation();
  const packageId = pathname.replace(/^\/materials\/?/, "").replace(/\/$/, "");
  const materialPackage = getPackage(packageId);

  if (materialPackage) return <MaterialPackagePage materialPackage={materialPackage} />;

  return (
    <Layout title="未找到资料包">
      <main className="container margin-vert--lg">
        <h1>未找到资料包</h1>
        <p>该资料包链接可能已调整，或暂未发布。</p>
        <Link className="button button--primary" to="/browse">搜索资料</Link>
      </main>
    </Layout>
  );
}
