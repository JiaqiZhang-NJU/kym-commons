export type SubmissionScope = "foundation-course" | "track-course" | "track-general";

export type SubmissionPayload = {
  scope: SubmissionScope;
  sectionLabel: string;
  trackLabel: string | null;
  courseTitle: string;
  materialType: string;
  title: string;
  term: string;
  summary: string;
  link: string;
  anonymous: boolean;
};

export function buildIssueTitle(
  payload: Pick<SubmissionPayload, "scope" | "trackLabel" | "courseTitle" | "term" | "materialType">
) {
  const bucket = payload.trackLabel ?? "Foundation";
  return `[Submission][${bucket}][${payload.courseTitle}] ${payload.term} ${payload.materialType}`;
}

export function buildIssueBody(payload: SubmissionPayload) {
  const scopeLabel = payload.scope === "track-general" ? "方向非课程资料" : payload.sectionLabel;

  return [
    "## 基本信息",
    `- 归属：${scopeLabel}`,
    `- 方向：${payload.trackLabel ?? "无"}`,
    `- 课程：${payload.courseTitle}`,
    `- 类型：${payload.materialType}`,
    `- 标题：${payload.title}`,
    `- 学期：${payload.term}`,
    "",
    "## 资料说明",
    payload.summary,
    "",
    "## 文件或链接",
    `- 链接：${payload.link}`,
    "",
    "## 发布偏好",
    `- 是否匿名：${payload.anonymous ? "是" : "否"}`,
    "",
    "## 确认事项",
    "- [ ] 我确认资料已脱敏",
    "- [ ] 我确认资料不侵犯他人版权",
    "- [ ] 我同意维护者对内容进行整理后发布",
  ].join("\n");
}

export function buildIssueUrl({
  repoUrl,
  title,
  body,
}: {
  repoUrl: string;
  title: string;
  body: string;
}) {
  const url = new URL(`${repoUrl.replace(/\/$/, "")}/issues/new`);
  url.searchParams.set("title", title);
  url.searchParams.set("body", body);
  return url.toString();
}
