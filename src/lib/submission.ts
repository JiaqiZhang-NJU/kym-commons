import { getCourse, getFoundationCourses, getTrackCourses, runtimeCatalog } from "../catalog/runtime";
import { GENERAL_RESOURCES_SLUG } from "./materials";

export type SubmissionScope = "foundation-course" | "track-course" | "track-general";
export type FileSourceMode = "issue-attachment" | "external-link";
export type TrackTargetMode = "existing" | "new";
export type CourseTargetMode = "existing" | "new";

const catalogSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isCatalogSlug(value: string) {
  return catalogSlugPattern.test(value);
}

export type SubmissionPrefill = {
  scope: SubmissionScope;
  trackSlug?: string;
  courseSlug?: string;
};

export type TargetStepState = {
  scope: SubmissionScope;
  trackTargetMode: TrackTargetMode;
  existingTrackSlug: string;
  newTrackLabel: string;
  newTrackSlug: string;
  courseTargetMode: CourseTargetMode;
  existingCourseSlug: string;
  newCourseTitle: string;
  newCourseSlug: string;
};

export type TargetTrack =
  | { mode: "existing"; slug: string; label: string }
  | { mode: "new"; slug: string; label: string };

export type TargetCourse =
  | { mode: "existing"; slug: string; title: string }
  | { mode: "new"; slug: string; title: string };

export type DetailStepState = {
  title: string;
  term: string;
  summary: string;
  sourceMode: FileSourceMode;
  externalLink: string;
};

export const COURSE_TYPES = ["课程笔记", "作业经验", "历年题/回忆", "参考资料", "FAQ"] as const;
export const GENERAL_TYPES = ["方向导引", "经验分享", "科研入门", "竞赛/项目", "工具资源", "书单/参考资源", "其他"] as const;
export type CourseMaterialType = (typeof COURSE_TYPES)[number];
export type GeneralMaterialType = (typeof GENERAL_TYPES)[number];
export type MaterialType = CourseMaterialType | GeneralMaterialType;

export type SubmissionPayload = {
  scope: SubmissionScope;
  sectionLabel: string;
  track: TargetTrack | null;
  course: TargetCourse;
  materialType: MaterialType;
  title: string;
  term: string;
  summary: string;
  sourceMode: FileSourceMode;
  externalLink: string;
  anonymous: boolean;
};

export function parseSubmissionPrefill(search: string): SubmissionPrefill | null {
  const params = new URLSearchParams(search);
  const scope = params.get("scope");
  const trackSlug = params.get("track") ?? "";
  const courseSlug = params.get("course") ?? "";

  if (scope === "foundation-course") {
    return getCourse({ section: "foundation", courseSlug }) ? { scope, trackSlug: "", courseSlug } : null;
  }

  const trackExists = runtimeCatalog.tracks.some((track) => track.slug === trackSlug);
  if (!trackExists) return null;

  if (scope === "track-general") {
    return getCourse({ section: "track", trackSlug, courseSlug })?.isGeneralResources
      ? { scope, trackSlug, courseSlug }
      : null;
  }

  if (scope === "track-course") {
    const course = getCourse({ section: "track", trackSlug, courseSlug });
    return course && !course.isGeneralResources ? { scope, trackSlug, courseSlug } : null;
  }

  return null;
}

export function getDefaultMaterialType(scope: SubmissionScope) {
  return scope === "track-general" ? GENERAL_TYPES[2] : COURSE_TYPES[0];
}

export function getDefaultSourceMode(): FileSourceMode {
  return "issue-attachment";
}

export function getFirstExistingCourseSlug(scope: SubmissionScope, trackSlug: string) {
  if (scope === "foundation-course") return getFoundationCourses()[0]?.slug ?? "";
  if (scope === "track-general") return GENERAL_RESOURCES_SLUG;
  return getTrackCourses(trackSlug).find((course) => !course.isGeneralResources)?.slug ?? "";
}

export function isScopeStepComplete(scope: SubmissionScope | "") {
  return scope === "foundation-course" || scope === "track-course" || scope === "track-general";
}

export function isTargetStepComplete(input: TargetStepState) {
  const newCourseComplete = input.newCourseTitle.trim().length > 0 && isCatalogSlug(input.newCourseSlug.trim());
  if (input.scope === "foundation-course") {
    return input.courseTargetMode === "new" ? newCourseComplete : input.existingCourseSlug.trim().length > 0;
  }

  const trackComplete = input.trackTargetMode === "new"
    ? input.newTrackLabel.trim().length > 0 && isCatalogSlug(input.newTrackSlug.trim())
    : input.existingTrackSlug.trim().length > 0;
  if (!trackComplete) return false;
  if (input.scope === "track-general") return true;
  return input.trackTargetMode === "new" || input.courseTargetMode === "new"
    ? newCourseComplete
    : input.existingCourseSlug.trim().length > 0;
}

export function isDetailsStepComplete(input: DetailStepState) {
  const baseComplete = input.title.trim().length > 0 && input.term.trim().length > 0 && input.summary.trim().length > 0;
  return baseComplete && (input.sourceMode === "issue-attachment" || input.externalLink.trim().length > 0);
}

export function buildIssueTitle(payload: Pick<SubmissionPayload, "track" | "course" | "term" | "materialType">) {
  return `[Submission][${payload.track?.label ?? "Foundation"}][${payload.course.title}] ${payload.term} ${payload.materialType}`;
}

export function buildIssueBody(payload: SubmissionPayload) {
  const scopeLabel = payload.scope === "track-general" ? "方向非课程资料" : payload.sectionLabel;
  const sourceLabel = payload.sourceMode === "issue-attachment" ? "GitHub Issue 附件" : "外部链接";
  const externalLinkLabel = payload.externalLink.trim() || "无";
  const uploadSection = payload.sourceMode === "issue-attachment"
    ? ["", "## 上传说明", "- [ ] 我会在创建 Issue 后上传资料附件"]
    : [];
  const manifest = {
    version: 3,
    scope: payload.scope,
    track: payload.track,
    course: payload.course,
    title: payload.title.trim(),
    term: payload.term.trim(),
    materialType: payload.materialType,
    summary: payload.summary.trim(),
    sourceMode: payload.sourceMode,
    externalLink: payload.externalLink.trim() || null,
    anonymous: payload.anonymous,
  };
  const trackLine = payload.track
    ? `- 方向：${payload.track.label}${payload.track.mode === "new" ? `（新建：${payload.track.slug}）` : ""}`
    : "- 方向：无";
  const courseLine = `- 课程：${payload.course.title}${payload.course.mode === "new" ? `（新建：${payload.course.slug}）` : ""}`;

  return [
    "<!-- kym-submission:v3",
    JSON.stringify(manifest),
    "-->",
    "",
    "## 基本信息",
    `- 归属：${scopeLabel}`,
    trackLine,
    courseLine,
    `- 类型：${payload.materialType}`,
    `- 标题：${payload.title.trim()}`,
    `- 学期：${payload.term.trim()}`,
    "",
    "## 资料说明",
    payload.summary.trim(),
    "",
    "## 文件来源",
    `- 来源方式：${sourceLabel}`,
    `- 外部链接：${externalLinkLabel}`,
    ...uploadSection,
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

export function buildIssueUrl({ repoUrl, title, body }: { repoUrl: string; title: string; body: string }) {
  const url = new URL(`${repoUrl.replace(/\/$/, "")}/issues/new`);
  url.searchParams.set("title", title);
  url.searchParams.set("body", body);
  return url.toString();
}
