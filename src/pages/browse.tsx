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

  return (
    <Layout title="资料检索">
      <main className="container margin-vert--lg">
        <h1>资料检索</h1>
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
              placeholder="搜索标题、摘要、课程名或分类信息"
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
                <option value="foundation">基础课程</option>
                <option value="track">方向课程</option>
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
