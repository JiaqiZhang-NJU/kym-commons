import { describe, expect, it } from "vitest";
import { parseGitHubAttachments, parseSubmissionManifest, planCatalogMutation } from "./issue-to-catalog.mjs";

function catalogFixture() {
  return {
    tracks: [{ slug: "cs", label: "计算机", description: "计算机方向", aliases: [], order: 1 }],
    courses: [
      { slug: "calculus-i", title: "微积分一", aliases: [], section: "foundation", description: "课程", order: 1, isGeneralResources: false },
      { slug: "general-resources", title: "General Resources", aliases: [], section: "track", trackSlug: "cs", description: "通用", order: 2, isGeneralResources: true },
      { slug: "machine-learning", title: "机器学习", aliases: [], section: "track", trackSlug: "cs", description: "课程", order: 3, isGeneralResources: false },
    ],
    categories: [{ slug: "reference", label: "参考资料", storageDirectory: "materials", aliases: [], order: 1 }],
    packages: [],
  };
}

const attachment = [{ href: "https://github.com/user-attachments/files/123/notes.pdf", label: "notes.pdf", role: "primary", fileName: "notes.pdf", mediaType: "application/pdf" }];

describe("submission catalog intake", () => {
  it("creates a package for an existing v2 catalog target", () => {
    const manifest = parseSubmissionManifest('<!-- kym-submission:v2\n{"version":2,"scope":"foundation-course","trackSlug":null,"courseSlug":"calculus-i","title":"Review","term":"2026 Spring","materialType":"Notes","summary":"Useful","sourceMode":"external-link","externalLink":"https://example.com/a.pdf"}\n-->');
    const mutation = planCatalogMutation({ catalog: catalogFixture(), manifest, assets: [], issueNumber: 12 });
    expect(mutation.materialPackage).toMatchObject({ id: "submission-12-review", placement: { section: "foundation", courseSlug: "calculus-i" } });
  });

  it("creates a new track, General Resources, course, and package from v3", () => {
    const manifest = parseSubmissionManifest('<!-- kym-submission:v3\n{"version":3,"scope":"track-course","track":{"mode":"new","slug":"electronic-information","label":"电子信息"},"course":{"mode":"new","slug":"digital-signal-processing","title":"数字信号处理"},"title":"笔记","term":"2026 Spring","materialType":"课程笔记","summary":"整理","sourceMode":"issue-attachment","externalLink":null}\n-->');
    const mutation = planCatalogMutation({ catalog: catalogFixture(), manifest, assets: attachment, issueNumber: 13 });
    expect(mutation.tracks.at(-1)).toMatchObject({ slug: "electronic-information", label: "电子信息" });
    expect(mutation.courses).toEqual(expect.arrayContaining([
      expect.objectContaining({ trackSlug: "electronic-information", slug: "general-resources", isGeneralResources: true }),
      expect.objectContaining({ trackSlug: "electronic-information", slug: "digital-signal-processing", title: "数字信号处理" }),
    ]));
    expect(mutation.materialPackage.placement).toEqual({ section: "track", trackSlug: "electronic-information", courseSlug: "digital-signal-processing" });
  });

  it("creates General Resources and a package for a new track general submission", () => {
    const manifest = { version: 3, scope: "track-general", track: { mode: "new", slug: "bioinformatics", label: "生物信息" }, course: { mode: "existing", slug: "general-resources", title: "General Resources" }, title: "导引", term: "2026 Spring", materialType: "方向导引", summary: "整理", sourceMode: "issue-attachment", externalLink: null };
    const mutation = planCatalogMutation({ catalog: catalogFixture(), manifest, assets: attachment, issueNumber: 14 });
    expect(mutation.materialPackage.placement).toEqual({ section: "track", trackSlug: "bioinformatics", courseSlug: "general-resources" });
  });

  it("rejects duplicate and unsafe newly-created identifiers", () => {
    const manifest = { version: 3, scope: "track-general", track: { mode: "new", slug: "cs", label: "重复" }, course: { mode: "existing", slug: "general-resources", title: "General Resources" }, title: "导引", term: "2026 Spring", materialType: "方向导引", summary: "整理", sourceMode: "issue-attachment", externalLink: null };
    expect(() => planCatalogMutation({ catalog: catalogFixture(), manifest, assets: attachment, issueNumber: 15 })).toThrow("Track slug already exists");
    expect(() => planCatalogMutation({ catalog: catalogFixture(), manifest: { ...manifest, track: { ...manifest.track, slug: "电子信息" } }, assets: attachment, issueNumber: 15 })).toThrow("kebab-case");
  });

  it("does not let a track-course submission target General Resources", () => {
    const manifest = { version: 3, scope: "track-course", track: { mode: "existing", slug: "cs", label: "计算机" }, course: { mode: "existing", slug: "general-resources", title: "General Resources" }, title: "笔记", term: "2026 Spring", materialType: "课程笔记", summary: "整理", sourceMode: "issue-attachment", externalLink: null };
    expect(() => planCatalogMutation({ catalog: catalogFixture(), manifest, assets: attachment, issueNumber: 16 })).toThrow("General Resources");
  });

  it("extracts and deduplicates GitHub attachments uploaded in comments", () => {
    const body = "[test.txt](https://github.com/user-attachments/files/123/test.txt)\nhttps://github.com/user-attachments/files/123/test.txt\n![preview](https://github.com/user-attachments/assets/abc-123)";
    expect(parseGitHubAttachments(body)).toEqual([expect.objectContaining({ fileName: "test.txt", mediaType: "text/plain" }), expect.objectContaining({ label: "preview" })]);
  });
});
