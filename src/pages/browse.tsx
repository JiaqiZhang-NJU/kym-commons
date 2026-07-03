import Layout from "@theme/Layout";

import { SAMPLE_MATERIALS } from "../data/materials";
import MaterialCard from "../components/MaterialCard";

export default function BrowsePage() {
  return (
    <Layout title="Browse">
      <main className="container margin-vert--lg">
        <h1>Browse</h1>
        <p>第一版先提供轻量浏览入口，后续再补更细的筛选与搜索。</p>
        <div className="margin-top--lg">
          {SAMPLE_MATERIALS.map((material) => (
            <MaterialCard
              key={material.id}
              title={material.title}
              type={material.type}
              term={material.term}
              summary={material.summary}
              href={material.href}
            />
          ))}
        </div>
      </main>
    </Layout>
  );
}
