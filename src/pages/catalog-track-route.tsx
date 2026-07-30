import Layout from "@theme/Layout";
import { useLocation } from "@docusaurus/router";
import Link from "@docusaurus/Link";

import TrackPageContent from "../components/TrackPageContent";
import { getTrack } from "../catalog/runtime";
import { parseTrackRoute } from "../catalog/routeParsing";

export default function CatalogTrackRoute() {
  const { pathname } = useLocation();
  const track = parseTrackRoute(pathname);
  const trackRecord = track ? getTrack(track) : undefined;

  if (trackRecord) {
    return <Layout title={trackRecord.label}><TrackPageContent title={trackRecord.label} trackSlug={trackRecord.slug} /></Layout>;
  }

  return <Layout title="未找到方向"><main className="container margin-vert--lg"><h1>未找到方向</h1><p>该方向链接可能已调整。</p><Link className="button button--primary" to="/tracks">返回方向目录</Link></main></Layout>;
}
