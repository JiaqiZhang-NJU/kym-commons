import fs from "node:fs";
import path from "node:path";

export function parseIssueBody(body) {
  const lines = body.split("\n");
  const getValue = (prefix) => lines.find((line) => line.startsWith(prefix))?.replace(prefix, "").trim() ?? "";

  return {
    scopeLabel: getValue("- 归属："),
    trackLabel: getValue("- 方向："),
    courseTitle: getValue("- 课程："),
    materialType: getValue("- 类型："),
    title: getValue("- 标题："),
    term: getValue("- 学期："),
  };
}

export function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function resolveOutputPath({ section, trackSlug, courseSlug, slug }) {
  if (section === "foundation") {
    return `docs/foundation/courses/${courseSlug}/${slug}.md`;
  }

  return `docs/tracks/${trackSlug}/${courseSlug}/${slug}.md`;
}

function inferTrackSlug(trackLabel) {
  const mapping = {
    数学: "math",
    生化: "biochem",
    计算机: "cs",
    物理: "physics",
    天文: "astronomy",
    其他: "other",
  };

  return mapping[trackLabel] ?? "other";
}

function inferSection(scopeLabel) {
  return scopeLabel === "大类培养课程" ? "foundation" : "track";
}

function writeGeneratedFile(issueBody) {
  const parsed = parseIssueBody(issueBody);
  const section = inferSection(parsed.scopeLabel);
  const trackSlug = inferTrackSlug(parsed.trackLabel);
  const courseSlug = slugify(parsed.courseTitle);
  const slug = slugify(parsed.title || "generated-material");
  const relativePath = resolveOutputPath({ section, trackSlug, courseSlug, slug });
  const absolutePath = path.join(process.cwd(), relativePath);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(
    absolutePath,
    [
      "---",
      `title: ${parsed.title || "Generated Material"}`,
      `sidebar_position: 1`,
      "---",
      "",
      `- 类型：${parsed.materialType}`,
      `- 学期：${parsed.term}`,
      "",
      "由 GitHub Issue 审核流自动生成。",
    ].join("\n"),
    "utf8"
  );

  return relativePath;
}

if (process.argv[1] && process.argv[1].endsWith("issue-to-content.mjs")) {
  const issueBody = process.env.KYM_ISSUE_BODY;

  if (!issueBody) {
    console.log("No KYM_ISSUE_BODY provided; skipping generation.");
    process.exit(0);
  }

  const outputPath = writeGeneratedFile(issueBody);
  console.log(`Generated ${outputPath}`);
}
