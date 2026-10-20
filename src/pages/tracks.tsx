import Layout from "@theme/Layout";

import SectionCard from "../components/SectionCard";
import { runtimeCatalog } from "../catalog/runtime";

export default function TracksPage() {
  return (
    <Layout title="各方向资料">
      <main className="container margin-vert--lg">
        <header className="kym-page-heading"><div><h1>各方向资料</h1><p>选一个方向，看看课程资料、入门指南和学习经验。</p></div></header>
        <div className="row">
          {runtimeCatalog.tracks.map((track) => (
            <div className="col col--4 margin-bottom--md" key={track.slug}>
              <SectionCard
                title={track.label}
                description={track.description?.replaceAll("宽口径方向", "方向")}
                to={`/tracks/${track.slug}`}
              />
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
