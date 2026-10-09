import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildIssueBody,
  buildIssueTitle,
  buildIssueUrl,
  buildSubmissionManifest,
  getDefaultMaterialType,
  getDefaultSourceMode,
  getSubmissionFileError,
  isCatalogSlug,
  isDetailsStepComplete,
  isScopeStepComplete,
  isTargetStepComplete,
  parseSubmissionPrefill,
  submissionRequest,
  uploadSubmissionFile,
} from "./submission";

const validNewTrackCourse = {
  scope: "track-course" as const,
  trackTargetMode: "new" as const,
  existingTrackSlug: "",
  newTrackLabel: "电子信息",
  newTrackSlug: "electronic-information",
  courseTargetMode: "new" as const,
  existingCourseSlug: "",
  newCourseTitle: "数字信号处理",
  newCourseSlug: "digital-signal-processing",
};

describe("submission target validation", () => {
  it("accepts catalog-safe slugs for newly created targets", () => {
    expect(isCatalogSlug("electronic-information")).toBe(true);
    expect(isCatalogSlug("Electronic Information")).toBe(false);
    expect(isCatalogSlug("电子信息")).toBe(false);
  });

  it("accepts a complete new track and new course target", () => {
    expect(isTargetStepComplete(validNewTrackCourse)).toBe(true);
  });

  it("requires complete and safe identifiers for new targets", () => {
    expect(isTargetStepComplete({ ...validNewTrackCourse, newTrackSlug: "电子信息" })).toBe(false);
    expect(isTargetStepComplete({ ...validNewTrackCourse, newCourseTitle: "" })).toBe(false);
  });

  it("allows a new track for General Resources without a new course", () => {
    expect(isTargetStepComplete({
      ...validNewTrackCourse,
      scope: "track-general",
      courseTargetMode: "existing",
      newCourseTitle: "",
      newCourseSlug: "",
    })).toBe(true);
  });

  it("requires an existing course for an existing track course target", () => {
    expect(isTargetStepComplete({
      ...validNewTrackCourse,
      trackTargetMode: "existing",
      existingTrackSlug: "cs",
      newTrackLabel: "",
      newTrackSlug: "",
      courseTargetMode: "existing",
      existingCourseSlug: "",
    })).toBe(false);
  });
});

describe("submission prefill and details validation", () => {
  it("accepts catalog-backed prefilled targets", () => {
    expect(parseSubmissionPrefill("?scope=foundation-course&course=calculus-i")).toEqual({
      scope: "foundation-course", trackSlug: "", courseSlug: "calculus-i",
    });
    expect(parseSubmissionPrefill("?scope=track-course&track=cs&course=machine-learning")).toEqual({
      scope: "track-course", trackSlug: "cs", courseSlug: "machine-learning",
    });
  });

  it("rejects mismatched prefilled targets", () => {
    expect(parseSubmissionPrefill("?scope=track-course&track=math&course=machine-learning")).toBeNull();
    expect(parseSubmissionPrefill("?scope=track-general&track=cs&course=machine-learning")).toBeNull();
  });

  it("requires an external link only in external-link mode", () => {
    const details = { title: "资料", term: "2026 Spring", summary: "说明", sourceMode: "external-link" as const, externalLink: "" };
    expect(isDetailsStepComplete(details)).toBe(false);
    expect(isDetailsStepComplete({ ...details, externalLink: "https://example.com/a.pdf" })).toBe(true);
    expect(isDetailsStepComplete({ ...details, sourceMode: "issue-attachment", externalLink: "" })).toBe(true);
  });

  it("keeps the material default and selects native uploads", () => {
    expect(isScopeStepComplete("track-general")).toBe(true);
    expect(getDefaultMaterialType("track-general")).toBe("科研入门");
    expect(getDefaultSourceMode()).toBe("upload");
  });

  it("requires actual nonempty files for native uploads", () => {
    const details = { title: "资料", term: "2026 Spring", summary: "说明", sourceMode: "upload" as const, externalLink: "" };
    expect(isDetailsStepComplete(details)).toBe(false);
    expect(isDetailsStepComplete({ ...details, files: [{ name: "notes.pdf", size: 0, type: "application/pdf" }] })).toBe(false);
    expect(isDetailsStepComplete({ ...details, files: [{ name: "notes.pdf", size: 123, type: "application/pdf" }] })).toBe(true);
  });

  it("rejects unsafe external references", () => {
    const details = { title: "资料", term: "2026 Spring", summary: "说明", sourceMode: "external-link" as const, externalLink: "" };
    for (const externalLink of ["http://example.com/a.pdf", "javascript:alert(1)", "https://user:password@example.com/a.pdf", "not-a-url"]) {
      expect(isDetailsStepComplete({ ...details, externalLink })).toBe(false);
    }
  });

  it("uses live server limits before accepting a multi-file selection", () => {
    const limits = { maxFiles: 2, maxFileBytes: 10, maxSubmissionBytes: 15 };
    const file = { name: "notes.pdf", size: 8, type: "application/pdf" };
    expect(getSubmissionFileError([file], limits)).toBe("");
    expect(getSubmissionFileError([file, { ...file, name: "other.pdf" }], limits)).toContain("总大小");
    expect(getSubmissionFileError([{ ...file, size: 11 }], limits)).toContain("单个文件");
    expect(getSubmissionFileError([file, file, file], limits)).toContain("最多上传 2 个");
    expect(getSubmissionFileError([{ ...file, name: "../notes.pdf" }], limits)).toContain("文件名");
  });
});

describe("v3 issue generation", () => {
  const payload = {
    scope: "track-course" as const,
    sectionLabel: "宽口径方向课程",
    track: { mode: "new" as const, slug: "electronic-information", label: "电子信息" },
    course: { mode: "new" as const, slug: "digital-signal-processing", title: "数字信号处理" },
    materialType: "课程笔记" as const,
    title: "数字信号处理笔记",
    term: "2026 Spring",
    summary: "课程整理。",
    sourceMode: "issue-attachment" as const,
    externalLink: "",
    anonymous: true,
  };

  it("records explicit new track and course targets", () => {
    const body = buildIssueBody(payload);
    expect(body).toContain("kym-submission:v3");
    expect(body).toContain('"version":3');
    expect(body).toContain("方向：电子信息（新建：electronic-information）");
    expect(body).toContain("课程：数字信号处理（新建：digital-signal-processing）");
  });

  it("uses new track labels in issue titles and issue URLs", () => {
    const title = buildIssueTitle(payload);
    expect(title).toBe("[Submission][电子信息][数字信号处理] 2026 Spring 课程笔记");
    expect(buildIssueUrl({ repoUrl: "https://github.com/JiaqiZhang-NJU/kym-commons", title, body: buildIssueBody(payload) }))
      .toContain("JiaqiZhang-NJU/kym-commons/issues/new");
  });
});

describe("native submission contract", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retains new catalog targets and anonymous preference while excluding stale external links from uploads", () => {
    const manifest = buildSubmissionManifest({
      scope: "track-course", sectionLabel: "宽口径方向课程",
      track: { mode: "new", slug: "new-track", label: "新方向" },
      course: { mode: "new", slug: "new-course", title: "新课程" },
      title: "  课程笔记  ", term: " 2026 秋季 ", summary: "  复习用  ", materialType: "课程笔记",
      sourceMode: "upload", externalLink: "https://example.com/stale.pdf", anonymous: true,
    });
    expect(manifest).toMatchObject({ version: 3, sourceMode: "upload", externalLink: null, title: "课程笔记", term: "2026 秋季", anonymous: true });
    expect(manifest.track).toEqual({ mode: "new", slug: "new-track", label: "新方向" });
    expect(manifest.course).toEqual({ mode: "new", slug: "new-course", title: "新课程" });
  });

  it("preserves readable service errors without discarding client state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 413, json: async () => ({ error: "文件超过大小限制" }) }));
    await expect(submissionRequest("/api/submissions")).rejects.toThrow("文件超过大小限制");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(submissionRequest("/api/submissions")).rejects.toThrow("网络连接失败");
  });

  it("sends the selected file bytes with the private upload token and reports transferred bytes", async () => {
    const request = {
      open: vi.fn(), setRequestHeader: vi.fn(), send: vi.fn(),
      upload: { onprogress: null as null | ((event: { loaded: number }) => void) },
      onerror: null as null | (() => void), onload: null as null | (() => void),
      status: 200, responseText: "{}",
    };
    vi.stubGlobal("XMLHttpRequest", vi.fn().mockImplementation(() => request));
    const file = { name: "notes.pdf", size: 123, type: "application/pdf" } as File;
    const progress = vi.fn();
    const pending = uploadSubmissionFile("/prefix/api/submissions/s1/files/f1", "private-token", file, progress);
    expect(request.open).toHaveBeenCalledWith("PUT", "/prefix/api/submissions/s1/files/f1");
    expect(request.setRequestHeader).toHaveBeenCalledWith("Authorization", "Bearer private-token");
    expect(request.send).toHaveBeenCalledWith(file);
    request.upload.onprogress!({ loaded: 64 });
    request.onload!();
    await pending;
    expect(progress.mock.calls.map(([bytes]) => bytes)).toEqual([64, 123]);
  });

  it("does not mark a failed upload as complete when a reverse proxy returns HTML", async () => {
    const request = {
      open: vi.fn(), setRequestHeader: vi.fn(), send: vi.fn(), upload: {},
      onerror: null as null | (() => void), onload: null as null | (() => void),
      status: 413, responseText: "<html>too large</html>",
    };
    vi.stubGlobal("XMLHttpRequest", vi.fn().mockImplementation(() => request));
    const progress = vi.fn();
    const pending = uploadSubmissionFile("/api/submissions/s1/files/f1", "token", { name: "archive.zip", size: 123 } as File, progress);
    const rejected = expect(pending).rejects.toThrow("上传失败（413）");
    request.onload!();
    await rejected;
    expect(progress).not.toHaveBeenCalled();
  });
});
