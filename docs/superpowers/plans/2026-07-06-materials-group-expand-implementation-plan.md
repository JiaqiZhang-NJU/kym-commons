# Materials Group Expand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each materials category on the course materials page show only the first 3 entries by default and allow users to expand or collapse the current category inline.

**Architecture:** Keep the data model unchanged and implement the behavior at the page layer. Add a small pure helper in `src/lib/materials.ts` to compute visible items and hidden counts, test that helper in `src/lib/materials.test.ts`, and use per-category local state in `src/pages/materials.tsx` to drive the toggle UI.

**Tech Stack:** Docusaurus 3, React 19, TypeScript, Vitest

---

## File Structure

- Modify: `src/lib/materials.ts`
  - Add a pure helper to compute the visible subset for one grouped category.
- Modify: `src/lib/materials.test.ts`
  - Add focused tests for the truncation helper.
- Modify: `src/pages/materials.tsx`
  - Add per-category expand state and render `查看更多（还有 N 条）/收起`.
- No new route, component, or data file is needed for this feature.

### Task 1: Add The Truncation Helper

**Files:**
- Modify: `src/lib/materials.ts`
- Test: `src/lib/materials.test.ts`

- [ ] **Step 1: Write the failing test**

Add the import and the new test block in `src/lib/materials.test.ts`:

```ts
import {
  GENERAL_RESOURCES_SLUG,
  buildCoursePath,
  getVisibleGroupItems,
  groupMaterialsByCategory,
  isExternalHref,
  normalizeCourseSlug,
  resolveSubmissionTarget,
} from "./materials";

describe("getVisibleGroupItems", () => {
  const items = [
    { id: "1", title: "A" },
    { id: "2", title: "B" },
    { id: "3", title: "C" },
    { id: "4", title: "D" },
  ];

  it("returns all items when the list is shorter than the limit", () => {
    expect(getVisibleGroupItems(items.slice(0, 2), 3, false)).toEqual({
      visibleItems: items.slice(0, 2),
      hiddenCount: 0,
    });
  });

  it("returns all items when the list length equals the limit", () => {
    expect(getVisibleGroupItems(items.slice(0, 3), 3, false)).toEqual({
      visibleItems: items.slice(0, 3),
      hiddenCount: 0,
    });
  });

  it("returns only the first items and hidden count while collapsed", () => {
    expect(getVisibleGroupItems(items, 3, false)).toEqual({
      visibleItems: items.slice(0, 3),
      hiddenCount: 1,
    });
  });

  it("returns all items while expanded", () => {
    expect(getVisibleGroupItems(items, 3, true)).toEqual({
      visibleItems: items,
      hiddenCount: 0,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test
```

Expected: FAIL in `src/lib/materials.test.ts` because `getVisibleGroupItems` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add the helper near the other material helpers in `src/lib/materials.ts`:

```ts
export function getVisibleGroupItems<T>(items: T[], limit: number, expanded: boolean) {
  if (expanded || items.length <= limit) {
    return {
      visibleItems: items,
      hiddenCount: 0,
    };
  }

  return {
    visibleItems: items.slice(0, limit),
    hiddenCount: items.length - limit,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test
```

Expected: PASS for all tests, including the new helper tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/materials.ts src/lib/materials.test.ts
git commit -m "test: add grouped materials visibility helper"
```

### Task 2: Render Per-Category Expand And Collapse

**Files:**
- Modify: `src/pages/materials.tsx`
- Modify: `src/lib/materials.ts`
- Test: `src/lib/materials.test.ts`

- [ ] **Step 1: Write the failing implementation-oriented test expectation**

Use the same helper-based tests from Task 1 as the behavior contract, and add one more collapsed-state expectation if it is not already covered:

```ts
it("returns the correct hidden count for long groups", () => {
  const items = [
    { id: "1", title: "A" },
    { id: "2", title: "B" },
    { id: "3", title: "C" },
    { id: "4", title: "D" },
    { id: "5", title: "E" },
  ];

  expect(getVisibleGroupItems(items, 3, false)).toEqual({
    visibleItems: items.slice(0, 3),
    hiddenCount: 2,
  });
});
```

- [ ] **Step 2: Run test to verify the helper contract is still green before page wiring**

Run:

```bash
npm run test
```

Expected: PASS. This confirms the helper contract is stable before wiring UI state.

- [ ] **Step 3: Update the page to use per-category expand state**

Update `src/pages/materials.tsx` imports and component body:

```tsx
import Layout from "@theme/Layout";
import { useLocation } from "@docusaurus/router";
import { useMemo, useState } from "react";

import MaterialCard from "../components/MaterialCard";
import { FOUNDATION_COURSES, TRACK_COURSES } from "../data/courses";
import { SAMPLE_MATERIALS } from "../data/materials";
import { getVisibleGroupItems, groupMaterialsByCategory } from "../lib/materials";

const GROUP_PREVIEW_LIMIT = 3;

export default function MaterialsPage() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const section = params.get("section");
  const track = params.get("track");
  const course = params.get("course");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const title =
    section === "foundation"
      ? FOUNDATION_COURSES.find((item) => item.slug === course)?.title ?? "Unknown Course"
      : track && course
        ? TRACK_COURSES[track as keyof typeof TRACK_COURSES]?.find((item) => item.slug === course)?.title ??
          "Unknown Course"
        : "Unknown Course";

  const materials = SAMPLE_MATERIALS.filter((item) => {
    if (section === "foundation") {
      return item.section === "foundation" && item.courseSlug === course;
    }

    return item.section === "track" && item.trackSlug === track && item.courseSlug === course;
  });

  const groupedMaterials = useMemo(() => groupMaterialsByCategory(materials), [materials]);

  function toggleGroup(category: string) {
    setExpandedGroups((current) => ({
      ...current,
      [category]: !current[category],
    }));
  }

  return (
    <Layout title={title}>
      <main className="container margin-vert--lg">
        <h1>{title}</h1>
        <p>
          {section === "foundation"
            ? "Foundation 课程资料页，资料按类别分组展示。"
            : "方向课程或 General Resources 的资料页。"}
        </p>
        <div className="margin-top--lg">
          {groupedMaterials.length > 0 ? (
            groupedMaterials.map((group) => {
              const expanded = expandedGroups[group.category] ?? false;
              const { visibleItems, hiddenCount } = getVisibleGroupItems(
                group.items,
                GROUP_PREVIEW_LIMIT,
                expanded
              );

              return (
                <section className="margin-bottom--xl" key={group.category}>
                  <h2>{group.category}</h2>
                  <div className="margin-top--md">
                    {visibleItems.map((material) => (
                      <MaterialCard
                        key={material.id}
                        title={material.title}
                        type={material.type}
                        term={material.term}
                        summary={material.summary}
                        href={material.href}
                      />
                    ))}
                  </div>
                  {group.items.length > GROUP_PREVIEW_LIMIT ? (
                    <button
                      className="button button--secondary button--sm margin-top--sm"
                      type="button"
                      onClick={() => toggleGroup(group.category)}
                    >
                      {expanded ? "收起" : `查看更多（还有 ${hiddenCount} 条）`}
                    </button>
                  ) : null}
                </section>
              );
            })
          ) : (
            <p>目前该课程下还没有示例资料，后续会通过审核流自动补充。</p>
          )}
        </div>
      </main>
    </Layout>
  );
}
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
git add src/pages/materials.tsx src/lib/materials.ts src/lib/materials.test.ts
git commit -m "feat: collapse long material groups"
```

### Task 3: Final Review And Push

**Files:**
- Modify: none
- Verify: `src/pages/materials.tsx`, `src/lib/materials.ts`, `src/lib/materials.test.ts`

- [ ] **Step 1: Manually verify one long category and one short category**

Open a long-group example in local dev or built preview and confirm:

- `大学物理上 -> 课程讲义` shows 3 cards by default
- the button reads `查看更多（还有 N 条）`
- clicking it reveals the rest
- clicking `收起` returns to 3 cards

Also confirm a short-group example:

- `大学物理上 -> 复习资料` shows all items
- no expand button is rendered

- [ ] **Step 2: Check working tree before push**

Run:

```bash
git status --short
```

Expected: only the intended materials-page files are staged or committed. Do not include unrelated workspace changes.

- [ ] **Step 3: Push**

Run:

```bash
git push
```

Expected: remote branch updates successfully.

- [ ] **Step 4: Confirm remote behavior after deploy**

After the Pages workflow finishes, verify the materials page in the browser and confirm the expand/collapse behavior matches the acceptance criteria from the spec.

- [ ] **Step 5: Commit any follow-up copy or styling tweak only if needed**

If no follow-up is needed, do nothing. If a tiny copy or spacing adjustment is required after manual review, run:

```bash
git add src/pages/materials.tsx
git commit -m "fix: polish materials group toggle"
git push
```

## Self-Review

- Spec coverage: The plan covers the fixed preview limit, inline per-group expansion, unchanged ordering, no route changes, helper-based tests, and full verification.
- Placeholder scan: No `TODO`, `TBD`, or implicit "test later" steps remain.
- Type consistency: The plan consistently uses `getVisibleGroupItems`, `GROUP_PREVIEW_LIMIT`, `expandedGroups`, `visibleItems`, and `hiddenCount`.
