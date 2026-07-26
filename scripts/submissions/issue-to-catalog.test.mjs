import { describe, expect, it } from "vitest";
import { createPackage, parseGitHubAttachments, parseSubmissionManifest } from "./issue-to-catalog.mjs";

describe("submission catalog intake", () => {
  it("creates a catalog package from the machine manifest", () => {
    const manifest = parseSubmissionManifest('<!-- kym-submission:v2\n{"scope":"foundation-course","trackSlug":null,"courseSlug":"calculus-i","title":"Review","term":"2026 Spring","materialType":"Notes","summary":"Useful","sourceMode":"external-link","externalLink":"https://example.com/a.pdf"}\n-->');
    expect(createPackage({ manifest, assets: [], issueNumber: 12 })).toMatchObject({ id: "submission-12-review", placement: { section: "foundation", courseSlug: "calculus-i" } });
  });

  it("extracts and deduplicates GitHub attachments uploaded in comments", () => {
    const body = [
      "[test.txt](https://github.com/user-attachments/files/123/test.txt)",
      "https://github.com/user-attachments/files/123/test.txt",
      "![preview](https://github.com/user-attachments/assets/abc-123)",
    ].join("\n");

    expect(parseGitHubAttachments(body)).toEqual([
      expect.objectContaining({
        href: "https://github.com/user-attachments/files/123/test.txt",
        fileName: "test.txt",
        mediaType: "text/plain",
      }),
      expect.objectContaining({
        href: "https://github.com/user-attachments/assets/abc-123",
        label: "preview",
      }),
    ]);
  });
});
