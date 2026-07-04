export type SubmissionScope = "foundation-course" | "track-course" | "track-general";

export type TargetStepState = {
  scope: SubmissionScope;
  trackSlug: string;
  useNewCourse: boolean;
  existingCourseSlug: string;
  newCourseTitle: string;
};

export type DetailStepState = {
  title: string;
  term: string;
  summary: string;
  link: string;
};

export const COURSE_TYPES = ["课程笔记", "作业经验", "历年题/回忆", "参考资料", "FAQ"] as const;
export const GENERAL_TYPES = ["方向导引", "经验分享", "科研入门", "竞赛/项目", "工具资源", "书单/参考资源", "其他"] as const;
export type CourseMaterialType = (typeof COURSE_TYPES)[number];
export type GeneralMaterialType = (typeof GENERAL_TYPES)[number];
export type MaterialType = CourseMaterialType | GeneralMaterialType;

export type SubmissionPayload = {
  scope: SubmissionScope;
  sectionLabel: string;
  trackLabel: string | null;
  courseTitle: string;
  materialType: MaterialType;
  title: string;
  term: string;
  summary: string;
  link: string;
  anonymous: boolean;
};

export function getDefaultMaterialType(scope: SubmissionScope) {
  return scope === "track-general" ? GENERAL_TYPES[2] : COURSE_TYPES[0];
}

export function getResolvedCourseTitle(input: {
  scope: SubmissionScope;
  useNewCourse: boolean;
  newCourseTitle: string;
  selectedCourseTitle: string;
}) {
  if (input.scope === "track-general") {
    return "General Resources";
  }

  if (input.useNewCourse) {
    return input.newCourseTitle.trim() || "新课程";
  }

  return input.selectedCourseTitle;
}

export function isScopeStepComplete(scope: SubmissionScope | "") {
  return scope === "foundation-course" || scope === "track-course" || scope === "track-general";
}

export function isTargetStepComplete(input: TargetStepState) {
  if (input.scope === "track-general") {
    return input.trackSlug.trim().length > 0;
  }

  if (input.scope === "foundation-course") {
    return input.useNewCourse
      ? input.newCourseTitle.trim().length > 0
      : input.existingCourseSlug.trim().length > 0;
  }

  if (input.useNewCourse) {
    return input.trackSlug.trim().length > 0 && input.newCourseTitle.trim().length > 0;
  }

  return input.trackSlug.trim().length > 0 && input.existingCourseSlug.trim().length > 0;
}

export function isDetailsStepComplete(input: DetailStepState) {
  return (
    input.title.trim().length > 0 &&
    input.term.trim().length > 0 &&
    input.summary.trim().length > 0 &&
    input.link.trim().length > 0
  );
}

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
