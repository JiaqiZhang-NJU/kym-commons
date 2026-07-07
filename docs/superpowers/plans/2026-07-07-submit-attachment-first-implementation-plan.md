# Submit Attachment-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the submit wizard so `GitHub Issue 附件` is the default file handoff mode, external links become optional, and contributors no longer need to provide a mandatory material link.

**Architecture:** Keep the four-step wizard structure and change only the details, validation, and preview layers. Add a source-mode type and conditional validation in `src/lib/submission.ts`, update the details step to render a source-mode selector with conditional link input, and update preview content so attachment-mode users are explicitly instructed to upload files in GitHub Issue after opening the generated issue.

**Tech Stack:** Docusaurus 3, React 19, TypeScript, Vitest

---

## File Structure

- Modify: `src/lib/submission.ts`
  - Add source-mode types, conditional validation, and updated issue body generation.
- Modify: `src/lib/submission.test.ts`
  - Add tests for conditional validation and new issue-body structure.
- Modify: `src/components/submit/SubmitStepDetails.tsx`
  - Replace mandatory link input with source-mode-first UI and conditional external-link field.
- Modify: `src/components/submit/SubmitStepPreview.tsx`
  - Show source mode, external-link presence, and attachment reminder.
- Modify: `src/components/submit/SubmitWizard.tsx`
  - Add source-mode state, pass new props through, and use updated validation/payload shape.
- Modify: `src/components/submit/submit.module.css`
  - Add minimal styling for source-mode selector and inline attachment guidance.

### Task 1: Add Source Mode To Submission Logic

**Files:**
- Modify: `src/lib/submission.ts`
- Test: `src/lib/submission.test.ts`

- [ ] **Step 1: Write the failing tests**

Update `src/lib/submission.test.ts` imports and add these tests:

```ts
import {
  buildIssueBody,
  buildIssueTitle,
  buildIssueUrl,
  getDefaultMaterialType,
  getDefaultSourceMode,
  getResolvedCourseTitle,
  isDetailsStepComplete,
  isScopeStepComplete,
  isTargetStepComplete,
} from "./submission";

describe("step completion helpers", () => {
  it("allows attachment mode without an external link", () => {
    expect(
      isDetailsStepComplete({
        title: "机器学习入门资源整理",
        term: "2026 Spring",
        summary: "给方向新人的入门路径。",
        sourceMode: "issue-attachment",
        externalLink: "",
      })
    ).toBe(true);
  });

  it("requires an external link in external-link mode", () => {
    expect(
      isDetailsStepComplete({
        title: "机器学习入门资源整理",
        term: "2026 Spring",
        summary: "给方向新人的入门路径。",
        sourceMode: "external-link",
        externalLink: "",
      })
    ).toBe(false);
  });
});

describe("submission defaults", () => {
  it("defaults to issue attachment mode", () => {
    expect(getDefaultSourceMode()).toBe("issue-attachment");
  });
});

describe("buildIssueBody", () => {
  it("records attachment mode without forcing a link", () => {
    const body = buildIssueBody({
      scope: "track-general",
      sectionLabel: "宽口径方向课程",
      trackLabel: "计算机",
      courseTitle: "General Resources",
      materialType: "科研入门",
      title: "机器学习入门资源整理",
      term: "2026 Spring",
      summary: "给方向新人的入门路径。",
      sourceMode: "issue-attachment",
      externalLink: "",
      anonymous: true,
    });

    expect(body).toContain("## 文件来源");
    expect(body).toContain("- 来源方式：GitHub Issue 附件");
    expect(body).toContain("- 外部链接：无");
    expect(body).toContain("## 上传说明");
  });

  it("records external-link mode with the given url", () => {
    const body = buildIssueBody({
      scope: "track-general",
      sectionLabel: "宽口径方向课程",
      trackLabel: "计算机",
      courseTitle: "General Resources",
      materialType: "科研入门",
      title: "机器学习入门资源整理",
      term: "2026 Spring",
      summary: "给方向新人的入门路径。",
      sourceMode: "external-link",
      externalLink: "https://example.com/ml-guide",
      anonymous: true,
    });

    expect(body).toContain("- 来源方式：外部链接");
    expect(body).toContain("- 外部链接：https://example.com/ml-guide");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test
```

Expected: FAIL because `getDefaultSourceMode`, `sourceMode`, and `externalLink` do not exist yet in the submission logic.

- [ ] **Step 3: Write minimal implementation**

Update `src/lib/submission.ts` to add the new type and conditional validation:

```ts
export type FileSourceMode = "issue-attachment" | "external-link";

export type DetailStepState = {
  title: string;
  term: string;
  summary: string;
  sourceMode: FileSourceMode;
  externalLink: string;
};

export type SubmissionPayload = {
  scope: SubmissionScope;
  sectionLabel: string;
  trackLabel: string | null;
  courseTitle: string;
  materialType: MaterialType;
  title: string;
  term: string;
  summary: string;
  sourceMode: FileSourceMode;
  externalLink: string;
  anonymous: boolean;
};

export function getDefaultSourceMode(): FileSourceMode {
  return "issue-attachment";
}

export function isDetailsStepComplete(input: DetailStepState) {
  const baseComplete =
    input.title.trim().length > 0 &&
    input.term.trim().length > 0 &&
    input.summary.trim().length > 0 &&
    input.sourceMode.length > 0;

  if (!baseComplete) {
    return false;
  }

  if (input.sourceMode === "external-link") {
    return input.externalLink.trim().length > 0;
  }

  return true;
}
```

Then update `buildIssueBody` in the same file:

```ts
export function buildIssueBody(payload: SubmissionPayload) {
  const scopeLabel = payload.scope === "track-general" ? "方向非课程资料" : payload.sectionLabel;
  const sourceLabel = payload.sourceMode === "issue-attachment" ? "GitHub Issue 附件" : "外部链接";
  const externalLinkLabel = payload.externalLink.trim().length > 0 ? payload.externalLink : "无";
  const uploadSection =
    payload.sourceMode === "issue-attachment"
      ? ["", "## 上传说明", "- [ ] 我会在创建 Issue 后上传资料附件"]
      : [];

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npm run test
```

Expected: PASS for the updated submission tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/submission.ts src/lib/submission.test.ts
git commit -m "feat: add attachment-first submission logic"
```

### Task 2: Update The Details Step UI

**Files:**
- Modify: `src/components/submit/SubmitStepDetails.tsx`
- Modify: `src/components/submit/submit.module.css`

- [ ] **Step 1: Add the failing prop contract**

Update the props in `src/components/submit/SubmitStepDetails.tsx`:

```ts
import {
  COURSE_TYPES,
  GENERAL_TYPES,
  type FileSourceMode,
  type MaterialType,
  type SubmissionScope,
} from "../../lib/submission";

type Props = {
  scope: SubmissionScope;
  materialType: MaterialType;
  sourceMode: FileSourceMode;
  title: string;
  term: string;
  summary: string;
  externalLink: string;
  anonymous: boolean;
  onMaterialTypeChange: (value: MaterialType) => void;
  onSourceModeChange: (value: FileSourceMode) => void;
  onTitleChange: (value: string) => void;
  onTermChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onExternalLinkChange: (value: string) => void;
  onAnonymousChange: (value: boolean) => void;
};
```

This temporarily breaks `SubmitWizard.tsx`, which is expected until Task 3 wires the props.

- [ ] **Step 2: Update the details-step markup**

Replace the old mandatory link field in `src/components/submit/SubmitStepDetails.tsx` with:

```tsx
      <fieldset className={styles.field}>
        <legend>文件来源</legend>
        <div className={styles.choiceGrid}>
          <button
            className={`${styles.choiceButton} ${props.sourceMode === "issue-attachment" ? styles.choiceButtonActive : ""}`}
            onClick={() => props.onSourceModeChange("issue-attachment")}
            type="button"
          >
            <strong>GitHub Issue 附件</strong>
            <div className={styles.muted}>推荐。提交到 GitHub Issue 后再上传本地文件附件。</div>
          </button>
          <button
            className={`${styles.choiceButton} ${props.sourceMode === "external-link" ? styles.choiceButtonActive : ""}`}
            onClick={() => props.onSourceModeChange("external-link")}
            type="button"
          >
            <strong>外部链接</strong>
            <div className={styles.muted}>适用于资料已经托管在稳定外链位置的情况。</div>
          </button>
        </div>
      </fieldset>

      {props.sourceMode === "issue-attachment" ? (
        <div className={styles.helperBox}>
          提交到 GitHub Issue 后，请将文件拖拽上传到 Issue 描述区或评论区。
        </div>
      ) : (
        <label className={styles.field}>
          <span>外部链接</span>
          <input
            value={props.externalLink}
            onChange={(event) => props.onExternalLinkChange(event.target.value)}
            placeholder="https://..."
          />
        </label>
      )}
```

- [ ] **Step 3: Add the supporting styles**

Append to `src/components/submit/submit.module.css`:

```css
.helperBox {
  border: 1px dashed var(--ifm-color-primary);
  border-radius: 16px;
  background: var(--kym-surface-emphasis);
  color: var(--ifm-font-color-base);
  padding: 1rem;
  margin-bottom: 1rem;
}

.fieldsetReset {
  margin: 0;
  padding: 0;
  border: 0;
}
```

Then use `className={`${styles.field} ${styles.fieldsetReset}`}` on the new `<fieldset>`.

- [ ] **Step 4: Run diagnostics**

Run:

```bash
npm run typecheck
```

Expected: FAIL or type errors in `SubmitWizard.tsx` because the new props are not wired yet. This is acceptable before Task 3.

- [ ] **Step 5: Commit**

Do not commit yet. This task intentionally leaves the tree in a temporary broken state until Task 3.

### Task 3: Wire Wizard State And Preview

**Files:**
- Modify: `src/components/submit/SubmitWizard.tsx`
- Modify: `src/components/submit/SubmitStepPreview.tsx`

- [ ] **Step 1: Add source-mode state to the wizard**

Update imports and state in `src/components/submit/SubmitWizard.tsx`:

```ts
import {
  buildIssueBody,
  buildIssueTitle,
  buildIssueUrl,
  getDefaultMaterialType,
  getDefaultSourceMode,
  getResolvedCourseTitle,
  isDetailsStepComplete,
  isScopeStepComplete,
  isTargetStepComplete,
  type FileSourceMode,
  type MaterialType,
  type SubmissionScope,
} from "../../lib/submission";

const [sourceMode, setSourceMode] = useState<FileSourceMode>(getDefaultSourceMode());
const [externalLink, setExternalLink] = useState("");
```

- [ ] **Step 2: Update validation and payload flow**

Update the preview payload and details-step completion check in `src/components/submit/SubmitWizard.tsx`:

```ts
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
    sourceMode,
    externalLink,
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
}, [anonymous, courseTitle, externalLink, materialType, scope, sectionLabel, sourceMode, summary, term, title, trackLabel]);

const canGoNext =
  stepIndex === 0
    ? isScopeStepComplete(scope)
    : stepIndex === 1
      ? isTargetStepComplete({ scope, trackSlug, useNewCourse, existingCourseSlug, newCourseTitle })
      : stepIndex === 2
        ? isDetailsStepComplete({ title, term, summary, sourceMode, externalLink })
        : true;
```

- [ ] **Step 3: Pass the new props to details and preview**

Update the details and preview usage in `src/components/submit/SubmitWizard.tsx`:

```tsx
        {stepIndex === 2 && (
          <SubmitStepDetails
            scope={scope}
            materialType={materialType}
            sourceMode={sourceMode}
            title={title}
            term={term}
            summary={summary}
            externalLink={externalLink}
            anonymous={anonymous}
            onMaterialTypeChange={setMaterialType}
            onSourceModeChange={setSourceMode}
            onTitleChange={setTitle}
            onTermChange={setTerm}
            onSummaryChange={setSummary}
            onExternalLinkChange={setExternalLink}
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
            sourceMode={sourceMode}
            externalLink={externalLink}
          />
        )}
```

Then update `src/components/submit/SubmitStepPreview.tsx` props and UI:

```tsx
type Props = {
  targetLabel: string;
  issueTitle: string;
  issueBody: string;
  anonymous: boolean;
  issueUrl: string;
  sourceMode: "issue-attachment" | "external-link";
  externalLink: string;
};

export default function SubmitStepPreview({
  targetLabel,
  issueTitle,
  issueBody,
  anonymous,
  issueUrl,
  sourceMode,
  externalLink,
}: Props) {
  const sourceLabel = sourceMode === "issue-attachment" ? "GitHub Issue 附件" : "外部链接";

  return (
    <>
      <div className={styles.panel}>
        <strong>Resolved target</strong>
        <p className={styles.muted}>{targetLabel}</p>
        <p className={styles.muted}>文件来源：{sourceLabel}</p>
        <p className={styles.muted}>外部链接：{externalLink.trim().length > 0 ? externalLink : "无"}</p>
        <p className={styles.muted}>匿名发布：{anonymous ? "是" : "否"}</p>
        {sourceMode === "issue-attachment" ? (
          <p className={styles.muted}>下一步：打开 GitHub Issue 后，请将资料文件上传为附件。</p>
        ) : null}
      </div>
```

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run typecheck
npm run test
npm run build
```

Expected:

- `npm run typecheck`: PASS
- `npm run test`: PASS
- `npm run build`: PASS

- [ ] **Step 5: Commit**

Run:

```bash
git add src/components/submit/SubmitWizard.tsx src/components/submit/SubmitStepDetails.tsx src/components/submit/SubmitStepPreview.tsx src/components/submit/submit.module.css
git commit -m "feat: make submit flow attachment-first"
```

### Task 4: Final Manual Review And Push

**Files:**
- Verify: `src/components/submit/SubmitWizard.tsx`
- Verify: `src/components/submit/SubmitStepDetails.tsx`
- Verify: `src/components/submit/SubmitStepPreview.tsx`
- Verify: `src/lib/submission.ts`

- [ ] **Step 1: Manually verify both submission modes**

Start the local site and verify:

- `GitHub Issue 附件` is selected by default
- in attachment mode, no external-link input is required
- the helper text tells users to upload attachments in GitHub Issue
- in external-link mode, the external-link input appears and becomes required
- preview shows the correct source mode and next-step text

Suggested run command:

```bash
npm run start
```

- [ ] **Step 2: Confirm working tree is clean except intended files**

Run:

```bash
git status --short
```

Expected: only the intended submit-flow files are staged or committed.

- [ ] **Step 3: Push**

Run:

```bash
git push
```

Expected: remote branch updates successfully.

- [ ] **Step 4: Sanity-check the generated issue text**

Open the submit page locally and confirm the generated Issue body includes:

- `## 文件来源`
- `- 来源方式：GitHub Issue 附件` or `- 来源方式：外部链接`
- attachment checklist when relevant

- [ ] **Step 5: Commit tiny polish only if needed**

If no follow-up is needed, do nothing. If a tiny copy or spacing tweak is required after manual review, run:

```bash
git add src/components/submit/SubmitStepDetails.tsx src/components/submit/SubmitStepPreview.tsx src/components/submit/submit.module.css
git commit -m "fix: polish attachment-first submit flow"
git push
```

## Self-Review

- Spec coverage: The plan covers attachment-first source mode, conditional external-link requirement, preview and issue-body redesign, and repository-path responsibility staying outside the contributor UI.
- Placeholder scan: No placeholder instructions, deferred logic, or implicit testing steps remain.
- Type consistency: The plan consistently uses `FileSourceMode`, `sourceMode`, `externalLink`, `getDefaultSourceMode`, and `isDetailsStepComplete` across tests, logic, and UI wiring.
