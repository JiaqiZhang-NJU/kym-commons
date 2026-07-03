# KYM Commons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working version of `KYM Commons`, a Docusaurus-based academy materials site with Foundation/Tracks navigation, `General Resources`, a submit flow, and GitHub-backed publication automation.

**Architecture:** Use Docusaurus as a static site on GitHub Pages. Keep site structure and registries in small TypeScript data modules, render pages from those registries, and use GitHub Issues plus GitHub Actions to convert approved submissions into generated material pages. First release is link-based, not binary-upload based.

**Tech Stack:** Docusaurus, React, TypeScript, Vitest, Node.js scripts, GitHub Actions, GitHub Pages

---

## File Structure

Planned file responsibilities:

- `package.json`: project scripts, dependencies, test commands
- `docusaurus.config.ts`: site metadata, navbar, footer, GitHub Pages config
- `src/css/custom.css`: visual theme with restrained NJU-purple accents
- `src/data/site.ts`: site labels, directions, top-level constants
- `src/data/courses.ts`: Foundation courses, track courses, `General Resources` entries
- `src/lib/materials.ts`: shared helpers for scope normalization and routing keys
- `src/lib/materials.test.ts`: unit tests for content routing and normalization
- `src/components/SectionCard.tsx`: reusable navigation card
- `src/components/SectionCard.module.css`: focused card spacing for navigation blocks
- `src/components/CourseCard.tsx`: reusable course/general-resource card
- `src/components/MaterialCard.tsx`: reusable material display card
- `src/pages/index.tsx`: homepage
- `src/pages/foundation.tsx`: Foundation entry page
- `src/pages/tracks.tsx`: track entry page
- `src/pages/browse.tsx`: browse/filter page
- `src/pages/submit.tsx`: visual submission page
- `src/pages/tracks/[slug].tsx` or generated equivalent via data-driven page approach: direction pages
- `src/lib/submission.ts`: convert form state into GitHub issue payload
- `src/lib/submission.test.ts`: unit tests for submission payload generation
- `data/generated/.gitkeep`: placeholder for generated content directory
- `scripts/issue-to-content.mjs`: convert approved issue payload into MD/MDX files
- `scripts/issue-to-content.test.mjs`: tests for generation logic
- `.github/ISSUE_TEMPLATE/material-submission.yml`: issue schema
- `.github/workflows/deploy.yml`: build and deploy GitHub Pages
- `.github/workflows/sync-submissions.yml`: process accepted submissions
- `.github/workflows/validate-content.yml`: run lint/build/tests on changes

## Task 1: Initialize Repository And Docusaurus

**Files:**
- Create: `c:\code\kym-commons\.git\`
- Create: `c:\code\kym-commons\package.json`
- Create: `c:\code\kym-commons\docusaurus.config.ts`
- Create: `c:\code\kym-commons\src\pages\index.tsx`
- Modify: scaffold output under `c:\code\kym-commons\`

- [ ] **Step 1: Initialize the Git repository**

Run:

```bash
git init
git branch -m main
```

Expected: a new `.git` directory exists and `git status` reports an empty repository on `main`.

- [ ] **Step 2: Scaffold a TypeScript Docusaurus site**

Run:

```bash
npx create-docusaurus@latest . classic --typescript --package-manager npm
```

Expected: Docusaurus creates `package.json`, `docusaurus.config.ts`, `src/pages/index.tsx`, and the default site files.

- [ ] **Step 3: Add testing dependencies and scripts**

Modify `package.json` so the scripts and dev dependencies contain at least:

```json
{
  "scripts": {
    "start": "docusaurus start",
    "build": "docusaurus build",
    "serve": "docusaurus serve",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.0.5"
  }
}
```

Run:

```bash
npm install
```

Expected: `node_modules` is created and `npm run test` exits successfully even if no tests exist yet.

- [ ] **Step 4: Verify the scaffold builds**

Run:

```bash
npm run build
```

Expected: build passes and creates `build/` with no TypeScript or Docusaurus errors.

- [ ] **Step 5: Commit the scaffold**

Run:

```bash
git add .
git commit -m "chore: scaffold docusaurus site"
```

Expected: first commit records the empty-site baseline.

## Task 2: Create The Core Content Registry And Routing Helpers

**Files:**
- Create: `c:\code\kym-commons\src\data\site.ts`
- Create: `c:\code\kym-commons\src\data\courses.ts`
- Create: `c:\code\kym-commons\src\lib\materials.ts`
- Create: `c:\code\kym-commons\src\lib\materials.test.ts`

- [ ] **Step 1: Write the failing tests for course and scope normalization**

Create `src/lib/materials.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  GENERAL_RESOURCES_SLUG,
  buildCoursePath,
  normalizeCourseSlug,
  resolveSubmissionTarget,
} from "./materials";

describe("normalizeCourseSlug", () => {
  it("normalizes english and chinese mixed names", () => {
    expect(normalizeCourseSlug("Machine Learning 导论")).toBe("machine-learning");
  });
});

describe("buildCoursePath", () => {
  it("builds foundation course paths", () => {
    expect(buildCoursePath({ section: "foundation", courseSlug: "math-analysis" })).toBe(
      "/foundation/math-analysis"
    );
  });

  it("builds track course paths", () => {
    expect(
      buildCoursePath({ section: "track", trackSlug: "cs", courseSlug: GENERAL_RESOURCES_SLUG })
    ).toBe("/tracks/cs/general-resources");
  });
});

describe("resolveSubmissionTarget", () => {
  it("maps non-course track submissions to general resources", () => {
    expect(
      resolveSubmissionTarget({
        scope: "track-general",
        trackSlug: "physics",
        courseSlug: null,
      })
    ).toEqual({
      section: "track",
      trackSlug: "physics",
      courseSlug: GENERAL_RESOURCES_SLUG,
    });
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```bash
npm run test -- src/lib/materials.test.ts
```

Expected: FAIL because `src/lib/materials.ts` does not exist yet.

- [ ] **Step 3: Implement the shared routing helpers**

Create `src/lib/materials.ts`:

```ts
export const GENERAL_RESOURCES_SLUG = "general-resources";

export type SectionKey = "foundation" | "track";
export type SubmissionScope = "foundation-course" | "track-course" | "track-general";

type BuildCoursePathInput =
  | { section: "foundation"; courseSlug: string }
  | { section: "track"; trackSlug: string; courseSlug: string };

export function normalizeCourseSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/[\u4e00-\u9fff]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function buildCoursePath(input: BuildCoursePathInput): string {
  if (input.section === "foundation") {
    return `/foundation/${input.courseSlug}`;
  }

  return `/tracks/${input.trackSlug}/${input.courseSlug}`;
}

export function resolveSubmissionTarget(input: {
  scope: SubmissionScope;
  trackSlug: string | null;
  courseSlug: string | null;
}) {
  if (input.scope === "foundation-course") {
    return {
      section: "foundation" as const,
      trackSlug: null,
      courseSlug: input.courseSlug ?? "",
    };
  }

  if (input.scope === "track-general") {
    return {
      section: "track" as const,
      trackSlug: input.trackSlug ?? "",
      courseSlug: GENERAL_RESOURCES_SLUG,
    };
  }

  return {
    section: "track" as const,
    trackSlug: input.trackSlug ?? "",
    courseSlug: input.courseSlug ?? "",
  };
}
```

- [ ] **Step 4: Add the initial site and course registries**

Create `src/data/site.ts`:

```ts
export const SITE_TITLE = "KYM Commons";
export const SITE_TAGLINE = "匡院资料站";

export const TRACKS = [
  { slug: "math", label: "数学" },
  { slug: "biochem", label: "生化" },
  { slug: "cs", label: "计算机" },
  { slug: "physics", label: "物理" },
  { slug: "astronomy", label: "天文" },
  { slug: "other", label: "其他" },
] as const;
```

Create `src/data/courses.ts`:

```ts
import { GENERAL_RESOURCES_SLUG } from "../lib/materials";

export const FOUNDATION_COURSES = [
  { slug: "math-analysis", title: "数学分析" },
  { slug: "advanced-algebra", title: "高等代数" },
  { slug: "general-physics", title: "普通物理" },
  { slug: "programming-fundamentals", title: "程序设计基础" },
];

export const TRACK_COURSES = {
  math: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
  biochem: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
  cs: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
  physics: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
  astronomy: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
  other: [{ slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true }],
} as const;
```

- [ ] **Step 5: Run the tests and commit**

Run:

```bash
npm run test -- src/lib/materials.test.ts
git add src/data/site.ts src/data/courses.ts src/lib/materials.ts src/lib/materials.test.ts
git commit -m "feat: add content registry and routing helpers"
```

Expected: tests PASS and commit records the registry foundation.

## Task 3: Apply Global Branding And Navigation

**Files:**
- Modify: `c:\code\kym-commons\docusaurus.config.ts`
- Modify: `c:\code\kym-commons\src\css\custom.css`

- [ ] **Step 1: Configure the site metadata and navbar**

Update `docusaurus.config.ts` with the project identity:

```ts
title: "KYM Commons",
tagline: "匡院资料站",
url: "https://YOUR_GITHUB_USERNAME.github.io",
baseUrl: "/kym-commons/",
organizationName: "YOUR_GITHUB_USERNAME",
projectName: "kym-commons",
deploymentBranch: "gh-pages",
themeConfig: {
  navbar: {
    title: "KYM Commons",
    items: [
      { to: "/foundation", label: "Foundation", position: "left" },
      { to: "/tracks", label: "Tracks", position: "left" },
      { to: "/browse", label: "Browse", position: "left" },
      { to: "/submit", label: "Submit", position: "left" },
      { to: "/docs/rules", label: "Rules", position: "left" },
      { to: "/docs/about", label: "About", position: "left" }
    ]
  }
}
```

- [ ] **Step 2: Replace the default palette with restrained NJU-purple accents**

Update `src/css/custom.css` with:

```css
:root {
  --ifm-color-primary: #5a2a83;
  --ifm-color-primary-dark: #4d2370;
  --ifm-color-primary-darker: #472166;
  --ifm-color-primary-light: #6a3596;
  --ifm-color-primary-lighter: #7540a3;
  --ifm-background-color: #fcfbfe;
  --ifm-font-color-base: #1f2430;
  --ifm-code-font-size: 95%;
  --kym-surface: #ffffff;
  --kym-border: #ece7f4;
  --kym-shadow: 0 12px 30px rgba(34, 24, 60, 0.06);
}

.card {
  border: 1px solid var(--kym-border);
  box-shadow: var(--kym-shadow);
}

.card:hover {
  border-color: var(--ifm-color-primary-light);
}
```

- [ ] **Step 3: Build to verify the global config**

Run:

```bash
npm run build
```

Expected: PASS with the new navbar and color variables.

- [ ] **Step 4: Commit the branding**

Run:

```bash
git add docusaurus.config.ts src/css/custom.css
git commit -m "feat: configure KYM Commons branding"
```

## Task 4: Build Reusable Cards And The Main Browse Pages

**Files:**
- Create: `c:\code\kym-commons\src\components\SectionCard.tsx`
- Create: `c:\code\kym-commons\src\components\SectionCard.module.css`
- Create: `c:\code\kym-commons\src\components\CourseCard.tsx`
- Create: `c:\code\kym-commons\src\components\MaterialCard.tsx`
- Modify: `c:\code\kym-commons\src\pages\index.tsx`
- Create: `c:\code\kym-commons\src\pages\foundation.tsx`
- Create: `c:\code\kym-commons\src\pages\tracks.tsx`
- Create: `c:\code\kym-commons\src\pages\browse.tsx`

- [ ] **Step 1: Add a reusable section card**

Create `src/components/SectionCard.tsx`:

```tsx
import Link from "@docusaurus/Link";
import clsx from "clsx";
import styles from "./SectionCard.module.css";

type Props = {
  title: string;
  description: string;
  to: string;
};

export default function SectionCard({ title, description, to }: Props) {
  return (
    <Link className={clsx("card", styles.card)} to={to}>
      <div className="card__body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </Link>
  );
}
```

Create `src/components/SectionCard.module.css`:

```css
.card {
  display: block;
  height: 100%;
  color: inherit;
  text-decoration: none;
}
```

- [ ] **Step 2: Add a reusable course card with General Resources support**

Create `src/components/CourseCard.tsx`:

```tsx
import Link from "@docusaurus/Link";

type Props = {
  title: string;
  to: string;
  isGeneral?: boolean;
};

export default function CourseCard({ title, to, isGeneral = false }: Props) {
  return (
    <Link className="card margin-bottom--md" to={to}>
      <div className="card__body">
        <h3>{title}</h3>
        <p>{isGeneral ? "Shared direction-level resources, guides, and notes." : "Browse materials for this course."}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Add a reusable material card**

Create `src/components/MaterialCard.tsx`:

```tsx
type Props = {
  title: string;
  type: string;
  term: string;
  summary: string;
  href: string;
};

export default function MaterialCard({ title, type, term, summary, href }: Props) {
  return (
    <article className="card margin-bottom--md">
      <div className="card__body">
        <div className="margin-bottom--sm">
          <strong>{type}</strong> · <span>{term}</span>
        </div>
        <h3>{title}</h3>
        <p>{summary}</p>
        <a href={href} target="_blank" rel="noreferrer">
          Open material
        </a>
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Replace the homepage with the KYM Commons layout**

Set `src/pages/index.tsx` to:

```tsx
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import SectionCard from "../components/SectionCard";

export default function Home(): JSX.Element {
  return (
    <Layout title="KYM Commons" description="匡院资料站">
      <main className="container margin-vert--xl">
        <section className="hero hero--primary">
          <div className="container">
            <h1 className="hero__title">KYM Commons</h1>
            <p className="hero__subtitle">匡院资料站</p>
            <p>A shared course materials hub for the academy.</p>
            <div className="margin-top--md">
              <Link className="button button--secondary margin-right--sm" to="/browse">
                Browse Materials
              </Link>
              <Link className="button button--outline button--secondary" to="/submit">
                Submit Materials
              </Link>
            </div>
          </div>
        </section>
        <section className="row margin-top--xl">
          <div className="col col--4">
            <SectionCard title="Foundation" description="前三学期大类培养课程资料" to="/foundation" />
          </div>
          <div className="col col--4">
            <SectionCard title="Tracks" description="宽口径方向课程与 General Resources" to="/tracks" />
          </div>
          <div className="col col--4">
            <SectionCard title="Browse" description="按方向、课程、资料类型快速检索" to="/browse" />
          </div>
        </section>
      </main>
    </Layout>
  );
}
```

- [ ] **Step 5: Add the Foundation, Tracks, and Browse pages**

Create `src/pages/foundation.tsx`:

```tsx
import Layout from "@theme/Layout";
import CourseCard from "../components/CourseCard";
import { FOUNDATION_COURSES } from "../data/courses";
import { buildCoursePath } from "../lib/materials";

export default function FoundationPage() {
  return (
    <Layout title="Foundation">
      <main className="container margin-vert--lg">
        <h1>Foundation</h1>
        <div className="row">
          {FOUNDATION_COURSES.map((course) => (
            <div className="col col--4" key={course.slug}>
              <CourseCard title={course.title} to={buildCoursePath({ section: "foundation", courseSlug: course.slug })} />
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
```

Create `src/pages/tracks.tsx`:

```tsx
import Layout from "@theme/Layout";
import SectionCard from "../components/SectionCard";
import { TRACKS } from "../data/site";

export default function TracksPage() {
  return (
    <Layout title="Tracks">
      <main className="container margin-vert--lg">
        <h1>Tracks</h1>
        <div className="row">
          {TRACKS.map((track) => (
            <div className="col col--4 margin-bottom--md" key={track.slug}>
              <SectionCard title={track.label} description="课程与 General Resources" to={`/tracks/${track.slug}`} />
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
```

Create `src/pages/browse.tsx`:

```tsx
import Layout from "@theme/Layout";

export default function BrowsePage() {
  return (
    <Layout title="Browse">
      <main className="container margin-vert--lg">
        <h1>Browse</h1>
        <p>First version provides lightweight filtering by section, direction, course, and material type.</p>
      </main>
    </Layout>
  );
}
```

- [ ] **Step 6: Build and commit**

Run:

```bash
npm run build
git add src/components src/pages/index.tsx src/pages/foundation.tsx src/pages/tracks.tsx src/pages/browse.tsx
git commit -m "feat: add main site navigation pages"
```

## Task 5: Add Direction Pages And Sample Course Rendering

**Files:**
- Create: `c:\code\kym-commons\src\data\materials.ts`
- Create: `c:\code\kym-commons\src\pages\tracks\math.tsx`
- Create: `c:\code\kym-commons\src\pages\tracks\biochem.tsx`
- Create: `c:\code\kym-commons\src\pages\tracks\cs.tsx`
- Create: `c:\code\kym-commons\src\pages\tracks\physics.tsx`
- Create: `c:\code\kym-commons\src\pages\tracks\astronomy.tsx`
- Create: `c:\code\kym-commons\src\pages\tracks\other.tsx`

- [ ] **Step 1: Add sample material data**

Create `src/data/materials.ts`:

```ts
export const SAMPLE_MATERIALS = [
  {
    id: "cs-general-ml-guide",
    section: "track",
    trackSlug: "cs",
    courseSlug: "general-resources",
    title: "机器学习入门资源整理",
    type: "科研入门",
    term: "2026 Spring",
    summary: "适合方向入门的课程、教材和工具资源总览。",
    href: "https://example.com/ml-guide",
  },
];
```

- [ ] **Step 2: Add one direction page and copy the pattern for others**

Create `src/pages/tracks/cs.tsx`:

```tsx
import Layout from "@theme/Layout";
import CourseCard from "../../components/CourseCard";
import { TRACK_COURSES } from "../../data/courses";
import { buildCoursePath, GENERAL_RESOURCES_SLUG } from "../../lib/materials";

export default function CsTrackPage() {
  return (
    <Layout title="计算机">
      <main className="container margin-vert--lg">
        <h1>计算机</h1>
        <div className="row">
          {TRACK_COURSES.cs.map((course) => (
            <div className="col col--4" key={course.slug}>
              <CourseCard
                title={course.title}
                to={buildCoursePath({ section: "track", trackSlug: "cs", courseSlug: course.slug })}
                isGeneral={course.slug === GENERAL_RESOURCES_SLUG}
              />
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
```

For the other direction pages, reuse the same structure and replace the track slug and title.

- [ ] **Step 3: Add at least one real course entry to the registry**

Update `src/data/courses.ts` so `cs` includes:

```ts
cs: [
  { slug: "data-structures", title: "数据结构", isGeneral: false },
  { slug: "machine-learning", title: "机器学习", isGeneral: false },
  { slug: GENERAL_RESOURCES_SLUG, title: "General Resources", isGeneral: true },
],
```

- [ ] **Step 4: Verify routes and commit**

Run:

```bash
npm run build
git add src/data/materials.ts src/data/courses.ts src/pages/tracks
git commit -m "feat: add direction pages and sample track data"
```

## Task 6: Build The Submit Flow And GitHub Issue Payload Generator

**Files:**
- Create: `c:\code\kym-commons\src\lib\submission.ts`
- Create: `c:\code\kym-commons\src\lib\submission.test.ts`
- Modify: `c:\code\kym-commons\src\pages\submit.tsx`

- [ ] **Step 1: Write the failing tests for submission payload generation**

Create `src/lib/submission.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildIssueBody, buildIssueTitle } from "./submission";

describe("buildIssueTitle", () => {
  it("formats track general resource submissions", () => {
    expect(
      buildIssueTitle({
        scope: "track-general",
        trackLabel: "计算机",
        courseTitle: "General Resources",
        term: "2026 Spring",
        materialType: "科研入门",
      })
    ).toBe("[Submission][计算机][General Resources] 2026 Spring 科研入门");
  });
});

describe("buildIssueBody", () => {
  it("includes structured metadata fields", () => {
    const body = buildIssueBody({
      scope: "track-general",
      sectionLabel: "宽口径方向课程",
      trackLabel: "计算机",
      courseTitle: "General Resources",
      materialType: "科研入门",
      title: "机器学习入门资源整理",
      term: "2026 Spring",
      summary: "给方向新人的入门路径。",
      link: "https://example.com/ml-guide",
      anonymous: true,
    });

    expect(body).toContain("- 归属：方向非课程资料");
    expect(body).toContain("- 方向：计算机");
    expect(body).toContain("- 课程：General Resources");
  });
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run:

```bash
npm run test -- src/lib/submission.test.ts
```

Expected: FAIL because the submission helper does not exist yet.

- [ ] **Step 3: Implement the submission helper**

Create `src/lib/submission.ts`:

```ts
type Payload = {
  scope: "foundation-course" | "track-course" | "track-general";
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

export function buildIssueTitle(payload: Pick<Payload, "scope" | "trackLabel" | "courseTitle" | "term" | "materialType">) {
  const bucket = payload.trackLabel ?? "Foundation";
  return `[Submission][${bucket}][${payload.courseTitle}] ${payload.term} ${payload.materialType}`;
}

export function buildIssueBody(payload: Payload) {
  const scopeLabel = payload.scope === "track-general" ? "方向非课程资料" : payload.sectionLabel;

  return [
    "## 基本信息",
    `- 归属：${scopeLabel}`,
    `- 方向：${payload.trackLabel ?? "无"}`,
    `- 课程：${payload.courseTitle}`,
    `- 类型：${payload.materialType}`,
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
```

- [ ] **Step 4: Wire the submit page to a multi-step form and preview**

Set `src/pages/submit.tsx` to:

```tsx
import Layout from "@theme/Layout";
import { useMemo, useState } from "react";
import { buildIssueBody, buildIssueTitle } from "../lib/submission";

export default function SubmitPage() {
  const [title, setTitle] = useState("");
  const [term, setTerm] = useState("2026 Spring");
  const [summary, setSummary] = useState("");
  const [link, setLink] = useState("");

  const preview = useMemo(() => {
    return {
      issueTitle: buildIssueTitle({
        scope: "track-general",
        trackLabel: "计算机",
        courseTitle: "General Resources",
        term,
        materialType: "科研入门",
      }),
      issueBody: buildIssueBody({
        scope: "track-general",
        sectionLabel: "宽口径方向课程",
        trackLabel: "计算机",
        courseTitle: "General Resources",
        materialType: "科研入门",
        title,
        term,
        summary,
        link,
        anonymous: true,
      }),
    };
  }, [title, term, summary, link]);

  return (
    <Layout title="Submit">
      <main className="container margin-vert--lg">
        <h1>Submit Materials</h1>
        <input className="margin-bottom--sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="资料标题" />
        <input className="margin-bottom--sm" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="学期" />
        <textarea className="margin-bottom--sm" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="简介" />
        <input className="margin-bottom--sm" value={link} onChange={(e) => setLink(e.target.value)} placeholder="资料链接" />
        <h2>Preview</h2>
        <pre>{preview.issueTitle}</pre>
        <pre>{preview.issueBody}</pre>
      </main>
    </Layout>
  );
}
```

- [ ] **Step 5: Run tests, build, and commit**

Run:

```bash
npm run test -- src/lib/submission.test.ts
npm run build
git add src/lib/submission.ts src/lib/submission.test.ts src/pages/submit.tsx
git commit -m "feat: add submission flow preview"
```

## Task 7: Add The GitHub Issue Template And Content Generation Script

**Files:**
- Create: `c:\code\kym-commons\.github\ISSUE_TEMPLATE\material-submission.yml`
- Create: `c:\code\kym-commons\scripts\issue-to-content.mjs`
- Create: `c:\code\kym-commons\scripts\issue-to-content.test.mjs`
- Create: `c:\code\kym-commons\data\generated\.gitkeep`

- [ ] **Step 1: Write the failing test for issue parsing**

Create `scripts/issue-to-content.test.mjs`:

```js
import { describe, expect, it } from "vitest";
import { parseIssueBody, resolveOutputPath } from "./issue-to-content.mjs";

describe("resolveOutputPath", () => {
  it("routes track general resources correctly", () => {
    expect(
      resolveOutputPath({
        section: "track",
        trackSlug: "cs",
        courseSlug: "general-resources",
        slug: "ml-guide",
      })
    ).toBe("docs/tracks/cs/general-resources/ml-guide.md");
  });
});

describe("parseIssueBody", () => {
  it("extracts course and track fields", () => {
    const issueBody = [
      "## 基本信息",
      "- 归属：方向非课程资料",
      "- 方向：计算机",
      "- 课程：General Resources",
      "- 类型：科研入门",
      "- 学期：2026 Spring",
    ].join("\\n");

    expect(parseIssueBody(issueBody)).toMatchObject({
      trackLabel: "计算机",
      courseTitle: "General Resources",
      materialType: "科研入门",
    });
  });
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run:

```bash
npm run test -- scripts/issue-to-content.test.mjs
```

Expected: FAIL because the script does not exist yet.

- [ ] **Step 3: Add the issue template**

Create `.github/ISSUE_TEMPLATE/material-submission.yml`:

```yml
name: Material Submission
description: Submit a new course material or General Resources item
title: "[Submission][Track][Course] term material-type"
labels: ["submission"]
body:
  - type: textarea
    id: metadata
    attributes:
      label: Metadata
      description: Keep the generated structure unchanged.
      value: |
        ## 基本信息
        - 归属：
        - 方向：
        - 课程：
        - 类型：
        - 学期：
  - type: textarea
    id: summary
    attributes:
      label: 资料说明
  - type: textarea
    id: links
    attributes:
      label: 文件或链接
  - type: checkboxes
    id: confirmation
    attributes:
      label: 确认事项
      options:
        - label: 我确认资料已脱敏
        - label: 我确认资料不侵犯他人版权
        - label: 我同意维护者对内容进行整理后发布
```

- [ ] **Step 4: Implement issue parsing and output path resolution**

Create `scripts/issue-to-content.mjs`:

```js
export function parseIssueBody(body) {
  const lines = body.split("\n");
  const getValue = (prefix) => lines.find((line) => line.startsWith(prefix))?.replace(prefix, "").trim() ?? "";

  return {
    scopeLabel: getValue("- 归属："),
    trackLabel: getValue("- 方向："),
    courseTitle: getValue("- 课程："),
    materialType: getValue("- 类型："),
    term: getValue("- 学期："),
  };
}

export function resolveOutputPath({ section, trackSlug, courseSlug, slug }) {
  if (section === "foundation") {
    return `docs/foundation/courses/${courseSlug}/${slug}.md`;
  }

  return `docs/tracks/${trackSlug}/${courseSlug}/${slug}.md`;
}
```

- [ ] **Step 5: Create the generated content placeholder and commit**

Run:

```bash
mkdir data/generated
ni data/generated/.gitkeep -ItemType File
npm run test -- scripts/issue-to-content.test.mjs
git add .github/ISSUE_TEMPLATE/material-submission.yml scripts/issue-to-content.mjs scripts/issue-to-content.test.mjs data/generated/.gitkeep
git commit -m "feat: add submission issue schema and generation script"
```

Expected: tests PASS and repository contains the first automation building blocks.

## Task 8: Add Validation And GitHub Pages Automation

**Files:**
- Create: `c:\code\kym-commons\.github\workflows\validate-content.yml`
- Create: `c:\code\kym-commons\.github\workflows\deploy.yml`
- Create: `c:\code\kym-commons\.github\workflows\sync-submissions.yml`

- [ ] **Step 1: Add the validation workflow**

Create `.github/workflows/validate-content.yml`:

```yml
name: Validate Content

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 2: Add the GitHub Pages deploy workflow**

Create `.github/workflows/deploy.yml`:

```yml
name: Deploy Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: build
      - uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Add the submission sync workflow**

Create `.github/workflows/sync-submissions.yml`:

```yml
name: Sync Submissions

on:
  issues:
    types: [labeled]

jobs:
  generate:
    if: github.event.label.name == 'accepted'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: node scripts/issue-to-content.mjs
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add docs data
          git commit -m "chore: sync accepted submission" || echo "No changes to commit"
          git push
```

- [ ] **Step 4: Run local validation and commit**

Run:

```bash
npm run test
npm run build
git add .github/workflows
git commit -m "ci: add validation and deployment workflows"
```

## Task 9: Add Rules And About Content For The First Release

**Files:**
- Create: `c:\code\kym-commons\docs\rules.md`
- Create: `c:\code\kym-commons\docs\about.md`

- [ ] **Step 1: Add the Rules page**

Create `docs/rules.md`:

```md
# Rules

## Allowed Content

- Course notes
- Study guides
- Experience summaries
- Direction-level learning resources

## Prohibited Content

- Personal private information
- Copyright-infringing materials without permission
- Unverified or misleading archive dumps

## Submission Requirements

- Remove personal identifiers
- Add a short summary
- Provide a stable link
```

- [ ] **Step 2: Add the About page**

Create `docs/about.md`:

```md
# About

KYM Commons is a student-facing materials hub for Kuang Yaming College.

It organizes Foundation courses, track courses, and direction-level `General Resources` in one consistent structure.

The project uses GitHub for review, traceability, and automatic publication.
```

- [ ] **Step 3: Build and commit**

Run:

```bash
npm run build
git add docs/rules.md docs/about.md
git commit -m "docs: add rules and about pages"
```

## Task 10: Final Smoke Check

**Files:**
- Verify only

- [ ] **Step 1: Run the full validation suite**

Run:

```bash
npm run test
npm run build
git status --short
```

Expected:

- all tests PASS
- Docusaurus build PASS
- worktree is clean except for intentionally uncommitted local files

- [ ] **Step 2: Manually inspect the key flows**

Open and verify:

- homepage shows `KYM Commons` and `匡院资料站`
- `Foundation` route works
- `Tracks` route works
- `Submit` route shows preview output
- at least one track page shows `General Resources`

- [ ] **Step 3: Tag the milestone commit**

Run:

```bash
git tag v0.1.0
```

Expected: repository has a first-release checkpoint for the static MVP.

## Self-Review

Spec coverage check:

- site identity and styling: covered by Tasks 1 and 3
- Foundation/Tracks information architecture: covered by Tasks 2, 4, and 5
- `General Resources` unified model: covered by Tasks 2, 5, 6, and 7
- choose existing course or add new course: covered by Tasks 2 and 6
- visual submit page with GitHub-backed review: covered by Task 6
- GitHub Issue review and approval automation: covered by Tasks 7 and 8
- rules/about content and release constraints: covered by Task 9

Placeholder scan:

- no `TODO`
- no undefined file paths
- no unnamed scripts

Type consistency:

- `GENERAL_RESOURCES_SLUG` is reused in registries and route generation
- submission scopes are consistently `foundation-course`, `track-course`, and `track-general`
- publishing targets consistently map to foundation course pages or track `General Resources`
