import { useLocation } from "@docusaurus/router";
import Layout from "@theme/Layout";
import { useEffect, useMemo, useRef, useState } from "react";

import { catalogPackages, runtimeCatalog } from "../catalog/runtime";
import {
  getCatalogFacetCounts,
  searchCatalog,
  type CatalogFacet,
  type CatalogSearchQuery,
} from "../catalog/search";
import MaterialPackageCard from "../components/MaterialPackageCard";
import { useMaterialFavorites } from "../hooks/useMaterialFavorites";
import { paginateItems } from "../lib/materials";
import styles from "./browse.module.css";

const PAGE_SIZE = 24;
const EMPTY_QUERY: CatalogSearchQuery = { q: "", section: "all", course: "", category: "", term: "", tags: [] };

function parseQuery(search: string): CatalogSearchQuery {
  const params = new URLSearchParams(search);
  const section = params.get("section");
  return {
    q: params.get("q")?.trim() ?? "",
    section: section === "foundation" || section === "track" ? section : "all",
    course: params.get("course") ?? "",
    category: params.get("category") ?? "",
    term: params.get("term") ?? "",
    tags: [...new Set(params.getAll("tag").filter(Boolean))],
  };
}

function buildQuery(query: CatalogSearchQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.section !== "all") params.set("section", query.section);
  if (query.course) params.set("course", query.course);
  if (query.category) params.set("category", query.category);
  if (query.term) params.set("term", query.term);
  query.tags.forEach((tag) => params.append("tag", tag));
  return params.toString();
}

export default function BrowsePage() {
  const { search } = useLocation();
  const resultsStartRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState<CatalogSearchQuery>(() => parseQuery(search));
  const [draftKeyword, setDraftKeyword] = useState(query.q);
  const [page, setPage] = useState(1);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { favoriteIds, toggleFavorite } = useMaterialFavorites();
  const results = useMemo(() => {
    const found = searchCatalog(catalogPackages, query);
    return favoritesOnly ? found.filter((materialPackage) => favoriteIds.has(materialPackage.id)) : found;
  }, [favoriteIds, favoritesOnly, query]);
  const pagination = useMemo(() => paginateItems(results, page, PAGE_SIZE), [page, results]);
  const categories = useMemo(() => new Map(runtimeCatalog.categories.map((item) => [item.slug, item.label])), []);
  const courses = useMemo(() => new Map(runtimeCatalog.courses.map((item) => [item.slug, item.title])), []);
  const facets = useMemo(() => ({
    section: getCatalogFacetCounts(catalogPackages, query, "section"),
    category: getCatalogFacetCounts(catalogPackages, query, "category"),
    course: getCatalogFacetCounts(catalogPackages, query, "course"),
    term: getCatalogFacetCounts(catalogPackages, query, "term"),
    tags: getCatalogFacetCounts(catalogPackages, query, "tags"),
  }), [query]);
  const tags = useMemo(() => [...facets.tags.keys()].sort((left, right) => (facets.tags.get(right) ?? 0) - (facets.tags.get(left) ?? 0)).slice(0, 20), [facets.tags]);

  function update(next: Partial<CatalogSearchQuery>) {
    setPage(1);
    setQuery((current) => ({ ...current, ...next }));
  }

  function toggleValue(facet: Exclude<CatalogFacet, "tags">, value: string) {
    if (facet === "section") update({ section: value === query.section ? "all" : value as CatalogSearchQuery["section"], course: "" });
    else update({ [facet]: query[facet] === value ? "" : value });
  }

  function toggleTag(tag: string) {
    update({ tags: query.tags.includes(tag) ? query.tags.filter((item) => item !== tag) : [...query.tags, tag] });
  }

  useEffect(() => {
    const parsed = parseQuery(search);
    setQuery(parsed);
    setDraftKeyword(parsed.q);
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextSearch = buildQuery(query);
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) window.history.replaceState(null, "", nextUrl);
  }, [query]);

  return (
    <Layout title="资料检索">
      <main className="container margin-vert--lg">
        <h1>资料检索</h1>
        <p>搜索课程、资料包、文件名与标签；检索结果按相关性排序。</p>
        <form className={styles.searchPanel} onSubmit={(event) => { event.preventDefault(); update({ q: draftKeyword.trim() }); }}>
          <label className={styles.searchInput}>
            <span className="margin-bottom--sm display-block">关键词</span>
            <input type="search" value={draftKeyword} onChange={(event) => setDraftKeyword(event.target.value)} placeholder="例如：微积分、期末、操作系统" />
          </label>
          <div className={styles.searchActions}>
            <button className="button button--primary" type="submit">搜索</button>
            <button className="button button--secondary" type="button" onClick={() => { setDraftKeyword(""); setQuery(EMPTY_QUERY); setPage(1); setFavoritesOnly(false); }}>清空</button>
          </div>
        </form>

        <section className={styles.facets} aria-label="筛选条件">
          <FacetGroup title="归属" values={["foundation", "track"]} counts={facets.section} selected={query.section === "all" ? [] : [query.section]} label={(value) => value === "foundation" ? "基础课程" : "方向课程"} onToggle={(value) => toggleValue("section", value)} />
          <FacetGroup title="分类" values={[...facets.category.keys()]} counts={facets.category} selected={query.category ? [query.category] : []} label={(value) => categories.get(value) ?? value} onToggle={(value) => toggleValue("category", value)} />
          <FacetGroup title="课程" values={[...facets.course.keys()].sort((a, b) => (courses.get(a) ?? a).localeCompare(courses.get(b) ?? b, "zh-Hans"))} counts={facets.course} selected={query.course ? [query.course] : []} label={(value) => courses.get(value) ?? value} onToggle={(value) => toggleValue("course", value)} compact />
          <FacetGroup title="学期" values={[...facets.term.keys()]} counts={facets.term} selected={query.term ? [query.term] : []} label={(value) => value} onToggle={(value) => toggleValue("term", value)} />
          <FacetGroup title="标签" values={tags} counts={facets.tags} selected={query.tags} label={(value) => value} onToggle={toggleTag} />
        </section>

        <label className={styles.favoriteFilter}>
          <input type="checkbox" checked={favoritesOnly} onChange={(event) => { setFavoritesOnly(event.target.checked); setPage(1); }} />
          <span>仅看收藏（{favoriteIds.size}）</span>
        </label>
        <div className={styles.summaryRow} ref={resultsStartRef}><strong>找到 {pagination.totalItems} 个资料包{pagination.totalItems ? `，显示第 ${pagination.startItem}–${pagination.endItem} 个` : ""}</strong></div>
        {pagination.items.length ? pagination.items.map((materialPackage) => <MaterialPackageCard key={materialPackage.id} materialPackage={materialPackage} isFavorite={favoriteIds.has(materialPackage.id)} onToggleFavorite={toggleFavorite} />) : <div className={styles.emptyState}><strong>没有找到匹配的资料包</strong><p className="margin-bottom--0">尝试删除某个标签或使用更短的关键词。</p></div>}
        {pagination.totalPages > 1 ? <nav className={styles.pagination} aria-label="检索结果分页"><button className="button button--secondary" type="button" disabled={pagination.page === 1} onClick={() => setPage(page - 1)}>上一页</button><span>第 {pagination.page} / {pagination.totalPages} 页</span><button className="button button--secondary" type="button" disabled={pagination.page === pagination.totalPages} onClick={() => setPage(page + 1)}>下一页</button></nav> : null}
      </main>
    </Layout>
  );
}

function FacetGroup({ title, values, counts, selected, label, onToggle, compact = false }: { title: string; values: string[]; counts: Map<string, number>; selected: string[]; label: (value: string) => string; onToggle: (value: string) => void; compact?: boolean }) {
  const visible = compact ? values.slice(0, 24) : values;
  return <div className={styles.facetGroup}><strong>{title}</strong><div className={styles.facetOptions}>{visible.map((value) => <button className={`${styles.facetButton} ${selected.includes(value) ? styles.facetButtonActive : ""}`} type="button" key={value} aria-pressed={selected.includes(value)} onClick={() => onToggle(value)}>{label(value)} <span>({counts.get(value) ?? 0})</span></button>)}</div></div>;
}
