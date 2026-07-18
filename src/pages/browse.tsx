import { useLocation } from "@docusaurus/router";
import Layout from "@theme/Layout";
import { useEffect, useMemo, useRef, useState } from "react";

import MaterialCard from "../components/MaterialCard";
import { SAMPLE_MATERIALS } from "../data/materials";
import { useMaterialFavorites } from "../hooks/useMaterialFavorites";
import {
  getBrowseCourseOptions,
  getMaterialBrowseSearchContext,
  getMaterialCourseTitle,
} from "../lib/courseNavigation";
import {
  buildMaterialCoursePath,
  buildMaterialLocationLabel,
  buildBrowseQuery,
  courseFilterMatchesSection,
  filterMaterials,
  getBrowseFilterOptions,
  paginateItems,
  parseBrowseQuery,
  type BrowseQuery,
} from "../lib/materials";
import styles from "./browse.module.css";

const EMPTY_QUERY: BrowseQuery = {
  q: "",
  section: "all",
  course: "",
  category: "",
  term: "",
  page: 1,
};
const PAGE_SIZE = 24;

function hasActiveConditions(query: BrowseQuery) {
  return (
    query.q.trim().length > 0 ||
    query.section !== "all" ||
    query.course.length > 0 ||
    query.category.length > 0 ||
    query.term.length > 0
  );
}

export default function BrowsePage() {
  const { search } = useLocation();
  const resultsStartRef = useRef<HTMLDivElement>(null);
  const [draftQuery, setDraftQuery] = useState<BrowseQuery>(() => parseBrowseQuery(search));
  const [query, setQuery] = useState<BrowseQuery>(() => parseBrowseQuery(search));
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { favoriteIds, toggleFavorite } = useMaterialFavorites();
  const options = useMemo(() => getBrowseFilterOptions(SAMPLE_MATERIALS), []);
  const allCourseOptions = useMemo(() => getBrowseCourseOptions(SAMPLE_MATERIALS), []);
  const courseOptions = useMemo(
    () =>
      draftQuery.section === "all"
        ? allCourseOptions
        : allCourseOptions.filter((option) => option.section === draftQuery.section),
    [allCourseOptions, draftQuery.section]
  );
  const results = useMemo(() => {
    const filteredMaterials = filterMaterials(SAMPLE_MATERIALS, query, getMaterialBrowseSearchContext);
    return favoritesOnly
      ? filteredMaterials.filter((material) => favoriteIds.has(material.id))
      : filteredMaterials;
  }, [favoriteIds, favoritesOnly, query]);
  const pagination = useMemo(() => paginateItems(results, query.page, PAGE_SIZE), [query.page, results]);
  const isDirty = hasActiveConditions(draftQuery) || favoritesOnly;

  function submitQuery(nextQuery = draftQuery) {
    setQuery({
      ...nextQuery,
      q: nextQuery.q.trim(),
      page: 1,
    });
  }

  function clearQuery() {
    setDraftQuery(EMPTY_QUERY);
    setQuery(EMPTY_QUERY);
    setFavoritesOnly(false);
  }

  function goToPage(page: number) {
    setDraftQuery((current) => ({ ...current, page }));
    setQuery((current) => ({ ...current, page }));

    window.requestAnimationFrame(() => {
      resultsStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    const parsedQuery = parseBrowseQuery(search);
    setDraftQuery(parsedQuery);
    setQuery(parsedQuery);
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
    if (pagination.page === query.page) {
      return;
    }

    setDraftQuery((current) => ({ ...current, page: pagination.page }));
    setQuery((current) => ({ ...current, page: pagination.page }));
  }, [pagination.page, query.page]);

  return (
    <Layout title="资料检索">
      <main className="container margin-vert--lg">
        <h1>资料检索</h1>
        <p>统一检索站内资料：支持关键词搜索，并可按资料归属、课程、分类和学期快速缩小范围。</p>

        <form
          className={styles.searchPanel}
          aria-label="资料检索面板"
          onSubmit={(event) => {
            event.preventDefault();
            submitQuery();
          }}
        >
          <label className={styles.searchInput}>
            <span className="margin-bottom--sm display-block">关键词</span>
            <input
              type="search"
              value={draftQuery.q}
              onChange={(event) =>
                setDraftQuery((current) => ({
                  ...current,
                  q: event.target.value,
                }))
              }
              placeholder="搜索标题、课程名或分类；多个关键词用空格分隔"
            />
          </label>

          <div className={styles.filterGrid}>
            <label>
              <span className="margin-bottom--sm display-block">资料归属</span>
              <select
                className={styles.selectControl}
                value={draftQuery.section}
                onChange={(event) => {
                  const section = event.target.value as BrowseQuery["section"];
                  setDraftQuery((current) => ({
                    ...current,
                    section,
                    course: courseFilterMatchesSection(current.course, section) ? current.course : "",
                  }));
                }}
              >
                <option value="all">全部</option>
                <option value="foundation">基础课程</option>
                <option value="track">方向课程</option>
              </select>
            </label>

            <label>
              <span className="margin-bottom--sm display-block">课程</span>
              <select
                className={styles.selectControl}
                value={draftQuery.course}
                onChange={(event) =>
                  setDraftQuery((current) => ({
                    ...current,
                    course: event.target.value,
                  }))
                }
              >
                <option value="">全部课程</option>
                {courseOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="margin-bottom--sm display-block">分类</span>
              <select
                className={styles.selectControl}
                value={draftQuery.category}
                onChange={(event) =>
                  setDraftQuery((current) => ({
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
                value={draftQuery.term}
                onChange={(event) =>
                  setDraftQuery((current) => ({
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

          <label className={styles.favoriteFilter}>
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(event) => {
                setFavoritesOnly(event.target.checked);
                setDraftQuery((current) => ({ ...current, page: 1 }));
                setQuery((current) => ({ ...current, page: 1 }));
              }}
            />
            <span>仅看收藏（{favoriteIds.size}）</span>
          </label>

          <div className={styles.searchActions}>
            <button className="button button--primary" type="submit">
              搜索
            </button>
          </div>
        </form>

        <div className={styles.summaryRow} ref={resultsStartRef}>
          <strong>
            共找到 {pagination.totalItems} 条资料
            {pagination.totalItems > 0 ? `，当前显示第 ${pagination.startItem}–${pagination.endItem} 条` : ""}
          </strong>
          {isDirty ? (
            <button className={styles.clearButton} type="button" onClick={clearQuery}>
              清空筛选
            </button>
          ) : null}
        </div>

        {results.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>{favoritesOnly ? "收藏中没有匹配的资料" : "没有找到匹配的资料"}</strong>
            <p className="margin-bottom--0">
              {favoritesOnly
                ? "可以先收藏常用资料，或关闭“仅看收藏”继续浏览。"
                : "可以尝试修改关键词，或清空部分筛选条件。"}
            </p>
          </div>
        ) : (
          <div>
            {pagination.items.map((material) => (
              <MaterialCard
                key={material.id}
                id={material.id}
                title={material.title}
                type={material.type}
                term={material.term}
                summary={material.summary}
                href={material.href}
                locationLabel={buildMaterialLocationLabel({
                  section: material.section,
                  trackSlug: material.trackSlug,
                  courseTitle: getMaterialCourseTitle(material),
                })}
                locationHref={buildMaterialCoursePath(material)}
                isFavorite={favoriteIds.has(material.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}

        {pagination.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="检索结果分页">
            <button
              className="button button--secondary"
              type="button"
              disabled={pagination.page === 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              上一页
            </button>

            <label className={styles.pagePicker}>
              <span>第</span>
              <select
                aria-label="跳转页码"
                value={pagination.page}
                onChange={(event) => goToPage(Number(event.target.value))}
              >
                {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => (
                  <option key={page} value={page}>
                    {page}
                  </option>
                ))}
              </select>
              <span>/ {pagination.totalPages} 页</span>
            </label>

            <button
              className="button button--secondary"
              type="button"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => goToPage(pagination.page + 1)}
            >
              下一页
            </button>
          </nav>
        ) : null}
      </main>
    </Layout>
  );
}
