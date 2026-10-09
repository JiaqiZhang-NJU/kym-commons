import { getCourse, getFoundationCourses, getTrackCourses, runtimeCatalog } from "../catalog/runtime";
import { GENERAL_RESOURCES_SLUG } from "./materials";

export type SubmissionScope = "foundation-course" | "track-course" | "track-general";
// Kept for compatibility with the legacy Issue import helpers.
export type FileSourceMode = "upload" | "issue-attachment" | "external-link";
export type NativeFileSourceMode = "upload" | "external-link";
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
  files?: ReadonlyArray<SubmissionFile>;
};

export type SubmissionFile = { name: string; size: number; type: string };
export type SubmissionLimits = { maxFileBytes: number; maxSubmissionBytes: number; maxFiles: number };

export type SubmissionManifest = {
  version: 3;
  scope: SubmissionScope;
  track: TargetTrack | null;
  course: TargetCourse;
  title: string;
  term: string;
  materialType: MaterialType;
  summary: string;
  sourceMode: NativeFileSourceMode;
  externalLink: string | null;
  anonymous: boolean;
};

export type UploadSession = {
  id: string;
  uploadToken: string;
  files: Array<SubmissionFile & { id: string }>;
  status: string;
};

export class SubmissionRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "SubmissionRequestError";
  }
}

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

export function getDefaultSourceMode(): NativeFileSourceMode {
  return "upload";
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
  if (!baseComplete) return false;
  if (input.sourceMode === "external-link") return isExternalSubmissionLink(input.externalLink);
  if (input.sourceMode === "issue-attachment") return true;
  return (input.files?.length ?? 0) > 0 && input.files!.every((file) => file.name.trim().length > 0 && file.size > 0);
}

export function isExternalSubmissionLink(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function buildSubmissionManifest(payload: SubmissionPayload): SubmissionManifest {
  return {
    version: 3,
    scope: payload.scope,
    track: payload.track,
    course: payload.course,
    title: payload.title.trim(),
    term: payload.term.trim(),
    materialType: payload.materialType,
    summary: payload.summary.trim(),
    sourceMode: payload.sourceMode === "external-link" ? "external-link" : "upload",
    externalLink: payload.sourceMode === "external-link" ? payload.externalLink.trim() : null,
    anonymous: payload.anonymous,
  };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getSubmissionFileError(files: ReadonlyArray<SubmissionFile>, limits?: SubmissionLimits) {
  if (files.length === 0) return "请选择至少一个资料文件。";
  if (files.some((file) => !file.name.trim() || file.size <= 0)) return "存在空文件，请移除或重新选择。";
  if (files.some((file) => file.name.length > 240 || /[\x00-\x1f/\\]/u.test(file.name) || [".", ".."].includes(file.name))) return "存在不支持的文件名，请重命名后重新选择。";
  if (!limits) return "";
  if (files.length > limits.maxFiles) return `一次最多上传 ${limits.maxFiles} 个文件。`;
  if (files.some((file) => file.size > limits.maxFileBytes)) return `单个文件不能超过 ${formatFileSize(limits.maxFileBytes)}。`;
  if (files.reduce((sum, file) => sum + file.size, 0) > limits.maxSubmissionBytes) return `投稿总大小不能超过 ${formatFileSize(limits.maxSubmissionBytes)}。`;
  return "";
}

export async function submissionRequest<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: "same-origin", ...init });
  } catch {
    throw new Error("网络连接失败，请检查网络后重试。已填写的内容会保留。");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message ?? body?.error;
    throw new SubmissionRequestError(typeof message === "string" ? message : `请求失败（${response.status}），请稍后重试。`, response.status);
  }
  if (body === null) throw new Error("服务器返回了无法识别的内容，请稍后重试。");
  return body as T;
}

export function uploadSubmissionFile(url: string, token: string, file: File, onProgress: (bytes: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.upload.onprogress = (event) => onProgress(event.loaded);
    request.onerror = () => reject(new Error(`“${file.name}”上传中断，请检查网络后重试。`));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(file.size);
        resolve();
      } else {
        let message = `“${file.name}”上传失败（${request.status}），请重试。`;
        try {
          const body = JSON.parse(request.responseText);
          if (typeof body.message === "string") message = body.message;
          else if (typeof body.error === "string") message = body.error;
        } catch { /* Preserve the useful status when a proxy returns HTML. */ }
        reject(new Error(message));
      }
    };
    request.send(file);
  });
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
