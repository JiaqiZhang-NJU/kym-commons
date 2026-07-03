import Layout from "@theme/Layout";

import SectionCard from "../components/SectionCard";
import { TRACKS } from "../data/site";

export default function TracksPage() {
  return (
    <Layout title="Tracks">
      <main className="container margin-vert--lg">
        <h1>Tracks</h1>
        <p>按宽口径方向查看课程与方向公共资源。</p>
        <div className="row">
          {TRACKS.map((track) => (
            <div className="col col--4 margin-bottom--md" key={track.slug}>
              <SectionCard
                title={track.label}
                description="课程与 General Resources"
                to={`/tracks/${track.slug}`}
              />
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
