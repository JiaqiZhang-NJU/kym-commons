# KYM Commons Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the submit page into a four-step wizard, fix dark-mode readability globally, and prepare the repo for first push and public rollout with a custom domain requirement.

**Architecture:** Keep the existing static Docusaurus site and submission generation helpers, but split the submit UI into focused wizard components with shared state managed in one controller. Apply dark-mode readability fixes through global CSS tokens and shared form/preview styles. Update GitHub owner/repo configuration and add maintainer documentation for first push, private-to-public rollout, and custom-domain release gating.

**Tech Stack:** Docusaurus, React, TypeScript, CSS Modules, Vitest, GitHub Actions, GitHub Pages

---

## File Map

### New files

- `c:\code\kym-commons\src\components\submit\SubmitWizard.tsx` - top-level wizard controller and step navigation
- `c:\code\kym-commons\src\components\submit\SubmitStepScope.tsx` - step 1 scope selection UI
- `c:\code\kym-commons\src\components\submit\SubmitStepTarget.tsx` - step 2 target selection UI
- `c:\code\kym-commons\src\components\submit\SubmitStepDetails.tsx` - step 3 material detail fields
- `c:\code\kym-commons\src\components\submit\SubmitStepPreview.tsx` - step 4 preview and submit UI
- `c:\code\kym-commons\src\components\submit\submit.module.css` - wizard-specific layout, stepper, form, and preview styles
- `c:\code\kym-commons\src\lib\submission.test.ts` - expanded tests for wizard-facing submission helpers
- `c:\code\kym-commons\docs\github-setup.md` - maintainer guide for first push, private repo setup, Pages, and custom domain rollout

### Modified files

- `c:\code\kym-commons\src\pages\submit.tsx` - replace monolithic form with wizard shell
- `c:\code\kym-commons\src\lib\submission.ts` - add helper functions and types for wizard state and validation
- `c:\code\kym-commons\src\css\custom.css` - add global dark-mode readability tokens and shared form/preview styles
- `c:\code\kym-commons\docusaurus.config.ts` - point GitHub owner/repo to `JiaqiZhang-NJU/kym-commons`
- `c:\code\kym-commons\src\pages\index.tsx` - optional tiny copy fix if submit CTA wording needs to match new wizard

### Verification commands used throughout

- `npm run test -- src/lib/submission.test.ts`
- `npm run build`
- `git status --short`

---

### Task 1: Expand Submission Helper Tests First

**Files:**
- Modify: `c:\code\kym-commons\src\lib\submission.test.ts`
- Modify: `c:\code\kym-commons\src\lib\submission.ts`
- Test: `c:\code\kym-commons\src\lib\submission.test.ts`

- [ ] **Step 1: Extend the failing tests for wizard behavior**

Add these tests to `c:\code\kym-commons\src\lib\submission.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  buildIssueBody,
  buildIssueTitle,
  buildIssueUrl,
  getDefaultMaterialType,
  getResolvedCourseTitle,
  isScopeStepComplete,
  isTargetStepComplete,
  isDetailsStepComplete,
} from "./submission";

describe("step completion helpers", () => {
  it("accepts any valid submission scope", () => {
    expect(isScopeStepComplete("track-general")).toBe(true);
  });

  it("requires a track for track-general target selection", () => {
    expect(
      isTargetStepComplete({
        scope: "track-general",
        trackSlug: "",
        useNewCourse: false,
        existingCourseSlug: "",
        newCourseTitle: "",
      })
    ).toBe(false);
  });

  it("requires a new course title when creating a course", () => {
    expect(
      isTargetStepComplete({
        scope: "track-course",
        trackSlug: "cs",
        useNewCourse: true,
        existingCourseSlug: "",
        newCourseTitle: "",
      })
    ).toBe(false);
  });

  it("requires details fields before preview", () => {
    expect(
      isDetailsStepComplete({
        title: "机器学习入门资源整理",
        term: "2026 Spring",
        summary: "",
        link: "https://example.com/ml-guide",
      })
    ).toBe(false);
  });
});

describe("submission defaults", () => {
  it("returns general material types for track-general", () => {
    expect(getDefaultMaterialType("track-general")).toBe("科研入门");
  });

  it("resolves General Resources for track-general submissions", () => {
    expect(
      getResolvedCourseTitle({
        scope: "track-general",
        useNewCourse: false,
        newCourseTitle: "",
        selectedCourseTitle: "数据结构",
      })
    ).toBe("General Resources");
  });
});

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
    expect(body).toContain("- 标题：机器学习入门资源整理");
  });
});

describe("buildIssueUrl", () => {
  it("builds new issue URL for the real repository", () => {
    const url = buildIssueUrl({
      repoUrl: "https://github.com/JiaqiZhang-NJU/kym-commons",
      title: "demo",
      body: "body",
    });

    expect(url).toContain("JiaqiZhang-NJU/kym-commons/issues/new");
  });
});
```

- [ ] **Step 2: Run the test file and verify failure**

Run:

```bash
npm run test -- src/lib/submission.test.ts
```

Expected:

- FAIL because the new helper functions do not exist yet

- [ ] **Step 3: Implement minimal helper functions in `submission.ts`**

Add these helpers to `c:\code\kym-commons\src\lib\submission.ts` while preserving existing exports:

```ts
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
    return input.useNewCourse ? input.newCourseTitle.trim().length > 0 : input.existingCourseSlug.trim().length > 0;
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
```

- [ ] **Step 4: Run tests again and verify pass**

Run:

```bash
npm run test -- src/lib/submission.test.ts
```

Expected:

- PASS with all tests in `submission.test.ts`

- [ ] **Step 5: Commit helper and test changes**

Run:

```bash
git add src/lib/submission.ts src/lib/submission.test.ts
git commit -m "test: cover submission wizard helpers"
```

---

### Task 2: Build The Submit Wizard Shell And Step Components

**Files:**
- Create: `c:\code\kym-commons\src\components\submit\SubmitWizard.tsx`
- Create: `c:\code\kym-commons\src\components\submit\SubmitStepScope.tsx`
- Create: `c:\code\kym-commons\src\components\submit\SubmitStepTarget.tsx`
- Create: `c:\code\kym-commons\src\components\submit\SubmitStepDetails.tsx`
- Create: `c:\code\kym-commons\src\components\submit\SubmitStepPreview.tsx`
- Create: `c:\code\kym-commons\src\components\submit\submit.module.css`
- Modify: `c:\code\kym-commons\src\pages\submit.tsx`
- Modify: `c:\code\kym-commons\src\lib\submission.ts`
- Test: `c:\code\kym-commons\src\lib\submission.test.ts`

- [ ] **Step 1: Create wizard styles**

Create `c:\code\kym-commons\src\components\submit\submit.module.css` with:

```css
.wizardShell {
  display: grid;
  gap: 1.5rem;
}

.stepper {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.stepCard {
  border: 1px solid var(--kym-border);
  border-radius: 16px;
  background: var(--kym-surface);
  padding: 1rem;
}

.stepCardActive {
  border-color: var(--ifm-color-primary);
  box-shadow: 0 0 0 1px var(--ifm-color-primary);
}

.panel {
  border: 1px solid var(--kym-border);
  border-radius: 20px;
  background: var(--kym-surface);
  padding: 1.5rem;
  box-shadow: var(--kym-shadow);
}

.field {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.choiceGrid {
  display: grid;
  gap: 1rem;
}

.choiceButton {
  border: 1px solid var(--kym-border);
  border-radius: 16px;
  background: var(--kym-surface);
  color: inherit;
  text-align: left;
  padding: 1rem;
  cursor: pointer;
}

.choiceButtonActive {
  border-color: var(--ifm-color-primary);
  background: var(--kym-surface-emphasis);
}

.muted {
  color: var(--kym-muted-text);
}

.previewBlock {
  border-radius: 16px;
  background: var(--kym-code-surface);
  color: var(--kym-code-text);
  padding: 1rem;
  white-space: pre-wrap;
  overflow-x: auto;
}
```

- [ ] **Step 2: Create step 1 scope selector**

Create `c:\code\kym-commons\src\components\submit\SubmitStepScope.tsx`:

```tsx
import type { SubmissionScope } from "../../lib/submission";
import styles from "./submit.module.css";

type Props = {
  scope: SubmissionScope;
  onSelect: (scope: SubmissionScope) => void;
};

const options: Array<{ scope: SubmissionScope; title: string; description: string }> = [
  { scope: "foundation-course", title: "大类培养课程", description: "面向前三学期的大类培养课程资料。" },
  { scope: "track-course", title: "方向课程", description: "绑定到具体方向课程的笔记、经验与参考资料。" },
  { scope: "track-general", title: "方向非课程资料", description: "会自动发布到对应方向的 General Resources。" },
];

export default function SubmitStepScope({ scope, onSelect }: Props) {
  return (
    <div className={styles.choiceGrid}>
      {options.map((option) => (
        <button
          key={option.scope}
          className={`${styles.choiceButton} ${scope === option.scope ? styles.choiceButtonActive : ""}`}
          onClick={() => onSelect(option.scope)}
          type="button"
        >
          <strong>{option.title}</strong>
          <p className={styles.muted}>{option.description}</p>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create step 2 target selector**

Create `c:\code\kym-commons\src\components\submit\SubmitStepTarget.tsx`:

```tsx
import { FOUNDATION_COURSES, TRACK_COURSES } from "../../data/courses";
import { TRACKS } from "../../data/site";
import type { SubmissionScope } from "../../lib/submission";
import styles from "./submit.module.css";

type Props = {
  scope: SubmissionScope;
  trackSlug: string;
  existingCourseSlug: string;
  useNewCourse: boolean;
  newCourseTitle: string;
  onTrackChange: (value: string) => void;
  onExistingCourseChange: (value: string) => void;
  onUseNewCourseChange: (value: boolean) => void;
  onNewCourseTitleChange: (value: string) => void;
};

export default function SubmitStepTarget(props: Props) {
  const trackCourses = TRACK_COURSES[props.trackSlug as keyof typeof TRACK_COURSES] ?? [];
  const selectableCourses = props.scope === "foundation-course" ? FOUNDATION_COURSES : trackCourses;

  return (
    <>
      {props.scope !== "foundation-course" && (
        <label className={styles.field}>
          <span>所属方向</span>
          <select value={props.trackSlug} onChange={(event) => props.onTrackChange(event.target.value)}>
            {TRACKS.map((track) => (
              <option key={track.slug} value={track.slug}>
                {track.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {props.scope === "track-general" ? (
        <div className={styles.panel}>
          <strong>Publishing target</strong>
          <p className={styles.muted}>
            {TRACKS.find((track) => track.slug === props.trackSlug)?.label ?? "未选择方向"} / General Resources
          </p>
        </div>
      ) : (
        <>
          <label className={styles.field}>
            <span>
              <input
                checked={props.useNewCourse}
                onChange={(event) => props.onUseNewCourseChange(event.target.checked)}
                type="checkbox"
              />{" "}
              新增课程
            </span>
          </label>

          {props.useNewCourse ? (
            <label className={styles.field}>
              <span>课程名称</span>
              <input
                value={props.newCourseTitle}
                onChange={(event) => props.onNewCourseTitleChange(event.target.value)}
                placeholder="输入新课程名称"
              />
            </label>
          ) : (
            <label className={styles.field}>
              <span>已有课程</span>
              <select value={props.existingCourseSlug} onChange={(event) => props.onExistingCourseChange(event.target.value)}>
                {selectableCourses.map((course) => (
                  <option key={course.slug} value={course.slug}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
    </>
  );
}
```

- [ ] **Step 4: Create step 3 details form**

Create `c:\code\kym-commons\src\components\submit\SubmitStepDetails.tsx`:

```tsx
import { COURSE_TYPES, GENERAL_TYPES, type SubmissionScope } from "../../lib/submission";
import styles from "./submit.module.css";

type Props = {
  scope: SubmissionScope;
  materialType: string;
  title: string;
  term: string;
  summary: string;
  link: string;
  anonymous: boolean;
  onMaterialTypeChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onTermChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  onAnonymousChange: (value: boolean) => void;
};

export default function SubmitStepDetails(props: Props) {
  const types = props.scope === "track-general" ? GENERAL_TYPES : COURSE_TYPES;

  return (
    <>
      <label className={styles.field}>
        <span>资料类型</span>
        <select value={props.materialType} onChange={(event) => props.onMaterialTypeChange(event.target.value)}>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>资料标题</span>
        <input value={props.title} onChange={(event) => props.onTitleChange(event.target.value)} placeholder="例如：机器学习入门资源整理" />
      </label>

      <label className={styles.field}>
        <span>学期或时间</span>
        <input value={props.term} onChange={(event) => props.onTermChange(event.target.value)} placeholder="2026 Spring" />
      </label>

      <label className={styles.field}>
        <span>简介</span>
        <textarea rows={6} value={props.summary} onChange={(event) => props.onSummaryChange(event.target.value)} placeholder="简要说明资料内容、适用人群和使用建议" />
      </label>

      <label className={styles.field}>
        <span>资料链接</span>
        <input value={props.link} onChange={(event) => props.onLinkChange(event.target.value)} placeholder="https://..." />
      </label>

      <label className={styles.field}>
        <span>
          <input checked={props.anonymous} onChange={(event) => props.onAnonymousChange(event.target.checked)} type="checkbox" /> 匿名发布
        </span>
      </label>
    </>
  );
}
```

- [ ] **Step 5: Create step 4 preview**

Create `c:\code\kym-commons\src\components\submit\SubmitStepPreview.tsx`:

```tsx
import styles from "./submit.module.css";

type Props = {
  targetLabel: string;
  issueTitle: string;
  issueBody: string;
  anonymous: boolean;
  issueUrl: string;
};

export default function SubmitStepPreview({ targetLabel, issueTitle, issueBody, anonymous, issueUrl }: Props) {
  return (
    <>
      <div className={styles.panel}>
        <strong>Resolved target</strong>
        <p className={styles.muted}>{targetLabel}</p>
        <p className={styles.muted}>匿名发布：{anonymous ? "是" : "否"}</p>
      </div>

      <div>
        <h2>Issue Title</h2>
        <pre className={styles.previewBlock}>{issueTitle}</pre>
      </div>

      <div>
        <h2>Issue Body</h2>
        <pre className={styles.previewBlock}>{issueBody}</pre>
      </div>

      <a className="button button--primary button--lg" href={issueUrl} target="_blank" rel="noreferrer">
        Open GitHub Issue
      </a>
    </>
  );
}
```

- [ ] **Step 6: Create wizard controller**

Create `c:\code\kym-commons\src\components\submit\SubmitWizard.tsx`:

```tsx
import { useMemo, useState } from "react";

import { FOUNDATION_COURSES, TRACK_COURSES } from "../../data/courses";
import { TRACKS } from "../../data/site";
import {
  buildIssueBody,
  buildIssueTitle,
  buildIssueUrl,
  getDefaultMaterialType,
  getResolvedCourseTitle,
  isDetailsStepComplete,
  isScopeStepComplete,
  isTargetStepComplete,
  type SubmissionScope,
} from "../../lib/submission";
import SubmitStepDetails from "./SubmitStepDetails";
import SubmitStepPreview from "./SubmitStepPreview";
import SubmitStepScope from "./SubmitStepScope";
import SubmitStepTarget from "./SubmitStepTarget";
import styles from "./submit.module.css";

const steps = ["投稿类型", "归属位置", "资料详情", "预览提交"];

export default function SubmitWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [scope, setScope] = useState<SubmissionScope>("track-general");
  const [trackSlug, setTrackSlug] = useState("cs");
  const [existingCourseSlug, setExistingCourseSlug] = useState("general-resources");
  const [useNewCourse, setUseNewCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [materialType, setMaterialType] = useState(getDefaultMaterialType("track-general"));
  const [title, setTitle] = useState("");
  const [term, setTerm] = useState("2026 Spring");
  const [summary, setSummary] = useState("");
  const [link, setLink] = useState("");
  const [anonymous, setAnonymous] = useState(true);

  const trackLabel = TRACKS.find((track) => track.slug === trackSlug)?.label ?? null;
  const selectedTrackCourses = TRACK_COURSES[trackSlug as keyof typeof TRACK_COURSES] ?? [];
  const selectedCourseTitle =
    scope === "foundation-course"
      ? FOUNDATION_COURSES.find((course) => course.slug === existingCourseSlug)?.title ?? ""
      : selectedTrackCourses.find((course) => course.slug === existingCourseSlug)?.title ?? "";

  const courseTitle = getResolvedCourseTitle({
    scope,
    useNewCourse,
    newCourseTitle,
    selectedCourseTitle,
  });

  const sectionLabel = scope === "foundation-course" ? "大类培养课程" : "宽口径方向课程";
  const targetLabel =
    scope === "foundation-course"
      ? `Foundation / ${courseTitle}`
      : `${trackLabel ?? "未选择方向"} / ${courseTitle}`;

  const preview = useMemo(() => {
    const issueTitle = buildIssueTitle({ scope, trackLabel, courseTitle, term, materialType });
    const issueBody = buildIssueBody({
      scope,
      sectionLabel,
      trackLabel,
      courseTitle,
      materialType,
      title,
      term,
      summary,
      link,
      anonymous,
    });

    return {
      issueTitle,
      issueBody,
      issueUrl: buildIssueUrl({
        repoUrl: "https://github.com/JiaqiZhang-NJU/kym-commons",
        title: issueTitle,
        body: issueBody,
      }),
    };
  }, [anonymous, courseTitle, link, materialType, scope, sectionLabel, summary, term, title, trackLabel]);

  const canGoNext =
    stepIndex === 0
      ? isScopeStepComplete(scope)
      : stepIndex === 1
        ? isTargetStepComplete({ scope, trackSlug, useNewCourse, existingCourseSlug, newCourseTitle })
        : stepIndex === 2
          ? isDetailsStepComplete({ title, term, summary, link })
          : true;

  const handleScopeChange = (nextScope: SubmissionScope) => {
    setScope(nextScope);
    setMaterialType(getDefaultMaterialType(nextScope));
    if (nextScope === "track-general") {
      setUseNewCourse(false);
      setExistingCourseSlug("general-resources");
    }
  };

  return (
    <div className={styles.wizardShell}>
      <div className={styles.stepper}>
        {steps.map((step, index) => (
          <div key={step} className={`${styles.stepCard} ${index === stepIndex ? styles.stepCardActive : ""}`}>
            <strong>{index + 1}. {step}</strong>
          </div>
        ))}
      </div>

      <div className={styles.panel}>
        {stepIndex === 0 && <SubmitStepScope scope={scope} onSelect={handleScopeChange} />}
        {stepIndex === 1 && (
          <SubmitStepTarget
            scope={scope}
            trackSlug={trackSlug}
            existingCourseSlug={existingCourseSlug}
            useNewCourse={useNewCourse}
            newCourseTitle={newCourseTitle}
            onTrackChange={setTrackSlug}
            onExistingCourseChange={setExistingCourseSlug}
            onUseNewCourseChange={setUseNewCourse}
            onNewCourseTitleChange={setNewCourseTitle}
          />
        )}
        {stepIndex === 2 && (
          <SubmitStepDetails
            scope={scope}
            materialType={materialType}
            title={title}
            term={term}
            summary={summary}
            link={link}
            anonymous={anonymous}
            onMaterialTypeChange={setMaterialType}
            onTitleChange={setTitle}
            onTermChange={setTerm}
            onSummaryChange={setSummary}
            onLinkChange={setLink}
            onAnonymousChange={setAnonymous}
          />
        )}
        {stepIndex === 3 && (
          <SubmitStepPreview
            targetLabel={targetLabel}
            issueTitle={preview.issueTitle}
            issueBody={preview.issueBody}
            anonymous={anonymous}
            issueUrl={preview.issueUrl}
          />
        )}

        <div className={styles.actions}>
          <button className="button button--secondary" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => value - 1)} type="button">
            Back
          </button>
          <button className="button button--primary" disabled={!canGoNext || stepIndex === 3} onClick={() => setStepIndex((value) => value + 1)} type="button">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Replace submit page contents with wizard shell**

Update `c:\code\kym-commons\src\pages\submit.tsx` to:

```tsx
import Layout from "@theme/Layout";

import SubmitWizard from "../components/submit/SubmitWizard";

export default function SubmitPage() {
  return (
    <Layout title="Submit">
      <main className="container margin-vert--lg">
        <h1>Submit Materials</h1>
        <p>按步骤整理投稿信息，预览生成内容后再跳转到 GitHub Issue 完成提交。</p>
        <SubmitWizard />
      </main>
    </Layout>
  );
}
```

- [ ] **Step 8: Run tests and build**

Run:

```bash
npm run test -- src/lib/submission.test.ts
npm run build
```

Expected:

- tests PASS
- build PASS

- [ ] **Step 9: Commit the wizard UI**

Run:

```bash
git add src/pages/submit.tsx src/components/submit src/lib/submission.ts
git commit -m "feat: add multi-step submission wizard"
```

---

### Task 3: Fix Dark Mode Readability With Shared Tokens

**Files:**
- Modify: `c:\code\kym-commons\src\css\custom.css`
- Modify: `c:\code\kym-commons\src\components\submit\submit.module.css`
- Test: `c:\code\kym-commons\src\pages\submit.tsx`

- [ ] **Step 1: Add global light and dark surface/text tokens**

Update `c:\code\kym-commons\src\css\custom.css` by extending the existing token blocks with:

```css
:root {
  --kym-surface-emphasis: #f5effb;
  --kym-muted-text: #5f6472;
  --kym-input-surface: #ffffff;
  --kym-input-text: #1f2430;
  --kym-input-placeholder: #7c8393;
  --kym-code-surface: #f4f2f8;
  --kym-code-text: #1f2430;
}

[data-theme='dark'] {
  --ifm-background-color: #121019;
  --ifm-font-color-base: #f2eff8;
  --kym-surface: #1a1623;
  --kym-surface-emphasis: #241d31;
  --kym-border: #3a3150;
  --kym-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  --kym-muted-text: #c7bdd9;
  --kym-input-surface: #171320;
  --kym-input-text: #f5f2fb;
  --kym-input-placeholder: #9f96b2;
  --kym-code-surface: #171320;
  --kym-code-text: #f5f2fb;
}
```

- [ ] **Step 2: Add shared dark-mode form and preview rules**

Also append these rules in `c:\code\kym-commons\src\css\custom.css`:

```css
input,
select,
textarea {
  width: 100%;
  border: 1px solid var(--kym-border);
  border-radius: 12px;
  background: var(--kym-input-surface);
  color: var(--kym-input-text);
  padding: 0.75rem 0.875rem;
}

input::placeholder,
textarea::placeholder {
  color: var(--kym-input-placeholder);
}

pre,
code {
  color: var(--kym-code-text);
}

a {
  color: var(--ifm-color-primary-lightest);
}

[data-theme='dark'] .navbar,
[data-theme='dark'] .footer {
  color: var(--ifm-font-color-base);
}
```

- [ ] **Step 3: Tighten wizard-specific contrast where needed**

Update `c:\code\kym-commons\src\components\submit\submit.module.css` by adding:

```css
.panel :global(h2),
.panel :global(h3),
.panel :global(label),
.panel :global(strong) {
  color: var(--ifm-font-color-base);
}

.previewBlock {
  border: 1px solid var(--kym-border);
}
```

- [ ] **Step 4: Build and verify no regressions**

Run:

```bash
npm run build
```

Expected:

- PASS with no theme or CSS errors

- [ ] **Step 5: Commit dark mode fixes**

Run:

```bash
git add src/css/custom.css src/components/submit/submit.module.css
git commit -m "fix: improve dark mode readability"
```

---

### Task 4: Point The Site To The Real GitHub Repository

**Files:**
- Modify: `c:\code\kym-commons\docusaurus.config.ts`
- Modify: `c:\code\kym-commons\src\components\submit\SubmitWizard.tsx`
- Test: `c:\code\kym-commons\src\lib\submission.test.ts`

- [ ] **Step 1: Update the Docusaurus GitHub owner fallback**

In `c:\code\kym-commons\docusaurus.config.ts`, set:

```ts
const projectName = 'kym-commons';
const organizationName = process.env.GITHUB_REPOSITORY_OWNER ?? 'JiaqiZhang-NJU';
```

Keep `projectName` unchanged as `kym-commons`.

- [ ] **Step 2: Update submit preview repository URL**

In `c:\code\kym-commons\src\components\submit\SubmitWizard.tsx`, make sure `buildIssueUrl` uses:

```ts
repoUrl: "https://github.com/JiaqiZhang-NJU/kym-commons",
```

- [ ] **Step 3: Run focused test and build**

Run:

```bash
npm run test -- src/lib/submission.test.ts
npm run build
```

Expected:

- PASS for both commands

- [ ] **Step 4: Commit repository config updates**

Run:

```bash
git add docusaurus.config.ts src/components/submit/SubmitWizard.tsx src/lib/submission.test.ts
git commit -m "chore: point project to real github repository"
```

---

### Task 5: Add Maintainer GitHub Setup And Public Rollout Docs

**Files:**
- Create: `c:\code\kym-commons\docs\github-setup.md`
- Modify: `c:\code\kym-commons\docs\about.md`
- Test: `c:\code\kym-commons\docusaurus.config.ts`

- [ ] **Step 1: Write the GitHub setup document**

Create `c:\code\kym-commons\docs\github-setup.md` with:

```md
# GitHub Setup

## Repository

- Owner: `JiaqiZhang-NJU`
- Name: `kym-commons`
- Visibility: private first, public later

## First Push

```bash
git remote add origin https://github.com/JiaqiZhang-NJU/kym-commons.git
git push -u origin main
```

## Actions And Pages

1. Open repository settings.
2. Confirm GitHub Actions is enabled.
3. In Pages settings, choose GitHub Actions as the source.
4. Keep the repository private during internal setup.

## Public Rollout Gate

Do not announce the site to students with the default GitHub Pages URL.

The public release must happen only after:

1. a custom domain is configured
2. DNS is pointed correctly
3. HTTPS is active
4. the final public URL no longer exposes the GitHub username

## Suggested Public URL Patterns

- `https://commons.<your-domain>/`
- `https://kym.<your-domain>/`
- `https://materials.<your-domain>/`
```

- [ ] **Step 2: Link setup guidance from About page**

Append this block to `c:\code\kym-commons\docs\about.md`:

```md
## Maintainer Notes

Maintainers should follow the GitHub setup guide in [`GitHub Setup`](./github-setup.md) before the first push and before any public rollout.
```

- [ ] **Step 3: Build docs to verify pages render**

Run:

```bash
npm run build
```

Expected:

- PASS and docs page included without broken links

- [ ] **Step 4: Commit setup docs**

Run:

```bash
git add docs/github-setup.md docs/about.md
git commit -m "docs: add github setup and rollout guide"
```

---

### Task 6: Final Verification And Cleanup

**Files:**
- Modify: none expected
- Test: full project verification

- [ ] **Step 1: Run the relevant tests**

Run:

```bash
npm run test
```

Expected:

- PASS for the full Vitest suite

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected:

- PASS with no broken links

- [ ] **Step 3: Check working tree**

Run:

```bash
git status --short
```

Expected:

- no unexpected unstaged changes

- [ ] **Step 4: Create a final checkpoint commit if needed**

If verification introduced tracked file changes, run:

```bash
git add -A
git commit -m "chore: finalize submit wizard enhancement"
```

If no files changed, skip this commit.

---

## Self-Review Notes

- Spec coverage:
  - submit wizard is covered by Task 1 and Task 2
  - dark mode readability is covered by Task 3
  - real repo configuration is covered by Task 4
  - first push and custom-domain rollout docs are covered by Task 5
- Placeholder scan:
  - removed generic placeholders and included exact file paths, code blocks, and commands
- Type consistency:
  - plan standardizes on `SubmissionScope`, `TargetStepState`, `DetailStepState`, and `getResolvedCourseTitle`
