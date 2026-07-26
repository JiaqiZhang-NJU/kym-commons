import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export function parseSubmissionManifest(body) {
  const match = body.match(/<!--\s*kym-submission:v2\s*\n([\s\S]*?)\n\s*-->/);
  if (!match) throw new Error("Missing kym-submission:v2 manifest.");
  return JSON.parse(match[1]);
}

export function parseAssetManifest(body) {
  const match = body.match(/<!--\s*kym-assets:v1\s*\n([\s\S]*?)\n\s*-->/);
  if (!match) return [];
  const assets = JSON.parse(match[1]);
  if (!Array.isArray(assets) || !assets.length) throw new Error("kym-assets:v1 must contain at least one asset.");
  return assets;
}

export function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "submission";
}

export function createPackage({ manifest, assets, issueNumber }) {
  if (!manifest.courseSlug) throw new Error("New courses require a maintainer-created course catalog entry before publication.");
  const sourceAssets = manifest.sourceMode === "external-link" ? [{ href: manifest.externalLink, label: "External material", role: "primary" }] : assets;
  if (!sourceAssets.length || sourceAssets.some((asset) => !asset.href)) throw new Error("A verified external link or kym-assets:v1 attachment manifest is required.");
  const id = `submission-${issueNumber}-${slugify(manifest.title)}`;
  return {
    schemaVersion: 1, id, title: manifest.title, summary: manifest.summary,
    placement: manifest.scope === "foundation-course" ? { section: "foundation", courseSlug: manifest.courseSlug } : { section: "track", trackSlug: manifest.trackSlug, courseSlug: manifest.courseSlug },
    categorySlug: "reference", materialType: manifest.materialType, term: { label: manifest.term, sortKey: null }, tags: [], aliases: [],
    assets: sourceAssets.map((asset, index) => ({ id: `asset-${index + 1}`, label: asset.label ?? `Asset ${index + 1}`, role: asset.role ?? "primary", href: asset.href, fileName: asset.fileName ?? null, mediaType: asset.mediaType ?? null, sizeBytes: asset.sizeBytes ?? null, sha256: asset.sha256 ?? null })),
    source: { kind: "github-submission", issueNumber }, publishedAt: null, updatedAt: new Date().toISOString().slice(0, 10), legacyIds: [],
  };
}

export function outputPath(root, materialPackage) {
  const placement = materialPackage.placement;
  const directory = placement.section === "foundation" ? path.join(root, "content", "packages", "foundation", placement.courseSlug) : path.join(root, "content", "packages", "tracks", placement.trackSlug, placement.courseSlug);
  return path.join(directory, `${materialPackage.id}.json`);
}

if (process.argv[1]?.endsWith("issue-to-catalog.mjs")) {
  const body = process.env.KYM_ISSUE_BODY;
  const issueNumber = Number(process.env.KYM_ISSUE_NUMBER);
  if (!body || !Number.isInteger(issueNumber)) throw new Error("KYM_ISSUE_BODY and KYM_ISSUE_NUMBER are required.");
  const materialPackage = createPackage({ manifest: parseSubmissionManifest(body), assets: parseAssetManifest(body), issueNumber });
  const target = outputPath(process.cwd(), materialPackage);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(materialPackage, null, 2)}\n`);
  console.log(`Generated ${path.relative(process.cwd(), target)} (${createHash("sha256").update(body).digest("hex").slice(0, 12)})`);
}
