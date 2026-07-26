import { describe, expect, it } from "vitest";

import { fetchIssueAuthorComments, getNextPageUrl } from "./fetch-issue-context.mjs";

describe("issue submission context", () => {
  it("keeps only comments authored by the submitter", async () => {
    const comments = await fetchIssueAuthorComments({
      apiUrl: "https://api.github.test",
      repository: "owner/repo",
      issueNumber: 2,
      issueAuthor: "submitter",
      token: "test-token",
      fetchImplementation: async () =>
        new Response(
          JSON.stringify([
            { user: { login: "submitter" }, body: "[file](https://github.com/user-attachments/assets/1)" },
            { user: { login: "stranger" }, body: "ignored" },
          ]),
          { status: 200 }
        ),
    });

    expect(comments).toEqual(["[file](https://github.com/user-attachments/assets/1)"]);
  });

  it("reads the next pagination link", () => {
    expect(
      getNextPageUrl(
        '<https://api.github.test/page/2>; rel="next", <https://api.github.test/page/4>; rel="last"'
      )
    ).toBe("https://api.github.test/page/2");
  });
});
