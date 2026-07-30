import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import { loadCatalog } from "../catalog/catalog.mjs";
import { inferCategorySlug } from "../catalog/classification.mjs";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GENERAL_RESOURCES_SLUG = "general-resources";

export function parseSubmissionManifest(body) {
  const match = body.match(/<!--\s*kym-submission:v([23])\s*\n([\s\S]*?)\n\s*-->/);
  if (!match) throw new Error("Missing kym-submission:v2 or kym-submission:v3 manifest.");
  const manifest = JSON.parse(match[2]);
  if (manifest.version !== Number(match[1])) throw new Error("Submission manifest version does not match its marker.");
  return manifest;
}

export function parseAssetManifest(body) {
  const match = body.match(/<!--\s*kym-assets:v1\s*\n([\s\S]*?)\n\s*-->/);
  if (!match) return [];
  const assets = JSON.parse(match[1]);
  if (!Array.isArray(assets) || !assets.length) throw new Error("kym-assets:v1 must contain at least one asset.");
  return assets;
}

export function parseGitHubAttachments(body) {
  const assets = [];
  const seenHrefs = new Set();
  const markdownLinkPattern = /\[([^\]\n]+)\]\((https:\/\/github\.com\/user-attachments\/(?:files|assets)\/[^)\s]+)\)/gi;
  const bareLinkPattern = /https:\/\/github\.com\/user-attachments\/(?:files|assets)\/[^\s<>)]+/gi;
  for (const match of body.matchAll(markdownLinkPattern)) addAttachment(assets, seenHrefs, match[2], match[1]);
  for (const match of body.matchAll(bareLinkPattern)) addAttachment(assets, seenHrefs, match[0], null);
  return assets;
}

function addAttachment(assets, seenHrefs, href, markdownLabel) {
  if (seenHrefs.has(href)) return;
  seenHrefs.add(href);
  const pathFileName = decodeURIComponent(new URL(href).pathname.split("/").pop() ?? "");
  const fileName = markdownLabel && /\.[a-z0-9]{1,10}$/i.test(markdownLabel) ? markdownLabel : pathFileName || null;
  assets.push({ href, label: markdownLabel ?? fileName ?? `Attachment ${assets.length + 1}`, role: "primary", fileName, mediaType: inferMediaType(fileName) });
}

function inferMediaType(fileName) {
  const extension = fileName?.split(".").pop()?.toLowerCase();
  return { pdf: "application/pdf", txt: "text/plain", zip: "application/zip", rar: "application/vnd.rar", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }[extension] ?? null;
}

export function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "submission";
}

function assertSlug(value, label) {
  if (!slugPattern.test(value ?? "")) throw new Error(`${label} must be a lowercase kebab-case slug.`);
}

function nextOrder(items) {
  return Math.max(0, ...items.map((item) => item.order ?? 0)) + 1;
}

function normalizeManifest(manifest) {
  if (manifest.version === 2) {
    if (!manifest.courseSlug) throw new Error("New courses in v2 submissions require a maintainer-created course catalog entry before publication.");
    return {
      scope: manifest.scope,
      track: manifest.scope === "foundation-course" ? null : { mode: "existing", slug: manifest.trackSlug, label: null },
      course: { mode: "existing", slug: manifest.courseSlug, title: null },
    };
  }
  if (manifest.version !== 3) throw new Error("Unsupported submission manifest version.");
  return { scope: manifest.scope, track: manifest.track, course: manifest.course };
}

function assertScope(scope) {
  if (!["foundation-course", "track-course", "track-general"].includes(scope)) throw new Error("Unsupported submission scope.");
}

function assertNewTarget(target, label, titleKey) {
  if (!target || target.mode !== "new" || !target[titleKey]?.trim()) throw new Error(`New ${label} requires a label and slug.`);
  assertSlug(target.slug, `${label} slug`);
}

function findCourse(courses, scope, trackSlug, courseSlug) {
  return courses.find((course) => course.section === (scope === "foundation-course" ? "foundation" : "track") && course.trackSlug === trackSlug && course.slug === courseSlug);
}

export function planCatalogMutation({ catalog, manifest, assets, issueNumber }) {
  const target = normalizeManifest(manifest);
  assertScope(target.scope);
  const tracks = [...catalog.tracks];
  const courses = [...catalog.courses];
  let trackSlug = null;

  if (target.scope !== "foundation-course") {
    if (!target.track || !["existing", "new"].includes(target.track.mode)) throw new Error("Track submissions require a track target.");
    trackSlug = target.track.slug;
    if (target.track.mode === "new") {
      assertNewTarget(target.track, "track", "label");
      if (tracks.some((track) => track.slug === trackSlug)) throw new Error(`Track slug already exists: ${trackSlug}`);
      tracks.push({ slug: trackSlug, label: target.track.label.trim(), description: `${target.track.label.trim()}方向课程资料`, aliases: [], order: nextOrder(tracks) });
      courses.push({ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", aliases: [], section: "track", trackSlug, description: `${target.track.label.trim()}方向通用资料`, order: nextOrder(courses), isGeneralResources: true });
    } else if (!tracks.some((track) => track.slug === trackSlug)) {
      throw new Error(`Unknown track: ${trackSlug}`);
    }
  }

  if (!target.course || !["existing", "new"].includes(target.course.mode)) throw new Error("Submission requires a course target.");
  let courseSlug = target.course.slug;
  if (target.scope === "track-general") {
    if (target.course.mode !== "existing" || courseSlug !== GENERAL_RESOURCES_SLUG) throw new Error("Track general submissions must target General Resources.");
  } else if (target.course.mode === "new") {
    assertNewTarget(target.course, "course", "title");
    if (findCourse(courses, target.scope, trackSlug ?? undefined, courseSlug)) throw new Error(`Course slug already exists: ${courseSlug}`);
    courses.push({ slug: courseSlug, title: target.course.title.trim(), aliases: [], section: target.scope === "foundation-course" ? "foundation" : "track", ...(target.scope === "foundation-course" ? {} : { trackSlug }), description: `${target.course.title.trim()}课程资料`, order: nextOrder(courses), isGeneralResources: false });
  } else {
    const existingCourse = findCourse(courses, target.scope, trackSlug ?? undefined, courseSlug);
    if (!existingCourse) throw new Error(`Unknown course target: ${courseSlug}`);
    if (target.scope === "track-course" && existingCourse.isGeneralResources) {
      throw new Error("Track course submissions cannot target General Resources.");
    }
  }

  if (target.scope === "track-general" && !findCourse(courses, target.scope, trackSlug ?? undefined, GENERAL_RESOURCES_SLUG)?.isGeneralResources) throw new Error(`Track has no General Resources course: ${trackSlug}`);
  if (target.scope === "track-general") courseSlug = GENERAL_RESOURCES_SLUG;
  const sourceAssets = manifest.sourceMode === "external-link" ? [{ href: manifest.externalLink, label: "External material", role: "primary" }] : assets;
  if (!sourceAssets.length || sourceAssets.some((asset) => !asset.href)) throw new Error("A verified external link or GitHub Issue attachment is required.");
  const id = `submission-${issueNumber}-${slugify(manifest.title)}`;
  const materialPackage = {
    schemaVersion: 1, id, title: manifest.title, summary: manifest.summary,
    placement: target.scope === "foundation-course" ? { section: "foundation", courseSlug } : { section: "track", trackSlug, courseSlug },
    categorySlug: "reference", materialType: manifest.materialType, term: { label: manifest.term, sortKey: null }, tags: [], aliases: [],
    assets: sourceAssets.map((asset, index) => ({ id: `asset-${index + 1}`, label: asset.label ?? `Asset ${index + 1}`, role: asset.role ?? "primary", href: asset.href, fileName: asset.fileName ?? null, mediaType: asset.mediaType ?? null, sizeBytes: asset.sizeBytes ?? null, sha256: asset.sha256 ?? null })),
    source: { kind: "github-submission", issueNumber }, publishedAt: null, updatedAt: new Date().toISOString().slice(0, 10), legacyIds: [],
  };
  materialPackage.categorySlug = inferCategorySlug(materialPackage);
  return { tracks, courses, materialPackage };
}

export function createPackage({ manifest, assets, issueNumber, catalog }) {
  if (!catalog) throw new Error("Catalog is required to create a submission package.");
  return planCatalogMutation({ catalog, manifest, assets, issueNumber }).materialPackage;
}

export function outputPath(root, materialPackage) {
  const placement = materialPackage.placement;
  const directory = placement.section === "foundation" ? path.join(root, "content", "packages", "foundation", placement.courseSlug) : path.join(root, "content", "packages", "tracks", placement.trackSlug, placement.courseSlug);
  return path.join(directory, `${materialPackage.id}.json`);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeCatalogMutation({ root, mutation }) {
  writeJson(path.join(root, "content", "catalog", "tracks.json"), { schemaVersion: 1, items: mutation.tracks });
  writeJson(path.join(root, "content", "catalog", "courses.json"), { schemaVersion: 1, items: mutation.courses });
  const target = outputPath(root, mutation.materialPackage);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  writeJson(target, mutation.materialPackage);
  return target;
}

if (process.argv[1]?.endsWith("issue-to-catalog.mjs")) {
  const contextPath = process.env.KYM_SUBMISSION_CONTEXT_PATH;
  const body = contextPath ? fs.readFileSync(contextPath, "utf8") : process.env.KYM_ISSUE_BODY;
  const issueNumber = Number(process.env.KYM_ISSUE_NUMBER);
  if (!body || !Number.isInteger(issueNumber)) throw new Error("Submission context and KYM_ISSUE_NUMBER are required.");
  const assets = parseAssetManifest(body).length ? parseAssetManifest(body) : parseGitHubAttachments(body);
  const root = process.cwd();
  const mutation = planCatalogMutation({ catalog: loadCatalog({ root }), manifest: parseSubmissionManifest(body), assets, issueNumber });
  const target = writeCatalogMutation({ root, mutation });
  console.log(`Generated ${path.relative(root, target)} (${createHash("sha256").update(body).digest("hex").slice(0, 12)})`);
}
