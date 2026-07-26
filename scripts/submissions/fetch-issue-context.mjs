import fs from "node:fs";

export async function fetchIssueAuthorComments({
  apiUrl,
  repository,
  issueNumber,
  issueAuthor,
  token,
  fetchImplementation = fetch,
}) {
  const comments = [];
  let nextUrl = `${apiUrl}/repos/${repository}/issues/${issueNumber}/comments?per_page=100`;

  while (nextUrl) {
    const response = await fetchImplementation(nextUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      throw new Error(`Unable to read issue comments: GitHub API returned ${response.status}.`);
    }

    const page = await response.json();
    comments.push(
      ...page
        .filter((comment) => comment.user?.login === issueAuthor)
        .map((comment) => comment.body ?? "")
    );
    nextUrl = getNextPageUrl(response.headers.get("link"));
  }

  return comments;
}

export function getNextPageUrl(linkHeader) {
  if (!linkHeader) return "";
  const nextLink = linkHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.endsWith('rel="next"'));
  return nextLink?.match(/^<([^>]+)>/)?.[1] ?? "";
}

if (process.argv[1]?.endsWith("fetch-issue-context.mjs")) {
  const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
  const repository = process.env.GITHUB_REPOSITORY;
  const issueNumber = Number(process.env.KYM_ISSUE_NUMBER);
  const issueAuthor = process.env.KYM_ISSUE_AUTHOR;
  const issueBody = process.env.KYM_ISSUE_BODY;
  const token = process.env.GITHUB_TOKEN;
  const outputPath = process.env.KYM_SUBMISSION_CONTEXT_PATH;

  if (!repository || !Number.isInteger(issueNumber) || !issueAuthor || !issueBody || !token || !outputPath) {
    throw new Error("Missing GitHub issue context environment variables.");
  }

  const comments = await fetchIssueAuthorComments({
    apiUrl,
    repository,
    issueNumber,
    issueAuthor,
    token,
  });
  fs.writeFileSync(outputPath, [issueBody, ...comments].join("\n\n"), "utf8");
  console.log(`Collected issue body and ${comments.length} author comment(s).`);
}
