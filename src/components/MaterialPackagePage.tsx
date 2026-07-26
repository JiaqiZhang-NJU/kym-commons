import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";

import { buildCanonicalCoursePath } from "../catalog/runtime";
import type { MaterialPackage } from "../catalog/types";
import { getMaterialFileInfo, isExternalHref } from "../lib/materials";

type Props = { materialPackage: MaterialPackage };

export default function MaterialPackagePage({ materialPackage }: Props) {
  const coursePath = buildCanonicalCoursePath(materialPackage.placement);

  return (
    <Layout title={materialPackage.title} description={materialPackage.summary}>
      <main className="container margin-vert--lg">
        <nav aria-label="当前位置" className="margin-bottom--md">
          <Link to={coursePath}>返回课程资料</Link>
        </nav>
        <p className="margin-bottom--sm">
          <span className="badge badge--secondary">{materialPackage.materialType}</span>{" "}
          <span className="badge badge--secondary">{materialPackage.term.label}</span>
        </p>
        <h1>{materialPackage.title}</h1>
        <p>{materialPackage.summary}</p>
        {materialPackage.tags.length ? <p>标签：{materialPackage.tags.join(" · ")}</p> : null}

        <section className="margin-top--xl">
          <h2>包含文件</h2>
          <div className="row">
            {materialPackage.assets.map((asset) => (
              <AssetCard asset={asset} key={asset.id} />
            ))}
          </div>
        </section>
        <section className="margin-top--xl">
          <h2>资料信息</h2>
          <dl>
            <dt>资料包 ID</dt>
            <dd><code>{materialPackage.id}</code></dd>
            <dt>来源</dt>
            <dd>{materialPackage.source.kind === "external" ? "外部链接" : "KYM Commons 仓库"}</dd>
            {materialPackage.updatedAt ? <><dt>更新日期</dt><dd>{materialPackage.updatedAt}</dd></> : null}
          </dl>
        </section>
      </main>
    </Layout>
  );
}

function AssetCard({ asset }: { asset: MaterialPackage["assets"][number] }) {
  const href = isExternalHref(asset.href) ? asset.href : useBaseUrl(asset.href);
  const fileInfo = getMaterialFileInfo(asset.href);

  return (
    <article className="col col--6 margin-bottom--md">
      <div className="card">
        <div className="card__body">
          <h3>{asset.label}</h3>
          <p>{asset.role} · {asset.mediaType ?? fileInfo.formatLabel}</p>
          {asset.sizeBytes !== null ? <p><small>{formatBytes(asset.sizeBytes)}</small></p> : null}
          <a className="button button--primary button--sm" href={href} target="_blank" rel="noreferrer">
            {fileInfo.external ? "访问链接" : "打开文件"}
          </a>
          {!fileInfo.external ? <a className="button button--secondary button--sm margin-left--sm" href={href} download>下载</a> : null}
        </div>
      </div>
    </article>
  );
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
