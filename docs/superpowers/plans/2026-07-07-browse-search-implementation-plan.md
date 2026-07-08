# Browse Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `src/pages/browse.tsx` into a lightweight retrieval page with keyword search, `资料归属 / 分类 / 学期` filters, URL-persisted state, result count, clear action, and empty-state handling.

**Architecture:** Keep the current static data source and card UI. Add pure browse-query helpers to `src/lib/materials.ts` for parsing URL state, building query strings, deriving filter options, and filtering `SAMPLE_MATERIALS`; then rewrite `src/pages/browse.tsx` to use those helpers with local React state plus URL synchronization. Add a small CSS module only for the search panel and summary row so the page stays visually distinct from the existing directory pages.

**Tech Stack:** Docusaurus 3, React 19, TypeScript, Vitest, CSS Modules

---

## File Structure

- Modify: `src/lib/materials.ts`
  - Add browse query types, query parsing/building helpers, filter-option derivation, and material filtering logic.
- Modify: `src/lib/materials.test.ts`
  - Add targeted tests for browse query parsing, query building, option derivation, and metadata search behavior.
- Modify: `src/pages/browse.tsx`
  - Replace the static full list with a URL-synced search/filter page.
- Create: `src/pages/browse.module.css`
  - Add focused layout and control styles for the search panel, summary row, and empty state.

### Task 1: Add Tested Browse Query Helpers

**Files:**
- Modify: `src/lib/materials.ts`
- Test: `src/lib/materials.test.ts`

- [ ] **Step 1: Write the failing tests**

Update `src/lib/materials.test.ts` imports and add these browse-helper tests:

```ts
import { describe, expect, it } from "vitest";

import type { MaterialRecord } from "../data/materials";
import {
  GENERAL_RESOURCES_SLUG,
  buildBrowseQuery,
  buildCoursePath,
  filterMaterials,
  getBrowseFilterOptions,
  getVisibleGroupItems,
  groupMaterialsByCategory,
  isExternalHref,
  normalizeCourseSlug,
  parseBrowseQuery,
  resolveSubmissionTarget,
} from "./materials";

const browseFixtures: MaterialRecord[] = [
  {
    id: "foundation-slide",
    section: "foundation",
    courseSlug: "university-physics-ii",
    category: "课程讲义",
    categoryOrder: 2,
    title: "第 22 章课件",
    type: "课程讲义",
    term: "大学物理下",
    summary: "大学物理下课程讲义与章节课件。",
    href: "/files/foundation/university-physics-ii/course-slides/chapter22.pdf",
  },
  {
    id: "track-guide",
    section: "track",
    trackSlug: "cs",
    courseSlug: "machine-learning",
    category: "科研入门",
    categoryOrder: 1,
    title: "机器学习入门路线",
    type: "科研入门",
    term: "Sophomore Spring",
    summary: "面向计算机方向学生的机器学习科研入门资料。",
    href: "https://example.com/ml-guide",
  },
];

describe("parseBrowseQuery", () => {
  it("parses valid browse query params", () => {
    expect(
      parseBrowseQuery("?q=physics&section=foundation&category=课程讲义&term=大学物理下")
    ).toEqual({
      q: "physics",
      section: "foundation",
      category: "课程讲义",
      term: "大学物理下",
    });
  });

  it("falls back to all for invalid section values", () => {
    expect(parseBrowseQuery("?section=unknown")).toEqual({
      q: "",
      section: "all",
      category: "",
      term: "",
    });
  });
});

describe("buildBrowseQuery", () => {
  it("omits empty and default values", () => {
    expect(
      buildBrowseQuery({
        q: "  ",
        section: "all",
        category: "",
        term: "",
      })
    ).toBe("");
  });

  it("builds a stable search string for active filters", () => {
    expect(
      buildBrowseQuery({
        q: "physics",
        section: "foundation",
        category: "课程讲义",
        term: "大学物理下",
      })
    ).toBe("?q=physics&section=foundation&category=%E8%AF%BE%E7%A8%8B%E8%AE%B2%E4%B9%89&term=%E5%A4%A7%E5%AD%A6%E7%89%A9%E7%90%86%E4%B8%8B");
  });
});

describe("getBrowseFilterOptions", () => {
  it("derives deduplicated category and term options", () => {
    expect(getBrowseFilterOptions(browseFixtures)).toEqual({
      categories: ["科研入门", "课程讲义"],
      terms: ["Sophomore Spring", "大学物理下"],
    });
  });
});

describe("filterMaterials", () => {
  it("matches keyword against metadata context", () => {
    expect(
      filterMaterials(browseFixtures, {
        q: "machine",
        section: "all",
        category: "",
        term: "",
      }).map((item) => item.id)
    ).toEqual(["track-guide"]);
  });

  it("applies section category and term filters together", () => {
    expect(
      filterMaterials(browseFixtures, {
        q: "",
        section: "foundation",
        category: "课程讲义",
        term: "大学物理下",
      }).map((item) => item.id)
    ).toEqual(["foundation-slide"]);
  });

  it("returns all materials when all conditions are empty", () => {
    expect(
      filterMaterials(browseFixtures, {
        q: "",
        section: "all",
        category: "",
        term: "",
      }).map((item) => item.id)
    ).toEqual(["foundation-slide", "track-guide"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run test -- src/lib/materials.test.ts
```

Expected: FAIL because `parseBrowseQuery`, `buildBrowseQuery`, `getBrowseFilterOptions`, and `filterMaterials` do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Update `src/lib/materials.ts` to add the browse-query helpers near the existing utility functions:

```ts
import type { MaterialRecord } from "../data/materials";

export type BrowseSectionFilter = SectionKey | "all";

export type BrowseQuery = {
  q: string;
  section: BrowseSectionFilter;
  category: string;
  term: string;
};

export function parseBrowseQuery(search: string): BrowseQuery {
  const params = new URLSearchParams(search);
  const sectionParam = params.get("section");

  return {
    q: params.get("q")?.trim() ?? "",
    section: sectionParam === "foundation" || sectionParam === "track" ? sectionParam : "all",
    category: params.get("category") ?? "",
    term: params.get("term") ?? "",
  };
}

export function buildBrowseQuery(query: BrowseQuery): string {
  const params = new URLSearchParams();
  const trimmedKeyword = query.q.trim();

  if (trimmedKeyword.length > 0) {
    params.set("q", trimmedKeyword);
  }

  if (query.section !== "all") {
    params.set("section", query.section);
  }

  if (query.category.length > 0) {
    params.set("category", query.category);
  }

  if (query.term.length > 0) {
    params.set("term", query.term);
  }

  const built = params.toString();
  return built.length > 0 ? `?${built}` : "";
}

function normalizeSearchText(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getBrowseFilterOptions(materials: MaterialRecord[]) {
  const categories = [...new Set(materials.map((material) => material.category))]
    .filter((value) => value.length > 0)
    .sort((left, right) => left.localeCompare(right, "zh-Hans"));

  const terms = [...new Set(materials.map((material) => material.term))]
    .filter((value) => value.length > 0)
    .sort((left, right) => left.localeCompare(right, "zh-Hans"));

  return { categories, terms };
}

function getMaterialSearchText(material: MaterialRecord): string {
  return normalizeSearchText(
    [
      material.title,
      material.summary,
      material.category,
      material.term,
      material.section,
      material.courseSlug,
      material.trackSlug,
    ].join(" ")
  );
}

export function filterMaterials(materials: MaterialRecord[], query: BrowseQuery) {
  const keyword = normalizeSearchText(query.q);

  return materials.filter((material) => {
    if (query.section !== "all" && material.section !== query.section) {
      return false;
    }

    if (query.category.length > 0 && material.category !== query.category) {
      return false;
    }

    if (query.term.length > 0 && material.term !== query.term) {
      return false;
    }

    if (keyword.length === 0) {
      return true;
    }

    return getMaterialSearchText(material).includes(keyword);
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
npm run test -- src/lib/materials.test.ts
```

Expected: PASS for the new browse-helper tests and all existing `materials.ts` utility tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/materials.ts src/lib/materials.test.ts
git commit -m "feat: add browse search helpers"
```

### Task 2: Build The Browse Search Page

**Files:**
- Modify: `src/pages/browse.tsx`
- Create: `src/pages/browse.module.css`

- [ ] **Step 1: Add the page styles**

Create `src/pages/browse.module.css` with these styles:

```css
.searchPanel {
  border: 1px solid var(--ifm-color-emphasis-200);
  border-radius: 16px;
  background: var(--ifm-background-surface-color);
  padding: 1rem;
  margin: 1.5rem 0;
}

.searchInput {
  width: 100%;
  margin-bottom: 1rem;
}

.filterGrid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.selectControl {
  width: 100%;
}

.summaryRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.clearButton {
  border: none;
  background: none;
  color: var(--ifm-color-primary);
  cursor: pointer;
  font: inherit;
  padding: 0;
}

.emptyState {
  border: 1px dashed var(--ifm-color-emphasis-300);
  border-radius: 16px;
  padding: 1rem;
  color: var(--ifm-color-emphasis-700);
  background: var(--ifm-background-surface-color);
}
```

- [ ] **Step 2: Rewrite the browse page component**

Replace `src/pages/browse.tsx` with:

```tsx
import { useLocation } from "@docusaurus/router";
import Layout from "@theme/Layout";
import { useEffect, useMemo, useState } from "react";

import MaterialCard from "../components/MaterialCard";
import { SAMPLE_MATERIALS } from "../data/materials";
import {
  buildBrowseQuery,
  filterMaterials,
  getBrowseFilterOptions,
  parseBrowseQuery,
  type BrowseQuery,
} from "../lib/materials";
import styles from "./browse.module.css";

const EMPTY_QUERY: BrowseQuery = {
  q: "",
  section: "all",
  category: "",
  term: "",
};

function hasActiveConditions(query: BrowseQuery) {
  return (
    query.q.trim().length > 0 ||
    query.section !== "all" ||
    query.category.length > 0 ||
    query.term.length > 0
  );
}

export default function BrowsePage() {
  const { search } = useLocation();
  const [query, setQuery] = useState<BrowseQuery>(() => parseBrowseQuery(search));

  const options = useMemo(() => getBrowseFilterOptions(SAMPLE_MATERIALS), []);
  const results = useMemo(() => filterMaterials(SAMPLE_MATERIALS, query), [query]);
  const isDirty = hasActiveConditions(query);

  useEffect(() => {
    setQuery(parseBrowseQuery(search));
  }, [search]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextSearch = buildBrowseQuery(query);
    const nextUrl = `${window.location.pathname}${nextSearch}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [query]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      setQuery(parseBrowseQuery(window.location.search));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <Layout title="Browse">
      <main className="container margin-vert--lg">
        <h1>Browse</h1>
        <p>统一检索站内资料：支持关键词搜索，并可按资料归属、分类、学期快速缩小范围。</p>

        <section className={styles.searchPanel} aria-label="资料检索面板">
          <label className={styles.searchInput}>
            <span className="margin-bottom--sm display-block">关键词</span>
            <input
              type="search"
              value={query.q}
              onChange={(event) =>
                setQuery((current) => ({
                  ...current,
                  q: event.target.value,
                }))
              }
              placeholder="搜索标题、摘要、课程或分类信息"
            />
          </label>

          <div className={styles.filterGrid}>
            <label>
              <span className="margin-bottom--sm display-block">资料归属</span>
              <select
                className={styles.selectControl}
                value={query.section}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    section: event.target.value as BrowseQuery["section"],
                  }))
                }
              >
                <option value="all">全部</option>
                <option value="foundation">foundation</option>
                <option value="track">track</option>
              </select>
            </label>

            <label>
              <span className="margin-bottom--sm display-block">分类</span>
              <select
                className={styles.selectControl}
                value={query.category}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              >
                <option value="">全部</option>
                {options.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="margin-bottom--sm display-block">学期</span>
              <select
                className={styles.selectControl}
                value={query.term}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    term: event.target.value,
                  }))
                }
              >
                <option value="">全部</option>
                {options.terms.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className={styles.summaryRow}>
          <strong>共找到 {results.length} 条资料</strong>
          {isDirty ? (
            <button className={styles.clearButton} type="button" onClick={() => setQuery(EMPTY_QUERY)}>
              清空筛选
            </button>
          ) : null}
        </div>

        {results.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>没有找到匹配的资料</strong>
            <p className="margin-bottom--0">可以尝试修改关键词，或清空部分筛选条件。</p>
          </div>
        ) : (
          <div>
            {results.map((material) => (
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
        )}
      </main>
    </Layout>
  );
}
```

- [ ] **Step 3: Run diagnostics and full verification**

Run:

```bash
npm run typecheck
npm run test -- src/lib/materials.test.ts
npm run build
```

Expected:

- `npm run typecheck`: PASS
- `npm run test -- src/lib/materials.test.ts`: PASS
- `npm run build`: PASS

- [ ] **Step 4: Manually verify URL-synced search behavior**

Run:

```bash
npm run start
```

Then verify in the browser:

- typing into the keyword box updates the result count
- selecting `foundation` or `track` narrows results immediately
- selecting a category and term updates the result list
- the browser URL reflects `q`, `section`, `category`, and `term`
- refreshing `/browse?...` restores the same state
- clicking `清空筛选` removes active conditions and restores the full list
- zero-match conditions show the empty state instead of a blank page

- [ ] **Step 5: Commit**

Run:

```bash
git add src/pages/browse.tsx src/pages/browse.module.css
git commit -m "feat: add browse search page"
```

### Task 3: Final Sanity Check And Push

**Files:**
- Verify: `src/lib/materials.ts`
- Verify: `src/lib/materials.test.ts`
- Verify: `src/pages/browse.tsx`
- Verify: `src/pages/browse.module.css`

- [ ] **Step 1: Run the full project verification**

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

- [ ] **Step 2: Confirm the working tree is clean except intended changes**

Run:

```bash
git status --short
```

Expected: only the browse-search files are staged or the working tree is clean after the two feature commits.

- [ ] **Step 3: Push**

Run:

```bash
git push
```

Expected: remote branch updates successfully.

- [ ] **Step 4: Sanity-check shareable query links**

Manually verify these URLs in the local site:

- `/browse?q=physics`
- `/browse?section=foundation&category=课程讲义`
- `/browse?term=大学物理下`

Expected:

- each URL loads without errors
- controls reflect the query string
- visible results match the active conditions

- [ ] **Step 5: Commit tiny polish only if needed**

If no follow-up changes are needed, do nothing. If a tiny copy or spacing tweak is needed after the final manual check, run:

```bash
git add src/pages/browse.tsx src/pages/browse.module.css
git commit -m "fix: polish browse search page"
git push
```

## Self-Review

- Spec coverage: The plan covers keyword search, `资料归属 / 分类 / 学期` filters, URL persistence, flat result presentation, result count, clear action, and empty state.
- Placeholder scan: No task contains `TODO`, `TBD`, or deferred “handle later” instructions; every code-changing step includes concrete code or commands.
- Type consistency: The plan consistently uses `BrowseQuery`, `parseBrowseQuery`, `buildBrowseQuery`, `getBrowseFilterOptions`, and `filterMaterials` across tests, logic, and page wiring.
